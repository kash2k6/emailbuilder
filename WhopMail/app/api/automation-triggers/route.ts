import { type NextRequest, NextResponse } from "next/server"
import { 
  getAutomationTriggers, 
  createAutomationTrigger, 
  updateAutomationTrigger, 
  deleteAutomationTrigger,
  testAutomationTrigger,
  getAutomationTriggerLogs
} from "@/app/actions/automation-triggers"

/**
 * GET /api/automation-triggers
 * Get all automation triggers for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')

    if (!whopUserId) {
      return NextResponse.json({ error: 'whopUserId is required' }, { status: 400 })
    }

    const result = await getAutomationTriggers(whopUserId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      triggers: result.triggers
    })
  } catch (error) {
    console.error('Error in GET /api/automation-triggers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/automation-triggers
 * Create a new automation trigger
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { whopUserId, ...triggerData } = body

    if (!whopUserId) {
      return NextResponse.json({ error: 'whopUserId is required' }, { status: 400 })
    }

    const result = await createAutomationTrigger(whopUserId, triggerData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      trigger: result.trigger
    })
  } catch (error) {
    console.error('Error in POST /api/automation-triggers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/automation-triggers
 * Update an automation trigger
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { triggerId, ...updates } = body

    if (!triggerId) {
      return NextResponse.json({ error: 'triggerId is required' }, { status: 400 })
    }

    const result = await updateAutomationTrigger(triggerId, updates)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      trigger: result.trigger
    })
  } catch (error) {
    console.error('Error in PUT /api/automation-triggers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/automation-triggers
 * Delete an automation trigger
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const triggerId = searchParams.get('triggerId')

    if (!triggerId) {
      return NextResponse.json({ error: 'triggerId is required' }, { status: 400 })
    }

    const result = await deleteAutomationTrigger(triggerId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/automation-triggers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 