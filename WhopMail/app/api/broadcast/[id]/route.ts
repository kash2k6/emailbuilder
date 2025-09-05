import { NextRequest, NextResponse } from 'next/server'
import { getBroadcastDetails } from '@/app/actions/email-tracking'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resendBroadcastId = params.id
    
    if (!resendBroadcastId) {
      return NextResponse.json({ success: false, error: 'Broadcast ID is required' }, { status: 400 })
    }

    console.log(`Fetching broadcast details for: ${resendBroadcastId}`)

    const result = await getBroadcastDetails(resendBroadcastId)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('Error in broadcast details API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
