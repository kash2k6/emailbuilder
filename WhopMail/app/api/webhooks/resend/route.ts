import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Resend webhook event types
interface ResendWebhookEvent {
  type: 'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.complained' | 'email.unsubscribed'
  data: {
    id: string
    email: string
    created_at: string
    [key: string]: any
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received Resend webhook:', body)

    // Verify this is a valid Resend webhook
    if (!body || !Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid webhook format' }, { status: 400 })
    }

    const supabase = createClient()

    // Process each event in the webhook
    for (const event of body) {
      await processResendEvent(supabase, event)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error processing Resend webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processResendEvent(supabase: any, event: ResendWebhookEvent) {
  try {
    console.log(`Processing Resend event: ${event.type} for email: ${event.data.email}`)

    // Find which user this email belongs to by looking up the email in our system
    const { data: contactData, error: contactError } = await supabase
      .from('email_contacts')
      .select(`
        email_audiences!inner(
          email_platform_configs!inner(whop_user_id)
        )
      `)
      .eq('email', event.data.email)
      .single()

    if (contactError || !contactData) {
      console.log(`No contact found for email: ${event.data.email}`)
      return
    }

    const whopUserId = contactData.email_audiences.email_platform_configs.whop_user_id
    console.log(`Found user: ${whopUserId} for email: ${event.data.email}`)

    // Find active webhooks for this user that are subscribed to this event type
    const { data: webhooks, error: webhooksError } = await supabase
      .from('user_webhooks')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)
      .contains('events', [event.type])

    if (webhooksError || !webhooks || webhooks.length === 0) {
      console.log(`No active webhooks found for user: ${whopUserId} and event: ${event.type}`)
      return
    }

    console.log(`Found ${webhooks.length} webhooks for user: ${whopUserId}`)

    // Forward event to each user webhook
    for (const webhook of webhooks) {
      await forwardEventToUserWebhook(supabase, webhook, event)
    }

  } catch (error) {
    console.error('Error processing Resend event:', error)
  }
}

async function forwardEventToUserWebhook(supabase: any, webhook: any, event: ResendWebhookEvent) {
  try {
    console.log(`Forwarding event to user webhook: ${webhook.webhook_url}`)

    // Prepare the event data for the user
    const userEventData = {
      event_type: event.type,
      timestamp: event.data.created_at,
      email: event.data.email,
      email_id: event.data.id,
      data: event.data,
      source: 'resend',
      webhook_id: webhook.id
    }

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

    // Record the webhook event
    await supabase
      .from('webhook_events')
      .insert({
        user_webhook_id: webhook.id,
        event_type: event.type,
        event_data: userEventData,
        resend_event_id: event.data.id,
        email_id: event.data.id,
        member_email: event.data.email,
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

    console.log(`Event forwarded to ${webhook.webhook_url}: ${status}`)

  } catch (error) {
    console.error(`Error forwarding event to webhook ${webhook.webhook_url}:`, error)
    
    // Record the failure
    await supabase
      .from('webhook_events')
      .insert({
        user_webhook_id: webhook.id,
        event_type: event.type,
        event_data: { error: error.message },
        resend_event_id: event.data.id,
        email_id: event.data.id,
        member_email: event.data.email,
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

function generateWebhookSignature(data: any, secret: string): string {
  // Simple HMAC signature for webhook verification
  const crypto = require('crypto')
  const payload = JSON.stringify(data)
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}
