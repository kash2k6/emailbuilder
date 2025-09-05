import { NextRequest, NextResponse } from 'next/server'

const ABSTRACT_API_KEY = '10f36e0e9caa43bd91259adb4ea3ab85'
const ABSTRACT_API_URL = 'https://emailreputation.abstractapi.com/v1'

export async function GET(request: NextRequest) {
  try {
    const testEmail = 'noreply@whopmail.com'
    const url = `${ABSTRACT_API_URL}?api_key=${ABSTRACT_API_KEY}&email=${encodeURIComponent(testEmail)}`
    
    console.log('🔍 Testing Abstract API in server environment...')
    console.log('URL:', url)
    console.log('API Key:', ABSTRACT_API_KEY)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('Response Status:', response.status)
    console.log('Response Status Text:', response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('Error Response:', errorText)
      return NextResponse.json({ 
        success: false, 
        error: `API Error: ${response.status} ${response.statusText}`,
        details: errorText
      })
    }

    const data = await response.json()
    console.log('✅ Success! Response data received')
    
    return NextResponse.json({ 
      success: true, 
      data,
      url,
      apiKey: ABSTRACT_API_KEY
    })
    
  } catch (error) {
    console.error('❌ Fetch error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Fetch error',
      details: error instanceof Error ? error.message : String(error)
    })
  }
} 