import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const broadcastId = searchParams.get('broadcastId')
    
    if (!broadcastId) {
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 })
    }

    const supabase = createClient()
    
    // Query all relevant tables
    const results = {
      broadcast_jobs: null,
      email_analytics_sends: null,
      email_click_events: null,
      email_analytics_clicks: null,
      email_analytics_events: null,
      email_events: null,
      sent_emails: null
    }

    // 1. Check broadcast_jobs
    const { data: broadcastJobs, error: broadcastError } = await supabase
      .from('broadcast_jobs')
      .select('*')
      .eq('resend_broadcast_id', broadcastId)
    
    results.broadcast_jobs = { data: broadcastJobs, error: broadcastError }

    // 2. Check email_analytics_sends
    const { data: analyticsSends, error: analyticsError } = await supabase
      .from('email_analytics_sends')
      .select('*')
      .eq('resend_broadcast_id', broadcastId)
    
    results.email_analytics_sends = { data: analyticsSends, error: analyticsError }

    // 3. Check email_click_events
    const { data: clickEvents, error: clickError } = await supabase
      .from('email_click_events')
      .select('*')
      .eq('resend_broadcast_id', broadcastId)
    
    results.email_click_events = { data: clickEvents, error: clickError }

    // 4. Check email_analytics_clicks
    const { data: analyticsClicks, error: analyticsClicksError } = await supabase
      .from('email_analytics_clicks')
      .select('*')
      .eq('resend_broadcast_id', broadcastId)
    
    results.email_analytics_clicks = { data: analyticsClicks, error: analyticsClicksError }

    // 5. Check email_analytics_events for clicked events
    const { data: analyticsEvents, error: analyticsEventsError } = await supabase
      .from('email_analytics_events')
      .select('*')
      .eq('event_type', 'clicked')
    
    // Filter events that belong to this broadcast
    const filteredAnalyticsEvents = analyticsEvents?.filter(event => {
      // Check if this event belongs to our broadcast
      return event.event_data?.broadcast_id === broadcastId || 
             event.event_data?.resend_broadcast_id === broadcastId
    })
    
    results.email_analytics_events = { 
      data: filteredAnalyticsEvents, 
      error: analyticsEventsError,
      total_events: analyticsEvents?.length || 0
    }

    // 6. Check email_events for clicked events
    const { data: emailEvents, error: emailEventsError } = await supabase
      .from('email_events')
      .select('*')
      .eq('event_type', 'clicked')
    
    results.email_events = { 
      data: emailEvents, 
      error: emailEventsError,
      total_events: emailEvents?.length || 0
    }

    // 7. Check sent_emails to understand the relationship
    const { data: sentEmails, error: sentEmailsError } = await supabase
      .from('sent_emails')
      .select('*')
      .eq('source_id', broadcastId)
    
    results.sent_emails = { data: sentEmails, error: sentEmailsError }

    return NextResponse.json({
      success: true,
      broadcastId,
      results
    })

  } catch (error) {
    console.error('Error in debug broadcast data API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
