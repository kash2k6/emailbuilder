import { createClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

// Configuration for processing
const PROCESSING_CONFIG = {
  // Database batch size (process this many members at once)
  DB_BATCH_SIZE: 100,
  
  // Resend batch size (respect 10 req/s limit)
  RESEND_BATCH_SIZE: 10,
  
  // Delay between Resend batches (100ms = 10 req/s)
  RESEND_BATCH_DELAY: 100,
  
  // Whop API batch size for fetching members (v2 endpoint uses 50 per page)
  WHOP_BATCH_SIZE: 50,
  
  // Progress update interval (ms)
  PROGRESS_UPDATE_INTERVAL: 500
}

interface ListProcessingJob {
  id: string
  whopUserId: string
  audienceId: string
  resendAudienceId: string
  audienceName: string
  totalMembers: number
  processedCount: number
  syncedToDbCount: number
  syncedToResendCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  currentPhase: 'initializing' | 'syncing_audience' | 'finalizing'
  error?: string
  startedAt: Date
  updatedAt: Date
  estimatedCompletionTime?: Date
}

interface ProcessingProgress {
  phase: string
  current: number
  total: number
  percentage: number
  estimatedTimeRemaining?: string
  status: string
}

// In-memory job store (in production, use Redis or database)
const processingJobs = new Map<string, ListProcessingJob>()

/**
 * Update job status in real-time
 */
function updateJobStatus(
  jobId: string, 
  updates: Partial<ListProcessingJob>
): void {
  const job = processingJobs.get(jobId)
  if (job) {
    Object.assign(job, updates, { updatedAt: new Date() })
    console.log(`📊 Updated job ${jobId}:`, updates)
  }
}

/**
 * NEW: Stream-based list processor that fetches and processes members simultaneously
 */
export async function processListInRealTime({
  whopUserId,
  audienceId,
  resendAudienceId,
  audienceName,
  whopApiKey,
  resendApiKey,
  onProgress
}: {
  whopUserId: string
  audienceId: string
  resendAudienceId: string
  audienceName: string
  whopApiKey: string
  resendApiKey: string
  onProgress: (progress: ProcessingProgress) => void
}): Promise<{ success: boolean; jobId: string; error?: string }> {
  
  console.log(`🔧 NEW: Stream-based processListInRealTime called with:`, {
    whopUserId,
    audienceId,
    resendAudienceId,
    audienceName
  })
  
  const startTime = Date.now()
  const jobId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Create processing job
  const job: ListProcessingJob = {
    id: jobId,
    whopUserId,
    audienceId,
    resendAudienceId,
    audienceName,
    totalMembers: 0, // Will be updated as we discover members
    processedCount: 0,
    syncedToDbCount: 0,
    syncedToResendCount: 0,
    status: 'pending',
    currentPhase: 'initializing',
    startedAt: new Date(),
    updatedAt: new Date()
  }
  
  processingJobs.set(jobId, job)
  
  try {
    console.log(`🚀 Starting STREAM-BASED list processing`)
    
    // Update job status
    job.status = 'processing'
    job.currentPhase = 'syncing_audience'
    job.updatedAt = new Date()
    
    // NEW APPROACH: Stream members and process them simultaneously
    const result = await streamAndProcessMembers({
      whopApiKey,
      audienceId,
      resendAudienceId,
      resendApiKey,
      onProgress: (progress) => {
        // Update job with real-time progress
        job.processedCount = progress.current
        job.totalMembers = progress.total
        job.updatedAt = new Date()
        
        onProgress(progress)
      },
      jobId
    })
    
    if (!result.success) {
      throw new Error(result.error || 'Stream processing failed')
    }
    
    // Phase 3: Finalize
    job.currentPhase = 'finalizing'
    job.status = 'completed'
    job.updatedAt = new Date()
    
    onProgress({
      phase: 'Finalizing',
      current: result.totalMembers,
      total: result.totalMembers,
      percentage: 100,
      status: 'List processing completed successfully!'
    })
    
    // Update audience status in database
    console.log(`🔧 Updating audience status to active with ${result.totalMembers} members`)
    await updateAudienceStatus(audienceId, 'active', result.totalMembers)
    
    console.log(`🎉 STREAM-BASED list processing completed successfully!`)
    return { success: true, jobId }
    
  } catch (error) {
    console.error('❌ Error in stream-based list processing:', error)
    
    // Update job status
    job.status = 'failed'
    job.error = error instanceof Error ? error.message : 'Unknown error'
    job.updatedAt = new Date()
    
    onProgress({
      phase: 'Error',
      current: 0,
      total: job.totalMembers,
      percentage: 0,
      status: `Processing failed: ${job.error}`
    })
    
    return { 
      success: false, 
      jobId, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * NEW: Stream members from Whop and process them in real-time
 */
async function streamAndProcessMembers({
  whopApiKey,
  audienceId,
  resendAudienceId,
  resendApiKey,
  onProgress,
  jobId
}: {
  whopApiKey: string
  audienceId: string
  resendAudienceId: string
  resendApiKey: string
  onProgress: (progress: ProcessingProgress) => void
  jobId: string
}): Promise<{ success: boolean; totalMembers: number; error?: string }> {
  
  console.log(`🌊 Starting to stream and process members simultaneously`)
  
  let totalMembers = 0
  let processedCount = 0
  let currentPage = 1
  let totalPages = 0
  
  try {
    // Phase 1: First query to get total pages and member count
    console.log(`🔍 First query: Getting total pages and member count...`)
    const firstPageResult = await fetchWhopMembersPage(whopApiKey, 1, PROCESSING_CONFIG.WHOP_BATCH_SIZE)
    
    if (!firstPageResult.success) {
      throw new Error(`Failed to get initial page info: ${firstPageResult.error}`)
    }
    
    totalMembers = firstPageResult.totalMembers || 0
    totalPages = Math.ceil(totalMembers / PROCESSING_CONFIG.WHOP_BATCH_SIZE)
    
    console.log(`📊 Total members: ${totalMembers}, Total pages: ${totalPages}`)
    
    // Update job status with total members
    updateJobStatus(jobId, {
      totalMembers,
      status: 'processing',
      currentPhase: 'syncing_audience'
    })
    
    onProgress({
      phase: 'Syncing Audience',
      current: 0,
      total: totalMembers,
      percentage: 0,
      status: `Found ${totalMembers} total members across ${totalPages} pages, starting to process...`
    })
    
    // Phase 2: Process each page knowing exactly how many pages exist
    while (currentPage <= totalPages) {
      console.log(`📄 Fetching page ${currentPage} of members`)
      
      // Fetch one page of members
      const pageResult = await fetchWhopMembersPage(whopApiKey, currentPage, PROCESSING_CONFIG.WHOP_BATCH_SIZE)
      
      if (!pageResult.success || !pageResult.members) {
        console.error(`❌ Failed to fetch page ${currentPage}:`, pageResult.error)
        break
      }
      
      const pageMembers = pageResult.members
      console.log(`📄 Page ${currentPage}: Found ${pageMembers.length} members`)
      
      // Update total count if this is the first page
      if (currentPage === 1) {
        totalMembers = pageResult.totalMembers || pageMembers.length
        console.log(`📊 Total members to process: ${totalMembers}`)
        
        onProgress({
          phase: 'Syncing Audience',
          current: 0,
          total: totalMembers,
          percentage: 0,
          status: `Found ${totalMembers} total members, starting to process...`
        })
      }
      
      // Process this page of members immediately (don't wait for all pages)
      console.log(`⚡ Processing page ${currentPage} members immediately`)
      
      // Process to database
      const dbResult = await syncMembersToDatabase(audienceId, pageMembers, (progress) => {
        const totalProcessed = processedCount + progress.current
        const percentage = Math.round((totalProcessed / totalMembers) * 100)
        
        onProgress({
          phase: 'Syncing Audience',
          current: totalProcessed,
          total: totalMembers,
          percentage,
          status: `Syncing ${totalProcessed}/${totalMembers} members to your audience`
        })
      })
      
      if (!dbResult.success) {
        throw new Error(`Database sync failed for page ${currentPage}: ${dbResult.error}`)
      }
      
      // Process to Resend
      const resendResult = await syncMembersToResend(resendApiKey, resendAudienceId, pageMembers, (progress) => {
        const totalProcessed = processedCount + progress.current
        const percentage = Math.round((totalProcessed / totalMembers) * 100)
        
        onProgress({
          phase: 'Syncing Audience',
          current: totalProcessed,
          total: totalMembers,
          percentage,
          status: `Syncing ${totalProcessed}/${totalMembers} members to your audience`
        })
      })
      
      if (!resendResult.success) {
        throw new Error(`Resend sync failed for page ${currentPage}: ${resendResult.error}`)
      }
      
      // Update counts
      processedCount += pageMembers.length
      console.log(`✅ Page ${currentPage} completed: ${pageMembers.length} members processed`)
      
      // Update job status in real-time
      updateJobStatus(jobId, {
        processedCount,
        syncedToDbCount: processedCount,
        syncedToResendCount: processedCount
      })
      
      // Move to next page
      currentPage++
      
      // Small delay to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`🎯 Stream processing completed: ${processedCount} members processed`)
    
    // Update job status to completed
    updateJobStatus(jobId, {
      status: 'completed',
      currentPhase: 'finalizing',
      processedCount,
      syncedToDbCount: processedCount,
      syncedToResendCount: processedCount
    })
    
    return { success: true, totalMembers: processedCount }
    
  } catch (error) {
    console.error('❌ Error in stream processing:', error)
    
    // Update job status to failed
    updateJobStatus(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Stream processing failed'
    })
    
    return { 
      success: false, 
      totalMembers: processedCount, 
      error: error instanceof Error ? error.message : 'Stream processing failed' 
    }
  }
}

/**
 * NEW: Fetch a single page of Whop members using v2 endpoint (has name and email)
 */
async function fetchWhopMembersPage(apiKey: string, page: number, perPage: number): Promise<{
  success: boolean
  members: any[]
  totalMembers: number
  hasMorePages: boolean
  error?: string
}> {
  try {
    console.log(`📄 Fetching Whop members page ${page} (${perPage} per page)`)
    
    // Use the v2 members endpoint which already has name and email
    // The v2 endpoint uses 'per' instead of 'limit'
    const url = `https://api.whop.com/api/v2/members?page=${page}&per=${perPage}`
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Whop API error: ${response.status} ${errorText}`)
    }
    
    const result = await response.json()
    const members = result.data || []
    
    // Extract member info from v2 endpoint (already has name and email!)
    const processedMembers = members.map((member: any) => ({
      id: member.id,
      email: member.email,
      // Use the actual name from the API response
      first_name: member.name ? member.name.split(' ')[0] : null,
      last_name: member.name ? member.name.split(' ').slice(1).join(' ') : null,
      full_name: member.name || null,
      username: member.username,
      whop_member_id: member.id,
      member_type: 'whop'
    }))
    
    const hasMorePages = result.pagination && 
      result.pagination.current_page < result.pagination.total_page
    
    console.log(`📄 Page ${page}: Processed ${processedMembers.length} members`)
    
    return {
      success: true,
      members: processedMembers,
      totalMembers: result.pagination?.total_count || members.length,
      hasMorePages
    }
    
  } catch (error) {
    console.error(`❌ Error fetching page ${page}:`, error)
    return {
      success: false,
      members: [],
      totalMembers: 0,
      hasMorePages: false,
      error: error instanceof Error ? error.message : 'Failed to fetch page'
    }
  }
}

/**
 * NEW: Extract first name from email (fast, no API calls)
 */
function extractFirstName(email: string): string {
  if (!email) return ''
  const emailName = email.split('@')[0]
  return emailName
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * NEW: Extract last name from email (fast, no API calls)
 */
function extractLastName(email: string): string {
  if (!email) return ''
  const emailName = email.split('@')[0]
  const parts = emailName.split(/[._-]/)
  if (parts.length > 1) {
    return parts.slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  }
  return ''
}

/**
 * NEW: Extract full name from email (fast, no API calls)
 */
function extractFullName(email: string): string {
  if (!email) return ''
  const emailName = email.split('@')[0]
  return emailName
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Sync members to Supabase database in batches
 */
async function syncMembersToDatabase(
  audienceId: string,
  members: any[],
  onProgress: (progress: { current: number; total: number; percentage: number }) => void
): Promise<{ success: boolean; processedCount: number; error?: string }> {
  
  console.log(`🔧 syncMembersToDatabase called with audienceId: ${audienceId}`)
  const supabase = createClient()
  let processedCount = 0
  const startTime = Date.now()
  
  try {
    console.log(`📊 Starting database sync for ${members.length} members`)
    
    // Filter members with emails
    const membersWithEmails = members.filter(member => member.email)
    console.log(`Found ${membersWithEmails.length} members with emails`)
    
    if (membersWithEmails.length === 0) {
      return { success: true, processedCount: 0 }
    }
    
    // Process in batches
    for (let i = 0; i < membersWithEmails.length; i += PROCESSING_CONFIG.DB_BATCH_SIZE) {
      const batch = membersWithEmails.slice(i, i + PROCESSING_CONFIG.DB_BATCH_SIZE)
      
      // Process batch
      for (const member of batch) {
        try {
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
            first_name: member.first_name || null,
            last_name: member.last_name || null,
            full_name: member.full_name || null,
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
          // Continue with next member
        }
      }
      
      // Update progress
      const progress = {
        current: processedCount,
        total: membersWithEmails.length,
        percentage: Math.round((processedCount / membersWithEmails.length) * 100)
      }
      onProgress(progress)
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    // Update audience member count
    await supabase
      .from('email_audiences')
      .update({
        member_count: processedCount,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', audienceId)
    
    console.log(`✅ Database sync completed: ${processedCount} members`)
    return { success: true, processedCount }
    
  } catch (error) {
    console.error('Error in database sync:', error)
    return { 
      success: false, 
      processedCount, 
      error: error instanceof Error ? error.message : 'Database sync failed' 
    }
  }
}

/**
 * Sync members to Resend in batches with rate limiting
 */
async function syncMembersToResend(
  apiKey: string,
  audienceId: string,
  members: any[],
  onProgress: (progress: { current: number; total: number; percentage: number; estimatedTimeRemaining?: string }) => void
): Promise<{ success: boolean; processedCount: number; error?: string }> {
  
  console.log(`🔧 syncMembersToResend called with Resend audienceId: ${audienceId}`)
  const resend = new Resend(apiKey)
  let processedCount = 0
  const startTime = Date.now()
  
  try {
    console.log(`📧 Starting Resend sync for ${members.length} members`)
    
    // Filter members with emails
    const membersWithEmails = members.filter(member => member.email)
    console.log(`Found ${membersWithEmails.length} members with emails for Resend`)
    
    if (membersWithEmails.length === 0) {
      return { success: true, processedCount: 0 }
    }
    
    // Process in batches respecting rate limits
    for (let i = 0; i < membersWithEmails.length; i += PROCESSING_CONFIG.RESEND_BATCH_SIZE) {
      const batch = membersWithEmails.slice(i, i + PROCESSING_CONFIG.RESEND_BATCH_SIZE)
      
      // Process batch
      for (const member of batch) {
        try {
          const result = await resend.contacts.create({
            email: member.email,
            firstName: member.first_name || '',
            lastName: member.last_name || '',
            audienceId: audienceId
          })
          
          if (result.error) {
            console.warn(`Failed to create contact ${member.email}: ${result.error.message}`)
            // Continue with next member
          } else {
            processedCount++
            console.log(`✅ Created contact ${processedCount}/${membersWithEmails.length}: ${member.email}`)
          }
        } catch (error) {
          console.error(`Error creating contact ${member.email}:`, error)
          // Continue with next member
        }
      }
      
      // Update progress
      const progress = {
        current: processedCount,
        total: membersWithEmails.length,
        percentage: Math.round((processedCount / membersWithEmails.length) * 100)
      }
      
      // Calculate estimated time remaining
      if (processedCount > 0) {
        const elapsed = Date.now() - startTime
        const rate = processedCount / (elapsed / 1000) // members per second
        const remaining = (membersWithEmails.length - processedCount) / rate
        progress.estimatedTimeRemaining = formatTimeRemaining(remaining)
      }
      
      onProgress(progress)
      
      // Rate limiting delay between batches
      if (i + PROCESSING_CONFIG.RESEND_BATCH_SIZE < membersWithEmails.length) {
        await new Promise(resolve => setTimeout(resolve, PROCESSING_CONFIG.RESEND_BATCH_DELAY))
      }
    }
    
    console.log(`✅ Resend sync completed: ${processedCount} members`)
    return { success: true, processedCount }
    
  } catch (error) {
    console.error('Error in Resend sync:', error)
    return { 
      success: false, 
      processedCount, 
      error: error instanceof Error ? error.message : 'Resend sync failed' 
    }
  }
}

/**
 * Update audience status in database
 */
async function updateAudienceStatus(audienceId: string, status: string, memberCount: number): Promise<void> {
  try {
    console.log(`🔧 Updating audience ${audienceId} status to ${status} with ${memberCount} members`)
    const supabase = createClient()
    
    // Update the main audience fields
    const { error } = await supabase
      .from('email_audiences')
      .update({
        is_active: status === 'active',
        member_count: memberCount,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Update platform_audience_data to mark processing as complete
        platform_audience_data: {
          source: 'real_time_creation',
          created_at: new Date().toISOString(),
          processing: false, // Mark as not processing anymore
          export_ready: true, // Mark as ready for export
          total_members_expected: memberCount,
          resend_synced: true,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', audienceId)
    
    if (error) {
      console.error(`❌ Error updating audience status:`, error)
      throw error
    }
    
    console.log(`✅ Updated audience ${audienceId} status to ${status} with ${memberCount} members and marked as ready`)
  } catch (error) {
    console.error('❌ Error updating audience status:', error)
    throw error
  }
}

/**
 * Format time remaining in human-readable format
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`
  } else {
    return `${Math.round(seconds / 3600)}h`
  }
}

/**
 * Get processing job status
 */
export function getProcessingJobStatus(jobId: string): ListProcessingJob | null {
  return processingJobs.get(jobId) || null
}

/**
 * Get all processing jobs for a user
 */
export function getUserProcessingJobs(whopUserId: string): ListProcessingJob[] {
  return Array.from(processingJobs.values())
    .filter(job => job.whopUserId === whopUserId)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
}

/**
 * Clean up completed jobs (older than 1 hour)
 */
export function cleanupCompletedJobs(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  for (const [jobId, job] of processingJobs.entries()) {
    if (job.status === 'completed' && job.updatedAt < oneHourAgo) {
      processingJobs.delete(jobId)
    }
  }
}
