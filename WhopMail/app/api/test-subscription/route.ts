import { NextResponse } from 'next/server'
import { checkSubscriptionStatus } from '@/app/actions'

export async function GET() {
  try {
    console.log('=== TESTING SUBSCRIPTION STATUS API ===')
    
    // Use the user ID from the debug info
    const userId = 'user_ojPhs9dIhFQ9C'
    
    console.log('Testing subscription for user:', userId)
    
    const result = await checkSubscriptionStatus(userId)
    
    console.log('Subscription check result:', result)
    
    return NextResponse.json({
      success: true,
      userId,
      subscriptionStatus: result,
      hasActiveSubscription: result.hasActiveSubscription,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in test subscription API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 