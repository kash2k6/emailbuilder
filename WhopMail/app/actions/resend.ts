"use server"

import { Resend } from 'resend'
import type { WhopMembership } from "@/app/types"
import { processMembersInBatches, getPlatformLimits } from "./sync-utils"
import { trackBroadcastEmail } from './email-tracking'

export interface ResendApiResponse {
  success: boolean
  domains?: ResendDomain[]
  error?: string
}

export interface ResendDomain {
  id: string
  name: string
  status: 'pending' | 'verified' | 'failed'
  created_at: string
}

export interface ResendContact {
  id: string
  email: string
  first_name?: string
  last_name?: string
  unsubscribed: boolean
  created_at: string
  updated_at: string
}

export interface ResendAudience {
  id: string
  name: string
  contact_count: number
  created_at: string
}

/**
 * Validate Resend API key and fetch domains
 */
export async function validateResendApiKey(apiKey: string): Promise<ResendApiResponse> {
  try {
    const resend = new Resend(apiKey)
    
    // Fetch domains to validate API key
    const { data: domains, error } = await resend.domains.list()
    
    if (error) {
      throw new Error(error.message)
    }
    
    return {
      success: true,
      domains: Array.isArray(domains) ? domains.map((domain: any) => ({
        id: domain.id,
        name: domain.name,
        status: domain.status as 'pending' | 'verified' | 'failed',
        created_at: domain.created_at
      })) : []
    }
  } catch (error) {
    console.error("Error validating Resend API key:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate API key"
    }
  }
}

/**
 * Fetch Resend audiences (contact lists)
 */
export async function fetchResendAudiences(apiKey: string): Promise<{ success: boolean; audiences?: ResendAudience[]; error?: string }> {
  try {
    const resend = new Resend(apiKey)
    
    // Note: Resend doesn't have traditional "audiences" like other platforms
    // We'll create a custom audience system using tags or create a default audience
    const audiences: ResendAudience[] = [
      {
        id: "whop-members",
        name: "Whop Members",
        contact_count: 0,
        created_at: new Date().toISOString()
      }
    ]
    
    return {
      success: true,
      audiences
    }
  } catch (error) {
    console.error("Error fetching Resend audiences:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch audiences"
    }
  }
}

/**
 * Sync a single member to Resend
 */
export async function syncMemberToResend(
  apiKey: string,
  audienceId: string,
  member: WhopMembership,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Syncing member ${member.email} to Resend audience ${audienceId}`)
    
    const resend = new Resend(apiKey)
    
    // Create or update contact in Resend
    const contactData = {
      email: member.email,
      first_name: member.first_name || member.name?.split(" ")[0] || "",
      last_name: member.last_name || member.name?.split(" ").slice(1).join(" ") || "",
      unsubscribed: false,
      audienceId: audienceId,
      // Add custom fields as metadata (excluding whop_member_id to avoid UUID conflicts)
      metadata: {
        username: member.username || "",
        product: member.product || "",
        status: member.status || "",
        whop_member_id_str: member.id, // Renamed to avoid ID confusion
        created_at: member.created_at,
        expires_at: member.expires_at || "",
        valid: member.valid
      }
    }
    
    // Try to create the contact
    try {
      await resend.contacts.create(contactData)
    } catch (createError: any) {
      // If contact already exists, update it
      if (createError.statusCode === 409) {
        const { email, ...updateData } = contactData
        await resend.contacts.update({ email: member.email, ...updateData })
      } else {
        throw createError
      }
    }
    
    console.log(`Successfully synced member ${member.email} to Resend`)
    return { success: true }
  } catch (error) {
    console.error("Error syncing member to Resend:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}

/**
 * Sync multiple members to Resend
 */
export async function syncMembersToResend(
  apiKey: string,
  audienceId: string,
  members: WhopMembership[],
  onProgress?: (progress: number) => void,
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    // Get recommended batch size and delay for Resend
    const { batchSize, delayMs } = getPlatformLimits("resend")

    // Process members in batches
    const result = await processMembersInBatches(
      members,
      batchSize,
      async (batch) => {
        // Process each member in the batch
        for (const member of batch) {
          await syncMemberToResend(apiKey, audienceId, member)
        }
      },
      delayMs
    )

    return {
      success: result.success,
      syncedCount: result.processedCount,
      error: result.error,
    }
  } catch (error) {
    console.error("Error syncing members to Resend:", error)
    return {
      success: false,
      syncedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}

/**
 * Send a test email to verify Resend setup
 */
export async function sendTestEmail(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  subject: string = "Test Email from Whop Email Bridge"
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const resend = new Resend(apiKey)
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: subject,
      html: `
        <h1>Test Email from Whop Email Bridge</h1>
        <p>This is a test email to verify your Resend integration is working correctly.</p>
        <p>If you received this email, your Resend setup is successful!</p>
        <hr>
        <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
      `
    })
    
    if (error) {
      throw new Error(error.message)
    }
    
    return {
      success: true,
      messageId: data?.id
    }
  } catch (error) {
    console.error("Error sending test email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send test email"
    }
  }
}

export async function createResendContact(
  apiKey: string,
  email: string,
  audienceId: string,
  firstName?: string,
  lastName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(apiKey)
    
    console.log(`Creating contact in Resend: ${email} for audience ${audienceId}`)
    
    // Only pass the required fields, explicitly excluding any ID field
    const contactData = {
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      unsubscribed: false,
      audienceId,
    }
    
    console.log('Contact data being sent to Resend:', contactData)
    
    const result = await resend.contacts.create(contactData)

    if (result.error) {
      console.error(`❌ Failed to create contact ${email}:`, result.error)
      return { 
        success: false, 
        error: result.error.message || 'Unknown error from Resend' 
      }
    }

    console.log(`✅ Contact created successfully: ${email}`, result.data)
    return { success: true }
  } catch (error) {
    console.error(`❌ Error creating contact ${email}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function createResendContactsBatch(
  apiKey: string,
  members: { email: string; firstName: string; lastName: string }[],
  audienceId: string
): Promise<{ success: boolean; createdCount: number; errors: string[] }> {
  const resend = new Resend(apiKey)
  let createdCount = 0
  const errors: string[] = []

  console.log(`🚀 Starting batch creation of ${members.length} contacts in Resend audience: ${audienceId}`)
  
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    if (!member.email) {
      const errorMsg = `Member missing email: ${JSON.stringify(member)}`
      console.error(`❌ ${errorMsg}`)
      errors.push(errorMsg)
      continue
    }
    
    console.log(`📧 Processing contact ${i + 1}/${members.length}: ${member.email}`)
    
    try {
      const result = await createResendContact(apiKey, member.email, audienceId, member.firstName, member.lastName)
      if (result.success) {
        createdCount++
        console.log(`✅ Successfully created contact ${createdCount}/${members.length}: ${member.email}`)
      } else {
        const errorMsg = `Failed to create contact ${member.email}: ${result.error}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
        
        // Check if it's a rate limit error and wait longer
        if (result.error && result.error.includes('rate_limit')) {
          console.log(`⏳ Rate limit hit, waiting 2 seconds before continuing...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      // Add delay to respect rate limit (2 requests per second = 1000ms between requests)
      // Use 1000ms to be conservative and stay well under the limit
      if (i < members.length - 1) {
        console.log(`⏳ Waiting 1000ms to respect rate limit...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
    } catch (error) {
      const errorMsg = `Error creating contact ${member.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`❌ ${errorMsg}`)
      errors.push(errorMsg)
      
      // Check if it's a rate limit error and wait longer
      const isRateLimitError = error instanceof Error && 
        (error.message.includes('rate_limit') || 
         error.message.includes('Too many requests') ||
         error.message.includes('429'))
      
      if (isRateLimitError) {
        console.log(`⏳ Rate limit error detected, waiting 3 seconds before continuing...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      } else {
        // Add delay even on error to respect rate limit
        if (i < members.length - 1) {
          console.log(`⏳ Waiting 1000ms after error to respect rate limit...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
  }
  
  console.log(`🏁 Batch creation complete: ${createdCount} created, ${errors.length} errors`)
  return { success: true, createdCount, errors }
}

export async function sendEmailCampaignToWhopMembers(
  apiKey: string,
  fromEmail: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  members: WhopMembership[],
  whopUserId?: string,
  scheduledAt?: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    console.log(`Starting email campaign to ${members.length} Whop members`)
    console.log(`From: ${fromEmail}`)
    console.log(`Subject: ${subject}`)
    if (scheduledAt) {
      console.log(`Scheduled for: ${scheduledAt}`)
    }

    // First, create a Resend audience and add all contacts
    const resend = new Resend(apiKey)
    
    // Create audience
    const audienceResult = await resend.audiences.create({
      name: `Whop Campaign - ${new Date().toISOString().split('T')[0]}`,
    })

    if (!audienceResult.data?.id) {
      throw new Error('Failed to create Resend audience')
    }

    const audienceId = audienceResult.data.id
    console.log(`Created Resend audience: ${audienceId}`)

    // Add all contacts to the audience
    const membersWithNames = members.map(member => ({
      email: member.email,
      firstName: member.username || '',
      lastName: ''
    }))

    const contactResult = await createResendContactsBatch(
      apiKey,
      membersWithNames,
      audienceId
    )

    if (!contactResult.success) {
      console.warn(`Contact creation had errors: ${contactResult.errors.length} failures`)
    }

    console.log(`Added ${contactResult.createdCount} contacts to audience`)

    // Create broadcast using the proper broadcasts API
    const broadcastResult = await resend.broadcasts.create({
      audienceId: audienceId,
      from: fromEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
      name: `Direct Campaign: ${whopUserId || 'Unknown'} (${fromEmail}) - ${subject}`
    })

    if (broadcastResult.error) {
      throw new Error(`Failed to create broadcast: ${broadcastResult.error.message}`)
    }

    const broadcastId = broadcastResult.data?.id
    if (!broadcastId) {
      throw new Error('Failed to get broadcast ID from response')
    }

    console.log(`Created broadcast: ${broadcastId}`)

    // Send the broadcast (with scheduling if provided)
    const sendOptions: any = {}
    if (scheduledAt) {
      sendOptions.scheduledAt = scheduledAt
    }

    const sendResult = await resend.broadcasts.send(broadcastId, sendOptions)

    if (sendResult.error) {
      throw new Error(`Failed to send broadcast: ${sendResult.error.message}`)
    }

    const actionText = scheduledAt ? 'Scheduled' : 'Sent'
    console.log(`${actionText} broadcast successfully to ${contactResult.createdCount} recipients`)
    
    // Track the broadcast in our database for analytics
    if (whopUserId) {
      try {
        await trackBroadcastEmail({
          whopUserId,
          resendBroadcastId: broadcastId,
          subject,
          fromEmail,
          audienceId,
          recipientCount: contactResult.createdCount,
          htmlContent,
          textContent
        })
        console.log(`✅ Broadcast tracked for analytics`)
      } catch (trackingError) {
        console.warn(`⚠️ Failed to track broadcast for analytics:`, trackingError)
        // Don't fail the email send if tracking fails
      }
    }
    
    return {
      success: true,
      sentCount: contactResult.createdCount
    }

  } catch (error) {
    console.error('Error sending email campaign:', error)
    return {
      success: false,
      sentCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get Resend contact data for a specific email
 */
export async function getResendContactData(
  apiKey: string,
  email: string
): Promise<{ success: boolean; contact?: ResendContact; error?: string }> {
  try {
    const resend = new Resend(apiKey)
    
    // Note: Resend contacts.get requires audienceId, but we don't have it here
    // For now, we'll return an error indicating this limitation
    return {
      success: false,
      error: "Contact lookup requires audience ID - not implemented in this version"
    }
  } catch (error) {
    console.error("Error fetching Resend contact data:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch contact data"
    }
  }
} 

export async function addDomainToResend(domain: string): Promise<{ success: boolean; domainId?: string; verificationRecord?: string; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" }
    }

    const response = await fetch('https://api.resend.com/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return { success: false, error: `Failed to add domain: ${errorData.message || response.statusText}` }
    }

    const domainData = await response.json()
    console.log('Domain added to Resend:', domainData)
    console.log('Full domain creation response:', JSON.stringify(domainData, null, 2))
    
    // Extract verification record if available
    let verificationRecord = null
    if (domainData.verification && domainData.verification.record) {
      verificationRecord = domainData.verification.record
    } else if (domainData.verification_record) {
      verificationRecord = domainData.verification_record
    }
    
    return { 
      success: true, 
      domainId: domainData.id,
      verificationRecord: verificationRecord
    }
  } catch (error) {
    console.error('Error adding domain to Resend:', error)
    return { success: false, error: `Failed to add domain: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * Get domain by name (for existing domains)
 */
export async function getDomainByName(domainName: string): Promise<{ success: boolean; domainId?: string; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" }
    }

    // First, list all domains to find the one we want
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return { success: false, error: `Failed to list domains: ${errorData.message || response.statusText}` }
    }

    const domainsData = await response.json()
    console.log('All domains from Resend:', domainsData)

    // Find the domain by name
    const domain = domainsData.data?.find((d: any) => d.name === domainName)
    if (domain) {
      console.log('Found existing domain:', domain)
      return { success: true, domainId: domain.id }
    } else {
      return { success: false, error: `Domain ${domainName} not found in Resend account` }
    }
  } catch (error) {
    console.error('Error getting domain by name:', error)
    return { success: false, error: `Failed to get domain: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function getDomainStatus(domainId: string): Promise<{ success: boolean; verified: boolean; status?: string; records?: any[]; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, verified: false, error: "Resend API key not configured" }
    }

    const response = await fetch(`https://api.resend.com/domains/${domainId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return { success: false, verified: false, error: `Failed to get domain status: ${errorData.message || response.statusText}` }
    }

    const domainData = await response.json()
    console.log('Domain status from Resend:', domainData)
    console.log('Full domain data structure:', JSON.stringify(domainData, null, 2))
    
    const isVerified = domainData.status === 'verified'
    let records = domainData.records || []
    
    // If domain is not started, we need to get the verification record
    if (domainData.status === 'not_started') {
      try {
        // Check for verification record in various possible locations
        let verificationRecord = null
        
        // Check in domainData.verification
        if (domainData.verification && domainData.verification.record) {
          verificationRecord = domainData.verification.record
        }
        // Check in domainData.verification_record
        else if (domainData.verification_record) {
          verificationRecord = domainData.verification_record
        }
        // Check if there's a verification record in the records array
        else if (domainData.records) {
          const verificationRec = domainData.records.find((rec: any) => 
            rec.record === 'VERIFICATION' || 
            rec.type === 'TXT' && rec.name === '@' && rec.value && rec.value.includes('resend-verification')
          )
          if (verificationRec) {
            verificationRecord = verificationRec.value
          }
        }
        
        // If we still don't have a verification record, try to get it from the verify endpoint
        if (!verificationRecord) {
          console.log('No verification record found in domain data, trying verify endpoint...')
          const verificationResult = await getDomainVerificationRecord(domainId)
          if (verificationResult.success && verificationResult.record) {
            verificationRecord = verificationResult.record
          }
        }
        
        // If we found a verification record, add it to the records
        if (verificationRecord) {
          records.unshift({
            record: 'VERIFICATION',
            name: '@',
            type: 'TXT',
            value: verificationRecord,
            ttl: 'Auto',
            status: 'not_started'
          })
        } else {
          console.log('No verification record found in domain data. Available fields:', Object.keys(domainData))
          if (domainData.verification) {
            console.log('Verification object:', domainData.verification)
          }
        }
      } catch (verificationError) {
        console.log('Could not get verification record:', verificationError)
      }
    }
    
    return { 
      success: true, 
      verified: isVerified, 
      status: domainData.status,
      records: records
    }
  } catch (error) {
    console.error('Error getting domain status from Resend:', error)
    return { success: false, verified: false, error: `Failed to get domain status: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
} 


/**
 * Get domain verification record by calling the verify endpoint
 */
export async function getDomainVerificationRecord(domainId: string): Promise<{ success: boolean; record?: string; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" }
    }

    const response = await fetch(`https://api.resend.com/domains/${domainId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend verification API error:', errorData)
      return { success: false, error: `Failed to get verification record: ${errorData.message || response.statusText}` }
    }

    const verificationData = await response.json()
    console.log('Domain verification data from Resend:', verificationData)
    
    // The verify endpoint should return the verification record
    let record = null
    if (verificationData.verification && verificationData.verification.record) {
      record = verificationData.verification.record
    } else if (verificationData.record) {
      record = verificationData.record
    }
    
    return { 
      success: true, 
      record: record
    }
  } catch (error) {
    console.error('Error getting domain verification record from Resend:', error)
    return { success: false, error: `Failed to get verification record: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function createResendAudience(name: string): Promise<{ success: boolean; audienceId?: string; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" }
    }

    const response = await fetch('https://api.resend.com/audiences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return { success: false, error: `Failed to create audience: ${errorData.message || response.statusText}` }
    }

    const audienceData = await response.json()
    console.log('Audience created in Resend:', audienceData)
    
    return { success: true, audienceId: audienceData.id }
  } catch (error) {
    console.error('Error creating Resend audience:', error)
    return { success: false, error: `Failed to create audience: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function getResendAudience(audienceId: string): Promise<{ success: boolean; audience?: any; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" }
    }

    const resend = new Resend(apiKey)
    
    const audienceResult = await resend.audiences.get(audienceId)
    
    if (audienceResult.error) {
      console.error('Resend API error:', audienceResult.error)
      return { success: false, error: `Failed to get audience: ${audienceResult.error.message}` }
    }

    console.log('Resend audience data:', audienceResult.data)
    
    return { success: true, audience: audienceResult.data }
  } catch (error) {
    console.error('Error getting Resend audience:', error)
    return { success: false, error: `Failed to get audience: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function listResendAudiences(): Promise<{ success: boolean; audiences?: any[]; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" }
    }

    const resend = new Resend(apiKey)
    
    const audiencesResult = await resend.audiences.list()
    
    if (audiencesResult.error) {
      console.error('Resend API error:', audiencesResult.error)
      return { success: false, error: `Failed to list audiences: ${audiencesResult.error.message}` }
    }

    const audiences = (audiencesResult.data as unknown as any[]) || []
    console.log(`Found ${audiences.length} audiences in Resend`)
    
    return { success: true, audiences }
  } catch (error) {
    console.error('Error listing Resend audiences:', error)
    return { success: false, error: `Failed to list audiences: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function deleteResendAudience(audienceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" }
    }

    const response = await fetch(`https://api.resend.com/audiences/${audienceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return { success: false, error: `Failed to delete audience: ${errorData.message || response.statusText}` }
    }

    const deleteData = await response.json()
    console.log('Audience deleted from Resend:', deleteData)
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting Resend audience:', error)
    return { success: false, error: `Failed to delete audience: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
} 

/**
 * Update domain settings
 */
export async function updateDomainSettings(
  domainId: string,
  settings: {
    click_tracking?: boolean
    open_tracking?: boolean
    tls?: 'opportunistic' | 'enforced'
  }
): Promise<{ success: boolean; error?: string; domain?: any }> {
  try {
    console.log('Updating domain settings for domain:', domainId, 'settings:', settings)
    
    const response = await fetch(`https://api.resend.com/domains/${domainId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        click_tracking: settings.click_tracking,
        open_tracking: settings.open_tracking,
        tls: settings.tls
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error updating domain settings:', errorData)
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
      }
    }

    const domain = await response.json()
    console.log('Domain settings updated successfully:', domain)
    return { success: true, domain }
  } catch (error) {
    console.error('Error updating domain settings:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
} 

export async function getResendAudienceContactCount(audienceId: string): Promise<{ success: boolean; contactCount?: number; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" }
    }

    const resend = new Resend(apiKey)
    
    const audienceResult = await resend.audiences.get(audienceId)
    
    if (audienceResult.error) {
      console.error('Resend API error:', audienceResult.error)
      return { success: false, error: `Failed to get audience: ${audienceResult.error.message}` }
    }

    console.log('Resend audience data:', audienceResult.data)
    
    // The contact count might be in a different property, let's check the structure
    const contactCount = (audienceResult.data as any)?.contact_count || 0
    return { success: true, contactCount }
  } catch (error) {
    console.error('Error getting Resend audience contact count:', error)
    return { success: false, error: `Failed to get audience contact count: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function getResendAudienceContacts(audienceId: string): Promise<{ success: boolean; contacts?: any[]; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" }
    }

    const resend = new Resend(apiKey)
    
    const contactsResult = await resend.contacts.list({
      audienceId: audienceId,
    })
    
    if (contactsResult.error) {
      console.error('Resend API error:', contactsResult.error)
      return { success: false, error: `Failed to get contacts: ${contactsResult.error.message}` }
    }

    const contacts = (contactsResult.data as unknown as any[]) || []
    console.log(`Found ${contacts.length} contacts in Resend audience`)
    
    return { success: true, contacts }
  } catch (error) {
    console.error('Error getting Resend audience contacts:', error)
    return { success: false, error: `Failed to get audience contacts: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
} 