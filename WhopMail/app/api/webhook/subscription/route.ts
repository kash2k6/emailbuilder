import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, data } = body

    console.log(`Subscription webhook received: ${event}`, data)

    switch (event) {
      case "subscription.created":
        await handleSubscriptionCreated(data)
        break
      case "subscription.updated":
        await handleSubscriptionUpdated(data)
        break
      case "subscription.cancelled":
        await handleSubscriptionCancelled(data)
        break
      default:
        console.log(`Unhandled subscription event: ${event}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing subscription webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleSubscriptionCreated(data: any) {
  try {
    const { subscription, user } = data
    
    // Store subscription data
    await storage.upsertCompanyProfile({
      company_id: user.id,
      whop_api_key: "", // Will be set when user enters API key
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_ends_at,
      current_period_ends_at: subscription.current_period_ends_at,
      plan_id: subscription.plan_id
    })

    console.log(`Subscription created for user ${user.id}: ${subscription.id}`)
  } catch (error) {
    console.error("Error handling subscription created:", error)
  }
}

async function handleSubscriptionUpdated(data: any) {
  try {
    const { subscription, user } = data
    
    // Update subscription data
    await storage.upsertCompanyProfile({
      company_id: user.id,
      whop_api_key: "", // Preserve existing API key
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_ends_at,
      current_period_ends_at: subscription.current_period_ends_at,
      plan_id: subscription.plan_id
    })

    console.log(`Subscription updated for user ${user.id}: ${subscription.id}`)
  } catch (error) {
    console.error("Error handling subscription updated:", error)
  }
}

async function handleSubscriptionCancelled(data: any) {
  try {
    const { subscription, user } = data
    
    // Update subscription status to cancelled
    await storage.upsertCompanyProfile({
      company_id: user.id,
      whop_api_key: "", // Preserve existing API key
      subscription_id: subscription.id,
      subscription_status: "cancelled",
      trial_ends_at: subscription.trial_ends_at,
      current_period_ends_at: subscription.current_period_ends_at,
      plan_id: subscription.plan_id
    })

    console.log(`Subscription cancelled for user ${user.id}: ${subscription.id}`)
  } catch (error) {
    console.error("Error handling subscription cancelled:", error)
  }
} 