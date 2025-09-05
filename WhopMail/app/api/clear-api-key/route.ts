import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { whopUserId } = await request.json()
    
    if (!whopUserId) {
      return NextResponse.json({ error: 'whopUserId is required' }, { status: 400 })
    }

    console.log('Clearing API key for user:', whopUserId)

    // Clear the API key by setting it to null
    const { error } = await supabase
      .from('profiles')
      .update({ 
        whop_api_key: null,
        updated_at: new Date().toISOString()
      })
      .eq('whop_user_id', whopUserId)

    if (error) {
      console.error('Error clearing API key:', error)
      return NextResponse.json({ error: 'Failed to clear API key' }, { status: 500 })
    }

    console.log('Successfully cleared API key for user:', whopUserId)
    return NextResponse.json({ success: true, message: 'API key cleared successfully' })

  } catch (error) {
    console.error('Error in clear-api-key endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 