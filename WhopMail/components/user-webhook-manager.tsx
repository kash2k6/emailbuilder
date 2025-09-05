'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, ExternalLink, Settings, Activity } from 'lucide-react'
import { toast } from 'sonner'

interface UserWebhook {
  id: string
  webhook_url: string
  webhook_name: string
  description: string
  events: string[]
  is_active: boolean
  secret_key: string | null
  last_success_at: string | null
  last_failure_at: string | null
  retry_count: number
  created_at: string
}

interface UserWebhookManagerProps {
  whopUserId: string
}

const AVAILABLE_EVENTS = [
  { id: 'email.opened', label: 'Email Opened', description: 'When a recipient opens an email' },
  { id: 'email.clicked', label: 'Email Clicked', description: 'When a recipient clicks a link in an email' },
  { id: 'email.delivered', label: 'Email Delivered', description: 'When an email is successfully delivered' },
  { id: 'email.bounced', label: 'Email Bounced', description: 'When an email bounces back' },
  { id: 'email.complained', label: 'Email Complained', description: 'When a recipient marks email as spam' },
  { id: 'email.unsubscribed', label: 'Email Unsubscribed', description: 'When a recipient unsubscribes' }
]

export default function UserWebhookManager({ whopUserId }: UserWebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<UserWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    webhook_url: '',
    webhook_name: '',
    description: '',
    events: ['email.opened', 'email.clicked'],
    secret_key: ''
  })

  useEffect(() => {
    loadWebhooks()
  }, [whopUserId])

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/user-webhooks?whop_user_id=${whopUserId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setWebhooks(data.webhooks || [])
      } else {
        throw new Error('Failed to load webhooks')
      }
    } catch (error) {
      console.error('Error loading webhooks:', error)
      toast.error("Failed to load webhooks")
    } finally {
      setLoading(false)
    }
  }

  const saveWebhook = async () => {
    if (!formData.webhook_url.trim()) {
      toast.error("Webhook URL is required")
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/user-webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          whop_user_id: whopUserId
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        toast.success("Webhook created successfully")
        setShowForm(false)
        setFormData({
          webhook_url: '',
          webhook_name: '',
          description: '',
          events: ['email.opened', 'email.clicked'],
          secret_key: ''
        })
        loadWebhooks()
      } else {
        throw new Error('Failed to create webhook')
      }
    } catch (error) {
      console.error('Error creating webhook:', error)
      toast.error("Failed to create webhook")
    } finally {
      setSaving(false)
    }
  }

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(id => id !== eventId)
        : [...prev.events, eventId]
    }))
  }

  const getEventLabel = (eventId: string) => {
    return AVAILABLE_EVENTS.find(e => e.id === eventId)?.label || eventId
  }

  const getStatusBadge = (webhook: UserWebhook) => {
    if (webhook.last_failure_at && (!webhook.last_success_at || new Date(webhook.last_failure_at) > new Date(webhook.last_success_at))) {
      return <Badge variant="destructive">Failed</Badge>
    }
    if (webhook.last_success_at) {
      return <Badge variant="default">Active</Badge>
    }
    return <Badge variant="secondary">Pending</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Email Engagement Webhooks
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
          <Activity className="h-5 w-5" />
          Email Engagement Webhooks
        </CardTitle>
        <CardDescription>
          Configure webhooks to receive email engagement events (opens, clicks, etc.) from your campaigns
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Webhook List */}
        {webhooks.length > 0 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Your Webhooks</Label>
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{webhook.webhook_name}</h4>
                      {getStatusBadge(webhook)}
                    </div>
                    <p className="text-sm text-muted-foreground">{webhook.description}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="h-4 w-4" />
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {webhook.webhook_url}
                      </code>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {webhook.events.map((event) => (
                    <Badge key={event} variant="outline" className="text-xs">
                      {getEventLabel(event)}
                    </Badge>
                  ))}
                </div>
                
                {webhook.last_success_at && (
                  <div className="text-xs text-muted-foreground">
                    Last success: {new Date(webhook.last_success_at).toLocaleString()}
                  </div>
                )}
                
                {webhook.last_failure_at && (
                  <div className="text-xs text-red-600">
                    Last failure: {new Date(webhook.last_failure_at).toLocaleString()}
                    {webhook.retry_count > 0 && ` (${webhook.retry_count} retries)`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Add New Webhook */}
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add New Webhook
          </Button>
        ) : (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">New Webhook Configuration</Label>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_name">Webhook Name</Label>
                <Input
                  id="webhook_name"
                  value={formData.webhook_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhook_name: e.target.value }))}
                  placeholder="My Email Webhook"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secret_key">Secret Key (Optional)</Label>
                <Input
                  id="secret_key"
                  value={formData.secret_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                  placeholder="Leave empty for no signature"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook URL *</Label>
              <Input
                id="webhook_url"
                value={formData.webhook_url}
                onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                placeholder="https://your-domain.com/webhook"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Webhook for email engagement events"
              />
            </div>
            
            <div className="space-y-3">
              <Label>Event Types</Label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_EVENTS.map((event) => (
                  <div key={event.id} className="flex items-center space-x-2">
                    <Switch
                      id={event.id}
                      checked={formData.events.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    <Label htmlFor={event.id} className="text-sm">
                      <div className="font-medium">{event.label}</div>
                      <div className="text-xs text-muted-foreground">{event.description}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={saveWebhook} disabled={saving}>
                {saving ? 'Creating...' : 'Create Webhook'}
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">How it works:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Configure your webhook URL to receive email engagement events</li>
            <li>When emails are sent, opened, or clicked, we'll forward those events to your webhook</li>
            <li>You can process these events in your own system (CRM, analytics, etc.)</li>
            <li>Events include email ID, recipient email, timestamp, and engagement data</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
