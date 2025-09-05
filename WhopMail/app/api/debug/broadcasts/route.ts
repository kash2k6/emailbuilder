import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')
    
    if (!whopUserId) {
      return NextResponse.json({ success: false, error: 'whopUserId is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get ALL broadcasts for this user (not just recent ones)
    const { data: broadcasts, error: broadcastsError } = await supabase
      .from('broadcast_jobs')
      .select('*')
      .eq('user_id', whopUserId)
      .order('created_at', { ascending: false })

    if (broadcastsError) {
      console.error('Error fetching broadcasts:', broadcastsError)
      return NextResponse.json({ success: false, error: 'Failed to fetch broadcasts' }, { status: 500 })
    }

    // Also get broadcasts with resend_broadcast_id (what analytics shows)
    const { data: trackedBroadcasts, error: trackedError } = await supabase
      .from('broadcast_jobs')
      .select('*')
      .eq('user_id', whopUserId)
      .not('resend_broadcast_id', 'is', null)
      .order('created_at', { ascending: false })

    if (trackedError) {
      console.error('Error fetching tracked broadcasts:', trackedError)
      return NextResponse.json({ success: false, error: 'Failed to fetch tracked broadcasts' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        allBroadcasts: broadcasts || [],
        trackedBroadcasts: trackedBroadcasts || [],
        totalBroadcasts: broadcasts?.length || 0,
        trackedBroadcasts: trackedBroadcasts?.length || 0,
        untrackedBroadcasts: (broadcasts?.length || 0) - (trackedBroadcasts?.length || 0)
      }
    })

  } catch (error) {
    console.error('Error in debug broadcasts API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
