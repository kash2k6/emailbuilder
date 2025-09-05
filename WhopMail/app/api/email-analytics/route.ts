import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getEmailAnalytics, getEmailAnalyticsFromResend, syncRecentEmailsWithResend, syncBroadcastStatsFromResend } from '@/app/actions/email-tracking'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')
    
    if (!whopUserId) {
      return NextResponse.json({ success: false, error: 'whopUserId is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get user's email platform config
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (configError || !config) {
      return NextResponse.json({ success: false, error: 'Email platform not configured' }, { status: 400 })
    }

    // Note: Broadcast statistics are automatically tracked via webhooks
    // No need to sync with Resend API - all data is already in our database
    console.log('Broadcast statistics are tracked via webhooks - no API sync needed')

    // Get analytics data directly from Resend API (real-time data)
    const emailAnalyticsResult = await getEmailAnalyticsFromResend(whopUserId)
    
    if (!emailAnalyticsResult.success) {
      console.error('Email analytics error:', emailAnalyticsResult.error)
      return NextResponse.json({ success: false, error: emailAnalyticsResult.error }, { status: 500 })
    }

    const analyticsData = emailAnalyticsResult.data
    if (!analyticsData) {
      return NextResponse.json({ success: false, error: 'No analytics data available' }, { status: 500 })
    }
    
    // Get additional data from database
    const [
      { data: flows, error: flowsError },
      { data: templates, error: templatesError }
    ] = await Promise.all([
      supabase
        .from('automation_workflows')
        .select('*')
        .eq('config_id', config.id),
      supabase
        .from('email_templates')
        .select('*')
        .eq('config_id', config.id)
    ])

    if (flowsError || templatesError) {
      console.error('Error fetching analytics data:', { flowsError, templatesError })
      return NextResponse.json({ success: false, error: 'Failed to fetch analytics data' }, { status: 500 })
    }

    // Calculate analytics metrics
    const totalFlows = flows?.length || 0
    const activeFlows = flows?.filter(f => f.is_active).length || 0
    const totalTemplates = templates?.length || 0

    // Calculate flow performance
    const totalTriggered = flows?.reduce((sum, flow) => sum + (flow.total_triggered || 0), 0) || 0
    const totalCompleted = flows?.reduce((sum, flow) => sum + (flow.total_completed || 0), 0) || 0
    const totalFailed = flows?.reduce((sum, flow) => sum + (flow.total_failed || 0), 0) || 0

    // Calculate success rates
    const flowSuccessRate = totalTriggered > 0 ? (totalCompleted / totalTriggered) * 100 : 0

    // Get recent activity
    const recentFlows = flows?.slice(0, 5).map(flow => ({
      id: flow.id,
      name: flow.name,
      trigger_type: flow.trigger_type,
      total_triggered: flow.total_triggered || 0,
      total_completed: flow.total_completed || 0,
      is_active: flow.is_active,
      created_at: flow.created_at
    })) || []

    const recentBroadcasts = analyticsData.recentBroadcasts?.slice(0, 5).map(broadcast => ({
      id: broadcast.id,
      resendBroadcastId: broadcast.resendBroadcastId,
      subject: broadcast.subject,
      status: broadcast.status,
      messages_sent: broadcast.delivered || 0,
      messages_failed: broadcast.bounced || 0,
      created_at: broadcast.createdAt
    })) || []

    // Use analytics data directly from Resend
    const emailAnalytics = analyticsData

    const analytics = {
      overview: {
        totalFlows,
        activeFlows,
        totalTemplates,
        totalTriggered,
        totalCompleted,
        totalFailed,
        // Email analytics from Resend
        totalSent: emailAnalytics.totalSent,
        totalDelivered: emailAnalytics.totalDelivered,
        totalPending: emailAnalytics.totalPending,
        opened: emailAnalytics.opened,
        clicked: emailAnalytics.clicked,
        bounced: emailAnalytics.bounced,
        complained: emailAnalytics.complained,
        failed: emailAnalytics.failed,
        deliveryRate: emailAnalytics.deliveryRate
      },
      performance: {
        flowSuccessRate: Math.round(flowSuccessRate * 100) / 100,
        // Email performance from Resend
        openRate: emailAnalytics.openRate,
        clickRate: emailAnalytics.clickRate,
        bounceRate: emailAnalytics.bounceRate,
        complaintRate: emailAnalytics.complaintRate,
        deliveryRate: emailAnalytics.deliveryRate
      },
      recentActivity: {
        flows: recentFlows,
        broadcasts: recentBroadcasts,
        emails: emailAnalytics.recentBroadcasts
      },
      syncInfo: {
        syncedCount: 0, // No sync needed - data comes from webhooks
        lastSync: new Date().toISOString()
      }
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error) {
    console.error('Error in email analytics API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
} 