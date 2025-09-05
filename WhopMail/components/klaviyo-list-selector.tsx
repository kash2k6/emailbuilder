"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { Loader2, PlusCircle, RefreshCw, Info, CheckCircle, XCircle } from "lucide-react"
import { createKlaviyoList, syncMembersToKlaviyo, validateKlaviyoApiKey } from "@/app/actions/klaviyo"
import { fetchAllWhopMembers, saveEmailPlatformConfig } from "@/app/actions"
import type { WhopMembership } from "@/app/types"

interface KlaviyoListSelectorProps {
  lists: any[]
  apiKey: string
  members: WhopMembership[]
  whopApiKey: string
  totalMemberCount: number
  onSync: (listId: string, syncedCount: number) => void
  whopUserId: string
}

export function KlaviyoListSelector({
  lists,
  apiKey,
  members,
  whopApiKey,
  totalMemberCount,
  onSync,
  whopUserId,
}: KlaviyoListSelectorProps) {
  console.log("=== KLAVIYO LIST SELECTOR RENDER ===")
  console.log("Props:", { lists: lists?.length, apiKey: !!apiKey, members: members?.length, whopApiKey: !!whopApiKey, totalMemberCount })
  
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFetchingAllMembers, setIsFetchingAllMembers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [klaviyoLists, setKlaviyoLists] = useState<any[]>(lists || [])
  const [syncProgress, setSyncProgress] = useState<number>(0)
  const [syncMessage, setSyncMessage] = useState<string>("")
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null)

  console.log("State:", { selectedListId, isSyncing, klaviyoLists: klaviyoLists.length })

  // Save integration when list is selected
  const saveIntegration = async (listId: string) => {
    try {
      await saveEmailPlatformConfig(whopUserId, {
        platform: "klaviyo",
        apiKey: apiKey,
        listId: listId,
      })
      console.log("Klaviyo integration saved to Supabase")
    } catch (error) {
      console.error("Failed to save Klaviyo integration:", error)
    }
  }

  const handleListSelect = (listId: string) => {
    setSelectedListId(listId)
    // Save integration immediately when list is selected
    saveIntegration(listId)
  }

  const handleCreateList = async () => {
    if (!newListName) return

    setIsCreatingList(true)
    setError(null)

    try {
      const result = await createKlaviyoList(apiKey, newListName)

      if (result.success && result.listId) {
        setSelectedListId(result.listId)
        setShowCreateForm(false)
        setIsCreatingList(false)

        // Refresh lists to include the newly created one
        refreshLists()
      } else {
        setError(result.error || "Failed to create list. Please try again.")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setIsCreatingList(false)
    }
  }

  const handleSync = async () => {
    console.log("=== KLAVIYO SYNC BUTTON CLICKED ===")
    console.log("Selected list ID:", selectedListId)
    console.log("API key present:", !!apiKey)
    console.log("Whop API key present:", !!whopApiKey)
    console.log("Total member count:", totalMemberCount)
    
    if (!selectedListId) {
      console.log("No list selected, returning")
      return
    }

    setIsSyncing(true)
    setIsFetchingAllMembers(true)
    setError(null)
    setSyncSuccess(null)
    setSyncProgress(0)
    setSyncMessage("Starting sync process...")

    try {
      // First, fetch all members from all pages
      console.log("=== FETCHING ALL MEMBERS ===")
      console.log("Fetching all members from Whop...")
      setSyncMessage("Fetching all members from Whop...")
      const allMembersResult = await fetchAllWhopMembers(whopApiKey)
      console.log("All members result:", allMembersResult)
      console.log("Members count:", allMembersResult.members?.length || 0)
      console.log("First few members:", allMembersResult.members?.slice(0, 3) || [])
      setSyncProgress(30)

      if (!allMembersResult.success || !allMembersResult.members) {
        console.error("Failed to fetch members:", allMembersResult.error)
        throw new Error(allMembersResult.error || "Failed to fetch all members")
      }

      setIsFetchingAllMembers(false)
      setSyncProgress(40)
      setSyncMessage(`Found ${allMembersResult.members.length} members. Starting Klaviyo sync...`)

      // Now sync all members to Klaviyo
      console.log("=== STARTING KLAVIYO SYNC ===")
      console.log("Starting Klaviyo sync with", allMembersResult.members.length, "members")
      console.log("API Key:", apiKey ? `${apiKey.substring(0, 10)}...` : "Missing")
      console.log("List ID:", selectedListId)
      
      setSyncProgress(50)
      setSyncMessage("Syncing members to Klaviyo...")
      
      const result = await syncMembersToKlaviyo(
        apiKey, 
        selectedListId, 
        allMembersResult.members
      )
      console.log("=== KLAVIYO SYNC RESULT ===")
      console.log("Klaviyo sync result:", result)
      console.log("Success:", result.success)
      console.log("Synced count:", result.syncedCount)
      console.log("Error:", result.error)
      setSyncProgress(100)

      if (result.success) {
        console.log("Sync successful!")
        setSyncSuccess(true)
        setSyncMessage(`✅ Successfully synced ${result.syncedCount} members to Klaviyo!`)
        // Save the integration to Supabase
        await saveEmailPlatformConfig(whopUserId, {
          platform: "klaviyo",
          apiKey: apiKey,
          listId: selectedListId,
        })
        onSync(selectedListId, result.syncedCount)
      } else {
        // Even if sync fails, save the integration to database
        console.log("Klaviyo sync failed, but saving integration to database")
        setSyncSuccess(false)
        setSyncMessage(`❌ Sync failed: ${result.error}`)
        // Save the integration to Supabase even if sync fails
        await saveEmailPlatformConfig(whopUserId, {
          platform: "klaviyo",
          apiKey: apiKey,
          listId: selectedListId,
        })
        onSync(selectedListId, 0) // Pass 0 as synced count since sync failed
        setError(result.error || "Failed to sync members, but integration was saved. Please try again.")
      }
    } catch (error) {
      console.error("=== SYNC EXCEPTION ===")
      console.error("Error in handleSync:", error)
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
      // Even if sync fails, save the integration to database
      console.log("Klaviyo sync failed with exception, but saving integration to database")
      setSyncSuccess(false)
      setSyncMessage(`❌ Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      onSync(selectedListId, 0) // Pass 0 as synced count since sync failed
      setError(error instanceof Error ? error.message : "An error occurred during sync, but integration was saved. Please try again.")
    } finally {
      console.log("=== SYNC COMPLETE ===")
      setIsSyncing(false)
      setIsFetchingAllMembers(false)
    }
  }

  const refreshLists = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const result = await validateKlaviyoApiKey(apiKey)

      if (result.success && result.lists) {
        setKlaviyoLists(result.lists)
      } else {
        setError(result.error || "Failed to refresh lists. Please try again.")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred while refreshing lists.")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Select a Klaviyo List</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshLists}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Choose an existing list to sync your {totalMemberCount} Whop members to.
        </p>

        {klaviyoLists.length > 0 ? (
          <RadioGroup value={selectedListId || ""} onValueChange={handleListSelect} className="space-y-3">
            {klaviyoLists.map((list) => (
              <div key={list.id} className="flex items-center space-x-2">
                <RadioGroupItem value={list.id} id={`list-${list.id}`} />
                <Label htmlFor={`list-${list.id}`} className="flex flex-col">
                  <span>{list.attributes?.name || "Unnamed List"}</span>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(list.attributes?.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <p className="text-sm text-muted-foreground">No lists found in your Klaviyo account.</p>
        )}
      </div>

      <div className="border-t pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2 mb-4"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <PlusCircle className="h-4 w-4" />
          Create New List
        </Button>

        {showCreateForm && (
          <div className="space-y-4 p-4 border rounded-md">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="My Whop Members"
              />
            </div>
            <Button
              type="button"
              onClick={handleCreateList}
              disabled={!newListName || isCreatingList}
              className="w-full"
            >
              {isCreatingList ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create List"
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert className="bg-orange-50 border-orange-200">
        <Info className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700">
          All members will be added as <strong>subscribed</strong> to your Klaviyo list, regardless of their status in
          Whop.
        </AlertDescription>
      </Alert>

      {/* Progress Bar and Status */}
      {isSyncing && (
        <div className="space-y-3 p-4 border rounded-md bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isFetchingAllMembers ? "Fetching members..." : "Syncing to Klaviyo..."}
            </span>
            <span className="text-sm text-muted-foreground">{syncProgress}%</span>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300 bg-orange-400"
              style={{ width: `${syncProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground">{syncMessage}</p>
        </div>
      )}

      {/* Success/Failure Status */}
      {syncSuccess !== null && !isSyncing && (
        <Alert variant={syncSuccess ? "default" : "destructive"} className="py-2">
          {syncSuccess ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>{syncMessage}</AlertDescription>
        </Alert>
      )}

      {/* Debug Info */}
      <div className="p-3 border rounded-md bg-gray-50 text-xs">
        <p><strong>Debug Info:</strong></p>
        <p>Selected List ID: {selectedListId || "None"}</p>
        <p>Is Syncing: {isSyncing ? "Yes" : "No"}</p>
        <p>API Key Present: {apiKey ? "Yes" : "No"}</p>
        <p>Total Members: {totalMemberCount}</p>
        <p>Button Disabled: {(!selectedListId || isSyncing) ? "Yes" : "No"}</p>
      </div>

      <Button 
        onClick={(e) => {
          console.log("=== BUTTON CLICKED ===")
          console.log("Button clicked event:", e)
          console.log("Selected list ID:", selectedListId)
          console.log("Is syncing:", isSyncing)
          console.log("API key present:", !!apiKey)
          handleSync()
        }} 
        disabled={!selectedListId || isSyncing} 
        className="w-full"
      >
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isFetchingAllMembers
              ? `Fetching all ${totalMemberCount} members...`
              : `Syncing ${totalMemberCount} members to Klaviyo...`}
          </>
        ) : (
          `Sync all ${totalMemberCount} members to Klaviyo`
        )}
      </Button>
    </div>
  )
}
