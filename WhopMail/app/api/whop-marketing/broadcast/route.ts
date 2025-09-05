import { NextRequest, NextResponse } from 'next/server'
import { sendBroadcastMessage } from '@/app/actions/whop-marketing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle both old format (apiKey, agentUserId) and new format (userIds, whopUserId)
    if (body.userIds && body.whopUserId) {
      // New format: Send to specific user IDs
      const { message, userIds, whopUserId } = body

      if (!message || !userIds || !whopUserId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: message, userIds, or whopUserId' },
          { status: 400 }
        )
      }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'userIds must be a non-empty array' },
          { status: 400 }
        )
      }

      // Get the user's API key from their profile
      const { getProfile } = await import('@/app/actions')
      const profile = await getProfile(whopUserId)
      
      if (!profile?.whop_api_key) {
        return NextResponse.json(
          { success: false, error: 'No API key found. Please set up your API key first.' },
          { status: 400 }
        )
      }

      const result = await sendBroadcastMessage({
        message,
        apiKey: profile.whop_api_key,
        agentUserId: whopUserId,
        targetUserIds: userIds
      })

      return NextResponse.json(result)
    } else {
      // Old format: Send to all members
      const { message, apiKey, agentUserId } = body

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

      const result = await sendBroadcastMessage({
        message,
        apiKey,
        agentUserId
      })

      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Error in broadcast API route:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 