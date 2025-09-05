'use server'

import { createClient } from '@supabase/supabase-js'
import { WhopSDKClient } from '@/lib/whop-sdk'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Enhanced configuration for production
const BROADCAST_CONFIG = {
  BATCH_SIZE: 200, // Increased batch size
  BATCH_DELAY: 1000, // 1 second between batches
  MAX_CONCURRENT_BATCHES: 5, // More concurrent batches
  MAX_MESSAGES_PER_MINUTE: 1000, // Whop API limit
  MAX_MESSAGES_PER_DAY: 50000, // Daily limit per user
  IMMEDIATE_THRESHOLD: 50, // Messages for immediate processing
  TIMEOUT_BUFFER: 8000 // 8 seconds buffer for Vercel
}

interface BroadcastJob {
  id: string
  user_id: string
  message: string
  total_members: number
  processed_count: number
  success_count: number
  error_count: number
  errors: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  agent_user_id?: string
  api_key_hash?: string
}

interface BroadcastMessage {
  id: number
  job_id: string
  user_id: string
  target_user_id: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  error_message?: string
  sent_at?: string
  created_at: string
}

interface UserRateLimit {
  user_id: string
  last_batch_time: string
  batch_count: number
  messages_sent_today: number
  last_reset_date: string
  created_at: string
  updated_at: string
}

/**
 * Create a new broadcast job in the database
 */
export async function createBroadcastJob({
  userId,
  message,
  totalMembers,
  agentUserId,
  apiKey
}: {
  userId: string
  message: string
  totalMembers: number
  agentUserId: string
  apiKey: string
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const jobId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    const { error } = await supabase
      .from('broadcast_jobs')
      .insert({
        id: jobId,
        user_id: userId,
        message,
        total_members: totalMembers,
        agent_user_id: agentUserId,
        api_key_hash: apiKeyHash,
        status: 'pending'
      })

    if (error) {
      console.error('Error creating broadcast job:', error)
      return { success: false, error: error.message }
    }

    console.log(`📝 Created broadcast job ${jobId} for user ${userId} with ${totalMembers} members`)
    return { success: true, jobId }
  } catch (error) {
    console.error('Error creating broadcast job:', error)
    return { success: false, error: 'Failed to create broadcast job' }
  }
}

/**
 * Get broadcast job status from database
 */
export async function getBroadcastJobStatus(jobId: string): Promise<{
  success: boolean
  job?: BroadcastJob
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('broadcast_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('Error fetching broadcast job:', error)
      return { success: false, error: error.message }
    }

    return { success: true, job: data as BroadcastJob }
  } catch (error) {
    console.error('Error fetching broadcast job:', error)
    return { success: false, error: 'Failed to fetch broadcast job' }
  }
}

/**
 * Get all broadcast jobs for a user
 */
export async function getUserBroadcastJobs(userId: string): Promise<{
  success: boolean
  jobs?: BroadcastJob[]
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('broadcast_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching user broadcast jobs:', error)
      return { success: false, error: error.message }
    }

    return { success: true, jobs: data as BroadcastJob[] }
  } catch (error) {
    console.error('Error fetching user broadcast jobs:', error)
    return { success: false, error: 'Failed to fetch broadcast jobs' }
  }
}

/**
 * Update broadcast job status
 */
export async function updateBroadcastJob(jobId: string, updates: Partial<BroadcastJob>): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from('broadcast_jobs')
      .update(updates)
      .eq('id', jobId)

    if (error) {
      console.error('Error updating broadcast job:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating broadcast job:', error)
    return { success: false, error: 'Failed to update broadcast job' }
  }
}

/**
 * Check and update user rate limits
 */
export async function checkUserRateLimit(userId: string): Promise<{
  success: boolean
  canSend: boolean
  error?: string
  rateLimit?: UserRateLimit
}> {
  try {
    // Get current rate limit
    const { data: rateLimit, error } = await supabase
      .from('user_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching rate limit:', error)
      return { success: false, error: error.message, canSend: false }
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // If no rate limit record exists, create one
    if (!rateLimit) {
      const { error: insertError } = await supabase
        .from('user_rate_limits')
        .insert({
          user_id: userId,
          last_reset_date: today,
          messages_sent_today: 0
        })

      if (insertError) {
        console.error('Error creating rate limit record:', insertError)
        return { success: false, error: insertError.message, canSend: false }
      }

      return { success: true, canSend: true }
    }

    // Reset daily count if it's a new day
    if (rateLimit.last_reset_date !== today) {
      const { error: updateError } = await supabase
        .from('user_rate_limits')
        .update({
          messages_sent_today: 0,
          last_reset_date: today
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error resetting daily count:', updateError)
        return { success: false, error: updateError.message, canSend: false }
      }

      rateLimit.messages_sent_today = 0
      rateLimit.last_reset_date = today
    }

    // Check daily limit
    if (rateLimit.messages_sent_today >= BROADCAST_CONFIG.MAX_MESSAGES_PER_DAY) {
      return { 
        success: true, 
        canSend: false, 
        rateLimit: rateLimit as UserRateLimit,
        error: 'Daily message limit reached'
      }
    }

    // Check rate limiting (messages per minute)
    const lastBatchTime = new Date(rateLimit.last_batch_time)
    const timeSinceLastBatch = now.getTime() - lastBatchTime.getTime()
    
    if (timeSinceLastBatch < 60000 && rateLimit.batch_count * BROADCAST_CONFIG.BATCH_SIZE > BROADCAST_CONFIG.MAX_MESSAGES_PER_MINUTE) {
      return { 
        success: true, 
        canSend: false, 
        rateLimit: rateLimit as UserRateLimit,
        error: 'Rate limit exceeded, please wait'
      }
    }

    return { success: true, canSend: true, rateLimit: rateLimit as UserRateLimit }
  } catch (error) {
    console.error('Error checking rate limit:', error)
    return { success: false, error: 'Failed to check rate limit', canSend: false }
  }
}

/**
 * Update user rate limit after sending messages
 */
export async function updateUserRateLimit(userId: string, messagesSent: number): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { error } = await supabase
      .from('user_rate_limits')
      .update({
        last_batch_time: new Date().toISOString(),
        batch_count: 1, // Reset batch count
        messages_sent_today: supabase.rpc('increment', { 
          column: 'messages_sent_today', 
          amount: messagesSent 
        })
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating rate limit:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating rate limit:', error)
    return { success: false, error: 'Failed to update rate limit' }
  }
}

/**
 * Record a broadcast message in the database
 */
export async function recordBroadcastMessage({
  jobId,
  userId,
  targetUserId,
  message,
  status,
  errorMessage
}: {
  jobId: string
  userId: string
  targetUserId: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  errorMessage?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('broadcast_job_messages')
      .insert({
        job_id: jobId,
        user_id: userId,
        target_user_id: targetUserId,
        message,
        status,
        error_message: errorMessage,
        sent_at: status === 'sent' ? new Date().toISOString() : null
      })

    if (error) {
      console.error('Error recording broadcast message:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error recording broadcast message:', error)
    return { success: false, error: 'Failed to record broadcast message' }
  }
}

/**
 * Resume an interrupted broadcast job
 */
export async function resumeBroadcastJob(jobId: string): Promise<{
  success: boolean
  error?: string
  resumed?: boolean
}> {
  try {
    console.log(`🔄 Attempting to resume broadcast job: ${jobId}`)
    
    // Get the job details
    const jobResult = await getBroadcastJobStatus(jobId)
    if (!jobResult.success || !jobResult.job) {
      return { success: false, error: 'Job not found' }
    }
    
    const job = jobResult.job
    
    // Check if job is in a resumable state
    if (job.status === 'completed') {
      return { success: true, resumed: false, error: 'Job already completed' }
    }
    
    if (job.status === 'failed') {
      return { success: true, resumed: false, error: 'Job failed and cannot be resumed' }
    }
    
    // Get the user's API key from the job
    const { data: profile } = await supabase
      .from('profiles')
      .select('whop_api_key')
      .eq('whop_user_id', job.user_id)
      .single()
    
    if (!profile?.whop_api_key) {
      return { success: false, error: 'User API key not found' }
    }
    
    // Get the agent configuration
    const { getUserAgentConfig } = await import('@/app/actions/whop-agent')
    const agentConfigResult = await getUserAgentConfig(job.agent_user_id || '')
    
    if (!agentConfigResult.success || !agentConfigResult.config) {
      return { success: false, error: 'Agent configuration not found' }
    }
    
    // Get the app API key
    const appApiKey = process.env.WHOP_API_KEY
    if (!appApiKey) {
      return { success: false, error: 'App API key not configured' }
    }
    
    // Get the original members list
    const userWhopSdk = new WhopSDKClient(profile.whop_api_key)
    const membersResult = await userWhopSdk.getAllMembers()
    
    if (!membersResult.success || !membersResult.members) {
      return { success: false, error: 'Failed to fetch members for resume' }
    }
    
    // Deduplicate members
    const uniqueMembers = membersResult.members.filter((member, index, self) => 
      index === self.findIndex(m => m.user?.id === member.user?.id)
    )
    
    console.log(`🔄 Resuming job ${jobId} with ${uniqueMembers.length} members`)
    
    // Update job status to processing
    await updateBroadcastJob(jobId, {
      status: 'processing',
      started_at: new Date().toISOString()
    })
    
    // Import and start the background processor
    const { processEnhancedBroadcastJob } = await import('./broadcast-processor')
    
    // Start the background processing (this will automatically skip already sent messages)
    processEnhancedBroadcastJob(
      jobId,
      uniqueMembers,
      appApiKey,
      agentConfigResult.config.agent_user_id,
      job.user_id,
      job.message
    )
    
    return { success: true, resumed: true }
  } catch (error) {
    console.error('Error resuming broadcast job:', error)
    return { success: false, error: 'Failed to resume broadcast job' }
  }
}

/**
 * Get broadcast job statistics with duplicate prevention info
 */
export async function getBroadcastJobStatsWithDuplicates(jobId: string): Promise<{
  success: boolean
  stats?: {
    total: number
    sent: number
    failed: number
    pending: number
    successRate: number
    duplicates: number
    remaining: number
  }
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('broadcast_job_messages')
      .select('status')
      .eq('job_id', jobId)

    if (error) {
      console.error('Error fetching broadcast stats:', error)
      return { success: false, error: error.message }
    }

    const total = data.length
    const sent = data.filter(m => m.status === 'sent').length
    const failed = data.filter(m => m.status === 'failed').length
    const pending = data.filter(m => m.status === 'pending').length
    const successRate = total > 0 ? (sent / total) * 100 : 0
    
    // Get the job details to calculate remaining
    const jobResult = await getBroadcastJobStatus(jobId)
    const totalMembers = jobResult.success ? jobResult.job?.total_members || 0 : 0
    const remaining = Math.max(0, totalMembers - sent - failed)
    const duplicates = Math.max(0, total - totalMembers)

    return {
      success: true,
      stats: {
        total,
        sent,
        failed,
        pending,
        successRate,
        duplicates,
        remaining
      }
    }
  } catch (error) {
    console.error('Error fetching broadcast stats:', error)
    return { success: false, error: 'Failed to fetch broadcast stats' }
  }
} 