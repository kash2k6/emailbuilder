import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkSubscriptionStatus } from '@/app/actions'

interface InstantListCreateRequest {
  whopUserId: string
  listName: string
  listDescription?: string
  includeAllMembers?: boolean
  memberIds?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: InstantListCreateRequest = await request.json()
    const { whopUserId, listName, listDescription, includeAllMembers = true, memberIds } = body

    if (!whopUserId || !listName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check subscription status
    const subscriptionStatus = await checkSubscriptionStatus(whopUserId)
    if (!subscriptionStatus.hasActiveSubscription) {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
    }

    const supabase = createClient()

    // Get the user's profile for API key
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('whop_api_key')
      .eq('whop_user_id', whopUserId)
      .single()

    if (profileError || !userProfile) {
      console.error('Profile error:', profileError)
      console.error('User profile not found for whop_user_id:', whopUserId)
      return NextResponse.json({ error: 'User profile not found. Please ensure you have set up your Whop API key.' }, { status: 500 })
    }

    // Use service role key for SaaS operations (you handle the Resend uploads)
    const whopApiKey = process.env.WHOP_API_KEY
    if (!whopApiKey) {
      return NextResponse.json({ 
        error: 'Service configuration error. Please contact support.' 
      }, { status: 500 })
    }

    console.log("Using service role API key for SaaS operations")

    // Get user email from Whop API or use a default
    let userEmail = 'No email provided'
    try {
      // Try to get user details from Whop API
      if (userProfile.whop_api_key) {
        const { WhopSDKClient } = await import('@whop/api')
        const whopSdk = new WhopSDKClient(userProfile.whop_api_key)
        const user = await whopSdk.users.getUser({ userId: whopUserId })
        userEmail = user.email || user.username || whopUserId
      }
    } catch (error) {
      console.warn('Could not fetch user details from Whop API, using default:', error)
      userEmail = whopUserId
    }

    // Get email platform config
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .single()

    if (configError || !configData) {
      return NextResponse.json({ error: 'Email platform configuration not found' }, { status: 500 })
    }

    // Step 1: Create audience immediately
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .insert({
        config_id: configData.id,
        whop_user_id: whopUserId, // Add the missing whop_user_id
        audience_id: `instant_${Date.now()}`,
        name: listName,
        description: listDescription || `Email list for ${listName}`,
        member_count: 0,
        platform_audience_data: {
          source: 'instant_creation',
          created_at: new Date().toISOString(),
          export_ready: false,
          processing: true,
          total_members_expected: 0 // Will be updated in background
        },
        is_active: true, // Set as active
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (audienceError) {
      return NextResponse.json({ error: 'Failed to create email audience' }, { status: 500 })
    }

    // Step 1.5: Create Resend audience automatically
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
          description: listDescription || `Audience for ${listName} - created automatically`
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

    // Step 2: Create admin notification for background processing
    const { error: notificationError } = await supabase
      .from('admin_notifications')
      .insert({
        type: 'instant_list_created',
        whop_user_id: whopUserId,
        audience_id: audienceData.id,
        audience_name: listName,
        user_email: userEmail,
        status: resendAudienceId ? 'processing' : 'pending',
        resend_audience_id: resendAudienceId,
        notes: resendAudienceId 
          ? `Instant list created. Resend audience created automatically: ${resendAudienceId}. Ready for CSV upload.`
          : `Instant list created. Resend creation failed: ${resendError}. Ready for manual CSV upload and Resend audience creation.`,
        created_at: new Date().toISOString()
      })

    if (notificationError) {
      console.error('❌ Admin notification creation error:', notificationError)
    } else {
      console.log(`✅ Admin notification created for instant list`)
    }

    // Step 3: Send Whop message to admin
    try {
      const { WhopServerSdk } = await import('@whop/api')
      const appApiKey = process.env.WHOP_API_KEY
      const adminUserId = 'user_ojPhs9dIhFQ9C' // Your user ID
      const agentUserId = 'user_WD1R9sQ7kBE3P' // Your app's agent ID

      if (appApiKey) {
        console.log('✅ Sending instant list notification to admin via Whop messaging')
        
        const whopSdk = new (WhopServerSdk as any)({
          appApiKey: appApiKey,
          onBehalfOfUserId: agentUserId,
          appId: 'your-app-id' // Add required appId
        })

        const message = `📧 **New Instant List Created**

**User ID:** ${whopUserId}
**List Name:** ${listName}
**Audience ID:** ${audienceData.id}
**Status:** Processing in background

**Next Steps:**
1. Go to your admin dashboard
2. Process the list for member import
3. Update the notification status when complete

**User Email:** ${userEmail}`

        await whopSdk.messages.sendDirectMessageToUser({
          toUserIdOrUsername: adminUserId,
          message: message
        })

        console.log('✅ Instant list notification sent successfully!')
      }
    } catch (error) {
      console.error('❌ Error sending instant list notification:', error)
      // Don't fail the request if notification fails
    }

    console.log(`✅ Successfully created audience "${listName}" - background processing started`)
    
    return NextResponse.json({
      success: true,
      audienceId: audienceData.id,
      memberCount: 0,
      processing: true,
      message: 'List created successfully! Member processing has started in the background. This may take a few minutes for large lists.',
      estimatedTime: '2-5 minutes for large lists'
    })

  } catch (error) {
    console.error('❌ Error in instant list creation:', error)
    return NextResponse.json({ 
      error: 'Failed to create list. Please try again.' 
    }, { status: 500 })
  }
}
