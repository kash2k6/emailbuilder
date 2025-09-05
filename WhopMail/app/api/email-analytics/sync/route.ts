import { NextRequest, NextResponse } from 'next/server'
import { syncRecentEmailsWithResend, syncBroadcastStatsFromResend } from '@/app/actions/email-tracking'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')
    const hoursBack = parseInt(searchParams.get('hoursBack') || '24')
    
    if (!whopUserId) {
      return NextResponse.json({ success: false, error: 'whopUserId is required' }, { status: 400 })
    }

    console.log(`Manual data refresh requested for user ${whopUserId}, last ${hoursBack} hours`)

    // Sync both individual emails and broadcast statistics
    const [emailSyncResult, broadcastSyncResult] = await Promise.all([
      syncRecentEmailsWithResend(whopUserId, hoursBack),
      syncBroadcastStatsFromResend(whopUserId, hoursBack)
    ])

    const totalSynced = (emailSyncResult.syncedCount || 0) + (broadcastSyncResult.syncedCount || 0)
    const hasErrors = !emailSyncResult.success || !broadcastSyncResult.success

    if (!hasErrors) {
      return NextResponse.json({ 
        success: true, 
        syncedCount: totalSynced,
        emailSyncCount: emailSyncResult.syncedCount || 0,
        broadcastSyncCount: broadcastSyncResult.syncedCount || 0,
        message: `Successfully updated ${totalSynced} items (${emailSyncResult.syncedCount || 0} emails, ${broadcastSyncResult.syncedCount || 0} broadcasts)`
      })
    } else {
      const errors = []
      if (!emailSyncResult.success) errors.push(`Email sync: ${emailSyncResult.error}`)
      if (!broadcastSyncResult.success) errors.push(`Broadcast sync: ${broadcastSyncResult.error}`)
      
      return NextResponse.json({ 
        success: false, 
        error: errors.join('; '),
        partialSuccess: totalSynced > 0,
        syncedCount: totalSynced
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in email sync API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
} 