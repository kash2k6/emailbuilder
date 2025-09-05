"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { 
  Plus, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Settings, 
  Palette,
  Type,
  Mail,
  Users,
  BarChart3,
  Eye,
  Code
} from 'lucide-react'
import { 
  createForm, 
  updateForm, 
  deleteForm, 
  getUserForms,
  type EmbeddableForm,
  type FormField 
} from '@/app/actions/embeddable-forms'
import { getUserEmailAudiences } from '@/app/actions/emailsync'
import { getEmailFlows } from '@/app/actions/email-flows'

interface FormBuilderProps {
  whopUserId: string
  onFormCreated?: (form: EmbeddableForm) => void
  onFormUpdated?: (form: EmbeddableForm) => void
  onFormDeleted?: (formId: string) => void
}

export function FormBuilder({ whopUserId, onFormCreated, onFormUpdated, onFormDeleted }: FormBuilderProps) {
  const [forms, setForms] = useState<EmbeddableForm[]>([])
  const [audiences, setAudiences] = useState<any[]>([])
  const [emailFlows, setEmailFlows] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingForm, setEditingForm] = useState<EmbeddableForm | null>(null)
  const [showEmbedDialog, setShowEmbedDialog] = useState<string | null>(null)
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    title: 'Join Our Mailing List',
    subtitle: '',
    logo_url: '',
    background_color: '#ffffff',
    text_color: '#000000',
    button_color: '#f97316',
    button_text: 'Subscribe',
    fields: [
      {
        id: 'first_name',
        type: 'text' as const,
        label: 'First Name',
        placeholder: 'Enter your first name',
        required: true
      },
      {
        id: 'last_name',
        type: 'text' as const,
        label: 'Last Name',
        placeholder: 'Enter your last name',
        required: true
      },
      {
        id: 'email',
        type: 'email' as const,
        label: 'Email Address',
        placeholder: 'Enter your email address',
        required: true
      }
    ],
    audience_id: 'none',
    email_flow_id: 'none',
    show_powered_by: true,
    redirect_url: '',
    success_message: 'Thank you for subscribing!'
  })

  // Load forms, audiences, and email flows
  useEffect(() => {
    const loadData = async () => {
      try {
        const [formsData, audiencesData, flowsData] = await Promise.all([
          getUserForms(whopUserId),
          getUserEmailAudiences(whopUserId),
          getEmailFlows(whopUserId)
        ])
        setForms(formsData)
        setAudiences(audiencesData || [])
        setEmailFlows(flowsData.flows || [])
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load forms')
      } finally {
        setIsLoading(false)
      }
    }

    if (whopUserId) {
      loadData()
    }
  }, [whopUserId])

  const handleCreateForm = async () => {
    try {
      // Convert 'none' to null for audience_id and email_flow_id
      const createData = {
        whop_user_id: whopUserId,
        ...formData,
        audience_id: formData.audience_id === 'none' ? null : formData.audience_id,
        email_flow_id: formData.email_flow_id === 'none' ? null : formData.email_flow_id
      }

      const result = await createForm(createData)

      if (result.success && result.form) {
        setForms([result.form, ...forms])
        setShowCreateDialog(false)
        resetFormData()
        onFormCreated?.(result.form)
        toast.success('Form created successfully!')
      } else {
        toast.error(result.error || 'Failed to create form')
      }
    } catch (error) {
      console.error('Error creating form:', error)
      toast.error('Failed to create form')
    }
  }

  const handleUpdateForm = async () => {
    if (!editingForm) return

    try {
      // Convert 'none' to null for audience_id and email_flow_id
      const updateData = {
        ...formData,
        audience_id: formData.audience_id === 'none' ? null : formData.audience_id,
        email_flow_id: formData.email_flow_id === 'none' ? null : formData.email_flow_id
      }

      const result = await updateForm(editingForm.id, updateData)

      if (result.success && result.form) {
        setForms(forms.map(f => f.id === editingForm.id ? result.form : f))
        setEditingForm(null)
        resetFormData()
        onFormUpdated?.(result.form)
        toast.success('Form updated successfully!')
      } else {
        toast.error(result.error || 'Failed to update form')
      }
    } catch (error) {
      console.error('Error updating form:', error)
      toast.error('Failed to update form')
    }
  }

  const handleDeleteForm = async (formId: string) => {
    if (!window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return
    }

    try {
      const result = await deleteForm(formId)

      if (result.success) {
        setForms(forms.filter(f => f.id !== formId))
        onFormDeleted?.(formId)
        toast.success('Form deleted successfully!')
      } else {
        toast.error(result.error || 'Failed to delete form')
      }
    } catch (error) {
      console.error('Error deleting form:', error)
      toast.error('Failed to delete form')
    }
  }

  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      title: 'Join Our Mailing List',
      subtitle: '',
      logo_url: '',
      background_color: '#ffffff',
      text_color: '#000000',
      button_color: '#f97316',
      button_text: 'Subscribe',
      fields: [
        {
          id: 'first_name',
          type: 'text' as const,
          label: 'First Name',
          placeholder: 'Enter your first name',
          required: true
        },
        {
          id: 'last_name',
          type: 'text' as const,
          label: 'Last Name',
          placeholder: 'Enter your last name',
          required: true
        },
        {
          id: 'email',
          type: 'email' as const,
          label: 'Email Address',
          placeholder: 'Enter your email address',
          required: true
        }
      ],
      audience_id: 'none',
      email_flow_id: '',
      show_powered_by: true,
      redirect_url: '',
      success_message: 'Thank you for subscribing!'
    })
  }

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false
    }
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }))
  }

  const removeField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }))
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      )
    }))
  }

  const getEmbedCode = (formId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.whopmail.com'
    return `<iframe src="${baseUrl}/embed/form/${formId}" width="100%" height="400" frameborder="0"></iframe>`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading forms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Embeddable Forms</h2>
          <p className="text-muted-foreground">Create beautiful signup forms to embed anywhere</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      {/* Forms List */}
      {forms.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No forms created yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first embeddable form to start collecting email subscribers
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {form.name}
                      {!form.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{form.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingForm(form)
                        setFormData({
                          name: form.name,
                          description: form.description || '',
                          title: form.title,
                          subtitle: form.subtitle || '',
                          logo_url: form.logo_url || '',
                          background_color: form.background_color,
                          text_color: form.text_color,
                          button_color: form.button_color,
                          button_text: form.button_text,
                          fields: form.fields,
                          audience_id: form.audience_id || 'none',
                          email_flow_id: form.email_flow_id || 'none',
                          show_powered_by: form.show_powered_by,
                          redirect_url: form.redirect_url || '',
                          success_message: form.success_message
                        })
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmbedDialog(form.id)}
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAnalyticsDialog(form.id)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/embed/form/${form.id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteForm(form.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Submissions:</span>
                    <div className="font-medium">{form.total_submissions}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fields:</span>
                    <div className="font-medium">{form.fields.length}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Audience:</span>
                    <div className="font-medium">
                      {form.audience_id && form.audience_id !== 'none' 
                        ? audiences.find(a => a.id === form.audience_id)?.name || 'None'
                        : 'None'
                      }
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <div className="font-medium">
                      {new Date(form.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Form Dialog */}
      <Dialog open={showCreateDialog || !!editingForm} onOpenChange={() => {
        setShowCreateDialog(false)
        setEditingForm(null)
        resetFormData()
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? 'Edit Form' : 'Create New Form'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Form Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Newsletter Signup"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Form Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Form Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Join Our Mailing List"
                />
              </div>
              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Get the latest updates"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="background_color">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="background_color"
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                    className="w-16"
                  />
                  <Input
                    value={formData.background_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="text_color">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="text_color"
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                    className="w-16"
                  />
                  <Input
                    value={formData.text_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="button_color">Button Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="button_color"
                    type="color"
                    value={formData.button_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, button_color: e.target.value }))}
                    className="w-16"
                  />
                  <Input
                    value={formData.button_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, button_color: e.target.value }))}
                    placeholder="#f97316"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="button_text">Button Text</Label>
              <Input
                id="button_text"
                value={formData.button_text}
                onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                placeholder="Subscribe"
              />
            </div>

            {/* Integration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="audience_id">Email List</Label>
                <Select
                  value={formData.audience_id || "none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, audience_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an email list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No list selected</SelectItem>
                    {audiences.map((audience) => (
                      <SelectItem key={audience.id} value={audience.id}>
                        {audience.name} ({audience.member_count} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email_flow_id">Email Flow (Optional)</Label>
                <Select
                  value={formData.email_flow_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, email_flow_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an email flow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No flow selected</SelectItem>
                    {emailFlows.map((flow) => (
                      <SelectItem key={flow.id} value={flow.id}>
                        {flow.name} ({flow.trigger_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="redirect_url">Redirect URL (Optional)</Label>
                <Input
                  id="redirect_url"
                  value={formData.redirect_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, redirect_url: e.target.value }))}
                  placeholder="https://example.com/thank-you"
                />
              </div>
              <div>
                <Label htmlFor="success_message">Success Message</Label>
                <Input
                  id="success_message"
                  value={formData.success_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, success_message: e.target.value }))}
                  placeholder="Thank you for subscribing!"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show_powered_by"
                checked={formData.show_powered_by}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_powered_by: checked }))}
              />
              <Label htmlFor="show_powered_by">Show "Powered by" branding</Label>
            </div>

            {/* Form Fields */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Form Fields</Label>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
              
              <div className="space-y-4">
                {formData.fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Field Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateField(field.id, { type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="Field Label"
                          />
                        </div>
                        <div>
                          <Label>Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="Placeholder text"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                              />
                              <Label className="text-sm">Required</Label>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeField(field.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false)
              setEditingForm(null)
              resetFormData()
            }}>
              Cancel
            </Button>
            <Button onClick={editingForm ? handleUpdateForm : handleCreateForm}>
              {editingForm ? 'Update Form' : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={!!showEmbedDialog} onOpenChange={() => setShowEmbedDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy and paste this code into your website to embed the form:
            </p>
            <div className="relative">
              <Textarea
                value={showEmbedDialog ? getEmbedCode(showEmbedDialog) : ''}
                readOnly
                className="font-mono text-sm"
                rows={4}
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(getEmbedCode(showEmbedDialog!))}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/embed/form/${showEmbedDialog}`, '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={!!showAnalyticsDialog} onOpenChange={() => setShowAnalyticsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Form Analytics</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showAnalyticsDialog && forms.find(f => f.id === showAnalyticsDialog) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {forms.find(f => f.id === showAnalyticsDialog)?.total_submissions || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Submissions</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {forms.find(f => f.id === showAnalyticsDialog)?.conversion_rate || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Conversion Rate</div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
