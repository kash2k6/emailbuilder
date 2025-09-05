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

    // Get user's webhooks
    const { data: webhooks, error } = await supabase
      .from('user_webhooks')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user webhooks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      webhooks: webhooks || [],
      success: true
    })

  } catch (error) {
    console.error('Error in user webhooks API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { whop_user_id, webhook_url, webhook_name, description, events, secret_key } = body

    if (!whop_user_id || !webhook_url) {
      return NextResponse.json(
        { error: 'whop_user_id and webhook_url are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Create new webhook
    const { data: webhook, error } = await supabase
      .from('user_webhooks')
      .insert({
        whop_user_id,
        webhook_url,
        webhook_name: webhook_name || 'My Webhook',
        description: description || 'Webhook for email engagement events',
        events: events || ['email.opened', 'email.clicked', 'email.delivered'],
        secret_key: secret_key || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating webhook:', error)
      return NextResponse.json(
        { error: 'Failed to create webhook' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      webhook,
      success: true
    })

  } catch (error) {
    console.error('Error in user webhooks API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
