import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkSubscriptionStatus } from '@/app/actions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    if (!whopUserId) {
      return NextResponse.json({ success: false, error: 'Whop user ID is required' }, { status: 400 })
    }

               // Check subscription status
           const subscriptionCheck = await checkSubscriptionStatus(whopUserId)
    if (!subscriptionCheck.hasActiveSubscription) {
      return NextResponse.json({ success: false, error: 'Active subscription required' }, { status: 403 })
    }

    const supabase = createClient()

    // Get manual members with pagination
    const { data: members, error: membersError, count } = await supabase
      .from('manual_members')
      .select('*', { count: 'exact' })
      .eq('whop_user_id', whopUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (membersError) {
      console.error('Error fetching manual members:', membersError)
      return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 })
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('manual_members')
      .select('*', { count: 'exact', head: true })
      .eq('whop_user_id', whopUserId)

    return NextResponse.json({
      success: true,
      data: {
        members: members || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error in manual members fetch:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
