import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface WhopWebhookEvent {
  action: string
  data: {
    id: string
    product_id: string
    user_id: string
    plan_id: string
    page_id: string
    created_at: number
    expires_at: number | null
    renewal_period_start: number | null
    renewal_period_end: number | null
    quantity: number
    status: string
    valid: boolean
    cancel_at_period_end: boolean
    license_key: string
    metadata: any
    checkout_id: string
    // Payment event fields
    amount?: number
    currency?: string
    member?: {
      id: string
      user_id: string
      product_id: string
      status: string
      valid: boolean
    }
    product?: {
      id: string
      title: string
    }
    user?: {
      id: string
      email: string
      username: string
    }
    // Payment-specific fields
    membership_id?: string
    company_id?: string
    user_email?: string
    user_username?: string
    final_amount?: number
    subtotal?: number
    billing_reason?: string
  }
  company_id?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log(`=== WEBHOOK RECEIVED ===`)
    
    // Parse the webhook payload
    const event: WhopWebhookEvent = await request.json()
    
    console.log(`Action: ${event.action}`)
    console.log(`Company ID: ${event.company_id}`)
    console.log(`Membership ID: ${event.data.id}`)

    // Extract company_id based on event type
    let companyId = event.company_id
    
    // For payment events, extract company_id from the data object
    if (event.action.startsWith('payment.') && !companyId) {
      if (event.data.company_id) {
        companyId = event.data.company_id
        console.log(`🔍 Extracted company_id from data.company_id: ${companyId}`)
      } else if (event.data.user_id) {
        companyId = event.data.user_id
        console.log(`🔍 Extracted company_id from data.user_id: ${companyId}`)
      } else if (event.data.user?.id) {
        companyId = event.data.user.id
        console.log(`🔍 Extracted company_id from data.user.id: ${companyId}`)
      } else if (event.data.member?.user_id) {
        companyId = event.data.member.user_id
        console.log(`🔍 Extracted company_id from data.member.user_id: ${companyId}`)
      }
    }

    if (!companyId) {
      console.log(`❌ Could not determine company_id for action: ${event.action}`)
      console.log(`📋 Event data:`, JSON.stringify(event, null, 2))
      return NextResponse.json(
        {
          success: false,
          error: "Could not determine company_id",
          action: event.action,
          eventId: event.data.id
        },
        { status: 400 }
      )
    }

    console.log(`✅ Using company_id: ${companyId}`)

    // Forward to Supabase Edge Function for processing
    console.log(`📤 Forwarding to Supabase Edge Function...`)
    
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/webhook-processor`
    
    // Create a normalized event with the correct company_id
    const normalizedEvent = {
      ...event,
      company_id: companyId
    }
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(normalizedEvent),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Edge function error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process webhook",
          details: `Edge function returned ${response.status}`,
        },
        { status: 500 },
      )
    }

    const result = await response.json()
    console.log(`✅ Edge function result:`, result)

    return NextResponse.json({
      success: true,
      message: "Webhook forwarded to Supabase Edge Function",
      eventId: event.data.id,
      action: event.action,
      companyId: companyId,
      edgeFunctionResult: result
    })

  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
