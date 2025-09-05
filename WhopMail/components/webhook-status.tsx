"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Play, RefreshCw } from "lucide-react"

interface WebhookStatusProps {
  companyId: string
}

interface WebhookStatus {
  success: boolean
  message: string
  integration?: {
    platform: string
    listId: string
    dc?: string
    apiUrl?: string
    lastSyncedAt?: string
  }
  webhookEvents?: string[]
}

interface TestResult {
  success: boolean
  message: string
  eventType: string
  integration?: {
    platform: string
    listId: string
  }
  memberData?: any
  result?: any
}

export function WebhookStatus({ companyId }: WebhookStatusProps) {
  const [status, setStatus] = useState<WebhookStatus | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testUsername, setTestUsername] = useState("")

  useEffect(() => {
    checkWebhookStatus()
  }, [companyId])

  const checkWebhookStatus = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/webhook/test?companyId=${companyId}`)
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error("Error checking webhook status:", error)
      setStatus({
        success: false,
        message: "Failed to check webhook status"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testWebhook = async (eventType: string = "membership.went_valid") => {
    setIsTesting(true)
    setTestResult(null)
    
    try {
      const response = await fetch("/api/webhook/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          eventType,
          memberEmail: testEmail || `test-${Date.now()}@example.com`,
          memberUsername: testUsername || "Test User",
          productName: "Test Product"
        }),
      })
      
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      console.error("Error testing webhook:", error)
      setTestResult({
        success: false,
        message: "Failed to test webhook"
      })
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking Webhook Status...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!status?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Webhook Not Configured
          </CardTitle>
          <CardDescription>
            {status?.message || "Unable to check webhook status"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              {status?.suggestion || "Please configure an email platform integration first to enable auto-sync."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Auto-Sync Active
          </CardTitle>
          <CardDescription>
            Webhook is configured and ready to automatically sync new members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Platform</p>
              <p className="font-medium">{status.integration?.platform}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">List ID</p>
              <p className="font-medium">{status.integration?.listId}</p>
            </div>
            {status.integration?.dc && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Center</p>
                <p className="font-medium">{status.integration.dc}</p>
              </div>
            )}
            {status.integration?.lastSyncedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Synced</p>
                <p className="font-medium">
                  {new Date(status.integration.lastSyncedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Webhook Events</p>
            <div className="flex flex-wrap gap-1">
              {status.webhookEvents?.map((event: string) => (
                <Badge key={event} variant="secondary" className="text-xs">
                  {event}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkWebhookStatus}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Auto-Sync</CardTitle>
          <CardDescription>
            Test the webhook functionality by simulating a new member event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Test Email</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Test Username</label>
              <input
                type="text"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                placeholder="Test User"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => testWebhook("membership.went_valid")}
              disabled={isTesting}
              size="sm"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Test Valid Membership
            </Button>
            <Button
              variant="outline"
              onClick={() => testWebhook("membership.went_invalid")}
              disabled={isTesting}
              size="sm"
            >
              Test Invalid Membership
            </Button>
          </div>

          {testResult && (
            <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">
                    {testResult.success ? "✅ Test Successful" : "❌ Test Failed"}
                  </p>
                  <p>{testResult.message}</p>
                  {testResult.integration && (
                    <div className="text-sm text-muted-foreground">
                      <p>Platform: {testResult.integration.platform}</p>
                      <p>List ID: {testResult.integration.listId}</p>
                    </div>
                  )}
                  {testResult.result && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">View Details</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(testResult.result, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 