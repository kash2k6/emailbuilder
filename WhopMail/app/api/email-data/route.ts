import { type NextRequest, NextResponse } from "next/server"
import { fetchWhopMembers } from "@/app/actions"
import { storage } from "@/lib/storage"
import { getMd5Hash } from "@/lib/utils"

// Add more detailed error logging and better error handling
export async function GET(request: NextRequest) {
  try {
    // Get the email from the query parameters
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log(`Fetching email data for: ${email}`)

    // Get the authorization header
    const authHeader = request.headers.get("Authorization")
    console.log(`Authorization header: ${authHeader ? "Present" : "Missing"}`)

    if (authHeader) {
      console.log(`Auth header format check: ${authHeader.startsWith("Bearer ") ? "Valid" : "Invalid"}`)
    }

    // For production, validate the token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No valid authorization header")

      // For debugging, check all headers
      const allHeaders: Record<string, string> = {}
      request.headers.forEach((value, key) => {
        allHeaders[key] = value
      })
      console.log("All request headers:", JSON.stringify(allHeaders))

      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Extract the token
    const token = authHeader.split(" ")[1]
    console.log(`Token length: ${token.length}, First 10 chars: ${token.substring(0, 10)}...`)

    // Get the user's integration from storage using the same system as the rest of the app
    // Copy the getStorageClient function from actions.ts
    function getStorageClient() {
      const storageType = process.env.STORAGE_TYPE || 'local'
      
      if (storageType === 'supabase') {
        const { createClient } = require('@supabase/supabase-js')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        
        if (!supabaseUrl || !supabaseKey) {
          console.error('Missing Supabase environment variables')
          throw new Error('Supabase configuration is incomplete')
        }
        
        return {
          type: 'supabase' as const,
          client: createClient(supabaseUrl, supabaseKey)
        }
      } else {
        return {
          type: 'local' as const,
          client: storage
        }
      }
    }
    
    const storageClient = getStorageClient()
    
    let integration = null
    
    if (storageClient.type === 'supabase') {
      // Extract user ID using the same logic as Whop SDK
      let userId = null
      
      // Check for production headers first - Whop sends x-whop-user-token
      const whopUserToken = request.headers.get("x-whop-user-token")
      
      if (whopUserToken) {
        // Extract user ID from the JWT token
        try {
          const tokenParts = whopUserToken.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
            userId = payload.sub
            console.log(`Extracted user ID from x-whop-user-token: ${userId}`)
          } else {
            throw new Error("Invalid JWT token format")
          }
        } catch (error) {
          console.error("Error parsing x-whop-user-token:", error)
        }
      }

      // Check for development headers
      const devToken = request.headers.get("x-whop-dev-token")
      const devUserId = request.headers.get("x-whop-dev-user-id")

      if (devToken && devUserId) {
        userId = devUserId
        console.log(`Using dev user ID: ${userId}`)
      }

      // Fallback: try to extract from Authorization header (for local testing)
      if (!userId && token) {
        try {
          const tokenParts = token.split('.')
          console.log(`Token has ${tokenParts.length} parts`)
          
          if (tokenParts.length === 3) {
            // This is a JWT token
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
            console.log('Token payload:', JSON.stringify(payload, null, 2))
            userId = payload.sub
            console.log(`Extracted user ID from Authorization token: ${userId}`)
          } else {
            // This is not a JWT token, try different parsing methods
            console.log(`Token is not JWT format, trying alternative parsing`)
            
            // Method 1: Try to decode as base64
            try {
              const decoded = Buffer.from(token, 'base64').toString()
              console.log('Base64 decoded token:', decoded)
              
              // Try to parse as JSON
              const tokenData = JSON.parse(decoded)
              if (tokenData.user_id || tokenData.sub) {
                userId = tokenData.user_id || tokenData.sub
                console.log(`Extracted user ID from base64 token: ${userId}`)
              }
            } catch (base64Error) {
              console.log('Token is not base64 encoded JSON')
            }
            
            // Method 2: Look for user_ pattern in the token
            if (!userId && token.includes('user_')) {
              const match = token.match(/user_[a-zA-Z0-9]+/)
              if (match) {
                userId = match[0]
                console.log(`Extracted user ID from token string: ${userId}`)
              }
            }
            
            // Method 3: Try to decode each part separately
            if (!userId) {
              for (let i = 0; i < tokenParts.length; i++) {
                try {
                  const decoded = Buffer.from(tokenParts[i], 'base64').toString()
                  console.log(`Part ${i} decoded:`, decoded)
                  
                  // Look for user_ pattern in decoded part
                  if (decoded.includes('user_')) {
                    const match = decoded.match(/user_[a-zA-Z0-9]+/)
                    if (match) {
                      userId = match[0]
                      console.log(`Extracted user ID from part ${i}: ${userId}`)
                      break
                    }
                  }
                } catch (partError) {
                  console.log(`Part ${i} is not base64 encoded`)
                }
              }
            }
          }
        } catch (error) {
          console.error('Error extracting user ID from Authorization token:', error)
          console.log('Token parts:', token.split('.').map((part, i) => `Part ${i}: ${part.substring(0, 20)}...`))
          
          // Final fallback: try to extract user ID from the token directly
          if (token.includes('user_')) {
            const match = token.match(/user_[a-zA-Z0-9]+/)
            if (match) {
              userId = match[0]
              console.log(`Extracted user ID from token string (final fallback): ${userId}`)
            }
          }
        }
      }

      if (!userId) {
        console.log('No user ID found in any authentication method')
        return NextResponse.json({ error: 'Authentication failed - no user ID found' }, { status: 401 })
      }

      // Get integrations for this specific user
      console.log(`Looking for integrations with whop_user_id: ${userId}`)
      
      let integrations = null
      let error = null
      
      if (userId) {
        const result = await storageClient.client
          .from('integrations')
          .select('*')
          .eq('whop_user_id', userId)
          .limit(1)
        integrations = result.data
        error = result.error
      } else {
        // If we can't extract user ID, get the first integration as fallback
        console.log('Could not extract user ID, getting first integration as fallback')
        const result = await storageClient.client
          .from('integrations')
          .select('*')
          .limit(1)
        integrations = result.data
        error = result.error
      }
      
      if (error) {
        console.error('Error fetching integrations from Supabase:', error)
      } else {
        console.log(`Found ${integrations?.length || 0} integrations for user ${userId}`)
        if (integrations && integrations.length > 0) {
          integration = integrations[0]
          console.log(`Found Supabase integration: platform=${integration.platform}, user_id=${integration.whop_user_id}`)
        } else {
          console.log(`No integrations found for user ${userId}`)
          
          // Let's also check what integrations exist in the database
          const { data: allIntegrations, error: allError } = await storageClient.client
            .from('integrations')
            .select('*')
          
          if (allError) {
            console.error('Error fetching all integrations:', allError)
          } else {
            console.log(`Total integrations in database: ${allIntegrations?.length || 0}`)
            if (allIntegrations && allIntegrations.length > 0) {
              console.log('Available integrations:')
              allIntegrations.forEach((int, index) => {
                console.log(`  ${index + 1}. platform=${int.platform}, whop_user_id=${int.whop_user_id}`)
              })
            }
          }
        }
      }
    } else {
      // Use local storage
      const allIntegrations = await storage.getAllIntegrations()
      console.log(`Found ${allIntegrations?.length || 0} integrations in local storage`)
      
      if (allIntegrations && allIntegrations.length > 0) {
        console.log("Available integrations:")
        allIntegrations.forEach((integration, index) => {
          console.log(`Integration ${index + 1}: platform=${integration.platform}, company_id=${integration.company_id}`)
        })
        integration = allIntegrations[0]
      }
    }

    if (!integration) {
      console.log("No integration found")
      return NextResponse.json(
        { error: "No email integration found. Please connect an email platform first." },
        { status: 404 },
      )
    }

    console.log(`Using integration: platform=${integration.platform}, id=${integration.user_id}`)

    // Fetch real data from the email platform based on the integration type
    let emailData

    try {
      switch (integration.platform) {
        case "mailchimp":
          try {
            emailData = await fetchMailchimpData(integration, email)
          } catch (mailchimpError) {
            console.log("Error with Mailchimp API:", mailchimpError)
            // If the error is "member not found", return a specific message
            if (mailchimpError instanceof Error && mailchimpError.message.includes("Member not found")) {
              return NextResponse.json(
                {
                  error: `This member's email (${email}) was not found in your Mailchimp audience. They may need to be added to your list first.`,
                },
                { status: 404 },
              )
            }
            // Otherwise, return a generic error
            return NextResponse.json(
              {
                error: `Error fetching data from Mailchimp: ${
                  mailchimpError instanceof Error ? mailchimpError.message : String(mailchimpError)
                }`,
              },
              { status: 500 },
            )
          }
          break
        case "convertkit":
          emailData = await fetchConvertKitData(integration, email)
          break
        case "klaviyo":
          emailData = await fetchKlaviyoData(integration, email)
          break
        case "activecampaign":
          emailData = await fetchActiveCampaignData(integration, email)
          break
        case "resend":
          emailData = await fetchResendData(integration, email)
          break
        default:
          console.log(`Unsupported platform: ${integration.platform}`)
          return NextResponse.json({ error: `Unsupported email platform: ${integration.platform}` }, { status: 400 })
      }
    } catch (platformError) {
      console.log(`Error fetching from ${integration.platform}:`, platformError)
      return NextResponse.json(
        {
          error: `Error fetching data from ${integration.platform}: ${
            platformError instanceof Error ? platformError.message : String(platformError)
          }`,
        },
        { status: 500 },
      )
    }

    console.log(`Successfully fetched email data for ${email}`)
    return NextResponse.json(emailData)
  } catch (error) {
    console.log("Unhandled error in email-data API route:", error)
    // Ensure we always return a valid JSON response
    return NextResponse.json(
      {
        error: `Unhandled error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}

// Update the fetchMailchimpData function with better error handling and debugging
async function fetchMailchimpData(integration: any, email: string) {
  try {
    console.log("Starting Mailchimp data fetch for:", email)

    const apiKey = integration.api_key
    const dc = integration.dc || (apiKey.includes("-") ? apiKey.split("-")[1] : null)
    const listId = integration.list_id

    if (!apiKey) {
      throw new Error("Mailchimp API key is missing")
    }

    if (!dc) {
      throw new Error("Mailchimp data center (dc) is missing and couldn't be extracted from API key")
    }

    if (!listId) {
      throw new Error("Mailchimp list ID is missing")
    }

    console.log(`Using Mailchimp config - DC: ${dc}, List ID: ${listId}`)

    // Get subscriber hash (MD5 of lowercase email)
    const normalizedEmail = email.toLowerCase().trim()
    // Use our utility function to generate the hash
    const subscriberHash = getMd5Hash(normalizedEmail)
    console.log(`Generated subscriber hash for ${normalizedEmail}: ${subscriberHash}`)

    // For debugging, let's log the full URLs we're calling
    const memberUrl = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`
    console.log(`Fetching member data from: ${memberUrl}`)

    // 1. Get member info
    const memberResponse = await fetch(memberUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    })

    // Log the response status
    console.log(`Member API response status: ${memberResponse.status}`)

    if (!memberResponse.ok) {
      // Try to get more details from the error response
      let errorDetail = ""
      try {
        const errorData = await memberResponse.json()
        errorDetail = JSON.stringify(errorData)
      } catch (e) {
        // If we can't parse the JSON, try to get the text content
        try {
          const textContent = await memberResponse.text()
          errorDetail = textContent.substring(0, 100) + (textContent.length > 100 ? "..." : "")
        } catch (textError) {
          // If even text extraction fails, use the status text
          errorDetail = memberResponse.statusText
        }
      }

      if (memberResponse.status === 404) {
        throw new Error(`Member not found in Mailchimp list: ${email} (${errorDetail})`)
      }
      throw new Error(`Failed to fetch member data: ${memberResponse.status} - ${errorDetail}`)
    }

    let memberData
    try {
      memberData = await memberResponse.json()
      console.log(`Successfully fetched member data for ${email}`)
    } catch (jsonError) {
      console.log("Error parsing member data JSON:", jsonError)
      throw new Error(
        `Failed to parse Mailchimp response: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
      )
    }

    // Initialize with basic data
    const result = {
      email,
      platform: "Mailchimp",
      status: memberData.status || "Unknown",
      lastEmailSent: "No emails sent",
      openRate: null,
      clickRate: null,
      campaigns: [],
      profileUrl: `https://${dc}.admin.mailchimp.com/lists/members/view?id=${subscriberHash}&id=${listId}`,
    }

    // 2. Get member activity feed
    try {
      const activityUrl = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}/activity`
      console.log(`Fetching activity data from: ${activityUrl}`)

      const activityResponse = await fetch(activityUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      })

      console.log(`Activity API response status: ${activityResponse.status}`)

      if (!activityResponse.ok) {
        console.log(`Failed to fetch activity data: ${activityResponse.status} ${activityResponse.statusText}`)
        // Return basic data without activity
        return result
      }

      let activityData = { activity: [] }
      try {
        activityData = await activityResponse.json()
        console.log(`Successfully fetched activity data with ${activityData.activity?.length || 0} activities`)
      } catch (e) {
        console.log("Error parsing activity data:", e)
        // Return basic data without activity
        return result
      }

      // Process the activity data to get campaign information
      const campaigns = []
      const processedCampaignIds = new Set()

      if (activityData.activity && activityData.activity.length > 0) {
        for (const activity of activityData.activity) {
          if (activity.campaign_id && !processedCampaignIds.has(activity.campaign_id)) {
            processedCampaignIds.add(activity.campaign_id)

            // Get campaign details if available
            const campaignTitle = activity.title || "Campaign"
            const campaignSentDate = activity.timestamp
              ? new Date(activity.timestamp).toLocaleDateString()
              : "Unknown date"

            // Check for open and click activities for this campaign
            const hasOpened = activityData.activity.some(
              (act) => act.campaign_id === activity.campaign_id && act.action === "open",
            )

            const hasClicked = activityData.activity.some(
              (act) => act.campaign_id === activity.campaign_id && act.action === "click",
            )

            campaigns.push({
              name: campaignTitle,
              sentDate: campaignSentDate,
              opened: hasOpened,
              clicked: hasClicked,
            })

            // Limit to 5 campaigns
            if (campaigns.length >= 5) break
          }
        }
      }

      // Get the last email sent date from the activity
      if (activityData.activity && activityData.activity.length > 0) {
        // Find the most recent sent activity
        const sentActivities = activityData.activity.filter((act) => act.action === "sent")
        if (sentActivities.length > 0) {
          // Sort by timestamp descending
          sentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          result.lastEmailSent = new Date(sentActivities[0].timestamp).toLocaleDateString()
        }
      }

      // Calculate open and click rates if available
      if (memberData.stats) {
        result.openRate = memberData.stats.avg_open_rate ? Math.round(memberData.stats.avg_open_rate * 100) : null
        result.clickRate = memberData.stats.avg_click_rate ? Math.round(memberData.stats.avg_click_rate * 100) : null
      }

      // Add campaigns to result
      result.campaigns = campaigns

      return result
    } catch (activityError) {
      console.log("Error fetching activity data:", activityError)
      // Return basic data without activity
      return result
    }
  } catch (error) {
    console.log("Error in fetchMailchimpData:", error)
    throw error
  }
}

// Function to fetch data from ConvertKit
async function fetchConvertKitData(integration: any, email: string) {
  try {
    const apiKey = integration.api_key
    const apiSecret = integration.api_secret
    const formId = integration.form_id

    if (!apiSecret) {
      throw new Error("ConvertKit API secret is missing")
    }

    console.log(`Fetching ConvertKit data for email: ${email}`)
    console.log(`Using API secret: ${apiSecret.substring(0, 10)}...`)
    console.log(`Form ID: ${formId}`)

    // Get subscriber info using the correct ConvertKit API endpoint
    // Note: ConvertKit uses api_secret for subscriber endpoints
    const subscriberUrl = `https://api.convertkit.com/v3/subscribers?api_secret=${apiSecret}&email_address=${encodeURIComponent(email)}`

    console.log(`Making request to: ${subscriberUrl}`)

    const subscriberResponse = await fetch(subscriberUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`ConvertKit API response status: ${subscriberResponse.status}`)

    if (!subscriberResponse.ok) {
      // Try to get error details
      let errorDetail = ""
      try {
        const errorData = await subscriberResponse.json()
        errorDetail = JSON.stringify(errorData)
      } catch (e) {
        errorDetail = await subscriberResponse.text()
      }
      
      console.log(`ConvertKit API error details: ${errorDetail}`)
      
      if (subscriberResponse.status === 401) {
        throw new Error("Invalid ConvertKit API key. Please check your API key in the integration settings.")
      }
      
      throw new Error(`Failed to fetch subscriber data: ${subscriberResponse.status} ${subscriberResponse.statusText} - ${errorDetail}`)
    }

    const subscriberData = await subscriberResponse.json()
    console.log(`ConvertKit API response:`, JSON.stringify(subscriberData, null, 2))
    
    const subscribers = subscriberData.subscribers || []

    if (subscribers.length === 0) {
      throw new Error("Subscriber not found in ConvertKit")
    }

    const subscriber = subscribers[0]
    console.log(`Found subscriber:`, JSON.stringify(subscriber, null, 2))

    // Get tags for the subscriber (this uses api_key, not api_secret)
    const tagsUrl = `https://api.convertkit.com/v3/subscribers/${subscriber.id}/tags?api_key=${apiKey}`
    const tagsResponse = await fetch(tagsUrl)
    
    let tags = []
    if (tagsResponse.ok) {
      const tagsData = await tagsResponse.json()
      tags = tagsData.tags || []
    }

    // ConvertKit doesn't provide detailed email activity data
    // We can only show basic subscriber info and tags
    const campaigns = tags
      .map((tag: any) => ({
        name: `Tag: ${tag.name}`,
        sentDate: tag.created_at ? new Date(tag.created_at).toLocaleDateString() : "Unknown date",
        opened: null, // ConvertKit doesn't provide this data
        clicked: null, // ConvertKit doesn't provide this data
      }))
      .slice(0, 5)

    return {
      email,
      platform: "ConvertKit",
      status: subscriber.state || "Unknown",
      lastEmailSent: subscriber.created_at ? new Date(subscriber.created_at).toLocaleDateString() : "Unknown",
      openRate: null, // ConvertKit API doesn't provide this info
      clickRate: null, // ConvertKit API doesn't provide this info
      campaigns,
      profileUrl: `https://app.convertkit.com/subscribers/${subscriber.id}`,
      subscriberInfo: {
        firstName: subscriber.first_name || "N/A",
        lastName: subscriber.fields?.last_name || "N/A",
        createdAt: subscriber.created_at ? new Date(subscriber.created_at).toLocaleDateString() : "Unknown",
        tags: tags.map((tag: any) => tag.name).join(", ") || "No tags",
      }
    }
  } catch (error) {
    console.log("Error fetching ConvertKit data:", error)
    throw error
  }
}

// Function to fetch data from Klaviyo
async function fetchKlaviyoData(integration: any, email: string) {
  try {
    const apiKey = integration.api_key
    const listId = integration.list_id

    // Get profile info
    const profileUrl = `https://a.klaviyo.com/api/v2/people/search?api_key=${apiKey}&email=${encodeURIComponent(email)}`

    const profileResponse = await fetch(profileUrl)

    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch profile data: ${profileResponse.status} ${profileResponse.statusText}`)
    }

    const profiles = await profileResponse.json()

    if (!profiles || profiles.length === 0) {
      throw new Error("Profile not found in Klaviyo")
    }

    const profile = profiles[0]

    // Get metrics for this profile
    const metricsUrl = `https://a.klaviyo.com/api/v1/person/${profile.id}/metrics/timeline?api_key=${apiKey}&count=10`

    const metricsResponse = await fetch(metricsUrl)

    let metrics = { data: [] }
    if (metricsResponse.ok) {
      metrics = await metricsResponse.json()
    }

    // Format the data
    const campaigns = (metrics.data || [])
      .map((metric: any) => {
        const isOpened = metric.metric && metric.metric.name === "Opened Email"
        const isClicked = metric.metric && metric.metric.name === "Clicked Email"

        return {
          name:
            metric.event_properties && metric.event_properties.subject
              ? metric.event_properties.subject
              : "Email Campaign",
          sentDate: metric.datetime ? new Date(metric.datetime * 1000).toLocaleDateString() : "Unknown date",
          opened: isOpened || isClicked, // If they clicked, they must have opened
          clicked: isClicked,
        }
      })
      .slice(0, 5)

    // Get the last email sent date
    let lastEmailSent = "No emails sent"
    const sentEmails = (metrics.data || []).filter(
      (metric: any) =>
        metric.metric &&
        (metric.metric.name === "Received Email" ||
          metric.metric.name === "Opened Email" ||
          metric.metric.name === "Clicked Email"),
    )

    if (sentEmails.length > 0) {
      // Sort by datetime descending
      sentEmails.sort((a: any, b: any) => b.datetime - a.datetime)
      lastEmailSent = new Date(sentEmails[0].datetime * 1000).toLocaleDateString()
    }

    return {
      email,
      platform: "Klaviyo",
      status: profile.lists && profile.lists.includes(listId) ? "Subscribed" : "Not Subscribed",
      lastEmailSent,
      openRate: null, // Klaviyo API doesn't provide this info at the profile level
      clickRate: null, // Klaviyo API doesn't provide this info at the profile level
      campaigns,
      profileUrl: `https://www.klaviyo.com/profile/${profile.id}`,
    }
  } catch (error) {
    console.log("Error fetching Klaviyo data:", error)
    throw error
  }
}

// Function to fetch data from ActiveCampaign
async function fetchActiveCampaignData(integration: any, email: string) {
  try {
    const apiKey = integration.api_key
    const apiUrl = integration.api_url

    if (!apiUrl) {
      throw new Error("API URL is required for ActiveCampaign")
    }

    // Get contact info
    const contactUrl = `${apiUrl}/api/3/contacts?email=${encodeURIComponent(email)}`

    const contactResponse = await fetch(contactUrl, {
      headers: {
        "Api-Token": apiKey,
      },
    })

    if (!contactResponse.ok) {
      throw new Error(`Failed to fetch contact data: ${contactResponse.status} ${contactResponse.statusText}`)
    }

    const contactData = await contactResponse.json()

    if (!contactData.contacts || contactData.contacts.length === 0) {
      throw new Error("Contact not found in ActiveCampaign")
    }

    const contact = contactData.contacts[0]

    // Get campaign activity for this contact
    const activityUrl = `${apiUrl}/api/3/contacts/${contact.id}/contactActivities`

    const activityResponse = await fetch(activityUrl, {
      headers: {
        "Api-Token": apiKey,
      },
    })

    let activities = { contactActivities: [] }
    if (activityResponse.ok) {
      activities = await activityResponse.json()
    }

    // Format the data
    const campaigns = (activities.contactActivities || [])
      .filter((activity: any) => activity.type === "email")
      .map((activity: any) => ({
        name: activity.message_name || "Email Campaign",
        sentDate: activity.tstamp ? new Date(activity.tstamp * 1000).toLocaleDateString() : "Unknown date",
        opened: activity.opened === "1",
        clicked: activity.clicked === "1",
      }))
      .slice(0, 5)

    // Get the last email sent date
    let lastEmailSent = "No emails sent"
    if (campaigns.length > 0) {
      // Assuming campaigns are already sorted by date
      lastEmailSent = campaigns[0].sentDate
    }

    return {
      email,
      platform: "ActiveCampaign",
      status: contact.status === 1 ? "Subscribed" : "Unsubscribed",
      lastEmailSent,
      openRate: null, // ActiveCampaign API doesn't provide this info at the contact level
      clickRate: null, // ActiveCampaign API doesn't provide this info at the contact level
      campaigns,
      profileUrl: `${apiUrl}/contact/view/${contact.id}`,
    }
  } catch (error) {
    console.log("Error fetching ActiveCampaign data:", error)
    throw error
  }
}

// Function to fetch data from Resend
async function fetchResendData(integration: any, email: string) {
  try {
    const apiKey = integration.api_key
    const audienceId = integration.list_id

    if (!apiKey) {
      throw new Error("Resend API key is missing")
    }

    if (!audienceId) {
      throw new Error("Resend audience ID is missing")
    }

    // Get contact info from Resend
    const { getResendContactData } = await import("@/app/actions/resend")
    const contactResult = await getResendContactData(apiKey, email)

    if (!contactResult.success) {
      throw new Error(contactResult.error || "Contact not found in Resend")
    }

    const contact = contactResult.contact!

    // Resend doesn't provide detailed email activity data through the API
    // We can only show basic contact info
    return {
      email,
      platform: "Resend",
      status: contact.unsubscribed ? "Unsubscribed" : "Subscribed",
      lastEmailSent: "No email activity data available",
      openRate: null,
      clickRate: null,
      campaigns: [], // Resend doesn't provide campaign data through the API
      profileUrl: "https://resend.com/contacts",
      contactInfo: {
        firstName: contact.first_name || "N/A",
        lastName: contact.last_name || "N/A",
        createdAt: contact.created_at ? new Date(contact.created_at).toLocaleDateString() : "Unknown",
        updatedAt: contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : "Unknown",
        unsubscribed: contact.unsubscribed,
      }
    }
  } catch (error) {
    console.log("Error fetching Resend data:", error)
    throw error
  }
}
