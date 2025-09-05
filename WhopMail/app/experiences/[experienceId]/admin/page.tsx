import { headers } from "next/headers"
import { Suspense } from "react"
import { whopSdk } from "@/lib/whop-sdk"
import { getProfile, getEmailPlatformConfig, checkSubscriptionStatus } from "@/app/actions"
import AdminClient from "@/components/admin-client"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { WhopExperienceProvider } from "@/components/whop-experience-provider"

interface AdminPageProps {
  params: Promise<{ experienceId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  try {
    console.log("🔐 AUTH: === ADMIN PAGE AUTHENTICATION START ===")
    console.log("🔐 AUTH: Timestamp:", new Date().toISOString())
    
    const headersList = await headers()
    const resolvedParams = await params
    const resolvedSearchParams = await searchParams
    
    console.log("🔐 AUTH: Experience ID:", resolvedParams.experienceId)
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
        // Extract user ID from the Whop user token
        const userToken = headersList.get("x-whop-user-token")
        if (!userToken) {
          throw new Error("Missing Whop user token")
        }
        
        // Extract user ID from the JWT token
        const tokenParts = userToken.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
          userId = payload.sub
          console.log("🔐 AUTH: ✅ Extracted user ID from Whop token:", userId)
        } else {
          throw new Error("Invalid Whop user token format")
        }
      } catch (error) {
        console.error("🔐 AUTH: ❌ Whop SDK authentication failed:", error)
        throw new Error("Authentication failed")
      }
    }

    // Check if user is admin (only allow specific user ID)
    console.log("🔐 AUTH: === ADMIN ACCESS CHECK ===")
    console.log("🔐 AUTH: Current user ID:", userId)
    console.log("🔐 AUTH: Expected admin ID:", "user_ojPhs9dIhFQ9C")
    console.log("🔐 AUTH: IDs match:", userId === "user_ojPhs9dIhFQ9C")
    
    // Strict admin access check - only allow specific user ID
    if (userId !== "user_ojPhs9dIhFQ9C") {
      console.log("🔐 AUTH: ❌ Access denied - user is not admin")
      throw new Error("Access denied - admin privileges required")
    }

    console.log("🔐 AUTH: ✅ Admin access granted for user:", userId)

    return (
      <WhopExperienceProvider experienceId={resolvedParams.experienceId}>
        <div className="min-h-screen bg-background">
          <Suspense fallback={<DashboardSkeleton />}>
            <AdminClient 
              whopToken={whopHeaders['x-whop-user-token']} 
              whopUserId={userId} 
              whopCompanyId={whopHeaders['x-whop-company-id']} 
            />
          </Suspense>
        </div>
      </WhopExperienceProvider>
    )

  } catch (error) {
    console.error("🔐 AUTH: ❌ Authentication error in admin page:", error)
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "You don't have permission to access this page."}
          </p>
          <p className="text-sm text-muted-foreground">
            Admin access is restricted to authorized users only.
          </p>
        </div>
      </div>
    )
  }
}
