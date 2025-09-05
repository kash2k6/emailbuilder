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

    // Get all audiences for this user directly by whop_user_id
    const { data: audiences, error: audiencesError } = await supabase
      .from('email_audiences')
      .select('id, name, description, member_count')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)
      .order('name')

    console.log('Querying audiences by whop_user_id:', whopUserId)
    console.log('Direct query result:', { audiences, error: audiencesError })

    if (audiencesError) {
      console.error('Error fetching audiences:', audiencesError)
      return NextResponse.json(
        { error: 'Failed to fetch audiences' },
        { status: 500 }
      )
    }

    // If no audiences found by whop_user_id, fall back to the config relationship method
    if (!audiences || audiences.length === 0) {
      console.log('No audiences found by whop_user_id, trying config relationship...')
      
      // Get user's email platform config
      const { data: configData, error: configError } = await supabase
        .from('email_platform_configs')
        .select('id')
        .eq('whop_user_id', whopUserId)
        .eq('is_active', true)
        .single()

      if (configError || !configData) {
        return NextResponse.json({
          audiences: [],
          success: true
        })
      }

      // Get all audiences for this config
      const { data: configAudiences, error: configAudiencesError } = await supabase
        .from('email_audiences')
        .select('id, name, description, member_count')
        .eq('config_id', configData.id)
        .eq('is_active', true)
        .order('name')

      console.log('Fallback config query result:', { configAudiences, error: configAudiencesError })

      if (configAudiencesError) {
        console.error('Error fetching audiences by config:', configAudiencesError)
        return NextResponse.json(
          { error: 'Failed to fetch audiences' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        audiences: configAudiences || [],
        success: true
      })
    }

    return NextResponse.json({
      audiences: audiences || [],
      success: true
    })

  } catch (error) {
    console.error('Error in audiences API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
