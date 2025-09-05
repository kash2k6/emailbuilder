"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, PlusCircle, AlertTriangle, ExternalLink, RefreshCw, Info } from "lucide-react"
import { createMailchimpList, syncMembersToMailchimp, validateMailchimpApiKey } from "@/app/actions/mailchimp"
import { fetchAllWhopMembers, saveEmailPlatformConfig } from "@/app/actions"
import type { MailchimpList, WhopMembership } from "@/app/types"

interface MailchimpListSelectorProps {
  lists: MailchimpList[]
  apiKey: string
  dc: string
  members: WhopMembership[]
  whopApiKey: string
  totalMemberCount: number
  onSync: (listId: string, syncedCount: number) => void
  whopUserId: string
}

export function MailchimpListSelector({
  lists,
  apiKey,
  dc,
  members,
  whopApiKey,
  totalMemberCount,
  onSync,
  whopUserId,
}: MailchimpListSelectorProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFetchingAllMembers, setIsFetchingAllMembers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionError, setPermissionError] = useState(false)
  const [mailchimpLists, setMailchimpLists] = useState<MailchimpList[]>(lists)
  const [syncProgress, setSyncProgress] = useState<number>(0)

  // Save integration when list is selected
  const saveIntegration = async (listId: string) => {
    try {
      await saveEmailPlatformConfig(whopUserId, {
        platform: "mailchimp",
        apiKey: apiKey,
        listId: listId,
        dc: dc,
      })
      console.log("Mailchimp integration saved to Supabase")
    } catch (error) {
      console.error("Failed to save Mailchimp integration:", error)
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
    setPermissionError(false)

    try {
      const result = await createMailchimpList(apiKey, dc, newListName, companyName || "My Company")

      if (result.success && result.listId) {
        setSelectedListId(result.listId)
        setShowCreateForm(false)
        setIsCreatingList(false)
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
    setSyncProgress(0)

    try {
      // First, fetch all members from all pages
      setSyncProgress(10)
      const allMembersResult = await fetchAllWhopMembers(whopApiKey)
      setSyncProgress(50)

      if (!allMembersResult.success || !allMembersResult.members) {
        throw new Error(allMembersResult.error || "Failed to fetch all members")
      }

      setIsFetchingAllMembers(false)
      setSyncProgress(60)

      // Now sync all members to Mailchimp
      const result = await syncMembersToMailchimp(apiKey, dc, selectedListId, allMembersResult.members)
      setSyncProgress(100)

      if (result.success) {
        // Save the integration to Supabase
        await saveEmailPlatformConfig(whopUserId, {
          platform: "mailchimp",
          apiKey: apiKey,
          listId: selectedListId,
          dc: dc,
        })
        onSync(selectedListId, result.syncedCount)
      } else {
        setError(result.error || "Failed to sync members. Please try again.")
      }
    } catch (error) {
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
      const result = await validateMailchimpApiKey(apiKey)

      if (result.success && result.lists) {
        setMailchimpLists(result.lists)
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
          <h3 className="text-lg font-medium">Select a Mailchimp Audience</h3>
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
          Choose an existing audience to sync your {totalMemberCount} Whop members to.
        </p>

        {mailchimpLists.length > 0 ? (
          <RadioGroup value={selectedListId || ""} onValueChange={handleListSelect} className="space-y-3">
            {mailchimpLists.map((list) => (
              <div key={list.id} className="flex items-center space-x-2">
                <RadioGroupItem value={list.id} id={list.id} />
                <Label htmlFor={list.id} className="flex flex-col">
                  <span>{list.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {list.stats.member_count} subscribers • Created {new Date(list.date_created).toLocaleDateString()}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <p className="text-sm text-muted-foreground">No audiences found in your Mailchimp account.</p>
        )}
      </div>

      {permissionError ? (
        <Alert variant="warning" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Permission Restricted</AlertTitle>
          <AlertDescription className="text-amber-700">
            <p className="mb-2">
              Your Mailchimp API key doesn't have permission to create new audiences programmatically.
            </p>
            <p className="mb-2">
              Please create an audience manually in your Mailchimp account and then click the "Refresh" button above to
              see your new audience.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => window.open(`https://${dc}.admin.mailchimp.com/audience/manage/`, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Audiences in Mailchimp
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
            Create New Audience
          </Button>

          {showCreateForm && (
            <div className="space-y-4 p-4 border rounded-md">
              <div className="space-y-2">
                <Label htmlFor="list-name">Audience Name</Label>
                <Input
                  id="list-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="My Whop Members"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="My Company"
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
                  "Create Audience"
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
          <p className="mb-2">
            All members will be added as <strong>subscribed</strong> to your Mailchimp audience, regardless of their
            status in Whop.
          </p>
          <p>
            Note: Mailchimp processes large batches asynchronously. Your members will continue to sync in the background
            even after the success message appears. It may take several minutes for all members to appear in your
            Mailchimp audience.
          </p>
        </AlertDescription>
      </Alert>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">API Rate Limits</AlertTitle>
        <AlertDescription className="text-amber-700">
          <p className="mb-2">
            To avoid hitting Mailchimp's API rate limits, members will be synced in batches of 500 with a short delay
            between batches.
          </p>
          <p>
            For large member lists (1000+), the sync process may take a few minutes to complete. Please be patient and
            don't refresh the page.
          </p>
        </AlertDescription>
      </Alert>

      <Button onClick={handleSync} disabled={!selectedListId || isSyncing} className="w-full">
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isFetchingAllMembers
              ? `Fetching all ${totalMemberCount} members (${syncProgress}%)...`
              : `Syncing ${totalMemberCount} members to Mailchimp (${syncProgress}%)...`}
          </>
        ) : (
          `Sync all ${totalMemberCount} members to Mailchimp`
        )}
      </Button>
    </div>
  )
}
