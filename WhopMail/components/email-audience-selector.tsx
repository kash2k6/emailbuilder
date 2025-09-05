"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, Mail, Users } from "lucide-react"
import { setupEmailSyncWithMembers } from "@/app/actions/emailsync"
import type { WhopMembership } from "@/app/types"

interface EmailAudienceSelectorProps {
  domain: string
  members: WhopMembership[]
  whopApiKey: string
  totalMemberCount: number
  onSync: (audienceId: string, syncedCount: number) => void
  whopUserId: string
}

export function EmailAudienceSelector({
  domain,
  members,
  whopApiKey,
  totalMemberCount,
  onSync,
  whopUserId,
}: EmailAudienceSelectorProps) {
  const [listName, setListName] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState<number>(0)
  const getEmailAddress = () => {
    return `noreply@${domain}`
  }
  const [fromEmail, setFromEmail] = useState(getEmailAddress())

  const handleSync = async () => {
    if (!listName.trim()) {
      setError("Please enter a name for your email list")
      return
    }
    if (!fromEmail.trim()) {
      setError("Please enter a from email address")
      return
    }
    setIsSyncing(true)
    setError(null)
    setSyncProgress(0)
    try {
      // Use the new server action that handles everything
      const result = await setupEmailSyncWithMembers(
        whopUserId,
        listName,
        members,
        undefined, // description (optional)
        fromEmail // pass from email as fifth argument
      )
      if (!result.success) {
        throw new Error(result.error || "Failed to create email audience and sync members")
      }
      if (result.audienceId && result.syncedCount !== undefined) {
        onSync(result.audienceId, result.syncedCount)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred during sync")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-orange-600" />
          Create Your Email List
        </CardTitle>
        <CardDescription>
          Set up your email list to start sending messages to your Whop members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="from-email">From Email</Label>
            <Input
              id="from-email"
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              placeholder={getEmailAddress()}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be the from address for your list. Must match your verified domain.
            </p>
          </div>
          <div>
            <Label htmlFor="platform">Platform</Label>
            <div className="text-sm text-muted-foreground mt-1">
              Email Marketing System
            </div>
          </div>
          <div>
            <Label htmlFor="list-name">Email List Name</Label>
            <Input
              id="list-name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be the name of your email list
            </p>
          </div>
          </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
          {totalMemberCount} members will be added to your list
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSync}
          disabled={isSyncing || !listName.trim()}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating List & Syncing Members...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Create List & Sync Members
              </>
            )}
          </Button>

        <div className="text-sm text-muted-foreground space-y-1">
                            <p>• Your email list will be created in our Email Marketing system</p>
            <p>• You can send emails to your members directly from our platform</p>
            <p>• All emails are sent through our secure infrastructure</p>
        </div>
      </CardContent>
    </Card>
  )
} 