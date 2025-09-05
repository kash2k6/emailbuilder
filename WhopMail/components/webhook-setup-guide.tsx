"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Steps, Step } from "@/components/ui/steps"
import { ExternalLink, Copy, CheckCircle2 } from "lucide-react"
import { useState } from "react"

export function WebhookSetupGuide() {
  const [copied, setCopied] = useState(false)
  const webhookUrl = `${window.location.origin}/api/webhook`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automatic Member Sync</CardTitle>
        <CardDescription>Set up automatic syncing of new members as they join your Whop products</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTitle className="text-orange-800">Why set up automatic syncing?</AlertTitle>
          <AlertDescription className="text-orange-700">
            When you set up automatic syncing, new members will be added to your email platform immediately when they
            join your Whop products, without you having to manually sync.
          </AlertDescription>
        </Alert>

        <Steps>
          <Step title="Copy your webhook URL">
            <div className="flex items-center gap-2 mt-2">
              <Input value={webhookUrl} readOnly className="flex-1" />
              <Button variant="outline" size="icon" onClick={copyToClipboard}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </Step>

          <Step title="Go to Whop Developer Settings">
            <p className="text-sm text-muted-foreground mt-2">
              Log in to your Whop dashboard and navigate to Settings &gt; Developer.
            </p>
            <Button variant="outline" className="mt-2" asChild>
              <a
                href="https://dash.whop.com/settings/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <span>Open Whop Developer Settings</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </Step>

          <Step title="Add a new webhook endpoint">
            <p className="text-sm text-muted-foreground mt-2">
              Click "Add Endpoint" and paste your webhook URL. Select the following event:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 ml-2">
              <li>membership.went_valid</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              This event fires when a membership becomes valid, which happens when a new member joins or when a
              membership is renewed.
            </p>
          </Step>

          <Step title="Save and test">
            <p className="text-sm text-muted-foreground mt-2">
              Save your webhook configuration. You can test it by clicking "Send Test" in the Whop dashboard.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Now, whenever a new member joins your Whop products, they'll be automatically added to your email
              platform!
            </p>
          </Step>
        </Steps>
      </CardContent>
    </Card>
  )
}
