import { NextRequest, NextResponse } from 'next/server'
import { deleteEmailList } from '@/app/actions/emailsync'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const audienceId = searchParams.get('audienceId')
    
    if (!audienceId) {
      return NextResponse.json(
        { success: false, error: 'audienceId is required' },
        { status: 400 }
      )
    }
    
    const result = await deleteEmailList(audienceId)
    
    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error deleting email list:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 