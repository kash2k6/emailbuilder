import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Simple rate limiter for Resend API calls
class RateLimiter {
  private lastCall = 0
  private readonly minInterval = 600 // 600ms between calls (1.67 per second to be safe)

  async waitForNextCall(): Promise<void> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastCall
    
    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastCall = Date.now()
  }
}

const rateLimiter = new RateLimiter()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

// Vercel-compatible queue processor
// Designed to work within serverless function timeouts
export async function POST(request: NextRequest) {
  return await processQueue(request)
}

export async function GET(request: NextRequest) {
  return await processQueue(request)
}

async function processQueue(request: NextRequest) {
  try {
    let workerId: string
    
    if (request.method === 'POST') {
      const body = await request.json()
      workerId = body.workerId || `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } else {
      // For GET requests (cron jobs), generate a worker ID
      workerId = `cron_worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    console.log(`🔄 Queue processor started with worker ID: ${workerId}`)

    // Process jobs until we hit Vercel's timeout limit or max jobs per run
    // Leave 5 seconds buffer for cleanup
    const startTime = Date.now()
    const maxProcessingTime = 25000 // 25 seconds (leaving 5s buffer for 30s timeout)
    const maxJobsPerRun = 5 // Limit jobs per cron run to avoid rate limits
    let processedJobs = 0
    let totalEmailsSent = 0

    while (Date.now() - startTime < maxProcessingTime && processedJobs < maxJobsPerRun) {
      // Get next job from queue
      const { data: jobData, error: jobError } = await supabase
        .rpc('get_next_automation_job', { worker_id: workerId })

      if (jobError) {
        console.error('Error getting next job:', jobError)
        break
      }

      if (!jobData || jobData.length === 0) {
        console.log('No more jobs in queue')
        break
      }

      const job = jobData[0]
      console.log(`📧 Processing job ${job.job_id} (${job.job_type})`)

      try {
        let result: { success: boolean; error?: string; sentCount?: number }

        if (job.job_type === 'trigger') {
          result = await processTriggerJob(job)
        } else {
          result = await processFlowStepJob(job)
        }

        // Mark job as completed
        await supabase.rpc('complete_automation_job', {
          job_id: job.job_id,
          success: result.success,
          error_message: result.error || null
        })

        if (result.success) {
          console.log(`✅ Job ${job.job_id} completed successfully (${result.sentCount} emails sent)`)
          totalEmailsSent += result.sentCount || 0
        } else {
          console.error(`❌ Job ${job.job_id} failed: ${result.error}`)
          
          // Retry logic is handled by the database function
          const { data: retryResult } = await supabase.rpc('retry_automation_job', {
            job_id: job.job_id
          })
          
          if (retryResult) {
            console.log(`🔄 Job ${job.job_id} scheduled for retry`)
          } else {
            console.error(`💀 Job ${job.job_id} failed permanently`)
          }
        }

        processedJobs++

        // Rate limiting delay between jobs
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ Unexpected error processing job ${job.job_id}:`, error)
        
        // Mark job as failed
        await supabase.rpc('complete_automation_job', {
          job_id: job.job_id,
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })

        // Update trigger log if this is a trigger job
        if (job.job_type === 'trigger' && job.user_data?.log_id) {
          await supabase
            .from('automation_trigger_logs')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', job.user_data.log_id)
        }
      }
    }

    const processingTime = Date.now() - startTime
    console.log(`🏁 Queue processing completed: ${processedJobs} jobs processed, ${totalEmailsSent} emails sent in ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      processedJobs,
      totalEmailsSent,
      processingTimeMs: processingTime,
      workerId
    })

  } catch (error) {
    console.error('Error in queue processor:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function processTriggerJob(job: any): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  try {
    // Check if user has already received this trigger
    const { data: existingTrigger } = await supabase
      .from('email_trigger_sent')
      .select('*')
      .eq('whop_user_id', job.whop_user_id)
      .eq('trigger_type', job.trigger_type)
      .eq('user_email', job.user_email)
      .single()

    if (existingTrigger?.sent) {
      return { success: true, sentCount: 0, error: 'User already received this trigger' }
    }

    // Check that from_name is set before allowing emails to be sent
    const { data: configData } = await supabase
      .from('email_platform_configs')
      .select('from_name')
      .eq('whop_user_id', job.whop_user_id)
      .single()

    if (!configData?.from_name || !configData.from_name.trim()) {
      return { 
        success: false, 
        error: 'From Name is not set. Please set a display name in your email configuration before sending emails.' 
      }
    }

    // Apply rate limiting
    await rateLimiter.waitForNextCall()

    // Create temporary audience
    const tempAudienceName = `Automation: ${job.trigger_type} - ${job.whop_user_id} (${job.from_email}) - ${new Date().toISOString().split('T')[0]}`
    
    const audienceResult = await resend.audiences.create({
      name: tempAudienceName
    })

    if (audienceResult.error) {
      throw new Error(`Failed to create audience: ${audienceResult.error.message}`)
    }

    const tempAudienceId = audienceResult.data?.id!

    // Add user to audience
    await rateLimiter.waitForNextCall()
    await resend.contacts.create({
      audienceId: tempAudienceId,
      email: job.user_email,
      firstName: job.user_data?.firstName || 'User',
      lastName: job.user_data?.lastName || '',
      unsubscribed: false
    })

    // Create and send broadcast
    await rateLimiter.waitForNextCall()
    
    // Format the from field with the business name
    const fromField = configData.from_name ? `${configData.from_name} <${job.from_email}>` : job.from_email
    
    const broadcastResult = await resend.broadcasts.create({
      audienceId: tempAudienceId,
      from: fromField,
      subject: job.subject,
      html: job.html_content,
      text: job.text_content,
      name: `Automation: ${job.trigger_type} - ${job.whop_user_id} (${job.from_email}) - ${job.subject}`
    })

    if (broadcastResult.error) {
      throw new Error(`Failed to create broadcast: ${broadcastResult.error.message}`)
    }

    await rateLimiter.waitForNextCall()
    const sendResult = await resend.broadcasts.send(broadcastResult.data?.id!)

    if (sendResult.error) {
      throw new Error(`Failed to send broadcast: ${sendResult.error.message}`)
    }

    console.log('📧 Broadcast send result:', JSON.stringify(sendResult.data, null, 2))

    // Mark as sent
    await supabase
      .from('email_trigger_sent')
      .upsert({
        whop_user_id: job.whop_user_id,
        trigger_type: job.trigger_type,
        user_email: job.user_email,
        user_first_name: job.user_data?.firstName || 'User',
        user_last_name: job.user_data?.lastName || '',
        sent: true,
        sent_at: new Date().toISOString()
      })

    // Update trigger log if this is a trigger job
    if (job.user_data?.log_id) {
      await supabase
        .from('automation_trigger_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          email_id: broadcastResult.data?.id
        })
        .eq('id', job.user_data.log_id)
    }

    // Track for analytics in our persistent system
    try {
      const { error: analyticsError } = await supabase
        .from('email_analytics_sends')
        .insert({
          whop_user_id: job.whop_user_id,
          resend_broadcast_id: broadcastResult.data?.id!,
          resend_email_id: null, // Will be updated by webhook when email events are received
          email_type: 'trigger',
          trigger_type: job.trigger_type,
          subject: job.subject,
          from_email: job.from_email,
          recipient_email: job.user_email,
          html_content: job.html_content,
          text_content: job.text_content,
          status: 'sent'
        })

      if (analyticsError) {
        console.error('Error tracking email send:', analyticsError)
      } else {
        console.log('✅ Tracked email send for analytics')
      }

      // Also save to broadcast_jobs for webhook compatibility
      const { error: broadcastError } = await supabase
        .from('broadcast_jobs')
        .insert({
          id: `trigger_${job.whop_user_id}_${Date.now()}`,
          user_id: job.whop_user_id,
          message: job.subject,
          total_members: 1,
          success_count: 1,
          status: 'completed',
          resend_broadcast_id: broadcastResult.data?.id!,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (broadcastError) {
        console.error('Error tracking broadcast job:', broadcastError)
      } else {
        console.log('✅ Tracked broadcast job for webhook compatibility')
      }
    } catch (error) {
      console.log('Analytics table not ready yet, skipping tracking:', error)
    }

    // Clean up temporary audience
    setTimeout(async () => {
      try {
        await resend.audiences.remove(tempAudienceId)
      } catch (error) {
        console.error('Error cleaning up temporary audience:', error)
      }
    }, 60000)

    return { success: true, sentCount: 1 }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function processFlowStepJob(job: any): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  try {
    // Check that from_name is set before allowing emails to be sent
    const { data: configData } = await supabase
      .from('email_platform_configs')
      .select('from_name')
      .eq('whop_user_id', job.whop_user_id)
      .single()

    if (!configData?.from_name || !configData.from_name.trim()) {
      return { 
        success: false, 
        error: 'From Name is not set. Please set a display name in your email configuration before sending emails.' 
      }
    }

    // Get users at this step
    const { data: usersAtStep } = await supabase
      .from('email_flow_progress')
      .select('*')
      .eq('whop_user_id', job.whop_user_id)
      .eq('flow_id', job.flow_id)
      .eq('current_step', job.email_step)
      .eq('status', 'active')

    if (!usersAtStep || usersAtStep.length === 0) {
      return { success: true, sentCount: 0 }
    }

    // Create workflow executions for each user if they don't exist
    // This ensures we track flow statistics properly for legacy jobs
    for (const user of usersAtStep) {
      // Check if execution already exists for this user and workflow
      const { data: existingExecution } = await supabase
        .from('automation_workflow_executions')
        .select('id')
        .eq('workflow_id', job.flow_id)
        .eq('member_email', user.user_email)
        .maybeSingle()

      if (!existingExecution) {
        // Get workflow details for execution creation
        const { data: workflow } = await supabase
          .from('automation_workflows')
          .select('config_id, max_steps')
          .eq('id', job.flow_id)
          .single()

        if (workflow) {
          // Create workflow execution
          const { error: executionError } = await supabase
            .from('automation_workflow_executions')
            .insert({
              workflow_id: job.flow_id,
              config_id: workflow.config_id,
              whop_event_id: job.user_data?.submission_id || null,
              whop_membership_id: null,
              whop_user_id: job.whop_user_id,
              member_email: user.user_email,
              status: 'active',
              current_step: job.email_step,
              total_steps: workflow.max_steps,
              metadata: job.user_data
            })

          if (executionError) {
            console.error('Error creating workflow execution:', executionError)
          } else {
            console.log(`✅ Created workflow execution for ${user.user_email}`)
            
            // Update flow statistics - increment total_triggered
            await supabase
              .rpc('increment_flow_triggered', { flow_id: job.flow_id })
          }
        }
      } else {
        console.log(`ℹ️ Workflow execution already exists for ${user.user_email}`)
      }
    }

    // Apply rate limiting
    await rateLimiter.waitForNextCall()

    // Create temporary audience
    const tempAudienceName = `flow_${job.flow_id}_step_${job.email_step}_${Date.now()}`
    
    const audienceResult = await resend.audiences.create({
      name: tempAudienceName
    })

    if (audienceResult.error) {
      throw new Error(`Failed to create audience: ${audienceResult.error.message}`)
    }

    const tempAudienceId = audienceResult.data?.id!

    // Add users to audience
    for (const user of usersAtStep) {
      await rateLimiter.waitForNextCall()
      await resend.contacts.create({
        audienceId: tempAudienceId,
        email: user.user_email,
        firstName: user.user_first_name || 'User',
        lastName: user.user_last_name || '',
        unsubscribed: false
      })
    }

    // Create and send broadcast
    await rateLimiter.waitForNextCall()
    // Format the from field with the business name
    const fromField = configData.from_name ? `${configData.from_name} <${job.from_email}>` : job.from_email
    
    const broadcastResult = await resend.broadcasts.create({
      audienceId: tempAudienceId,
      from: fromField,
      subject: job.subject,
      html: job.html_content,
      text: job.text_content,
      name: `Flow Step: ${job.flow_id} - ${job.whop_user_id} (${job.from_email}) - ${job.subject}`
    })

    if (broadcastResult.error) {
      throw new Error(`Failed to create broadcast: ${broadcastResult.error.message}`)
    }

    await rateLimiter.waitForNextCall()
    const sendResult = await resend.broadcasts.send(broadcastResult.data?.id!)

    if (sendResult.error) {
      throw new Error(`Failed to send broadcast: ${sendResult.error.message}`)
    }

    console.log('📧 Flow step broadcast send result:', JSON.stringify(sendResult.data, null, 2))

    // Update user progress and workflow executions
    for (const user of usersAtStep) {
      const nextStep = user.current_step + 1
      const isCompleted = nextStep > (user.total_steps || 1)
      
      // Update flow progress
      await supabase
        .from('email_flow_progress')
        .update({
          current_step: nextStep,
          status: isCompleted ? 'completed' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('whop_user_id', job.whop_user_id)
        .eq('flow_id', job.flow_id)
        .eq('user_email', user.user_email)

      // Update workflow execution status
      if (isCompleted) {
        await supabase
          .from('automation_workflow_executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('workflow_id', job.flow_id)
          .eq('member_email', user.user_email)
        
        // Update flow statistics - increment total_completed
        await supabase
          .rpc('increment_flow_completed', { flow_id: job.flow_id })
      } else {
        await supabase
          .from('automation_workflow_executions')
          .update({
            current_step: nextStep
          })
          .eq('workflow_id', job.flow_id)
          .eq('member_email', user.user_email)
      }
    }

    // Track for analytics in our persistent system
    try {
      for (const user of usersAtStep) {
        const { error: analyticsError } = await supabase
          .from('email_analytics_sends')
          .insert({
            whop_user_id: job.whop_user_id,
            resend_broadcast_id: broadcastResult.data?.id!,
            resend_email_id: null, // Will be updated by webhook when email events are received
            email_type: 'flow_step',
            flow_id: job.flow_id,
            flow_step: job.email_step,
            subject: job.subject,
            from_email: job.from_email,
            recipient_email: user.user_email,
            html_content: job.html_content,
            text_content: job.text_content,
            status: 'sent'
          })

        if (analyticsError) {
          console.error('Error tracking email send for user:', user.user_email, analyticsError)
        }
      }
      
      console.log(`✅ Tracked ${usersAtStep.length} email sends for analytics`)

      // Also save to broadcast_jobs for webhook compatibility
      const { error: broadcastError } = await supabase
        .from('broadcast_jobs')
        .insert({
          id: `flow_${job.flow_id}_${job.email_step}_${Date.now()}`,
          user_id: job.whop_user_id,
          message: job.subject,
          total_members: usersAtStep.length,
          success_count: usersAtStep.length,
          status: 'completed',
          resend_broadcast_id: broadcastResult.data?.id!,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (broadcastError) {
        console.error('Error tracking broadcast job:', broadcastError)
      } else {
        console.log('✅ Tracked broadcast job for webhook compatibility')
      }
    } catch (error) {
      console.log('Analytics table not ready yet, skipping flow step tracking:', error)
    }

    // Clean up temporary audience
    setTimeout(async () => {
      try {
        await resend.audiences.remove(tempAudienceId)
      } catch (error) {
        console.error('Error cleaning up temporary audience:', error)
      }
    }, 60000)

    return { success: true, sentCount: usersAtStep.length }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function trackBroadcastEmail(data: {
  whopUserId: string
  resendBroadcastId: string
  subject: string
  fromEmail: string
  audienceId: string
  recipientCount: number
  htmlContent: string
  textContent: string
}) {
  try {
    await supabase
      .from('sent_emails')
      .insert({
        whop_user_id: data.whopUserId,
        resend_broadcast_id: data.resendBroadcastId,
        subject: data.subject,
        from_email: data.fromEmail,
        audience_id: data.audienceId,
        recipient_count: data.recipientCount,
        html_content: data.htmlContent,
        text_content: data.textContent,
        sent_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error tracking broadcast email:', error)
  }
} 