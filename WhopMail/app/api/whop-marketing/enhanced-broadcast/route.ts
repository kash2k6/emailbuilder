import { NextRequest, NextResponse } from 'next/server'
import { sendEnhancedBroadcastMessage } from '@/app/actions/broadcast-processor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, apiKey, agentUserId, userId, targetUserIds } = body

    if (!message || !apiKey || !agentUserId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, apiKey, agentUserId, userId' },
        { status: 400 }
      )
    }

    console.log(`🚀 Enhanced broadcast request received for user ${userId}`)
    console.log(`📊 Target users: ${targetUserIds ? targetUserIds.length : 'all members'}`)

    const result = await sendEnhancedBroadcastMessage({
      message,
      apiKey,
      agentUserId,
      userId,
      targetUserIds
    })

    if (result.success) {
      console.log(`✅ Enhanced broadcast started successfully`)
      if (result.jobId) {
        console.log(`📋 Background job created: ${result.jobId}`)
      }
      if (result.sentCount) {
        console.log(`📤 Immediate messages sent: ${result.sentCount}`)
      }
    } else {
      console.error(`❌ Enhanced broadcast failed:`, result.errors)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in enhanced broadcast API:', error)
    return NextResponse.json(
      { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
      },
      { status: 500 }
    )
  }
} 