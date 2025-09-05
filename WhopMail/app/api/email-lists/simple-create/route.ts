import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { listName, whopUserId } = await request.json()

    if (!listName || !whopUserId) {
      return NextResponse.json({ error: 'Missing list name or user ID' }, { status: 400 })
    }

    console.log(`🔄 Creating simple list request for user: ${whopUserId}, list: ${listName}`)

    const supabase = createClient()

    // Get user profile
    console.log(`🔍 Looking up user profile for: ${whopUserId}`)
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .single()

    if (profileError) {
      console.error('❌ Profile lookup error:', profileError)
      return NextResponse.json({ error: `User not found: ${profileError.message}` }, { status: 404 })
    }

    if (!userProfile) {
      console.error('❌ User profile not found')
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    console.log(`✅ Found user profile: ${userProfile.email}`)

    // Get the user's email configuration first
    console.log(`🔍 Getting email configuration for user: ${whopUserId}`)
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)
      .single()

    if (configError || !configData) {
      console.error('❌ No active email configuration found for user')
      return NextResponse.json({ 
        error: 'No active email configuration found. Please set up your email platform first.' 
      }, { status: 400 })
    }

    console.log(`✅ Found email configuration: ${configData.id}`)

    // Create audience in database with proper config_id
    console.log(`📝 Creating audience: ${listName}`)
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .insert({
        config_id: configData.id,
        name: listName,
        whop_user_id: whopUserId,
        audience_id: `pending_${Date.now()}`, // Temporary ID until Resend audience is created
        is_active: false, // Will be activated when you link Resend audience
        member_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (audienceError) {
      console.error('❌ Audience creation error:', audienceError)
      return NextResponse.json({ error: `Failed to create audience: ${audienceError.message}` }, { status: 500 })
    }

    console.log(`✅ Audience created: ${audienceData.id}`)

    // Create Resend audience automatically
    console.log(`🔧 Creating Resend audience: ${listName}`)
    let resendAudienceId = null
    let resendError = null

    try {
      const resendResponse = await fetch('https://api.resend.com/audiences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: listName,
          description: `Audience for ${listName} - created automatically`
        })
      })

      if (resendResponse.ok) {
        const resendData = await resendResponse.json()
        resendAudienceId = resendData.id
        console.log(`✅ Resend audience created: ${resendAudienceId}`)
        
        // Update the audience with the real Resend ID
        const { error: updateError } = await supabase
          .from('email_audiences')
          .update({
            audience_id: resendAudienceId,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', audienceData.id)

        if (updateError) {
          console.error('❌ Error updating audience with Resend ID:', updateError)
        } else {
          console.log(`✅ Updated audience with Resend ID`)
        }
      } else {
        const errorText = await resendResponse.text()
        resendError = `Failed to create Resend audience: ${errorText}`
        console.error(`❌ ${resendError}`)
      }
    } catch (error) {
      resendError = `Error creating Resend audience: ${error}`
      console.error(`❌ ${resendError}`)
    }

    // Create notification for admin
    console.log(`📢 Creating admin notification`)
    const { error: notificationError } = await supabase
      .from('admin_notifications')
      .insert({
        type: 'new_list_request',
        whop_user_id: whopUserId,
        audience_id: audienceData.id,
        audience_name: listName,
        user_email: userProfile.email || 'No email',
        status: resendAudienceId ? 'completed' : 'pending',
        resend_audience_id: resendAudienceId,
        notes: resendError ? `Resend creation failed: ${resendError}` : 'Resend audience created automatically',
        created_at: new Date().toISOString()
      })

    if (notificationError) {
      console.error('❌ Notification creation error:', notificationError)
      // Don't fail the request if notification fails
    } else {
      console.log(`✅ Admin notification created`)
    }

    console.log(`🎉 List request completed successfully`)

    return NextResponse.json({
      success: true,
      audienceId: audienceData.id,
      resendAudienceId,
      resendError,
      message: resendAudienceId 
        ? 'List created successfully and Resend audience created automatically!' 
        : 'List created successfully. Admin will process your request shortly.'
    })

  } catch (error) {
    console.error('❌ Unexpected error in simple list creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
