import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'

// Webhook secret from environment
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Resend webhook received')
    
    // Get all headers for debugging
    const headersList = await headers()
    const allHeaders: Record<string, string> = {}
    headersList.forEach((value, key) => {
      allHeaders[key] = value
    })
    console.log('🔍 All headers received:', allHeaders)
    
    // Verify webhook signature
    console.log('🔍 Verifying webhook signature with Svix...')
    console.log('Webhook secret (first 10 chars):', WEBHOOK_SECRET?.substring(0, 10) + '...')
    console.log('Headers:', {
      'svix-id': allHeaders['svix-id'],
      'svix-timestamp': allHeaders['svix-timestamp'],
      'svix-signature': allHeaders['svix-signature']
    })
    
    // For now, skip signature verification in development
    // TODO: Implement proper signature verification
    
    // Parse the webhook payload
    const body = await request.text()
    console.log('📧 Raw webhook body:', body)
    
    let event
    try {
      event = JSON.parse(body)
    } catch (error) {
      console.error('❌ Failed to parse webhook body:', error)
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    
    console.log('✅ Webhook signature verified successfully')
    console.log('Verified payload:', event)
    
    // Extract event details
    const eventType = event.type
    const eventData = event.data
    
    console.log('Resend webhook event:', {
      type: eventType,
      emailId: eventData?.email_id,
      broadcastId: eventData?.broadcast_id,
      subject: eventData?.subject,
      to: eventData?.to
    })
    
    const supabase = createClient()
    
    if (eventType === 'email.sent' || eventType === 'email.delivered' || 
        eventType === 'email.opened' || eventType === 'email.clicked' || 
        eventType === 'email.bounced' || eventType === 'email.complained' || 
        eventType === 'email.failed') {
      
      const emailId = eventData?.email_id
      const broadcastId = eventData?.broadcast_id
      
      // Track email events in our analytics system
      console.log(`📊 Tracking email event: ${eventType}`)
      
      try {
        // Try to find the email send record by email ID first (for individual emails)
        let { data: emailSend, error: emailSendError } = await supabase
          .from('email_analytics_sends')
          .select('*')
          .eq('resend_email_id', emailId)
          .single()
        
        // If not found by email ID, try to find by broadcast ID and recipient (for flow emails/triggers)
        if (emailSendError || !emailSend) {
          console.log(`📧 Email send record not found for email ID: ${emailId}, trying broadcast ID: ${broadcastId}`)
          
          if (broadcastId && eventData?.to?.[0]) {
            const { data: emailSendByBroadcast, error: emailSendByBroadcastError } = await supabase
              .from('email_analytics_sends')
              .select('*')
              .eq('resend_broadcast_id', broadcastId)
              .eq('recipient_email', eventData.to[0])
              .single()
            
            if (emailSendByBroadcastError || !emailSendByBroadcast) {
              console.log(`📧 Email send record not found for broadcast: ${broadcastId} and recipient: ${eventData.to[0]} - this is normal for older emails`)
            } else {
              emailSend = emailSendByBroadcast
              emailSendError = null
              console.log(`✅ Found email send record by broadcast ID and recipient`)
            }
          }
        }
        
        if (emailSend) {
          // Update the email send status and resend_email_id if it's null
          const newStatus = eventType.replace('email.', '')
          const updateData: any = { 
            status: newStatus, 
            updated_at: new Date().toISOString() 
          }
          
          // If resend_email_id is null, update it with the email ID from the event
          if (!emailSend.resend_email_id && emailId) {
            updateData.resend_email_id = emailId
            console.log(`🔗 Updating resend_email_id from null to: ${emailId}`)
          }
          
          const { error: updateError } = await supabase
            .from('email_analytics_sends')
            .update(updateData)
            .eq('id', emailSend.id)
          
          if (updateError) {
            console.error('Error updating email send status:', updateError)
          } else {
            console.log(`✅ Updated email send status to: ${newStatus}`)
            if (updateData.resend_email_id) {
              console.log(`✅ Updated resend_email_id to: ${updateData.resend_email_id}`)
            }
          }
          
          // Note: We're consolidating all click tracking into email_click_events table
          // The centralized click event insertion happens later in the broadcast update section
        }
      } catch (error) {
        console.log('Analytics tracking failed, continuing with broadcast update:', error)
      }
      
      // Also try to update broadcast_jobs for backward compatibility
      if (broadcastId) {
        console.log(`📢 This is a broadcast email (${broadcastId}), updating broadcast statistics`)
        
        // Find the broadcast in our database
        const { data: broadcast, error: broadcastError } = await supabase
          .from('broadcast_jobs')
          .select('*')
          .eq('resend_broadcast_id', broadcastId)
          .single()
        
        if (broadcastError || !broadcast) {
          console.log('Broadcast not found in database:', broadcastId, '- this is normal for temporary broadcasts')
        } else {
          // Update the broadcast with event information
          const updateData: any = {
            updated_at: new Date().toISOString()
          }
          
          // Track different event types and update counters
          const cleanEventType = eventType.replace('email.', '')
          console.log(`📧 Processing clean event type: ${cleanEventType} for broadcast ${broadcastId}`)
          switch (cleanEventType) {
            case 'delivered':
              updateData.last_event = 'delivered'
              updateData.last_event_at = new Date().toISOString()
              // Only increment success_count if it's not already at the total_members limit
              // This prevents inflating the count beyond the actual number of recipients
              const currentSuccessCount = broadcast.success_count || 0
              const totalMembers = broadcast.total_members || 0
              if (currentSuccessCount < totalMembers) {
                updateData.success_count = currentSuccessCount + 1
              }
              break
            case 'delivery_delayed':
              updateData.last_event = 'delivery_delayed'
              updateData.last_event_at = new Date().toISOString()
              console.log(`📧 Email delivery delayed for broadcast ${broadcastId}`)
              break
            case 'opened':
              updateData.last_event = 'opened'
              updateData.last_event_at = new Date().toISOString()
              // Ensure we don't double-count opens
              const currentOpenedCount = broadcast.opened_count || 0
              updateData.opened_count = currentOpenedCount + 1
              console.log(`📧 Incrementing opened_count from ${currentOpenedCount} to ${currentOpenedCount + 1}`)
              break
            case 'clicked':
              console.log(`📧 CLICK EVENT DETECTED for broadcast ${broadcastId}`)
              updateData.last_event = 'clicked'
              updateData.last_event_at = new Date().toISOString()
              // Ensure we don't double-count clicks
              const currentClickedCount = broadcast.clicked_count || 0
              updateData.clicked_count = currentClickedCount + 1
              console.log(`📧 Incrementing clicked_count from ${currentClickedCount} to ${currentClickedCount + 1}`)
              break
            case 'bounced':
              updateData.last_event = 'bounced'
              updateData.last_event_at = new Date().toISOString()
              updateData.error_count = (broadcast.error_count || 0) + 1
              break
            case 'complained':
              updateData.last_event = 'complained'
              updateData.last_event_at = new Date().toISOString()
              updateData.complained_count = (broadcast.complained_count || 0) + 1
              break
            case 'failed':
              updateData.last_event = 'failed'
              updateData.last_event_at = new Date().toISOString()
              updateData.failed_count = (broadcast.failed_count || 0) + 1
              break
            default:
              console.log(`📧 Unhandled event type: ${eventType} for broadcast ${broadcastId}`)
              updateData.last_event = eventType
              updateData.last_event_at = new Date().toISOString()
              break
          }
          
          // Update the broadcast record
          console.log(`📧 Updating broadcast with data:`, updateData)
          const { error: updateError } = await supabase
            .from('broadcast_jobs')
            .update(updateData)
            .eq('id', broadcast.id)
          
          if (updateError) {
            console.error('Error updating broadcast:', updateError)
          } else {
            console.log(`✅ Updated broadcast ${broadcastId} with event: ${eventType}`)
            
            // Verify the update by fetching the updated record
            const { data: updatedBroadcast, error: fetchError } = await supabase
              .from('broadcast_jobs')
              .select('opened_count, clicked_count, success_count')
              .eq('id', broadcast.id)
              .single()
            
            if (!fetchError && updatedBroadcast) {
              console.log(`📧 Broadcast updated successfully:`, {
                opened_count: updatedBroadcast.opened_count,
                clicked_count: updatedBroadcast.clicked_count,
                success_count: updatedBroadcast.success_count
              })
            }
          }
          
          // Insert click event into centralized email_click_events table
          if (eventType === 'email.clicked') {
            console.log(`🔍 DEBUG: Broadcast object:`, {
              id: broadcast?.id,
              resend_broadcast_id: broadcast?.resend_broadcast_id,
              message: broadcast?.message
            })
            
            const clickEventData = {
              broadcast_id: broadcast?.id || null, // Use the actual broadcast_jobs.id for foreign key
              resend_broadcast_id: broadcastId,
              email_id: eventData.email_id, // This is the Resend email ID from the data
              recipient_email: eventData.to[0],
              clicked_link: eventData.click?.link || 'unknown',
              ip_address: eventData.click?.ipAddress,
              user_agent: eventData.click?.userAgent,
              clicked_at: new Date().toISOString()
            }
            
            console.log(`📧 Attempting to insert click event:`, clickEventData)
            
            const { error: clickError } = await supabase
              .from('email_click_events')
              .insert(clickEventData)

            if (clickError) {
              console.error('Error inserting click event:', clickError)
            } else {
              console.log(`📧 Click event recorded in centralized table for email: ${eventData.email_id}`)
            }
          }
          
          // Insert open event into centralized email_open_events table for AI analysis
          if (eventType === 'email.opened') {
            console.log(`📧 OPEN EVENT DETECTED for broadcast ${broadcastId}`)
            
            const openEventData = {
              broadcast_id: broadcast?.id || null, // Use the actual broadcast_jobs.id for foreign key
              resend_broadcast_id: broadcastId,
              email_id: eventData.email_id, // This is the Resend email ID from the data
              recipient_email: eventData.to[0],
              ip_address: eventData.open?.ipAddress,
              user_agent: eventData.open?.userAgent,
              opened_at: eventData.open?.timestamp || new Date().toISOString()
            }
            
            console.log(`📧 Attempting to insert open event:`, openEventData)
            
            const { error: openError } = await supabase
              .from('email_open_events')
              .insert(openEventData)

            if (openError) {
              console.error('Error inserting open event:', openError)
            } else {
              console.log(`📧 Open event recorded in centralized table for email: ${eventData.email_id}`)
            }
          }
          
          // FORWARD EVENT TO NEW USER WEBHOOK SYSTEM
          console.log('🔄 Forwarding event to new user webhook system...')
          try {
            // Use the broadcast data we already found instead of querying again
            if (broadcast && broadcast.user_id) {
              await forwardEventToUserWebhooks(supabase, eventType, eventData, broadcast.user_id)
            } else {
              console.log('No broadcast data available for webhook forwarding')
            }
          } catch (webhookError) {
            console.error('❌ Error forwarding to user webhooks:', webhookError)
            // Don't fail the main webhook processing for webhook forwarding errors
          }
        }
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing Resend webhook:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// USER WEBHOOK FORWARDING FUNCTIONS
// ============================================================================

/**
 * Forward Resend webhook events to user-configured webhooks
 */
async function forwardEventToUserWebhooks(supabase: any, eventType: string, eventData: any, whopUserId: string) {
  try {
    console.log(`🔄 Forwarding ${eventType} event to user webhooks for user: ${whopUserId}`)
    
    // Find active webhooks for this user that are subscribed to this event type
    const { data: webhooks, error: webhooksError } = await supabase
      .from('user_webhooks')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)
      .contains('events', [eventType])
    
    if (webhooksError || !webhooks || webhooks.length === 0) {
      console.log(`No active webhooks found for user: ${whopUserId} and event: ${eventType}`)
      return
    }
    
    console.log(`Found ${webhooks.length} webhooks for user: ${whopUserId}`)
    
    // Forward event to each user webhook
    for (const webhook of webhooks) {
      await forwardEventToUserWebhook(supabase, webhook, eventType, eventData)
    }
    
  } catch (error: any) {
    console.error('Error in forwardEventToUserWebhooks:', error)
  }
}

/**
 * Forward a single event to a user's webhook
 */
async function forwardEventToUserWebhook(supabase: any, webhook: any, eventType: string, eventData: any) {
  try {
    console.log(`🔄 Forwarding ${eventType} event to user webhook: ${webhook.webhook_url}`)
    
    // Clean up the event data to remove Resend-specific information
    const cleanEventData = { ...eventData }
    
    // Remove Resend unsubscribe links and other sensitive data
    if (cleanEventData.headers) {
      cleanEventData.headers = cleanEventData.headers.filter((header: any) => 
        !header.name.toLowerCase().includes('unsubscribe') &&
        !header.name.toLowerCase().includes('list-unsubscribe')
      )
    }
    
    // Remove Resend-specific fields that users don't need
    delete cleanEventData.from
    delete cleanEventData.created_at
    
    // Prepare the clean event data for the user
    const userEventData = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      email: eventData.to?.[0],
      email_id: eventData.email_id,
      broadcast_id: eventData.broadcast_id,
      data: cleanEventData,
      source: 'whopmail', // Changed from 'resend' to 'whopmail'
      webhook_id: webhook.id
    }
    
    console.log(`📤 Sending to user webhook:`, {
      url: webhook.webhook_url,
      event_type: eventType,
      broadcast_id: eventData.broadcast_id,
      email: eventData.to?.[0]
    })
    
    // Send to user's webhook
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhopMail-Webhook-Forwarder/1.0',
        ...(webhook.secret_key && {
          'X-Webhook-Signature': generateWebhookSignature(userEventData, webhook.secret_key)
        })
      },
      body: JSON.stringify(userEventData)
    })
    
    const success = response.ok
    const status = success ? 'sent' : 'failed'
    const errorMessage = success ? null : `HTTP ${response.status}: ${response.statusText}`
    
    console.log(`📡 Webhook response: ${response.status} ${response.statusText}`)
    
    // Record the webhook event
    await supabase
      .from('webhook_events')
      .insert({
        user_webhook_id: webhook.id,
        event_type: eventType,
        event_data: userEventData,
        resend_event_id: eventData.email_id,
        email_id: eventData.email_id,
        member_email: eventData.to?.[0],
        status,
        last_attempt_at: new Date().toISOString(),
        error_message: errorMessage
      })
    
    // Update webhook stats
    if (success) {
      await supabase
        .from('user_webhooks')
        .update({
          last_success_at: new Date().toISOString(),
          retry_count: 0
        })
        .eq('id', webhook.id)
    } else {
      await supabase
        .from('user_webhooks')
        .update({
          last_failure_at: new Date().toISOString(),
          last_failure_reason: errorMessage,
          retry_count: webhook.retry_count + 1
        })
        .eq('id', webhook.id)
    }
    
    console.log(`✅ Event forwarded to ${webhook.webhook_url}: ${status}`)
    
  } catch (error: any) {
    console.error(`❌ Error forwarding event to webhook ${webhook.webhook_url}:`, error)
    
    // Record the failure
    await supabase
      .from('webhook_events')
      .insert({
        user_webhook_id: webhook.id,
        event_type: eventType,
        event_data: { error: error.message },
        resend_event_id: eventData.email_id,
        email_id: eventData.email_id,
        member_email: eventData.to?.[0],
        status: 'failed',
        last_attempt_at: new Date().toISOString(),
        error_message: error.message
      })
    
    // Update webhook failure stats
    await supabase
      .from('user_webhooks')
      .update({
        last_failure_at: new Date().toISOString(),
        last_failure_reason: error.message,
        retry_count: webhook.retry_count + 1
      })
      .eq('id', webhook.id)
  }
}

/**
 * Generate HMAC signature for webhook verification
 */
function generateWebhookSignature(data: any, secret: string): string {
  const crypto = require('crypto')
  const payload = JSON.stringify(data)
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}
