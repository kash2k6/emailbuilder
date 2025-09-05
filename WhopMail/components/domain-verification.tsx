"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, CheckCircle, AlertCircle, Copy, ExternalLink, Globe, Edit, RefreshCw, HelpCircle } from "lucide-react"
import { getDomainStatus } from '@/app/actions/resend'
import { updateDomainVerificationStatus, saveEmailSyncConfig } from '@/app/actions/emailsync'
import { useToast } from "@/components/ui/use-toast"

interface DomainVerificationProps {
  domain: string
  domainId: string
  onVerified: () => void
  whopUserId: string
  domainVerificationDns?: any[]
}

export function DomainVerification({ domain, domainId, onVerified, whopUserId, domainVerificationDns }: DomainVerificationProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending')
  const [error, setError] = useState<string | null>(null)
  const [showDomainForm, setShowDomainForm] = useState(false)
  const [newDomain, setNewDomain] = useState(domain)
  const [isSavingDomain, setIsSavingDomain] = useState(false)
  const { toast } = useToast()

  const checkInitialStatus = useCallback(async () => {
    if (!domainId) {
      console.log('No domainId provided, skipping status check')
      return
    }

    console.log('Checking initial domain status for domainId:', domainId)
    setIsChecking(true)
    setError(null)

    try {
      const result = await getDomainStatus(domainId)
      console.log('Domain status check result:', result)

      if (result.success) {
        if (result.verified) {
          console.log('Domain is verified, updating status')
          setVerificationStatus('verified')
          
          // Update Supabase with verified status and records
          await updateDomainVerificationStatus(whopUserId, domainId, 'verified', result.records)
          
          // Call onVerified callback
          onVerified()
        } else {
          console.log('Domain is not verified yet, status:', result.status)
          setVerificationStatus('pending')
          
          // Update Supabase with current status and records
          await updateDomainVerificationStatus(whopUserId, domainId, result.status || 'pending', result.records)
        }
      } else {
        console.error('Failed to check domain status:', result.error)
        setError(result.error || 'Failed to check domain status')
        setVerificationStatus('failed')
      }
    } catch (error) {
      console.error('Error checking domain status:', error)
      setError(error instanceof Error ? error.message : 'An error occurred while checking domain status')
      setVerificationStatus('failed')
    } finally {
      setIsChecking(false)
    }
  }, [domainId, whopUserId, onVerified])

  useEffect(() => {
    checkInitialStatus()
  }, [checkInitialStatus])

  const handleCheckVerification = async () => {
    console.log('Manual verification check triggered for domainId:', domainId)
    await checkInitialStatus()
  }

  const handleRefreshStatus = async () => {
    console.log('Force refresh domain status triggered for whopUserId:', whopUserId)
    setIsChecking(true)
    setError(null)
    
    try {
      const { forceRefreshDomainStatus } = await import('@/app/actions/emailsync')
      const result = await forceRefreshDomainStatus(whopUserId)
      
      if (result.success) {
        console.log('Domain status refreshed successfully:', result.status)
        // Re-check the status to update the UI
        await checkInitialStatus()
      } else {
        console.error('Failed to refresh domain status:', result.error)
        setError(result.error || 'Failed to refresh domain status')
      }
    } catch (error) {
      console.error('Error refreshing domain status:', error)
      setError(error instanceof Error ? error.message : 'An error occurred while refreshing domain status')
    } finally {
      setIsChecking(false)
    }
  }

  const getDnsRecords = () => {
    if (!domainVerificationDns || !Array.isArray(domainVerificationDns)) {
      return []
    }
    
    // If we have the full Resend domain data with records, use that
    if (domainVerificationDns.length > 0 && domainVerificationDns[0].record) {
      return domainVerificationDns
    }
    
    // Otherwise, return the basic DNS records
    return domainVerificationDns
  }

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingDomain(true)
    setError(null)
    
    try {
      const result = await saveEmailSyncConfig(whopUserId, newDomain, undefined, undefined)
      if (result.success) {
        setShowDomainForm(false)
        console.log('Domain saved successfully with ID:', result.domainId)
        // Refresh the page or reload the component to get the new domain
        window.location.reload()
      } else {
        // Handle specific error cases
        if (result.error?.includes('already been registered')) {
          setError('This domain is already registered in Resend. It will be connected to your account.')
          // Still refresh to show the connected domain
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else {
          setError(result.error || 'Failed to save domain')
        }
      }
    } catch (err) {
      setError('Failed to save domain')
    } finally {
      setIsSavingDomain(false)
    }
  }

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard!",
        description: `${fieldName} has been copied to your clipboard.`,
        duration: 2000,
      })
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500 text-white">Verified</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="destructive">Failed</Badge>
    }
  }

  // Show domain form if user wants to add/change domain
  if (showDomainForm) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Add or Change Sending Domain
          </CardTitle>
          <CardDescription>
            Enter the domain you want to send emails from (e.g. yourbrand.com)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSaveDomain} className="space-y-4">
            <Input
              type="text"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              placeholder="yourbrand.com"
              required
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={isSavingDomain} className="flex-1">
                {isSavingDomain ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Save Domain
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowDomainForm(false)}
                disabled={isSavingDomain}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  const dnsRecords = getDnsRecords()
  const requiredRecords = dnsRecords.filter(record => record.record === 'SPF' || record.record === 'DKIM' || record.record === 'VERIFICATION')
  const recommendedRecords = dnsRecords.filter(record => record.record === 'DMARC')

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domains</h1>
          <p className="text-muted-foreground">Manage your sending domains for better deliverability</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowDomainForm(true)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Change Domain
        </Button>
      </div>

      {/* Domain Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">CREATED:</span>
          <span className="ml-2">1 day ago</span>
        </div>
        <div>
          <span className="text-muted-foreground">STATUS:</span>
          <span className="ml-2">{getStatusBadge(verificationStatus)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">REGION:</span>
          <span className="ml-2">North Virginia (us-east-1) 🇺🇸</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {verificationStatus === 'verified' ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Well done! All the DNS records are verified. You are ready to start building and sending emails with this domain.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Please add the DNS records below to your domain to complete verification. DNS changes can take up to 48 hours to propagate.
          </AlertDescription>
        </Alert>
      )}

      {/* DNS Records Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">DNS Records</h2>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            How to add records
          </Button>
        </div>

        {/* Required Records - DKIM and SPF */}
        {requiredRecords.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">DKIM and SPF</h3>
              <Badge variant="outline" className="text-xs">Required</Badge>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Host</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>TTL</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requiredRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>{record.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.name, 'Host')}
                            className="h-6 w-6 p-0 hover:bg-muted"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>{record.type}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.type, 'Type')}
                            className="h-6 w-6 p-0 hover:bg-muted"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>{record.priority || '-'}</span>
                          {record.priority && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(record.priority, 'Priority')}
                              className="h-6 w-6 p-0 hover:bg-muted"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                          <code className="text-xs break-all bg-muted px-2 py-1 rounded flex-1">
                            {record.value}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.value, 'Data')}
                            className="h-6 w-6 p-0 hover:bg-muted"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>{record.ttl || 'Auto'}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.ttl || 'Auto', 'TTL')}
                            className="h-6 w-6 p-0 hover:bg-muted"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status || 'pending')}
                          <span className="text-sm capitalize">{record.status || 'pending'}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Recommended Records - DMARC */}
        {recommendedRecords.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">DMARC</h3>
              <Badge variant="outline" className="text-xs">Recommended</Badge>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Host</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>TTL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recommendedRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>{record.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.name, 'Host')}
                            className="h-6 w-6 p-0 hover:bg-muted"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>{record.type}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.type, 'Type')}
                            className="h-6 w-6 p-0 hover:bg-muted"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                          <code className="text-xs break-all bg-muted px-2 py-1 rounded flex-1">
                            {record.value}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.value, 'Data')}
                            className="h-6 w-6 p-0 hover:bg-muted"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span>{record.ttl || 'Auto'}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.ttl || 'Auto', 'TTL')}
                            className="h-6 w-6 p-0 hover:bg-muted"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Configuration Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configuration</h3>
          
          {/* Click Tracking */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Click Tracking</h4>
                <p className="text-sm text-muted-foreground">
                  To track clicks, Resend modifies each link in the body of the HTML email. A custom tracking domain can be configured, or links will be sent to a Resend server, and are immediately redirected to the URL destination.
                </p>
              </div>
              <div className="w-12 h-6 bg-green-500 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
          </div>

          {/* Open Tracking */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Open Tracking</h4>
                  <Badge variant="outline" className="text-xs">Not Recommended</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  A 1x1 pixel transparent GIF image is inserted in each email and includes a unique reference. Open tracking can produce inaccurate results.
                </p>
              </div>
              <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleCheckVerification}
            disabled={isChecking}
            className="flex-1"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking Verification...
              </>
            ) : (
              'Check Verification Status'
            )}
          </Button>
          <Button
            onClick={handleRefreshStatus}
            disabled={isChecking}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </Button>
        </div>

        {verificationStatus === 'verified' && (
          <div className="text-center">
            <Button onClick={onVerified} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Continue to Email Lists
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 