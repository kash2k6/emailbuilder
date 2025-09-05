import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { productId, successUrl, cancelUrl, upsellProductId, downsellProductId } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Construct the API URL
    const apiUrl = "https://api.whop.com/api/v2/checkout/sessions"

    // Prepare the request body
    const requestBody: any = {
      product_id: productId,
      success_url: successUrl || process.env.NEXT_PUBLIC_REDIRECT_URI || "https://example.com/success",
      cancel_url: cancelUrl || process.env.NEXT_PUBLIC_REDIRECT_URI || "https://example.com/cancel",
    }

    // Add upsell/downsell products if provided
    if (upsellProductId) {
      requestBody.upsell_product_id = upsellProductId
    }

    if (downsellProductId) {
      requestBody.downsell_product_id = downsellProductId
    }

    // Make the API request to Whop
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WHOP_CLIENT_SECRET}`,
      },
      body: JSON.stringify(requestBody),
    })

    // Parse the response
    const data = await response.json()

    // Check if the request was successful
    if (!response.ok) {
      console.error("Error creating checkout session:", data)
      return NextResponse.json(
        { error: data.message || "Failed to create checkout session" },
        { status: response.status },
      )
    }

    // Return the checkout URL
    return NextResponse.json({
      checkoutUrl: data.data.url,
      sessionId: data.data.id,
    })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
