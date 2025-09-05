import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import { syncNewMemberToEmailPlatforms } from "@/app/actions/sync-member"

/**
 * Webhook handler for new member events from Whop
 * This endpoint should be registered in your Whop dashboard
 */
export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (you should implement this)
    // const signature = req.headers.get('x-whop-signature')
    // if (!verifySignature(signature, await req.text())) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    // }

    const data = await req.json()

    // Check if this is a new membership event
    if (data.event !== "membership.created" && data.event !== "membership.activated") {
      return NextResponse.json({ success: true, message: "Event ignored - not a new membership" })
    }

    // Extract member data
    const memberData = {
      id: data.membership.id,
      email: data.membership.user.email,
      name: data.membership.user.username || data.membership.user.email.split("@")[0],
      username: data.membership.user.username,
      product: data.membership.experience.name,
      status: data.membership.status,
      expires_at: data.membership.expiration,
      created_at: data.membership.created_at,
      valid: data.membership.valid,
      user: data.membership.user.id, // Convert user object to string ID
    }

    // Get all profiles that have this Whop API key
    const allProfiles = await storage.getAllProfiles()
    const matchingProfiles = allProfiles.filter(profile => profile.whop_api_key === data.api_key)

    if (matchingProfiles.length === 0) {
      console.log("No matching profiles found for API key")
      return NextResponse.json({ success: false, message: "No matching users found" })
    }

    // For each user, sync this member to their connected email platforms
    const syncResults = await Promise.all(
      matchingProfiles.map(async (profile) => {
        // Get user's email platform integration
        const integration = await storage.getIntegration(profile.user_id)

        if (!integration) {
          return { userId: profile.user_id, success: false, message: "No email integration found" }
        }

        // Convert EmailIntegration to EmailPlatformConfig
        const platformConfig = {
          type: integration.platform,
          apiKey: integration.api_key,
          listId: integration.list_id,
          dc: integration.dc,
          apiUrl: integration.api_url,
        }

        try {
          // Sync the new member to the user's email platform
          const result = await syncNewMemberToEmailPlatforms(memberData, platformConfig)
          return { userId: profile.user_id, ...result }
        } catch (error) {
          console.error(`Error syncing member for user ${profile.user_id}:`, error)
          return { 
            userId: profile.user_id, 
            success: false, 
            message: error instanceof Error ? error.message : "Sync failed" 
          }
        }
      }),
    )

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
      results: syncResults,
    })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
