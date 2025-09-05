import { NextRequest, NextResponse } from 'next/server'
import { getBroadcastClickEvents } from '@/app/actions/email-tracking'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const broadcastId = searchParams.get('broadcastId')
    const whopUserId = searchParams.get('whopUserId')
    
    if (!broadcastId || !whopUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'broadcastId and whopUserId are required' 
      }, { status: 400 })
    }

    const result = await getBroadcastClickEvents(broadcastId, whopUserId)
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: result.data 
    })
  } catch (error) {
    console.error('Error in broadcast click events API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
