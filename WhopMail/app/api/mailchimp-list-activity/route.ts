import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

// Import the storage client function from actions
function getStorageClient() {
  try {
    // Try to use Supabase first if available
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Dynamic import to avoid build issues
      const { createClient } = require("@supabase/supabase-js")
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      return { type: 'supabase' as const, client: supabaseClient }
    } else {
      console.log('Supabase not available, using local storage')
      return { type: 'local' as const, client: storage }
    }
  } catch (error) {
    console.log('Supabase not available, falling back to local storage')
    // Fall back to local storage
    return { type: 'local' as const, client: storage }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("Authorization")

    // Log authentication information for debugging
    console.log(`Auth header present: ${!!authHeader}, V0 environment: ${false}`)

    // For production, validate the token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("No valid authorization header:", authHeader)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Extract the token
    const token = authHeader.split(" ")[1]
    console.log("Token received:", token.substring(0, 10) + "...")

    // In development mode, we accept dev tokens
    let userId: string
    if (token.includes(".")) {
      // This looks like a JWT token (dev token)
      try {
        const tokenParts = token.split('.')
        if (tokenParts.length === 3) {
          // Use atob for base64 decoding in browser environment
          const payload = JSON.parse(atob(tokenParts[1]))
          userId = payload.sub
          console.log("Extracted user ID from dev token:", userId)
        } else {
          throw new Error("Invalid JWT token format")
        }
      } catch (error) {
        console.error("Error parsing dev token:", error)
        return NextResponse.json({ error: "Invalid token format" }, { status: 401 })
      }
    } else {
      // This is a regular access token
      userId = "unknown" // You might want to validate this token differently
    }

    try {
      console.log("Initializing storage and querying integrations...")

      // Use the same storage client as actions
      const storageClient = getStorageClient()
      let allIntegrations: any[] = []

      if (storageClient.type === 'supabase') {
        // Query Supabase for integrations
        const { data, error } = await storageClient.client
          .from('integrations')
          .select('*')
        
        if (error) {
          console.error('Error fetching integrations from Supabase:', error)
          return NextResponse.json(
            { error: "Database error while fetching integrations" },
            { status: 500 }
          )
        }
        
        allIntegrations = data || []
        console.log("FULL INTEGRATIONS TABLE CONTENTS:")
        console.log(JSON.stringify(allIntegrations, null, 2))
        console.log(`Total records found: ${allIntegrations.length}`)
      } else {
        // Use local storage
        allIntegrations = await storageClient.client.getAllIntegrations()
        console.log("FULL INTEGRATIONS TABLE CONTENTS:")
        console.log(JSON.stringify(allIntegrations, null, 2))
        console.log(`Total records found: ${allIntegrations?.length || 0}`)
      }

      if (!allIntegrations || allIntegrations.length === 0) {
        console.log("No Mailchimp integrations found in storage")
        return NextResponse.json(
          {
            error:
              "No Mailchimp integration found. Please check your Mailchimp connection.",
          },
          { status: 404 },
        )
      }

      console.log(`Found ${allIntegrations.length} integration(s)`)

      // Try to find a Mailchimp integration
      const mailchimpIntegrations = allIntegrations.filter(integration => integration.platform === 'mailchimp')

      console.log(`Found ${mailchimpIntegrations.length} Mailchimp integrations`)

      // If no Mailchimp integrations, check if there are any integrations at all
      if (mailchimpIntegrations.length === 0) {
        // If there are integrations but none are Mailchimp
        const platforms = [...new Set(allIntegrations.map((i) => i.platform))].join(", ")
        console.log(`Found integrations for: ${platforms}, but none for Mailchimp`)
        return NextResponse.json(
          {
            error: `No Mailchimp integration found. You have integrations for: ${platforms}. Please connect Mailchimp to view list activity.`,
          },
          { status: 404 },
        )
      }

      // Use the first Mailchimp integration found
      const integration = mailchimpIntegrations[0]
      console.log(`Using Mailchimp integration with ID: ${integration.whop_user_id || integration.company_id}`)

      const apiKey = integration.api_key
      const dc = integration.dc || (apiKey.includes("-") ? apiKey.split("-")[1] : null)
      const listId = integration.list_id

      if (!apiKey || !dc || !listId) {
        console.log("Missing required Mailchimp configuration:", {
          hasApiKey: !!apiKey,
          hasDc: !!dc,
          hasListId: !!listId,
        })
        return NextResponse.json(
          {
            error: "Incomplete Mailchimp configuration. Please reconnect your Mailchimp account.",
          },
          { status: 400 },
        )
      }

      // Fetch list activity from Mailchimp
      const activityUrl = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/activity`
      console.log(`Fetching list activity from: ${activityUrl}`)

      const response = await fetch(activityUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(`anystring:${apiKey}`)}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error(`Failed to fetch list activity: ${response.status} ${response.statusText}`)
        let errorDetail = ""
        try {
          const errorData = await response.json()
          errorDetail = JSON.stringify(errorData)
        } catch (e) {
          try {
            const textContent = await response.text()
            errorDetail = textContent.substring(0, 100) + (textContent.length > 100 ? "..." : "")
          } catch (textError) {
            errorDetail = response.statusText
          }
        }

        // If we get a 404 from Mailchimp, the list might not exist anymore
        if (response.status === 404) {
          return NextResponse.json(
            {
              error: `The Mailchimp list (${listId}) was not found. It may have been deleted. Please reconnect your Mailchimp account.`,
            },
            { status: 404 },
          )
        }

        return NextResponse.json(
          { error: `Failed to fetch list activity from Mailchimp: ${response.status} - ${errorDetail}` },
          { status: response.status },
        )
      }

      const activityData = await response.json()
      console.log("Successfully fetched Mailchimp activity data")
      return NextResponse.json(activityData)
    } catch (dbError) {
      console.error("Storage access error:", dbError)
      return NextResponse.json(
        {
          error: `Storage error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Unhandled error in mailchimp-list-activity route:", error)
    return NextResponse.json(
      { error: `Unhandled error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}
