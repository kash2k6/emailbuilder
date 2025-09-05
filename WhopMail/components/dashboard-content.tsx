"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ApiKeyForm } from "@/components/api-key-form"
import { EmailPlatformSelector } from "@/components/email-platform-selector"
import { MembersList } from "@/components/members-list"
import { UnifiedMembersList } from "@/components/unified-members-list"
import { MembersDashboard } from "@/components/membership-dashboard"
import { ManualListUpload } from "@/components/manual-list-upload"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { fetchWhopMembers } from "@/app/actions"
import type { WhopApiResponse, EmailPlatformConfig } from "@/app/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MailchimpListActivity } from "@/components/mailchimp-list-activity"
import { WebhookSetupGuide } from "@/components/webhook-setup-guide"
import { saveApiKey, getProfile, saveEmailPlatformConfig } from "@/app/actions"
import { getEmailSyncConfig, getUserEmailOverview } from "@/app/actions/emailsync"
import { SubscriptionStatus } from "@/components/subscription-status"
import { PlanSelector } from "@/components/plan-selector"
import { PlanSelectionOnboarding } from "@/components/plan-selection-onboarding"
import EmailSyncDashboard from "@/app/emailsync/page"
import { Building2, MessageSquare } from "lucide-react"
import { AppBuilderApiKeys } from "@/components/app-builder-api-keys"
import { AppBuilderCompanies } from "@/components/app-builder-companies"
import WhopInternalMarketing from "@/components/whop-internal-marketing"

// Define the props for the presentation component
interface DashboardContentProps {
  manualMembersCount?: number
  setManualMembersCount?: (count: number) => void
  isWhopContext: boolean
  activeTab: string
  setActiveTab: (tab: string) => void
  apiKey: string
  setApiKey: (key: string) => void
  apiKeySubmitted: boolean
  setApiKeySubmitted: (submitted: boolean) => void
  emailPlatformSelected: boolean
  setEmailPlatformSelected: (selected: boolean) => void
  selectedPlatform: string | null
  setSelectedPlatform: (platform: string | null) => void
  platformConfig: EmailPlatformConfig | null
  setPlatformConfig: (config: EmailPlatformConfig | null) => void
  showEmailSelector: boolean
  setShowEmailSelector: (show: boolean) => void
  memberData: any | null
  setMemberData: (data: any | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  lastSyncTime: string | null
  setLastSyncTime: (time: string | null) => void
  syncedCount: number | null
  setSyncedCount: (count: number | null) => void
  currentPage: number
  setCurrentPage: (page: number) => void
  totalPages: number
  setTotalPages: (pages: number) => void
  userId: string | null
  error: string | null
  setError: (error: string | null) => void
  subscriptionStatus: any
  whopToken: string | null
}

const EMAIL_PLATFORMS = [
  { 
    id: "resend", 
    name: "EmailSync Email System",
    logo: "https://resend.com/logo.svg"
  },
  { 
    id: "mailchimp", 
    name: "Mailchimp",
    logo: "https://mailchimp.com/ctf/images/yzco4xsimv0y/5HGKFgXj6e9y5XOVcNsAXu/82164e5e1043c89c11e2777933b03bb2/MC_50-50_-_Brand_Assets_01.png?w=1960&fm=avif&q=60"
  },
  { 
    id: "convertkit", 
    name: "ConvertKit",
    logo: "https://media.kit.com/images/logos/kit-logo-warm-white.svg"
  },
  { 
    id: "klaviyo", 
    name: "Klaviyo",
    logo: "https://www.klaviyo.com/wp-content/uploads/2022/09/Klaviyo_primary_mark_poppy-67-550x226-1.png"
  },
  { 
    id: "activecampaign", 
    name: "ActiveCampaign",
    logo: "AC"
  },
  { 
    id: "gohighlevel", 
    name: "GoHighLevel",
    logo: "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/48175265739/original/PAUWak17_5otrZlX-2umd5Eisu-X_cq0fw.jpg?1641235578"
  },
]

export function DashboardContent({
  manualMembersCount,
  setManualMembersCount,
  isWhopContext,
  activeTab,
  setActiveTab,
  apiKey,
  setApiKey,
  apiKeySubmitted,
  setApiKeySubmitted,
  emailPlatformSelected,
  setEmailPlatformSelected,
  selectedPlatform,
  setSelectedPlatform,
  platformConfig,
  setPlatformConfig,
  showEmailSelector,
  setShowEmailSelector,
  memberData,
  setMemberData,
  isLoading,
  setIsLoading,
  lastSyncTime,
  setLastSyncTime,
  syncedCount,
  setSyncedCount,
  currentPage,
  setCurrentPage,
  totalPages,
  setTotalPages,
  userId,
  error,
  setError,
  subscriptionStatus,
  whopToken,
}: DashboardContentProps) {
  // Add state for current user
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [hasTriedFetchingUser, setHasTriedFetchingUser] = useState(false)

  // Function to fetch current user
  const fetchCurrentUser = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoadingUser) return
    
    // Only fetch if we have a userId or if we're in development mode
    if (!userId && !isWhopContext) return
    
    // Prevent infinite loop - only try once
    if (hasTriedFetchingUser) return
    
    setIsLoadingUser(true)
    setHasTriedFetchingUser(true)
    try {
      // Use server action to get current user
      const { getCurrentUser } = await import("@/app/actions/get-current-user")
      const result = await getCurrentUser()
      if (result) {
        setCurrentUser(result)
      }
    } catch (error) {
      console.error("Error fetching current user:", error)
    } finally {
      setIsLoadingUser(false)
    }
  }, [userId, isLoadingUser, isWhopContext, hasTriedFetchingUser])

  // Fetch user on component mount - only if we have proper context
  useEffect(() => {
    // Only fetch if we have a userId or if we're in Whop context
    if (userId || isWhopContext) {
      fetchCurrentUser()
    }
  }, [userId, fetchCurrentUser, isWhopContext])

  // Calculate total contact count including manual members
  const totalContactCount = (memberData?.totalMembers || 0) + (manualMembersCount || 0)
  
  // Check if user is over their plan limit
  const isOverPlanLimit = subscriptionStatus?.subscription?.contactLimit && 
    totalContactCount > subscriptionStatus.subscription.contactLimit

  const getPlatformUrl = (config: EmailPlatformConfig): string => {
    switch (config.type) {
      case "resend":
        return "https://resend.com/contacts"
      case "mailchimp":
        return `https://${config.dc || "us1"}.admin.mailchimp.com/audience/`
      case "convertkit":
        return "https://app.convertkit.com/subscribers"
      case "klaviyo":
        return "https://www.klaviyo.com/lists"
      case "activecampaign":
        return config.apiUrl ? `${config.apiUrl}/app/contacts/` : "https://www.activecampaign.com/"
      case "gohighlevel":
        return "https://app.gohighlevel.com/contacts"
      default:
        return "#"
    }
  }

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

  const handleApiKeySubmit = async (submittedApiKey: string, data?: WhopApiResponse) => {
    setApiKey(submittedApiKey)
    setApiKeySubmitted(true)
    setError(null)
    setIsLoading(true)

    try {
      // Check subscription status before allowing API key submission
      console.log("=== SUBSCRIPTION STATUS CHECK IN API KEY SUBMIT ===")
      console.log("Subscription status present:", !!subscriptionStatus)
      if (subscriptionStatus) {
        console.log("Subscription status details:", JSON.stringify(subscriptionStatus, null, 2))
        console.log("Has active subscription:", subscriptionStatus.hasActiveSubscription)
        console.log("Subscription object:", subscriptionStatus.subscription)
      }
      
      if (subscriptionStatus && !subscriptionStatus.hasActiveSubscription) {
        console.log("❌ Subscription check failed - denying API key submission")
        setError("You need an active subscription to use EmailSync. Please start your free trial or upgrade your subscription.")
        setApiKeySubmitted(false)
        setIsLoading(false)
        return
      }
      
      console.log("✅ Subscription check passed - allowing API key submission")

      // Save the API key to the user's profile (now includes automatic validation and sync)
      if (userId) { // userId is actually whopUserId here
        const result = await saveApiKey(submittedApiKey, userId)
        
        if (result.success) {
          // API key was validated and members were automatically synced
          console.log(`API key validated successfully! Automatically synced ${result.syncedCount} members.`)
          
          // Fetch the first page of member data to display (using paginated approach)
          const { fetchWhopMembers } = await import("@/app/actions")
          const memberData = await fetchWhopMembers(submittedApiKey, 1, 50)
          if (memberData.success && memberData.members) {
            setMemberData(memberData)
            setLastSyncTime(memberData.timestamp || new Date().toISOString())
            setCurrentPage(memberData.currentPage || 1)
            setTotalPages(memberData.totalPages || 1)
            setSyncedCount(result.syncedCount || memberData.totalMembers || null)
            setActiveTab("members")
            
            // Automatically show email platform selector if no platform is selected yet
            if (!emailPlatformSelected) {
              setShowEmailSelector(true)
            }
          }
        } else {
          setError("Failed to validate API key or sync members.")
        }
      }
    } catch (error) {
      console.error("Error submitting API key:", error)
      setError(error instanceof Error ? error.message : "Failed to save API key")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailPlatformSelect = async (platform: string, count?: number, config?: EmailPlatformConfig) => {
    setSelectedPlatform(platform)
    setEmailPlatformSelected(true)
    setShowEmailSelector(false)
    setSyncedCount(count || null)
    setLastSyncTime(new Date().toISOString())

    if (config && userId) { // userId is actually whopUserId here
      setPlatformConfig(config)
      // Save the email platform configuration
      // Now using user-based storage - each user has their own email platform settings
      await saveEmailPlatformConfig(userId, {
        platform: platform, // Use the platform parameter instead of selectedPlatform
        apiKey: config.apiKey,
        listId: config.listId,
        dc: config.dc,
        apiUrl: config.apiUrl,
      })
    }
  }

  const handleChangeIntegration = async () => {
    // Always go back to platform selection, regardless of current platform
    setShowEmailSelector(true)
    setEmailPlatformSelected(false)
    setSelectedPlatform(null)
    setPlatformConfig(null)
  }

  const handleDisconnectIntegration = async () => {
    if (userId && platformConfig) {
      try {
        // Clear the integration by saving empty values
        // This will effectively "delete" it by overwriting with empty data
        await saveEmailPlatformConfig(userId, {
          platform: platformConfig.type,
          apiKey: "",
          listId: "",
          dc: "",
          apiUrl: "",
        })
        
        setEmailPlatformSelected(false)
        setSelectedPlatform(null)
        setPlatformConfig(null)
        setShowEmailSelector(true)
      } catch (error) {
        console.error("Error disconnecting integration:", error)
        setError("Failed to disconnect integration")
      }
    }
  }

  const handlePageChange = async (page: number) => {
    if (!apiKey || page < 1 || page > totalPages) return
    setIsLoading(true)
    try {
      const { fetchWhopMembers } = await import("@/app/actions")
      const data = await fetchWhopMembers(apiKey, page, 50)
      if (data.success && data.members) {
        setMemberData(data)
        setLastSyncTime(data.timestamp || new Date().toISOString())
        setCurrentPage(data.currentPage || page)
        setTotalPages(data.totalPages || totalPages)
      } else {
        setError(data.error || "Failed to fetch members for this page.")
      }
    } catch (err) {
      console.error("Error fetching page:", err)
      setError("An unexpected error occurred while fetching members.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMembers = async () => {
    if (!apiKey) {
      setError("No API key available. Please set up your API key first.")
      return
    }
    
    if (memberData && memberData.members && memberData.members.length > 0) {
      // Members already loaded, just switch to members tab
      setActiveTab("members")
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { fetchWhopMembers } = await import("@/app/actions")
      const data = await fetchWhopMembers(apiKey, 1, 50)
      if (data.success && data.members) {
        setMemberData(data)
        setLastSyncTime(data.timestamp || new Date().toISOString())
        setCurrentPage(data.currentPage || 1)
        setTotalPages(data.totalPages || 1)
        setSyncedCount(data.totalMembers || data.members.length)
        setActiveTab("members")
      } else {
        setError(data.error || "Failed to load members.")
      }
    } catch (err) {
      console.error("Error loading members:", err)
      setError("An unexpected error occurred while loading members.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncNow = async () => {
    // For ConvertKit, show the form selector to choose form and tags
    if (platformConfig?.type === "convertkit") {
      setShowEmailSelector(true)
      setEmailPlatformSelected(false)
      setSelectedPlatform("convertkit")
      return
    }
    
    // For other platforms, proceed with sync if we have the required data
    if (!apiKey || !platformConfig || !platformConfig.listId) {
      setError("Missing platform configuration. Please reconfigure your email platform integration.")
      return
    }
    setIsLoading(true)
    setError(null)
    
    try {
      // First, fetch all members from Whop
      console.log("=== SYNC NOW: FETCHING ALL MEMBERS ===")
      const { fetchAllWhopMembers } = await import("@/app/actions")
      const allMembersResult = await fetchAllWhopMembers(apiKey)
      
      if (!allMembersResult.success || !allMembersResult.members) {
        throw new Error(allMembersResult.error || "Failed to fetch all members")
      }
      
      console.log(`=== SYNC NOW: FOUND ${allMembersResult.members.length} MEMBERS ===`)
      
      // Now sync to the selected platform
      let syncResult
      switch (platformConfig.type) {
        case "klaviyo":
          const { syncMembersToKlaviyo } = await import("@/app/actions/klaviyo")
          syncResult = await syncMembersToKlaviyo(
            platformConfig.apiKey,
            platformConfig.listId,
            allMembersResult.members
          )
          break
        case "mailchimp":
          const { syncMembersToMailchimp } = await import("@/app/actions/mailchimp")
          syncResult = await syncMembersToMailchimp(
            platformConfig.apiKey,
            platformConfig.listId,
            platformConfig.dc || "us1",
            allMembersResult.members
          )
          break
        case "activecampaign":
          const { syncMembersToActiveCampaign } = await import("@/app/actions/activecampaign")
          syncResult = await syncMembersToActiveCampaign(
            platformConfig.apiKey,
            platformConfig.listId,
            platformConfig.apiUrl || "https://www.activecampaign.com",
            allMembersResult.members
          )
          break
        case "gohighlevel":
          const { syncMembersToGoHighLevel } = await import("@/app/actions/gohighlevel")
          syncResult = await syncMembersToGoHighLevel(
            platformConfig.apiKey,
            platformConfig.locationId || "",
            platformConfig.listId,
            allMembersResult.members
          )
          break
        case "resend":
          // For EmailSync (Resend), we need to use the new EmailSync actions
          if (userId) {
            // Get the EmailSync config to find the audience
            const emailConfig = await getEmailSyncConfig(userId)
            if (emailConfig.success && emailConfig.config) {
              // Find the audience that matches the listId
              const { getUserEmailAudiences } = await import("@/app/actions/emailsync")
              const audiences = await getUserEmailAudiences(userId)
              const audience = audiences.find(a => a.audience_id === platformConfig.listId)
              
              if (audience) {
                const { syncWhopMembersToEmailContacts } = await import("@/app/actions/emailsync")
                syncResult = await syncWhopMembersToEmailContacts(
                  audience.id,
                  allMembersResult.members
                )
              } else {
                throw new Error("EmailSync audience not found")
              }
            } else {
              throw new Error("EmailSync configuration not found")
            }
          } else {
            throw new Error("User ID not available for EmailSync")
          }
          break
        default:
          throw new Error(`Unsupported platform: ${platformConfig.type}`)
      }
      
      if (syncResult.success) {
        // Handle different return types from sync functions
        const syncedCount = 'processedCount' in syncResult ? syncResult.processedCount : syncResult.syncedCount
        
        console.log(`=== SYNC NOW: SUCCESSFULLY SYNCED ${syncedCount} MEMBERS ===`)
        setSyncedCount(syncedCount)
        setLastSyncTime(new Date().toISOString())
        
        // Update member data to show current state (use paginated approach)
        const { fetchWhopMembers } = await import("@/app/actions")
        const data = await fetchWhopMembers(apiKey, 1, 50)
        if (data.success && data.members) {
          setMemberData(data)
          setCurrentPage(data.currentPage || 1)
          setTotalPages(data.totalPages || 1)
        }
        
        // Show success message
        setError(null)
        // Note: In a real app, you might want to use a toast notification here
        console.log(`✅ Successfully synced ${syncedCount} members to ${platformConfig.type}!`)
      } else {
        // Handle different error property names
        const errorMessage = 'error' in syncResult ? syncResult.error : "Failed to sync members to email platform"
        throw new Error(errorMessage || "Failed to sync members to email platform")
      }
    } catch (err) {
      console.error("=== SYNC NOW ERROR ===")
      console.error("Error in handleSyncNow:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred during sync")
    } finally {
      setIsLoading(false)
    }
  }

  const formattedLastSyncTime = lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Never"
  const platformName = selectedPlatform ? EMAIL_PLATFORMS.find((p) => p.id === selectedPlatform)?.name : null
  const platformLogo = selectedPlatform ? EMAIL_PLATFORMS.find((p) => p.id === selectedPlatform)?.logo : null

  return (
    <DashboardShell>
              <DashboardHeader 
                heading="Email Marketing Dashboard" 
                text={
                  isLoading && apiKeySubmitted 
                    ? "Loading your members automatically..." 
                    : currentUser?.name || currentUser?.username 
                      ? `Welcome back, ${currentUser.name || currentUser.username}!`
                      : "Send Beautiful Emails To Your Whop Members Within Whop Or Sync Members To Popular Email Platforms"
                }
              >
                <div className="flex items-center gap-3">
                  {/* Loading indicator when members are being loaded automatically */}
                  {isLoading && apiKeySubmitted && (
                    <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                      <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-orange-600 dark:text-orange-400">Loading members...</span>
                    </div>
                  )}
                  
                  {/* Admin Link - Only show for admin user */}
                  {userId === 'user_ojPhs9dIhFQ9C' && (
                    <Button
                      onClick={() => window.location.href = '/experiences/email-marketing-email-sync-uEakcLTEbBbod1/admin'}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      🔧 Admin
                    </Button>
                  )}
                  
                  {subscriptionStatus?.subscription?.planName && (
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-sm text-muted-foreground">Current Plan:</span>
                      <span className="font-medium text-sm">{subscriptionStatus.subscription.planName}</span>
                      <span className="text-xs text-muted-foreground">
                        ({subscriptionStatus.subscription.contactLimit?.toLocaleString() || 'Unlimited'} contacts)
                      </span>
                    </div>
                  )}
                </div>
              </DashboardHeader>

      {!isWhopContext && (
        <Alert className="mb-8 bg-orange-500/10 border-orange-500/20 rounded-modern animate-fade-in">
          <AlertDescription className="text-orange-600 dark:text-orange-400">
            You are viewing the dashboard outside of the Whop platform. Some features may be limited.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-8 rounded-modern animate-fade-in">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 animate-fade-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TabsList className="grid w-auto grid-cols-3 rounded-modern p-1 bg-muted/50">
              <TabsTrigger 
                value="setup" 
                className="rounded-lg transition-modern data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Setup
              </TabsTrigger>
              <TabsTrigger 
                value="emailsync" 
                className="rounded-lg transition-modern data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Email Marketing
              </TabsTrigger>
              <TabsTrigger 
                value="members" 
                disabled={!apiKeySubmitted} 
                className="rounded-lg transition-modern data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                {isLoading && apiKeySubmitted ? "Loading..." : "Members"}
              </TabsTrigger>
            </TabsList>
            
            {/* Advanced Dropdown */}
            <div className="relative group">
              <button 
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-modern flex items-center gap-2 hover:bg-muted/70 ${
                  ['app-builder', 'whop-marketing', 'integrations'].includes(activeTab) 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm' 
                    : 'bg-muted/50 border-border'
                }`}
                onClick={() => {
                  // Toggle dropdown or show first advanced option
                  if (!['app-builder', 'whop-marketing', 'integrations'].includes(activeTab)) {
                    setActiveTab('app-builder')
                  }
                }}
              >
                <span>
                  {activeTab === 'app-builder' && 'App Builder'}
                  {activeTab === 'whop-marketing' && 'Whop Marketing'}
                  {activeTab === 'integrations' && 'Integrations'}
                  {!['app-builder', 'whop-marketing', 'integrations'].includes(activeTab) && 'Advanced'}
                </span>
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-1 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => setActiveTab('app-builder')}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 ${
                      activeTab === 'app-builder' ? 'bg-orange-500/10 text-orange-600' : ''
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    App Builder
                  </button>
                  <button
                    onClick={() => setActiveTab('whop-marketing')}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 ${
                      activeTab === 'whop-marketing' ? 'bg-orange-500/10 text-orange-600' : ''
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Whop Marketing
                  </button>
                  <button
                    onClick={() => setActiveTab('integrations')}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 ${
                      activeTab === 'integrations' ? 'bg-orange-500/10 text-orange-600' : ''
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Integrations
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Setup Tab - Always accessible */}
          <TabsContent value="setup" className="space-y-6 mt-6">
            <Card className="card-modern-hover animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Whop API Key
                </CardTitle>
                <CardDescription>Enter your Whop API key to connect your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <ApiKeyForm 
                  onSubmit={handleApiKeySubmit} 
                  initialValue={apiKey} 
                  onReset={async () => {
                    try {
                      // Clear the API key from the database
                      const response = await fetch('/api/clear-api-key', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ whopUserId: userId })
                      })
                      
                      if (response.ok) {
                        console.log('API key cleared successfully')
                        // Reset local state
                        setApiKeySubmitted(false)
                        setApiKey("")
                        setMemberData(null)
                        setSyncedCount(null)
                        setLastSyncTime(null)
                      } else {
                        console.error('Failed to clear API key')
                        setError('Failed to reset API key. Please try again.')
                      }
                    } catch (error) {
                      console.error('Error clearing API key:', error)
                      setError('Failed to reset API key. Please try again.')
                    }
                  }}
                />
              </CardContent>
            </Card>

            <div className="animate-slide-up">
              <SubscriptionStatus 
                userId={userId || ""} 
                subscriptionData={subscriptionStatus?.subscription}
              />
            </div>

            {/* Plan Selection */}
            {subscriptionStatus?.subscription?.planName ? (
              <div className="animate-slide-up">
                <PlanSelector 
                  currentPlan={{
                    planName: subscriptionStatus.subscription.planName,
                    contactLimit: subscriptionStatus.subscription.contactLimit || 3000,
                    planPrice: subscriptionStatus.subscription.planPrice || '$29.95',
                    planId: subscriptionStatus.subscription.planId || 'plan_OSMhiz0f5fuxt'
                  }}
                  currentContactCount={totalContactCount}
                  totalWhopMembers={memberData?.totalMembers || 0}
                  manualMembersCount={manualMembersCount || 0}
                />
              </div>
            ) : (
              // Show plan selection for non-subscribers
              <div className="animate-slide-up">
                <PlanSelectionOnboarding 
                  isTrialExpired={subscriptionStatus?.trialExpired}
                />
              </div>
            )}
            
            {apiKeySubmitted && emailPlatformSelected && (
              <div className="animate-slide-up">
                <WebhookSetupGuide />
              </div>
            )}
          </TabsContent>

          {/* Email Marketing Tab - Show plan limit message when over limit */}
          <TabsContent value="emailsync" className="space-y-6 mt-6">
            {isOverPlanLimit ? (
              <div className="space-y-6">
                <Alert className="bg-orange-500/10 border-orange-500/20 rounded-modern">
                  <AlertDescription className="text-orange-600 dark:text-orange-400">
                    <strong>Plan Limit Exceeded:</strong> You currently have {totalContactCount.toLocaleString()} contacts but your {subscriptionStatus?.subscription?.planName} plan only allows {subscriptionStatus?.subscription?.contactLimit?.toLocaleString()} contacts. Please upgrade your plan or switch to a different Whop account with fewer users.
                  </AlertDescription>
                </Alert>
                
                <Card className="card-modern-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Options to Continue
                    </CardTitle>
                    <CardDescription>
                      Choose how you'd like to proceed with EmailSync.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">Option 1: Upgrade Your Plan</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Upgrade to a higher plan to handle your current {totalContactCount.toLocaleString()} contacts.
                        </p>
                        <Button 
                          onClick={() => setActiveTab("setup")}
                          className="w-full"
                        >
                          View Plan Options
                        </Button>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">Option 2: Switch Whop Account</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Use a different Whop API key with fewer users that fits your current plan.
                        </p>
                        <Button 
                          onClick={() => setActiveTab("setup")}
                          variant="outline"
                          className="w-full"
                        >
                          Change API Key
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <EmailSyncDashboard 
                whopUserId={userId || ""} 
                whopApiKey={apiKey} 
                members={memberData?.members || []} 
                totalMemberCount={memberData?.totalMembers || 0}
              />
            )}
          </TabsContent>

          {/* Members Tab - Show plan limit message when over limit */}
          <TabsContent value="members" className="space-y-6 mt-6">
            {/* Check if user has active subscription */}
            {!subscriptionStatus?.hasActiveSubscription ? (
              <div className="animate-slide-up">
                <PlanSelectionOnboarding 
                  isTrialExpired={subscriptionStatus?.trialExpired}
                />
              </div>
            ) : isOverPlanLimit ? (
              <div className="space-y-6">
                <Alert className="bg-orange-500/10 border-orange-500/20 rounded-modern">
                  <AlertDescription className="text-orange-600 dark:text-orange-400">
                    <strong>Plan Limit Exceeded:</strong> You currently have {totalContactCount.toLocaleString()} contacts but your {subscriptionStatus?.subscription?.planName} plan only allows {subscriptionStatus?.subscription?.contactLimit?.toLocaleString()} contacts. Please upgrade your plan or switch to a different Whop account with fewer users.
                  </AlertDescription>
                </Alert>
                
                <Card className="card-modern-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Options to Continue
                    </CardTitle>
                    <CardDescription>
                      Choose how you'd like to proceed with EmailSync.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">Option 1: Upgrade Your Plan</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Upgrade to a higher plan to handle your current {totalContactCount.toLocaleString()} contacts.
                        </p>
                        <Button 
                          onClick={() => setActiveTab("setup")}
                          className="w-full"
                        >
                          View Plan Options
                        </Button>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">Option 2: Switch Whop Account</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Use a different Whop API key with fewer users that fits your current plan.
                        </p>
                        <Button 
                          onClick={() => setActiveTab("setup")}
                          variant="outline"
                          className="w-full"
                        >
                          Change API Key
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                {apiKeySubmitted && memberData && memberData.members && memberData.members.length > 0 ? (
                  <>
                    <div className="animate-slide-up">
                      <MembersDashboard data={memberData} manualMembersCount={manualMembersCount || 0} />
                    </div>
                    
                    {/* Manual Upload Section */}
                    <div className="animate-slide-up">
                      <ManualListUpload
                        whopUserId={userId || undefined}
                        onUploadComplete={async () => {
                          // Refresh manual members count only - don't trigger full sync
                          if (userId && setManualMembersCount) {
                            const manualCount = await fetchManualMembersCount(userId)
                            setManualMembersCount(manualCount)
                          }
                        }}
                        subscriptionStatus={subscriptionStatus}
                        currentMemberCount={memberData?.totalMembers || 0}
                      />
                    </div>
                    
                    <div className="animate-slide-up">
                      <UnifiedMembersList
                        whopMembers={memberData?.members || []}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        isLoading={isLoading}
                        emailPlatform={selectedPlatform || undefined}
                        apiKey={apiKey}
                        whopUserId={userId || undefined}
                        totalWhopMembers={memberData?.totalMembers || 0}
                        subscriptionStatus={subscriptionStatus}
                      />
                    </div>
                  </>
                ) : (
                  <div className="animate-slide-up">
                    <EmptyPlaceholder
                      title={isLoading ? "Loading members..." : "No Members Found"}
                      description={
                        isLoading
                          ? "We're fetching your Whop members. This may take a moment."
                          : apiKeySubmitted
                            ? "No members found in your Whop account. Members will load automatically when available."
                            : "Connect your Whop account to see your members."
                      }
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* App Builder Tab */}
          <TabsContent value="app-builder" className="space-y-6 mt-6">
            {(() => {
              console.log("=== APP BUILDER TAB RENDERING CHECK ===")
              console.log("Subscription status present:", !!subscriptionStatus)
              if (subscriptionStatus) {
                console.log("Subscription status details:", JSON.stringify(subscriptionStatus, null, 2))
                console.log("Has active subscription:", subscriptionStatus.hasActiveSubscription)
              }
              const shouldShowSubscriptionRequired = (!subscriptionStatus || !subscriptionStatus.hasActiveSubscription)
              console.log("Should show subscription required:", shouldShowSubscriptionRequired)
              return shouldShowSubscriptionRequired
            })() ? (
              <PlanSelectionOnboarding isTrialExpired={subscriptionStatus?.trialExpired} />
            ) : (
              <div className="space-y-6">
                <AppBuilderApiKeys whopUserId={userId || ""} />
                <AppBuilderCompanies whopUserId={userId || ""} />
              </div>
            )}
          </TabsContent>

          {/* Whop Internal Marketing Tab */}
          <TabsContent value="whop-marketing" className="space-y-6 mt-6">
            {(() => {
              console.log("=== WHOP MARKETING TAB RENDERING CHECK ===")
              console.log("Environment:", typeof window !== 'undefined' ? 'client' : 'server')
              console.log("User ID:", userId)
              console.log("API Key present:", !!apiKey)
              console.log("API Key submitted:", apiKeySubmitted)
              console.log("Subscription status present:", !!subscriptionStatus)
              if (subscriptionStatus) {
                console.log("Subscription status details:", JSON.stringify(subscriptionStatus, null, 2))
                console.log("Has active subscription:", subscriptionStatus.hasActiveSubscription)
              }
              const shouldShowSubscriptionRequired = (!subscriptionStatus || !subscriptionStatus.hasActiveSubscription)
              console.log("Should show subscription required:", shouldShowSubscriptionRequired)
              console.log("=== END WHOP MARKETING TAB RENDERING CHECK ===")
              return shouldShowSubscriptionRequired
            })() ? (
              <PlanSelectionOnboarding isTrialExpired={subscriptionStatus?.trialExpired} />
            ) : (() => {
              console.log("=== API KEY CHECK ===")
              console.log("API Key submitted:", apiKeySubmitted)
              console.log("API Key present:", !!apiKey)
              console.log("API Key length:", apiKey ? apiKey.length : 0)
              const shouldShowSetupRequired = !apiKeySubmitted
              console.log("Should show setup required:", shouldShowSetupRequired)
              console.log("=== END API KEY CHECK ===")
              return shouldShowSetupRequired
            })() ? (
              <Card className="card-modern-hover animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Setup Required
                  </CardTitle>
                  <CardDescription>
                    Connect your Whop account to access Whop Internal Marketing features.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      You need to connect your Whop account first to use Whop Internal Marketing.
                    </p>
                    <Button 
                      onClick={() => setActiveTab("setup")}
                      className="w-full btn-modern-primary"
                      size="lg"
                    >
                      Go to Setup
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (() => {
              console.log("=== FINAL RENDER CHECK ===")
              console.log("Rendering WhopInternalMarketing component")
              console.log("User ID being passed:", userId || "")
              console.log("API Key being passed:", apiKey ? `${apiKey.substring(0, 10)}...` : 'none')
              console.log("=== END FINAL RENDER CHECK ===")
              return (
                <div className="space-y-6">
                  <WhopInternalMarketing 
                    whopUserId={userId || ""} 
                    whopApiKey={apiKey}
                  />
                </div>
              )
            })()}
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6 mt-6">
            {(() => {
              console.log("=== INTEGRATIONS TAB RENDERING CHECK ===")
              console.log("Subscription status present:", !!subscriptionStatus)
              if (subscriptionStatus) {
                console.log("Subscription status details:", JSON.stringify(subscriptionStatus, null, 2))
                console.log("Has active subscription:", subscriptionStatus.hasActiveSubscription)
              }
              const shouldShowSubscriptionRequired = (!subscriptionStatus || !subscriptionStatus.hasActiveSubscription)
              console.log("Should show subscription required:", shouldShowSubscriptionRequired)
              return shouldShowSubscriptionRequired
            })() ? (
              <PlanSelectionOnboarding isTrialExpired={subscriptionStatus?.trialExpired} />
            ) : (
              <>
                {!apiKeySubmitted ? (
                  <Card className="card-modern-hover animate-slide-up">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Setup Required
                      </CardTitle>
                      <CardDescription>
                        Connect your Whop account to access email platform integrations.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center space-y-4">
                        <p className="text-muted-foreground">
                          You need to connect your Whop account first to set up email platform integrations.
                        </p>
                        <Button 
                          onClick={() => setActiveTab("setup")}
                          className="w-full btn-modern-primary"
                          size="lg"
                        >
                          Go to Setup
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : !emailPlatformSelected ? (
                  <div className="animate-slide-up">
                    <EmailPlatformSelector 
                      onSelect={handleEmailPlatformSelect}
                      apiKey={apiKey}
                      memberData={memberData || { success: false, members: [], totalMembers: 0 }}
                      whopUserId={userId || ""}
                      existingPlatformConfig={platformConfig}
                    />
                  </div>
                ) : (
                  <>
                    <div className="animate-slide-up">
                      <Card className="card-modern-hover">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Connected Platform
                          </CardTitle>
                          <CardDescription>
                            Your email platform integration is active.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                <span className="text-lg font-semibold">
                                  {selectedPlatform === 'resend' ? '📧' : 
                                   selectedPlatform === 'mailchimp' ? '📊' : 
                                   selectedPlatform === 'convertkit' ? '📝' : 
                                   selectedPlatform === 'klaviyo' ? '📈' : 
                                   selectedPlatform === 'activecampaign' ? '🎯' : 
                                   selectedPlatform === 'gohighlevel' ? '🏢' : '📧'}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">
                                  {EMAIL_PLATFORMS.find(p => p.id === selectedPlatform)?.name || 'Email Platform'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Connected and ready to use
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleChangeIntegration}
                              >
                                Change Platform
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleDisconnectIntegration}
                              >
                                Disconnect
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {apiKeySubmitted && emailPlatformSelected && (
                      <div className="animate-slide-up">
                        <WebhookSetupGuide />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </DashboardShell>
  )
}
