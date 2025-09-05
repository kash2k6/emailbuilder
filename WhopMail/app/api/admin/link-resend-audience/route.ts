import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { audienceId, resendAudienceId, notes } = await request.json()

    if (!audienceId || !resendAudienceId) {
      return NextResponse.json({ error: 'Missing audience ID or Resend audience ID' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update the audience with Resend ID and activate it
    const { error: audienceError } = await supabase
      .from('email_audiences')
      .update({
        audience_id: resendAudienceId,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', audienceId)

    if (audienceError) {
      console.error('Error updating audience:', audienceError)
      return NextResponse.json({ error: 'Failed to update audience' }, { status: 500 })
    }

    // Update the notification status
    const { error: notificationError } = await supabase
      .from('admin_notifications')
      .update({
        status: 'completed',
        resend_audience_id: resendAudienceId,
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('audience_id', audienceId)

    if (notificationError) {
      console.error('Error updating notification:', notificationError)
    }

    console.log(`✅ Linked Resend audience ${resendAudienceId} to audience ${audienceId}`)

    return NextResponse.json({
      success: true,
      message: 'Resend audience linked successfully'
    })

  } catch (error) {
    console.error('Error linking Resend audience:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
