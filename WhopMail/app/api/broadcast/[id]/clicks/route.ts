import { NextRequest, NextResponse } from 'next/server'
import { getBroadcastClickEvents } from '@/app/actions/email-tracking'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')
    
    if (!whopUserId) {
      return NextResponse.json({ success: false, error: 'whopUserId is required' }, { status: 400 })
    }

    const broadcastId = params.id
    if (!broadcastId) {
      return NextResponse.json({ success: false, error: 'Broadcast ID required' }, { status: 400 })
    }

    const result = await getBroadcastClickEvents(broadcastId, whopUserId)
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Error fetching broadcast clicks:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
