import { type NextRequest, NextResponse } from "next/server"
import { testAutomationTrigger } from "@/app/actions/automation-triggers"

/**
 * POST /api/automation-triggers/test
 * Test an automation trigger with custom data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { triggerId, testEmail, testData } = body

    if (!triggerId) {
      return NextResponse.json({ error: 'triggerId is required' }, { status: 400 })
    }

    if (!testEmail) {
      return NextResponse.json({ error: 'testEmail is required' }, { status: 400 })
    }

    const result = await testAutomationTrigger(triggerId, testEmail, testData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      logId: result.logId
    })
  } catch (error) {
    console.error('Error in POST /api/automation-triggers/test:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 