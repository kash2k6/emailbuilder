import { createClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

interface EmailTrackingData {
  configId: string
  whopUserId: string
  toEmail: string
  fromEmail: string
  subject: string
  htmlContent?: string
  textContent?: string
  emailType: 'broadcast' | 'flow' | 'manual' | 'template'
  sourceId?: string
}

interface EmailEvent {
  resendEmailId: string
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed' | 'canceled' | 'delivery_delayed' | 'queued' | 'scheduled'
  eventData?: any
  occurredAt?: Date
}

interface BroadcastTrackingData {
  whopUserId: string
  resendBroadcastId: string
  subject: string
  fromEmail: string
  audienceId: string
  recipientCount: number
  htmlContent?: string
  textContent?: string
}

/**
 * Fetch email status from Resend API and update our database
 */
export async function fetchEmailStatusFromResend(
  resendEmailId: string,
  apiKey: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const resend = new Resend(apiKey)
    
    const email = await resend.emails.get(resendEmailId)
    
    if (email.error) {
      console.error('Error fetching email from Resend:', email.error)
      return { success: false, error: email.error.message }
    }
    
    if (!email.data) {
      return { success: false, error: 'No email data returned from Resend' }
    }
    
    const emailData = email.data
    console.log('Email status from Resend:', {
      id: emailData.id,
      status: emailData.last_event,
      createdAt: emailData.created_at
    })
    
    // Record the current status as an event
    if (emailData.last_event) {
      await recordEmailEvent({
        resendEmailId: emailData.id,
        eventType: emailData.last_event as any,
        eventData: emailData,
        occurredAt: new Date(emailData.created_at)
      })
    }
    
    return { 
      success: true, 
      status: emailData.last_event 
    }
  } catch (error) {
    console.error('Error in fetchEmailStatusFromResend:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch email status' 
    }
  }
}

/**
 * Sync all recent emails with Resend to get current status
 */
export async function syncRecentEmailsWithResend(
  whopUserId: string,
  hoursBack: number = 24
): Promise<{ success: boolean; syncedCount?: number; error?: string }> {
  try {
    const supabase = createClient()
    
    // Use environment variable for API key (same as email sending)
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }
    
    // Verify user has email platform configured
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .single()
    
    if (configError || !config) {
      return { success: false, error: 'Email platform not configured' }
    }
    
    // Get recent emails that haven't been updated recently
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack)
    
    console.log(`Looking for emails sent after: ${cutoffTime.toISOString()}`)
    
    const { data: emails, error: emailsError } = await supabase
      .from('sent_emails')
      .select('resend_email_id, updated_at')
      .eq('whop_user_id', whopUserId)
      .gte('sent_at', cutoffTime.toISOString())
      .order('sent_at', { ascending: false })
    
    if (emailsError) {
      console.error('Error fetching recent emails:', emailsError)
      return { success: false, error: 'Failed to fetch recent emails' }
    }
    
    console.log(`Found ${emails?.length || 0} emails to sync`)
    
    if (!emails || emails.length === 0) {
      console.log('No emails found to sync')
      return { success: true, syncedCount: 0 }
    }
    
    console.log(`Syncing ${emails.length} recent emails with Resend...`)
    
    let syncedCount = 0
    const errors: string[] = []
    
    // Sync each email with Resend (with rate limiting)
    for (const email of emails) {
      try {
        const result = await fetchEmailStatusFromResend(email.resend_email_id, apiKey)
        if (result.success) {
          syncedCount++
        } else {
          errors.push(`Failed to sync ${email.resend_email_id}: ${result.error}`)
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errors.push(`Error syncing ${email.resend_email_id}: ${error}`)
      }
    }
    
    console.log(`Synced ${syncedCount} emails with Resend`)
    if (errors.length > 0) {
      console.error('Sync errors:', errors.slice(0, 5))
    }
    
    return { 
      success: true, 
      syncedCount 
    }
  } catch (error) {
    console.error('Error in syncRecentEmailsWithResend:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to sync emails' 
    }
  }
}

/**
 * Store a sent email in the tracking system
 */
export async function trackSentEmail(
  resendEmailId: string,
  data: EmailTrackingData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('sent_emails')
      .insert({
        resend_email_id: resendEmailId,
        config_id: data.configId,
        whop_user_id: data.whopUserId,
        to_email: data.toEmail,
        from_email: data.fromEmail,
        subject: data.subject,
        html_content: data.htmlContent,
        text_content: data.textContent,
        email_type: data.emailType,
        source_id: data.sourceId,
        status: 'sent'
      })

    if (error) {
      console.error('Error tracking sent email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in trackSentEmail:', error)
    return { success: false, error: 'Failed to track sent email' }
  }
}

/**
 * Record an email event (opened, clicked, bounced, etc.)
 */
export async function recordEmailEvent(event: EmailEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // First, get the email record
    const { data: email, error: emailError } = await supabase
      .from('sent_emails')
      .select('id')
      .eq('resend_email_id', event.resendEmailId)
      .single()

    if (emailError || !email) {
      console.error('Email not found for event:', event.resendEmailId)
      return { success: false, error: 'Email not found' }
    }

    // Record the event
    const { error } = await supabase
      .from('email_events')
      .insert({
        email_id: email.id,
        resend_email_id: event.resendEmailId,
        event_type: event.eventType,
        event_data: event.eventData,
        occurred_at: event.occurredAt || new Date()
      })

    if (error) {
      console.error('Error recording email event:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in recordEmailEvent:', error)
    return { success: false, error: 'Failed to record email event' }
  }
}

/**
 * Track a broadcast email in our database
 */
export async function trackBroadcastEmail(
  data: BroadcastTrackingData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get user's email platform config
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', data.whopUserId)
      .eq('platform_type', 'resend')
      .single()
    
    if (configError || !config) {
      return { success: false, error: 'Email platform not configured' }
    }

    // Get user profile to get name/username for better broadcast naming
    let userDisplayName = data.whopUserId // Default to user ID
    try {
      const { getProfile } = await import('@/app/actions')
      const profile = await getProfile(data.whopUserId)
      if (profile) {
        // Try to get user details from WHOP API
        const { whopSdk } = await import('@/lib/whop-sdk')
        try {
          const user = await whopSdk.users.getUser({ userId: data.whopUserId })
          userDisplayName = user.name || user.username || data.whopUserId
        } catch (userError) {
          console.warn('Could not fetch user details from WHOP API, using user ID:', userError)
          userDisplayName = data.whopUserId
        }
      }
    } catch (profileError) {
      console.warn('Could not fetch user profile, using user ID:', profileError)
      userDisplayName = data.whopUserId
    }

    // Create broadcast job entry with Resend broadcast ID for webhook tracking
    const { error: broadcastError } = await supabase
      .from('broadcast_jobs')
      .insert({
        id: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: data.whopUserId,
        message: data.subject, // Keep just the subject for analytics display
        total_members: data.recipientCount,
        success_count: data.recipientCount, // Assume all sent successfully initially
        error_count: 0,
        status: 'completed',
        resend_broadcast_id: data.resendBroadcastId, // Store Resend broadcast ID for webhook tracking
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
    
    if (broadcastError) {
      console.error('Error tracking broadcast:', broadcastError)
      return { success: false, error: broadcastError.message }
    }
    
    console.log(`✅ Tracked broadcast: ${data.resendBroadcastId} to ${data.recipientCount} recipients`)
    return { success: true }
  } catch (error) {
    console.error('Error in trackBroadcastEmail:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to track broadcast' 
    }
  }
}

/**
 * Get broadcast statistics from webhook-tracked data (no API calls needed)
 * All broadcast statistics are already tracked via Resend webhooks
 */
export async function syncBroadcastStatsFromResend(
  whopUserId: string,
  hoursBack: number = 24
): Promise<{ success: boolean; syncedCount?: number; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get recent broadcasts from our database
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack)
    
    const { data: broadcasts, error: broadcastsError } = await supabase
      .from('broadcast_jobs')
      .select('*')
      .eq('user_id', whopUserId)
      .gte('created_at', cutoffTime.toISOString())
      .not('resend_broadcast_id', 'is', null)
      .order('created_at', { ascending: false })
    
    if (broadcastsError) {
      console.error('Error fetching broadcasts:', broadcastsError)
      return { success: false, error: 'Failed to fetch broadcasts' }
    }
    
    if (!broadcasts || broadcasts.length === 0) {
      console.log('No broadcasts found to sync')
      return { success: true, syncedCount: 0 }
    }
    
    console.log(`Found ${broadcasts.length} broadcasts with webhook-tracked statistics`)
    
    // All broadcast statistics are already tracked via webhooks
    // No need to make API calls to Resend
    // The webhook system updates:
    // - success_count (delivered emails)
    // - opened_count 
    // - clicked_count
    // - error_count (bounced emails)
    // - complained_count
    // - failed_count
    
    console.log(`✅ Broadcast statistics are already up-to-date via webhooks`)
    return { success: true, syncedCount: broadcasts.length }
    
  } catch (error) {
    console.error('Error in syncBroadcastStatsFromResend:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to sync broadcast stats' 
    }
  }
}

/**
 * Get email analytics for a user
 */
export async function getEmailAnalytics(whopUserId: string): Promise<{
  success: boolean
  data?: {
    totalEmails: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    complained: number
    failed: number
    openRate: number
    clickRate: number
    bounceRate: number
    complaintRate: number
    recentEmails: Array<{
      id: string
      subject: string
      toEmail: string
      status: string
      sentAt: string
      openedAt?: string
      clickedAt?: string
      isBroadcast?: boolean
      recipientCount?: number
    }>
  }
  error?: string
}> {
  try {
    const supabase = createClient()

    // Get user's config
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (configError || !config) {
      return { success: false, error: 'Email platform not configured' }
    }

    // Get individual email statistics
    const { data: emails, error: emailsError } = await supabase
      .from('sent_emails')
      .select('*')
      .eq('config_id', config.id)
      .order('sent_at', { ascending: false })

    if (emailsError) {
      console.error('Error fetching emails:', emailsError)
      return { success: false, error: 'Failed to fetch email data' }
    }

    // Get broadcast statistics
    const { data: broadcasts, error: broadcastsError } = await supabase
      .from('broadcast_jobs')
      .select('*')
      .eq('user_id', whopUserId)
      .order('created_at', { ascending: false })

    if (broadcastsError) {
      console.error('Error fetching broadcasts:', broadcastsError)
      return { success: false, error: 'Failed to fetch broadcast data' }
    }

    // Combine individual emails and broadcasts
    const allEmails = emails || []
    const allBroadcasts = broadcasts || []

    // Calculate individual email statistics
    const individualEmails = allEmails.length
    const individualDelivered = allEmails.filter(e => e.status === 'delivered' || e.opened_at || e.clicked_at).length
    const individualOpened = allEmails.filter(e => e.opened_at).length
    const individualClicked = allEmails.filter(e => e.clicked_at).length
    const individualBounced = allEmails.filter(e => e.bounced_at).length
    const individualComplained = allEmails.filter(e => e.complained_at).length
    const individualFailed = allEmails.filter(e => e.failed_at).length

    // Calculate broadcast statistics (broadcasts are tracked differently)
    const broadcastEmails = allBroadcasts.length
    const broadcastRecipients = allBroadcasts.reduce((sum, b) => sum + (b.total_members || 0), 0)
    
    // For broadcasts, we count total delivered emails (not just number of broadcasts)
    const broadcastDelivered = allBroadcasts
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.success_count || b.total_members || 0), 0)
    
    // Track broadcast opens and clicks from last_event
    const broadcastOpened = allBroadcasts.filter(b => b.last_event === 'opened').length
    const broadcastClicked = allBroadcasts.filter(b => b.last_event === 'clicked').length

    // Combine totals
    const totalEmails = individualEmails + broadcastRecipients
    const delivered = individualDelivered + broadcastDelivered
    const opened = individualOpened + broadcastOpened
    const clicked = individualClicked + broadcastClicked
    const bounced = individualBounced
    const complained = individualComplained
    const failed = individualFailed

    const openRate = totalEmails > 0 ? (opened / totalEmails) * 100 : 0
    const clickRate = totalEmails > 0 ? (clicked / totalEmails) * 100 : 0
    const bounceRate = totalEmails > 0 ? (bounced / totalEmails) * 100 : 0
    const complaintRate = totalEmails > 0 ? (complained / totalEmails) * 100 : 0

    // Combine recent emails and broadcasts for display
    const recentIndividualEmails = allEmails.slice(0, 10).map(email => ({
      id: email.id,
      subject: email.subject,
      toEmail: email.to_email,
      status: email.status,
      sentAt: email.sent_at,
      openedAt: email.opened_at,
      clickedAt: email.clicked_at,
      isBroadcast: false,
      recipientCount: 1
    }))

    const recentBroadcasts = allBroadcasts.slice(0, 10).map(broadcast => ({
      id: broadcast.id,
      subject: broadcast.message,
      toEmail: `Broadcast to ${broadcast.total_members} recipients`,
      status: broadcast.status,
      sentAt: broadcast.created_at,
      openedAt: broadcast.last_event === 'opened' ? broadcast.last_event_at : undefined,
      clickedAt: broadcast.last_event === 'clicked' ? broadcast.last_event_at : undefined,
      isBroadcast: true,
      recipientCount: broadcast.total_members
    }))

    // Combine and sort by date
    const allRecentEmails = [...recentIndividualEmails, ...recentBroadcasts]
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, 10)

    return {
      success: true,
      data: {
        totalEmails,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        failed,
        openRate,
        clickRate,
        bounceRate,
        complaintRate,
        recentEmails: allRecentEmails
      }
    }
  } catch (error) {
    console.error('Error in getEmailAnalytics:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get email analytics' 
    }
  }
}

/**
 * Sync email events from Resend (webhook handler)
 */
export async function syncEmailEventsFromResend(
  resendEmailId: string,
  eventType: string,
  eventData?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate event type
    const validEventTypes = [
      'sent', 'delivered', 'opened', 'clicked', 'bounced', 
      'complained', 'failed', 'canceled', 'delivery_delayed', 
      'queued', 'scheduled'
    ]

    if (!validEventTypes.includes(eventType)) {
      return { success: false, error: 'Invalid event type' }
    }

    // Record the event
    return await recordEmailEvent({
      resendEmailId,
      eventType: eventType as any,
      eventData,
      occurredAt: new Date()
    })
  } catch (error) {
    console.error('Error in syncEmailEventsFromResend:', error)
    return { success: false, error: 'Failed to sync email event' }
  }
} 

/**
 * Get email analytics directly from Resend API (real-time data)
 */
export async function getEmailAnalyticsFromResend(
  whopUserId: string
): Promise<{
  success: boolean
  data?: {
    totalSent: number
    totalDelivered: number
    totalPending: number
    opened: number
    clicked: number
    bounced: number
    complained: number
    failed: number
    openRate: number
    clickRate: number
    bounceRate: number
    complaintRate: number
    deliveryRate: number
    recentBroadcasts: Array<{
      id: string
      resendBroadcastId: string
      subject: string
      recipientCount: number
      delivered: number
      opened: number
      clicked: number
      bounced: number
      complained: number
      status: string
      sentAt: string
      createdAt: string
    }>
  }
  error?: string
}> {
  try {
    const supabase = createClient()
    
    // Use environment variable for API key
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }
    
    // Get user's config
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .maybeSingle()

    if (configError || !config) {
      return { success: false, error: 'Email platform not configured' }
    }

    // Get ALL broadcasts from our database (to get Resend broadcast IDs)
    const { data: broadcasts, error: broadcastsError } = await supabase
      .from('broadcast_jobs')
      .select('*')
      .eq('user_id', whopUserId)
      .not('resend_broadcast_id', 'is', null)
      .order('created_at', { ascending: false })

    if (broadcastsError) {
      console.error('Error fetching broadcasts:', broadcastsError)
      return { success: false, error: 'Failed to fetch broadcast data' }
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    
    let totalEmails = 0
    let totalDelivered = 0
    let totalOpened = 0
    let totalClicked = 0
    let totalBounced = 0
    let totalComplained = 0
    let totalFailed = 0
    
    const recentBroadcasts: any[] = []
    
    // Use webhook-tracked statistics directly from database (no API calls needed)
    for (const broadcast of broadcasts || []) {
      try {
        if (!broadcast.resend_broadcast_id) {
          console.log(`Skipping broadcast ${broadcast.id} - no resend_broadcast_id`)
          continue
        }
        
        // Use webhook-tracked statistics from database
        const delivered = broadcast.success_count || 0
        const opened = broadcast.opened_count || 0
        const clicked = broadcast.clicked_count || 0
        const bounced = broadcast.error_count || 0
        const complained = broadcast.complained_count || 0
        const failed = broadcast.failed_count || 0
        
        // Add to totals
        totalEmails += broadcast.total_members || 0
        totalDelivered += delivered
        totalOpened += opened
        totalClicked += clicked
        totalBounced += bounced
        totalComplained += complained
        totalFailed += failed
        
        // Add to recent broadcasts list
        recentBroadcasts.push({
          id: broadcast.id,
          resendBroadcastId: broadcast.resend_broadcast_id,
          subject: broadcast.message,
          recipientCount: broadcast.total_members || 0,
          delivered,
          opened,
          clicked,
          bounced,
          complained,
          status: broadcast.status || 'unknown',
          sentAt: broadcast.completed_at || broadcast.created_at,
          createdAt: broadcast.created_at
        })
        
      } catch (error) {
        console.error(`Error processing broadcast ${broadcast.id}:`, error)
      }
    }
    
    // Also include flow emails from email_analytics_sends
    const { data: flowEmails, error: flowError } = await supabase
      .from('email_analytics_sends')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('email_type', 'flow_step')
      .order('created_at', { ascending: false })
      .limit(20) // Increased limit to get more flow emails
    
    if (!flowError && flowEmails) {
      // Group flow emails by resend_broadcast_id
      const flowGroups = flowEmails.reduce((groups, email) => {
        const broadcastId = email.resend_broadcast_id
        if (!groups[broadcastId]) {
          groups[broadcastId] = []
        }
        groups[broadcastId].push(email)
        return groups
      }, {} as Record<string, any[]>)
      
      // Add flow emails to recent broadcasts
      for (const [broadcastId, emails] of Object.entries(flowGroups)) {
        const emailsArray = emails as any[]
        const totalRecipients = emailsArray.length
        const delivered = emailsArray.filter((e: any) => e.status === 'delivered' || e.status === 'opened' || e.status === 'clicked').length
        const opened = emailsArray.filter((e: any) => e.status === 'opened' || e.status === 'clicked').length
        const clicked = emailsArray.filter((e: any) => e.status === 'clicked').length
        const bounced = emailsArray.filter((e: any) => e.status === 'bounced').length
        const complained = emailsArray.filter((e: any) => e.status === 'complained').length
        
        // Add to totals
        totalEmails += totalRecipients
        totalDelivered += delivered
        totalOpened += opened
        totalClicked += clicked
        totalBounced += bounced
        totalComplained += complained
        
        // Add to recent broadcasts list (only if not already added from broadcast_jobs)
        const existingBroadcast = recentBroadcasts.find(b => b.resendBroadcastId === broadcastId)
        if (!existingBroadcast) {
          recentBroadcasts.push({
            id: `flow_${broadcastId}`,
            resendBroadcastId: broadcastId,
            subject: emailsArray[0]?.subject || 'Flow Email',
            recipientCount: totalRecipients,
            delivered,
            opened,
            clicked,
            bounced,
            complained,
            status: 'completed',
            sentAt: emailsArray[0]?.sent_at || emailsArray[0]?.created_at,
            createdAt: emailsArray[0]?.created_at
          })
        }
      }
    }
    
    // Calculate rates
    const openRate = totalEmails > 0 ? (totalOpened / totalEmails) * 100 : 0
    const clickRate = totalEmails > 0 ? (totalClicked / totalEmails) * 100 : 0
    const bounceRate = totalEmails > 0 ? (totalBounced / totalEmails) * 100 : 0
    const complaintRate = totalEmails > 0 ? (totalComplained / totalEmails) * 100 : 0

    return {
      success: true,
      data: {
        totalSent: totalEmails,        // Total emails sent (audience size)
        totalDelivered: totalDelivered, // Only emails with delivery confirmations
        totalPending: totalEmails - totalDelivered, // Sent but not yet delivered
        opened: totalOpened,
        clicked: totalClicked,
        bounced: totalBounced,
        complained: totalComplained,
        failed: totalFailed,
        openRate,
        clickRate,
        bounceRate,
        complaintRate,
        deliveryRate: totalEmails > 0 ? (totalDelivered / totalEmails) * 100 : 0,
        recentBroadcasts
      }
    }
    
  } catch (error) {
    console.error('Error in getEmailAnalyticsFromResend:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get email analytics from Resend' 
    }
  }
}

/**
 * Get detailed broadcast statistics from webhook-tracked data
 */
export async function getBroadcastDetails(
  resendBroadcastId: string
): Promise<{
  success: boolean
  data?: {
    id: string
    resendBroadcastId: string
    subject: string
    status: string
    recipientCount: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    complained: number
    failed: number
    sentAt: string
    createdAt: string
    // Detailed breakdown
    deliveryRate: number
    openRate: number
    clickRate: number
    bounceRate: number
    complaintRate: number
    // Recipient details (if available)
    recipients?: Array<{
      email: string
      status: string
      deliveredAt?: string
      openedAt?: string
      clickedAt?: string
      bouncedAt?: string
      complainedAt?: string
    }>
  }
  error?: string
}> {
  console.log(`🔍 DEBUG: Getting broadcast details for: ${resendBroadcastId}`)
  console.log(`🔍 DEBUG: Function called at: ${new Date().toISOString()}`)
  try {
    const supabase = createClient()
    
    // Check both systems simultaneously to determine the best data source
    const [broadcastResult, analyticsResult] = await Promise.all([
      supabase
        .from('broadcast_jobs')
        .select('*')
        .eq('resend_broadcast_id', resendBroadcastId)
        .single(),
      supabase
        .from('email_analytics_sends')
        .select('*')
        .eq('resend_broadcast_id', resendBroadcastId)
    ])
    
    console.log(`🔍 DEBUG: Broadcast query result:`, {
      data: broadcastResult.data,
      error: broadcastResult.error
    })
    
    const broadcast = broadcastResult.data
    const analyticsSends = analyticsResult.data || []
    
    console.log(`🔍 DEBUG: Found broadcast data:`, broadcast ? 'YES' : 'NO')
    console.log(`🔍 DEBUG: Found analytics sends:`, analyticsSends.length)
    
    if (broadcast) {
      console.log(`🔍 DEBUG: Broadcast data:`, {
        id: broadcast.id,
        message: broadcast.message,
        total_members: broadcast.total_members,
        success_count: broadcast.success_count,
        opened_count: broadcast.opened_count,
        clicked_count: broadcast.clicked_count,
        error_count: broadcast.error_count,
        complained_count: broadcast.complained_count,
        failed_count: broadcast.failed_count
      })
          console.log(`🔍 DEBUG: Raw broadcast values:`, {
      opened_count_raw: broadcast.opened_count,
      clicked_count_raw: broadcast.clicked_count,
      opened_count_type: typeof broadcast.opened_count,
      clicked_count_type: typeof broadcast.clicked_count
    })
    
    // Double-check the database directly to see if there's a caching issue
    const { data: directCheck, error: directError } = await supabase
      .from('broadcast_jobs')
      .select('opened_count, clicked_count, success_count')
      .eq('id', broadcast.id)
      .single()
    
    console.log(`🔍 DEBUG: Direct database check:`, {
      directCheck,
      directError,
      opened_count: directCheck?.opened_count,
      clicked_count: directCheck?.clicked_count
    })
    }
    
    if (analyticsSends.length > 0) {
      console.log(`🔍 DEBUG: Analytics sends sample:`, analyticsSends[0])
    }
    
    // Determine which data source to use based on what we find
    let useAnalyticsData = false
    let useBroadcastData = false
    
    // If we have broadcast data, use it (it has the correct info)
    if (broadcast) {
      useBroadcastData = true
      console.log(`🔍 DEBUG: Using broadcast data`)
    } else if (analyticsSends.length > 0) {
      // Only use analytics data if no broadcast data exists
      useAnalyticsData = true
      console.log(`🔍 DEBUG: Using analytics data`)
    }
    
    // Use analytics data (for flows)
    if (useAnalyticsData && analyticsSends.length > 0) {
      // Aggregate statistics from email_analytics_sends
      const totalRecipients = analyticsSends.length
      const delivered = analyticsSends.filter(s => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length
      const opened = analyticsSends.filter(s => s.status === 'opened' || s.status === 'clicked').length
      const clicked = analyticsSends.filter(s => s.status === 'clicked').length
      const bounced = analyticsSends.filter(s => s.status === 'bounced').length
      const complained = analyticsSends.filter(s => s.status === 'complained').length
      const failed = analyticsSends.filter(s => s.status === 'failed').length
      
      // Get the subject from the first send (they should all have the same subject)
      const subject = analyticsSends[0]?.subject || 'Untitled'
      const createdAt = analyticsSends[0]?.created_at || new Date().toISOString()
      const sentAt = analyticsSends[0]?.sent_at || createdAt
      
      // Calculate rates
      const deliveryRate = totalRecipients > 0 ? (delivered / totalRecipients) * 100 : 0
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
      const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0
      const bounceRate = totalRecipients > 0 ? (bounced / totalRecipients) * 100 : 0
      const complaintRate = delivered > 0 ? (complained / delivered) * 100 : 0
      
      return {
        success: true,
        data: {
          id: resendBroadcastId,
          resendBroadcastId,
          subject,
          status: 'completed',
          recipientCount: totalRecipients,
          delivered,
          opened,
          clicked,
          bounced,
          complained,
          failed,
          sentAt,
          createdAt,
          deliveryRate,
          openRate,
          clickRate,
          bounceRate,
          complaintRate
        }
      }
    }
    
    // Use broadcast data (for regular broadcasts)
    if (useBroadcastData && broadcast) {
      // Fix: success_count might be inflated due to webhook logic
      // Use total_members as the base for delivered count, but cap it at success_count
      const totalRecipients = broadcast.total_members || 0
      const successCount = broadcast.success_count || 0
      
      // For delivered, use the minimum of total_members and success_count
      // This handles cases where success_count got inflated by webhook events
      const delivered = Math.min(totalRecipients, successCount)
      
      const opened = broadcast.opened_count || 0
      const clicked = broadcast.clicked_count || 0
      const bounced = broadcast.error_count || 0
      const complained = broadcast.complained_count || 0
      const failed = broadcast.failed_count || 0
      
      console.log(`🔍 DEBUG: Broadcast calculation:`, {
        totalRecipients,
        successCount,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        failed
      })
      
      // Calculate rates
      const deliveryRate = totalRecipients > 0 ? (delivered / totalRecipients) * 100 : 0
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
      const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0
      const bounceRate = totalRecipients > 0 ? (bounced / totalRecipients) * 100 : 0
      const complaintRate = delivered > 0 ? (complained / delivered) * 100 : 0
      
      return {
        success: true,
        data: {
          id: resendBroadcastId,
          resendBroadcastId,
          subject: broadcast.message || 'Untitled',
          status: broadcast.status || 'unknown',
          recipientCount: totalRecipients,
          delivered,
          opened,
          clicked,
          bounced,
          complained,
          failed,
          sentAt: broadcast.completed_at || broadcast.created_at,
          createdAt: broadcast.created_at,
          deliveryRate,
          openRate,
          clickRate,
          bounceRate,
          complaintRate
        }
      }
    }
    
    return { success: false, error: 'Broadcast not found in database' }
    
  } catch (error) {
    console.error('Error in getBroadcastDetails:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get broadcast details' 
    }
  }
}

/**
 * Get click events for a specific broadcast from centralized table
 */
export async function getBroadcastClickEvents(
  broadcastId: string,
  whopUserId: string
): Promise<{
  success: boolean
  data?: Array<{
    id: string
    recipientEmail: string
    clickedLink: string
    displayLink: string
    ipAddress: string
    userAgent: string
    deviceType: string
    clickedAt: string
    location?: {
      country: string;
      country_code: string;
      continent: string;
      continent_code: string;
      as_name: string;
    } | null
  }>
  error?: string
}> {
  console.log(`🔍 DEBUG: Getting click events for broadcast: ${broadcastId}`)
  try {
    const supabase = createClient()
    
    // First verify the broadcast belongs to the user using resend_broadcast_id
    // Check both broadcast_jobs and email_analytics_sends
    console.log(`🔍 DEBUG: Checking authorization for broadcast: ${broadcastId}, user: ${whopUserId}`)
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcast_jobs')
      .select('id, user_id')
      .eq('resend_broadcast_id', broadcastId)
      .single()
    
    console.log(`🔍 DEBUG: Broadcast authorization check:`, {
      broadcast,
      broadcastError,
      requestedUserId: whopUserId,
      storedUserId: broadcast?.user_id
    })
    
    let hasAccess = false
    if (broadcast && broadcast.user_id === whopUserId) {
      hasAccess = true
      console.log(`🔍 DEBUG: Access granted via broadcast_jobs`)
    } else {
      console.log(`🔍 DEBUG: Access denied via broadcast_jobs, checking email_analytics_sends`)
      // Check if it's a flow email in email_analytics_sends
      const { data: analyticsSend, error: analyticsError } = await supabase
        .from('email_analytics_sends')
        .select('whop_user_id')
        .eq('resend_broadcast_id', broadcastId)
        .limit(1)
        .single()
      
      console.log(`🔍 DEBUG: Analytics authorization check:`, {
        analyticsSend,
        analyticsError,
        requestedUserId: whopUserId,
        storedUserId: analyticsSend?.whop_user_id
      })
      
      if (analyticsSend && analyticsSend.whop_user_id === whopUserId) {
        hasAccess = true
        console.log(`🔍 DEBUG: Access granted via email_analytics_sends`)
      }
    }
    
    if (!hasAccess) {
      return { success: false, error: 'Broadcast not found or access denied' }
    }
    
    // Get click events from centralized email_click_events table
    // Query by resend_broadcast_id since that's the consistent identifier
    console.log(`🔍 DEBUG: Querying email_click_events for resend_broadcast_id: ${broadcastId}`)
    const { data: clickEvents, error: clickEventsError } = await supabase
      .from('email_click_events')
      .select('*')
      .eq('resend_broadcast_id', broadcastId)
      .order('clicked_at', { ascending: false })
    
    console.log(`🔍 DEBUG: Raw click events data:`, clickEvents)
    
    if (clickEventsError) {
      console.error('Error querying email_click_events:', clickEventsError)
      return { success: false, error: 'Failed to fetch click events' }
    }
    
    console.log(`🔍 DEBUG: Found ${clickEvents?.length || 0} click events in centralized table`)
    
    const formattedEvents = (clickEvents || []).map(event => {
      // Check if the clicked link is an unsubscribe link and show generic text
      let displayLink = event.clicked_link;
      if (event.clicked_link && event.clicked_link.includes('unsubscribe.resend.com')) {
        displayLink = 'Unsubscribe link clicked';
      } else if (event.clicked_link && event.clicked_link.includes('unsubscribe')) {
        displayLink = 'Unsubscribe link clicked';
      }
      
      // Detect device type from user agent
      let deviceType = 'Unknown';
      const userAgent = event.user_agent || '';
      
      if (userAgent.includes('iPhone')) {
        deviceType = 'iPhone';
      } else if (userAgent.includes('iPad')) {
        deviceType = 'iPad';
      } else if (userAgent.includes('Android')) {
        deviceType = 'Android';
      } else if (userAgent.includes('Macintosh')) {
        deviceType = 'Mac';
      } else if (userAgent.includes('Windows')) {
        deviceType = 'Windows';
      } else if (userAgent.includes('Linux')) {
        deviceType = 'Linux';
      } else if (userAgent.includes('Mobile')) {
        deviceType = 'Mobile';
      } else if (userAgent.includes('Tablet')) {
        deviceType = 'Tablet';
      }
      
      return {
        id: event.id,
        recipientEmail: event.recipient_email,
        clickedLink: event.clicked_link, // Keep original for reference
        displayLink: displayLink, // Add display version
        ipAddress: event.ip_address,
        userAgent: event.user_agent || 'Unknown',
        deviceType: deviceType,
        clickedAt: event.clicked_at || event.created_at || new Date().toISOString(),
        location: null // Will be populated by geolocation function
      };
    });

    // Fetch location data for all IP addresses
    const eventsWithLocation = await Promise.all(
      formattedEvents.map(async (event) => {
        try {
          if (event.ipAddress && event.ipAddress !== 'Unknown') {
            const locationResponse = await fetch(`https://api.ipinfo.io/lite/${event.ipAddress}?token=21184166de3796`);
            if (locationResponse.ok) {
              const locationData = await locationResponse.json();
              return {
                ...event,
                location: {
                  country: locationData.country || 'Unknown',
                  country_code: locationData.country_code || 'Unknown',
                  continent: locationData.continent || 'Unknown',
                  continent_code: locationData.continent_code || 'Unknown',
                  as_name: locationData.as_name || 'Unknown'
                }
              };
            }
          }
        } catch (error) {
          console.error('Error fetching location for IP:', event.ipAddress, error);
        }
        return event;
      })
    );
    
    return { success: true, data: eventsWithLocation }
  } catch (error) {
    console.error('Error in getBroadcastClickEvents:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch click events' 
    }
  }
} 