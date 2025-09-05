import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { listName, memberCount = 0 } = await request.json()

    if (!listName) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Find the audience by name
    const { data: audience, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('name', listName)
      .single()

    if (audienceError || !audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 })
    }

    console.log(`🔧 Marking audience "${listName}" as ready`)

    // Update the audience status to ready
    const { error: updateError } = await supabase
      .from('email_audiences')
      .update({
        member_count: memberCount,
        platform_audience_data: {
          source: 'instant_creation',
          created_at: new Date().toISOString(),
          export_ready: true,
          processing: false,
          total_members_expected: memberCount,
          resend_synced: true,
          resend_audience_id: audience.audience_id
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', audience.id)

    if (updateError) {
      console.error('Error updating audience:', updateError)
      return NextResponse.json({ error: 'Failed to update audience' }, { status: 500 })
    }

    // Update the admin notification status
    const { error: notificationError } = await supabase
      .from('admin_notifications')
      .update({
        status: 'completed',
        notes: `List marked as ready with ${memberCount} members. Ready for email campaigns.`,
        updated_at: new Date().toISOString()
      })
      .eq('audience_id', audience.id)
      .eq('type', 'instant_list_created')

    if (notificationError) {
      console.error('Error updating notification:', notificationError)
      // Don't fail the request if notification update fails
    }

    console.log(`✅ Successfully marked "${listName}" as ready`)

    return NextResponse.json({
      success: true,
      audienceId: audience.id,
      memberCount,
      message: `Successfully marked "${listName}" as ready with ${memberCount} members`
    })

  } catch (error) {
    console.error('Error marking list as ready:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
