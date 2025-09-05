import { headers } from "next/headers"
import { Suspense } from "react"
import { whopSdk } from "@/lib/whop-sdk"
import { getProfile, getEmailPlatformConfig, checkSubscriptionStatus } from "@/app/actions"
import DashboardClient from "@/components/dashboard-client"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { WhopExperienceProvider } from "@/components/whop-experience-provider"

interface DashboardPageProps {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  try {
    console.log("🔐 AUTH: === DASHBOARD PAGE AUTHENTICATION START ===")
    console.log("🔐 AUTH: Timestamp:", new Date().toISOString())
    
    const headersList = await headers()
    const resolvedParams = await params
    const resolvedSearchParams = await searchParams
    
    console.log("🔐 AUTH: Company ID:", resolvedParams.companyId)
    console.log("🔐 AUTH: Search params:", resolvedSearchParams)
    
    // Debug: Log all available headers to understand what Whop sends
    console.log("🔐 AUTH: === ALL AVAILABLE HEADERS ===")
    const headerEntries = Object.fromEntries(headersList.entries())
    console.log("🔐 AUTH: Headers:", JSON.stringify(headerEntries, null, 2))
    
    // Look for Whop-specific headers
    const whopHeaders = {
      'x-whop-user-token': headersList.get('x-whop-user-token'),
      'x-whop-company-id': headersList.get('x-whop-company-id'),
      'x-whop-experience-id': headersList.get('x-whop-experience-id'),
      'authorization': headersList.get('authorization'),
      'cookie': headersList.get('cookie') ? 'PRESENT' : 'NOT_PRESENT'
    }
    console.log("🔐 AUTH: === WHOP HEADERS EXTRACTED ===")
    console.log("🔐 AUTH: Whop headers:", JSON.stringify(whopHeaders, null, 2))
    
    // Handle development mode
    const devToken = resolvedSearchParams["whop-dev-user-token"] as string
    let userId: string
    let isDevelopmentMode = false

    // Enhanced development mode detection
    const isLocalDevelopment = process.env.NODE_ENV === 'development' || 
                              process.env.NODE_ENV === undefined || // Default to development if not set
                              process.env.VERCEL_ENV === 'preview' ||
                              process.env.VERCEL_ENV === 'development' ||
                              process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    console.log("🔐 AUTH: === AUTHENTICATION MODE DETECTION ===")
    console.log("🔐 AUTH: Dev token present:", !!devToken)
    console.log("🔐 AUTH: Dev token value:", devToken ? devToken.substring(0, 20) + "..." : "NONE")
    console.log("🔐 AUTH: Environment variables:", {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE
    })
    console.log("🔐 AUTH: Is local development:", isLocalDevelopment)

    if (devToken || isLocalDevelopment) {
      console.log("🔐 AUTH: === DEVELOPMENT MODE DETECTED ===")
      isDevelopmentMode = true
      
      if (devToken === "test-token") {
        // Simple test token for development
        userId = "dev-user-id"
        console.log("🔐 AUTH: Using test token for development")
      } else if (devToken) {
        // Extract user ID from the JWT token in development mode
        try {
          console.log("🔐 AUTH: Parsing development JWT token...")
          const tokenParts = devToken.split('.')
          console.log("🔐 AUTH: Token parts count:", tokenParts.length)
          
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
            userId = payload.sub
            console.log("🔐 AUTH: ✅ Extracted user ID from dev token:", userId)
            console.log("🔐 AUTH: Full JWT payload:", JSON.stringify(payload, null, 2))
          } else {
            throw new Error("Invalid development token structure")
          }
        } catch (error) {
          console.error("🔐 AUTH: ❌ Error parsing dev token:", error)
          throw new Error("Invalid development token")
        }
      } else {
        // Local development without token - use default dev user
        userId = "dev-user-id"
        console.log("🔐 AUTH: Local development detected - using default dev user ID")
      }
    } else {
      // Production mode - use official Whop SDK authentication
      console.log("🔐 AUTH: === PRODUCTION MODE DETECTED ===")
      console.log("🔐 AUTH: Using Whop SDK authentication...")
      
      try {
        console.log("🔐 AUTH: Calling whopSdk.verifyUserToken...")
        // Extract the user ID from the verified auth JWT token (official Whop pattern)
        const { userId: extractedUserId } = await whopSdk.verifyUserToken(headersList)
        userId = extractedUserId
        console.log("🔐 AUTH: ✅ Successfully extracted user ID from Whop headers:", userId)
      } catch (error) {
        console.error("🔐 AUTH: ❌ Error extracting user ID from headers:", error)
        console.error("🔐 AUTH: Error details:", JSON.stringify(error, null, 2))
          throw new Error("Failed to authenticate with Whop")
      }
    }

    // Validate that the user has access to this company
    console.log("🔐 AUTH: === COMPANY ACCESS VALIDATION ===")
    const headerCompanyId = headersList.get('x-whop-company-id')
    
    // If header company ID is provided, validate it matches the URL
    if (headerCompanyId && resolvedParams.companyId !== headerCompanyId) {
      console.log("🔐 AUTH: ❌ Company ID mismatch")
      console.log("🔐 AUTH: URL company ID:", resolvedParams.companyId)
      console.log("🔐 AUTH: Header company ID:", headerCompanyId)
      throw new Error("Access denied to this company")
    }
    
    // If no header company ID (common in dashboard context), proceed with URL company ID
    console.log("🔐 AUTH: ✅ Company access validation passed")
    console.log("🔐 AUTH: Using company ID from URL:", resolvedParams.companyId)

    // Get user information using proper Whop SDK authentication
    let user
    let existingApiKey: string | null = null
    let existingIntegration: any = null

    // Always try to get real user data first, regardless of development mode
    try {
      console.log("🔐 AUTH: Loading user profile for user " + userId)
      user = await whopSdk.users.getUser({ userId })
      console.log("🔐 AUTH: Successfully fetched user data from Whop API:", user)
      
      // Check for existing API key in storage
      const profile = await getProfile(userId)
      if (profile?.whop_api_key) {
        existingApiKey = profile.whop_api_key
        console.log("🔐 AUTH: Found existing API key in storage for user:", userId)
      }
    } catch (error) {
      console.error("🔐 AUTH: Error fetching user from Whop API:", error)
      
      // In production, continue with fallback user data instead of throwing
      // This prevents the entire app from breaking due to API issues
      console.log("🔐 AUTH: Using fallback user data due to API error")
      user = {
        id: userId,
        email: `user-${userId}@example.com`,
        username: 'user',
        profile_pic_url: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      }
      
      // Still try to get the API key from storage
      try {
        const profile = await getProfile(userId)
        if (profile?.whop_api_key) {
          existingApiKey = profile.whop_api_key
          console.log("🔐 AUTH: Found existing API key in storage for user:", userId)
        }
      } catch (profileError) {
        console.error("🔐 AUTH: Error fetching profile:", profileError)
      }
    }

    // Check for existing email platform integration
    if (existingApiKey) {
      existingIntegration = await getEmailPlatformConfig(userId)
      if (existingIntegration) {
        console.log("🔐 AUTH: Found existing email platform integration:", existingIntegration.platform)
      }
    }

    // Check subscription status using the working checkSubscriptionStatus function
    console.log("🔐 AUTH: === SUBSCRIPTION STATUS CHECK ===")
    let subscriptionStatus
    try {
      console.log("🔐 AUTH: Calling checkSubscriptionStatus for user " + userId + "...")
      subscriptionStatus = await checkSubscriptionStatus(userId)
      console.log("🔐 AUTH: ✅ Subscription status check successful:")
      console.log("🔐 AUTH: Subscription status result:", JSON.stringify(subscriptionStatus, null, 2))
    } catch (error) {
      console.error("🔐 AUTH: ❌ Error checking subscription status:", error)
      console.error("🔐 AUTH: Error details:", JSON.stringify(error, null, 2))
      
      // Only grant access in development mode if API fails
      if (isDevelopmentMode) {
        console.log("🔐 AUTH: === DEVELOPMENT MODE FALLBACK ===")
        console.log("🔐 AUTH: Development mode - granting access due to API error")
        subscriptionStatus = {
          hasActiveSubscription: true,
          subscription: {
            status: "active",
            accessLevel: "premium",
            productId: "prod_GrJaeMp2e3DBu"
          },
          trialExpired: false
        }
        console.log("🔐 AUTH: Fallback subscription status:", JSON.stringify(subscriptionStatus, null, 2))
      } else {
        console.log("🔐 AUTH: === PRODUCTION MODE FALLBACK ===")
        console.log("🔐 AUTH: Production mode - denying access due to API error")
        subscriptionStatus = {
          hasActiveSubscription: false,
          subscription: null,
          trialExpired: false
        }
        console.log("🔐 AUTH: Fallback subscription status:", JSON.stringify(subscriptionStatus, null, 2))
      }
    }
    
    console.log("🔐 AUTH: === FINAL SUBSCRIPTION STATUS ===")
    console.log("🔐 AUTH: Final subscription status:", JSON.stringify(subscriptionStatus, null, 2))

    console.log("🔐 AUTH: Authenticated user:", user)

    // Render the dashboard
    return (
      <WhopExperienceProvider
        experienceId={null}
        whopToken={devToken || ""}
        whopUserId={userId}
        whopCompanyId={resolvedParams.companyId}
      >
        <div className="min-h-screen bg-background">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardClient 
              whopToken={devToken || ""} 
              whopUserId={userId} 
              whopCompanyId={resolvedParams.companyId}
              existingApiKey={existingApiKey}
              existingIntegration={existingIntegration}
              subscriptionStatus={subscriptionStatus}
            />
          </Suspense>
        </div>
      </WhopExperienceProvider>
    )
  } catch (error) {
    console.error("🔐 AUTH: Authentication error:", error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Authentication Error
          </h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
        </div>
      </div>
    )
  }
}
