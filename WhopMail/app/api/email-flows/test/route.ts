import { type NextRequest, NextResponse } from "next/server"
import { testEmailFlow } from "@/app/actions/email-flows"

/**
 * POST /api/email-flows/test
 * Test an email flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { flowId, testEmail, testData } = body

    if (!flowId) {
      return NextResponse.json({ error: 'flowId is required' }, { status: 400 })
    }

    if (!testEmail) {
      return NextResponse.json({ error: 'testEmail is required' }, { status: 400 })
    }

    const result = await testEmailFlow(flowId, testEmail, testData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      executionId: result.executionId
    })
  } catch (error) {
    console.error('Error in POST /api/email-flows/test:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 