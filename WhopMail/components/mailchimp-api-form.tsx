"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { validateMailchimpApiKey } from "@/app/actions/mailchimp"
import { Loader2, AlertCircle } from "lucide-react"
import type { MailchimpApiResponse } from "@/app/types"

interface MailchimpApiFormProps {
  onSuccess: (apiKey: string, data: MailchimpApiResponse) => void
}

export function MailchimpApiForm({ onSuccess }: MailchimpApiFormProps) {
  const [apiKey, setApiKey] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)
    setError(null)

    try {
      const result = await validateMailchimpApiKey(apiKey)

      if (result.success && result.lists) {
        onSuccess(apiKey, result)
      } else {
        setError(result.error || "Failed to validate Mailchimp API key. Please check and try again.")
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
        <Label htmlFor="mailchimp-api-key">Mailchimp API Key</Label>
        <div className="relative">
          <Input
            id="mailchimp-api-key"
            type="password"
            placeholder="Enter your Mailchimp API key"
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
          You can find your API key in your Mailchimp account under Account &gt; Extras &gt; API keys.
        </p>
      </div>
      <Button type="submit" disabled={!apiKey || isValidating} className="w-full">
        {isValidating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validating...
          </>
        ) : (
          "Connect Mailchimp"
        )}
      </Button>
    </form>
  )
}
