import { NextRequest, NextResponse } from 'next/server'
import { getBroadcastJobStatus } from '@/app/actions/whop-marketing'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId parameter' },
        { status: 400 }
      )
    }

    const result = await getBroadcastJobStatus(jobId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in broadcast status API route:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 