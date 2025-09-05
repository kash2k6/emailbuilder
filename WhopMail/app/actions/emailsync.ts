"use server"

import type { Database } from '@/lib/database.types'
import type { WhopMembership } from '@/app/types'
import { revalidatePath } from 'next/cache'
import { createResendAudience } from './resend'
import { trackSentEmail } from './email-tracking'
import { trackBroadcastEmail } from './email-tracking'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase-server'

// Initialize Supabase client
const supabase = createClient()

// Rate limiting and caching for Resend API calls
const resendApiCache = new Map<string, { data: any; timestamp: number }>()
const RESEND_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const RESEND_RATE_LIMIT_DELAY = 1000 // 1 second between calls (conservative for 2 req/sec limit)

// Helper function to add delay between API calls
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper function to get cached data or fetch with rate limiting
async function getCachedOrFetchResendData(key: string, fetchFunction: () => Promise<any>): Promise<any> {
  const now = Date.now()
  const cached = resendApiCache.get(key)
  
  if (cached && (now - cached.timestamp) < RESEND_CACHE_DURATION) {
    console.log(`📦 Using cached data for: ${key}`)
    return cached.data
  }
  
  // Add delay to respect rate limits
  await delay(RESEND_RATE_LIMIT_DELAY)
  
  console.log(`🔄 Fetching fresh data for: ${key}`)
  const data = await fetchFunction()
  
  // Cache the result
  resendApiCache.set(key, { data, timestamp: now })
  
  return data
}

// Helper function to encrypt API keys (implement proper encryption in production)
function encryptApiKey(apiKey: string): string {
  // TODO: Implement proper encryption
  return apiKey
}

// Helper function to decrypt API keys (implement proper decryption in production)
function decryptApiKey(encryptedApiKey: string): string {
  // TODO: Implement proper decryption
  return encryptedApiKey
}

/**
 * Save EmailSync platform configuration
 */
export async function saveEmailSyncConfig(whopUserId: string, domain: string, domainId?: string, fromName?: string): Promise<{ success: boolean; error?: string; domainId?: string }> {
  const maxRetries = 3
  let retryCount = 0
  
  while (retryCount < maxRetries) {
    try {
      console.log(`Saving EmailSync config for domain: ${domain} (attempt ${retryCount + 1}/${maxRetries})`)
    
    // First, check if a config already exists for this user
    const { data: existingConfig, error: checkError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing config:', checkError)
      return { success: false, error: checkError.message }
    }

    let resendDomainId = domainId
    let dnsRecords = []
    let domainResult: any = null

          // If no domainId provided or domain changed, we need to get/create the domain in Resend
      if (!resendDomainId || (existingConfig && existingConfig.custom_domain !== domain)) {
        console.log('Domain ID missing or domain changed, checking Resend...')
        
        // Import the Resend functions
        const { addDomainToResend, getDomainByName } = await import('@/app/actions/resend')
        
        // First, try to get the domain if it already exists
        const existingDomainResult = await getDomainByName(domain)
        
        // Add delay to respect rate limits
        await delay(RESEND_RATE_LIMIT_DELAY)
        
        if (existingDomainResult.success) {
          // Domain already exists in Resend
          resendDomainId = existingDomainResult.domainId
          console.log('Found existing domain in Resend with ID:', resendDomainId)
        } else {
          // Domain doesn't exist, create it
          console.log('Domain not found in Resend, creating new domain...')
          domainResult = await addDomainToResend(domain)
          
          if (!domainResult.success) {
            console.error('Failed to create domain in Resend:', domainResult.error)
            throw new Error(domainResult.error || 'Failed to create domain in Resend')
          }
          
          resendDomainId = domainResult.domainId
          console.log('Domain created in Resend with ID:', resendDomainId)
          
          // If we got a verification record from domain creation, use it
          if (domainResult.verificationRecord) {
            console.log('Got verification record from domain creation:', domainResult.verificationRecord)
            dnsRecords.unshift({
              record: 'VERIFICATION',
              name: '@',
              type: 'TXT',
              value: domainResult.verificationRecord,
              ttl: 'Auto',
              status: 'not_started'
            })
          }
        }
      }

    // Get domain details from Resend to get DNS records
    if (resendDomainId) {
      try {
        // Add delay to respect rate limits
        await delay(RESEND_RATE_LIMIT_DELAY)
        
        const { getDomainStatus } = await import('@/app/actions/resend')
        const domainDetails = await getDomainStatus(resendDomainId)
        if (domainDetails.success && domainDetails.records) {
          dnsRecords = [...dnsRecords, ...domainDetails.records]
          console.log('Retrieved DNS records from Resend:', dnsRecords)
        }
      } catch (error) {
        console.log('Could not retrieve DNS records from Resend:', error)
      }
    }

    // If no fromName provided, try to get it from company settings
    let finalFromName = fromName
    if (!finalFromName) {
      try {
        const { data: companyData } = await supabase
          .from('email_platform_configs')
          .select('company_name')
          .eq('whop_user_id', whopUserId)
          .eq('platform_type', 'resend')
          .single()
        
        if (companyData?.company_name) {
          finalFromName = companyData.company_name
          console.log('Using company name as from_name:', finalFromName)
        }
      } catch (error) {
        console.log('Could not fetch company name, using default')
      }
    }

    const configData = {
      whop_user_id: whopUserId,
      platform_type: 'resend',
      email_type: 'custom',
      custom_domain: domain,
      domain_id: resendDomainId,
      domain_status: 'pending', // Always start as pending until verified
      domain_verification_dns: dnsRecords,
      from_email: finalFromName ? `${finalFromName}@${domain}` : `noreply@${domain}`,
      from_name: finalFromName || null,
      updated_at: new Date().toISOString()
    }

    let result
    if (existingConfig) {
      // Update existing config
      result = await supabase
        .from('email_platform_configs')
        .update(configData)
        .eq('id', existingConfig.id)
    } else {
      // Insert new config
      result = await supabase
        .from('email_platform_configs')
        .insert({
          ...configData,
          created_at: new Date().toISOString()
        })
    }

    if (result.error) {
      console.error('Error saving EmailSync config:', result.error)
      return { success: false, error: result.error.message }
    }

      console.log('EmailSync config saved successfully:', result.data)
      return { success: true, domainId: resendDomainId }
    } catch (error) {
      retryCount++
      console.error(`Error saving EmailSync config (attempt ${retryCount}/${maxRetries}):`, error)
      
      // Check if it's a rate limit error
      const isRateLimitError = error instanceof Error && 
        (error.message.includes('rate_limit') || 
         error.message.includes('Too many requests') ||
         error.message.includes('429'))
      
      if (retryCount >= maxRetries) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
      
      // Wait longer for rate limit errors
      const delayMs = isRateLimitError ? 5000 : 2000
      console.log(`⏳ Waiting ${delayMs}ms before retry ${retryCount + 1}...`)
      await delay(delayMs)
    }
  }
  
  // This should never be reached, but TypeScript requires it
  return { success: false, error: 'Max retries exceeded' }
}

/**
 * Get EmailSync platform configuration
 */
export async function getEmailSyncConfig(whopUserId: string, checkDomainStatus: boolean = true) {
  try {
    console.log('Getting EmailSync config for user:', whopUserId)
    
    // First, let's see what's in the database for this user
    const { data: allConfigs, error: allError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
    
    console.log('All configs for user:', allConfigs)
    if (allError) {
      console.error('Error fetching all configs:', allError)
    }
    
    const { data: config, error } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      // Remove the platform_type filter to allow both whopmail and custom domain configs
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (error) {
      console.error('Error fetching EmailSync config:', error)
      return { success: false, error: error.message }
    }

    if (!config) {
      console.log('No config found for user:', whopUserId)
      return { success: false, error: 'No EmailSync configuration found' }
    }

    console.log('Found EmailSync config:', config)

    // Only check domain status if requested and we have a domain_id
    if (checkDomainStatus && config.domain_id) {
      try {
        const cacheKey = `domain_status_${config.domain_id}`
        const domainStatus = await getCachedOrFetchResendData(cacheKey, async () => {
          const { getDomainStatus } = await import('@/app/actions/resend')
          return await getDomainStatus(config.domain_id!)
        })
        
        if (domainStatus.success) {
          config.domain_status = domainStatus.status
          config.domain_verification_dns = domainStatus.records
        }
      } catch (domainError) {
        console.warn('Failed to check domain status:', domainError)
        // Don't fail the entire config fetch if domain check fails
      }
    }

    return { success: true, config }
  } catch (error) {
    console.error('Error in getEmailSyncConfig:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get EmailSync config' 
    }
  }
}

/**
 * Create or update email audience
 */
export async function saveEmailAudience(
  configId: string,
  audience: {
    audience_id: string
    name: string
    description?: string
  },
  whopUserId?: string
) {
  try {
    // Check if audience already exists
    const { data: existing } = await supabase
      .from('email_audiences')
      .select('id')
      .eq('config_id', configId)
      .eq('audience_id', audience.audience_id)
      .single()
    
    if (existing) {
      // Update existing audience
      const { data, error } = await supabase
        .from('email_audiences')
        .update({
          name: audience.name,
          description: audience.description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      return { success: true, audienceId: data.id, isNew: false }
    } else {
      // Create new audience
      const { data, error } = await supabase
        .from('email_audiences')
        .insert({
          config_id: configId,
          audience_id: audience.audience_id,
          name: audience.name,
          description: audience.description || null,
          member_count: 0,
          unsubscribed_count: 0,
          whop_user_id: whopUserId || null,
          is_active: true
        })
        .select()
        .single()
      
      if (error) throw error
      return { success: true, audienceId: data.id, isNew: true }
    }
  } catch (error) {
    console.error('Error in saveEmailAudience:', error)
    throw error
  }
}

/**
 * Sync Whop members to email contacts
 */
export async function syncWhopMembersToEmailContacts(
  audienceId: string,
  members: WhopMembership[],
  onProgress?: (progress: number) => void
) {
  try {
    console.log(`Starting sync of ${members.length} members to database audience ${audienceId}`)
    
    // Create sync log entry
    const { data: syncLog } = await supabase
      .from('email_sync_logs')
      .insert({
        config_id: (await getAudienceConfigId(audienceId)) || '',
        sync_type: 'contacts',
        status: 'started',
        total_items: members.length,
        processed_items: 0,
        failed_items: 0
      })
      .select()
      .single()
    
    let processedCount = 0
    let failedCount = 0
    
    // Filter members with emails
    const membersWithEmails = members.filter(member => member.email)
    console.log(`Found ${membersWithEmails.length} members with emails out of ${members.length} total`)
    
    // Log some examples of members without emails
    const membersWithoutEmails = members.filter(member => !member.email).slice(0, 5)
    if (membersWithoutEmails.length > 0) {
      console.log('Examples of members without emails:')
      membersWithoutEmails.forEach((member, index) => {
        console.log(`  ${index + 1}. ID: ${member.id}, Name: ${member.name}, Username: ${member.username}`)
      })
    }
    
    // Log some examples of members with emails
    if (membersWithEmails.length > 0) {
      console.log('Examples of members with emails:')
      membersWithEmails.slice(0, 5).forEach((member, index) => {
        console.log(`  ${index + 1}. ID: ${member.id}, Email: ${member.email}, Name: ${member.name}`)
      })
    }
    
    if (membersWithEmails.length === 0) {
      console.log('No members with emails to sync')
      return { success: true, processedCount: 0, failedCount: members.length }
    }
    
    // Process members in batches for local database
    const batchSize = 50
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize)
      
      for (const member of batch) {
        try {
          if (!member.email) {
            console.warn(`Skipping member ${member.id} - no email`)
            failedCount++
            continue
          }
          
          // Check if contact already exists
          const { data: existing } = await supabase
            .from('email_contacts')
            .select('id')
            .eq('audience_id', audienceId)
            .eq('email', member.email)
            .single()
          
          const contactData = {
            audience_id: audienceId,
            email: member.email,
            whop_member_id: member.id,
            first_name: member.name?.split(' ')[0] || null,
            last_name: member.name?.split(' ').slice(1).join(' ') || null,
            full_name: member.name || null,
            is_subscribed: true,
            is_unsubscribed: false,
            platform_contact_data: {
              whop_member: member,
              synced_at: new Date().toISOString()
            },
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced' as const
          }
          
          if (existing) {
            // Update existing contact
            await supabase
              .from('email_contacts')
              .update(contactData)
              .eq('id', existing.id)
          } else {
            // Create new contact
            await supabase
              .from('email_contacts')
              .insert(contactData)
          }
          
          processedCount++
        } catch (error) {
          console.error(`Error syncing member ${member.id}:`, error)
          failedCount++
        }
      }
      
      // Update progress
      const progress = Math.round((processedCount / members.length) * 100)
      onProgress?.(progress)
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Update sync log
    await supabase
      .from('email_sync_logs')
      .update({
        status: 'completed',
        processed_items: processedCount,
        failed_items: failedCount,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(syncLog?.started_at || Date.now()).getTime()
      })
      .eq('id', syncLog?.id)
    
    // Update audience member count
    await supabase
      .from('email_audiences')
      .update({
        member_count: processedCount,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', audienceId)
    
    console.log(`✅ Database sync completed: ${processedCount} processed, ${failedCount} failed`)
    
    return { success: true, processedCount, failedCount }
  } catch (error) {
    console.error('Error in syncWhopMembersToEmailContacts:', error)
    throw error
  }
}

/**
 * Create email campaign
 */
export async function createEmailCampaign(
  configId: string,
  audienceId: string,
  campaign: {
    name: string
    subject: string
    content: string
    text_content?: string
  }
) {
  try {
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        config_id: configId,
        audience_id: audienceId,
        name: campaign.name,
        subject: campaign.subject,
        content: campaign.content,
        text_content: campaign.text_content || null,
        status: 'draft',
        total_recipients: 0,
        delivered_count: 0,
        opened_count: 0,
        clicked_count: 0,
        bounced_count: 0,
        unsubscribed_count: 0
      })
      .select()
      .single()
    
    if (error) throw error
    return { success: true, campaignId: data.id }
  } catch (error) {
    console.error('Error in createEmailCampaign:', error)
    throw error
  }
}

/**
 * Get user's email overview
 */
export async function getUserEmailOverview(whopUserId: string) {
  try {
    const { data, error } = await supabase
      .from('user_email_overview')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error in getUserEmailOverview:', error)
    throw error
  }
}

/**
 * Get user's email audiences
 */
export async function getUserEmailAudiences(whopUserId: string) {
  try {
    console.log('Getting email audiences for user:', whopUserId)
    
    // First, get the user's email platform config
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .single()
    
    if (configError) {
      console.error('Error getting email platform config:', configError)
      return []
    }
    
    if (!config) {
      console.log('No email platform config found for user')
      return []
    }
    
    console.log('Found config ID:', config.id)
    
    // Then get the audiences for this config
    const { data: audiences, error: audiencesError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('config_id', config.id)
      .order('created_at', { ascending: false })
    
    if (audiencesError) {
      console.error('Error getting audiences:', audiencesError)
      throw audiencesError
    }
    
    console.log('Found audiences:', audiences)
    return audiences || []
  } catch (error) {
    console.error('Error in getUserEmailAudiences:', error)
    throw error
  }
}

/**
 * Get audience contacts
 */
export async function getAudienceContacts(audienceId: string, limit = 100, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('email_contacts')
      .select('*')
      .eq('audience_id', audienceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error in getAudienceContacts:', error)
    throw error
  }
}

/**
 * Get user's email campaigns
 */
export async function getUserEmailCampaigns(whopUserId: string) {
  try {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_platform_configs!inner(whop_user_id)
      `)
      .eq('email_platform_configs.whop_user_id', whopUserId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error in getUserEmailCampaigns:', error)
    throw error
  }
}

/**
 * Helper function to get config ID from audience ID
 */
async function getAudienceConfigId(audienceId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('email_audiences')
      .select('config_id')
      .eq('id', audienceId)
      .single()
    
    if (error) return null
    return data.config_id
  } catch (error) {
    return null
  }
}

/**
 * Delete email configuration
 */
export async function deleteEmailSyncConfig(whopUserId: string) {
  try {
    const { error } = await supabase
      .from('email_platform_configs')
      .delete()
      .eq('whop_user_id', whopUserId)
    
    if (error) throw error
    
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteEmailSyncConfig:', error)
    throw error
  }
}

/**
 * Update email configuration
 */
export async function updateEmailSyncConfig(
  whopUserId: string,
  updates: Partial<Database['public']['Tables']['email_platform_configs']['Update']>
) {
  try {
    const { data, error } = await supabase
      .from('email_platform_configs')
      .update(updates)
      .eq('whop_user_id', whopUserId)
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath('/dashboard')
    return { success: true, config: data }
  } catch (error) {
    console.error('Error in updateEmailSyncConfig:', error)
    throw error
  }
}

/**
 * Clear EmailSync configuration to allow domain switching
 */
export async function clearEmailSyncConfig(whopUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Clearing EmailSync config for user:', whopUserId)
    
    // Instead of deleting, we'll update the config to reset it
    const { error } = await supabase
      .from('email_platform_configs')
      .update({
        email_type: 'custom', // Keep a valid value to satisfy NOT NULL constraint
        username: null,
        custom_domain: null,
        from_email: 'noreply@example.com', // Keep a valid email to satisfy NOT NULL constraint
        domain_id: null,
        domain_status: null,
        domain_verification_dns: null,
        api_key: null,
        list_id: null,
        is_active: false,
        last_sync_at: null,
        sync_status: 'idle',
        sync_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')

    if (error) {
      console.error('Error clearing EmailSync config:', error)
      return { success: false, error: error.message }
    }

    console.log('EmailSync config cleared successfully')
    return { success: true }
  } catch (error) {
    console.error('Error clearing EmailSync config:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update domain verification status
 */
export async function updateDomainVerificationStatus(whopUserId: string, domainId: string, status: string, records?: any[]): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
        domain_status: status,
        updated_at: new Date().toISOString()
    }
    
    // If records are provided, update them too
    if (records) {
      updateData.domain_verification_dns = records
    }
    
    const { data, error } = await supabase
      .from('email_platform_configs')
      .update(updateData)
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')

    if (error) {
      console.error('Error updating domain verification status:', error)
      return { success: false, error: error.message }
    }

    console.log('Domain verification status updated successfully:', data)
    return { success: true }
  } catch (error) {
    console.error('Error updating domain verification status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
} 

/**
 * Create EmailSync audience (creates in Resend first, then saves to our DB)
 */
export async function createEmailSyncAudience(
  whopUserId: string,
  audienceName: string,
  description?: string
): Promise<{ success: boolean; audienceId?: string; error?: string }> {
  try {
    console.log('Creating EmailSync audience:', { whopUserId, audienceName, description })
    
    // First, create the audience in Resend
    const resendResult = await createResendAudience(audienceName)
    if (!resendResult.success) {
      console.error('Failed to create audience in Resend:', resendResult.error)
      return { success: false, error: resendResult.error }
    }

    console.log('Audience created in Resend with ID:', resendResult.audienceId)

    // Get the config ID for this user
    const configResult = await getEmailSyncConfig(whopUserId)
    if (!configResult.success || !configResult.config) {
      console.error('Failed to get EmailSync config for user:', whopUserId)
      return { success: false, error: 'EmailSync configuration not found. Please set up your domain first.' }
    }

    const configId = configResult.config.id

    // Then save the audience to our database with proper user assignment
    const audienceData = {
      audience_id: resendResult.audienceId!,
      name: audienceName,
      description: description || `Email list for ${audienceName}`
    }

    const saveResult = await saveEmailAudience(configId, audienceData, whopUserId)
    if (!saveResult.success) {
      console.error('Failed to save audience to database:', saveResult)
      return { success: false, error: 'Failed to save audience to database' }
    }

    // Update the audience with the whop_user_id for direct access
    const { error: updateError } = await createClient()
      .from('email_audiences')
      .update({ 
        whop_user_id: whopUserId,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', saveResult.audienceId)

    if (updateError) {
      console.error('Failed to update audience with whop_user_id:', updateError)
      // Don't fail the operation, just log the error
    }

    console.log('EmailSync audience created successfully:', {
      resendAudienceId: resendResult.audienceId,
      dbAudienceId: saveResult.audienceId,
      whopUserId: whopUserId
    })

    return { 
      success: true, 
      audienceId: saveResult.audienceId 
    }
  } catch (error) {
    console.error('Error creating EmailSync audience:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
} 

/**
 * Clean up corrupted domain data and properly save domain configuration
 */
export async function cleanupAndSaveDomain(whopUserId: string, domain: string): Promise<{ success: boolean; error?: string; domainId?: string }> {
  try {
    console.log('Cleaning up domain data for user:', whopUserId, 'domain:', domain)
    
    // First, get the existing domain from Resend (since it's already registered)
    const { getDomainByName } = await import('@/app/actions/resend')
    const domainResult = await getDomainByName(domain)
    if (!domainResult.success) {
      console.error('Failed to get domain from Resend:', domainResult.error)
      return { success: false, error: domainResult.error }
    }

    console.log('Found existing domain in Resend with ID:', domainResult.domainId)

    // Update the existing config with clean data
    const { data, error } = await supabase
      .from('email_platform_configs')
      .update({
        custom_domain: domain,
        domain_id: domainResult.domainId,
        domain_status: 'pending', // We'll check the actual status next
        from_email: `noreply@${domain}`,
        updated_at: new Date().toISOString()
      })
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .select()
      .single()

    if (error) {
      console.error('Error updating domain config:', error)
      return { success: false, error: error.message }
    }

    console.log('Domain config cleaned up successfully:', data)
    return { success: true, domainId: domainResult.domainId }
  } catch (error) {
    console.error('Error cleaning up domain data:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
} 

/**
 * Directly fix corrupted domain data in database
 */
export async function fixCorruptedDomainData(whopUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Fixing corrupted domain data for user:', whopUserId)
    
    // First, get the existing config to see the corrupted data
    const { data: existingConfig, error: fetchError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .single()

    if (fetchError) {
      console.error('Error fetching existing config:', fetchError)
      return { success: false, error: fetchError.message }
    }

    console.log('Found existing config with corrupted data:', existingConfig)

    // Extract the actual domain from the corrupted JSON
    let actualDomain = 'spikealerts.online' // Default fallback
    try {
      if (existingConfig.custom_domain && existingConfig.custom_domain.startsWith('{')) {
        const parsed = JSON.parse(existingConfig.custom_domain)
        actualDomain = parsed.custom_domain || 'spikealerts.online'
      } else {
        actualDomain = existingConfig.custom_domain || 'spikealerts.online'
      }
    } catch (e) {
      console.log('Could not parse JSON, using fallback domain')
      actualDomain = 'spikealerts.online'
    }

    console.log('Extracted actual domain:', actualDomain)

    // Get the domain from Resend
    const { getDomainByName } = await import('@/app/actions/resend')
    const domainResult = await getDomainByName(actualDomain)
    
    if (!domainResult.success) {
      console.error('Failed to get domain from Resend:', domainResult.error)
      return { success: false, error: domainResult.error }
    }

    console.log('Found domain in Resend with ID:', domainResult.domainId)

    // Update the database with clean data
    const { data, error } = await supabase
      .from('email_platform_configs')
      .update({
        custom_domain: actualDomain,
        domain_id: domainResult.domainId,
        domain_status: 'pending', // We'll check the actual status next
        from_email: `noreply@${actualDomain}`,
        updated_at: new Date().toISOString()
      })
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .select()
      .single()

    if (error) {
      console.error('Error updating domain config:', error)
      return { success: false, error: error.message }
    }

    console.log('Domain config fixed successfully:', data)
    return { success: true }
  } catch (error) {
    console.error('Error fixing corrupted domain data:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
} 

/**
 * Check and update domain status from Resend
 */
export async function checkAndUpdateDomainStatus(whopUserId: string): Promise<{ success: boolean; error?: string; status?: string }> {
  try {
    console.log('Checking domain status for user:', whopUserId)
    
    // Get the current config
    const { data: config, error: fetchError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .single()

    if (fetchError) {
      console.error('Error fetching config:', fetchError)
      return { success: false, error: fetchError.message }
    }

    if (!config.domain_id) {
      console.log('No domain ID found, domain not properly set up')
      return { success: false, error: 'Domain not properly set up' }
    }

    console.log('Checking status for domain ID:', config.domain_id)

    // Get the actual status from Resend
    const { getDomainStatus } = await import('@/app/actions/resend')
    const statusResult = await getDomainStatus(config.domain_id)
    
    if (!statusResult.success) {
      console.error('Failed to get domain status from Resend:', statusResult.error)
      // Don't change the status if we can't verify - keep what we have
      return { success: false, error: statusResult.error }
    }

    console.log('Domain status from Resend:', statusResult)

    // Update the database with the actual status and DNS records
    const newStatus = statusResult.verified ? 'verified' : 'pending'
    const { error: updateError } = await supabase
      .from('email_platform_configs')
      .update({
        domain_status: newStatus,
        domain_verification_dns: statusResult.records || [],
        updated_at: new Date().toISOString()
      })
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')

    if (updateError) {
      console.error('Error updating domain status:', updateError)
      return { success: false, error: updateError.message }
    }

    console.log('Domain status updated to:', newStatus)
    return { success: true, status: newStatus }
  } catch (error) {
    console.error('Error checking domain status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Force refresh domain verification status from Resend
 */
export async function forceRefreshDomainStatus(whopUserId: string): Promise<{ success: boolean; error?: string; status?: string }> {
  try {
    console.log('Force refreshing domain status for user:', whopUserId)
    
    // Get the current config
    const { data: config, error: fetchError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .single()

    if (fetchError) {
      console.error('Error fetching config:', fetchError)
      return { success: false, error: fetchError.message }
    }

    if (!config.custom_domain) {
      console.log('No domain found in config')
      return { success: false, error: 'No domain configured' }
    }

    console.log('Force refreshing status for domain:', config.custom_domain)

    // First, try to get the domain by name to ensure we have the correct domain ID
    const { getDomainByName } = await import('@/app/actions/resend')
    const domainResult = await getDomainByName(config.custom_domain)
    
    if (!domainResult.success) {
      console.error('Failed to get domain from Resend:', domainResult.error)
      // Update to pending since we can't verify
      await supabase
        .from('email_platform_configs')
        .update({
          domain_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('whop_user_id', whopUserId)
        .eq('platform_type', 'resend')
      
      return { success: false, error: domainResult.error }
    }

    console.log('Found domain in Resend with ID:', domainResult.domainId)

    // Update the domain ID if it changed
    if (domainResult.domainId && domainResult.domainId !== config.domain_id) {
      await supabase
        .from('email_platform_configs')
        .update({
          domain_id: domainResult.domainId,
          updated_at: new Date().toISOString()
        })
        .eq('whop_user_id', whopUserId)
        .eq('platform_type', 'resend')
    }

    // Now get the actual verification status
    const { getDomainStatus } = await import('@/app/actions/resend')
    const statusResult = await getDomainStatus(domainResult.domainId!)
    
    if (!statusResult.success) {
      console.error('Failed to get domain status from Resend:', statusResult.error)
      // Don't change the status if we can't verify - keep what we have
      return { success: false, error: statusResult.error }
    }

    console.log('Domain status from Resend:', statusResult)

    // Update the database with the actual status and DNS records
    const newStatus = statusResult.verified ? 'verified' : 'pending'
    const { error: updateError } = await supabase
      .from('email_platform_configs')
      .update({
        domain_status: newStatus,
        domain_verification_dns: statusResult.records || [],
        updated_at: new Date().toISOString()
      })
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')

    if (updateError) {
      console.error('Error updating domain status:', updateError)
      return { success: false, error: updateError.message }
    }

    console.log('Domain status force refreshed to:', newStatus)
    return { success: true, status: newStatus }
  } catch (error) {
    console.error('Error force refreshing domain status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
} 

/**
 * Complete EmailSync setup: create audience and sync members
 */
export async function setupEmailSyncWithMembers(
  whopUserId: string,
  audienceName: string,
  members: any[],
  description?: string,
  fromEmail?: string // new param
): Promise<{ success: boolean; audienceId?: string; syncedCount?: number; error?: string }> {
  try {
    console.log('Setting up EmailSync with members (Database Only):', { whopUserId, audienceName, memberCount: members.length, fromEmail })
    
    // Get the config ID for this user
    let configResult = await getEmailSyncConfig(whopUserId)
    if (!configResult.success || !configResult.config) {
      console.log('No EmailSync config found, creating default configuration...')
      
      // Create a default domain configuration
      const defaultDomain = 'whopmail.com' // Use a default domain
      const defaultConfigResult = await saveEmailSyncConfig(whopUserId, defaultDomain, undefined, 'EmailSync')
      
      if (!defaultConfigResult.success) {
        console.error('Failed to create default EmailSync config:', defaultConfigResult.error)
        return { success: false, error: 'Failed to create default domain configuration' }
      }
      
      // Get the newly created config
      configResult = await getEmailSyncConfig(whopUserId)
      if (!configResult.success || !configResult.config) {
        console.error('Failed to get newly created EmailSync config')
        return { success: false, error: 'Failed to retrieve domain configuration' }
      }
    }

    // If fromEmail is provided, update the configuration with the new from name
    if (fromEmail && configResult.config) {
      console.log('Updating configuration with new from email:', fromEmail)
      
      // Extract the from name from the email (e.g., "john@example.com" -> "john")
      const fromName = fromEmail.split('@')[0]
      const domain = fromEmail.split('@')[1]
      
      if (domain && domain !== configResult.config.custom_domain) {
        console.log('Domain mismatch, updating domain configuration...')
        const updateResult = await saveEmailSyncConfig(whopUserId, domain, undefined, fromName)
        if (!updateResult.success) {
          console.error('Failed to update domain configuration:', updateResult.error)
          return { success: false, error: 'Failed to update domain configuration' }
        }
        
        // Get the updated config
        configResult = await getEmailSyncConfig(whopUserId)
        if (!configResult.success || !configResult.config) {
          console.error('Failed to get updated EmailSync config')
          return { success: false, error: 'Failed to retrieve updated domain configuration' }
        }
      } else {
        // Just update the from name for the existing domain
        const updateResult = await updateFromName(whopUserId, fromName, fromEmail)
        if (!updateResult.success) {
          console.error('Failed to update from name:', updateResult.error)
          return { success: false, error: 'Failed to update from name' }
        }
      }
    }

    const configId = configResult.config.id

    // Create a temporary audience ID for database storage (we'll create Resend audience later)
    const tempAudienceId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Save the audience to our database with temporary ID
    const audienceData = {
      audience_id: tempAudienceId, // Temporary ID, will be updated when we sync to Resend
      name: audienceName,
      description: description || `Email list for ${audienceName}`,
      is_active: false // Mark as inactive until Resend sync is complete
    }

    const saveResult = await saveEmailAudience(configId, audienceData)
    if (!saveResult.success) {
      console.error('Failed to save audience to database:', saveResult)
      return { success: false, error: 'Failed to save audience to database' }
    }

    console.log('Database audience created successfully:', {
      dbAudienceId: saveResult.audienceId,
      tempResendId: tempAudienceId
    })

    // Now sync the members to database only
    let syncedCount = 0
    try {
      const syncResult = await syncWhopMembersToEmailContacts(
        saveResult.audienceId!,
        members,
        (progress) => {
          console.log(`Sync progress: ${progress}%`)
        }
      )
      
      if (syncResult.success) {
        syncedCount = syncResult.processedCount
        console.log(`✅ Successfully synced ${syncedCount} members to database`)
      } else {
        console.error('Failed to sync members - syncResult:', syncResult)
        // Don't fail the whole operation if sync fails, just log it
      }
    } catch (syncError) {
      console.error('Error during member sync:', syncError)
      // Don't fail the whole operation if sync fails, just log it
    }

    return {
      success: true,
      audienceId: saveResult.audienceId,
      syncedCount: syncedCount
    }

  } catch (error) {
    console.error('Error setting up EmailSync with members:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
} 

/**
 * Extract template variables for individual email sending
 */
function extractTemplateVariablesForIndividualEmail(whopUserId: string, toEmail: string, memberData?: any): Record<string, string> {
  // Use actual member data if available, otherwise extract from email
  let firstName = 'Member'
  let lastName = ''
  let fullName = 'Member'
  
  if (memberData && memberData.name) {
    // Use actual name from Whop API
    const nameParts = memberData.name.split(' ')
    firstName = nameParts[0] || 'Member'
    lastName = nameParts.slice(1).join(' ') || ''
    fullName = memberData.name
  } else {
    // Fallback to email extraction
    const emailPrefix = toEmail.split('@')[0] || 'Member'
    
    // Try to extract first and last name from email prefix
    // Common patterns: firstname.lastname, firstname_lastname, firstnamelastname
    if (emailPrefix.includes('.')) {
      const parts = emailPrefix.split('.')
      firstName = parts[0] || 'Member'
      lastName = parts.slice(1).join(' ') || ''
    } else if (emailPrefix.includes('_')) {
      const parts = emailPrefix.split('_')
      firstName = parts[0] || 'Member'
      lastName = parts.slice(1).join(' ') || ''
    } else if (emailPrefix.length > 3) {
      // Try to split camelCase or find common patterns
      const camelCaseMatch = emailPrefix.match(/^([a-z]+)([A-Z][a-z]+)/)
      if (camelCaseMatch) {
        firstName = camelCaseMatch[1] || 'Member'
        lastName = camelCaseMatch[2] || ''
      }
    }
    
    const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1)
    const capitalizedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1)
    fullName = `${capitalizedFirstName} ${capitalizedLastName}`.trim()
    firstName = capitalizedFirstName
    lastName = capitalizedLastName
  }
  
  const variables: Record<string, string> = {
    company_name: 'Email Marketing by Whop', // Will be updated from config
    current_year: new Date().getFullYear().toString(),
    product_name: 'Product',
    member_name: fullName,
    first_name: firstName,
    last_name: lastName,
    membership_status: 'Active',
    expires_at: 'N/A',
    payment_amount: 'N/A',
    payment_date: new Date().toLocaleDateString(),
    transaction_id: 'N/A'
  }

  return variables
}

/**
 * Replace template variables in content
 */
function replaceTemplateVariables(content: string, variables: Record<string, string>): string {
  let result = content
  console.log('🔍 Processing template variables in content:', {
    originalContent: content.substring(0, 200),
    variables,
    hasTemplateVariables: content.includes('{{')
  })
  
  for (const [key, value] of Object.entries(variables)) {
    const pattern = `{{${key}}}`
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    const before = result
    result = result.replace(regex, value)
    
    if (before !== result) {
      console.log(`✅ Replaced ${pattern} with ${value}`)
    }
  }
  
  console.log('🔍 Template variable processing result:', {
    originalContent: content.substring(0, 200),
    processedContent: result.substring(0, 200),
    wasChanged: content !== result
  })
  
  return result
}

/**
 * Send an individual email to a specific member using Resend
 */
export async function sendIndividualEmail({
  toEmail,
  subject,
  html,
  fromEmail,
  whopUserId,
  text,
  replyTo,
  cc,
  bcc,
  scheduledAt,
  headers,
  tags,
  memberData
}: {
  toEmail: string | string[]
  subject: string
  html?: string
  text?: string
  fromEmail: string
  whopUserId: string
  replyTo?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  scheduledAt?: string
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
  memberData?: any
}): Promise<{ success: boolean; error?: string; emailId?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }

    // Check domain verification status before sending
    const configResult = await getEmailSyncConfig(whopUserId, true) // Force check domain status
    if (!configResult.success || !configResult.config) {
      return { success: false, error: 'EmailSync configuration not found' }
    }

    // Check that from_name is set before allowing emails to be sent
    if (!configResult.config.from_name || !configResult.config.from_name.trim()) {
      return { 
        success: false, 
        error: 'From Name is not set. Please set a display name in your email configuration before sending emails.' 
      }
    }

    // Temporarily bypass domain verification check for testing
    // if (configResult.config.domain_status !== 'verified') {
    //   return { 
    //     success: false, 
    //     error: `Domain ${configResult.config.custom_domain} is not verified. Please verify your domain on https://resend.com/domains before sending emails.` 
    //   }
    // }

    // Validate required fields
    if (!fromEmail || !toEmail || !subject) {
      return { success: false, error: 'Missing required fields: from, to, or subject' }
    }

    // Ensure we have either html or text content
    if (!html && !text) {
      return { success: false, error: 'Either html or text content is required' }
    }

    // Check if we need to convert template variables to Resend merge tags
    const hasTemplateVariables = subject.includes('{{') || (html && html.includes('{{')) || (text && text.includes('{{'))
    
    if (hasTemplateVariables) {
      console.log('🔍 Template variables detected - converting to Resend merge tags for individual email')
      
      // Convert our template variables to Resend merge tags
      let resendSubject = subject
      let resendHtml = html
      let resendText = text
      
      // Replace our template variables with Resend merge tags
      resendSubject = resendSubject
        .replace(/\{\{first_name\}\}/g, '{{{FIRST_NAME|Member}}}')
        .replace(/\{\{last_name\}\}/g, '{{{LAST_NAME}}}')
        .replace(/\{\{member_name\}\}/g, '{{{FIRST_NAME|Member}}} {{{LAST_NAME}}}')
        .replace(/\{\{email\}\}/g, '{{{EMAIL}}}')
        .replace(/\{\{company_name\}\}/g, configResult.config?.company_name || 'Email Marketing by Whop')
        .replace(/\{\{current_year\}\}/g, new Date().getFullYear().toString())
        .replace(/\{\{product_name\}\}/g, 'Product')
        .replace(/\{\{membership_status\}\}/g, 'Active')
        .replace(/\{\{expires_at\}\}/g, 'N/A')
        .replace(/\{\{payment_amount\}\}/g, 'N/A')
        .replace(/\{\{payment_date\}\}/g, new Date().toLocaleDateString())
        .replace(/\{\{transaction_id\}\}/g, 'N/A')
      
      if (resendHtml) {
        resendHtml = resendHtml
          .replace(/\{\{first_name\}\}/g, '{{{FIRST_NAME|Member}}}')
          .replace(/\{\{last_name\}\}/g, '{{{LAST_NAME}}}')
          .replace(/\{\{member_name\}\}/g, '{{{FIRST_NAME|Member}}} {{{LAST_NAME}}}')
          .replace(/\{\{email\}\}/g, '{{{EMAIL}}}')
          .replace(/\{\{company_name\}\}/g, configResult.config?.company_name || 'Email Marketing by Whop')
          .replace(/\{\{current_year\}\}/g, new Date().getFullYear().toString())
          .replace(/\{\{product_name\}\}/g, 'Product')
          .replace(/\{\{membership_status\}\}/g, 'Active')
          .replace(/\{\{expires_at\}\}/g, 'N/A')
          .replace(/\{\{payment_amount\}\}/g, 'N/A')
          .replace(/\{\{payment_date\}\}/g, new Date().toLocaleDateString())
          .replace(/\{\{transaction_id\}\}/g, 'N/A')
      }
      
      if (resendText) {
        resendText = resendText
          .replace(/\{\{first_name\}\}/g, '{{{FIRST_NAME|Member}}}')
          .replace(/\{\{last_name\}\}/g, '{{{LAST_NAME}}}')
          .replace(/\{\{member_name\}\}/g, '{{{FIRST_NAME|Member}}} {{{LAST_NAME}}}')
          .replace(/\{\{email\}\}/g, '{{{EMAIL}}}')
          .replace(/\{\{company_name\}\}/g, configResult.config?.company_name || 'Email Marketing by Whop')
          .replace(/\{\{current_year\}\}/g, new Date().getFullYear().toString())
          .replace(/\{\{product_name\}\}/g, 'Product')
          .replace(/\{\{membership_status\}\}/g, 'Active')
          .replace(/\{\{expires_at\}\}/g, 'N/A')
          .replace(/\{\{payment_amount\}\}/g, 'N/A')
          .replace(/\{\{payment_date\}\}/g, new Date().toLocaleDateString())
          .replace(/\{\{transaction_id\}\}/g, 'N/A')
      }
      
      console.log('✅ Converted template variables to Resend merge tags:')
      console.log('   Original subject:', subject)
      console.log('   Resend subject:', resendSubject)
      console.log('')
      
      // Use the converted content
      subject = resendSubject
      html = resendHtml
      text = resendText
    }
    
    // Use the processed content (either original or converted)
    let processedSubject = subject
    let processedHtml = html
    let processedText = text

    // Wrap HTML content with dynamic header and footer
    let finalHtml = processedHtml
    let finalText = processedText
    if (processedHtml) {
      finalHtml = wrapEmailWithHeaderFooter(processedHtml, configResult.config)
    }
    if (processedText) {
      finalText = wrapEmailWithHeaderFooter(processedText, configResult.config)
    }

    // Build the email payload according to Resend API specification
    // Construct the from field with both name and email: "From Name" <email@domain.com>
    const fromField = configResult.config?.from_name ? `"${configResult.config.from_name}" <${fromEmail}>` : fromEmail
    
    const emailPayload: any = {
      from: fromField,
      to: toEmail,
      subject: processedSubject
    }

    // Add optional fields if provided
    if (finalHtml) emailPayload.html = finalHtml
    if (finalText) emailPayload.text = finalText
    if (replyTo) emailPayload.reply_to = replyTo
    if (cc) emailPayload.cc = cc
    if (bcc) emailPayload.bcc = bcc
    if (scheduledAt) emailPayload.scheduled_at = scheduledAt
    if (headers) emailPayload.headers = headers
    if (tags) emailPayload.tags = tags

    console.log('Sending email with payload:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      hasHtml: !!emailPayload.html,
      hasText: !!emailPayload.text
    })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      })
      return { 
        success: false, 
        error: responseData.message || responseData.error || response.statusText || 'Failed to send email' 
      }
    }

    console.log('Email sent successfully:', responseData)
    
    // Track the email in Supabase for analytics
    const toEmailArray = Array.isArray(toEmail) ? toEmail : [toEmail]
    for (const recipient of toEmailArray) {
      try {
        await trackSentEmail(responseData.id, {
          configId: configResult.config.id,
          whopUserId,
          toEmail: recipient,
          fromEmail,
          subject,
          htmlContent: finalHtml,
          textContent: finalText,
          emailType: 'manual'
        })
      } catch (trackingError) {
        console.error('Failed to track email in Supabase:', trackingError)
        // Don't fail the email send if tracking fails
      }
    }
    
    return { 
      success: true, 
      emailId: responseData.id 
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred while sending email' 
    }
  }
} 

/**
 * Send an email as a broadcast (marketing email, unlimited) instead of transactional
 */
export async function sendEmailAsBroadcast({
  toEmail,
  subject,
  html,
  text,
  fromEmail,
  whopUserId,
  broadcastName
}: {
  toEmail: string | string[]
  subject: string
  html?: string
  text?: string
  fromEmail: string
  whopUserId: string
  broadcastName?: string
}): Promise<{ success: boolean; error?: string; broadcastId?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }

    // Get email platform config
    const configResult = await getEmailSyncConfig(whopUserId, true)
    if (!configResult.success || !configResult.config) {
      return { success: false, error: 'EmailSync configuration not found' }
    }

    // Check that from_name is set
    if (!configResult.config.from_name || !configResult.config.from_name.trim()) {
      return { 
        success: false, 
        error: 'From Name is not set. Please set a display name in your email configuration before sending emails.' 
      }
    }

    // Validate required fields
    if (!fromEmail || !toEmail || !subject) {
      return { success: false, error: 'Missing required fields: from, to, or subject' }
    }

    // Ensure we have either html or text content
    if (!html && !text) {
      return { success: false, error: 'Either html or text content is required' }
    }

    // Apply rate limiting
    const { resendRateLimiter } = await import('@/lib/rate-limiter')
    await resendRateLimiter.waitForLimit('resend_api')

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    // Create a temporary audience for this broadcast
    const audienceName = broadcastName || `Broadcast: ${subject} - ${new Date().toISOString().split('T')[0]}`
    const audienceResult = await resend.audiences.create({
      name: audienceName
    })

    if (audienceResult.error) {
      return { success: false, error: `Failed to create audience: ${audienceResult.error.message}` }
    }

    const audienceId = audienceResult.data?.id!

    // Add recipients to the audience
    const toEmailArray = Array.isArray(toEmail) ? toEmail : [toEmail]
    for (const email of toEmailArray) {
      await resend.contacts.create({
        audienceId,
        email,
        unsubscribed: false
      })
    }

    // Send as broadcast (unlimited, not transactional)
    const broadcastOptions: any = {
      audienceId,
      from: fromEmail,
      subject
    }

    // Add content - prefer HTML over text
    if (html) {
      broadcastOptions.html = html
    }
    if (text && !html) {
      broadcastOptions.text = text
    }

    const broadcastResult = await resend.broadcasts.create(broadcastOptions)

    if (broadcastResult.error) {
      return { success: false, error: `Failed to send broadcast: ${broadcastResult.error.message}` }
    }

    console.log('Broadcast sent successfully:', broadcastResult.data?.id)
    
    return { 
      success: true, 
      broadcastId: broadcastResult.data?.id 
    }
  } catch (error) {
    console.error('Error sending broadcast:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred while sending broadcast' 
    }
  }
}

/**
 * Send bulk emails to multiple recipients using Resend
 */
export async function sendBulkEmails({
  fromEmail,
  recipients,
  subject,
  html,
  text,
  replyTo,
  cc,
  bcc,
  scheduledAt,
  headers,
  tags
}: {
  fromEmail: string
  recipients: string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  scheduledAt?: string
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
}): Promise<{ success: boolean; error?: string; emailIds?: string[] }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }

    // Validate required fields
    if (!fromEmail || !recipients.length || !subject) {
      return { success: false, error: 'Missing required fields: from, recipients, or subject' }
    }

    // Ensure we have either html or text content
    if (!html && !text) {
      return { success: false, error: 'Either html or text content is required' }
    }

    // Resend allows max 50 recipients per email
    if (recipients.length > 50) {
      return { success: false, error: 'Maximum 50 recipients allowed per email' }
    }

    // For bulk emails, we need to get company settings from the first recipient's user
    // This is a simplified approach - in a real implementation, you might want to group by user
    let finalHtml = html
    let finalText = text
    if (html) {
      // For now, we'll use default settings - in a real implementation, you'd get settings per user
      const defaultSettings = {
        company_name: 'Email Marketing by Whop',
        company_logo_url: null,
        header_customization: {
          header_style: { backgroundColor: '#f8f9fa', textColor: '#333' },
          header_content: { showLogo: true, showCompanyName: true, customText: '' }
        },
        footer_customization: {
          footer_style: { linkColor: '#007bff', textColor: '#6c757d', borderColor: '#e9ecef' },
          footer_content: { showCompanyInfo: true, showUnsubscribeLink: true, showViewInBrowser: true, showPoweredBy: false, customText: '' }
        }
      }
      finalHtml = wrapEmailWithHeaderFooter(html, defaultSettings)
    }
    if (text) {
      const defaultSettings = {
        company_name: 'Email Marketing by Whop'
      }
              finalText = wrapEmailWithHeaderFooter(text, defaultSettings)
    }

    // Build the email payload
    const emailPayload: any = {
      from: fromEmail,
      to: recipients,
      subject: subject
    }

    // Add optional fields if provided
    if (finalHtml) emailPayload.html = finalHtml
    if (finalText) emailPayload.text = finalText
    if (replyTo) emailPayload.reply_to = replyTo
    if (cc) emailPayload.cc = cc
    if (bcc) emailPayload.bcc = bcc
    if (scheduledAt) emailPayload.scheduled_at = scheduledAt
    if (headers) emailPayload.headers = headers
    if (tags) emailPayload.tags = tags

    console.log('Sending bulk email to', recipients.length, 'recipients')

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      })
      return { 
        success: false, 
        error: responseData.message || responseData.error || response.statusText || 'Failed to send bulk email' 
      }
    }

    console.log('Bulk email sent successfully:', responseData)
    return { 
      success: true, 
      emailIds: [responseData.id] // Resend returns a single ID for bulk emails
    }
  } catch (error) {
    console.error('Error sending bulk email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred while sending bulk email' 
    }
  }
}

/**
 * Send email campaign to audience members
 */
export async function sendEmailCampaign({
  audienceId,
  subject,
  html,
  text,
  fromEmail,
  whopUserId,
  replyTo,
  cc,
  bcc,
  scheduledAt,
  headers,
  tags,
  emailWidth = 600
}: {
  audienceId: string
  subject: string
  html?: string
  text?: string
  fromEmail: string
  whopUserId: string
  replyTo?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  scheduledAt?: string
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
  emailWidth?: number
}): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  try {
    console.log(`📧 Starting email campaign for audience: ${audienceId}`)
    
    // Get audience details to check contact count
    const { data: audience, error: audienceError } = await supabase
      .from('email_audiences')
      .select('member_count, name, audience_id')
      .eq('id', audienceId)
      .single()
    
    if (audienceError || !audience) {
      return { success: false, error: 'Audience not found' }
    }
    
    // Get all contacts for this audience first to get accurate count
    const { data: contacts, error: contactsError } = await supabase
      .from('email_contacts')
      .select('email, first_name, last_name')
      .eq('audience_id', audienceId)
      .eq('is_subscribed', true)
    
    if (contactsError) {
      return { success: false, error: 'Failed to get contacts from database' }
    }
    
    let actualContactCount = contacts?.length || 0
    console.log(`📊 Database shows ${actualContactCount} actual contacts for audience ${audienceId}`)
    console.log(`📊 Audience record shows member_count: ${audience.member_count}`)
    
    // If there's a mismatch, update the audience record with the correct count
    if (audience.member_count !== actualContactCount) {
      console.log(`⚠️ Mismatch detected! Database has ${actualContactCount} contacts but audience record shows ${audience.member_count}`)
      console.log(`🔄 Updating audience record with correct count...`)
      
      await supabase
        .from('email_audiences')
        .update({
          member_count: actualContactCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', audienceId)
      
      console.log(`✅ Updated audience member_count from ${audience.member_count} to ${actualContactCount}`)
    }
    
    // If no contacts in database but we have a Resend audience ID, use that instead
    if (actualContactCount === 0 && audience.audience_id) {
      console.log(`📧 No contacts in database, but Resend audience exists: ${audience.audience_id}`)
      console.log(`📧 Audience name: "${audience.name}"`)
      console.log(`📧 Using Resend audience directly for broadcast`)
      
      // For Resend audiences, we'll use the member_count from the audience record
      // or estimate based on the audience name
      if (audience.member_count && audience.member_count > 0) {
        actualContactCount = audience.member_count
        console.log(`📊 Using member_count from audience record: ${actualContactCount}`)
      } else if (audience.name && audience.name.includes('(')) {
        // Extract count from audience name like "All Members (14,769)" - but be more specific
        // Only extract if it looks like a count pattern
        const match = audience.name.match(/\((\d{1,3}(?:,\d{3})*)\)/)
        if (match) {
          const extractedCount = parseInt(match[1].replace(/,/g, ''))
          // Only use if it's a reasonable number (not too large)
          if (extractedCount > 0 && extractedCount <= 100000) {
            actualContactCount = extractedCount
            console.log(`📊 Extracted count from audience name "${audience.name}": ${actualContactCount}`)
          } else {
            console.log(`⚠️ Ignoring extracted count ${extractedCount} from audience name "${audience.name}" - seems unreasonable`)
          }
        } else {
          console.log(`📊 No valid count pattern found in audience name: "${audience.name}"`)
        }
      } else {
        console.log(`📊 No member_count or count pattern in audience name: "${audience.name}"`)
      }
      
      console.log(`📊 Final estimated contact count from Resend audience: ${actualContactCount}`)
      
      // Update the database member count to reflect the actual Resend count
      if (audience.member_count !== actualContactCount) {
        await supabase
          .from('email_audiences')
          .update({
            member_count: actualContactCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', audienceId)
        console.log(`✅ Updated database member count to ${actualContactCount}`)
      }
    }
    
    if (actualContactCount === 0) {
      return { success: false, error: 'No subscribed contacts found in audience' }
    }
    console.log(`📊 Campaign will send to ${actualContactCount} contacts (audience shows ${audience.member_count || 0})`)
    
    // Check plan limits before sending using actual contact count
    const planCheck = await checkEmailPlanLimit(whopUserId, actualContactCount)
    if (!planCheck.canSend) {
      console.log(`❌ Plan limit check failed: ${planCheck.error}`)
      return { success: false, error: planCheck.error }
    }
    
    console.log(`✅ Plan limit check passed: ${planCheck.planDetails?.name} plan allows ${planCheck.planDetails?.contactLimit} contacts`)
    
    console.log(`📧 Found ${actualContactCount} subscribed contacts`)
    
    // Get company settings for dynamic header/footer (use cached version to avoid extra API calls)
    const configResult = await getEmailSyncConfig(whopUserId, false) // Don't check domain status here
    if (!configResult.success || !configResult.config) {
      return { success: false, error: 'EmailSync configuration not found' }
    }
    
    // Check that from_name is set before allowing emails to be sent
    if (!configResult.config.from_name || !configResult.config.from_name.trim()) {
      return { 
        success: false, 
        error: 'From Name is not set. Please set a display name in your email configuration before sending emails.' 
      }
    }
    
    const companySettings = configResult.config
    
    // Process template variables for broadcast campaign
    // For broadcasts, we need to get the actual member names from Whop API
    // We'll fetch the first member's data to use as an example
    let broadcastVariables = {
      company_name: companySettings?.company_name || 'Email Marketing by Whop',
      current_year: new Date().getFullYear().toString(),
      product_name: 'Product',
      member_name: 'Member', // Will be updated with actual member data
      first_name: 'Member',  // Will be updated with actual member data
      last_name: '',         // Will be updated with actual member data
      membership_status: 'Active',
      expires_at: 'N/A',
      payment_amount: 'N/A',
      payment_date: new Date().toLocaleDateString(),
      transaction_id: 'N/A'
    }
    
        // Check if we need personalized template variables
    const hasTemplateVariables = subject.includes('{{') || (html && html.includes('{{')) || (text && text.includes('{{'))
    
    if (hasTemplateVariables) {
      console.log('🔍 Template variables detected - using Resend native merge tags for personalization')
      
      // Convert our template variables to Resend merge tags
      let resendSubject = subject
      let resendHtml = html
      let resendText = text
      
      // Replace our template variables with Resend merge tags
      resendSubject = resendSubject
        .replace(/\{\{first_name\}\}/g, '{{{FIRST_NAME|Member}}}')
        .replace(/\{\{last_name\}\}/g, '{{{LAST_NAME}}}')
        .replace(/\{\{member_name\}\}/g, '{{{FIRST_NAME|Member}}} {{{LAST_NAME}}}')
        .replace(/\{\{email\}\}/g, '{{{EMAIL}}}')
        .replace(/\{\{company_name\}\}/g, companySettings?.company_name || 'Email Marketing by Whop')
        .replace(/\{\{current_year\}\}/g, new Date().getFullYear().toString())
        .replace(/\{\{product_name\}\}/g, 'Product')
        .replace(/\{\{membership_status\}\}/g, 'Active')
        .replace(/\{\{expires_at\}\}/g, 'N/A')
        .replace(/\{\{payment_amount\}\}/g, 'N/A')
        .replace(/\{\{payment_date\}\}/g, new Date().toLocaleDateString())
        .replace(/\{\{transaction_id\}\}/g, 'N/A')
      
      if (resendHtml) {
        resendHtml = resendHtml
          .replace(/\{\{first_name\}\}/g, '{{{FIRST_NAME|Member}}}')
          .replace(/\{\{last_name\}\}/g, '{{{LAST_NAME}}}')
          .replace(/\{\{member_name\}\}/g, '{{{FIRST_NAME|Member}}} {{{LAST_NAME}}}')
          .replace(/\{\{email\}\}/g, '{{{EMAIL}}}')
          .replace(/\{\{company_name\}\}/g, companySettings?.company_name || 'Email Marketing by Whop')
          .replace(/\{\{current_year\}\}/g, new Date().getFullYear().toString())
          .replace(/\{\{product_name\}\}/g, 'Product')
          .replace(/\{\{membership_status\}\}/g, 'Active')
          .replace(/\{\{expires_at\}\}/g, 'N/A')
          .replace(/\{\{payment_amount\}\}/g, 'N/A')
          .replace(/\{\{payment_date\}\}/g, new Date().toLocaleDateString())
          .replace(/\{\{transaction_id\}\}/g, 'N/A')
      }
      
      if (resendText) {
        resendText = resendText
          .replace(/\{\{first_name\}\}/g, '{{{FIRST_NAME|Member}}}')
          .replace(/\{\{last_name\}\}/g, '{{{LAST_NAME}}}')
          .replace(/\{\{member_name\}\}/g, '{{{FIRST_NAME|Member}}} {{{LAST_NAME}}}')
          .replace(/\{\{email\}\}/g, '{{{EMAIL}}}')
          .replace(/\{\{company_name\}\}/g, companySettings?.company_name || 'Email Marketing by Whop')
          .replace(/\{\{current_year\}\}/g, new Date().getFullYear().toString())
          .replace(/\{\{product_name\}\}/g, 'Product')
          .replace(/\{\{membership_status\}\}/g, 'Active')
          .replace(/\{\{expires_at\}\}/g, 'N/A')
          .replace(/\{\{payment_amount\}\}/g, 'N/A')
          .replace(/\{\{payment_date\}\}/g, new Date().toLocaleDateString())
          .replace(/\{\{transaction_id\}\}/g, 'N/A')
      }
      
      console.log('✅ Converted template variables to Resend merge tags:')
      console.log('   Original subject:', subject)
      console.log('   Resend subject:', resendSubject)
      console.log('')
      
      // Use the converted content for the broadcast
      subject = resendSubject
      html = resendHtml
      text = resendText
    }
    
    console.log('📤 Using Resend broadcast with native personalization')
    
    // Replace template variables in subject and content
    let processedSubject = replaceTemplateVariables(subject, broadcastVariables)
    let processedHtml = html ? replaceTemplateVariables(html, broadcastVariables) : undefined
    let processedText = text ? replaceTemplateVariables(text, broadcastVariables) : undefined
    
    // Enhanced debugging for template variables in broadcasts
    
    console.log('🔍 BROADCAST TEMPLATE VARIABLE DEBUG:', {
      originalSubject: subject,
      processedSubject,
      originalHtml: html ? html.substring(0, 100) + '...' : 'No HTML',
      processedHtml: processedHtml ? processedHtml.substring(0, 100) + '...' : 'No HTML',
      hasTemplateVariables,
      broadcastVariables
    })
    
    if (hasTemplateVariables) {
      console.log('✅ Template variables found and processed for broadcast!')
      console.log('📧 Final broadcast subject:', processedSubject)
      if (processedHtml) {
        console.log('📧 Final broadcast HTML preview:', processedHtml.substring(0, 200) + '...')
      }
    } else {
      console.log('⚠️ No template variables found in broadcast content')
    }
    
    // Wrap HTML content with dynamic header and footer
    let finalHtml = processedHtml
    if (processedHtml && companySettings) {
      finalHtml = wrapEmailWithHeaderFooter(processedHtml, companySettings, emailWidth)
    }
    
    // Get Resend API key
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }
    
    const resend = new Resend(apiKey)
    
    // Use existing Resend audience ID if available, otherwise create a new one
    let resendAudienceId = audience.audience_id
    
    console.log(`🔍 Audience details:`, {
      audienceId,
      audienceName: audience.name,
      resendAudienceId,
      isTempId: resendAudienceId?.startsWith('temp_')
    })
    
    if (!resendAudienceId || resendAudienceId.startsWith('temp_')) {
      console.log(`📝 Creating new Resend audience for campaign`)
      
      // Add delay before creating audience
      await delay(RESEND_RATE_LIMIT_DELAY)
      
      // Get user profile to get name/username for better audience naming
      let userDisplayName = whopUserId // Default to user ID
      try {
        const { getProfile } = await import('@/app/actions')
        const profile = await getProfile(whopUserId)
        if (profile) {
          // Try to get user details from WHOP API
          const { whopSdk } = await import('@/lib/whop-sdk')
          try {
            const user = await whopSdk.users.getUser({ userId: whopUserId })
            userDisplayName = user.name || user.username || whopUserId
          } catch (userError) {
            console.warn('Could not fetch user details from WHOP API, using user ID:', userError)
            userDisplayName = whopUserId
          }
        }
      } catch (profileError) {
        console.warn('Could not fetch user profile, using user ID:', profileError)
        userDisplayName = whopUserId
      }

      // Create a meaningful audience name that includes sender info
      const audienceName = `${userDisplayName} (${fromEmail}) - ${audience.name} - ${new Date().toISOString().split('T')[0]}`
      
      // Create a new Resend audience
      const audienceResult = await resend.audiences.create({
        name: audienceName,
      })
      
      if (!audienceResult.data?.id) {
        return { success: false, error: 'Failed to create Resend audience' }
      }
      
      resendAudienceId = audienceResult.data.id
      console.log(`✅ Created Resend audience: ${resendAudienceId}`)
      
      // Add all contacts to the new audience with rate limiting
      console.log(`📧 Adding ${contacts.length} contacts to Resend audience...`)
      let successfulContacts = 0
      
      for (const contact of contacts) {
        try {
          await delay(RESEND_RATE_LIMIT_DELAY) // Rate limit between contact additions
          
          const contactResult = await resend.contacts.create({
            email: contact.email,
            firstName: contact.first_name || '',
            lastName: contact.last_name || '',
            unsubscribed: false,
            audienceId: resendAudienceId,
          })
          
          if (!contactResult.error) {
            successfulContacts++
          }
        } catch (error) {
          console.warn(`Failed to add contact ${contact.email}:`, error)
        }
      }
      
      console.log(`📧 Added ${successfulContacts} contacts to Resend audience`)
    } else {
      console.log(`✅ Using existing Resend audience: ${resendAudienceId}`)
    }
    
    // Add delay before creating broadcast
    await delay(RESEND_RATE_LIMIT_DELAY)
    
    // Create broadcast using the proper broadcasts API
    // Construct the from field with both name and email: "From Name" <email@domain.com>
    const fromField = companySettings?.from_name ? `"${companySettings.from_name}" <${fromEmail}>` : fromEmail
    
    // Get user profile to get name/username for better broadcast naming
    let userDisplayName = whopUserId // Default to user ID
    try {
      const { getProfile } = await import('@/app/actions')
      const profile = await getProfile(whopUserId)
      if (profile) {
        // Try to get user details from WHOP API
        const { whopSdk } = await import('@/lib/whop-sdk')
        try {
          const user = await whopSdk.users.getUser({ userId: whopUserId })
          userDisplayName = user.name || user.username || whopUserId
        } catch (userError) {
          console.warn('Could not fetch user details from WHOP API, using user ID:', userError)
          userDisplayName = whopUserId
        }
      }
    } catch (profileError) {
      console.warn('Could not fetch user profile, using user ID:', profileError)
      userDisplayName = whopUserId
    }

    // Create a meaningful internal broadcast name for Resend dashboard
    const internalBroadcastName = `${userDisplayName} (${fromEmail}) - ${processedSubject}`
    
    const broadcastPayload: any = {
      audienceId: resendAudienceId,
      from: fromField,
      subject: processedSubject, // Use processed subject with template variables
      name: internalBroadcastName, // Internal name for Resend dashboard
    }
    
    if (finalHtml) broadcastPayload.html = finalHtml
    if (processedText) broadcastPayload.text = processedText // Use processed text
    if (replyTo) broadcastPayload.reply_to = replyTo
    
    console.log(`🔍 Debug - scheduledAt parameter:`, scheduledAt)
    console.log(`🔍 Debug - scheduledAt type:`, typeof scheduledAt)
    console.log(`🔍 Debug - scheduledAt truthy:`, !!scheduledAt)
    
    console.log(`📤 Creating broadcast for audience: ${resendAudienceId}`)
    
    const broadcastResult = await resend.broadcasts.create(broadcastPayload)
    
    if (broadcastResult.error) {
      return { success: false, error: `Failed to create broadcast: ${broadcastResult.error.message}` }
    }
    
    const broadcastId = broadcastResult.data?.id
    if (!broadcastId) {
      return { success: false, error: 'Failed to get broadcast ID from response' }
    }
    
    console.log(`✅ Created broadcast: ${broadcastId}`)
    
    // Always send the broadcast, but with different parameters
    console.log(`📤 Sending broadcast...`)
    
    // Add delay before sending broadcast
    await delay(RESEND_RATE_LIMIT_DELAY)
    
    // Send the broadcast with optional scheduling
    const sendOptions: any = {}
    if (scheduledAt) {
      sendOptions.scheduledAt = scheduledAt
      console.log(`📅 Scheduling broadcast for: ${scheduledAt}`)
      console.log(`⏰ Broadcast will be sent automatically at the scheduled time`)
    } else {
      console.log(`📤 Sending broadcast immediately...`)
    }
    
    const sendResult = await resend.broadcasts.send(broadcastId, sendOptions)
    
    if (sendResult.error) {
      return { success: false, error: `Failed to send broadcast: ${sendResult.error.message}` }
    }
    
    if (scheduledAt) {
      console.log(`✅ Broadcast scheduled successfully for ${actualContactCount} recipients`)
    } else {
      console.log(`🎉 Broadcast sent successfully to ${actualContactCount} recipients`)
    }
    
    // Use the audience count as recipient count (webhooks will track actual delivery)
    const actualRecipientCount = actualContactCount
    
    // Track the broadcast in our database for analytics
    try {
      await trackBroadcastEmail({
        whopUserId,
        resendBroadcastId: broadcastId,
        subject,
        fromEmail,
        audienceId: resendAudienceId,
        recipientCount: actualRecipientCount,
        htmlContent: finalHtml,
        textContent: text
      })
      console.log(`✅ Broadcast tracked for analytics with ${actualRecipientCount} recipients`)
    } catch (trackingError) {
      console.warn(`⚠️ Failed to track broadcast for analytics:`, trackingError)
      // Don't fail the email send if tracking fails
    }
    
    if (scheduledAt) {
      console.log(`✅ Broadcast scheduled successfully for ${actualContactCount} recipients`)
    } else {
      console.log(`✅ Broadcast sent successfully to ${actualContactCount} recipients`)
    }
    
    return { 
      success: true, 
      sentCount: actualContactCount
    }
  } catch (error) {
    console.error('Error in sendEmailCampaign:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email campaign' 
    }
  }
}

/**
 * Manually refresh domain verification status - can be called from UI
 */
export async function refreshDomainStatus(whopUserId: string): Promise<{ success: boolean; error?: string; status?: string }> {
  try {
    console.log('Manually refreshing domain status for user:', whopUserId)
    
    // Use the force refresh function
    const result = await forceRefreshDomainStatus(whopUserId)
    
    if (result.success) {
      console.log('Domain status refreshed successfully:', result.status)
    } else {
      console.error('Failed to refresh domain status:', result.error)
    }
    
    return result
  } catch (error) {
    console.error('Error in refreshDomainStatus:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred while refreshing domain status' 
    }
  }
}

// ============================================================================
// EMAIL TEMPLATE FUNCTIONS
// ============================================================================

/**
 * Save email template
 */
export async function saveEmailTemplate(
  whopUserId: string,
  template: {
    name: string
    description?: string
    category?: string
    subject: string
    elements: any[]
    tags?: string[]
  }
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    console.log('Saving email template for user:', whopUserId, 'template name:', template.name)
    
    // Generate HTML and text content from elements
    const htmlContent = generateHTMLFromElements(template.elements)
    const textContent = generateTextFromElements(template.elements)
    
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        whop_user_id: whopUserId,
        name: template.name,
        description: template.description || null,
        category: template.category || 'general',
        subject: template.subject,
        elements: template.elements,
        html_content: htmlContent,
        text_content: textContent,
        tags: template.tags || [],
        is_active: true
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving email template:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Email template saved successfully:', data.id)
    return { success: true, templateId: data.id }
  } catch (error) {
    console.error('Error saving email template:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get user's email templates
 */
export async function getUserEmailTemplates(whopUserId: string): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  try {
    console.log('Getting email templates for user:', whopUserId)
    
    // Get user's own templates
    const { data: userTemplates, error: userError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)
      .order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false })
    
    if (userError) {
      console.error('Error fetching user templates:', userError)
      return { success: false, error: userError.message }
    }
    
    // Get default templates (shared templates)
    const { data: defaultTemplates, error: defaultError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('whop_user_id', 'default')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    
    if (defaultError) {
      console.error('Error fetching default templates:', defaultError)
      // Don't fail completely, just log the error
    }
    
    const allTemplates = [
      ...(userTemplates || []),
      ...(defaultTemplates || [])
    ]
    
    console.log('Found templates:', allTemplates.length)
    return { success: true, templates: allTemplates }
  } catch (error) {
    console.error('Error getting email templates:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Load email template
 */
export async function loadEmailTemplate(templateId: string, whopUserId?: string): Promise<{ success: boolean; template?: any; error?: string }> {
  try {
    console.log('Loading email template:', templateId)
    
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single()
    
    if (error) {
      console.error('Error loading email template:', error)
      return { success: false, error: error.message }
    }

    // Get company settings to replace placeholders
    let companySettings = null
    if (whopUserId) {
      try {
        const { data: configData, error: configError } = await supabase
          .from('email_platform_configs')
          .select(`
            company_name,
            company_address,
            company_website,
            company_phone,
            company_email,
            company_logo_url,
            footer_customization
          `)
          .eq('whop_user_id', whopUserId)
          .eq('platform_type', 'resend')
          .single()

        if (!configError && configData) {
          companySettings = configData
        }
      } catch (error) {
        console.error('Error fetching company settings for template:', error)
      }
    }

    // Replace placeholders in HTML content
    let processedHtmlContent = data.html_content
    let processedTextContent = data.text_content

    if (companySettings) {
      // Replace HTML placeholders
      processedHtmlContent = processedHtmlContent
        .replace(/\{\{COMPANY_NAME\}\}/g, companySettings.company_name || 'Email Marketing by Whop')
        .replace(/\{\{#if COMPANY_WEBSITE\}\}(.*?)\{\{\/if\}\}/g, (match: string, content: string) => {
          return companySettings.company_website ? content : ''
        })
        .replace(/\{\{COMPANY_WEBSITE\}\}/g, companySettings.company_website || '')

      // Replace text placeholders
      processedTextContent = processedTextContent
        .replace(/\{\{COMPANY_NAME\}\}/g, companySettings.company_name || 'Email Marketing by Whop')
        .replace(/\{\{#if COMPANY_WEBSITE\}\}(.*?)\{\{\/if\}\}/g, (match: string, content: string) => {
          return companySettings.company_website ? content : ''
        })
        .replace(/\{\{COMPANY_WEBSITE\}\}/g, companySettings.company_website || '')
    } else {
      // Fallback replacements if no company settings
      processedHtmlContent = processedHtmlContent
        .replace(/\{\{COMPANY_NAME\}\}/g, 'Email Marketing by Whop')
        .replace(/\{\{#if COMPANY_WEBSITE\}\}(.*?)\{\{\/if\}\}/g, '')
        .replace(/\{\{COMPANY_WEBSITE\}\}/g, '')

      processedTextContent = processedTextContent
        .replace(/\{\{COMPANY_NAME\}\}/g, 'Email Marketing by Whop')
        .replace(/\{\{#if COMPANY_WEBSITE\}\}(.*?)\{\{\/if\}\}/g, '')
        .replace(/\{\{COMPANY_WEBSITE\}\}/g, '')
    }

    // Create processed template
    const processedTemplate = {
      ...data,
      html_content: processedHtmlContent,
      text_content: processedTextContent
    }
    
    // Increment usage count
    await supabase
      .from('email_templates')
      .update({ 
        usage_count: (data.usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
    
    console.log('Email template loaded successfully')
    return { success: true, template: processedTemplate }
  } catch (error) {
    console.error('Error loading email template:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update email template
 */
export async function updateEmailTemplate(
  templateId: string,
  updates: {
    name?: string
    description?: string
    category?: string
    subject?: string
    elements?: any[]
    tags?: string[]
    is_favorite?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Updating email template:', templateId)
    
    const updateData: any = { ...updates }
    
    // If elements are being updated, regenerate HTML and text content
    if (updates.elements) {
      updateData.html_content = generateHTMLFromElements(updates.elements)
      updateData.text_content = generateTextFromElements(updates.elements)
    }
    
    updateData.updated_at = new Date().toISOString()
    
    const { error } = await supabase
      .from('email_templates')
      .update(updateData)
      .eq('id', templateId)
    
    if (error) {
      console.error('Error updating email template:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Email template updated successfully')
    return { success: true }
  } catch (error) {
    console.error('Error updating email template:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Deleting email template:', templateId)
    
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId)
    
    if (error) {
      console.error('Error deleting email template:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Email template deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('Error deleting email template:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Duplicate email template
 */
export async function duplicateEmailTemplate(
  whopUserId: string,
  templateId: string,
  newName?: string
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    console.log('Duplicating email template:', templateId)
    
    // Load the original template
    const loadResult = await loadEmailTemplate(templateId)
    if (!loadResult.success || !loadResult.template) {
      return { success: false, error: 'Failed to load original template' }
    }
    
    const originalTemplate = loadResult.template
    const templateName = newName || `${originalTemplate.name} (Copy)`
    
    // Generate fresh HTML and text content from elements
    const htmlContent = generateHTMLFromElements(originalTemplate.elements)
    const textContent = generateTextFromElements(originalTemplate.elements)
    
    // Create a new template with the same content
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        whop_user_id: whopUserId,
        name: templateName,
        description: originalTemplate.description,
        category: originalTemplate.category,
        subject: originalTemplate.subject,
        elements: originalTemplate.elements,
        html_content: htmlContent,
        text_content: textContent,
        tags: originalTemplate.tags,
        is_active: true
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error duplicating email template:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Email template duplicated successfully:', data.id)
    return { success: true, templateId: data.id }
  } catch (error) {
    console.error('Error duplicating email template:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Delete email list (audience)
 */
export async function deleteEmailList(audienceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Deleting email list:', audienceId)
    
    // Get the audience to find the Resend audience ID
    const { data: audience, error: audienceError } = await supabase
      .from('email_audiences')
      .select('audience_id')
      .eq('id', audienceId)
      .single()
    
    if (audienceError) {
      console.error('Error fetching audience:', audienceError)
      return { success: false, error: audienceError.message }
    }
    
    if (!audience?.audience_id) {
      return { success: false, error: 'Audience not found or no Resend audience ID' }
    }
    
    // Delete from Resend first
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.audiences.remove(audience.audience_id)
      console.log('Deleted from Resend successfully')
    } catch (resendError) {
      console.error('Error deleting from Resend:', resendError)
      // Continue with database deletion even if Resend fails
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('email_audiences')
      .delete()
      .eq('id', audienceId)
    
    if (deleteError) {
      console.error('Error deleting from database:', deleteError)
      return { success: false, error: deleteError.message }
    }
    
    console.log('Email list deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('Error deleting email list:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Helper functions for generating HTML and text content
function generateHTMLFromElements(elements: any[]): string {
  // This function should only generate HTML for the template elements
  // Headers and footers are generated dynamically at send time
  return elements.map(element => {
    switch (element.type) {
                case 'text':
                  const textFontSize = element.properties?.fontSize || '16px'
                  const textFontFamily = element.properties?.fontFamily || 'Arial, sans-serif'
                  const textColor = element.properties?.color || '#333333'
                  const textAlign = element.properties?.textAlign || 'left'
                  const textFontWeight = element.properties?.fontWeight || 'normal'
                  
                  // Convert all properties to inline CSS
                  const textStyles = `font-size: ${textFontSize}; font-family: ${textFontFamily}; color: ${textColor}; text-align: ${textAlign}; font-weight: ${textFontWeight}; line-height: 1.6; margin: 15px 0;`
                  
                  // Process markdown formatting in content
                  let processedContent = element.content || ''
                  if (processedContent) {
                    // Convert **bold** text
                    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    // Convert *italic* text
                    processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>')
                    // Convert _italic_ text
                    processedContent = processedContent.replace(/_(.*?)_/g, '<em>$1</em>')
                  }
                  
                  return `<div style="${textStyles}">${processedContent}</div>`
                case 'button':
                  const buttonColor = element.properties?.color || '#007bff'
                  const buttonTextColor = element.properties?.textColor || '#ffffff'
                  const buttonFontSize = element.properties?.fontSize || '16px'
                  const buttonFontFamily = element.properties?.fontFamily || 'Arial, sans-serif'
                  const buttonPadding = element.properties?.padding || '12px 24px'
                  const buttonTextAlign = element.properties?.textAlign || 'center'
                  const fullWidth = element.properties?.fullWidth || false
                  
                  // Use email-safe CSS for buttons
                  // For full width buttons, use table-based layout to ensure proper rendering
                  if (fullWidth) {
                    return `
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 20px 0;">
                        <tr>
                          <td style="text-align: ${buttonTextAlign};">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                              <tr>
                                <td style="background-color: ${buttonColor}; border-radius: 4px; text-align: center;">
                                  <a href="${element.properties?.url || '#'}" 
                                     style="display: inline-block; padding: ${buttonPadding}; color: ${buttonTextColor}; text-decoration: none; font-size: ${buttonFontSize}; font-family: ${buttonFontFamily}; font-weight: bold; line-height: 1.2; min-height: 44px;">
                                    ${element.properties?.text || 'Click Here'}
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    `
                  } else {
                    // For auto width buttons, use inline-block with max-width
                    const buttonStyles = `display: inline-block; max-width: 100%; background-color: ${buttonColor}; color: ${buttonTextColor}; padding: ${buttonPadding}; border: none; border-radius: 4px; cursor: pointer; font-size: ${buttonFontSize}; font-family: ${buttonFontFamily}; text-decoration: none; text-align: center; font-weight: bold; line-height: 1.2; min-height: 44px;`
                    return `<div style="text-align: ${buttonTextAlign}; margin: 20px 0;">
                      <a href="${element.properties?.url || '#'}" style="${buttonStyles}">
                        ${element.properties?.text || 'Click Here'}
                      </a>
                    </div>`
                  }
                case 'image':
                  const imageWidth = element.properties?.width || 600
                  const imageHeight = element.properties?.height || 300
                  return `<div style="text-align: center; margin: 20px 0;">
                    <img src="${element.properties?.src || 'https://via.placeholder.com/600x300'}" 
                         alt="${element.properties?.alt || 'Image'}" 
                         style="max-width: 100%; height: auto; border-radius: 4px;"
                         width="${imageWidth}"
                         height="${imageHeight}">
                  </div>`
                case 'divider':
                  return `<div style="border-top: 1px solid #e0e0e0; margin: 20px 0;"></div>`
                case 'spacer':
                  return `<div style="height: 20px;"></div>`


                case 'columns':
                  // Handle two-column layout
                  const leftColumnElements = element.children?.filter((_: any, index: number) => index % 2 === 0) || []
                  const rightColumnElements = element.children?.filter((_: any, index: number) => index % 2 === 1) || []
                  
                  const renderColumnElement = (el: any): string => {
                    switch (el.type) {
                      case 'text':
                        const colTextFontSize = el.properties?.fontSize || '16px'
                        const colTextFontFamily = el.properties?.fontFamily || 'Arial, sans-serif'
                        const colTextColor = el.properties?.color || '#333333'
                        const colTextAlign = el.properties?.textAlign || 'left'
                        const colTextFontWeight = el.properties?.fontWeight || 'normal'
                        
                        // Convert all properties to inline CSS
                        const colTextStyles = `font-size: ${colTextFontSize}; font-family: ${colTextFontFamily}; color: ${colTextColor}; text-align: ${colTextAlign}; font-weight: ${colTextFontWeight}; line-height: 1.6; margin: 10px 0;`
                        
                        // Process markdown formatting in content
                        let colProcessedContent = el.content || ''
                        if (colProcessedContent) {
                          // Convert **bold** text
                          colProcessedContent = colProcessedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          // Convert *italic* text
                          colProcessedContent = colProcessedContent.replace(/\*(.*?)\*/g, '<em>$1</em>')
                          // Convert _italic_ text
                          colProcessedContent = colProcessedContent.replace(/_(.*?)_/g, '<em>$1</em>')
                        }
                        
                        return `<div style="${colTextStyles}">${colProcessedContent}</div>`
                      case 'button':
                        const colButtonColor = el.properties?.color || '#007bff'
                        const colButtonTextColor = el.properties?.textColor || '#ffffff'
                        const colButtonFontSize = el.properties?.fontSize || '16px'
                        const colButtonFontFamily = el.properties?.fontFamily || 'Arial, sans-serif'
                        const colButtonPadding = el.properties?.padding || '12px 24px'
                        const colButtonTextAlign = el.properties?.textAlign || 'center'
                        const colFullWidth = el.properties?.fullWidth || false
                        
                        // Use email-safe CSS for buttons in columns
                        // For full width buttons, use table-based layout to ensure proper rendering
                        if (colFullWidth) {
                          return `
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 10px 0;">
                              <tr>
                                <td style="text-align: ${colButtonTextAlign};">
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                                    <tr>
                                      <td style="background-color: ${colButtonColor}; border-radius: 4px; text-align: center;">
                                        <a href="${el.properties?.url || '#'}" 
                                           style="display: inline-block; padding: ${colButtonPadding}; color: ${colButtonTextColor}; text-decoration: none; font-size: ${colButtonFontSize}; font-family: ${colButtonFontFamily}; font-weight: bold; line-height: 1.2; min-height: 44px;">
                                          ${el.properties?.text || 'Click Here'}
                                        </a>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          `
                        } else {
                          // For auto width buttons, use inline-block with max-width
                          const colButtonStyles = `display: inline-block; max-width: 100%; background-color: ${colButtonColor}; color: ${colButtonTextColor}; padding: ${colButtonPadding}; border: none; border-radius: 4px; cursor: pointer; font-size: ${colButtonFontSize}; font-family: ${colButtonFontFamily}; text-decoration: none; text-align: center; font-weight: bold; line-height: 1.2; min-height: 44px;`
                          return `<div style="text-align: ${colButtonTextAlign}; margin: 10px 0;">
                            <a href="${el.properties?.url || '#'}" style="${colButtonStyles}">
                              ${el.properties?.text || 'Click Here'}
                            </a>
                          </div>`
                        }
                      case 'image':
                        const colImageWidth = el.properties?.width || 300
                        const colImageHeight = el.properties?.height || 200
                        return `<div style="text-align: center; margin: 10px 0;">
                          <img src="${el.properties?.src || 'https://via.placeholder.com/300x200'}" 
                               alt="${el.properties?.alt || 'Image'}" 
                               style="max-width: 100%; height: auto; border-radius: 4px;"
                               width="${colImageWidth}"
                               height="${colImageHeight}">
                        </div>`
                      case 'divider':
                        return `<div style="border-top: 1px solid #e0e0e0; margin: 10px 0;"></div>`
                      case 'spacer':
                        return `<div style="height: 10px;"></div>`
                      default:
                        return ''
                    }
                  }
                  
                  return `<div style="display: flex; gap: 20px; margin: 20px 0;">
                    <div style="flex: 1;">
                      ${leftColumnElements.map(renderColumnElement).join('')}
                    </div>
                    <div style="flex: 1;">
                      ${rightColumnElements.map(renderColumnElement).join('')}
                    </div>
                  </div>`
                default:
                  return ''
              }
            }).join('')
}

function generateTextFromElements(elements: any[]): string {
  return elements
    .map(element => {
      switch (element.type) {
        case 'text':
          return element.content || ''
        case 'button':
          return `${element.properties?.text || 'Click Here'}: ${element.properties?.url || '#'}`
        case 'image':
          return `[Image: ${element.properties?.alt || 'Image'}]`
        case 'divider':
          return '---'
        case 'spacer':
          return ''

        default:
          return ''
      }
    })
    .filter(text => text.trim())
    .join('\n\n')
}

/**
 * Update domain settings
 */
export async function updateDomainSettings(
  whopUserId: string,
  settings: {
    click_tracking?: boolean
    open_tracking?: boolean
    tls?: 'opportunistic' | 'enforced'
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Updating domain settings for user:', whopUserId)
    
    // Get the user's email config
    const configResult = await getEmailSyncConfig(whopUserId, false)
    if (!configResult.success || !configResult.config) {
      return { success: false, error: 'No email configuration found' }
    }
    
    const config = configResult.config
    
    if (!config.domain_id) {
      return { success: false, error: 'No domain ID found' }
    }
    
    // Update domain settings in Resend
    const { updateDomainSettings } = await import('@/app/actions/resend')
    const result = await updateDomainSettings(config.domain_id, settings)
    
    if (result.success) {
      console.log('Domain settings updated successfully')
      return { success: true }
    } else {
      console.error('Failed to update domain settings:', result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error('Error updating domain settings:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
} 

/**
 * Get the actual contact count from our database for a given audience
 */
export async function getDatabaseContactCount(audienceId: string): Promise<{ success: boolean; contactCount?: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from('email_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('audience_id', audienceId)
    
    if (error) {
      console.error('Error getting database contact count:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, contactCount: count || 0 }
  } catch (error) {
    console.error('Error getting database contact count:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
} 

/**
 * Sync an existing database audience to Resend
 * This is step 2 of the process - called from the UI when user clicks "Sync to Resend"
 */
export async function syncAudienceToResend(
  audienceId: string
): Promise<{ success: boolean; resendAudienceId?: string; syncedCount?: number; error?: string }> {
  try {
    console.log(`🔄 Starting Resend sync for audience: ${audienceId}`)
    
    // Get the audience from database
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('id', audienceId)
      .single()
    
    if (audienceError || !audienceData) {
      console.error('Failed to get audience from database:', audienceError)
      return { success: false, error: 'Audience not found in database' }
    }
    
    console.log('Found audience in database:', audienceData)
    
    // Check if audience is already synced to Resend
    // Only consider it synced if it has a real Resend audience ID (not temp_, manual_, instant_, etc.)
    if (audienceData.audience_id && 
        !audienceData.audience_id.startsWith('temp_') && 
        !audienceData.audience_id.startsWith('manual_') && 
        !audienceData.audience_id.startsWith('instant_') &&
        !audienceData.audience_id.startsWith('batch_')) {
      console.log('Audience already synced to Resend:', audienceData.audience_id)
      
      // Get the current contact count from database
      const { data: contacts } = await supabase
        .from('email_contacts')
        .select('id')
        .eq('audience_id', audienceId)
        .eq('is_subscribed', true)
      
      const contactCount = contacts?.length || 0
      console.log(`Audience already has ${contactCount} contacts synced to Resend`)
      
      return { success: true, resendAudienceId: audienceData.audience_id, syncedCount: contactCount }
    }
    
    // Create audience in Resend
    console.log('🎯 Creating audience in Resend:', audienceData.name)
    const audienceCreationResult = await createResendAudience(audienceData.name)
    if (!audienceCreationResult.success) {
      console.error('Failed to create audience in Resend:', audienceCreationResult.error)
      return { success: false, error: audienceCreationResult.error }
    }
    
    const resendAudienceId = audienceCreationResult.audienceId!
    console.log('✅ Audience created in Resend:', resendAudienceId)
    
    // Update the database audience with the real Resend ID
    const { error: updateError } = await supabase
      .from('email_audiences')
      .update({
        audience_id: resendAudienceId,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', audienceId)
    
    if (updateError) {
      console.error('Failed to update audience with Resend ID:', updateError)
      return { success: false, error: 'Failed to update audience with Resend ID' }
    }
    
    // Get all contacts from database for this audience
    const { data: contacts, error: contactsError } = await supabase
      .from('email_contacts')
      .select('*')
      .eq('audience_id', audienceId)
      .eq('is_subscribed', true)
    
    if (contactsError) {
      console.error('Failed to get contacts from database:', contactsError)
      return { success: false, error: 'Failed to get contacts from database' }
    }
    
    console.log(`📧 Found ${contacts?.length || 0} contacts to sync to Resend`)
    
    if (!contacts || contacts.length === 0) {
      console.log('No contacts to sync to Resend')
      return { success: true, resendAudienceId, syncedCount: 0 }
    }
    
    // Prepare contacts for Resend
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }
    
    const resendContacts = contacts.map(contact => ({
      email: contact.email,
      firstName: contact.first_name || '',
      lastName: contact.last_name || ''
    }))
    
    console.log(`🚀 Syncing ${resendContacts.length} contacts to Resend audience ${resendAudienceId}`)
    
    // Add contacts to Resend with retry mechanism
    const { createResendContactsBatch } = await import('@/app/actions/resend')
    
    let contactSyncResult: { success: boolean; createdCount: number; errors: string[] } | undefined
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries} to sync contacts to Resend`)
        contactSyncResult = await createResendContactsBatch(
          apiKey,
          resendContacts,
          resendAudienceId
        )
        break // Success, exit retry loop
      } catch (error) {
        retryCount++
        console.error(`❌ Resend contact sync attempt ${retryCount} failed:`, error)
        
        // Check if it's a rate limit error
        const isRateLimitError = error instanceof Error && 
          (error.message.includes('rate_limit') || 
           error.message.includes('Too many requests') ||
           error.message.includes('429'))
        
        if (retryCount >= maxRetries) {
          throw error
        }
        
        // Wait longer for rate limit errors
        const delayMs = isRateLimitError ? 5000 : 3000
        console.log(`⏳ Waiting ${delayMs}ms before retry ${retryCount + 1}...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    
    if (!contactSyncResult) {
      throw new Error('Failed to sync contacts to Resend after all retries')
    }
    
    console.log(`✅ Resend sync result: ${contactSyncResult.createdCount} created, ${contactSyncResult.errors.length} errors`)
    
    // Log individual errors for debugging
    if (contactSyncResult.errors.length > 0) {
      console.log('❌ Resend contact creation errors:')
      contactSyncResult.errors.forEach((error: string, index: number) => {
        console.log(`  Error ${index + 1}: ${error}`)
      })
    }
    
    // Verify the sync
    const { getResendAudienceContactCount } = await import('@/app/actions/resend')
    const verificationResult = await getResendAudienceContactCount(resendAudienceId)
    
    if (verificationResult.success) {
      console.log(`✅ Verification: Resend audience has ${verificationResult.contactCount} contacts`)
      console.log(`📊 Sync Summary: Database (${contacts.length}) vs Resend (${verificationResult.contactCount})`)
      
      if (verificationResult.contactCount !== contactSyncResult.createdCount) {
        console.warn(`⚠️  DISCREPANCY: Expected ${contactSyncResult.createdCount} contacts, but Resend shows ${verificationResult.contactCount}`)
      }
    }
    
    return {
      success: true,
      resendAudienceId,
      syncedCount: contactSyncResult.createdCount
    }
    
  } catch (error) {
    console.error('Error syncing audience to Resend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Update an existing audience with fresh members from Whop and re-sync to Resend
 * This is for updating existing lists with new members
 */
export async function updateAudienceWithNewMembers(
  audienceId: string,
  whopApiKey: string
): Promise<{ success: boolean; updatedCount?: number; syncedCount?: number; error?: string }> {
  try {
    console.log(`🔄 Starting audience update for: ${audienceId}`)
    
    // Get the audience from database
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('id', audienceId)
      .single()
    
    if (audienceError || !audienceData) {
      console.error('Failed to get audience from database:', audienceError)
      return { success: false, error: 'Audience not found in database' }
    }
    
    console.log('Found audience in database:', audienceData)
    
    // Fetch fresh members from Whop
    console.log('📥 Fetching fresh members from Whop...')
    const { fetchAllWhopMembers } = await import('@/app/actions')
    const membersResult = await fetchAllWhopMembers(whopApiKey)
    
    if (!membersResult.success || !membersResult.members) {
      console.error('Failed to fetch Whop members:', membersResult.error)
      return { success: false, error: 'Failed to fetch Whop members' }
    }
    
    const members = membersResult.members
    console.log(`📊 Found ${members.length} total members from Whop`)
    
    // Filter members with emails
    const membersWithEmails = members.filter(member => member.email)
    console.log(`📧 Found ${membersWithEmails.length} members with emails`)
    
    if (membersWithEmails.length === 0) {
      console.log('No members with emails to update')
      return { success: true, updatedCount: 0, syncedCount: 0 }
    }
    
    // Update the database with fresh members
    console.log('💾 Updating database with fresh members...')
    const syncResult = await syncWhopMembersToEmailContacts(
      audienceId,
      members,
      (progress) => {
        console.log(`Update progress: ${progress}%`)
      }
    )
    
    if (!syncResult.success) {
      console.error('Failed to update database:', syncResult)
      return { success: false, error: 'Failed to update database with fresh members' }
    }
    
    console.log(`✅ Database updated: ${syncResult.processedCount} processed, ${syncResult.failedCount} failed`)
    
    // If audience is already synced to Resend, re-sync the contacts
    if (audienceData.audience_id && !audienceData.audience_id.startsWith('temp_')) {
      console.log('🔄 Re-syncing updated contacts to Resend...')
      const resendSyncResult = await syncAudienceToResend(audienceId)
      
      if (resendSyncResult.success) {
        console.log(`✅ Re-sync complete: ${resendSyncResult.syncedCount} contacts synced to Resend`)
        return {
          success: true,
          updatedCount: syncResult.processedCount,
          syncedCount: resendSyncResult.syncedCount
        }
      } else {
        console.error('Failed to re-sync to Resend:', resendSyncResult.error)
        return {
          success: false,
          error: `Database updated but failed to re-sync to email service: ${resendSyncResult.error}`
        }
      }
    } else {
      // Audience not synced to Resend yet, just return database update result
      console.log('ℹ️ Audience not synced to email service yet')
      return {
        success: true,
        updatedCount: syncResult.processedCount,
        syncedCount: 0
      }
    }
    
  } catch (error) {
    console.error('Error updating audience with new members:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Re-sync an existing audience to Resend (forces re-sync even if already synced)
 * This is for the Re-sync button when users want to retry failed contacts
 */
export async function resyncAudienceToResend(
  audienceId: string
): Promise<{ success: boolean; resendAudienceId?: string; syncedCount?: number; error?: string }> {
  try {
    console.log(`🔄 Starting forced re-sync for audience: ${audienceId}`)
    
    // Get the audience from database
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('id', audienceId)
      .single()
    
    if (audienceError || !audienceData) {
      console.error('Failed to get audience from database:', audienceError)
      return { success: false, error: 'Audience not found in database' }
    }
    
    console.log('Found audience in database:', audienceData)
    
    // Check if we need to create a new audience in Resend (if current audience_id is temporary)
    let resendAudienceId = audienceData.audience_id
    if (!audienceData.audience_id || 
        audienceData.audience_id.startsWith('temp_') || 
        audienceData.audience_id.startsWith('manual_') || 
        audienceData.audience_id.startsWith('instant_') ||
        audienceData.audience_id.startsWith('batch_')) {
      
      console.log('🎯 Creating new audience in Resend for re-sync:', audienceData.name)
      const audienceCreationResult = await createResendAudience(audienceData.name)
      if (!audienceCreationResult.success) {
        console.error('Failed to create audience in Resend:', audienceCreationResult.error)
        return { success: false, error: audienceCreationResult.error }
      }
      
      resendAudienceId = audienceCreationResult.audienceId!
      console.log('✅ New audience created in Resend:', resendAudienceId)
      
      // Update the database audience with the real Resend ID
      const { error: updateError } = await supabase
        .from('email_audiences')
        .update({
          audience_id: resendAudienceId,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', audienceId)
      
      if (updateError) {
        console.error('Failed to update audience with Resend ID:', updateError)
        return { success: false, error: 'Failed to update audience with Resend ID' }
      }
    }
    
    // Get all contacts from database for this audience
    const { data: contacts, error: contactsError } = await supabase
      .from('email_contacts')
      .select('*')
      .eq('audience_id', audienceId)
      .eq('is_subscribed', true)
    
    if (contactsError) {
      console.error('Failed to get contacts from database:', contactsError)
      return { success: false, error: 'Failed to get contacts from database' }
    }
    
    console.log(`📧 Found ${contacts?.length || 0} contacts to re-sync to Resend`)
    
    if (!contacts || contacts.length === 0) {
      console.log('No contacts to re-sync to Resend')
      return { success: true, resendAudienceId, syncedCount: 0 }
    }
    
    // Prepare contacts for Resend
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }
    
    const resendContacts = contacts.map(contact => ({
      email: contact.email,
      firstName: contact.first_name || '',
      lastName: contact.last_name || ''
    }))
    
    console.log(`🚀 Re-syncing ${resendContacts.length} contacts to Resend audience ${resendAudienceId}`)
    
    // Add contacts to Resend with retry mechanism
    const { createResendContactsBatch } = await import('@/app/actions/resend')
    
    let contactSyncResult: { success: boolean; createdCount: number; errors: string[] } | undefined
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries} to re-sync contacts to Resend`)
        contactSyncResult = await createResendContactsBatch(
          apiKey,
          resendContacts,
          resendAudienceId
        )
        break // Success, exit retry loop
      } catch (error) {
        retryCount++
        console.error(`❌ Resend contact re-sync attempt ${retryCount} failed:`, error)
        
        // Check if it's a rate limit error
        const isRateLimitError = error instanceof Error && 
          (error.message.includes('rate_limit') || 
           error.message.includes('Too many requests') ||
           error.message.includes('429'))
        
        if (retryCount >= maxRetries) {
          throw error
        }
        
        // Wait longer for rate limit errors
        const delayMs = isRateLimitError ? 5000 : 3000
        console.log(`⏳ Waiting ${delayMs}ms before retry ${retryCount + 1}...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    
    if (!contactSyncResult) {
      throw new Error('Failed to re-sync contacts to Resend after all retries')
    }
    
    console.log(`✅ Re-sync result: ${contactSyncResult.createdCount} created, ${contactSyncResult.errors.length} errors`)
    
    // Log individual errors for debugging
    if (contactSyncResult.errors.length > 0) {
      console.log('❌ Resend contact creation errors:')
      contactSyncResult.errors.forEach((error: string, index: number) => {
        console.log(`  Error ${index + 1}: ${error}`)
      })
    }
    
    // Verify the re-sync
    const { getResendAudienceContactCount } = await import('@/app/actions/resend')
    const verificationResult = await getResendAudienceContactCount(audienceData.audience_id)
    
    if (verificationResult.success) {
      console.log(`✅ Verification: Resend audience has ${verificationResult.contactCount} contacts`)
      console.log(`📊 Re-sync Summary: Database (${contacts.length}) vs Resend (${verificationResult.contactCount})`)
      
      if (verificationResult.contactCount !== contactSyncResult.createdCount) {
        console.warn(`⚠️  DISCREPANCY: Expected ${contactSyncResult.createdCount} contacts, but Resend shows ${verificationResult.contactCount}`)
      }
    }
    
    return {
      success: true,
      resendAudienceId: audienceData.audience_id,
      syncedCount: contactSyncResult.createdCount
    }
    
  } catch (error) {
    console.error('Error re-syncing audience to Resend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Check if user can send emails to the specified number of contacts based on their plan
 */
export async function checkEmailPlanLimit(
  whopUserId: string, 
  contactCount: number
): Promise<{ 
  canSend: boolean; 
  error?: string; 
  planDetails?: { 
    name: string; 
    contactLimit: number; 
    currentUsage?: number;
  } 
}> {
  try {
    console.log(`🔍 Checking plan limit for user ${whopUserId} - attempting to send to ${contactCount} contacts`)
    
    // Get user's subscription status
    const { checkSubscriptionStatus } = await import('@/app/actions')
    const subscriptionResult = await checkSubscriptionStatus(whopUserId)
    
    if (!subscriptionResult.hasActiveSubscription) {
      return {
        canSend: false,
        error: 'No active subscription found. Please upgrade your plan to send emails.'
      }
    }
    
    const subscription = subscriptionResult.subscription
    if (!subscription) {
      return {
        canSend: false,
        error: 'Subscription details not found. Please contact support.'
      }
    }
    
    const contactLimit = subscription.contactLimit || 3000 // Default to Basic plan
    const planName = subscription.planName || 'Basic'
    
    console.log(`📊 Plan check: ${planName} plan allows ${contactLimit} contacts, attempting ${contactCount}`)
    
    // Get current usage from database
    const { data: audiences, error: audiencesError } = await supabase
      .from('email_audiences')
      .select('member_count')
      .eq('config_id', (await getEmailSyncConfig(whopUserId)).config?.id)
      .eq('is_active', true)
    
    if (audiencesError) {
      console.error('Error fetching current usage:', audiencesError)
    }
    
    const currentUsage = audiences?.reduce((total, audience) => total + (audience.member_count || 0), 0) || 0
    
    console.log(`📈 Current usage: ${currentUsage} contacts, Plan limit: ${contactLimit} contacts`)
    
    // Check if user's total current usage exceeds their plan limit
    if (currentUsage > contactLimit) {
      return {
        canSend: false,
        error: `Your ${planName} plan allows up to ${contactLimit.toLocaleString()} contacts, but you currently have ${currentUsage.toLocaleString()} contacts. Please upgrade your plan or reduce your audience size.`,
        planDetails: {
          name: planName,
          contactLimit: contactLimit,
          currentUsage: currentUsage
        }
      }
    }
    
    // Check if this specific campaign would exceed the plan limit
    if (contactCount > contactLimit) {
      return {
        canSend: false,
        error: `Your ${planName} plan allows up to ${contactLimit.toLocaleString()} contacts. You're trying to send to ${contactCount.toLocaleString()} contacts. Please upgrade your plan or reduce your audience size.`,
        planDetails: {
          name: planName,
          contactLimit: contactLimit,
          currentUsage: currentUsage
        }
      }
    }
    
    return {
      canSend: true,
      planDetails: {
        name: planName,
        contactLimit: contactLimit,
        currentUsage: currentUsage
      }
    }
    
  } catch (error) {
    console.error('Error checking plan limit:', error)
    return {
      canSend: false,
      error: 'Failed to check plan limits. Please try again or contact support.'
    }
  }
}

/**
 * Wrap email content with responsive container and styling
 */
function wrapEmailWithContainer(html: string, emailWidth: number = 600): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
        }
        .email-wrapper {
          width: 100%;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 20px 0;
        }
        .email-container {
          max-width: ${emailWidth}px;
          width: 100%;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          overflow: hidden;
        }
        .email-content {
          padding: 40px 30px;
          background-color: #ffffff;
        }
        .email-header {
          background-color: #f8f9fa;
          padding: 20px 30px;
          border-bottom: 1px solid #e9ecef;
        }
        .email-footer {
          background-color: #f8f9fa;
          padding: 20px 30px;
          border-top: 1px solid #e9ecef;
          font-size: 12px;
          color: #6c757d;
        }
        .company-logo {
          max-height: 40px;
          max-width: 200px;
        }
        .company-info {
          margin-top: 10px;
          font-size: 14px;
        }
        .unsubscribe-link {
          color: #6c757d;
          text-decoration: none;
        }
        .unsubscribe-link:hover {
          text-decoration: underline;
        }
        .view-browser-link {
          color: #6c757d;
          text-decoration: none;
        }
        .view-browser-link:hover {
          text-decoration: underline;
        }
        .powered-by {
          margin-top: 10px;
          font-size: 11px;
          color: #adb5bd;
        }
        /* Ensure images don't exceed container width */
        img {
          max-width: 100%;
          height: auto;
        }
        /* Ensure tables are responsive */
        table {
          max-width: 100%;
          border-collapse: collapse;
        }
        /* Ensure buttons are properly sized */
        .btn, button {
          max-width: 100%;
          word-wrap: break-word;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 10px;
          }
          .email-container {
            max-width: 100%;
            margin: 0;
            border-radius: 0;
          }
          .email-content {
            padding: 20px 15px;
          }
          .email-header {
            padding: 15px;
          }
          .email-footer {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          <div class="email-header">
            <!-- Header content will be added by wrapEmailWithHeaderFooter -->
          </div>
          <div class="email-content">
            ${html}
          </div>
          <div class="email-footer">
            <!-- Footer content will be added by wrapEmailWithHeaderFooter -->
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Wrap email content with dynamic header and footer based on company settings
 */
function wrapEmailWithHeaderFooter(html: string, companySettings: any, emailWidth: number = 600): string {
  const headerContent = companySettings.company_logo_url 
    ? `<img src="${companySettings.company_logo_url}" alt="${companySettings.company_name || 'Company'}" class="company-logo">`
    : `<h2 style="margin: 0; color: #333;">${companySettings.company_name || 'Company'}</h2>`

  const footerContent = `
    <div class="company-info">
      ${companySettings.company_name ? `<div>${companySettings.company_name}</div>` : ''}
      ${companySettings.company_website ? `<div><a href="https://${companySettings.company_website}" style="color: #6c757d; text-decoration: none;">${companySettings.company_website}</a></div>` : ''}
      ${companySettings.company_email ? `<div>${companySettings.company_email}</div>` : ''}
    </div>
    <div style="margin-top: 15px;">
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" class="unsubscribe-link">Unsubscribe</a>
      <span style="margin: 0 10px;">|</span>
      <a href="{{{RESEND_VIEW_IN_BROWSER_URL}}}" class="view-browser-link">View in browser</a>
    </div>
    ${companySettings.footer_customization?.footer_content?.showPoweredBy ? 
      '<div class="powered-by">Powered by EmailSync</div>' : ''
    }
  `

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
        }
        .email-wrapper {
          width: 100%;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 20px 0;
        }
        .email-container {
          max-width: ${emailWidth}px;
          width: 100%;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          overflow: hidden;
        }
        .email-content {
          padding: 40px 30px;
          background-color: #ffffff;
        }
        .email-header {
          background-color: #f8f9fa;
          padding: 20px 30px;
          border-bottom: 1px solid #e9ecef;
          text-align: center;
        }
        .email-footer {
          background-color: #f8f9fa;
          padding: 20px 30px;
          border-top: 1px solid #e9ecef;
          font-size: 12px;
          color: #6c757d;
          text-align: center;
        }
        .company-logo {
          max-height: 40px;
          max-width: 200px;
        }
        .company-info {
          margin-top: 10px;
          font-size: 14px;
        }
        .unsubscribe-link {
          color: #6c757d;
          text-decoration: none;
        }
        .unsubscribe-link:hover {
          text-decoration: underline;
        }
        .view-browser-link {
          color: #6c757d;
          text-decoration: none;
        }
        .view-browser-link:hover {
          text-decoration: underline;
        }
        .powered-by {
          margin-top: 10px;
          font-size: 11px;
          color: #adb5bd;
        }
        /* Ensure images don't exceed container width */
        img {
          max-width: 100%;
          height: auto;
        }
        /* Ensure tables are responsive */
        table {
          max-width: 100%;
          border-collapse: collapse;
        }
        /* Ensure buttons are properly sized */
        .btn, button {
          max-width: 100%;
          word-wrap: break-word;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 10px;
          }
          .email-container {
            max-width: 100%;
            margin: 0;
            border-radius: 0;
          }
          .email-content {
            padding: 20px 15px;
          }
          .email-header {
            padding: 15px;
          }
          .email-footer {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          <div class="email-header">
            ${headerContent}
          </div>
          <div class="email-content">
            ${html}
          </div>
          <div class="email-footer">
            ${footerContent}
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// ============================================================================
// FLOW AND TRIGGER FUNCTIONS
// ============================================================================









// ============================================================================
// FLOW AND TRIGGER FUNCTIONS
// ============================================================================

/**
 * Add a user to a specific email flow
 */
export async function addUserToFlow({ 
  whopUserId, 
  flowId, 
  userEmail, 
  userData 
}: { 
  whopUserId: string
  flowId: string
  userEmail: string
  userData?: any
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔄 Adding user ${userEmail} to flow ${flowId}`)
    
    // Check if user is already in this flow
    const { data: existingProgress } = await supabase
      .from('email_flow_progress')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('flow_id', flowId)
      .eq('user_email', userEmail)
      .single()

    if (existingProgress) {
      console.log(`⚠️ User ${userEmail} already in flow ${flowId}`)
      return { success: true, error: 'User already in flow' }
    }

    // Get flow details to determine total steps
    const { data: flow } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', flowId)
      .eq('whop_user_id', whopUserId)
      .single()

    if (!flow) {
      return { success: false, error: 'Flow not found' }
    }

    // Add user to flow progress
    const { error: insertError } = await supabase
      .from('email_flow_progress')
      .insert({
        whop_user_id: whopUserId,
        flow_id: flowId,
        user_email: userEmail,
        user_first_name: userData?.firstName || 'User',
        user_last_name: userData?.lastName || '',
        current_step: 1,
        total_steps: flow.total_steps || 1,
        status: 'active'
      })

    if (insertError) {
      console.error('Error adding user to flow:', insertError)
      return { success: false, error: insertError.message }
    }

    console.log(`✅ User ${userEmail} added to flow ${flowId}`)
    return { success: true }
  } catch (error) {
    console.error('Error adding user to flow:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ============================================================================
// VERCEL-COMPATIBLE AUTOMATION QUEUE SYSTEM
// ============================================================================

// Rate limiting configuration
const RESEND_RATE_LIMIT = {
  REQUESTS_PER_SECOND: 2,
  DELAY_BETWEEN_REQUESTS: 1000, // 1000ms between requests (conservative for 2 req/sec limit)
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000, // 1 second base delay
  BATCH_SIZE: 10 // Process 10 emails per batch
}

/**
 * Add a job to the database automation queue
 */
async function addToAutomationQueue(job: {
  type: 'trigger' | 'flow_step'
  whopUserId: string
  triggerType?: string
  flowId?: string
  emailStep?: number
  userEmail: string
  userData?: any
  subject: string
  html: string
  text: string
  fromEmail: string
  priority?: number
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    console.log(`📋 Adding job to database queue (${job.type})`)
    
    // Insert job into database
    const { data: jobData, error: insertError } = await supabase
      .from('automation_jobs')
      .insert({
        job_type: job.type,
        whop_user_id: job.whopUserId,
        trigger_type: job.triggerType,
        flow_id: job.flowId,
        email_step: job.emailStep,
        user_email: job.userEmail,
        user_data: job.userData,
        subject: job.subject,
        html_content: job.html,
        text_content: job.text,
        from_email: job.fromEmail,
        priority: job.priority || 2
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error adding job to database queue:', insertError)
      return { success: false, error: insertError.message }
    }

    const jobId = jobData.id
    console.log(`✅ Added job ${jobId} to database queue`)

    // Trigger queue processing (non-blocking)
    triggerQueueProcessing()

    return { success: true, jobId }
  } catch (error) {
    console.error('Error adding job to database queue:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Trigger queue processing (non-blocking)
 */
async function triggerQueueProcessing() {
  try {
    // Call the queue processor API route
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/automation-queue/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workerId: `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
    })

    if (!response.ok) {
      console.error('Failed to trigger queue processing:', response.statusText)
    } else {
      const result = await response.json()
      console.log(`🔄 Queue processing triggered: ${result.processedJobs} jobs processed`)
    }
  } catch (error) {
    console.error('Error triggering queue processing:', error)
  }
}



/**
 * Enhanced addUserToTrigger with queuing
 */
export async function addUserToTrigger({
  whopUserId,
  triggerType,
  userEmail,
  userData
}: {
  whopUserId: string
  triggerType: string
  userEmail: string
  userData?: any
}): Promise<{ success: boolean; error?: string; jobId?: string }> {
  try {
    console.log(`🔄 Adding user ${userEmail} to trigger ${triggerType}`)
    
    // Check if user has already received this trigger
    const { data: existingTrigger } = await supabase
      .from('email_trigger_sent')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('trigger_type', triggerType)
      .eq('user_email', userEmail)
      .single()

    if (existingTrigger?.sent) {
      console.log(`⚠️ User ${userEmail} already received trigger ${triggerType}`)
      return { success: true, error: 'User already received this trigger' }
    }

    // Add or update trigger record
    const { error: upsertError } = await supabase
      .from('email_trigger_sent')
      .upsert({
        whop_user_id: whopUserId,
        trigger_type: triggerType,
        user_email: userEmail,
        user_first_name: userData?.firstName || 'User',
        user_last_name: userData?.lastName || '',
        sent: false
      })

    if (upsertError) {
      console.error('Error adding user to trigger:', upsertError)
      return { success: false, error: upsertError.message }
    }

    console.log(`✅ User ${userEmail} added to trigger ${triggerType}`)
    return { success: true }
  } catch (error) {
    console.error('Error adding user to trigger:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Enhanced sendTriggerEmail with queuing
 */
export async function sendTriggerEmail({
  whopUserId,
  triggerType,
  subject,
  html,
  text,
  fromEmail,
  priority = 2
}: {
  whopUserId: string
  triggerType: string
  subject: string
  html: string
  text: string
  fromEmail: string
  priority?: number
}): Promise<{ success: boolean; error?: string; sentCount?: number; jobId?: string }> {
  try {
    console.log(`📧 Queuing trigger ${triggerType} for processing`)

    // Get users who haven't received this trigger yet
    const { data: pendingUsers, error: queryError } = await supabase
      .from('email_trigger_sent')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('trigger_type', triggerType)
      .eq('sent', false)

    if (queryError) {
      console.error('Error querying trigger users:', queryError)
      return { success: false, error: queryError.message }
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      console.log(`ℹ️ No pending users for trigger ${triggerType}`)
      return { success: true, sentCount: 0 }
    }

    console.log(`📧 Found ${pendingUsers.length} users for trigger ${triggerType}`)

    // Add jobs to queue for each user
    const jobIds: string[] = []
    
    for (const user of pendingUsers) {
      const queueResult = await addToAutomationQueue({
        type: 'trigger',
        whopUserId,
        triggerType,
        userEmail: user.user_email,
        userData: {
          firstName: user.user_first_name,
          lastName: user.user_last_name
        },
        subject,
        html,
        text,
        fromEmail,
        priority
      })
      
      if (queueResult.success && queueResult.jobId) {
        jobIds.push(queueResult.jobId)
      }
    }

    console.log(`📋 Queued ${jobIds.length} trigger jobs for processing`)
    return { success: true, sentCount: pendingUsers.length, jobId: jobIds[0] }
  } catch (error) {
    console.error('Error queuing trigger email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Enhanced sendFlowEmailStep with queuing
 */
export async function sendFlowEmailStep({
  whopUserId,
  flowId,
  emailStep,
  subject,
  html,
  text,
  fromEmail,
  priority = 2
}: {
  whopUserId: string
  flowId: string
  emailStep: number
  subject: string
  html: string
  text: string
  fromEmail: string
  priority?: number
}): Promise<{ success: boolean; error?: string; sentCount?: number; jobId?: string }> {
  try {
    console.log(`📧 Queuing flow ${flowId} step ${emailStep} for processing`)

    // Get users at this step
    const { data: usersAtStep, error: queryError } = await supabase
      .from('email_flow_progress')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('flow_id', flowId)
      .eq('current_step', emailStep)
      .eq('status', 'active')

    if (queryError) {
      console.error('Error querying flow progress:', queryError)
      return { success: false, error: queryError.message }
    }

    if (!usersAtStep || usersAtStep.length === 0) {
      console.log(`ℹ️ No users at step ${emailStep} in flow ${flowId}`)
      return { success: true, sentCount: 0 }
    }

    console.log(`📧 Found ${usersAtStep.length} users at step ${emailStep}`)

    // Add job to queue for batch processing
    const queueResult = await addToAutomationQueue({
      type: 'flow_step',
      whopUserId,
      flowId,
      emailStep,
      userEmail: '', // Not used for flow steps
      userData: {},
      subject,
      html,
      text,
      fromEmail,
      priority
    })

    if (queueResult.success) {
      console.log(`📋 Queued flow step job for processing`)
      return { success: true, sentCount: usersAtStep.length, jobId: queueResult.jobId }
    } else {
      return { success: false, error: queueResult.error }
    }
  } catch (error) {
    console.error('Error queuing flow email step:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Add a single member to an email list/audience
 */
export async function addMemberToList(
  audienceId: string,
  memberData: {
    email: string
    firstName?: string
    lastName?: string
    fullName?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Adding member ${memberData.email} to audience ${audienceId}`)
    
    // Get the audience from database to find the config
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*, config_id')
      .eq('id', audienceId)
      .single()
    
    if (audienceError || !audienceData) {
      console.error('Failed to get audience from database:', audienceError)
      return { success: false, error: 'Audience not found' }
    }
    
    // Get the email sync config to determine platform and get API key
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('id', audienceData.config_id)
      .single()
    
    if (configError || !configData) {
      console.error('Failed to get email sync config:', configError)
      return { success: false, error: 'Email configuration not found' }
    }
    
    // For now, we only support the main email service (not mentioning by name per memory)
    if (configData.platform_type !== 'resend') {
      return { success: false, error: 'Unsupported email platform' }
    }
    
    // Get the email service API key from environment (this is the service API key, not user's Whop key)
    const emailApiKey = process.env.RESEND_API_KEY
    if (!emailApiKey) {
      return { success: false, error: 'Email service API key not configured' }
    }
    
    // Transform member data to the format expected by the sync function
    const memberForSync = {
      id: `manual_${Date.now()}`, // Generate a temporary ID for manual additions
      email: memberData.email,
      name: memberData.fullName || `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim() || memberData.email.split('@')[0],
      username: memberData.email.split('@')[0],
      status: 'active',
      created_at: new Date().toISOString(),
      valid: true,
      user: 'manual',
      first_name: memberData.firstName,
      last_name: memberData.lastName
    }
    
    // Apply rate limiting before adding member
    const { resendRateLimiter } = await import('@/lib/rate-limiter')
    await resendRateLimiter.waitForLimit('resend_api')

    // Use the existing sync function to add the member
    const { syncMemberToResend } = await import('@/app/actions/resend')
    const syncResult = await syncMemberToResend(
      emailApiKey,
      audienceData.audience_id, // This is the platform audience ID
      memberForSync
    )
    
    if (!syncResult.success) {
      return { success: false, error: syncResult.error || 'Failed to add member to email service' }
    }
    
    // Also add the member to our database for tracking
    const { error: dbError } = await supabase
      .from('email_contacts')
      .upsert({
        audience_id: audienceId,
        email: memberData.email,
        first_name: memberData.firstName || '',
        last_name: memberData.lastName || '',
        full_name: memberData.fullName || `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim(),
        is_subscribed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (dbError) {
      console.error('Error saving member to database:', dbError)
      // Don't fail the whole operation if database save fails, since the member was added to the email service
    }
    
    // Update the audience member count
    const { error: updateError } = await supabase
      .from('email_audiences')
      .update({ 
        member_count: (audienceData.member_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', audienceId)
    
    if (updateError) {
      console.error('Error updating audience member count:', updateError)
    }
    
    console.log(`Successfully added member ${memberData.email} to audience ${audienceId}`)
    return { success: true }
  } catch (error) {
    console.error('Error adding member to list:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Save EmailSync platform configuration for whopmail.com domain
 */
export async function saveWhopmailConfig(whopUserId: string, username: string, fromName?: string, fromEmail?: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Saving whopmail.com config for user:', username)
    
    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,30}[a-zA-Z0-9]$/
    if (!usernameRegex.test(username)) {
      return { success: false, error: 'Username must be 2-32 characters, alphanumeric with hyphens allowed, cannot start or end with hyphen' }
    }

    // Check if username is already taken
    const { data: existingUser, error: checkError } = await supabase
      .from('email_platform_configs')
      .select('username')
      .eq('email_type', 'whopmail')
      .eq('username', username)
      .neq('whop_user_id', whopUserId)

    if (checkError) {
      console.error('Error checking username availability:', checkError)
      return { success: false, error: 'Failed to check username availability' }
    }

    if (existingUser && existingUser.length > 0) {
      return { success: false, error: 'Username is already taken. Please choose a different username.' }
    }

    // Check if a config already exists for this user
    const { data: existingConfig, error: configError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .single()

    if (configError && configError.code !== 'PGRST116') {
      console.error('Error checking existing config:', configError)
      return { success: false, error: configError.message }
    }

    // If no fromName provided, try to get it from company settings
    let finalFromName = fromName
    if (!finalFromName) {
      try {
        const { data: companyData } = await supabase
          .from('email_platform_configs')
          .select('company_name')
          .eq('whop_user_id', whopUserId)
          .eq('platform_type', 'resend')
          .single()
        
        if (companyData?.company_name) {
          finalFromName = companyData.company_name
          console.log('Using company name as from_name for whopmail:', finalFromName)
        }
      } catch (error) {
        console.log('Could not fetch company name for whopmail, using username')
      }
    }

    // Use the RPC function to bypass the trigger and prevent from_email override
    const finalFromEmail = fromEmail || existingConfig?.from_email || `${username}@whopmail.com`
    const finalFromNameValue = finalFromName || username
    
    const { error: rpcError } = await supabase
      .rpc('save_whopmail_config_direct', {
        p_whop_user_id: whopUserId,
        p_username: username,
        p_from_name: finalFromNameValue,
        p_from_email: finalFromEmail,
        p_platform_type: 'resend',
        p_email_type: 'whopmail'
      })

    if (rpcError) {
      console.error('RPC function failed, falling back to standard update:', rpcError)
      
      // Fallback to standard update if RPC doesn't exist
      const configData = {
        whop_user_id: whopUserId,
        platform_type: 'resend',
        email_type: 'whopmail',
        username: username,
        custom_domain: null,
        domain_id: null,
        domain_status: 'verified', // whopmail.com is pre-verified
        domain_verification_dns: null,
        from_email: finalFromEmail,
        from_name: finalFromName,
        updated_at: new Date().toISOString()
      }

      let fallbackResult
      if (existingConfig) {
        // Update existing config
        fallbackResult = await supabase
          .from('email_platform_configs')
          .update(configData)
          .eq('id', existingConfig.id)
      } else {
        // Insert new config
        fallbackResult = await supabase
          .from('email_platform_configs')
          .insert({
            ...configData,
            created_at: new Date().toISOString()
          })
      }

      if (fallbackResult.error) {
        console.error('Error saving whopmail config:', fallbackResult.error)
        return { success: false, error: fallbackResult.error.message }
      }
    }

    console.log('Whopmail config saved successfully')
    return { success: true }
  } catch (error) {
    console.error('Error saving whopmail config:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Check if a whopmail.com username is available
 */
export async function checkWhopmailUsernameAvailability(username: string, excludeUserId?: string): Promise<{ success: boolean; available: boolean; error?: string }> {
  try {
    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,30}[a-zA-Z0-9]$/
    if (!usernameRegex.test(username)) {
      return { success: false, available: false, error: 'Invalid username format' }
    }

    let query = supabase
      .from('email_platform_configs')
      .select('username')
      .eq('email_type', 'whopmail')
      .eq('username', username)

    if (excludeUserId) {
      query = query.neq('whop_user_id', excludeUserId)
    }

    const { data: existingUser, error } = await query

    if (error) {
      console.error('Error checking username availability:', error)
      return { success: false, available: false, error: 'Failed to check username availability' }
    }

    const available = !existingUser || existingUser.length === 0
    return { success: true, available }
  } catch (error) {
    console.error('Error checking username availability:', error)
    return { success: false, available: false, error: 'Unknown error occurred' }
  }
}

/**
 * Update just the from_name for an existing email configuration
 */
export async function updateFromName(whopUserId: string, newFromName: string, newFromEmail?: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Updating from_name for user:', whopUserId, 'to:', newFromName)
    
    // Get the existing configuration - don't filter by platform_type for whopmail users
    const { data: existingConfig, error: fetchError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .single()

    if (fetchError) {
      console.error('Error fetching existing config:', fetchError)
      return { success: false, error: 'Configuration not found' }
    }

    if (!existingConfig) {
      console.error('No email configuration found for user:', whopUserId)
      return { success: false, error: 'No email configuration found' }
    }

    console.log('Found existing config:', existingConfig)

    // Calculate the new from_email based on the existing configuration or use provided newFromEmail
    const domain = existingConfig.email_type === 'whopmail' ? 'whopmail.com' : existingConfig.custom_domain
    const username = existingConfig.username
    
    console.log('Email type:', existingConfig.email_type)
    console.log('Username:', username)
    console.log('Domain:', domain)
    console.log('New from email provided:', newFromEmail)
    
    let finalFromEmail: string
    if (newFromEmail && newFromEmail.trim()) {
      // Use the provided from_email if it's valid
      finalFromEmail = newFromEmail.trim()
      console.log('Using provided from_email:', finalFromEmail)
    } else {
      // Keep the existing from_email unchanged
      finalFromEmail = existingConfig.from_email || `noreply@${domain}`
      console.log('Keeping existing from_email:', finalFromEmail)
    }

    // Use a direct SQL query to bypass the trigger and update both fields
    const { error: updateError } = await supabase
      .rpc('update_from_name_direct', {
        config_id: existingConfig.id,
        new_from_name: newFromName,
        new_from_email: finalFromEmail
      })

    if (updateError) {
      console.log('Direct RPC failed, trying standard update:', updateError.message)
      
      // Fallback to standard update if RPC doesn't exist
      const { error: fallbackError } = await supabase
        .from('email_platform_configs')
        .update({
          from_name: newFromName,
          from_email: finalFromEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id)

      if (fallbackError) {
        console.error('Error updating from_name:', fallbackError)
        return { success: false, error: fallbackError.message }
      }
    }

    // Verify the update was successful by fetching the updated record
    const { data: updatedConfig, error: verifyError } = await supabase
      .from('email_platform_configs')
      .select('from_name, from_email')
      .eq('id', existingConfig.id)
      .single()

    if (verifyError) {
      console.error('Error verifying update:', verifyError)
      return { success: false, error: 'Update verification failed' }
    }

    console.log('Update verification - from_name:', updatedConfig.from_name, 'from_email:', updatedConfig.from_email)
    
    if (updatedConfig.from_name !== newFromName || updatedConfig.from_email !== finalFromEmail) {
      console.error('Update verification failed - values do not match expected')
      return { success: false, error: 'Update verification failed - values do not match expected' }
    }

    console.log('From name updated successfully:', newFromName)
    return { success: true }
  } catch (error) {
    console.error('Error updating from_name:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}