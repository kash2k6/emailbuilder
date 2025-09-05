import { NextRequest, NextResponse } from 'next/server'
import { sendMessagesToSelectedMembers } from '@/app/actions/whop-marketing'

export async function POST(request: NextRequest) {
  try {
    const { memberIds, message, apiKey, agentUserId } = await request.json()

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid memberIds array' },
        { status: 400 }
      )
    }

    if (!message || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: message or apiKey' },
        { status: 400 }
      )
    }

    if (!agentUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing agentUserId. Please request agent setup first.' },
        { status: 400 }
      )
    }

    const result = await sendMessagesToSelectedMembers({
      memberIds,
      message,
      apiKey,
      agentUserId
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in selected members API route:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 