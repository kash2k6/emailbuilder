import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const broadcastId = searchParams.get('broadcastId')

    if (!broadcastId) {
      return NextResponse.json({ error: 'broadcastId is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Check if this broadcast exists in our database
    const { data: broadcast, error } = await supabase
      .from('broadcast_jobs')
      .select('*')
      .eq('resend_broadcast_id', broadcastId)
      .single()

    if (error || !broadcast) {
      return NextResponse.json({
        exists: false,
        broadcastId,
        message: 'Broadcast not found in database'
      })
    }

    return NextResponse.json({
      exists: true,
      broadcastId,
      data: {
        id: broadcast.id,
        resend_broadcast_id: broadcast.resend_broadcast_id,
        subject: broadcast.message,
        status: broadcast.status,
        total_members: broadcast.total_members,
        success_count: broadcast.success_count,
        error_count: broadcast.error_count,
        opened_count: broadcast.opened_count,
        clicked_count: broadcast.clicked_count,
        complained_count: broadcast.complained_count,
        failed_count: broadcast.failed_count,
        last_event: broadcast.last_event,
        last_event_at: broadcast.last_event_at,
        created_at: broadcast.created_at,
        completed_at: broadcast.completed_at
      }
    })

  } catch (error) {
    console.error('Error checking broadcast:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
