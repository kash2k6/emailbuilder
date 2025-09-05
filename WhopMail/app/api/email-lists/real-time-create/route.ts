import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkSubscriptionStatus } from '@/app/actions'
import { processListInRealTime } from '@/app/actions/enhanced-list-processor'


interface RealTimeListCreateRequest {
  whopUserId: string
  listName: string
  listDescription?: string
  includeAllMembers?: boolean
  memberIds?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: RealTimeListCreateRequest = await request.json()
    const { whopUserId, listName, listDescription, includeAllMembers = true, memberIds } = body

    console.log('🚀 Real-time list creation request:', { whopUserId, listName, includeAllMembers, memberIdsCount: memberIds?.length || 0 })

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

    // Get or create email platform config (we handle Resend API key)
    let configData: any = null
    let configId: string | null = null
    
    // Try to get existing config
    const { data: existingConfig, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .single()

    if (configError || !existingConfig) {
      console.log('📝 No existing email platform config found, creating default config...')
      
      // Create a default config for the user
      const { data: newConfig, error: createError } = await supabase
        .from('email_platform_configs')
        .insert({
          whop_user_id: whopUserId,
          platform_type: 'resend',
          email_type: 'whopmail',
          from_email: 'noreply@whopmail.com',
          from_name: 'WhopMail',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError) {
        console.error('❌ Failed to create default email platform config:', createError)
        return NextResponse.json({ 
          error: 'Failed to create email platform configuration. Please contact support.' 
        }, { status: 500 })
      }

      configData = newConfig
      configId = newConfig.id
      console.log('✅ Created default email platform config:', configId)
    } else {
      configData = existingConfig
      configId = existingConfig.id
      console.log('✅ Using existing email platform config:', configId)
    }

    // Use your system's Resend API key (not user's)
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('❌ System Resend API key not configured')
      return NextResponse.json({ 
        error: 'System configuration error. Please contact support.' 
      }, { status: 500 })
    }

    // Step 1: Create audience in database
    console.log('🔧 Creating email audience in database...')
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .insert({
        config_id: configId,
        whop_user_id: whopUserId,
        audience_id: `realtime_${Date.now()}`,
        name: listName,
        description: listDescription || `Email list for ${listName}`,
        member_count: 0,
        unsubscribed_count: 0,
        platform_audience_data: {
          source: 'real_time_creation',
          created_at: new Date().toISOString(),
          processing: true,
          total_members_expected: 0
        },
        is_active: false, // Will be activated when processing completes
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (audienceError) {
      console.error('❌ Failed to create email audience:', audienceError)
      return NextResponse.json({ error: 'Failed to create email audience' }, { status: 500 })
    }

    console.log('✅ Email audience created in database:', audienceData.id)

    // Step 2: Create Resend audience
    console.log(`🔧 Creating Resend audience: ${listName}`)
    let resendAudienceId = null

    try {
      const resendResponse = await fetch('https://api.resend.com/audiences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
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
        }
      } else {
        const errorText = await resendResponse.text()
        console.error(`❌ Failed to create Resend audience: ${errorText}`)
        return NextResponse.json({ error: 'Failed to create Resend audience' }, { status: 500 })
      }
    } catch (error) {
      console.error(`❌ Error creating Resend audience:`, error)
      return NextResponse.json({ error: 'Failed to create Resend audience' }, { status: 500 })
    }

    // Step 3: Get Whop API key for streaming processing
    const whopApiKey = userProfile.whop_api_key || process.env.WHOP_API_KEY
    if (!whopApiKey) {
      return NextResponse.json({ error: 'No Whop API key available' }, { status: 500 })
    }

    console.log('🔧 Using streaming approach - will fetch and process members simultaneously')

    // Step 4: Start streaming real-time processing
    console.log(`🚀 Starting STREAMING real-time processing`)
    
    const processingResult = await processListInRealTime({
      whopUserId,
      audienceId: audienceData.id, // Database audience ID
      resendAudienceId, // Resend audience ID for API calls
      audienceName: listName,
      whopApiKey, // Pass API key for streaming
      resendApiKey,
      onProgress: (progress) => {
        // This will be called during processing to update progress
        console.log(`📈 Progress: ${progress.phase} - ${progress.current}/${progress.total} (${progress.percentage}%)`)
        if (progress.estimatedTimeRemaining) {
          console.log(`⏱️ Estimated time remaining: ${progress.estimatedTimeRemaining}`)
        }
        
        // IMPORTANT: Send progress to frontend via Server-Sent Events or WebSocket
        // For now, we'll rely on the job status API that the frontend polls
        console.log(`🚀 Frontend should see: ${progress.current}/${progress.total} (${progress.percentage}%)`)
      }
    })

    if (!processingResult.success) {
      // Update audience status to failed
      await supabase
        .from('email_audiences')
        .update({
          is_active: false,
          platform_audience_data: {
            source: 'real_time_creation',
            created_at: new Date().toISOString(),
            processing: false,
            error: processingResult.error
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', audienceData.id)

      return NextResponse.json({ 
        error: `List processing failed: ${processingResult.error}` 
      }, { status: 500 })
    }

    console.log(`✅ Successfully created and processed list "${listName}"`)
    
    return NextResponse.json({
      success: true,
      audienceId: audienceData.id,
      resendAudienceId,
      jobId: processingResult.jobId,
      message: 'List created successfully! Members are being streamed and processed in real-time.',
      estimatedTime: 'Processing in real-time - no pre-calculation needed'
    })

  } catch (error) {
    console.error('❌ Error in real-time list creation:', error)
    return NextResponse.json({ 
      error: 'Failed to create list. Please try again.' 
    }, { status: 500 })
  }
}


