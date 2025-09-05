import { NextRequest, NextResponse } from 'next/server'
import { manuallyTriggerAutomation, getTriggerLogs } from '@/app/actions/automation-triggers'

export async function POST(request: NextRequest) {
  try {
    const { triggerId, userEmail, testData } = await request.json()

    if (!triggerId || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'Trigger ID and user email are required' },
        { status: 400 }
      )
    }

    const result = await manuallyTriggerAutomation(triggerId, userEmail, testData)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('Error in manual trigger API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const triggerId = searchParams.get('triggerId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!triggerId) {
      return NextResponse.json(
        { success: false, error: 'Trigger ID is required' },
        { status: 400 }
      )
    }

    const result = await getTriggerLogs(triggerId, limit)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('Error in trigger logs API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 