import { NextRequest, NextResponse } from 'next/server'
import { manuallyAddUserToFlow, getFlowExecutions, getStepExecutions } from '@/app/actions/email-flows'

export async function POST(request: NextRequest) {
  try {
    const { flowId, userEmail, testData } = await request.json()

    if (!flowId || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'Flow ID and user email are required' },
        { status: 400 }
      )
    }

    const result = await manuallyAddUserToFlow(flowId, userEmail, testData)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('Error in manual add user to flow API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const flowId = searchParams.get('flowId')
    const executionId = searchParams.get('executionId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (executionId) {
      // Get step executions for a specific execution
      const result = await getStepExecutions(executionId)
      
      if (result.success) {
        return NextResponse.json(result)
      } else {
        return NextResponse.json(result, { status: 400 })
      }
    } else if (flowId) {
      // Get flow executions for a specific flow
      const result = await getFlowExecutions(flowId, limit)
      
      if (result.success) {
        return NextResponse.json(result)
      } else {
        return NextResponse.json(result, { status: 400 })
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Flow ID or execution ID is required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in flow executions API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 