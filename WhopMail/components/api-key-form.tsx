"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { submitWhopApiKey, fetchWhopMembers } from "@/app/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { WhopApiResponse } from "@/app/types"

interface ApiKeyFormProps {
  onSubmit: (apiKey: string, data?: WhopApiResponse) => void
  initialValue?: string
  onReset?: () => void
}

export function ApiKeyForm({ onSubmit, initialValue = "", onReset }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState(initialValue)
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialValue) {
      setApiKey(initialValue)
      setIsValid(true)
    }
  }, [initialValue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)
    setErrorMessage(null)

    try {
      // First, submit the API key to make.com
      const result = await submitWhopApiKey(apiKey)

      if (result.success) {
        // If successful, try to fetch memberships
        const membersResult = await fetchWhopMembers(apiKey)

        if (membersResult.success) {
          setIsValid(true)
          onSubmit(apiKey, membersResult)
        } else {
          // Even if fetching memberships fails, we still consider the API key valid
          // since the webhook submission was successful
          setIsValid(true)
          onSubmit(apiKey)
          console.warn("API key valid but couldn't fetch memberships:", membersResult.error)
        }
      } else {
        setIsValid(false)
        setErrorMessage(result.error || "Invalid API key. Please check and try again.")
      }
    } catch (error) {
      setIsValid(false)
      setErrorMessage(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* API Key Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">Whop API Key</Label>
          <div className="relative">
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your Whop API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={isValid === false ? "border-destructive pr-10" : ""}
            />
            {isValid === false && (
              <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
            )}
            {isValid === true && (
              <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
            )}
          </div>
          {isValid === false && errorMessage && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">
            You can find your API key in your Whop dashboard under Settings &gt; API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={!apiKey || isValidating}>
            {isValidating ? "Validating..." : initialValue && isValid ? "Update Whop Key" : "Connect Whop"}
          </Button>
          {initialValue && onReset && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onReset}
              disabled={isValidating}
            >
              Reset Key
            </Button>
          )}
        </div>
      </form>

      {/* Video Tutorial */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">How to Get Your WHOP API Key</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Watch this quick tutorial to learn how to find and copy your WHOP API key from your dashboard.
          </p>
        </div>
        <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/cdcY9rnJeGA"
            title="How to Get Your WHOP API Key"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
        <div className="text-xs text-muted-foreground">
          <p><strong>Quick Steps:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Log into your WHOP dashboard</li>
            <li>Go to Settings → API</li>
            <li>Copy your API key</li>
            <li>Paste it in the field on the left</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
