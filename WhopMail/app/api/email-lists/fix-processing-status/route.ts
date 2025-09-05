import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audienceId, memberCount = 0 } = body

    if (!audienceId) {
      return NextResponse.json({ error: 'audienceId is required' }, { status: 400 })
    }

    const supabase = createClient()

    // First, get the current audience data to preserve existing fields
    const { data: currentAudience, error: fetchError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('id', audienceId)
      .single()

    if (fetchError || !currentAudience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 })
    }

    console.log(`🔧 Fixing processing status for audience: ${audienceId}`)

    // Update the audience to mark it as ready and not processing
    const { data, error } = await supabase
      .from('email_audiences')
      .update({
        is_active: true,
        member_count: memberCount || currentAudience.member_count || 0,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Update platform_audience_data to mark processing as complete
        platform_audience_data: {
          ...currentAudience.platform_audience_data, // Preserve existing data
          processing: false, // Mark as not processing anymore
          export_ready: true, // Mark as ready for export
          total_members_expected: memberCount || currentAudience.member_count || 0,
          resend_synced: true,
          completed_at: new Date().toISOString(),
          fixed_at: new Date().toISOString() // Track when this was fixed
        }
      })
      .eq('id', audienceId)
      .select()

    if (error) {
      console.error('Error fixing audience status:', error)
      return NextResponse.json({ error: 'Failed to fix audience status' }, { status: 500 })
    }

    console.log(`✅ Successfully fixed audience ${audienceId} status`)

    return NextResponse.json({
      success: true,
      message: 'Audience status fixed successfully',
      audience: data[0]
    })

  } catch (error) {
    console.error('Error in fix-processing-status:', error)
    return NextResponse.json({ 
      error: 'Failed to fix audience status. Please try again.' 
    }, { status: 500 })
  }
}
