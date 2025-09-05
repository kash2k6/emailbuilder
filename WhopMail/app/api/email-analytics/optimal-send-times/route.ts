import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')
    
    if (!whopUserId) {
      return NextResponse.json({ error: 'whopUserId is required' }, { status: 400 })
    }

    const supabase = createClient()



    // Get all engagement events (opens and clicks) for this user's broadcasts
    // First, get the user's broadcasts
    const { data: userBroadcasts, error: userBroadcastsError } = await supabase
      .from('broadcast_jobs')
      .select('id')
      .eq('user_id', whopUserId)

    if (userBroadcastsError) {
      console.error('Error fetching user broadcasts:', userBroadcastsError)
      return NextResponse.json({ error: 'Failed to fetch user broadcasts' }, { status: 500 })
    }

    const broadcastIds = userBroadcasts?.map(b => b.id) || []

    if (broadcastIds.length === 0) {
      return NextResponse.json({
        message: 'No broadcasts found. Send some emails to get AI recommendations.',
        recommendations: {
          bestDays: [],
          bestHours: [],
          bestTimeZones: [],
          totalOpens: 0,
          totalClicks: 0,
          dataPoints: 0
        }
      })
    }

    // Get all open events for this user's broadcasts
    const { data: openEvents, error: openEventsError } = await supabase
      .from('email_open_events')
      .select(`
        opened_at,
        recipient_email,
        broadcast_id,
        broadcast_jobs!inner(
          id,
          user_id,
          created_at
        )
      `)
      .in('broadcast_id', broadcastIds)
      .gte('opened_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('opened_at', { ascending: false })

    // Get all click events for this user's broadcasts
    const { data: clickEvents, error: clickEventsError } = await supabase
      .from('email_click_events')
      .select(`
        clicked_at,
        recipient_email,
        broadcast_id,
        clicked_link,
        broadcast_jobs!inner(
          id,
          user_id,
          created_at
        )
      `)
      .in('broadcast_id', broadcastIds)
      .gte('clicked_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('clicked_at', { ascending: false })

    if (openEventsError || clickEventsError) {
      console.error('Error fetching events:', { openEventsError, clickEventsError })
      return NextResponse.json({ error: 'Failed to fetch engagement events' }, { status: 500 })
    }

    const totalOpens = openEvents?.length || 0
    const totalClicks = clickEvents?.length || 0
    const totalEngagement = totalOpens + totalClicks

    if (totalEngagement === 0) {
      return NextResponse.json({
        message: 'No engagement data available yet. Send more emails to get AI recommendations.',
        recommendations: {
          bestDays: [],
          bestHours: [],
          bestTimeZones: [],
          totalOpens: 0,
          totalClicks: 0,
          dataPoints: 0
        }
      })
    }

    // Analyze the data (both opens and clicks)
    const analysis = analyzeEngagementEvents(openEvents || [], clickEvents || [])

    return NextResponse.json({
      recommendations: analysis,
      totalOpens,
      totalClicks,
      dataPoints: totalEngagement
    })

  } catch (error) {
    console.error('Error analyzing optimal send times:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function analyzeEngagementEvents(openEvents: any[], clickEvents: any[]) {
  // Group engagement events by day of week and hour
  const dayOfWeekCounts: { [key: string]: number } = {}
  const hourCounts: { [key: string]: number } = {}
  const timeZoneCounts: { [key: string]: number } = {}
  const engagementTypeCounts: { [key: string]: number } = { opens: 0, clicks: 0 }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Process open events
  openEvents.forEach(event => {
    const openedAt = new Date(event.opened_at)
    const dayOfWeek = dayNames[openedAt.getDay()]
    const hour = openedAt.getHours()
    const hourKey = `${hour}:00`

    // Count by day of week
    dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1

    // Count by hour
    hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1

    // Count engagement type
    engagementTypeCounts.opens = (engagementTypeCounts.opens || 0) + 1

    // Estimate timezone based on hour (simplified - assumes most engagement happens during business hours)
    if (hour >= 9 && hour <= 17) {
      timeZoneCounts['Business Hours'] = (timeZoneCounts['Business Hours'] || 0) + 1
    } else if (hour >= 18 && hour <= 22) {
      timeZoneCounts['Evening'] = (timeZoneCounts['Evening'] || 0) + 1
    } else {
      timeZoneCounts['Late Night/Early Morning'] = (timeZoneCounts['Late Night/Early Morning'] || 0) + 1
    }
  })

  // Process click events
  clickEvents.forEach(event => {
    const clickedAt = new Date(event.clicked_at)
    const dayOfWeek = dayNames[clickedAt.getDay()]
    const hour = clickedAt.getHours()
    const hourKey = `${hour}:00`

    // Count by day of week
    dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1

    // Count by hour
    hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1

    // Count engagement type
    engagementTypeCounts.clicks = (engagementTypeCounts.clicks || 0) + 1

    // Estimate timezone based on hour
    if (hour >= 9 && hour <= 17) {
      timeZoneCounts['Business Hours'] = (timeZoneCounts['Business Hours'] || 0) + 1
    } else if (hour >= 18 && hour <= 22) {
      timeZoneCounts['Evening'] = (timeZoneCounts['Evening'] || 0) + 1
    } else {
      timeZoneCounts['Late Night/Early Morning'] = (timeZoneCounts['Late Night/Early Morning'] || 0) + 1
    }
  })

  const totalEngagement = openEvents.length + clickEvents.length

  // Find best days (top 3)
  const bestDays = Object.entries(dayOfWeekCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([day, count]) => ({
      day,
      count,
      percentage: Math.round((count / totalEngagement) * 100)
    }))

  // Find best hours (top 5)
  const bestHours = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([hour, count]) => ({
      hour,
      count,
      percentage: Math.round((count / totalEngagement) * 100)
    }))

  // Find best time zones
  const bestTimeZones = Object.entries(timeZoneCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([timeZone, count]) => ({
      timeZone,
      count,
      percentage: Math.round((count / totalEngagement) * 100)
    }))

  // Calculate optimal send times (2-3 hours before peak open times)
  const optimalSendTimes = bestHours.map(({ hour }) => {
    const hourNum = parseInt(hour.split(':')[0])
    const sendHour = (hourNum - 2 + 24) % 24 // 2 hours before
    return {
      sendTime: `${sendHour}:00`,
      targetOpenTime: hour,
      reasoning: `Send at ${sendHour}:00 to target opens around ${hour}`
    }
  })

  return {
    bestDays,
    bestHours,
    bestTimeZones,
    optimalSendTimes,
    insights: generateInsights(dayOfWeekCounts, hourCounts, totalEngagement, engagementTypeCounts)
  }
}

function generateInsights(dayCounts: { [key: string]: number }, hourCounts: { [key: string]: number }, totalEngagement: number, engagementTypeCounts: { [key: string]: number }) {
  const insights = []

  // Day insights
  const topDay = Object.entries(dayCounts).sort(([,a], [,b]) => b - a)[0]
  if (topDay) {
    insights.push(`${topDay[0]} is your best performing day with ${Math.round((topDay[1] / totalEngagement) * 100)}% of engagement`)
  }

  // Hour insights
  const topHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0]
  if (topHour) {
    insights.push(`Peak engagement time is ${topHour[0]} with ${Math.round((topHour[1] / totalEngagement) * 100)}% of engagement`)
  }

  // Business hours insight
  const businessHours = Object.entries(hourCounts)
    .filter(([hour]) => {
      const hourNum = parseInt(hour.split(':')[0])
      return hourNum >= 9 && hourNum <= 17
    })
    .reduce((sum, [, count]) => sum + count, 0)

  const businessHoursPercentage = Math.round((businessHours / totalEngagement) * 100)
  insights.push(`${businessHoursPercentage}% of engagement happens during business hours (9 AM - 5 PM)`)

  // Engagement type insights
  const openPercentage = Math.round((engagementTypeCounts.opens / totalEngagement) * 100)
  const clickPercentage = Math.round((engagementTypeCounts.clicks / totalEngagement) * 100)
  insights.push(`Your emails generate ${openPercentage}% opens and ${clickPercentage}% clicks`)

  return insights
}
