import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('=== TESTING USER FETCH ===')
    
    const apiKey = process.env.WHOP_API_KEY || process.env.WHOP_CLIENT_SECRET
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No API key available'
      })
    }
    
    console.log('API Key type:', apiKey.startsWith('whop_') ? 'Client Secret' : 'API Key')
    console.log('API Key prefix:', apiKey.substring(0, 10) + "...")
    
    const userId = 'user_ojPhs9dIhFQ9C'
    
    // Try to fetch user details directly
    const response = await fetch(`https://api.whop.com/api/v2/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })
    
    console.log('User fetch status:', response.status)
    
    if (response.ok) {
      const userData = await response.json()
      return NextResponse.json({
        success: true,
        userData,
        status: response.status
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: errorText,
        status: response.status
      })
    }
  } catch (error) {
    console.error('Error in test user API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 