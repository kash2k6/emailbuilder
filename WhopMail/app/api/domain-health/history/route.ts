import { NextRequest, NextResponse } from 'next/server'
import { getUserDomainHealthHistory } from '@/app/actions/domain-health'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    console.log(`📊 Domain health history request for user: ${userId}`)

    const result = await getUserDomainHealthHistory(userId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data || []
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to fetch domain health history' 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error fetching domain health history:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 