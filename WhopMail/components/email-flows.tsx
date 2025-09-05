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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { Clock, Mail, Play, Pause, Trash2, Edit, TestTube, FileText, Plus, Users, Calendar, ArrowRight, HelpCircle, Palette } from 'lucide-react'
import { EmailDesigner } from './email-designer'
import { getUserEmailTemplates, loadEmailTemplate } from '@/app/actions/emailsync'

interface EmailFlow {
  id: string
  name: string
  description?: string
  trigger_type: string
  is_active: boolean
  total_triggered: number
  total_completed: number
  total_failed: number
  created_at: string
  domain_warming?: {
    enabled: boolean
    initial_volume: number
    volume_increase_rate: number
    max_volume: number
    warmup_duration_days: number
  }
  drip_settings?: {
    enabled: boolean
    frequency: string
    max_emails: number
    engagement_threshold: number
  }
}

interface FlowStep {
  id: string
  flow_id: string
  step_order: number
  name: string
  description?: string
  email_template_id?: string
  subject: string
  html_content?: string
  text_content?: string
  delay_days: number
  delay_hours: number
  delay_type: 'after_previous' | 'after_trigger'
  is_active: boolean
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

interface EmailFlowsProps {
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
  { value: 'app_dispute_created', label: 'Dispute Created' },
  { value: 'domain_warming', label: 'Domain Warming Campaign' },
  { value: 'drip_campaign', label: 'Drip Campaign' },
  { value: 'onboarding_sequence', label: 'Onboarding Sequence' },
  { value: 're_engagement', label: 'Re-engagement Campaign' }
]

export function EmailFlows({ whopUserId }: EmailFlowsProps) {
  const [flows, setFlows] = useState<EmailFlow[]>([])
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<EmailFlow | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState<string | null>(null)
  const [manualAddEmail, setManualAddEmail] = useState('')
  const [manualAdding, setManualAdding] = useState<string | null>(null)
  const [showManualAddDialog, setShowManualAddDialog] = useState<string | null>(null)
  const [showParticipantsDialog, setShowParticipantsDialog] = useState<string | null>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [showDesigner, setShowDesigner] = useState<{ stepIndex: number; show: boolean }>({ stepIndex: -1, show: false })
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'app_membership.went_valid',
    is_active: true,
    domain_warming: {
      enabled: false,
      initial_volume: 10,
      volume_increase_rate: 20, // percentage
      max_volume: 1000,
      warmup_duration_days: 30
    },
    drip_settings: {
      enabled: false,
      frequency: 'daily', // daily, weekly, monthly
      max_emails: 10,
      engagement_threshold: 0.1 // 10% engagement rate
    }
  })

  // Steps state
  const [steps, setSteps] = useState<Omit<FlowStep, 'id' | 'flow_id'>[]>([
    {
      step_order: 1,
      name: 'Welcome Email',
      description: 'Initial welcome message',
      email_template_id: undefined,
      subject: 'Welcome to {{product_name}}!',
      html_content: '<h1>Welcome!</h1><p>Hi {{member_name}}, welcome to our community!</p>',
      text_content: 'Welcome! Hi {{member_name}}, welcome to our community!',
      delay_days: 0,
      delay_hours: 0,
      delay_type: 'after_trigger',
      is_active: true
    }
  ])

  useEffect(() => {
    loadFlows()
    loadTemplates()
  }, [whopUserId])

  const loadFlows = async () => {
    try {
      const response = await fetch(`/api/email-flows?whopUserId=${whopUserId}`)
      const data = await response.json()
      if (data.success) {
        setFlows(data.flows || [])
      }
    } catch (error) {
      console.error('Error loading flows:', error)
      toast({
        title: "Error",
        description: "Failed to load email flows",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      // Use the same template loading function as normal campaigns
      const result = await getUserEmailTemplates(whopUserId)
      if (result.success && result.templates) {
        setTemplates(result.templates || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      // Fallback to the old method if the direct function call fails
      try {
        const response = await fetch(`/api/email-templates?whopUserId=${whopUserId}`)
        const data = await response.json()
        if (data.success) {
          setTemplates(data.templates || [])
        }
      } catch (fallbackError) {
        console.error('Fallback template loading also failed:', fallbackError)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const url = '/api/email-flows'
      const method = editing ? 'PUT' : 'POST'
      
      // Prepare the data
      const submitData = {
        whopUserId,
        ...(editing ? { flowId: editing.id } : {}),
        ...formData,
        steps: steps.map((step, index) => ({
          ...step,
          step_order: index + 1,
          email_template_id: step.email_template_id === null ? undefined : step.email_template_id,
          delay_minutes: (step.delay_days * 24 * 60) + (step.delay_hours * 60) // Convert to minutes for backend
        }))
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
          description: editing ? "Email flow updated successfully" : "Email flow created successfully"
        })
        setShowCreateDialog(false)
        resetForm()
        loadFlows()
      } else {
        throw new Error(data.error || 'Failed to save email flow')
      }
    } catch (error) {
      console.error('Error saving email flow:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save email flow",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this email flow?')) return

    try {
      const response = await fetch(`/api/email-flows?flowId=${flowId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Email flow deleted successfully"
        })
        loadFlows()
      } else {
        throw new Error(data.error || 'Failed to delete email flow')
      }
    } catch (error) {
      console.error('Error deleting email flow:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete email flow",
        variant: "destructive"
      })
    }
  }

  const handleToggleActive = async (flowId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/email-flows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId,
          is_active: !isActive
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Email flow ${isActive ? 'deactivated' : 'activated'} successfully`
        })
        loadFlows()
      } else {
        throw new Error(data.error || 'Failed to update email flow')
      }
    } catch (error) {
      console.error('Error updating email flow:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email flow",
        variant: "destructive"
      })
    }
  }

  const handleTest = async (flowId: string) => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive"
      })
      return
    }

    setTesting(flowId)
    try {
      const response = await fetch('/api/email-flows/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId,
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
          description: `Test email flow started for ${testEmail}`
        })
        setTestEmail('')
      } else {
        throw new Error(data.error || 'Failed to start test email flow')
      }
    } catch (error) {
      console.error('Error testing email flow:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start test email flow",
        variant: "destructive"
      })
    } finally {
      setTesting(null)
    }
  }

  const handleManualAddUser = async (flowId: string) => {
    if (!manualAddEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      })
      return
    }

    setManualAdding(flowId)
    try {
      const response = await fetch('/api/email-flows/manual-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId,
          userEmail: manualAddEmail,
          testData: {
            data: {
              user: { email: manualAddEmail, username: manualAddEmail.split('@')[0] },
              product: { title: 'Manual Add' },
              status: 'valid'
            }
          }
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: `User ${manualAddEmail} added to flow and first email scheduled!`,
        })
        setManualAddEmail('')
        setShowManualAddDialog(null)
        loadFlows() // Refresh to update stats
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add user to flow",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error manually adding user:', error)
      toast({
        title: "Error",
        description: "Failed to add user to flow",
        variant: "destructive"
      })
    } finally {
      setManualAdding(null)
    }
  }

  const loadParticipants = async (flowId: string) => {
    setLoadingParticipants(true)
    try {
      const response = await fetch(`/api/email-flows/manual-add?flowId=${flowId}`)
      const result = await response.json()
      
      if (result.success) {
        setParticipants(result.executions || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load participants",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading participants:', error)
      toast({
        title: "Error",
        description: "Failed to load participants",
        variant: "destructive"
      })
    } finally {
      setLoadingParticipants(false)
    }
  }

  const addStep = () => {
    const newStep: Omit<FlowStep, 'id' | 'flow_id'> = {
      step_order: steps.length + 1,
      name: `Step ${steps.length + 1}`,
      description: '',
      email_template_id: undefined,
      subject: '',
      html_content: '',
      text_content: '',
      delay_days: 0,
      delay_hours: 0,
      delay_type: 'after_previous',
      is_active: true
    }
    setSteps([...steps, newStep])
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((_, i) => i !== index)
      setSteps(newSteps.map((step, i) => ({ ...step, step_order: i + 1 })))
    }
  }

  const updateStep = (index: number, updates: Partial<FlowStep>) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setSteps(newSteps)
  }

  const handleTemplateSelect = async (stepIndex: number, templateId: string) => {
    if (templateId === 'custom') {
      updateStep(stepIndex, { email_template_id: undefined })
      return
    }

    if (templateId === 'designer') {
      setShowDesigner({ stepIndex, show: true })
      return
    }

    try {
      const result = await loadEmailTemplate(templateId, whopUserId)
      if (result.success && result.template) {
        const template = result.template
        updateStep(stepIndex, {
          email_template_id: templateId,
          subject: template.subject,
          html_content: template.html_content || '',
          text_content: template.text_content || ''
        })
      }
    } catch (error) {
      console.error('Error loading template:', error)
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive"
      })
    }
  }

  const handleDesignerSave = (stepIndex: number, htmlContent: string, textContent: string) => {
    updateStep(stepIndex, {
      html_content: htmlContent,
      text_content: textContent
    })
    setShowDesigner({ stepIndex: -1, show: false })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger_type: 'app_membership.went_valid',
      is_active: true,
      domain_warming: {
        enabled: false,
        initial_volume: 10,
        volume_increase_rate: 20, // percentage
        max_volume: 1000,
        warmup_duration_days: 30
      },
      drip_settings: {
        enabled: false,
        frequency: 'daily', // daily, weekly, monthly
        max_emails: 10,
        engagement_threshold: 0.1 // 10% engagement rate
      }
    })
    setSteps([{
      step_order: 1,
      name: 'Welcome Email',
      description: 'Initial welcome message',
      email_template_id: undefined,
      subject: 'Welcome to {{product_name}}!',
      html_content: '<h1>Welcome!</h1><p>Hi {{member_name}}, welcome to our community!</p>',
      text_content: 'Welcome! Hi {{member_name}}, welcome to our community!',
      delay_days: 0,
      delay_hours: 0,
      delay_type: 'after_trigger',
      is_active: true
    }])
    setEditing(null)
  }

  const openEditDialog = async (flow: EmailFlow) => {
    setEditing(flow)
    setFormData({
      name: flow.name,
              description: flow.description ?? '',
      trigger_type: flow.trigger_type,
      is_active: flow.is_active,
      domain_warming: flow.domain_warming || {
        enabled: false,
        initial_volume: 10,
        volume_increase_rate: 20, // percentage
        max_volume: 1000,
        warmup_duration_days: 30
      },
      drip_settings: flow.drip_settings || {
        enabled: false,
        frequency: 'daily', // daily, weekly, monthly
        max_emails: 10,
        engagement_threshold: 0.1 // 10% engagement rate
      }
    })
    
    // Load flow steps
    try {
      const response = await fetch(`/api/email-flows/steps?flowId=${flow.id}`)
      const data = await response.json()
      
      if (data.success && data.steps) {
        const loadedSteps = data.steps.map((step: any) => ({
          step_order: step.step_order,
          name: step.name,
          description: step.description || '',
          email_template_id: step.email_template_id,
          subject: step.subject,
          html_content: step.html_content || '',
          text_content: step.text_content || '',
          delay_days: Math.floor(step.delay_minutes / (24 * 60)),
          delay_hours: Math.floor((step.delay_minutes % (24 * 60)) / 60),
          delay_type: step.delay_type,
          is_active: step.is_active
        }))
        setSteps(loadedSteps)
      } else {
        // If no steps found, use default step
        setSteps([{
          step_order: 1,
          name: 'Welcome Email',
          description: 'Initial welcome message',
          email_template_id: null,
          subject: 'Welcome to {{product_name}}!',
          html_content: '<h1>Welcome!</h1><p>Hi {{member_name}}, welcome to our community!</p>',
          text_content: 'Welcome! Hi {{member_name}}, welcome to our community!',
          delay_days: 0,
          delay_hours: 0,
          delay_type: 'after_trigger',
          is_active: true
        }])
      }
    } catch (error) {
      console.error('Error loading flow steps:', error)
      // Use default step if loading fails
      setSteps([{
        step_order: 1,
        name: 'Welcome Email',
        description: 'Initial welcome message',
        email_template_id: null,
        subject: 'Welcome to {{product_name}}!',
        html_content: '<h1>Welcome!</h1><p>Hi {{member_name}}, welcome to our community!</p>',
        text_content: 'Welcome! Hi {{member_name}}, welcome to our community!',
        delay_days: 0,
        delay_hours: 0,
        delay_type: 'after_trigger',
        is_active: true
      }])
    }
    
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
          <h2 className="text-2xl font-bold">Email Flows</h2>
          <p className="text-muted-foreground">
            Create multi-step email sequences with scheduling
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Create Flow
        </Button>
      </div>

      {/* Flows List */}
      {flows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No email flows yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first email flow to start sending multi-step sequences
            </p>
            <Button onClick={openCreateDialog}>
              Create Your First Flow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {flows.map((flow) => (
            <Card key={flow.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{flow.name}</CardTitle>
                      <Badge variant={flow.is_active ? "default" : "secondary"}>
                        {flow.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {flow.description && (
                      <CardDescription>{flow.description}</CardDescription>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Trigger: {TRIGGER_TYPES.find(t => t.value === flow.trigger_type)?.label || flow.trigger_type}</span>
                      <span>•</span>
                      <span>Subscribers: {flow.total_triggered || 0}</span>
                      <span>•</span>
                      <span>Active: {(flow.total_triggered || 0) - (flow.total_completed || 0) - (flow.total_failed || 0)}</span>
                      <span>•</span>
                      <span>Completed: {flow.total_completed || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowParticipantsDialog(flow.id)
                        loadParticipants(flow.id)
                      }}
                    >
                      <Users className="h-4 w-4" />
                      View ({flow.total_triggered || 0})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowManualAddDialog(flow.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Add User
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(flow.id, flow.is_active)}
                    >
                      {flow.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(flow)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(flow.id)}
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
                    onClick={() => handleTest(flow.id)}
                    disabled={testing === flow.id}
                  >
                    {testing === flow.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    Test Flow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Email Flow' : 'Create Email Flow'}
            </DialogTitle>
            <DialogDescription>
              Create a multi-step email sequence that will be sent when a specific event occurs
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="steps">Email Steps</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Flow Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Welcome Sequence"
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
                    placeholder="Describe what this email flow does..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable this email flow
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="steps" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Email Steps</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addStep}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </Button>
                </div>

                <div className="space-y-6">
                  {steps.map((step, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Step {step.step_order}</Badge>
                            <Input
                              value={step.name}
                              onChange={(e) => updateStep(index, { name: e.target.value })}
                              placeholder="Step name"
                              className="w-48"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={step.is_active}
                              onCheckedChange={(checked) => updateStep(index, { is_active: checked })}
                            />
                            {steps.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeStep(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Email Template</Label>
                            <Select
                              value={step.email_template_id || "custom"}
                              onValueChange={(value) => handleTemplateSelect(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a template or create custom content" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="custom">
                                  <div className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Custom Content
                                  </div>
                                </SelectItem>
                                <SelectItem value="designer">
                                  <div className="flex items-center gap-2">
                                    <Palette className="h-4 w-4" />
                                    Use Email Designer
                                  </div>
                                </SelectItem>
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
                                                  <div>
                          <Label>Delay Type</Label>
                          <Select
                            value={step.delay_type}
                            onValueChange={(value: 'after_previous' | 'after_trigger') => 
                              updateStep(index, { delay_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="after_trigger">After Trigger</SelectItem>
                              <SelectItem value="after_previous">After Previous Step</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Delay</Label>
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
                            <Label htmlFor={`delay-days-${index}`}>Days</Label>
                            <Select
                              value={step.delay_days.toString()}
                              onValueChange={(value) => updateStep(index, { delay_days: parseInt(value) || 0 })}
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
                            <Label htmlFor={`delay-hours-${index}`}>Hours</Label>
                            <Select
                              value={step.delay_hours.toString()}
                              onValueChange={(value) => updateStep(index, { delay_hours: parseInt(value) || 0 })}
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
                        
                        {(step.delay_days > 0 || step.delay_hours > 0) && (
                          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            <strong>Total Delay:</strong> {step.delay_days > 0 && `${step.delay_days} ${step.delay_days === 1 ? 'day' : 'days'}`} {step.delay_hours > 0 && `${step.delay_hours} ${step.delay_hours === 1 ? 'hour' : 'hours'}`} 
                            <br />
                            <span className="text-xs">({((step.delay_days * 24 * 60) + (step.delay_hours * 60)).toLocaleString()} minutes)</span>
                          </div>
                        )}
                      </div>

                        <div>
                          <Label>Email Subject</Label>
                          <Input
                            value={step.subject}
                            onChange={(e) => updateStep(index, { subject: e.target.value })}
                            placeholder="e.g., Welcome to {{product_name}}!"
                            required
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Email Content</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDesigner({ stepIndex: index, show: true })}
                            >
                              <Palette className="h-4 w-4 mr-2" />
                              Use Email Designer
                            </Button>
                          </div>
                          <Textarea
                            value={step.html_content || ''}
                            onChange={(e) => updateStep(index, { html_content: e.target.value })}
                            placeholder="<h1>Welcome!</h1><p>Hi {{member_name}}, welcome to our community!</p>"
                            rows={4}
                          />
                        </div>

                        <div>
                          <Label>Plain Text Content</Label>
                          <Textarea
                            value={step.text_content || ''}
                            onChange={(e) => updateStep(index, { text_content: e.target.value })}
                            placeholder="Welcome! Hi {{member_name}}, welcome to our community!"
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Alert>
                  <AlertDescription>
                    Use template variables like <code className="bg-muted px-1 rounded">{"{{member_name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{product_name}}"}</code>, <code className="bg-muted px-1 rounded">{"{{company_name}}"}</code> to personalize your emails.
                  </AlertDescription>
                </Alert>
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
                  editing ? 'Update Flow' : 'Create Flow'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Add User Dialog */}
      <Dialog open={!!showManualAddDialog} onOpenChange={(open) => !open && setShowManualAddDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Email Flow</DialogTitle>
            <DialogDescription>
              Enter an email address to manually add a user to this email flow. The flow will start immediately for this user.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-add-email">Email Address</Label>
              <Input
                id="manual-add-email"
                type="email"
                placeholder="user@example.com"
                value={manualAddEmail}
                onChange={(e) => setManualAddEmail(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowManualAddDialog(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleManualAddUser(showManualAddDialog!)}
                disabled={manualAdding === showManualAddDialog}
              >
                {manualAdding === showManualAddDialog ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                Add User to Flow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      <Dialog open={!!showParticipantsDialog} onOpenChange={(open) => !open && setShowParticipantsDialog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Flow Participants</DialogTitle>
            <DialogDescription>
              View all users currently in this email flow and their progress.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingParticipants ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span className="ml-2">Loading participants...</span>
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No participants in this flow yet.</p>
                <p className="text-sm">Add users to see them here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{participant.member_email}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: {participant.status} • Step: {participant.current_step}/{participant.total_steps}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Started: {new Date(participant.started_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant={
                      participant.status === 'active' ? 'default' :
                      participant.status === 'completed' ? 'secondary' :
                      participant.status === 'failed' ? 'destructive' : 'outline'
                    }>
                      {participant.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowParticipantsDialog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Designer Dialog */}
      <Dialog open={showDesigner.show} onOpenChange={(open) => !open && setShowDesigner({ stepIndex: -1, show: false })}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Email Designer - Step {showDesigner.stepIndex + 1}</DialogTitle>
            <DialogDescription>
              Design your email using our visual editor. Your changes will be saved when you close this dialog.
            </DialogDescription>
          </DialogHeader>
          
          <div className="h-[70vh] overflow-hidden">
            {showDesigner.show && showDesigner.stepIndex >= 0 && (
              <EmailDesigner
                whopUserId={whopUserId}
                initialSubject={steps[showDesigner.stepIndex]?.subject || ''}
                onSend={(data) => {
                  handleDesignerSave(showDesigner.stepIndex, data.html, data.text)
                }}
                isSending={false}
                availableAudiences={[]}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 