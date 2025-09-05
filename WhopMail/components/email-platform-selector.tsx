"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { MailchimpApiForm } from "@/components/mailchimp-api-form"
import { MailchimpListSelector } from "@/components/mailchimp-list-selector"
import { ActiveCampaignApiForm } from "@/components/active-campaign-api-form"
import { ActiveCampaignListSelector } from "@/components/active-campaign-list-selector"
import { ConvertKitApiForm } from "@/components/convertkit-api-form"
import { ConvertKitFormSelector } from "@/components/convertkit-form-selector"
import { KlaviyoApiForm } from "@/components/klaviyo-api-form"
import { KlaviyoListSelector } from "@/components/klaviyo-list-selector"
import { GoHighLevelApiForm } from "@/components/gohighlevel-api-form"
import { GoHighLevelListSelector } from "@/components/gohighlevel-list-selector"

import { submitEmailPlatform, saveEmailPlatformConfig } from "@/app/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle } from "lucide-react"
import type { WhopApiResponse, MailchimpApiResponse, EmailPlatformConfig } from "@/app/types"

interface EmailPlatformSelectorProps {
  onSelect: (platform: string, syncedCount?: number, config?: EmailPlatformConfig) => void
  disabled?: boolean
  apiKey: string
  memberData: WhopApiResponse
  whopUserId: string
  existingPlatformConfig?: EmailPlatformConfig | null
}

const EMAIL_PLATFORMS = [
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Popular email marketing platform with automation features.",
    logo: "https://mailchimp.com/ctf/images/yzco4xsimv0y/5HGKFgXj6e9y5XOVcNsAXu/82164e5e1043c89c11e2777933b03bb2/MC_50-50_-_Brand_Assets_01.png?w=1960&fm=avif&q=60",
  },
  {
    id: "convertkit",
    name: "ConvertKit",
    description: "Email marketing for creators with powerful automation.",
    logo: "https://media.kit.com/images/logos/kit-logo-warm-white.svg",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    description: "E-commerce focused email marketing with advanced segmentation.",
    logo: "https://www.klaviyo.com/wp-content/uploads/2022/09/Klaviyo_primary_mark_poppy-67-550x226-1.png",
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    description: "Marketing automation platform with CRM integration.",
    logo: "https://www.activecampaign.com/siteassets/logo.svg",
  },
  {
    id: "gohighlevel",
    name: "GoHighLevel",
    description: "All-in-one marketing platform with CRM and automation.",
    logo: "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/48175265739/original/PAUWak17_5otrZlX-2umd5Eisu-X_cq0fw.jpg?1641235578",
  },
]

export function EmailPlatformSelector({ onSelect, disabled = false, apiKey, memberData, whopUserId, existingPlatformConfig }: EmailPlatformSelectorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")
  const [syncedCount, setSyncedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mailchimp specific states
  const [mailchimpApiKey, setMailchimpApiKey] = useState<string | null>(null)
  const [mailchimpData, setMailchimpData] = useState<MailchimpApiResponse | null>(null)
  const [showMailchimpListSelector, setShowMailchimpListSelector] = useState(false)

  // ActiveCampaign specific states
  const [activeCampaignApiKey, setActiveCampaignApiKey] = useState<string | null>(null)
  const [activeCampaignApiUrl, setActiveCampaignApiUrl] = useState<string | null>(null)
  const [activeCampaignData, setActiveCampaignData] = useState<any | null>(null)
  const [showActiveCampaignListSelector, setShowActiveCampaignListSelector] = useState(false)

  // ConvertKit specific states
  const [convertKitApiKey, setConvertKitApiKey] = useState<string | null>(null)
  const [convertKitData, setConvertKitData] = useState<any | null>(null)
  const [showConvertKitFormSelector, setShowConvertKitFormSelector] = useState(false)

  // Klaviyo specific states
  const [klaviyoApiKey, setKlaviyoApiKey] = useState<string | null>(null)
  const [klaviyoData, setKlaviyoData] = useState<any | null>(null)
  const [showKlaviyoListSelector, setShowKlaviyoListSelector] = useState(false)

  // GoHighLevel specific states
  const [goHighLevelApiKey, setGoHighLevelApiKey] = useState<string | null>(null)
  const [goHighLevelLocationId, setGoHighLevelLocationId] = useState<string | null>(null)
  const [goHighLevelData, setGoHighLevelData] = useState<any | null>(null)
  const [showGoHighLevelListSelector, setShowGoHighLevelListSelector] = useState(false)



  // Get the total number of members
  const totalMembers = memberData.totalMembers || 0

  // Initialize with existing platform config if available
  useEffect(() => {
    if (existingPlatformConfig && existingPlatformConfig.type === "convertkit") {
      console.log("Found existing ConvertKit integration, initializing...")
      setSelectedPlatform("convertkit")
      setConvertKitApiKey(existingPlatformConfig.apiKey)
      
      // Automatically fetch ConvertKit data when API key is set
      const fetchConvertKitData = async () => {
        try {
          const { validateConvertKitApiKey } = await import("@/app/actions/convertkit")
          const result = await validateConvertKitApiKey(existingPlatformConfig.apiKey)
          if (result.success) {
            console.log("Successfully fetched existing ConvertKit data")
            setConvertKitData(result)
            setShowConvertKitFormSelector(true)
          }
        } catch (error) {
          console.error("Error fetching existing ConvertKit data:", error)
        }
      }
      
      fetchConvertKitData()
    }
  }, [existingPlatformConfig])

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform)
    setError(null)

    // Reset platform-specific states
    setMailchimpApiKey(null)
    setMailchimpData(null)
    setShowMailchimpListSelector(false)
    setActiveCampaignApiKey(null)
    setActiveCampaignApiUrl(null)
    setActiveCampaignData(null)
    setShowActiveCampaignListSelector(false)
    setConvertKitApiKey(null)
    setConvertKitData(null)
    setShowConvertKitFormSelector(false)
    setKlaviyoApiKey(null)
    setKlaviyoData(null)
    setShowKlaviyoListSelector(false)
    setGoHighLevelApiKey(null)
    setGoHighLevelLocationId(null)
    setGoHighLevelData(null)
    setShowGoHighLevelListSelector(false)
  }

  const handleMailchimpApiSuccess = (apiKey: string, data: MailchimpApiResponse) => {
    setMailchimpApiKey(apiKey)
    setMailchimpData(data)
    setShowMailchimpListSelector(true)
  }

  const handleActiveCampaignApiSuccess = (apiKey: string, apiUrl: string, data: any) => {
    setActiveCampaignApiKey(apiKey)
    setActiveCampaignApiUrl(apiUrl)
    setActiveCampaignData(data)
    setShowActiveCampaignListSelector(true)
  }

  const handleConvertKitApiSuccess = async (apiKey: string, apiSecret: string, data: any) => {
    setConvertKitApiKey(apiKey)
    setConvertKitData(data)
    setShowConvertKitFormSelector(true)
    
    // Save the ConvertKit integration immediately when API key is validated
    // Only save if this is a new integration (not loading existing data)
    if (!existingPlatformConfig || existingPlatformConfig.type !== "convertkit") {
      try {
        await saveEmailPlatformConfig(whopUserId, {
          platform: "convertkit",
          apiKey: apiKey,
          apiSecret: apiSecret,
          listId: "", // Will be updated when form is selected
        })
        console.log("ConvertKit integration saved to Supabase immediately after API validation")
      } catch (error) {
        console.error("Failed to save ConvertKit integration:", error)
      }
    } else {
      console.log("Loading existing ConvertKit integration, skipping save")
    }
  }

  const handleKlaviyoApiSuccess = (apiKey: string, data: any) => {
    setKlaviyoApiKey(apiKey)
    setKlaviyoData(data)
    setShowKlaviyoListSelector(true)
  }

  const handleGoHighLevelApiSuccess = (apiKey: string, locationId: string, data: any) => {
    setGoHighLevelApiKey(apiKey)
    setGoHighLevelLocationId(locationId)
    setGoHighLevelData(data)
    setShowGoHighLevelListSelector(true)
  }



  const handleMailchimpSync = async (listId: string, syncedCount: number) => {
    setSyncStatus("success")
    setSyncedCount(syncedCount)

    // Create config object for the selected platform
    const config: EmailPlatformConfig = {
      type: "mailchimp",
      apiKey: mailchimpApiKey!,
      listId: listId,
      dc: mailchimpData?.dc,
    }

    // Wait a moment to show success state before closing
    setTimeout(() => {
      onSelect("mailchimp", syncedCount, config)
    }, 1500)
  }

  const handleActiveCampaignSync = async (listId: string, syncedCount: number) => {
    setSyncStatus("success")
    setSyncedCount(syncedCount)

    // Create config object for the selected platform
    const config: EmailPlatformConfig = {
      type: "activecampaign",
      apiKey: activeCampaignApiKey!,
      apiUrl: activeCampaignApiUrl!,
      listId: listId,
    }

    // Wait a moment to show success state before closing
    setTimeout(() => {
      onSelect("activecampaign", syncedCount, config)
    }, 1500)
  }

  const handleConvertKitSync = async (formId: string, syncedCount: number) => {
    setSyncStatus("success")
    setSyncedCount(syncedCount)

    // Create config object for the selected platform
    const config: EmailPlatformConfig = {
      type: "convertkit",
      apiKey: convertKitApiKey!,
      listId: formId,
    }

    // Wait a moment to show success state before closing
    setTimeout(() => {
      onSelect("convertkit", syncedCount, config)
    }, 1500)
  }

  const handleKlaviyoSync = async (listId: string, syncedCount: number) => {
    console.log("Klaviyo sync completed with count:", syncedCount)
    setSyncStatus("success")
    setSyncedCount(syncedCount)

    // Create config object for the selected platform
    const config: EmailPlatformConfig = {
      type: "klaviyo",
      apiKey: klaviyoApiKey!,
      listId: listId,
    }

    // Wait a moment to show success state before closing
    setTimeout(() => {
      onSelect("klaviyo", syncedCount, config)
    }, 1500)
  }

  const handleGoHighLevelSync = async (listId: string, syncedCount: number) => {
    setSyncStatus("success")
    setSyncedCount(syncedCount)

    // Create config object for the selected platform
    const config: EmailPlatformConfig = {
      type: "gohighlevel",
      apiKey: goHighLevelApiKey!,
      listId: listId,
      locationId: goHighLevelLocationId!,
    }

    // Wait a moment to show success state before closing
    setTimeout(() => {
      onSelect("gohighlevel", syncedCount, config)
    }, 1500)
  }



  const handleConnect = async () => {
    if (!selectedPlatform) return

    setIsConnecting(true)
    setSyncStatus("syncing")
    setError(null)

    try {
      const result = await submitEmailPlatform(apiKey, selectedPlatform, memberData)

      if (result.success) {
        setSyncStatus("success")
        setSyncedCount(result.syncedCount || 0)
        // Wait a moment to show success state before closing
        setTimeout(() => {
          onSelect(selectedPlatform, result.syncedCount)
        }, 1500)
      } else {
        setSyncStatus("error")
        setError(result.error || "Failed to connect. Please try again.")
      }
    } catch (error) {
      setSyncStatus("error")
      setError(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  // If we're showing the Mailchimp list selector
  if (showMailchimpListSelector && mailchimpData && mailchimpData.lists && mailchimpApiKey) {
    return (
      <div className="space-y-4">
        <MailchimpListSelector
          lists={mailchimpData.lists}
          apiKey={mailchimpApiKey}
          dc={mailchimpData.dc!}
          members={memberData.members || []}
          whopApiKey={apiKey}
          totalMemberCount={totalMembers}
          onSync={handleMailchimpSync}
          whopUserId={whopUserId}
        />
      </div>
    )
  }

  // If we're showing the ActiveCampaign list selector
  if (
    showActiveCampaignListSelector &&
    activeCampaignData &&
    activeCampaignData.lists &&
    activeCampaignApiKey &&
    activeCampaignApiUrl
  ) {
    return (
      <div className="space-y-4">
        <ActiveCampaignListSelector
          lists={activeCampaignData.lists}
          apiKey={activeCampaignApiKey}
          apiUrl={activeCampaignApiUrl}
          members={memberData.members || []}
          whopApiKey={apiKey}
          totalMemberCount={totalMembers}
          onSync={handleActiveCampaignSync}
          whopUserId={whopUserId}
        />
      </div>
    )
  }

  // If we're showing the ConvertKit form selector
  if (showConvertKitFormSelector && convertKitData && convertKitData.forms && convertKitApiKey) {
    return (
      <div className="space-y-4">
        <ConvertKitFormSelector
          forms={convertKitData.forms}
          apiKey={convertKitApiKey}
          members={memberData.members || []}
          whopApiKey={apiKey}
          totalMemberCount={totalMembers}
          onSync={handleConvertKitSync}
          tags={convertKitData.tags || []}
          whopUserId={whopUserId}
        />
      </div>
    )
  }

  // If we're showing the Klaviyo list selector
  if (showKlaviyoListSelector && klaviyoData && klaviyoData.lists && klaviyoApiKey) {
    return (
      <div className="space-y-4">
        <KlaviyoListSelector
          lists={klaviyoData.lists}
          apiKey={klaviyoApiKey}
          members={memberData.members || []}
          whopApiKey={apiKey}
          totalMemberCount={totalMembers}
          onSync={handleKlaviyoSync}
          whopUserId={whopUserId}
        />
      </div>
    )
  }

  // If we're showing the GoHighLevel list selector
  if (
    showGoHighLevelListSelector &&
    goHighLevelData &&
    goHighLevelData.lists &&
    goHighLevelApiKey &&
    goHighLevelLocationId
  ) {
    return (
      <div className="space-y-4">
        <GoHighLevelListSelector
          lists={goHighLevelData.lists}
          apiKey={goHighLevelApiKey}
          locationId={goHighLevelLocationId}
          members={memberData.members || []}
          whopApiKey={apiKey}
          totalMemberCount={totalMembers}
          onSync={handleGoHighLevelSync}
          whopUserId={whopUserId}
        />
      </div>
    )
  }



  // If we've selected Mailchimp but haven't entered API key yet
  if (selectedPlatform === "mailchimp" && !mailchimpApiKey) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedPlatform(null)} className="mb-4">
          ← Back to platforms
        </Button>
        <MailchimpApiForm onSuccess={handleMailchimpApiSuccess} />
      </div>
    )
  }

  // If we've selected ActiveCampaign but haven't entered API key yet
  if (selectedPlatform === "activecampaign" && (!activeCampaignApiKey || !activeCampaignApiUrl)) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedPlatform(null)} className="mb-4">
          ← Back to platforms
        </Button>
        <ActiveCampaignApiForm onSuccess={handleActiveCampaignApiSuccess} />
      </div>
    )
  }

  // If we've selected ConvertKit but haven't entered API key yet
  if (selectedPlatform === "convertkit" && !convertKitApiKey) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedPlatform(null)} className="mb-4">
          ← Back to platforms
        </Button>
        <ConvertKitApiForm onSuccess={handleConvertKitApiSuccess} />
      </div>
    )
  }

  // If we've selected ConvertKit and have API key but no data yet, fetch it
  if (selectedPlatform === "convertkit" && convertKitApiKey && !convertKitData) {
    // This will be handled by the useEffect that fetches data when API key is set
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedPlatform(null)} className="mb-4">
          ← Back to platforms
        </Button>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading ConvertKit data...</span>
        </div>
      </div>
    )
  }

  // If we've selected Klaviyo but haven't entered API key yet
  if (selectedPlatform === "klaviyo" && !klaviyoApiKey) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedPlatform(null)} className="mb-4">
          ← Back to platforms
        </Button>
        <KlaviyoApiForm onSuccess={handleKlaviyoApiSuccess} />
      </div>
    )
  }

  // If we've selected GoHighLevel but haven't entered API key yet
  if (selectedPlatform === "gohighlevel" && (!goHighLevelApiKey || !goHighLevelLocationId)) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedPlatform(null)} className="mb-4">
          ← Back to platforms
        </Button>
        <GoHighLevelApiForm onSuccess={handleGoHighLevelApiSuccess} />
      </div>
    )
  }



  // Success state
  if (syncStatus === "success") {
    return (
      <div className="bg-green-50 p-4 rounded-md flex items-center space-x-3">
        <CheckCircle className="h-6 w-6 text-green-500" />
        <div>
          <h3 className="font-medium text-green-900">Successfully connected!</h3>
          <p className="text-green-700">
            {syncedCount} members have been synced to {EMAIL_PLATFORMS.find((p) => p.id === selectedPlatform)?.name}.
          </p>
        </div>
      </div>
    )
  }

  // Default view - platform selection
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        Select an email marketing platform to sync your {totalMembers} members to:
      </div>
      <RadioGroup
        value={selectedPlatform || ""}
        onValueChange={handlePlatformSelect}
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        disabled={disabled || syncStatus === "syncing"}
      >
        {EMAIL_PLATFORMS.map((platform) => (
          <div key={platform.id}>
            <RadioGroupItem
              value={platform.id}
              id={platform.id}
              className="peer sr-only"
              disabled={disabled || syncStatus === "syncing"}
            />
            <Label
              htmlFor={platform.id}
              className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-orange-500 [&:has([data-state=checked])]:border-orange-500"
            >
              <div className="flex w-full items-center space-x-3">
                <img src={platform.logo || "/placeholder.svg"} alt={platform.name} className="h-10 w-10 rounded-md" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{platform.name}</p>
                  <p className="text-xs text-muted-foreground">{platform.description}</p>
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedPlatform &&
        !["mailchimp", "activecampaign", "convertkit", "klaviyo", "gohighlevel"].includes(selectedPlatform) && (
          <Button
            onClick={handleConnect}
            disabled={!selectedPlatform || syncStatus === "syncing" || disabled}
            className="w-full"
          >
            {syncStatus === "syncing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing {totalMembers} members...
              </>
            ) : (
              `Connect & Sync all ${totalMembers} members to ${selectedPlatform ? EMAIL_PLATFORMS.find((p) => p.id === selectedPlatform)?.name : "Platform"}`
            )}
          </Button>
        )}

      {selectedPlatform === "mailchimp" && (
        <Button onClick={() => setSelectedPlatform("mailchimp")} className="w-full">
          Continue to Mailchimp Setup
        </Button>
      )}

      {selectedPlatform === "activecampaign" && (
        <Button onClick={() => setSelectedPlatform("activecampaign")} className="w-full">
          Continue to ActiveCampaign Setup
        </Button>
      )}

      {selectedPlatform === "convertkit" && (
        <Button onClick={() => setSelectedPlatform("convertkit")} className="w-full">
          Continue to ConvertKit Setup
        </Button>
      )}

      {selectedPlatform === "klaviyo" && (
        <Button onClick={() => setSelectedPlatform("klaviyo")} className="w-full">
          Continue to Klaviyo Setup
        </Button>
      )}

      {selectedPlatform === "gohighlevel" && (
        <Button onClick={() => setSelectedPlatform("gohighlevel")} className="w-full">
          Continue to GoHighLevel Setup
        </Button>
      )}

      {selectedPlatform === "resend" && (
        <Button onClick={() => setSelectedPlatform("resend")} className="w-full">
          Continue to Resend Setup
        </Button>
      )}
    </div>
  )
}
