import { NextRequest, NextResponse } from 'next/server'
import { testWhopAPI } from '@/app/actions'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 })
  }

  try {
    // Call the test function
    await testWhopAPI(userId)
    
    return NextResponse.json({ 
      message: 'Test completed - check server logs for detailed results',
      userId: userId
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 