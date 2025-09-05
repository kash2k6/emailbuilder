import { NextRequest, NextResponse } from 'next/server'
import { resumeBroadcastJob } from '@/app/actions/broadcast-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Resume request received for broadcast job: ${jobId}`)

    const result = await resumeBroadcastJob(jobId)

    if (result.success) {
      if (result.resumed) {
        console.log(`✅ Successfully resumed broadcast job: ${jobId}`)
        return NextResponse.json({
          success: true,
          message: 'Broadcast job resumed successfully'
        })
      } else {
        console.log(`ℹ️ Broadcast job ${jobId} cannot be resumed: ${result.error}`)
        return NextResponse.json({
          success: true,
          message: result.error || 'Job cannot be resumed'
        })
      }
    } else {
      console.error(`❌ Failed to resume broadcast job ${jobId}:`, result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to resume broadcast job' 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error resuming broadcast job:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 