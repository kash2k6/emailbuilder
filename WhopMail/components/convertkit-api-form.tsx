"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { validateConvertKitApiKey } from "@/app/actions/convertkit"
import { Loader2, AlertCircle } from "lucide-react"

interface ConvertKitApiFormProps {
  onSuccess: (apiKey: string, apiSecret: string, data: any) => void
}

export function ConvertKitApiForm({ onSuccess }: ConvertKitApiFormProps) {
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)
    setError(null)

    try {
      const result = await validateConvertKitApiKey(apiKey)

      if (result.success && result.forms) {
        onSuccess(apiKey, apiSecret, result)
      } else {
        setError(result.error || "Failed to validate ConvertKit API key. Please check and try again.")
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
        <Label htmlFor="convertkit-api-key">ConvertKit API Key</Label>
        <div className="relative">
          <Input
            id="convertkit-api-key"
            type="password"
            placeholder="Enter your ConvertKit API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={error ? "border-destructive pr-10" : ""}
          />
          {error && <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />}
        </div>
        <p className="text-sm text-muted-foreground">
          Used for syncing members and forms. You can find this in your ConvertKit account under Settings &gt; Advanced &gt; API.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="convertkit-api-secret">ConvertKit API Secret</Label>
        <div className="relative">
          <Input
            id="convertkit-api-secret"
            type="password"
            placeholder="Enter your ConvertKit API secret"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            className={error ? "border-destructive pr-10" : ""}
          />
          {error && <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />}
        </div>
        <p className="text-sm text-muted-foreground">
          Used for fetching subscriber data and email engagement. This is different from your API key.
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Button type="submit" disabled={!apiKey || !apiSecret || isValidating} className="w-full">
        {isValidating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validating...
          </>
        ) : (
          "Connect ConvertKit"
        )}
      </Button>
    </form>
  )
}
