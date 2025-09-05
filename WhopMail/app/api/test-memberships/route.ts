import { NextResponse } from 'next/server'
import { fetchMembershipPage } from '@/lib/whop'

export async function GET() {
  try {
    console.log('=== TESTING MEMBERSHIPS FETCH ===')
    
    const apiKey = process.env.WHOP_API_KEY || process.env.WHOP_CLIENT_SECRET
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No API key available'
      })
    }
    
    console.log('Fetching memberships with API key...')
    
    const { data: members, pagination } = await fetchMembershipPage(apiKey, 1, 100)
    
    console.log(`Found ${members?.length || 0} memberships`)
    
    // Look for the specific user
    const userId = 'user_ojPhs9dIhFQ9C'
    const userMembership = members?.find((member: any) => 
      member.user_id === userId || member.user === userId
    )
    
    return NextResponse.json({
      success: true,
      totalMemberships: members?.length || 0,
      userId,
      userMembership: userMembership ? {
        id: userMembership.id,
        status: userMembership.status,
        valid: userMembership.valid,
        product_id: userMembership.product_id,
        user_id: userMembership.user_id,
        user: userMembership.user
      } : null,
      allMemberships: members?.map((m: any) => ({
        id: m.id,
        status: m.status,
        valid: m.valid,
        user_id: m.user_id,
        user: m.user,
        product_id: m.product_id
      })) || [],
      pagination
    })
  } catch (error) {
    console.error('Error in test memberships API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 