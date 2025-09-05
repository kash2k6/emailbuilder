import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkSubscriptionStatus } from '@/app/actions'

interface QuickUploadRequest {
  whopUserId: string
  memberCount: number
  listName: string
  listDescription: string
}

export async function POST(request: NextRequest) {
  try {
    const body: QuickUploadRequest = await request.json()
    const { whopUserId, memberCount, listName, listDescription } = body

    if (!whopUserId) {
      return NextResponse.json({ success: false, error: 'Whop user ID is required' }, { status: 400 })
    }

    if (!memberCount || memberCount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid member count is required' }, { status: 400 })
    }

    // Check subscription status
    const subscriptionCheck = await checkSubscriptionStatus(whopUserId)
    if (!subscriptionCheck.hasActiveSubscription) {
      return NextResponse.json({ success: false, error: 'Active subscription required' }, { status: 403 })
    }

    const supabase = createClient()

    // Check plan limits
    const contactLimit = subscriptionCheck.subscription?.contactLimit || 3000
    
    // Get current member count (Whop + Manual)
    const { count: whopCount } = await supabase
      .from('email_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('whop_user_id', whopUserId)
      .eq('member_type', 'whop')
    
    const { count: manualCount } = await supabase
      .from('manual_members')
      .select('*', { count: 'exact', head: true })
      .eq('whop_user_id', whopUserId)
    
    const currentTotal = (whopCount || 0) + (manualCount || 0)
    const newTotal = currentTotal + memberCount
    
    if (newTotal > contactLimit) {
      return NextResponse.json({ 
        success: false, 
        error: `Upload would exceed your plan limit. Current: ${currentTotal}, Adding: ${memberCount}, Limit: ${contactLimit}. Please upgrade your plan.` 
      }, { status: 403 })
    }

    // Get the user's email platform config
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .single()

    if (configError || !configData) {
      return NextResponse.json({ success: false, error: 'Email platform configuration not found' }, { status: 404 })
    }

    // Create email audience for these members (just for counting)
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .insert({
        config_id: configData.id,
        audience_id: `manual_${Date.now()}`,
        name: listName,
        description: listDescription,
        member_count: memberCount,
        platform_audience_data: {
          source: 'manual_upload',
          created_at: new Date().toISOString(),
          quick_upload: true,
          requires_resend_upload: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (audienceError) {
      console.error('Error creating email audience:', audienceError)
      return NextResponse.json({ success: false, error: 'Failed to create email audience' }, { status: 500 })
    }

    // Create a single manual member record to represent the bulk upload
    const { error: manualMemberError } = await supabase
      .from('manual_members')
      .insert({
        id: `bulk_${Date.now()}`,
        whop_user_id: whopUserId,
        email: `bulk_upload_${Date.now()}@placeholder.com`,
        first_name: null,
        last_name: null,
        status: 'bulk_upload',
        source: 'manual_upload',
        uploaded_at: new Date().toISOString(),
        metadata: {
          member_count: memberCount,
          list_name: listName,
          audience_id: audienceData.id,
          requires_resend_upload: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (manualMemberError) {
      console.error('Error creating bulk manual member record:', manualMemberError)
      // Don't fail the entire operation for this
    }

    return NextResponse.json({
      success: true,
      message: `Successfully recorded ${memberCount} members for manual Resend upload`,
      data: {
        memberCount,
        audienceId: audienceData.id,
        audienceName: audienceData.name,
        requiresResendUpload: true
      }
    })

  } catch (error) {
    console.error('Error in quick upload:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
