import { type NextRequest, NextResponse } from "next/server"
import { fetchMembershipPage } from "@/lib/whop"

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key is required" }, { status: 400 })
    }

    // Fetch members directly from Whop API
    const { data: members, pagination } = await fetchMembershipPage(apiKey, 1, 100)

    return NextResponse.json({
      success: true,
      members: members || [],
      totalMembers: pagination?.total_count || 0,
      activeMembers: members ? members.filter((m: any) => m.valid).length : 0,
      expiringMembers: members ? members.filter((m: any) => m.status === "expiring").length : 0,
    })
  } catch (error) {
    console.error("Error syncing members:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to sync members" 
    }, { status: 500 })
  }
}
