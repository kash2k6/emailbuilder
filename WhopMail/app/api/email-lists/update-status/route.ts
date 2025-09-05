import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audienceId, memberCount, status = 'ready', resendAudienceId } = body

    if (!audienceId) {
      return NextResponse.json({ error: 'audienceId is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Update the audience with the new member count and status
    const updateData: any = {
      member_count: memberCount || 0,
      updated_at: new Date().toISOString()
    }

    // If resendAudienceId is provided, update it
    if (resendAudienceId) {
      updateData.audience_id = resendAudienceId
    }

    // Update the platform_audience_data to reflect the new status
    updateData.platform_audience_data = {
      source: 'instant_creation',
      created_at: new Date().toISOString(),
      export_ready: status === 'ready',
      processing: status === 'processing',
      total_members_expected: memberCount || 0,
      resend_synced: status === 'ready',
      resend_audience_id: resendAudienceId || null
    }

    const { data, error } = await supabase
      .from('email_audiences')
      .update(updateData)
      .eq('id', audienceId)
      .select()

    if (error) {
      console.error('Error updating audience status:', error)
      return NextResponse.json({ error: 'Failed to update audience status' }, { status: 500 })
    }

    // Also update the admin notification status
    const { error: notificationError } = await supabase
      .from('admin_notifications')
      .update({
        status: status === 'ready' ? 'completed' : status,
        notes: status === 'ready' 
          ? `List marked as ready with ${memberCount} members. Ready for email campaigns.`
          : `List status updated to ${status}`,
        updated_at: new Date().toISOString()
      })
      .eq('audience_id', audienceId)
      .eq('type', 'instant_list_created')

    if (notificationError) {
      console.error('Error updating admin notification:', notificationError)
      // Don't fail the request if notification update fails
    } else {
      console.log(`✅ Updated admin notification status to ${status}`)
    }

    console.log(`✅ Updated audience ${audienceId} status: ${status}, member count: ${memberCount}`)

    return NextResponse.json({
      success: true,
      audienceId,
      memberCount,
      status,
      message: `Successfully updated list status to ${status} with ${memberCount} members`
    })

  } catch (error) {
    console.error('Error in update-status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
