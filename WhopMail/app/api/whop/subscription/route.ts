import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get user's subscription from Whop API
    const response = await fetch(`https://api.whop.com/api/v2/users/${userId}/subscriptions`, {
      headers: {
        Authorization: `Bearer ${process.env.WHOP_CLIENT_SECRET}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("Error fetching subscription:", response.status, response.statusText)
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, planId } = await request.json()

    if (!userId || !planId) {
      return NextResponse.json({ error: "User ID and Plan ID are required" }, { status: 400 })
    }

    // Create subscription with 3-day trial
    const response = await fetch("https://api.whop.com/api/v2/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHOP_CLIENT_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        plan_id: planId,
        trial_days: 3
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error creating subscription:", errorData)
      return NextResponse.json({ error: "Failed to create subscription" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating subscription:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
} 