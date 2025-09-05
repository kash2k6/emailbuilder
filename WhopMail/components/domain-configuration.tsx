"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Settings, 
  Shield, 
  Eye, 
  MousePointer, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { updateDomainSettings } from '@/app/actions/emailsync'

interface DomainConfigurationProps {
  whopUserId: string
  domainId?: string
}

export function DomainConfiguration({ whopUserId, domainId }: DomainConfigurationProps) {
  const [clickTracking, setClickTracking] = useState(false)
  const [openTracking, setOpenTracking] = useState(false)
  const [tlsMode, setTlsMode] = useState<'opportunistic' | 'enforced'>('opportunistic')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (whopUserId && domainId) {
      loadDomainSettings()
    }
  }, [whopUserId, domainId])

  const loadDomainSettings = async () => {
    // For now, we'll use default values
    // In a real implementation, you'd fetch current settings from the email service
    setClickTracking(false)
    setOpenTracking(false)
    setTlsMode('opportunistic')
  }

  const handleSave = async () => {
    if (!whopUserId) return
    
    setSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      const result = await updateDomainSettings(whopUserId, {
        click_tracking: clickTracking,
        open_tracking: openTracking,
        tls: tlsMode
      })
      
      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || 'Failed to update domain settings')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (!domainId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Domain Configuration
          </CardTitle>
                  <CardDescription>
          Configure email tracking and security settings for your domain
        </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No domain configured</p>
            <p className="text-sm">Set up a domain first to configure email settings</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Domain Configuration
        </CardTitle>
        <CardDescription>
          Configure email tracking and security settings for your domain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Domain settings updated successfully!</AlertDescription>
          </Alert>
        )}

        {/* Click Tracking */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Click Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track clicks within the body of each HTML email
              </p>
            </div>
            <Switch
              checked={clickTracking}
              onCheckedChange={setClickTracking}
              disabled={saving}
            />
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              When enabled, the email service modifies each link in the body of HTML emails. 
              When recipients click a link, they are sent to a tracking server first, 
              then immediately redirected to the destination URL.
            </AlertDescription>
          </Alert>
        </div>

        {/* Open Tracking */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Open Tracking</Label>
                <Badge variant="secondary" className="text-xs">
                  Not Recommended
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Track the open rate of each email
              </p>
            </div>
            <Switch
              checked={openTracking}
              onCheckedChange={setOpenTracking}
              disabled={saving}
            />
          </div>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Open tracking can produce inaccurate results and decrease deliverability. 
              A 1x1 pixel transparent GIF image is inserted in each email with a unique reference. 
              Many email clients block tracking pixels by default, and some recipients may mark emails as spam 
              if they detect tracking.
            </AlertDescription>
          </Alert>
        </div>

        {/* TLS Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">TLS (Transport Layer Security)</Label>
            <p className="text-sm text-muted-foreground">
              Configure how emails are encrypted when sent
            </p>
          </div>
          <Select value={tlsMode} onValueChange={(value: 'opportunistic' | 'enforced') => setTlsMode(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opportunistic">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Opportunistic TLS
                </div>
              </SelectItem>
              <SelectItem value="enforced">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Enforced TLS
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Opportunistic TLS:</strong> Always attempts to make a secure connection to the receiving mail server. 
              If it can't establish a secure connection, it sends the message unencrypted.
              <br /><br />
              <strong>Enforced TLS:</strong> Requires that email communication must use TLS. 
              If the receiving server does not support TLS, the email will not be sent.
            </AlertDescription>
          </Alert>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 