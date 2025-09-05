'use server'

import { WhopSDKClient } from '@/lib/whop-sdk'
import { 
  createBroadcastJob, 
  updateBroadcastJob, 
  recordBroadcastMessage,
  checkUserRateLimit,
  updateUserRateLimit,
  getBroadcastJobStats
} from './broadcast-service'
import { trackSentEmail } from './email-tracking'

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

interface BroadcastMember {
  id: string
  user: {
    id: string
    email?: string
    username?: string
    name?: string
  }
  name?: string
  username?: string
  email?: string
}

/**
 * Enhanced broadcast message sender with database persistence
 */
export async function sendEnhancedBroadcastMessage({
  message,
  apiKey,
  agentUserId,
  userId,
  targetUserIds
}: {
  message: string
  apiKey: string
  agentUserId: string
  userId: string
  targetUserIds?: string[]
}): Promise<{ success: boolean; jobId?: string; sentCount?: number; errors?: string[] }> {
  const startTime = Date.now()
  
  try {
    console.log(`🚀 ENHANCED BROADCAST STARTED for user ${userId}`)
    
    // Check rate limits first
    const rateLimitCheck = await checkUserRateLimit(userId)
    if (!rateLimitCheck.success) {
      return { success: false, errors: [rateLimitCheck.error || 'Rate limit check failed'] }
    }
    
    if (!rateLimitCheck.canSend) {
      return { success: false, errors: [rateLimitCheck.error || 'Rate limit exceeded'] }
    }
    
    // Use the user's API key for getting members
    const userWhopSdk = new WhopSDKClient(apiKey)
    
    // Check if user has agent configuration
    const { getUserAgentConfig } = await import('@/app/actions/whop-agent')
    const agentConfigResult = await getUserAgentConfig(agentUserId)
    
    if (!agentConfigResult.success || !agentConfigResult.config) {
      return {
        success: false,
        errors: ['No agent configuration found. Please set up an agent first.']
      }
    }
    
    const agentConfig = agentConfigResult.config
    console.log(`✅ Using agent configuration: ${agentConfig.agent_name} (${agentConfig.agent_user_id})`)
    
    // Use the app's API key with agent configuration for sending messages
    const appApiKey = process.env.WHOP_API_KEY
    if (!appApiKey) {
      return {
        success: false,
        errors: ['App API key not configured. Messaging requires app-level permissions.']
      }
    }
    
    let members: BroadcastMember[] = []
    
    if (targetUserIds && targetUserIds.length > 0) {
      // Deduplicate user IDs to avoid sending multiple messages to the same user
      const uniqueUserIds = [...new Set(targetUserIds)]
      console.log(`📊 Sending broadcast to ${uniqueUserIds.length} unique users (${targetUserIds.length} total, ${targetUserIds.length - uniqueUserIds.length} duplicates removed)`)
      
      // Fetch user details in batches to avoid timeouts
      console.log(`🔍 Fetching user details for ${uniqueUserIds.length} users in batches...`)
      
      const BATCH_SIZE = 20 // Process 20 users at a time
      const batches = []
      for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
        batches.push(uniqueUserIds.slice(i, i + BATCH_SIZE))
      }
      
      const allMembers = []
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        // Check timeout before processing each batch
        if (Date.now() - startTime > BROADCAST_CONFIG.TIMEOUT_BUFFER) {
          throw new Error('Approaching Vercel timeout limit - switching to background job')
        }
        
        const batch = batches[batchIndex]
        console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} users`)
        
        const batchPromises = batch.map(async (userId) => {
          try {
            const userResult = await userWhopSdk.getUserDetails(userId)
            if (userResult.success && userResult.user) {
              return {
                user: { 
                  id: userId,
                  name: userResult.user.name,
                  username: userResult.user.username,
                  email: userResult.user.email
                },
                name: userResult.user.name,
                username: userResult.user.username,
                email: userResult.user.email,
                id: `temp_${userId}` // Temporary ID for processing
              }
            } else {
              console.warn(`Failed to fetch details for user ${userId}:`, userResult.error)
              return {
                user: { id: userId },
                id: `temp_${userId}` // Temporary ID for processing
              }
            }
          } catch (error) {
            console.error(`Error fetching details for user ${userId}:`, error)
            return {
              user: { id: userId },
              id: `temp_${userId}` // Temporary ID for processing
            }
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        allMembers.push(...batchResults)
        
        // Add a small delay between batches to avoid overwhelming the API
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      members = allMembers
    } else {
      // Send to all members
      const membersResult = await userWhopSdk.getAllMembers()
      
      if (!membersResult.success || !membersResult.members) {
        return {
          success: false,
          errors: [membersResult.error || 'Failed to fetch members']
        }
      }
      
      members = membersResult.members
      
      // Deduplicate members by user ID to avoid sending multiple messages to the same user
      const uniqueMembers = members.filter((member, index, self) => 
        index === self.findIndex(m => m.user?.id === member.user?.id)
      )
      
      if (uniqueMembers.length !== members.length) {
        console.log(`🔄 Deduplicated members: ${uniqueMembers.length} unique out of ${members.length} total (${members.length - uniqueMembers.length} duplicates removed)`)
      }
      
      members = uniqueMembers
    }

    const totalMembers = members.length
    console.log(`📊 Found ${totalMembers} members to message`)
    
    // Check if we're approaching timeout before deciding on processing method
    if (Date.now() - startTime > BROADCAST_CONFIG.TIMEOUT_BUFFER) {
      throw new Error('Approaching Vercel timeout limit - switching to background job')
    }
    
    // For small lists (less than 50 members), send immediately
    // For larger lists, use background jobs to avoid Vercel timeouts
    if (totalMembers < BROADCAST_CONFIG.IMMEDIATE_THRESHOLD) {
      return await sendBroadcastImmediate(members, message, appApiKey, agentConfig.agent_user_id, userId)
    }
    
    // For large lists, create a background job
    const jobResult = await createBroadcastJob({
      userId,
      message,
      totalMembers,
      agentUserId: agentConfig.agent_user_id,
      apiKey
    })
    
    if (!jobResult.success) {
      return { success: false, errors: [jobResult.error || 'Failed to create broadcast job'] }
    }
    
    const jobId = jobResult.jobId!
    
    // Start background processing
    processEnhancedBroadcastJob(jobId, members, appApiKey, agentConfig.agent_user_id, userId, message)
    
    return {
      success: true,
      jobId,
      sentCount: 0 // Will be updated as job progresses
    }
  } catch (error) {
    console.error('Error in enhanced broadcast message:', error)
    
    // If we hit the timeout, create a background job instead
    if (error instanceof Error && error.message.includes('timeout')) {
      console.log('⏰ Timeout detected - creating background job instead')
      
      const jobResult = await createBroadcastJob({
        userId,
        message,
        totalMembers: members?.length || 0,
        agentUserId: agentConfig?.agent_user_id || agentUserId,
        apiKey
      })
      
      if (jobResult.success) {
        // Start the background job
        processEnhancedBroadcastJob(jobResult.jobId!, members || [], appApiKey, agentConfig?.agent_user_id || agentUserId, userId, message)
        
        return {
          success: true,
          jobId: jobResult.jobId,
          sentCount: 0
        }
      }
    }
    
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    }
  }
}

/**
 * Enhanced immediate broadcast for small member lists
 */
async function sendBroadcastImmediate(
  members: BroadcastMember[],
  message: string,
  appApiKey: string,
  agentUserId: string,
  userId: string
): Promise<{ success: boolean; sentCount?: number; errors?: string[] }> {
  console.log(`🚀 IMMEDIATE BROADCAST STARTED`)
  console.log(`📊 Total members to process: ${members.length}`)
  console.log(`📊 Members with valid user IDs: ${members.filter(m => m.user?.id).length}`)
  console.log(`📊 Members without user IDs: ${members.filter(m => !m.user?.id).length}`)
  
  const { WhopServerSdk } = await import('@whop/api')
  const appWhopSdk = new WhopServerSdk({
    appApiKey: appApiKey,
    appId: process.env.WHOP_APP_ID || '',
    onBehalfOfUserId: agentUserId
  })
  
  const errors: string[] = []
  let sentCount = 0
  
  // Send message to each member using app's API key
  for (const member of members) {
    try {
      if (member.user) {
        try {
          // Replace placeholders with member data
          let personalizedMessage = message
          let personalizationUsed = 'none'
          
          if (member.name && member.name !== 'No name') {
            // Use the actual name from the API
            personalizedMessage = message.replace(/\{\{name\}\}/g, member.name)
            personalizationUsed = `name: ${member.name}`
          } else if (member.discord?.username) {
            // Fallback to Discord username
            personalizedMessage = message.replace(/\{\{name\}\}/g, member.discord.username)
            personalizationUsed = `discord: ${member.discord.username}`
          } else if (member.email && member.email !== 'Loading...' && member.email !== 'No email') {
            // Fallback to email prefix
            const emailPrefix = member.email.split('@')[0]
            personalizedMessage = message.replace(/\{\{name\}\}/g, emailPrefix)
            personalizationUsed = `email: ${emailPrefix}`
          } else {
            // Final fallback
            personalizedMessage = message.replace(/\{\{name\}\}/g, 'there')
            personalizationUsed = 'fallback: there'
          }
          
          await appWhopSdk.messages.sendDirectMessageToUser({
            toUserIdOrUsername: member.user.id,
            message: personalizedMessage
          })
          
          sentCount++
          console.log(`✅ SUCCESS: ${member.user.id} (${personalizationUsed})`)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Failed to send to ${member.user.id}: ${errorMsg}`)
          console.log(`❌ FAILED: ${member.user.id} - ${errorMsg}`)
        }
      } else {
        errors.push(`No user ID found for member ${member.id}`)
        console.log(`❌ NO_USER_ID: member ${member.id} (email: ${member.email || 'none'})`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Error sending to member ${member.id}: ${errorMsg}`)
      console.error(`UNEXPECTED_ERROR: member ${member.id} - ${errorMsg}`)
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Update rate limits
  await updateUserRateLimit(userId, sentCount)
  
  console.log(`🎉 IMMEDIATE BROADCAST COMPLETED`)
  console.log(`📊 FINAL SUMMARY:`)
  console.log(`   ✅ Successfully sent: ${sentCount} messages`)
  console.log(`   ❌ Failed to send: ${errors.length} messages`)
  console.log(`   📈 Success rate: ${((sentCount / members.length) * 100).toFixed(1)}%`)
  
  if (errors.length > 0) {
    console.log(`❌ ERROR SUMMARY:`)
    errors.slice(0, 10).forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`)
    })
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more errors`)
    }
  }
  
  return {
    success: sentCount > 0,
    sentCount,
    errors: errors.length > 0 ? errors : undefined
  }
}

/**
 * Enhanced background broadcast processor with database persistence
 */
async function processEnhancedBroadcastJob(
  jobId: string,
  members: BroadcastMember[],
  appApiKey: string,
  agentUserId: string,
  userId: string,
  originalMessage: string
) {
  console.log(`🚀 ENHANCED BACKGROUND JOB STARTED: ${jobId}`)
  console.log(`📊 Total members to process: ${members.length}`)
  console.log(`📊 Members with valid user IDs: ${members.filter(m => m.user?.id).length}`)
  console.log(`📊 Members without user IDs: ${members.filter(m => !m.user?.id).length}`)
  
  // Update job status to processing
  await updateBroadcastJob(jobId, {
    status: 'processing',
    started_at: new Date().toISOString()
  })
  
  const { WhopServerSdk } = await import('@whop/api')
  const appWhopSdk = new WhopServerSdk({
    appApiKey: appApiKey,
    appId: process.env.WHOP_APP_ID || '',
    onBehalfOfUserId: agentUserId
  })
  
  // Check for existing sent messages to prevent duplicates
  console.log(`🔍 Checking for existing sent messages to prevent duplicates...`)
  const { data: existingMessages } = await supabase
    .from('broadcast_job_messages')
    .select('target_user_id, status')
    .eq('job_id', jobId)
    .in('status', ['sent', 'pending'])
  
  const alreadySentUserIds = new Set(
    existingMessages
      ?.filter(msg => msg.status === 'sent')
      .map(msg => msg.target_user_id) || []
  )
  
  const alreadyPendingUserIds = new Set(
    existingMessages
      ?.filter(msg => msg.status === 'pending')
      .map(msg => msg.target_user_id) || []
  )
  
  console.log(`📊 Already sent to: ${alreadySentUserIds.size} users`)
  console.log(`📊 Already pending: ${alreadyPendingUserIds.size} users`)
  
  // Filter out users we've already sent to
  const remainingMembers = members.filter(member => 
    member.user && 
    !alreadySentUserIds.has(member.user.id) &&
    !alreadyPendingUserIds.has(member.user.id)
  )
  
  console.log(`📊 Remaining members to process: ${remainingMembers.length}`)
  
  if (remainingMembers.length === 0) {
    console.log(`✅ All members already processed for job ${jobId}`)
    await updateBroadcastJob(jobId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    return
  }
  
  // Create batches
  const batches = []
  for (let i = 0; i < remainingMembers.length; i += BROADCAST_CONFIG.BATCH_SIZE) {
    batches.push(remainingMembers.slice(i, i + BROADCAST_CONFIG.BATCH_SIZE))
  }
  
  console.log(`📦 Created ${batches.length} batches of ${BROADCAST_CONFIG.BATCH_SIZE} members each`)
  console.log(`⚙️ Processing with ${BROADCAST_CONFIG.MAX_CONCURRENT_BATCHES} concurrent batches`)
  
  let totalSuccessCount = 0
  let totalErrorCount = 0
  
  // Process batches with concurrency control
  const processBatch = async (batch: BroadcastMember[], batchIndex: number) => {
    console.log(`📦 Starting batch ${batchIndex + 1}/${batches.length} with ${batch.length} members`)
    
    let batchSuccessCount = 0
    let batchErrorCount = 0
    
    for (const member of batch) {
      try {
        if (member.user) {
          // Check if we've already sent to this user in this session
          if (alreadySentUserIds.has(member.user.id)) {
            console.log(`⏭️ Skipping ${member.user.id} - already sent`)
            continue
          }
          
          try {
            console.log(`📤 Sending to user: ${member.user.id} (${member.email || 'no email'})`)
            
            // Replace placeholders with member data
            let personalizedMessage = originalMessage
            let personalizationUsed = 'none'
            
            if (member.name && member.name !== 'No name') {
              // Use the actual name from the API
              personalizedMessage = originalMessage.replace(/\{\{name\}\}/g, member.name)
              personalizationUsed = `name: ${member.name}`
            } else if (member.discord?.username) {
              // Fallback to Discord username
              personalizedMessage = originalMessage.replace(/\{\{name\}\}/g, member.discord.username)
              personalizationUsed = `discord: ${member.discord.username}`
            } else if (member.email && member.email !== 'Loading...' && member.email !== 'No email') {
              // Fallback to email prefix
              const emailPrefix = member.email.split('@')[0]
              personalizedMessage = originalMessage.replace(/\{\{name\}\}/g, emailPrefix)
              personalizationUsed = `email: ${emailPrefix}`
            } else {
              // Final fallback
              personalizedMessage = originalMessage.replace(/\{\{name\}\}/g, 'there')
              personalizationUsed = 'fallback: there'
            }
            
            await appWhopSdk.messages.sendDirectMessageToUser({
              toUserIdOrUsername: member.user.id,
              message: personalizedMessage
            })
            
            // Record successful message
            await recordBroadcastMessage({
              jobId,
              userId,
              targetUserId: member.user.id,
              message: personalizedMessage,
              status: 'sent'
            })
            
            // Add to already sent set to prevent duplicates in this session
            alreadySentUserIds.add(member.user.id)
            
            totalSuccessCount++
            batchSuccessCount++
            console.log(`✅ [Job ${jobId}] SUCCESS: ${member.user.id} (${personalizationUsed})`)
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            
            // Record failed message
            await recordBroadcastMessage({
              jobId,
              userId,
              targetUserId: member.user.id,
              message: originalMessage,
              status: 'failed',
              errorMessage: errorMsg
            })
            
            totalErrorCount++
            batchErrorCount++
            console.log(`❌ [Job ${jobId}] FAILED: ${member.user.id} - ${errorMsg}`)
          }
        } else {
          // Record failed message
          await recordBroadcastMessage({
            jobId,
            userId,
            targetUserId: member.id,
            message: originalMessage,
            status: 'failed',
            errorMessage: 'No user ID found'
          })
          
          totalErrorCount++
          batchErrorCount++
          console.log(`❌ [Job ${jobId}] NO_USER_ID: member ${member.id} (email: ${member.email || 'none'})`)
        }
        
        // Update job progress
        await updateBroadcastJob(jobId, {
          processed_count: totalSuccessCount + totalErrorCount,
          success_count: totalSuccessCount,
          error_count: totalErrorCount
        })
        
        // Small delay between individual messages
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        totalErrorCount++
        batchErrorCount++
        console.error(`[Job ${jobId}] UNEXPECTED_ERROR: member ${member.id} - ${errorMsg}`)
      }
    }
    
    console.log(`📦 [Job ${jobId}] Batch ${batchIndex + 1} completed: ${batchSuccessCount} success, ${batchErrorCount} errors`)
  }
  
  // Process batches with concurrency control
  for (let i = 0; i < batches.length; i += BROADCAST_CONFIG.MAX_CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + BROADCAST_CONFIG.MAX_CONCURRENT_BATCHES)
    const batchPromises = currentBatches.map((batch, index) => 
      processBatch(batch, i + index)
    )
    
    await Promise.all(batchPromises)
    
    // Delay between batch groups
    if (i + BROADCAST_CONFIG.MAX_CONCURRENT_BATCHES < batches.length) {
      console.log(`[Job ${jobId}] Waiting ${BROADCAST_CONFIG.BATCH_DELAY}ms before next batch group`)
      await new Promise(resolve => setTimeout(resolve, BROADCAST_CONFIG.BATCH_DELAY))
    }
  }
  
  // Update rate limits
  await updateUserRateLimit(userId, totalSuccessCount)
  
  // Mark job as completed
  await updateBroadcastJob(jobId, {
    status: 'completed',
    completed_at: new Date().toISOString()
  })
  
  console.log(`🎉 [Job ${jobId}] ENHANCED BROADCAST COMPLETED`)
  console.log(`📊 [Job ${jobId}] FINAL SUMMARY:`)
  console.log(`   ✅ Successfully sent: ${totalSuccessCount} messages`)
  console.log(`   ❌ Failed to send: ${totalErrorCount} messages`)
  console.log(`   📈 Success rate: ${((totalSuccessCount / remainingMembers.length) * 100).toFixed(1)}%`)
  console.log(`   ⏱️ Total processing time: ${Math.round((Date.now() - new Date().getTime()) / 1000)}s`)
} 