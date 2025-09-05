"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { validateActiveCampaignApiKey } from "@/app/actions/activecampaign"
import { Loader2, AlertCircle } from "lucide-react"

interface ActiveCampaignApiFormProps {
  onSuccess: (apiKey: string, apiUrl: string, data: any) => void
}

export function ActiveCampaignApiForm({ onSuccess }: ActiveCampaignApiFormProps) {
  const [apiKey, setApiKey] = useState("")
  const [apiUrl, setApiUrl] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)
    setError(null)

    if (!apiKey || !apiUrl) {
      setError("Both API Key and API URL are required")
      setIsValidating(false)
      return
    }

    try {
      const result = await validateActiveCampaignApiKey(apiKey, apiUrl)

      if (result.success && result.lists) {
        onSuccess(apiKey, apiUrl, result)
      } else {
        setError(result.error || "Failed to validate ActiveCampaign API key. Please check and try again.")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="activecampaign-api-url">ActiveCampaign API URL</Label>
        <div className="relative">
          <Input
            id="activecampaign-api-url"
            type="text"
            placeholder="https://youraccount.api-us1.com"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className={error ? "border-destructive pr-10" : ""}
          />
          {error && <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activecampaign-api-key">ActiveCampaign API Key</Label>
        <div className="relative">
          <Input
            id="activecampaign-api-key"
            type="password"
            placeholder="Enter your ActiveCampaign API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={error ? "border-destructive pr-10" : ""}
          />
          {error && <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />}
        </div>
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">
          You can find your API URL and API key in your ActiveCampaign account under Settings &gt; Developer.
        </p>
      </div>
      <Button type="submit" disabled={!apiKey || !apiUrl || isValidating} className="w-full">
        {isValidating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validating...
          </>
        ) : (
          "Connect ActiveCampaign"
        )}
      </Button>
    </form>
  )
}
