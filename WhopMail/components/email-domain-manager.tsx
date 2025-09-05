"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { DomainVerification } from "./domain-verification"

// You may want to import your API call from a utility or use fetch directly
async function saveDomain(whopUserId: string, domain: string) {
  const res = await fetch("/api/email-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveDomain", whopUserId, domain })
  })
  return res.json()
}

async function getEmailSyncConfig(whopUserId: string) {
  const res = await fetch(`/api/email-data?whopUserId=${whopUserId}`)
  return res.json()
}

interface EmailDomainManagerProps {
  whopUserId: string
}

export function EmailDomainManager({ whopUserId }: EmailDomainManagerProps) {
  const [domain, setDomain] = useState("")
  const [domainId, setDomainId] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [configLoaded, setConfigLoaded] = useState(false)

  // Load current config on mount
  useEffect(() => {
    async function loadConfig() {
      setStatus("loading")
      setError(null)
      try {
        const result = await getEmailSyncConfig(whopUserId)
        if (result.success && result.config) {
          setDomain(result.config.custom_domain || "")
          setDomainId(result.config.domain_id || null)
        } else {
          setDomain("")
          setDomainId(null)
        }
      } catch (e) {
        setError("Failed to load domain config")
      } finally {
        setStatus("idle")
        setConfigLoaded(true)
      }
    }
    loadConfig()
  }, [whopUserId])

  // Handle domain form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setError(null)
    try {
      const result = await saveDomain(whopUserId, domain)
      if (result.success) {
        setDomain(domain)
        setDomainId(result.domainId || null)
        setShowForm(false)
      } else {
        setError(result.error || "Failed to save domain")
      }
    } catch (e) {
      setError("Failed to save domain")
    } finally {
      setStatus("idle")
    }
  }

  if (!configLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading domain config...
      </div>
    )
  }

  // Show add/change domain form
  if (showForm || !domain) {
    return (
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Add or Change Sending Domain</CardTitle>
          <CardDescription>
            Enter the domain you want to send emails from (e.g. <span className="font-mono">yourbrand.com</span>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="yourbrand.com"
              required
              autoFocus
            />
            <Button type="submit" disabled={status === "loading"} className="w-full">
              {status === "loading" ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Save Domain
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Show current domain and verification UI
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Sending Domain</CardTitle>
          <CardDescription>
            {domain}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setShowForm(true)}>
            Change Domain
          </Button>
        </CardContent>
      </Card>
      {domainId && (
        <DomainVerification
          domain={domain}
          domainId={domainId}
          whopUserId={whopUserId}
          onVerified={() => {}}
        />
      )}
    </div>
  )
} 