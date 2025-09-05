import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Users, Mail, Zap, Settings, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface AutomationSettingsProps {
  whopUserId: string
}

interface AutomationConfig {
  id: string
  whop_user_id: string
  auto_add_new_members: boolean
  auto_sync_to_resend: boolean
  default_audience_id?: string
  created_at: string
  updated_at: string
}

interface EmailAudience {
  id: string;
  name: string;
  description: string;
  member_count: number;
}

export default function AutomationSettings({ whopUserId }: AutomationSettingsProps) {
  const [config, setConfig] = useState<AutomationConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [selectedAudienceId, setSelectedAudienceId] = useState('')
  const [audiences, setAudiences] = useState<EmailAudience[]>([])

  useEffect(() => {
    const initializeData = async () => {
      // Load automation config first
      const configData = await loadAutomationConfig()
      // Then load user audiences with the config data
      await loadUserAudiences(configData)
    }
    
    initializeData()
    generateWebhookUrl()
  }, [whopUserId])

  const loadAutomationConfig = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/automation-config?whop_user_id=${whopUserId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Loaded automation config:', data)
      if (data.success && data.config) {
        setConfig(data.config)
        const audienceId = data.config.default_audience_id || ''
        console.log('Setting selectedAudienceId from config:', audienceId)
        setSelectedAudienceId(audienceId)
        return data.config // Return config for loadUserAudiences
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error loading automation config:', error)
      toast.error("Failed to load automation settings")
      return null // Return null on error
    } finally {
      setLoading(false)
    }
  }

  const generateWebhookUrl = () => {
    // This is the main webhook endpoint that users configure in Whop
    const webhookUrl = 'https://www.whopmail.com/api/webhook'
    setWebhookUrl(webhookUrl)
  }

  const updateSetting = (key: keyof AutomationConfig, value: boolean) => {
    if (config) {
      setConfig({
        ...config,
        [key]: value,
        updated_at: new Date().toISOString()
      })
    }
  }

  const saveConfig = async () => {
    if (!config) return

    console.log('Saving config:', config)
    setSaving(true)
    try {
      // Update config with selected audience
      const updatedConfig = {
        ...config,
        default_audience_id: selectedAudienceId
      }
      
      console.log('Updated config to save:', updatedConfig)
      
      const response = await fetch('/api/automation-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedConfig)
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success && data.config) {
        setConfig(data.config)
        toast.success("Automation settings saved successfully")
        console.log('Settings saved successfully')
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error saving automation config:', error)
      toast.error("Failed to save automation settings")
    } finally {
      setSaving(false)
    }
  }

  const loadUserAudiences = async (configData: AutomationConfig | null) => {
    try {
      // Fetch user's email audiences from the database
      const response = await fetch(`/api/email-lists/audiences?whop_user_id=${whopUserId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Loaded user audiences:', data)
      setAudiences(data.audiences || [])
      
      console.log('Current selectedAudienceId:', selectedAudienceId)
      console.log('Current config default_audience_id:', configData?.default_audience_id)
      
      // CRITICAL: If we have a config with a default_audience_id, NEVER override it
      if (configData?.default_audience_id) {
        console.log('Using default_audience_id from config:', configData.default_audience_id)
        setSelectedAudienceId(configData.default_audience_id)
        return // Exit early to prevent any override
      }
      
      // Only set default audience if NO config exists and NO audience is currently selected
      if (data.audiences && data.audiences.length > 0 && !selectedAudienceId) {
        console.log('No config exists, setting default audience to first in list:', data.audiences[0].id)
        setSelectedAudienceId(data.audiences[0].id)
      }
    } catch (error) {
      console.error('Error loading user audiences:', error)
      
      // Fallback to mock data if API fails
      const mockAudiences: EmailAudience[] = [
        { id: 'all-members', name: 'All Members', description: 'All members from Whop', member_count: 0 },
        { id: 'active-members', name: 'Active Members', description: 'Currently active subscribers', member_count: 0 },
        { id: 'trial-members', name: 'Trial Members', description: 'Members in trial period', member_count: 0 },
        { id: 'canceled-members', name: 'Canceled Members', description: 'Members who canceled', member_count: 0 }
      ]
      setAudiences(mockAudiences)
      
      // Only set default if no audience is currently selected AND no audience was loaded from config
      if (!selectedAudienceId && !configData?.default_audience_id) {
        setSelectedAudienceId('all-members')
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
          Automation Settings
        </CardTitle>
        <CardDescription>
          Configure automatic actions when new members join your Whop product
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Webhook Information */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Webhook URL for Whop</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
              {webhookUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add this URL to your Whop webhook settings. All events will be sent here and automatically processed.
          </p>
        </div>

        <Separator />

        {/* Automation Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Auto-Add New Members
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically add new members to your email list when they join
              </p>
            </div>
            <Switch
              checked={config?.auto_add_new_members || false}
              onCheckedChange={(checked) => updateSetting('auto_add_new_members', checked)}
            />
          </div>

          {/* Default Audience Selection */}
          {config?.auto_add_new_members && (
            <div className="space-y-3 pl-6 border-l-2 border-muted">
              <Label className="text-sm font-medium">Default Email List</Label>
              
              <select
                value={selectedAudienceId}
                onChange={(e) => setSelectedAudienceId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
              >
                {audiences.length > 0 ? (
                  audiences.map((audience) => (
                    <option key={audience.id} value={audience.id}>
                      {audience.name} ({audience.member_count} members)
                    </option>
                  ))
                ) : (
                  <option value="">No email lists available</option>
                )}
              </select>
              
              {/* Show currently selected audience */}
              {selectedAudienceId && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  ✓ Currently selected: {audiences.find(a => a.id === selectedAudienceId)?.name || 'Unknown'}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                New members will be automatically added to this list when they join
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Auto-Sync to Email Platform
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically sync new members to your email platform
              </p>
            </div>
            <Switch
              checked={config?.auto_sync_to_resend || false}
              onCheckedChange={(checked) => updateSetting('auto_sync_to_resend', checked)}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Available Event Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Available Automation Events</Label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <div className="font-medium text-green-600">Membership Events</div>
              <div>• membership.went_valid</div>
              <div>• membership.went_invalid</div>
              <div>• membership.metadata_updated</div>
              <div>• membership.cancel_at_period_end_changed</div>
              <div>• membership.experience_claimed</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-blue-600">Payment Events</div>
              <div>• payment.succeeded</div>
              <div>• payment.failed</div>
              <div>• payment.pending</div>
              <div>• payment.affiliate_reward_created</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-orange-600">Refund Events</div>
              <div>• refund.created</div>
              <div>• refund.updated</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-red-600">Dispute Events</div>
              <div>• dispute.created</div>
              <div>• dispute.updated</div>
              <div>• dispute.alert_created</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-purple-600">Resolution Events</div>
              <div>• resolution.created</div>
              <div>• resolution.updated</div>
              <div>• resolution.decided</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            All these events will automatically add members to your email list and trigger appropriate automation actions.
          </p>
        </div>

        {/* Status Information */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Webhook Status</Label>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">Active</span>
            <Badge variant="secondary" className="text-xs">
              Processing events
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Your webhook is active and will process new member events automatically
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
