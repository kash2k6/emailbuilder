import { type NextRequest, NextResponse } from "next/server"
import { 
  getEmailFlows, 
  createEmailFlow, 
  updateEmailFlow, 
  deleteEmailFlow,
  testEmailFlow
} from "@/app/actions/email-flows"

/**
 * GET /api/email-flows
 * Get all email flows for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')

    if (!whopUserId) {
      return NextResponse.json({ error: 'whopUserId is required' }, { status: 400 })
    }

    const result = await getEmailFlows(whopUserId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      flows: result.flows
    })
  } catch (error) {
    console.error('Error in GET /api/email-flows:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/email-flows
 * Create a new email flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { whopUserId, ...flowData } = body

    if (!whopUserId) {
      return NextResponse.json({ error: 'whopUserId is required' }, { status: 400 })
    }

    const result = await createEmailFlow(whopUserId, flowData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      flow: result.flow
    })
  } catch (error) {
    console.error('Error in POST /api/email-flows:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/email-flows
 * Update an email flow
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { flowId, ...updates } = body

    if (!flowId) {
      return NextResponse.json({ error: 'flowId is required' }, { status: 400 })
    }

    const result = await updateEmailFlow(flowId, updates)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      flow: result.flow
    })
  } catch (error) {
    console.error('Error in PUT /api/email-flows:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/email-flows
 * Delete an email flow
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const flowId = searchParams.get('flowId')

    if (!flowId) {
      return NextResponse.json({ error: 'flowId is required' }, { status: 400 })
    }

    const result = await deleteEmailFlow(flowId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/email-flows:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 