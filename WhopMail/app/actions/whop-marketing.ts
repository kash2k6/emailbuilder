'use server'

import { WhopSDKClient } from '@/lib/whop-sdk'
import { sendEnhancedBroadcastMessage } from './broadcast-processor'

// Batch configuration for large member lists
const BATCH_SIZE = 100 // Send 100 messages per batch
const BATCH_DELAY = 2000 // 2 seconds between batches to avoid rate limiting
const MAX_CONCURRENT_BATCHES = 3 // Maximum concurrent batches

interface BroadcastJob {
  id: string
  message: string
  apiKey: string
  agentUserId: string
  totalMembers: number
  processedCount: number
  successCount: number
  errorCount: number
  errors: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  updatedAt: Date
}

// In-memory job store (in production, use Redis or database)
const broadcastJobs = new Map<string, BroadcastJob>()

/**
 * Send a broadcast message to all members with batching for large lists
 */
export async function sendBroadcastMessage({
  message,
  apiKey,
  agentUserId,
  targetUserIds
}: {
  message: string
  apiKey: string
  agentUserId: string
  targetUserIds?: string[]
}): Promise<{ success: boolean; jobId?: string; sentCount?: number; errors?: string[] }> {
  const startTime = Date.now()
  const MAX_EXECUTION_TIME = 8000 // 8 seconds to leave buffer for Vercel's 10s limit
  
  try {
    console.log(`Starting broadcast message to all members`)
    
    // Check if we're approaching the timeout limit
    const checkTimeout = () => {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        throw new Error('Approaching Vercel timeout limit - switching to background job')
      }
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
    console.log(`Using agent configuration: ${agentConfig.agent_name} (${agentConfig.agent_user_id})`)
    
    // Use the app's API key with agent configuration for sending messages
    const appApiKey = process.env.WHOP_API_KEY
    if (!appApiKey) {
      return {
        success: false,
        errors: ['App API key not configured. Messaging requires app-level permissions.']
      }
    }
    
    let members: any[] = []
    
    if (targetUserIds && targetUserIds.length > 0) {
      // Deduplicate user IDs to avoid sending multiple messages to the same user
      const uniqueUserIds = [...new Set(targetUserIds)]
      console.log(`Sending broadcast to ${uniqueUserIds.length} unique users (${targetUserIds.length} total, ${targetUserIds.length - uniqueUserIds.length} duplicates removed)`)
      
      // Fetch user details in batches to avoid timeouts
      console.log(`Fetching user details for ${uniqueUserIds.length} users in batches...`)
      
      const BATCH_SIZE = 20 // Process 20 users at a time
      const batches = []
      for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
        batches.push(uniqueUserIds.slice(i, i + BATCH_SIZE))
      }
      
      const allMembers = []
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        // Check timeout before processing each batch
        checkTimeout()
        
        const batch = batches[batchIndex]
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} users`)
        
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
        console.log(`Deduplicated members: ${uniqueMembers.length} unique out of ${members.length} total (${members.length - uniqueMembers.length} duplicates removed)`)
      }
      
      members = uniqueMembers
    }

    const totalMembers = members.length
    console.log(`Found ${totalMembers} members to message`)
    
    // Check if we're approaching timeout before deciding on processing method
    checkTimeout()
    
    // For small lists (less than 50 members), send immediately
    // For larger lists, use background jobs to avoid Vercel timeouts
    if (totalMembers < 50) {
      return await sendBroadcastImmediate(members, message, appApiKey, agentConfig.agent_user_id)
    }
    
    // For large lists, create a background job
    const jobId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const job: BroadcastJob = {
      id: jobId,
      message,
      apiKey,
      agentUserId: agentConfig.agent_user_id,
      totalMembers,
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    broadcastJobs.set(jobId, job)
    
    // Start background processing
    processBroadcastJob(jobId, members, appApiKey, agentConfig.agent_user_id)
    
    return {
      success: true,
      jobId,
      sentCount: 0 // Will be updated as job progresses
    }
  } catch (error) {
    console.error('Error in broadcast message:', error)
    
    // If we hit the timeout, create a background job instead
    if (error instanceof Error && error.message.includes('timeout')) {
      console.log('Timeout detected - creating background job instead')
      
      const jobId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const job: BroadcastJob = {
        id: jobId,
        message,
        apiKey,
        agentUserId: agentConfig.agent_user_id,
        totalMembers: members.length,
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      broadcastJobs.set(jobId, job)
      
      // Start the background job
      processBroadcastJob(jobId, members, appApiKey, agentConfig.agent_user_id)
      
      return {
        success: true,
        jobId,
        sentCount: 0
      }
    }
    
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    }
  }
}

/**
 * Send broadcast immediately for small member lists
 */
async function sendBroadcastImmediate(
  members: any[],
  message: string,
  appApiKey: string,
  agentUserId: string
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
          console.log(`Personalizing message for member ${member.user}:`, {
            name: member.name,
            discord: member.discord,
            email: member.email,
            hasNamePlaceholder: message.includes('{{name}}')
          })
          
          if (member.name && member.name !== 'No name') {
            // Use the actual name from the API
            personalizedMessage = message.replace(/\{\{name\}\}/g, member.name)
            console.log(`✅ Using name: ${member.name}`)
          } else if (member.discord?.username) {
            // Fallback to Discord username
            personalizedMessage = message.replace(/\{\{name\}\}/g, member.discord.username)
            console.log(`✅ Using Discord username: ${member.discord.username}`)
          } else if (member.email && member.email !== 'Loading...' && member.email !== 'No email') {
            // Fallback to email prefix
            const emailPrefix = member.email.split('@')[0]
            personalizedMessage = message.replace(/\{\{name\}\}/g, emailPrefix)
            console.log(`✅ Using email prefix: ${emailPrefix}`)
          } else {
            // Final fallback
            personalizedMessage = message.replace(/\{\{name\}\}/g, 'there')
            console.log(`✅ Using fallback: there`)
          }
          
          await appWhopSdk.messages.sendDirectMessageToUser({
            toUserIdOrUsername: member.user.id,
            message: personalizedMessage
            })
            
            sentCount++
          console.log(`✅ Message sent to ${member.user.id}`)
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Failed to send to ${member.user.id}: ${errorMsg}`)
          console.log(`❌ Failed to send to ${member.user.id}: ${errorMsg}`)
          }
        } else {
          errors.push(`No user ID found for member ${member.id}`)
          console.log(`❌ No user ID found for member ${member.id}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error sending to member ${member.id}: ${errorMsg}`)
        console.error(`Error sending to member ${member.id}:`, error)
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
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
 * Process broadcast job in background with batching
 */
async function processBroadcastJob(
  jobId: string,
  members: any[],
  appApiKey: string,
  agentUserId: string
) {
  const job = broadcastJobs.get(jobId)
  if (!job) {
    console.error(`Job ${jobId} not found`)
    return
  }
  
  job.status = 'processing'
  job.updatedAt = new Date()
  broadcastJobs.set(jobId, job)
  
  console.log(`🚀 [Job ${jobId}] BROADCAST STARTED`)
  console.log(`📊 [Job ${jobId}] Total members to process: ${members.length}`)
  console.log(`📊 [Job ${jobId}] Members with valid user IDs: ${members.filter(m => m.user?.id).length}`)
  console.log(`📊 [Job ${jobId}] Members without user IDs: ${members.filter(m => !m.user?.id).length}`)
  
  // Log first few members for debugging
  console.log(`🔍 [Job ${jobId}] Sample members:`, members.slice(0, 3).map(m => ({
    id: m.id,
    userId: m.user?.id,
    email: m.email,
    name: m.name,
    username: m.username
  })))
  
  const { WhopServerSdk } = await import('@whop/api')
  const appWhopSdk = new WhopServerSdk({
    appApiKey: appApiKey,
    appId: process.env.WHOP_APP_ID || '',
    onBehalfOfUserId: agentUserId
  })
  
  // Create batches
  const batches = []
  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    batches.push(members.slice(i, i + BATCH_SIZE))
  }
  
  console.log(`📦 [Job ${jobId}] Created ${batches.length} batches of ${BATCH_SIZE} members each`)
  console.log(`⚙️ [Job ${jobId}] Processing with ${MAX_CONCURRENT_BATCHES} concurrent batches`)
  
  // Process batches with concurrency control
  const processBatch = async (batch: any[], batchIndex: number) => {
    console.log(`📦 [Job ${jobId}] Starting batch ${batchIndex + 1}/${batches.length} with ${batch.length} members`)
    
    let batchSuccessCount = 0
    let batchErrorCount = 0
    
    for (const member of batch) {
      try {
        if (member.user) {
          try {
            console.log(`📤 [Job ${jobId}] Sending to user: ${member.user.id} (${member.email || 'no email'})`)
            
            // Replace placeholders with member data
            let personalizedMessage = job.message
            let personalizationUsed = 'none'
            
            if (member.name && member.name !== 'No name') {
              // Use the actual name from the API
              personalizedMessage = job.message.replace(/\{\{name\}\}/g, member.name)
              personalizationUsed = `name: ${member.name}`
            } else if (member.discord?.username) {
              // Fallback to Discord username
              personalizedMessage = job.message.replace(/\{\{name\}\}/g, member.discord.username)
              personalizationUsed = `discord: ${member.discord.username}`
            } else if (member.email && member.email !== 'Loading...' && member.email !== 'No email') {
              // Fallback to email prefix
              const emailPrefix = member.email.split('@')[0]
              personalizedMessage = job.message.replace(/\{\{name\}\}/g, emailPrefix)
              personalizationUsed = `email: ${emailPrefix}`
            } else {
              // Final fallback
              personalizedMessage = job.message.replace(/\{\{name\}\}/g, 'there')
              personalizationUsed = 'fallback: there'
            }
            
            await appWhopSdk.messages.sendDirectMessageToUser({
              toUserIdOrUsername: member.user.id,
              message: personalizedMessage
            })
            
            job.successCount++
            batchSuccessCount++
            console.log(`✅ [Job ${jobId}] SUCCESS: ${member.user.id} (${personalizationUsed})`)
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            job.errors.push(`Failed to send to ${member.user.id}: ${errorMsg}`)
            job.errorCount++
            batchErrorCount++
            console.log(`❌ [Job ${jobId}] FAILED: ${member.user.id} - ${errorMsg}`)
          }
        } else {
          job.errors.push(`No user ID found for member ${member.id}`)
          job.errorCount++
          batchErrorCount++
          console.log(`❌ [Job ${jobId}] NO_USER_ID: member ${member.id} (email: ${member.email || 'none'})`)
        }
        
        job.processedCount++
        job.updatedAt = new Date()
        broadcastJobs.set(jobId, job)
        
        // Small delay between individual messages
        await new Promise(resolve => setTimeout(resolve, 100))
  } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        job.errors.push(`Error sending to member ${member.id}: ${errorMsg}`)
        job.errorCount++
        batchErrorCount++
        job.processedCount++
        job.updatedAt = new Date()
        broadcastJobs.set(jobId, job)
        console.error(`[Job ${jobId}] UNEXPECTED_ERROR: member ${member.id} - ${errorMsg}`)
      }
    }
    
    console.log(`📦 [Job ${jobId}] Batch ${batchIndex + 1} completed: ${batchSuccessCount} success, ${batchErrorCount} errors`)
  }
  
  // Process batches with concurrency control
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES)
    const batchPromises = currentBatches.map((batch, index) => 
      processBatch(batch, i + index)
    )
    
    await Promise.all(batchPromises)
    
    // Delay between batch groups
    if (i + MAX_CONCURRENT_BATCHES < batches.length) {
      console.log(`[Job ${jobId}] Waiting ${BATCH_DELAY}ms before next batch group`)
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
    }
  }
  
  // Mark job as completed
  job.status = 'completed'
  job.updatedAt = new Date()
  broadcastJobs.set(jobId, job)
  
  console.log(`🎉 [Job ${jobId}] BROADCAST COMPLETED`)
  console.log(`📊 [Job ${jobId}] FINAL SUMMARY:`)
  console.log(`   ✅ Successfully sent: ${job.successCount} messages`)
  console.log(`   ❌ Failed to send: ${job.errorCount} messages`)
  console.log(`   📈 Success rate: ${((job.successCount / members.length) * 100).toFixed(1)}%`)
  console.log(`   ⏱️ Total processing time: ${Math.round((Date.now() - job.createdAt.getTime()) / 1000)}s`)
  
  if (job.errors.length > 0) {
    console.log(`❌ [Job ${jobId}] ERROR SUMMARY:`)
    job.errors.slice(0, 10).forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`)
    })
    if (job.errors.length > 10) {
      console.log(`   ... and ${job.errors.length - 10} more errors`)
    }
  }
}

/**
 * Get broadcast job status
 */
export async function getBroadcastJobStatus(jobId: string): Promise<{
  success: boolean
  job?: BroadcastJob
  error?: string
}> {
  const job = broadcastJobs.get(jobId)
  
  if (!job) {
    return {
      success: false,
      error: 'Job not found'
    }
  }
  
  return {
    success: true,
    job
  }
}

/**
 * Send messages to selected members
 */
export async function sendMessagesToSelectedMembers({
  memberIds,
  message,
  apiKey,
  agentUserId
}: {
  memberIds: string[]
  message: string
  apiKey: string
  agentUserId: string
}): Promise<{ success: boolean; sentCount?: number; errors?: string[] }> {
  try {
    console.log(`Sending messages to ${memberIds.length} selected members`)
    
    // Use the app's API key with agent configuration for sending messages
    const appApiKey = process.env.WHOP_API_KEY
    if (!appApiKey) {
      return {
        success: false,
        errors: ['App API key not configured. Messaging requires app-level permissions.']
      }
    }
    
    // Use WhopServerSdk with agent configuration
    const { WhopServerSdk } = await import('@whop/api')
    const appWhopSdk = new WhopServerSdk({
      appApiKey: appApiKey,
      appId: process.env.WHOP_APP_ID || '',
      onBehalfOfUserId: agentUserId
    })
    console.log('✅ SDK configured with Agent User ID:', agentUserId)
    const userWhopSdk = new WhopSDKClient(apiKey) // For getting member data
    const errors: string[] = []
    let sentCount = 0
    
    // Send message to each selected member
    for (const memberId of memberIds) {
      try {
        // Check if memberId is actually a user ID (starts with 'user_')
        if (memberId.startsWith('user_')) {
          // It's already a user ID, but we still need to get member data for personalization
          try {
            // Get all members to find the one with this user ID
            const membersResult = await userWhopSdk.getAllMembers()
            
            if (membersResult.success && membersResult.members) {
              const member = membersResult.members.find(m => m.user === memberId)
              
              if (member) {
                // Replace placeholders with member data
                let personalizedMessage = message
                console.log(`Personalizing message for member ${memberId}:`, {
                  name: member.name,
                  discord: member.discord,
                  email: member.email,
                  hasNamePlaceholder: message.includes('{{name}}')
                })
                
                if (member.name && member.name !== 'No name') {
                  // Use the actual name from the API
                  personalizedMessage = message.replace(/\{\{name\}\}/g, member.name)
                  console.log(`✅ Using name: ${member.name}`)
                } else if (member.discord?.username) {
                  // Fallback to Discord username
                  personalizedMessage = message.replace(/\{\{name\}\}/g, member.discord.username)
                  console.log(`✅ Using Discord username: ${member.discord.username}`)
                } else if (member.email && member.email !== 'No email') {
                  // Fallback to email prefix
                  const emailPrefix = member.email.split('@')[0]
                  personalizedMessage = message.replace(/\{\{name\}\}/g, emailPrefix)
                  console.log(`✅ Using email prefix: ${emailPrefix}`)
                } else {
                  // Final fallback
                  personalizedMessage = message.replace(/\{\{name\}\}/g, 'there')
                  console.log(`✅ Using fallback: there`)
                }
                
            const result = await appWhopSdk.messages.sendDirectMessageToUser({
              toUserIdOrUsername: memberId,
                  message: personalizedMessage
            })
            
            sentCount++
            console.log(`✅ Message sent to ${memberId}`)
              } else {
                // Member not found, use generic fallback
                let personalizedMessage = message.replace(/\{\{name\}\}/g, 'there')
                
                const result = await appWhopSdk.messages.sendDirectMessageToUser({
                  toUserIdOrUsername: memberId,
                  message: personalizedMessage
                })
                
                sentCount++
                console.log(`✅ Message sent to ${memberId} (no member data found)`)
              }
            } else {
              // Failed to get members, use generic fallback
              let personalizedMessage = message.replace(/\{\{name\}\}/g, 'there')
              
              const result = await appWhopSdk.messages.sendDirectMessageToUser({
                toUserIdOrUsername: memberId,
                message: personalizedMessage
              })
              
              sentCount++
              console.log(`✅ Message sent to ${memberId} (failed to get member data)`)
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            errors.push(`Failed to send to ${memberId}: ${errorMsg}`)
            console.log(`❌ Failed to send to ${memberId}: ${errorMsg}`)
          }
        } else {
          // It's a member ID, need to get the user ID from member data
          const membersResult = await userWhopSdk.getAllMembers()
          
          if (membersResult.success && membersResult.members) {
            const member = membersResult.members.find(m => m.id === memberId)
            
            if (member && member.user) {
              try {
                              // Replace placeholders with member data
              let personalizedMessage = message
              if (member.name && member.name !== 'No name') {
                // Use the actual name from the API
                personalizedMessage = message.replace(/\{\{name\}\}/g, member.name)
              } else if (member.discord?.username) {
                // Fallback to Discord username
                personalizedMessage = message.replace(/\{\{name\}\}/g, member.discord.username)
              } else if (member.email && member.email !== 'No email') {
                // Fallback to email prefix
                const emailPrefix = member.email.split('@')[0]
                personalizedMessage = message.replace(/\{\{name\}\}/g, emailPrefix)
              } else {
                // Final fallback
                personalizedMessage = message.replace(/\{\{name\}\}/g, 'there')
              }
              
                const result = await appWhopSdk.messages.sendDirectMessageToUser({
                  toUserIdOrUsername: member.user,
                message: personalizedMessage
                })
                
                sentCount++
                console.log(`✅ Message sent to ${member.user}`)
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error'
                errors.push(`Failed to send to ${member.user}: ${errorMsg}`)
                console.log(`❌ Failed to send to ${member.user}: ${errorMsg}`)
              }
            } else {
              errors.push(`No user ID found for member ${memberId}`)
              console.log(`❌ No user ID found for member ${memberId}`)
            }
          } else {
            errors.push(`Failed to get member data for ${memberId}`)
            console.log(`❌ Failed to get member data for ${memberId}`)
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error sending to ${memberId}: ${errorMsg}`)
        console.error(`Error sending to ${memberId}:`, error)
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`Selected members messaging completed: ${sentCount} sent, ${errors.length} errors`)
    
    return {
      success: sentCount > 0,
      sentCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    console.error('Error in selected members messaging:', error)
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    }
  }
}

/**
 * Send a broadcast message to App Builder companies using the correct API key for each user
 */
export async function sendAppBuilderBroadcastMessage({
  message,
  targetCompanies,
  agentUserId
}: {
  message: string
  targetCompanies: Array<{ 
    id: string; 
    owner: { 
      id: string; 
      name: string; 
      username: string; 
      email: string; 
    }; 
    _source_api_key_id?: string; 
    _source_api_key_name?: string 
  }>
  agentUserId: string
}): Promise<{ success: boolean; jobId?: string; sentCount?: number; errors?: string[] }> {
  const startTime = Date.now()
  const MAX_EXECUTION_TIME = 8000 // 8 seconds to leave buffer for Vercel's 10s limit
  
  try {
    console.log(`Starting App Builder broadcast message to ${targetCompanies.length} companies`)
    
    // Check if we're approaching the timeout limit
    const checkTimeout = () => {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        throw new Error('Approaching Vercel timeout limit - switching to background job')
      }
    }
    
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
    console.log(`Using agent configuration: ${agentConfig.agent_name} (${agentConfig.agent_user_id})`)
    
    // Use the app's API key with agent configuration for sending messages
    const appApiKey = process.env.WHOP_API_KEY
    if (!appApiKey) {
      return {
        success: false,
        errors: ['App API key not configured. Messaging requires app-level permissions.']
      }
    }
    
    // Convert companies directly to members using the existing user data
    console.log(`Converting ${targetCompanies.length} companies to members using existing user data`)
    
    const allMembers = targetCompanies.map(company => {
      console.log(`Processing company ${company.id} - User: ${company.owner.name} (${company.owner.email})`)
      
      return {
        user: { 
          id: company.owner.id,
          name: company.owner.name,
          username: company.owner.username,
          email: company.owner.email
        },
        name: company.owner.name,
        username: company.owner.username,
        email: company.owner.email,
        id: `temp_${company.owner.id}` // Temporary ID for processing
      }
    })
    
    console.log(`Successfully converted ${allMembers.length} companies to members with existing user data`)
    
    // Deduplicate members by user ID to avoid sending multiple messages to the same user
    const uniqueMembers = allMembers.filter((member, index, self) => 
      index === self.findIndex(m => m.user?.id === member.user?.id)
    )
    
    if (uniqueMembers.length !== allMembers.length) {
      console.log(`Deduplicated members: ${uniqueMembers.length} unique out of ${allMembers.length} total (${allMembers.length - uniqueMembers.length} duplicates removed)`)
    }
    
    // Check if we have any members to send to
    if (uniqueMembers.length === 0) {
      return {
        success: false,
        errors: ['No valid members found to send messages to']
      }
    }
    
    // Send messages immediately if we have a small number, otherwise use background job
    if (uniqueMembers.length <= 50) {
      console.log(`Sending ${uniqueMembers.length} messages immediately`)
      const result = await sendBroadcastImmediate(uniqueMembers, message, appApiKey, agentConfig.agent_user_id)
      return {
        success: result.success,
        sentCount: result.sentCount,
        errors: result.errors
      }
    } else {
      console.log(`Creating background job for ${uniqueMembers.length} messages`)
      const jobId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create job record
      const job: BroadcastJob = {
        id: jobId,
        message,
        apiKey: appApiKey,
        agentUserId: agentConfig.agent_user_id,
        totalMembers: uniqueMembers.length,
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      broadcastJobs.set(jobId, job)
      
      // Start background processing
      processBroadcastJob(jobId, uniqueMembers, appApiKey, agentConfig.agent_user_id)
      
      return {
        success: true,
        jobId,
        sentCount: 0
      }
    }
  } catch (error) {
    console.error('Error in App Builder broadcast:', error)
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    }
  }
}

/**
 * Get all members for a product (for selection)
 */
export async function getProductMembersForSelection({
  apiKey
}: {
  apiKey: string
}): Promise<{ success: boolean; members?: Array<{ id: string; user: { id: string; email: string; username?: string } }>; error?: string }> {
  try {
    console.log(`Fetching all members for selection`)
    console.log(`API Key present: ${!!apiKey}, length: ${apiKey?.length}`)
    
    const whopSdk = new WhopSDKClient(apiKey)
    const result = await whopSdk.getAllMembers()
    
    console.log('Whop SDK result:', result)
    
    if (!result.success || !result.members) {
      return {
        success: false,
        error: result.error || 'Failed to fetch members'
      }
    }
    
    console.log(`Raw members from Whop: ${result.members.length}`)
    console.log('Sample member:', result.members[0])
    
    // Include ALL members - now with full user details from v5 endpoint
    const formattedMembers = result.members
      .filter(member => member.user) // Only include members with user IDs
      .map(member => ({
        id: member.id,
        user: {
          id: member.user,
          email: member.email || 'No email',
          username: member.discord?.username || 'No username',
          name: member.name || member.discord?.username || 'No name'
        }
      }))
    
    console.log(`Formatted ${formattedMembers.length} members for selection`)
    
    return {
      success: true,
      members: formattedMembers
    }
  } catch (error) {
    console.error('Error fetching members for selection:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
} 