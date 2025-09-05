import { NextRequest, NextResponse } from 'next/server'
import { getProcessingJobStatus } from '@/app/actions/enhanced-list-processor'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }
    
    console.log(`🔍 Checking status for job: ${jobId}`)
    
    // Get job status from our in-memory store
    const jobStatus = getProcessingJobStatus(jobId)
    
    if (!jobStatus) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    console.log(`📊 Job ${jobId} status:`, {
      status: jobStatus.status,
      phase: jobStatus.currentPhase,
      processed: jobStatus.processedCount,
      total: jobStatus.totalMembers,
      syncedToDb: jobStatus.syncedToDbCount,
      syncedToResend: jobStatus.syncedToResendCount,
      error: jobStatus.error
    })
    
    // Debug: Log the full job status being sent to frontend
    console.log(`🚀 Sending to frontend:`, {
      success: true,
      jobId: jobStatus.id,
      status: jobStatus.status,
      currentPhase: jobStatus.currentPhase,
      processedCount: jobStatus.processedCount,
      totalMembers: jobStatus.totalMembers,
      syncedToDbCount: jobStatus.syncedToDbCount,
      syncedToResendCount: jobStatus.syncedToResendCount,
      error: jobStatus.error
    })
    
    return NextResponse.json({
      success: true,
      jobId: jobStatus.id,
      status: jobStatus.status,
      currentPhase: jobStatus.currentPhase,
      processedCount: jobStatus.processedCount,
      totalMembers: jobStatus.totalMembers,
      syncedToDbCount: jobStatus.syncedToDbCount,
      syncedToResendCount: jobStatus.syncedToResendCount,
      error: jobStatus.error,
      startedAt: jobStatus.startedAt,
      updatedAt: jobStatus.updatedAt,
      estimatedCompletionTime: jobStatus.estimatedCompletionTime
    })
    
  } catch (error) {
    console.error('Error getting job status:', error)
    return NextResponse.json({ 
      error: 'Failed to get job status' 
    }, { status: 500 })
  }
}
