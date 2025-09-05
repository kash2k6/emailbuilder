import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient()

    // Check if there are pending jobs
    const { data: pendingJobs } = await supabase
      .from('batch_processing_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(5)

    // Check if there are active workers
    const { data: activeWorkers } = await supabase
      .from('batch_processing_workers')
      .select('*')
      .eq('status', 'active')
      .gte('last_heartbeat', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Active in last 5 minutes

    console.log(`📊 Found ${pendingJobs?.length || 0} pending jobs and ${activeWorkers?.length || 0} active workers`)

    // If there are pending jobs but no active workers, start a worker
    if (pendingJobs && pendingJobs.length > 0 && (!activeWorkers || activeWorkers.length === 0)) {
      console.log('🔄 Starting worker automatically...')
      
      // Start a worker by calling the batch-worker function
      const workerResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/batch-worker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start'
        })
      })

      if (workerResponse.ok) {
        const workerResult = await workerResponse.json()
        console.log('✅ Worker started automatically:', workerResult)
        
        return NextResponse.json({ 
          success: true, 
          message: 'Worker started automatically',
          workerStarted: true,
          pendingJobs: pendingJobs.length,
          activeWorkers: activeWorkers?.length || 0,
          timestamp: new Date().toISOString()
        })
      } else {
        console.error('❌ Failed to start worker automatically')
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to start worker',
          pendingJobs: pendingJobs.length,
          timestamp: new Date().toISOString()
        }, { status: 500 })
      }
    }

    // Clean up inactive workers
    const { data: cleanupResult } = await supabase.rpc('cleanup_inactive_workers')
    console.log(`🧹 Cleaned up ${cleanupResult || 0} inactive workers`)

    // If workers are already active, just return status
    return NextResponse.json({ 
      success: true, 
      message: 'Workers are active',
      workerStarted: false,
      pendingJobs: pendingJobs?.length || 0,
      activeWorkers: activeWorkers?.length || 0,
      cleanupResult: cleanupResult || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Cron worker starter failed:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
