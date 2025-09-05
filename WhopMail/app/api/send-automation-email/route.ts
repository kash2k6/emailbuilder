import { NextRequest, NextResponse } from "next/server"
import { sendIndividualEmail } from "@/app/actions/emailsync"

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from our Supabase Edge Function
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!authHeader || !expectedToken || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== expectedToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      toEmail,
      subject,
      html,
      text,
      fromEmail,
      whopUserId,
      emailType,
      audienceId,
      memberData
    } = body

    console.log(`📧 Automation email request:`, {
      toEmail,
      subject: subject.substring(0, 50) + '...',
      emailType,
      whopUserId
    })

    // Validate required fields
    if (!toEmail || !subject || !fromEmail || !whopUserId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Send the email using the existing system
    const result = await sendIndividualEmail({
      toEmail,
      subject,
      html,
      text,
      fromEmail,
      whopUserId,
      tags: [
        { name: 'automation_type', value: emailType },
        { name: 'audience_id', value: audienceId || 'unknown' }
      ],
      memberData
    })

    if (result.success) {
      console.log(`✅ Automation email sent successfully: ${result.emailId}`)
      return NextResponse.json({
        success: true,
        emailId: result.emailId,
        message: "Automation email sent successfully"
      })
    } else {
      console.error(`❌ Failed to send automation email: ${result.error}`)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Error in send-automation-email:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send automation email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
