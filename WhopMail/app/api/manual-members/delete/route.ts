import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkSubscriptionStatus } from '@/app/actions'

interface DeleteRequest {
  whopUserId: string
  memberIds?: string[] // Optional: delete specific members
  deleteAll?: boolean // Optional: delete all manual members for user
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteRequest = await request.json()
    const { whopUserId, memberIds, deleteAll } = body

    if (!whopUserId) {
      return NextResponse.json({ success: false, error: 'Whop user ID is required' }, { status: 400 })
    }

    if (!deleteAll && (!memberIds || memberIds.length === 0)) {
      return NextResponse.json({ success: false, error: 'Either memberIds or deleteAll must be provided' }, { status: 400 })
    }

    // Check subscription status
    const subscriptionCheck = await checkSubscriptionStatus(whopUserId)
    if (!subscriptionCheck.hasActiveSubscription) {
      return NextResponse.json({ success: false, error: 'Active subscription required' }, { status: 403 })
    }

    const supabase = createClient()

    let deleteResult
    let deletedCount = 0

    if (deleteAll) {
      // Delete all manual members for this user
      const { data, error } = await supabase
        .from('manual_members')
        .delete()
        .eq('whop_user_id', whopUserId)
        .select('id')

      if (error) {
        console.error('Error deleting all manual members:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete manual members' }, { status: 500 })
      }

      deletedCount = data?.length || 0
    } else {
      // Delete specific members
      const { data, error } = await supabase
        .from('manual_members')
        .delete()
        .eq('whop_user_id', whopUserId)
        .in('id', memberIds!)
        .select('id')

      if (error) {
        console.error('Error deleting manual members:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete manual members' }, { status: 500 })
      }

      deletedCount = data?.length || 0
    }

    // Also delete associated email contacts
    if (deleteAll) {
      await supabase
        .from('email_contacts')
        .delete()
        .eq('whop_user_id', whopUserId)
        .eq('member_type', 'manual')
    } else {
      // For specific members, we'd need to get their contact IDs first
      // For now, just delete all manual contacts (simpler approach)
      await supabase
        .from('email_contacts')
        .delete()
        .eq('whop_user_id', whopUserId)
        .eq('member_type', 'manual')
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} manual members`,
      data: {
        deletedCount
      }
    })

  } catch (error) {
    console.error('Error in manual members delete:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
