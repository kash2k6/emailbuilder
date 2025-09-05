import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whop_user_id')

    if (!whopUserId) {
      return NextResponse.json(
        { error: 'whop_user_id is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get user's automation config
    const { data: config, error } = await supabase
      .from('automation_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching automation config:', error)
      return NextResponse.json(
        { error: 'Failed to fetch automation config' },
        { status: 500 }
      )
    }

    // If no config exists, return default config
    if (!config) {
      const defaultConfig = {
        whop_user_id: whopUserId,
        auto_add_new_members: true,
        auto_sync_to_resend: true,
        default_audience_id: null
      }
      
      return NextResponse.json({
        config: defaultConfig,
        success: true
      })
    }

    return NextResponse.json({
      config,
      success: true
    })

  } catch (error) {
    console.error('Error in automation config GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { whop_user_id, ...configData } = body

    if (!whop_user_id) {
      return NextResponse.json(
        { error: 'whop_user_id is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Upsert the automation config
    const { data: config, error } = await supabase
      .from('automation_configs')
      .upsert({
        whop_user_id,
        ...configData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting automation config:', error)
      return NextResponse.json(
        { error: 'Failed to save automation config' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      config,
      success: true
    })

  } catch (error) {
    console.error('Error in automation config POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
