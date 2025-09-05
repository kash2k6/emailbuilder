import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company_id, user_id, installation_id } = body

    console.log("Whop app uninstallation:", {
      company_id,
      user_id,
      installation_id,
      timestamp: new Date().toISOString(),
    })

    // Clean up installation data from your database
    // This is where you would typically:
    // 1. Remove company settings
    // 2. Clean up any stored API keys
    // 3. Remove webhook configurations
    // 4. Archive or delete related data

    // Example database operation (replace with your actual database logic):
    // await db.company.delete({
    //   where: {
    //     whop_company_id: company_id
    //   }
    // })

    return NextResponse.json({ 
      success: true,
      message: "App uninstalled successfully",
      installation_id 
    })
  } catch (error) {
    console.error("Uninstallation error:", error)
    return NextResponse.json({ 
      error: "Uninstallation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
