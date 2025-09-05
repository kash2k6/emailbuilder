import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')
    
    if (!whopUserId) {
      return NextResponse.json(
        { success: false, error: 'whopUserId is required' },
        { status: 400 }
      )
    }

    // Get the user's email platform config to find their config_id
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .single()

    if (configError || !configData) {
      return NextResponse.json(
        { success: false, error: 'Email platform configuration not found' },
        { status: 404 }
      )
    }

    // Get all audiences for this user's config
    const { data: audiences, error: audiencesError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('config_id', configData.id)
      .order('created_at', { ascending: false })

    if (audiencesError) {
      console.error('Error fetching audiences:', audiencesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch email lists' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      audiences: audiences || []
    })

  } catch (error) {
    console.error('Error in email-lists API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
