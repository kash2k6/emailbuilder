"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { fetchWhopMembers } from "@/app/actions"
import type { WhopApiResponse, EmailPlatformConfig } from "@/app/types"
import { DashboardContent } from "@/components/dashboard-content"
import { DashboardShell } from "@/components/dashboard-shell"
import { Loader2 } from "lucide-react"

interface DashboardClientProps {
  whopToken: string | null
  whopUserId: string | null
  whopCompanyId: string | null
  existingApiKey?: string | null
  existingIntegration?: any
  subscriptionStatus?: any
}

/**
 * DashboardClient (Client Component)
 *
 * This component handles all the client-side state, hooks, and interactivity
 * for the dashboard. It receives server-side data (like Whop headers) as props.
 */
export default function DashboardClient({ 
  whopToken, 
  whopUserId, 
  whopCompanyId, 
  existingApiKey,
  existingIntegration,
  subscriptionStatus 
}: DashboardClientProps) {
  // Improved Whop context detection
  // We're in Whop context if:
  // 1. We have a Whop user ID (from headers or dev token)
  // 2. OR we're on a Whop domain (whop.com, apps.whop.com, etc.)
  // 3. OR we have a valid dev token
  const isWhopContext = !!whopUserId || 
                       (typeof window !== 'undefined' && (
                         window.location.hostname.includes('whop.com') ||
                         window.location.hostname.includes('whopmail.com')
                       )) ||
                       !!whopToken

  const [activeTab, setActiveTab] = useState("setup")
  const [apiKeySubmitted, setApiKeySubmitted] = useState(!!existingApiKey)
  const [apiKey, setApiKey] = useState(existingApiKey || "")
  const [emailPlatformSelected, setEmailPlatformSelected] = useState(!!existingIntegration)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(existingIntegration?.platform || null)
  
  // Map the existing integration to the correct platformConfig structure
  const mapIntegrationToConfig = (integration: any): EmailPlatformConfig | null => {
    if (!integration) return null
    
    return {
      type: integration.platform,
      apiKey: integration.api_key,
      listId: integration.list_id,
      dc: integration.dc,
      apiUrl: integration.api_url,
    }
  }
  
  const [platformConfig, setPlatformConfig] = useState<EmailPlatformConfig | null>(mapIntegrationToConfig(existingIntegration))
  const [showEmailSelector, setShowEmailSelector] = useState(false)
  const [memberData, setMemberData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [syncedCount, setSyncedCount] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [manualMembersCount, setManualMembersCount] = useState<number>(0)
  const [isInitializing, setIsInitializing] = useState(true)

  // Function to fetch manual members count
  const fetchManualMembersCount = async (whopUserId: string): Promise<number> => {
    try {
      const response = await fetch(`/api/manual-members?whopUserId=${whopUserId}`)
      if (response.ok) {
        const data = await response.json()
        return data.data?.members?.length || 0
      }
    } catch (error) {
      console.error('Error fetching manual members count:', error)
    }
    return 0
  }

  const searchParams = useSearchParams()

  // Update platformConfig when existingIntegration changes
  useEffect(() => {
    setPlatformConfig(mapIntegrationToConfig(existingIntegration))
    setEmailPlatformSelected(!!existingIntegration)
    setSelectedPlatform(existingIntegration?.platform || null)
  }, [existingIntegration])

  // Check for auth token in URL (for Whop context)
  useEffect(() => {
    const token = searchParams.get("token")
    const devToken = searchParams.get("whop-dev-user-token")
    
    if (token) {
              localStorage.setItem("emailsync_access_token", token)
      const newUrl = window.location.pathname
      window.history.replaceState({}, "", newUrl)
    } else if (devToken) {
      // In development mode, use the dev token as the access token
              localStorage.setItem("emailsync_access_token", devToken)
      const newUrl = window.location.pathname
      window.history.replaceState({}, "", newUrl)
    }
  }, [searchParams])

  // Initialize user data using Whop context only
  useEffect(() => {
    async function initialize() {
      setIsInitializing(true)
      if (!isWhopContext) {
        setIsInitializing(false)
        return
      }
      setCompanyId(whopCompanyId)
      
      // If we have an existing API key, automatically load members
      if (existingApiKey) {
        setApiKey(existingApiKey)
        setApiKeySubmitted(true)
        
        // Automatically load member data
        console.log("API key found, automatically loading members")
        setIsLoading(true)
        
        try {
          const { fetchWhopMembers } = await import("@/app/actions")
          const data = await fetchWhopMembers(existingApiKey, 1, 50)
          if (data.success && data.members) {
            setMemberData(data)
            setLastSyncTime(data.timestamp || new Date().toISOString())
            setCurrentPage(data.currentPage || 1)
            setTotalPages(data.totalPages || 1)
            setSyncedCount(data.totalMembers || data.members.length)
            setActiveTab("members")
            console.log(`✅ Automatically loaded ${data.members.length} members`)
          } else {
            console.error("Failed to automatically load members:", data.error)
          }
        } catch (error) {
          console.error("Error automatically loading members:", error)
        } finally {
          setIsLoading(false)
        }
        
        // Fetch manual members count
        if (whopUserId) {
          const manualCount = await fetchManualMembersCount(whopUserId)
          setManualMembersCount(manualCount)
        }
      } else if (subscriptionStatus?.hasActiveSubscription) {
        // User has active subscription but no API key - they need to add their own API key
        console.log("User has active subscription but no API key - they need to add their own API key")
        setActiveTab("setup")
        setApiKeySubmitted(false)
        setApiKey("")
      }
      
      // Show email platform selector if no platform is configured yet
      if (!existingIntegration) {
        setShowEmailSelector(true)
      }
      
      setIsInitializing(false)
    }
    initialize()
    // Only run on mount or when Whop context changes
  }, [isWhopContext, whopCompanyId, existingApiKey, subscriptionStatus])

  if (isInitializing) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardContent
      isWhopContext={isWhopContext}
      // Pass all the state and handlers down to the presentation component
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      apiKey={apiKey}
      setApiKey={setApiKey}
      apiKeySubmitted={apiKeySubmitted}
      setApiKeySubmitted={setApiKeySubmitted}
      emailPlatformSelected={emailPlatformSelected}
      setEmailPlatformSelected={setEmailPlatformSelected}
      selectedPlatform={selectedPlatform}
      setSelectedPlatform={setSelectedPlatform}
      platformConfig={platformConfig}
      setPlatformConfig={setPlatformConfig}
      showEmailSelector={showEmailSelector}
      setShowEmailSelector={setShowEmailSelector}
      memberData={memberData}
      setMemberData={setMemberData}
      isLoading={isLoading}
      setIsLoading={setIsLoading}
      lastSyncTime={lastSyncTime}
      setLastSyncTime={setLastSyncTime}
      syncedCount={syncedCount}
      setSyncedCount={setSyncedCount}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      totalPages={totalPages}
      setTotalPages={setTotalPages}
      userId={whopUserId} // Pass whopUserId instead of companyId
      error={null}
      setError={() => {}}
      subscriptionStatus={subscriptionStatus}
      whopToken={whopToken}
      manualMembersCount={manualMembersCount}
      setManualMembersCount={setManualMembersCount}
    />
  )
}
