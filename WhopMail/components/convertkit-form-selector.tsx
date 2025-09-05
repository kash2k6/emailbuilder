"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertTriangle, ExternalLink, RefreshCw, Info, PlusCircle } from "lucide-react"
import { syncMembersToConvertKit, validateConvertKitApiKey, createConvertKitTag } from "@/app/actions/convertkit"
import { fetchAllWhopMembers, saveEmailPlatformConfig, getEmailPlatformConfig } from "@/app/actions"
import type { WhopMembership } from "@/app/types"

interface ConvertKitFormSelectorProps {
  forms: any[]
  apiKey: string
  members: WhopMembership[]
  whopApiKey: string
  totalMemberCount: number
  onSync: (formId: string, syncedCount: number) => void
  tags?: any[]
  whopUserId: string
}

export function ConvertKitFormSelector({
  forms,
  apiKey,
  members,
  whopApiKey,
  totalMemberCount,
  onSync,
  tags = [],
  whopUserId,
}: ConvertKitFormSelectorProps) {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFetchingAllMembers, setIsFetchingAllMembers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [convertKitForms, setConvertKitForms] = useState<any[]>(forms || [])
  const [convertKitTags, setConvertKitTags] = useState<any[]>(tags || [])
  const [syncProgress, setSyncProgress] = useState<number>(0)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [showCreateTagForm, setShowCreateTagForm] = useState(false)
  const [isLoadingSavedData, setIsLoadingSavedData] = useState(true)

  console.log("=== CONVERTKIT FORM SELECTOR RENDER ===")
  console.log("Props:", { forms: forms?.length, apiKey: !!apiKey, members: members?.length, whopApiKey: !!whopApiKey, totalMemberCount, whopUserId })
  console.log("State:", { selectedFormId, selectedTagIds, convertKitForms: convertKitForms.length, convertKitTags: convertKitTags.length, isLoadingSavedData })

  // Load saved integration data on component mount
  useEffect(() => {
    const loadSavedIntegration = async () => {
      if (!whopUserId || !apiKey) {
        setIsLoadingSavedData(false)
        return
      }

      try {
        console.log("Loading saved ConvertKit integration for user:", whopUserId)
        const savedIntegration = await getEmailPlatformConfig(whopUserId)
        
        if (savedIntegration && savedIntegration.platform === "convertkit") {
          console.log("Found saved ConvertKit integration:", savedIntegration)
          
          // Set the saved form ID
          if (savedIntegration.listId) {
            setSelectedFormId(savedIntegration.listId)
            console.log("Restored selected form ID:", savedIntegration.listId)
          }
          
          // For ConvertKit, we need to fetch the tags to restore the selected ones
          // Since we don't store tag IDs in the database, we'll select the first available tag
          if (convertKitTags.length > 0) {
            setSelectedTagIds([convertKitTags[0].id])
            console.log("Auto-selected first available tag:", convertKitTags[0].id)
          }
        }
      } catch (error) {
        console.error("Error loading saved integration:", error)
      } finally {
        setIsLoadingSavedData(false)
      }
    }

    loadSavedIntegration()
  }, [whopUserId, apiKey, convertKitTags])

  // Additional effect to handle when tags become available after initial load
  useEffect(() => {
    if (!isLoadingSavedData && convertKitTags.length > 0 && selectedFormId && selectedTagIds.length === 0) {
      console.log("Tags became available, auto-selecting first tag for saved integration")
      setSelectedTagIds([convertKitTags[0].id])
    }
  }, [isLoadingSavedData, convertKitTags, selectedFormId, selectedTagIds])

  // Update forms and tags when props change
  useEffect(() => {
    setConvertKitForms(forms || [])
  }, [forms])

  useEffect(() => {
    setConvertKitTags(tags || [])
  }, [tags])

  const handleSync = async () => {
    if (!selectedFormId) return

    setIsSyncing(true)
    setIsFetchingAllMembers(true)
    setError(null)
    setSyncProgress(10)

    try {
      // First, fetch all members from all pages
      const allMembersResult = await fetchAllWhopMembers(whopApiKey)
      setSyncProgress(50)

      if (!allMembersResult.success || !allMembersResult.members) {
        throw new Error(allMembersResult.error || "Failed to fetch all members")
      }

      setIsFetchingAllMembers(false)
      setSyncProgress(60)

      // Now sync all members to ConvertKit
      const result = await syncMembersToConvertKit(apiKey, selectedFormId, allMembersResult.members, selectedTagIds)
      setSyncProgress(100)

      if (result.success) {
        // Save integration to Supabase
        await saveEmailPlatformConfig(whopUserId, {
          platform: "convertkit",
          apiKey,
          listId: selectedFormId,
        })
        onSync(selectedFormId, result.syncedCount)
      } else {
        setError(result.error || "Failed to sync members. Please try again.")
      }
    } catch (error) {
      console.error("Error in handleSync:", error)
      setError(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setIsSyncing(false)
      setIsFetchingAllMembers(false)
    }
  }

  const refreshData = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const result = await validateConvertKitApiKey(apiKey)

      if (result.success) {
        if (result.forms) {
          setConvertKitForms(result.forms)
        }
        if (result.tags) {
          setConvertKitTags(result.tags)
        }
      } else {
        setError(result.error || "Failed to refresh data. Please try again.")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred while refreshing data.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName) return

    setIsCreatingTag(true)
    setError(null)

    try {
      const result = await createConvertKitTag(apiKey, newTagName)

      if (result.success && result.tagId) {
        // Add the new tag to the list and select it
        const newTag = {
          id: result.tagId,
          name: newTagName,
          created_at: new Date().toISOString(),
        }
        setConvertKitTags([...convertKitTags, newTag])
        setSelectedTagIds([...selectedTagIds, result.tagId])
        setNewTagName("")
        setShowCreateTagForm(false)
      } else {
        setError(result.error || "Failed to create tag. Please try again.")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setIsCreatingTag(false)
    }
  }

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds((prev: number[]) => (prev.includes(tagId) ? prev.filter((id: number) => id !== tagId) : [...prev, tagId]))
  }

  // Save integration whenever form and tags are selected
  const saveIntegration = async () => {
    console.log("=== SAVE INTEGRATION CALLED ===")
    console.log("selectedFormId:", selectedFormId)
    console.log("selectedTagIds:", selectedTagIds)
    console.log("whopUserId:", whopUserId)
    console.log("apiKey present:", !!apiKey)
    
    if (selectedFormId && selectedTagIds.length > 0) {
      try {
        console.log("Saving ConvertKit integration to Supabase...")
        const result = await saveEmailPlatformConfig(whopUserId, {
          platform: "convertkit",
          apiKey,
          listId: selectedFormId,
        })
        console.log("ConvertKit integration save result:", result)
        
        // Show success message without page reload
        setError(null)
        setSuccessMessage("ConvertKit integration saved successfully!")
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      } catch (error) {
        console.error("Failed to save ConvertKit integration:", error)
        setError("Failed to save integration. Please try again.")
        setSuccessMessage(null)
      }
    } else {
      console.log("Cannot save - missing formId or tags")
    }
  }

  // Save integration when form is selected
  const handleFormSelect = (formId: string) => {
    console.log("=== FORM SELECTED ===")
    console.log("formId:", formId)
    console.log("current selectedTagIds:", selectedTagIds)
    setSelectedFormId(formId)
    // Save integration after a short delay to ensure state is updated
    setTimeout(() => {
      console.log("Checking if we can save after form selection...")
      if (selectedTagIds.length > 0) {
        console.log("Tags already selected, saving integration...")
        saveIntegration()
      } else {
        console.log("No tags selected yet, waiting for tag selection...")
      }
    }, 100)
  }

  // Save integration when tags are selected
  const handleTagToggleWithSave = (tagId: number) => {
    console.log("=== TAG TOGGLED ===")
    console.log("tagId:", tagId)
    console.log("current selectedTagIds:", selectedTagIds)
    console.log("current selectedFormId:", selectedFormId)
    
    const newSelectedTagIds = selectedTagIds.includes(tagId) 
      ? selectedTagIds.filter((id) => id !== tagId) 
      : [...selectedTagIds, tagId]
    
    console.log("newSelectedTagIds:", newSelectedTagIds)
    setSelectedTagIds(newSelectedTagIds)
    
    // Save integration if form is also selected
    if (selectedFormId && newSelectedTagIds.length > 0) {
      console.log("Form and tags selected, saving integration...")
      setTimeout(() => {
        saveIntegration()
      }, 100)
    } else {
      console.log("Cannot save yet - missing form or tags")
    }
  }

  if (isLoadingSavedData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading saved integration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Select a ConvertKit Form</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Choose an existing form to sync your {totalMemberCount} Whop members to.
        </p>

        {convertKitForms.length > 0 ? (
          <RadioGroup value={selectedFormId || ""} onValueChange={handleFormSelect} className="space-y-3">
            {convertKitForms.map((form: any) => (
              <div key={form.id} className="flex items-center space-x-2">
                <RadioGroupItem value={form.id.toString()} id={`form-${form.id}`} />
                <Label htmlFor={`form-${form.id}`} className="flex flex-col">
                  <span>{form.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {form.subscribers_count || 0} subscribers • Created{" "}
                    {new Date(form.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <p className="text-sm text-muted-foreground">No forms found in your ConvertKit account.</p>
        )}
      </div>

      {/* Tag Selection */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Select Tags (Recommended)</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateTagForm(!showCreateTagForm)}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-3 w-3" />
            New Tag
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Adding tags helps ensure subscribers are properly activated in ConvertKit.
        </p>

        {showCreateTagForm && (
          <div className="space-y-4 p-4 border rounded-md mb-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Tag Name</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTagName(e.target.value)}
                placeholder="Whop Members"
              />
            </div>
            <Button type="button" onClick={handleCreateTag} disabled={!newTagName || isCreatingTag} className="w-full">
              {isCreatingTag ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Tag"
              )}
            </Button>
          </div>
        )}

        {convertKitTags.length > 0 ? (
          <div className="space-y-3">
            {convertKitTags.map((tag: any) => (
              <div key={tag.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`tag-${tag.id}`}
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => handleTagToggleWithSave(tag.id)}
                />
                <Label htmlFor={`tag-${tag.id}`} className="flex flex-col">
                  <span>{tag.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {tag.subscriber_count || 0} subscribers • Created{" "}
                    {new Date(tag.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tags found in your ConvertKit account.</p>
        )}
      </div>

      <Alert variant="warning" className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Form Creation Not Available</AlertTitle>
        <AlertDescription className="text-amber-700">
          <p className="mb-2">ConvertKit API doesn't support creating forms programmatically.</p>
          <p className="mb-2">
            Please create a form manually in your ConvertKit account and then click the "Refresh" button above to see
            your new form.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => window.open("https://app.convertkit.com/forms/new", "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Create Forms in ConvertKit
          </Button>
        </AlertDescription>
      </Alert>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">API Rate Limits</AlertTitle>
        <AlertDescription className="text-amber-700">
          <p className="mb-2">
            To avoid hitting ConvertKit's API rate limits, members will be synced in batches of 100 with a short delay
            between batches.
          </p>
          <p>
            For large member lists (500+), the sync process may take a few minutes to complete. Please be patient and
            don't refresh the page.
          </p>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-50 border-green-200 py-2">
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Alert className="bg-orange-50 border-orange-200">
        <Info className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700">
          <p className="mb-2">
            <strong>Important:</strong> ConvertKit requires subscribers to be tagged to ensure they appear as active in
            your account. Please select at least one tag above.
          </p>
          <p>
            All members will be added as <strong>subscribed</strong> to your ConvertKit form, regardless of their status
            in Whop.
          </p>
        </AlertDescription>
      </Alert>

      <Button
        onClick={handleSync}
        disabled={!selectedFormId || isSyncing || selectedTagIds.length === 0}
        className="w-full"
      >
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isFetchingAllMembers
              ? `Fetching all ${totalMemberCount} members (${syncProgress}%)...`
              : `Syncing ${totalMemberCount} members to ConvertKit (${syncProgress}%)...`}
          </>
        ) : (
          `Sync all ${totalMemberCount} members to ConvertKit`
        )}
      </Button>

      {selectedTagIds.length === 0 && selectedFormId && (
        <p className="text-sm text-center text-red-500 mt-2">Please select at least one tag to continue</p>
      )}
    </div>
  )
}
