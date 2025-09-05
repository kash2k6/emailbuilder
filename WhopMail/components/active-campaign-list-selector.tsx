"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, PlusCircle, AlertTriangle, ExternalLink, RefreshCw, Info } from "lucide-react"
import {
  createActiveCampaignList,
  syncMembersToActiveCampaign,
  validateActiveCampaignApiKey,
} from "@/app/actions/activecampaign"
import { fetchAllWhopMembers } from "@/app/actions"
import type { WhopMembership } from "@/app/types"

interface ActiveCampaignListSelectorProps {
  lists: any[]
  apiKey: string
  apiUrl: string
  members: WhopMembership[]
  whopApiKey: string
  totalMemberCount: number
  onSync: (listId: string, syncedCount: number) => void
}

export function ActiveCampaignListSelector({
  lists,
  apiKey,
  apiUrl,
  members,
  whopApiKey,
  totalMemberCount,
  onSync,
}: ActiveCampaignListSelectorProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFetchingAllMembers, setIsFetchingAllMembers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionError, setPermissionError] = useState(false)
  const [activeCampaignLists, setActiveCampaignLists] = useState<any[]>(lists || [])
  const [syncProgress, setSyncProgress] = useState<number>(0)

  const handleCreateList = async () => {
    if (!newListName) return

    setIsCreatingList(true)
    setError(null)
    setPermissionError(false)

    try {
      const result = await createActiveCampaignList(apiKey, apiUrl, newListName)

      if (result.success && result.listId) {
        setSelectedListId(result.listId)
        setShowCreateForm(false)
        setIsCreatingList(false)

        // Refresh lists to include the newly created one
        refreshLists()
      } else {
        if (result.error?.includes("403") || result.error?.includes("not permitted")) {
          setPermissionError(true)
        } else {
          setError(result.error || "Failed to create list. Please try again.")
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setIsCreatingList(false)
    }
  }

  const handleSync = async () => {
    if (!selectedListId) return

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

      // Now sync all members to ActiveCampaign
      const result = await syncMembersToActiveCampaign(apiKey, apiUrl, selectedListId, allMembersResult.members)
      setSyncProgress(100)

      if (result.success) {
        onSync(selectedListId, result.syncedCount)
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

  const refreshLists = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const result = await validateActiveCampaignApiKey(apiKey, apiUrl)

      if (result.success && result.lists) {
        setActiveCampaignLists(result.lists)
        setPermissionError(false)
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
          <h3 className="text-lg font-medium">Select an ActiveCampaign List</h3>
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

        {activeCampaignLists.length > 0 ? (
          <RadioGroup value={selectedListId || ""} onValueChange={setSelectedListId} className="space-y-3">
            {activeCampaignLists.map((list) => (
              <div key={list.id} className="flex items-center space-x-2">
                <RadioGroupItem value={list.id} id={`list-${list.id}`} />
                <Label htmlFor={`list-${list.id}`} className="flex flex-col">
                  <span>{list.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {list.subscriber_count || 0} subscribers • Created{" "}
                    {new Date(list.cdate || Date.now()).toLocaleDateString()}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <p className="text-sm text-muted-foreground">No lists found in your ActiveCampaign account.</p>
        )}
      </div>

      {permissionError ? (
        <Alert variant="warning" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Permission Restricted</AlertTitle>
          <AlertDescription className="text-amber-700">
            <p className="mb-2">
              Your ActiveCampaign API key doesn't have permission to create new lists programmatically.
            </p>
            <p className="mb-2">
              Please create a list manually in your ActiveCampaign account and then click the "Refresh" button above to
              see your new list.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => window.open(`${apiUrl}/app/lists`, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Lists in ActiveCampaign
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
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
      )}

      {error && !permissionError && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert className="bg-orange-50 border-orange-200">
        <Info className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700">
          All members will be added as <strong>subscribed</strong> to your ActiveCampaign list, regardless of their
          status in Whop.
        </AlertDescription>
      </Alert>

      <Button onClick={handleSync} disabled={!selectedListId || isSyncing} className="w-full">
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isFetchingAllMembers
              ? `Fetching all ${totalMemberCount} members (${syncProgress}%)...`
              : `Syncing ${totalMemberCount} members to ActiveCampaign (${syncProgress}%)...`}
          </>
        ) : (
          `Sync all ${totalMemberCount} members to ActiveCampaign`
        )}
      </Button>
    </div>
  )
}
