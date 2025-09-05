import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkSubscriptionStatus } from '@/app/actions'

interface BatchListCreateRequest {
  whopUserId: string
  listName: string
  listDescription?: string
  includeAllMembers?: boolean
  memberIds?: string[] // Optional: specific member IDs to include
  syncToResend?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchListCreateRequest = await request.json()
    const { whopUserId, listName, listDescription, includeAllMembers = true, memberIds, syncToResend = true } = body

    if (!whopUserId || !listName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check subscription status
    const subscriptionStatus = await checkSubscriptionStatus(whopUserId)
    if (!subscriptionStatus.hasActiveSubscription) {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
    }

    // Create Supabase client
    const supabase = createClient()

    // Get the user's Whop API key from their profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('whop_api_key')
      .eq('whop_user_id', whopUserId)
      .single()

    if (profileError || !userProfile?.whop_api_key) {
      return NextResponse.json({ 
        error: 'Whop API key not found in user profile. Please set up your Whop integration first.' 
      }, { status: 400 })
    }

    // Create unique job ID
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create job record in database
    const { error: jobError } = await supabase
      .from('batch_jobs')
      .insert({
        id: jobId,
        whop_user_id: whopUserId,
        job_type: 'batch_list_creation',
        list_name: listName,
        list_description: listDescription,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (jobError) {
      console.error('Error creating batch job:', jobError)
      return NextResponse.json({ error: 'Failed to create batch job' }, { status: 500 })
    }

    // Create the audience first
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .single()

    if (configError || !configData) {
      return NextResponse.json({ error: 'Email platform configuration not found' }, { status: 500 })
    }

    // Create email audience
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .insert({
        config_id: configData.id,
        audience_id: `batch_${Date.now()}`,
        name: listName,
        description: listDescription || `Email list for ${listName}`,
        member_count: 0,
        platform_audience_data: {
          source: 'batch_creation',
          created_at: new Date().toISOString(),
          job_type: 'cron_background'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (audienceError) {
      return NextResponse.json({ error: 'Failed to create email audience' }, { status: 500 })
    }

    // Update job with audience ID
    await supabase
      .from('batch_jobs')
      .update({
        audience_id: audienceData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Store job details for cron-job.org processing
    await supabase
      .from('batch_jobs')
      .update({
        whop_api_key: userProfile.whop_api_key, // Store temporarily for processing
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Add job to automated processing queue
    const { data: queueJob, error: queueError } = await supabase.rpc('add_batch_job_to_queue', {
      p_job_id: jobId,
      p_whop_user_id: whopUserId,
      p_audience_id: audienceData.id,
      p_list_name: listName,
      p_whop_api_key: userProfile.whop_api_key,
      p_priority: 0
    })

    if (queueError) {
      console.error('Error adding job to queue:', queueError)
      return NextResponse.json({ error: 'Failed to add job to processing queue' }, { status: 500 })
    }

    console.log('✅ Job added to automated processing queue:', queueJob)
    
    console.log('🔄 Job added to queue - will be processed by external cron system to avoid timeouts')
    console.log('📊 Processing large datasets (10,000+ members) requires external processing to avoid Edge Function timeouts')
    console.log('🤖 The cron-job.org system will handle the heavy lifting and send results back to Supabase')

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Batch list creation started. You can check the progress in the dashboard.'
    })

  } catch (error) {
    console.error('Error in batch list creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const whopUserId = searchParams.get('whopUserId')

    if (!jobId || !whopUserId) {
      return NextResponse.json({ error: 'Job ID and whopUserId required' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = createClient()

    // Get job from database
    const { data: job, error: jobError } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('whop_user_id', whopUserId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        totalMembers: job.total_members,
        processedCount: job.processed_count,
        audienceId: job.audience_id,
        resendAudienceId: job.resend_audience_id,
        error: job.error,
        createdAt: job.created_at,
        updatedAt: job.updated_at
      }
    })

  } catch (error) {
    console.error('Error getting job status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
