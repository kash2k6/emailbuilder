import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 })
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://api.whop.com/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.WHOP_CLIENT_ID,
        client_secret: process.env.WHOP_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.WHOP_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token")
    }

    const tokenData = await tokenResponse.json()

    // Store the access token securely (you might want to use a database)
    // For now, we'll redirect to the dashboard with the token
    const redirectUrl = new URL("/dashboard", request.url)
    redirectUrl.searchParams.set("token", tokenData.access_token)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("OAuth error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
