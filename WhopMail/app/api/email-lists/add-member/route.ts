import { NextRequest, NextResponse } from 'next/server'
import { addMemberToList } from '@/app/actions/emailsync'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audienceId, memberData } = body
    
    if (!audienceId || !memberData || !memberData.email) {
      return NextResponse.json(
        { success: false, error: 'audienceId and memberData.email are required' },
        { status: 400 }
      )
    }
    
    const result = await addMemberToList(audienceId, memberData)
    
    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error adding member to list:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 