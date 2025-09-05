import { NextRequest, NextResponse } from 'next/server'
import { getUserBroadcastJobs } from '@/app/actions/broadcast-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }

    console.log(`📋 Fetching broadcast history for user: ${userId}`)

    const result = await getUserBroadcastJobs(userId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch broadcast history' },
        { status: 500 }
      )
    }

    console.log(`✅ Retrieved ${result.jobs?.length || 0} broadcast jobs for user ${userId}`)

    return NextResponse.json({
      success: true,
      jobs: result.jobs || []
    })
  } catch (error) {
    console.error('Error fetching broadcast history:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 