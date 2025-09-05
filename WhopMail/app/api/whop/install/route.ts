import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company_id, user_id, installation_id } = body

    console.log("Whop app installation:", {
      company_id,
      user_id,
      installation_id,
      timestamp: new Date().toISOString(),
    })

    // Store installation data in your database
    // This is where you would typically:
    // 1. Create a new company record
    // 2. Store the installation details
    // 3. Set up default email platform settings
    // 4. Initialize any required webhooks or integrations

    // Example database operation (replace with your actual database logic):
    // await db.company.create({
    //   data: {
    //     whop_company_id: company_id,
    //     whop_user_id: user_id,
    //     installation_id: installation_id,
    //     created_at: new Date(),
    //     email_platform: null, // Will be configured later
    //     api_key: null,
    //   }
    // })

    return NextResponse.json({ 
      success: true,
      message: "App installed successfully",
      installation_id 
    })
  } catch (error) {
    console.error("Installation error:", error)
    return NextResponse.json({ 
      error: "Installation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
