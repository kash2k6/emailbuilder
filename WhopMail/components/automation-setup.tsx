"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Clock, Users, Mail } from "lucide-react"
import { toast } from "sonner"

interface AutomationSetupProps {
  whopUserId: string
  apiKey: string
}

export function AutomationSetup({ whopUserId, apiKey }: AutomationSetupProps) {
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState("welcome")
  const [selectedAudience, setSelectedAudience] = useState("active")

  const webhookUrls = {
    memberSync: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhook/member-sync`,
    autoEmail: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhook/auto-email`
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const getCronJobPayload = (type: 'sync' | 'email') => {
    if (type === 'sync') {
      return JSON.stringify({
        whopUserId: whopUserId,
        apiKey: apiKey,
        syncType: 'auto'
      }, null, 2)
    } else {
      return JSON.stringify({
        whopUserId: whopUserId,
        audienceType: selectedAudience,
        emailTemplate: selectedEmailTemplate
      }, null, 2)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Automated Member Sync
          </CardTitle>
          <CardDescription>
            Set up automatic member categorization and email list management using cron-job.org
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sync-toggle">Enable Member Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically categorize members into status-based email lists
              </p>
            </div>
            <Switch
              id="sync-toggle"
              checked={syncEnabled}
              onCheckedChange={setSyncEnabled}
            />
          </div>

          {syncEnabled && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={webhookUrls.memberSync}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrls.memberSync, "Webhook URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Request Body (JSON)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={getCronJobPayload('sync')}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getCronJobPayload('sync'), "Request body")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">Recommended: Every 15 minutes</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://cron-job.org/en/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Setup on cron-job.org
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Automated Email Campaigns
          </CardTitle>
          <CardDescription>
            Set up automatic email campaigns for different member segments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-toggle">Enable Auto Emails</Label>
              <p className="text-sm text-muted-foreground">
                Send targeted emails to different member segments automatically
              </p>
            </div>
            <Switch
              id="email-toggle"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          {emailEnabled && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Target Audience</Label>
                  <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active Members</SelectItem>
                      <SelectItem value="canceled">Canceled Members</SelectItem>
                      <SelectItem value="expired">Expired Members</SelectItem>
                      <SelectItem value="trial">Trial Members</SelectItem>
                      <SelectItem value="past_due">Past Due Members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Email Template</Label>
                  <Select value={selectedEmailTemplate} onValueChange={setSelectedEmailTemplate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">Welcome Email</SelectItem>
                      <SelectItem value="reengagement">Re-engagement</SelectItem>
                      <SelectItem value="renewal">Renewal Reminder</SelectItem>
                      <SelectItem value="trial_ending">Trial Ending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={webhookUrls.autoEmail}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrls.autoEmail, "Webhook URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Request Body (JSON)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={getCronJobPayload('email')}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getCronJobPayload('email'), "Request body")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">Recommended: Daily at 9 AM</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://cron-job.org/en/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Setup on cron-job.org
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Create cron-job.org Account</h4>
            <p className="text-sm text-muted-foreground">
              Sign up at <a href="https://cron-job.org/en/" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">cron-job.org</a> (it's free!)
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Create Member Sync Job</h4>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Click "Create cronjob"</li>
              <li>• Set URL to the Member Sync webhook URL</li>
              <li>• Set method to POST</li>
              <li>• Add the request body as JSON</li>
              <li>• Set schedule to "Every 15 minutes"</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Create Email Campaign Job</h4>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Click "Create cronjob"</li>
              <li>• Set URL to the Auto Email webhook URL</li>
              <li>• Set method to POST</li>
              <li>• Add the request body as JSON</li>
              <li>• Set schedule to "Daily at 9 AM"</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">4. Monitor & Test</h4>
            <p className="text-sm text-muted-foreground">
              Use cron-job.org's test feature to verify your webhooks are working correctly.
              Monitor the execution history to ensure everything is running smoothly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
