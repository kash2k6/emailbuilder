import { NextRequest, NextResponse } from 'next/server'
import { createEmailSyncAudience } from '@/app/actions/emailsync'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { whopUserId, listName, description } = body
    
    if (!whopUserId || !listName) {
      return NextResponse.json(
        { success: false, error: 'whopUserId and listName are required' },
        { status: 400 }
      )
    }
    
    const result = await createEmailSyncAudience(whopUserId, listName, description)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        audienceId: result.audienceId
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error creating email list:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 