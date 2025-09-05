import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { audienceId } = await request.json()

    if (!audienceId) {
      return NextResponse.json({ error: 'Missing audience ID' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the audience record to find the Resend audience ID
    const { data: audience, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('id', audienceId)
      .single()

    if (audienceError || !audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 })
    }

    if (!audience.audience_id || audience.audience_id.startsWith('pending_')) {
      return NextResponse.json({ error: 'Audience not linked to Resend yet' }, { status: 400 })
    }

    // Fetch current count from Resend API
    console.log(`🔍 Fetching member count from Resend for audience: ${audience.audience_id}`)
    
    const resendResponse = await fetch(`https://api.resend.com/audiences/${audience.audience_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error(`❌ Failed to fetch from Resend: ${resendResponse.status} ${errorText}`)
      return NextResponse.json({ 
        error: `Failed to fetch from Resend: ${resendResponse.status}` 
      }, { status: 500 })
    }

    const resendData = await resendResponse.json()
    const memberCount = resendData.contact_count || 0

    console.log(`✅ Resend audience has ${memberCount} members`)

    // Update the audience record with the new count
    const { error: updateError } = await supabase
      .from('email_audiences')
      .update({
        member_count: memberCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', audienceId)

    if (updateError) {
      console.error('❌ Error updating audience count:', updateError)
      return NextResponse.json({ error: 'Failed to update audience count' }, { status: 500 })
    }

    console.log(`✅ Updated audience count to ${memberCount}`)

    return NextResponse.json({
      success: true,
      memberCount,
      audienceId,
      resendAudienceId: audience.audience_id
    })

  } catch (error) {
    console.error('Error syncing audience count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
