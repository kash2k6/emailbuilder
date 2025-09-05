import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { audienceId } = await request.json()

    if (!audienceId) {
      return NextResponse.json({ error: 'audienceId is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get the actual contact count from the database
    const { count, error: countError } = await supabase
      .from('email_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('audience_id', audienceId)
      .eq('is_subscribed', true)

    if (countError) {
      console.error('Error getting contact count:', countError)
      return NextResponse.json({ error: 'Failed to get contact count' }, { status: 500 })
    }

    const actualCount = count || 0

    // Update the audience record with the correct count
    const { error: updateError } = await supabase
      .from('email_audiences')
      .update({
        member_count: actualCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', audienceId)

    if (updateError) {
      console.error('Error updating audience count:', updateError)
      return NextResponse.json({ error: 'Failed to update audience count' }, { status: 500 })
    }

    console.log(`✅ Synced audience ${audienceId} count to ${actualCount}`)

    return NextResponse.json({
      success: true,
      audienceId,
      actualCount,
      message: `Successfully synced audience count to ${actualCount}`
    })

  } catch (error) {
    console.error('Error syncing audience count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
