import { NextRequest, NextResponse } from 'next/server'
import { getBroadcastJobStatus, getBroadcastJobStatsWithDuplicates } from '@/app/actions/broadcast-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter is required' },
        { status: 400 }
      )
    }

    console.log(`📋 Fetching status for broadcast job: ${jobId}`)

    // Get job status
    const jobResult = await getBroadcastJobStatus(jobId)
    
    if (!jobResult.success) {
      return NextResponse.json(
        { error: jobResult.error || 'Failed to fetch job status' },
        { status: 404 }
      )
    }

    // Get detailed statistics
    const statsResult = await getBroadcastJobStatsWithDuplicates(jobId)
    
    const response = {
      success: true,
      job: jobResult.job,
      stats: statsResult.success ? statsResult.stats : null
    }

    console.log(`✅ Job status retrieved for ${jobId}:`, {
      status: jobResult.job?.status,
      progress: `${jobResult.job?.processed_count || 0}/${jobResult.job?.total_members || 0}`,
      successRate: statsResult.success ? `${statsResult.stats?.successRate.toFixed(1)}%` : 'N/A'
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching broadcast job status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 