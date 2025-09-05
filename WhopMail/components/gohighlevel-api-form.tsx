"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { validateGoHighLevelApiKey } from "@/app/actions/gohighlevel"
import { Loader2 } from "lucide-react"

interface GoHighLevelApiFormProps {
  onSuccess: (apiKey: string, locationId: string, data: any) => void
}

export function GoHighLevelApiForm({ onSuccess }: GoHighLevelApiFormProps) {
  const [apiKey, setApiKey] = useState("")
  const [locationId, setLocationId] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsValidating(true)

    try {
      const result = await validateGoHighLevelApiKey(apiKey, locationId)

      if (result.success && result.lists) {
        onSuccess(apiKey, locationId, result)
      } else {
        setError(result.error || "Failed to validate API key. Please check and try again.")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Connect GoHighLevel</h2>
        <p className="text-sm text-muted-foreground">
          Enter your GoHighLevel API key and Location ID to connect your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your GoHighLevel API key"
            required
          />
          <p className="text-xs text-muted-foreground">
            You can find your API key in your GoHighLevel account under Settings &gt; API Keys.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-id">Location ID</Label>
          <Input
            id="location-id"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="Enter your GoHighLevel Location ID"
            required
          />
          <p className="text-xs text-muted-foreground">
            Your Location ID can be found in the URL when you're logged into your GoHighLevel account.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isValidating || !apiKey || !locationId} className="w-full">
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            "Connect GoHighLevel"
          )}
        </Button>
      </form>
    </div>
  )
}
