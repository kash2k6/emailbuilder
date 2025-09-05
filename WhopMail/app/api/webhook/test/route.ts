import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

/**
 * Test endpoint to verify webhook functionality
 * This can be used to test the auto-sync feature without waiting for real Whop events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      companyId, 
      membershipId, 
      eventType = "membership.went_valid",
      memberEmail,
      memberUsername,
      productName = "Test Product"
    } = body

    if (!companyId) {
      return NextResponse.json({ 
        error: "companyId is required" 
      }, { status: 400 })
    }

    console.log(`=== TESTING WEBHOOK FUNCTIONALITY ===`)
    console.log(`Company ID: ${companyId}`)
    console.log(`Event Type: ${eventType}`)
    console.log(`Membership ID: ${membershipId || 'test-membership'}`)

    // Check if company has email integration configured
    const integration = await storage.getIntegration(companyId)
    
    if (!integration) {
      return NextResponse.json({
        success: false,
        message: "No email integration found for this company",
        suggestion: "Please configure an email platform integration first"
      })
    }

    console.log(`Found integration: ${integration.platform}`)

    // Create test member data
    const testMemberData = {
      id: membershipId || `test-mem-${Date.now()}`,
      email: memberEmail || `test-${Date.now()}@example.com`,
      name: memberUsername || "Test User",
      username: memberUsername || "testuser",
      product: productName,
      product_id: "test-product-id",
      status: "active",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      created_at: new Date().toISOString(),
      valid: true,
      user: `test-user-${Date.now()}`,
    }

    console.log(`Test member data:`, testMemberData)

    // Import the webhook handler functions
    const { syncMemberToEmailPlatform, handleInvalidMembership } = await import("../webhook-utils")

    let result
    if (eventType === "membership.went_invalid") {
      result = await handleInvalidMembership(testMemberData, integration)
    } else {
      result = await syncMemberToEmailPlatform(testMemberData, integration)
    }

    console.log(`Test result:`, result)

    return NextResponse.json({
      success: true,
      message: `Test webhook event processed successfully`,
      eventType,
      integration: {
        platform: integration.platform,
        listId: integration.list_id
      },
      memberData: testMemberData,
      result
    })

  } catch (error) {
    console.error("Test webhook error:", error)
    return NextResponse.json(
      {
        error: "Test webhook failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * GET endpoint to check webhook status and list available integrations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ 
        error: "companyId query parameter is required" 
      }, { status: 400 })
    }

    // Get company integration
    const integration = await storage.getIntegration(companyId)
    
    if (!integration) {
      return NextResponse.json({
        success: false,
        message: "No email integration found for this company",
        suggestion: "Please configure an email platform integration first"
      })
    }

    return NextResponse.json({
      success: true,
      message: "Webhook is ready for this company",
      integration: {
        platform: integration.platform,
        listId: integration.list_id,
        dc: integration.dc,
        apiUrl: integration.api_url,
        lastSyncedAt: integration.last_synced_at
      },
      webhookEvents: [
        "membership.went_valid",
        "membership.went_invalid", 
        "membership.created",
        "membership.updated"
      ],
      testEndpoint: `/api/webhook/test`
    })

  } catch (error) {
    console.error("Webhook status check error:", error)
    return NextResponse.json(
      {
        error: "Failed to check webhook status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
} 