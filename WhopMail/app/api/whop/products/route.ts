import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Get the Whop API key from environment variables
    const apiKey = process.env.WHOP_CLIENT_SECRET

    if (!apiKey) {
      console.error("Missing WHOP_CLIENT_SECRET environment variable")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Make the API call to Whop
    const response = await fetch("https://api.whop.com/api/v2/products", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Whop API error:", errorData)
      return NextResponse.json({ error: "Failed to fetch products from Whop" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching products from Whop:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
