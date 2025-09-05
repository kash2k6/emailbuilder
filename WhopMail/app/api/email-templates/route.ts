import { type NextRequest, NextResponse } from "next/server"
import { getEmailTemplates, createEmailTemplate } from "@/app/actions/automation-triggers"

/**
 * GET /api/email-templates
 * Get all email templates for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')

    if (!whopUserId) {
      return NextResponse.json({ error: 'whopUserId is required' }, { status: 400 })
    }

    const result = await getEmailTemplates(whopUserId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      templates: result.templates
    })
  } catch (error) {
    console.error('Error in GET /api/email-templates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/email-templates
 * Create a new email template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { whopUserId, ...templateData } = body

    if (!whopUserId) {
      return NextResponse.json({ error: 'whopUserId is required' }, { status: 400 })
    }

    const result = await createEmailTemplate(whopUserId, templateData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template: result.template
    })
  } catch (error) {
    console.error('Error in POST /api/email-templates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 