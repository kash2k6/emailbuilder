"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, PlusCircle } from "lucide-react"
import { createGoHighLevelList, syncMembersToGoHighLevel } from "@/app/actions/gohighlevel"
import { saveEmailPlatformConfig } from "@/app/actions"
import type { WhopMembership } from "@/app/types"

interface GoHighLevelListSelectorProps {
  lists: any[]
  apiKey: string
  locationId: string
  members: WhopMembership[]
  whopApiKey: string
  totalMemberCount: number
  onSync: (listId: string, syncedCount: number) => void
  whopUserId: string
}

export function GoHighLevelListSelector({
  lists,
  apiKey,
  locationId,
  members,
  whopApiKey,
  totalMemberCount,
  onSync,
  whopUserId,
}: GoHighLevelListSelectorProps) {
  const [selectedListId, setSelectedListId] = useState<string>("")
  const [newListName, setNewListName] = useState("")
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState(0)

  // Save integration when list is selected
  const saveIntegration = async (listId: string) => {
    try {
      await saveEmailPlatformConfig(whopUserId, {
        platform: "gohighlevel",
        apiKey: apiKey,
        locationId: locationId,
        listId: listId,
      })
      console.log("GoHighLevel integration saved to Supabase")
    } catch (error) {
      console.error("Failed to save GoHighLevel integration:", error)
    }
  }

  const handleListSelect = (listId: string) => {
    setSelectedListId(listId)
    // Save integration immediately when list is selected
    saveIntegration(listId)
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsCreatingList(true)

    try {
      const result = await createGoHighLevelList(apiKey, locationId, newListName)

      if (result.success && result.listId) {
        setSelectedListId(result.listId)
        setShowCreateForm(false)
        setNewListName("")
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
    if (!selectedListId) return

    setError(null)
    setIsSyncing(true)
    setSyncProgress(0)

    try {
      // Start the sync process
      const result = await syncMembersToGoHighLevel(apiKey, locationId, selectedListId, members)

      if (result.success) {
        setSyncProgress(100)
        // Save the integration to Supabase
        await saveEmailPlatformConfig(whopUserId, {
          platform: "gohighlevel",
          apiKey: apiKey,
          locationId: locationId,
          listId: selectedListId,
        })
        onSync(selectedListId, result.syncedCount)
      } else {
        setError(result.error || "Failed to sync members. Please try again.")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Select a GoHighLevel List</h2>
        <p className="text-sm text-muted-foreground">
          Choose a list to sync your {totalMemberCount} Whop members to, or create a new list.
        </p>
      </div>

      {!showCreateForm ? (
        <>
          <RadioGroup value={selectedListId} onValueChange={handleListSelect} className="space-y-3">
            {lists.map((list) => (
              <div key={list.id} className="flex items-center space-x-2">
                <RadioGroupItem value={list.id} id={list.id} />
                <Label htmlFor={list.id} className="flex-1">
                  {list.name}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Button
            variant="outline"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 w-full"
            type="button"
          >
            <PlusCircle className="h-4 w-4" />
            Create New List
          </Button>
        </>
      ) : (
        <form onSubmit={handleCreateList} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-list-name">New List Name</Label>
            <Input
              id="new-list-name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Enter list name"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateForm(false)}
              className="flex-1"
              disabled={isCreatingList}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isCreatingList || !newListName}>
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
        </form>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSyncing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Syncing members...</span>
            <span>{syncProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${syncProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      <Button onClick={handleSync} disabled={!selectedListId || isSyncing} className="w-full" type="button">
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing {totalMemberCount} members...
          </>
        ) : (
          `Sync ${totalMemberCount} members to selected list`
        )}
      </Button>
    </div>
  )
}
