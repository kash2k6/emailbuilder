import { NextRequest, NextResponse } from 'next/server'
import { getProductMembersForSelection } from '@/app/actions/whop-marketing'

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: apiKey' },
        { status: 400 }
      )
    }

    const result = await getProductMembersForSelection({
      apiKey
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in members API route:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 