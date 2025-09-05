"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { Clock, Mail, Play, Pause, Trash2, Edit, TestTube, FileText, HelpCircle, Settings, RefreshCw } from 'lucide-react'

interface AutomationTrigger {
  id: string
  name: string
  description?: string
  trigger_type: string
  email_template_id?: string
  subject?: string
  html_content?: string
  text_content?: string
  delay_minutes: number
  send_immediately: boolean
  is_active: boolean
  total_triggered: number
  total_sent: number
  total_failed: number
  last_triggered_at?: string
  created_at: string
}

interface EmailTemplate {
  id: string
  name: string
  description?: string
  subject: string
  html_content?: string
  text_content?: string
  template_type: string
  usage_count: number
  is_active: boolean
}

interface AutomationTriggersProps {
  whopUserId: string
}

const TRIGGER_TYPES = [
  { value: 'app_membership.went_valid', label: 'Membership Activated' },
  { value: 'app_membership.went_invalid', label: 'Membership Expired' },
  { value: 'app_membership.created', label: 'Membership Created' },
  { value: 'app_membership.updated', label: 'Membership Updated' },
  { value: 'app_payment_succeeded', label: 'Payment Successful' },
  { value: 'app_payment_failed', label: 'Payment Failed' },
  { value: 'app_refund_created', label: 'Refund Issued' },
  { value: 'app_dispute_created', label: 'Dispute Created' }
]

export function AutomationTriggers({ whopUserId }: AutomationTriggersProps) {
  const [triggers, setTriggers] = useState<AutomationTrigger[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AutomationTrigger | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState<string | null>(null)
  const [hasEmailConfig, setHasEmailConfig] = useState<boolean | null>(null)
  const [manualTriggerEmail, setManualTriggerEmail] = useState('')
  const [manualTriggering, setManualTriggering] = useState<string | null>(null)
  const [showManualTriggerDialog, setShowManualTriggerDialog] = useState<string | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'app_membership.went_valid',
    email_template_id: null,
    subject: '',
    html_content: '',
    text_content: '',
    delay_days: 0,
    delay_hours: 0,
    send_immediately: true,
    is_active: true
  })

  useEffect(() => {
    checkEmailConfig()
    loadTriggers()
    loadTemplates()
  }, [whopUserId])

  const checkEmailConfig = async () => {
    try {
      const response = await fetch(`/api/company-settings?whopUserId=${whopUserId}`)
      const data = await response.json()
      setHasEmailConfig(data.success && data.settings)
    } catch (error) {
      console.error('Error checking email config:', error)
      setHasEmailConfig(false)
    }
  }

  const loadTriggers = async () => {
    try {
      const response = await fetch(`/api/automation-triggers?whopUserId=${whopUserId}`)
      const data = await response.json()
      if (data.success) {
        setTriggers(data.triggers || [])
      }
    } catch (error) {
      console.error('Error loading triggers:', error)
      toast({
        title: "Error",
        description: "Failed to load automation triggers",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/email-templates?whopUserId=${whopUserId}`)
      const data = await response.json()
      if (data.success) {
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const url = '/api/automation-triggers'
      const method = editing ? 'PUT' : 'POST'
      
      // Prepare the data, handling null email_template_id
      const submitData = {
        whopUserId,
        ...(editing ? { triggerId: editing.id } : {}),
        ...formData,
        email_template_id: formData.email_template_id === null ? undefined : formData.email_template_id
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: editing ? "Trigger updated successfully" : "Trigger created successfully"
        })
        setShowCreateDialog(false)
        resetForm()
        loadTriggers()
      } else {
        if (data.error === 'EmailSync configuration not found') {
          toast({
            title: "Email Setup Required",
            description: "Please set up your email domain first before creating automation triggers",
            variant: "destructive"
          })
          checkEmailConfig() // Refresh the email config status
        } else {
          throw new Error(data.error || 'Failed to save trigger')
        }
      }
    } catch (error) {
      console.error('Error saving trigger:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save trigger",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return

    try {
      const response = await fetch(`/api/automation-triggers?triggerId=${triggerId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Trigger deleted successfully"
        })
        loadTriggers()
      } else {
        throw new Error(data.error || 'Failed to delete trigger')
      }
    } catch (error) {
      console.error('Error deleting trigger:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete trigger",
        variant: "destructive"
      })
    }
  }

  const handleToggleActive = async (triggerId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/automation-triggers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerId,
          is_active: !isActive
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Trigger ${isActive ? 'deactivated' : 'activated'} successfully`
        })
        loadTriggers()
      } else {
        throw new Error(data.error || 'Failed to update trigger')
      }
    } catch (error) {
      console.error('Error updating trigger:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update trigger",
        variant: "destructive"
      })
    }
  }

  const handleTest = async (triggerId: string) => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive"
      })
      return
    }

    setTesting(triggerId)
    try {
      const response = await fetch('/api/automation-triggers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerId,
          testEmail,
          testData: {
            data: {
              user: { email: testEmail, username: 'testuser' },
              product: { title: 'Test Product' },
              status: 'valid'
            }
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Test email sent to ${testEmail}`
        })
        setTestEmail('')
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Error testing trigger:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive"
      })
    } finally {
      setTesting(null)
    }
  }

  const handleManualTrigger = async (triggerId: string) => {
    if (!manualTriggerEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      })
      return
    }

    setManualTriggering(triggerId)
    try {
      const response = await fetch('/api/automation-triggers/manual-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerId,
          userEmail: manualTriggerEmail,
          testData: {
            data: {
              user: { email: manualTriggerEmail, username: manualTriggerEmail.split('@')[0] },
              product: { title: 'Manual Trigger' },
              status: 'valid'
            }
          }
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: `Automation triggered for ${manualTriggerEmail}`,
        })
        setManualTriggerEmail('')
        setShowManualTriggerDialog(null)
        loadTriggers() // Refresh to update stats
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to trigger automation",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error manually triggering:', error)
      toast({
        title: "Error",
        description: "Failed to trigger automation",
        variant: "destructive"
      })
    } finally {
      setManualTriggering(null)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'custom') {
      setFormData(prev => ({
        ...prev,
        email_template_id: null,
        subject: '',
        html_content: '',
        text_content: ''
      }))
    } else {
      const template = templates.find(t => t.id === templateId)
      if (template) {
        setFormData(prev => ({
          ...prev,
          email_template_id: templateId,
          subject: template.subject,
          html_content: template.html_content || '',
          text_content: template.text_content || ''
        }))
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger_type: 'app_membership.went_valid',
      email_template_id: null,
      subject: '',
      html_content: '',
      text_content: '',
      delay_days: 0,
      delay_hours: 0,
      send_immediately: true,
      is_active: true
    })
    setEditing(null)
  }

  const openEditDialog = (trigger: AutomationTrigger) => {
    setEditing(trigger)
    const totalMinutes = trigger.delay_minutes
    const days = Math.floor(totalMinutes / (24 * 60))
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
    
    setFormData({
      name: trigger.name,
      description: trigger.description || '',
      trigger_type: trigger.trigger_type,
      email_template_id: trigger.email_template_id || null,
      subject: trigger.subject || '',
      html_content: trigger.html_content || '',
      text_content: trigger.text_content || '',
      delay_days: days,
      delay_hours: hours,
      send_immediately: trigger.send_immediately,
      is_active: trigger.is_active
    })
    setShowCreateDialog(true)
  }

  const openCreateDialog = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automation Triggers</h2>
          <p className="text-muted-foreground">
            Set up automated emails that send when specific events occur
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2" disabled={!hasEmailConfig}>
          <Mail className="h-4 w-4" />
          Create Trigger
        </Button>
      </div>

      {/* Email Setup Required */}
      {hasEmailConfig === false && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Mail className="h-12 w-12 text-orange-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-orange-800">Email Configuration Required</h3>
            <p className="text-orange-700 text-center mb-4 max-w-md">
              You need to set up your email domain before creating automation triggers. 
              This ensures your automated emails are sent from your verified domain.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.href = '/emailsync?tab=overview'}>
                <Settings className="h-4 w-4 mr-2" />
                Setup Email Domain
              </Button>
              <Button variant="outline" onClick={checkEmailConfig}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Triggers List */}
      {triggers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No automation triggers yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first automation trigger to start sending automated emails
            </p>
            <Button onClick={openCreateDialog}>
              Create Your First Trigger
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {triggers.map((trigger) => (
            <Card key={trigger.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{trigger.name}</CardTitle>
                      <Badge variant={trigger.is_active ? "default" : "secondary"}>
                        {trigger.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {trigger.delay_minutes > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(() => {
                            const days = Math.floor(trigger.delay_minutes / (24 * 60))
                            const hours = Math.floor((trigger.delay_minutes % (24 * 60)) / 60)
                            const minutes = trigger.delay_minutes % 60
                            
                            let delayText = ''
                            if (days > 0) delayText += `${days}d `
                            if (hours > 0) delayText += `${hours}h `
                            if (minutes > 0 && days === 0 && hours === 0) delayText += `${minutes}m`
                            
                            return delayText.trim() || `${trigger.delay_minutes}m`
                          })()} delay
                        </Badge>
                      )}
                    </div>
                    {trigger.description && (
                      <CardDescription>{trigger.description}</CardDescription>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Trigger: {TRIGGER_TYPES.find(t => t.value === trigger.trigger_type)?.label || trigger.trigger_type}</span>
                      <span>•</span>
                      <span>Triggered: {trigger.total_triggered}</span>
                      <span>•</span>
                      <span>Sent: {trigger.total_sent}</span>
                      <span>•</span>
                      <span>Failed: {trigger.total_failed}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowManualTriggerDialog(trigger.id)}
                    >
                      <Play className="h-4 w-4" />
                      Trigger
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(trigger.id, trigger.is_active)}
                    >
                      {trigger.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(trigger)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(trigger.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Enter test email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleTest(trigger.id)}
                    disabled={testing === trigger.id}
                  >
                    {testing === trigger.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Automation Trigger' : 'Create Automation Trigger'}
            </DialogTitle>
            <DialogDescription>
              Set up an automated email that will be sent when a specific event occurs
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="email">Email Content</TabsTrigger>
                <TabsTrigger value="timing">Timing & Conditions</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Trigger Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Welcome Email"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="trigger_type">Trigger Event</Label>
                    <Select
                      value={formData.trigger_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this automation does..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="email_template">Email Template (Optional)</Label>
                  <Select
                    value={formData.email_template_id || "custom"}
                    onValueChange={handleTemplateSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template or create custom content" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Content</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {template.name}
                            <Badge variant="outline" className="ml-auto">
                              {template.usage_count} uses
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4">
                <div>
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Welcome to {{product_name}}!"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="html_content">HTML Content</Label>
                  <Textarea
                    id="html_content"
                    value={formData.html_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
                    placeholder="<h1>Welcome!</h1><p>Hi {{member_name}}, welcome to our community!</p>"
                    rows={8}
                  />
                </div>

                <div>
                  <Label htmlFor="text_content">Plain Text Content</Label>
                  <Textarea
                    id="text_content"
                    value={formData.text_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                    placeholder="Welcome! Hi {{member_name}}, welcome to our community!"
                    rows={4}
                />
                </div>

                <Alert>
                  <AlertDescription>
                    Use template variables like <code className="bg-muted px-1 rounded">{"{{member_name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{product_name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{company_name}}"}</code> to personalize your emails.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="timing" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="send_immediately">Send Immediately</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email as soon as the trigger fires
                    </p>
                  </div>
                  <Switch
                    id="send_immediately"
                    checked={formData.send_immediately}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_immediately: checked }))}
                  />
                </div>

                {!formData.send_immediately && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="delay">Delay</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              <p className="font-semibold mb-1">Delay Examples:</p>
                              <ul className="text-sm space-y-1">
                                <li>• 1 day = 1,440 minutes</li>
                                <li>• 2 days = 2,880 minutes</li>
                                <li>• 1 hour = 60 minutes</li>
                                <li>• 8 hours = 480 minutes</li>
                                <li>• 1 day + 2 hours = 1,560 minutes</li>
                              </ul>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="delay_days">Days</Label>
                        <Select
                          value={formData.delay_days.toString()}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, delay_days: parseInt(value) || 0 }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="0" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 8 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i} {i === 1 ? 'day' : 'days'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="delay_hours">Hours</Label>
                        <Select
                          value={formData.delay_hours.toString()}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, delay_hours: parseInt(value) || 0 }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="0" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 25 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i} {i === 1 ? 'hour' : 'hours'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {(formData.delay_days > 0 || formData.delay_hours > 0) && (
                      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        <strong>Total Delay:</strong> {formData.delay_days > 0 && `${formData.delay_days} ${formData.delay_days === 1 ? 'day' : 'days'}`} {formData.delay_hours > 0 && `${formData.delay_hours} ${formData.delay_hours === 1 ? 'hour' : 'hours'}`} 
                        <br />
                        <span className="text-xs">({((formData.delay_days * 24 * 60) + (formData.delay_hours * 60)).toLocaleString()} minutes)</span>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground">
                      Email will be scheduled to send after this delay using Resend's native scheduling
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable this automation trigger
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  editing ? 'Update Trigger' : 'Create Trigger'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Trigger Dialog */}
      <Dialog open={!!showManualTriggerDialog} onOpenChange={(open) => !open && setShowManualTriggerDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually Trigger Automation</DialogTitle>
            <DialogDescription>
              Enter an email address to manually trigger this automation. This will send the email immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-trigger-email">Email Address</Label>
              <Input
                id="manual-trigger-email"
                type="email"
                placeholder="user@example.com"
                value={manualTriggerEmail}
                onChange={(e) => setManualTriggerEmail(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowManualTriggerDialog(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleManualTrigger(showManualTriggerDialog!)}
                disabled={manualTriggering === showManualTriggerDialog}
              >
                {manualTriggering === showManualTriggerDialog ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Trigger Automation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 