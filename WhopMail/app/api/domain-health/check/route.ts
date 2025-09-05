import { NextRequest, NextResponse } from 'next/server'
import { getUserDomainHealth } from '@/app/actions/domain-health'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Domain health check request for user: ${userId}`)

    const result = await getUserDomainHealth(userId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        isFresh: result.isFresh,
        domain: result.domain,
        fromEmail: result.fromEmail
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to check domain health' 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error checking domain health:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 