import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId') || 'test-user-id'
  
  console.log('=== DEVELOPMENT MODE TEST ===')
  console.log('User ID:', userId)
  console.log('Returning mock data for testing...')

  // Return mock data that simulates a successful subscription
  const mockData = {
    success: true,
    userId: userId,
    subscription: {
      id: 'sub_test_123',
      status: 'active',
      plan_id: process.env.NEXT_PUBLIC_PREMIUM_PLAN_ID || 'plan_APhjlbCx21BOA',
      product_id: process.env.NEXT_PUBLIC_PREMIUM_ACCESS_PASS_ID || 'prod_GrJaeMp2e3DBu',
      trial_end: null,
      current_period_end: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
      created_at: Date.now(),
      valid: true
    },
    user: {
      id: userId,
      email: 'test@example.com',
      username: 'testuser',
      name: 'Test User',
      profile_pic_url: null
    },
    access: {
      hasAccess: true,
      accessLevel: 'customer',
      product: {
        id: process.env.NEXT_PUBLIC_PREMIUM_ACCESS_PASS_ID || 'prod_GrJaeMp2e3DBu',
        title: 'Premium Access',
        description: 'Test product for development'
      }
    },
    message: 'Development mode - using mock data'
  }

  return NextResponse.json(mockData)
} 