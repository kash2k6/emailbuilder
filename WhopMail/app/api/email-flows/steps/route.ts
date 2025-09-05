import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const flowId = searchParams.get('flowId')

    if (!flowId) {
      return NextResponse.json(
        { success: false, error: 'Flow ID is required' },
        { status: 400 }
      )
    }

    // Get steps for the flow
    const { data: steps, error } = await supabase
      .from('automation_workflow_steps')
      .select('*')
      .eq('workflow_id', flowId)
      .order('step_order', { ascending: true })

    if (error) {
      console.error('Error fetching flow steps:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      steps: steps || []
    })
  } catch (error) {
    console.error('Error in GET /api/email-flows/steps:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 