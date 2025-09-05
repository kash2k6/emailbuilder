"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { sendIndividualEmail, getUserEmailTemplates, loadEmailTemplate, getEmailSyncConfig } from '@/app/actions/emailsync'
import { toast } from 'sonner'
import { Send, Mail, User, MessageSquare, Palette, FileText, Plus, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { EmailDesigner } from './email-designer'

interface EnhancedEmailSenderProps {
  whopUserId: string
  fromEmail: string
  recipientEmail?: string
}

export function EnhancedEmailSender({ whopUserId, fromEmail, recipientEmail }: EnhancedEmailSenderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [toEmail, setToEmail] = useState(recipientEmail || '')
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [showDesigner, setShowDesigner] = useState(false)
  const [designerKey, setDesignerKey] = useState(0) // Force re-render when needed
  const [fromNameMissing, setFromNameMissing] = useState(false)
  const [showTemplateVariables, setShowTemplateVariables] = useState(false)
  
  // Import HTML state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importHtmlContent, setImportHtmlContent] = useState('')
  const [importSubject, setImportSubject] = useState('')
  const [importTemplateName, setImportTemplateName] = useState('')
  const [importTemplateDescription, setImportTemplateDescription] = useState('')
  const [importTemplateCategory, setImportTemplateCategory] = useState('general')
  const [importMethod, setImportMethod] = useState<'paste' | 'file'>('paste')

  // Load templates and check configuration on component mount
  useEffect(() => {
    if (whopUserId) {
      loadTemplates()
      checkFromNameConfig()
    }
  }, [whopUserId])

  const checkFromNameConfig = async () => {
    try {
      const result = await getEmailSyncConfig(whopUserId, false)
      if (result.success && result.config) {
        setFromNameMissing(!result.config.from_name || !result.config.from_name.trim())
      }
    } catch (error) {
      console.error('Error checking from_name configuration:', error)
    }
  }

  // Update toEmail when recipientEmail prop changes
  useEffect(() => {
    if (recipientEmail) {
      setToEmail(recipientEmail)
    }
  }, [recipientEmail])

  const loadTemplates = async () => {
    try {
      const result = await getUserEmailTemplates(whopUserId)
      if (result.success && result.templates) {
        setTemplates(result.templates)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplate(templateId)
    
    if (templateId === 'designer') {
      setShowDesigner(true)
      return
    }

    if (templateId === 'custom') {
      setSubject('')
      setHtmlContent('')
      return
    }

    if (templateId === 'import-html') {
      setShowImportDialog(true)
      return
    }

    // Load template content
    try {
      const result = await loadEmailTemplate(templateId)
      if (result.success && result.template) {
        setSubject(result.template.subject || '')
        // Use the stored html_content but ensure it's properly formatted
        setHtmlContent(result.template.html_content || '')
      }
    } catch (error) {
      console.error('Error loading template:', error)
      toast.error('Failed to load template')
    }
  }

  const handleDesignerComplete = (emailData: { subject: string; html: string; text?: string }) => {
    setSubject(emailData.subject)
    setHtmlContent(emailData.html)
    setShowDesigner(false)
    setSelectedTemplate('custom') // Mark as custom since it's from designer
  }

  const handleSendEmail = async () => {
    if (!toEmail.trim()) {
      toast.error('Please enter a recipient email')
      return
    }

    if (!subject.trim()) {
      toast.error('Please enter a subject')
      return
    }

    if (!htmlContent.trim()) {
      toast.error('Please enter email content')
      return
    }

    setIsLoading(true)

    try {
      // Generate HTML with footer
      const htmlWithFooter = await generateHTML(htmlContent)
      console.log('📤 Sending HTML with footer (first 300 chars):', htmlWithFooter.substring(0, 300))
      
      const result = await sendIndividualEmail({
        toEmail,
        subject,
        html: htmlWithFooter,
        fromEmail,
        whopUserId
      })

      if (result.success) {
        toast.success(`Email sent successfully! ID: ${result.emailId}`)
        // Reset form
        setToEmail('')
        setSubject('')
        setHtmlContent('')
        setSelectedTemplate('')
      } else {
        toast.error(result.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    } finally {
      setIsLoading(false)
    }
  }

  // Function to generate custom footer based on company settings
  const generateCustomFooter = (companySettings: any) => {
    if (!companySettings) {
      return `
        <div class="email-footer" style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;">
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} Email Marketing by Whop. All rights reserved.</p>
          <p style="margin: 5px 0;">You received this email because you're a member of our community.</p>
          <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; font-size: 11px; color: #999;">
            <p style="margin: 5px 0;"><a href="#" style="color: #007bff; text-decoration: none;">Unsubscribe</a> | <a href="#" style="color: #007bff; text-decoration: none;">View in browser</a></p>
          </div>
        </div>`
    }

    const linkColor = companySettings?.footer_customization?.footer_style?.linkColor || '#007bff'
    const showCompanyInfo = companySettings?.footer_customization?.footer_content?.showCompanyInfo !== false
    const showUnsubscribeLink = companySettings?.footer_customization?.footer_content?.showUnsubscribeLink !== false
    const showViewInBrowser = companySettings?.footer_customization?.footer_content?.showViewInBrowser !== false
    const showPoweredBy = companySettings?.footer_customization?.footer_content?.showPoweredBy === true
    const customText = companySettings?.footer_customization?.footer_content?.customText || ''

    let footerContent = ''

    // Company information section
    if (showCompanyInfo) {
      footerContent += `<div style="margin-bottom: 15px;">`
      
      if (companySettings.company_name) {
        footerContent += `<p style="margin: 5px 0; font-weight: bold;">${companySettings.company_name}</p>`
      }
      
      if (companySettings.company_address) {
        footerContent += `<p style="margin: 5px 0;">${companySettings.company_address}</p>`
      }
      
      if (companySettings.company_website || companySettings.company_email || companySettings.company_phone) {
        footerContent += `<p style="margin: 5px 0;">`
        if (companySettings.company_website) {
          footerContent += `<a href="${companySettings.company_website}" style="color: ${linkColor}; text-decoration: none;">${companySettings.company_website}</a>`
        }
        if (companySettings.company_website && companySettings.company_email) footerContent += ' | '
        if (companySettings.company_email) {
          footerContent += `<a href="mailto:${companySettings.company_email}" style="color: ${linkColor}; text-decoration: none;">${companySettings.company_email}</a>`
        }
        if (companySettings.company_website || companySettings.company_email) footerContent += ' | '
        if (companySettings.company_phone) {
          footerContent += `<a href="tel:${companySettings.company_phone}" style="color: ${linkColor}; text-decoration: none;">${companySettings.company_phone}</a>`
        }
        footerContent += `</p>`
      }
      
      footerContent += `</div>`
    }

    // Copyright and custom text
    footerContent += `
      <div style="margin-bottom: 15px; font-size: 12px; color: #666;">
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${companySettings?.company_name || 'Email Marketing by Whop'}. All rights reserved.</p>
        <p style="margin: 5px 0;">You received this email because you're a member of our community.</p>`
    
    if (customText) {
      footerContent += `<p style="margin: 5px 0;">${customText}</p>`
    }
    
    footerContent += `</div>`

    // Links section
    const links = []
    if (showUnsubscribeLink) links.push(`<a href="#" style="color: ${linkColor}; text-decoration: none;">Unsubscribe</a>`)
    if (showViewInBrowser) links.push(`<a href="#" style="color: ${linkColor}; text-decoration: none;">View in browser</a>`)
    if (showPoweredBy) links.push(`<a href="https://whop.com" style="color: ${linkColor}; text-decoration: none;">Powered by Email Marketing</a>`)

    if (links.length > 0) {
      footerContent += `
        <div style="border-top: 1px solid ${companySettings?.footer_customization?.footer_style?.borderColor || '#e0e0e0'}; padding-top: 15px; font-size: 11px; color: #999;">
          <p style="margin: 5px 0;">${links.join(' | ')}</p>
        </div>`
    }

    return `<div class="email-footer" style="background: ${companySettings?.footer_customization?.footer_style?.backgroundColor || '#f8f9fa'}; padding: 20px; text-align: center; border-top: 1px solid ${companySettings?.footer_customization?.footer_style?.borderColor || '#e9ecef'}; font-size: 12px; color: ${companySettings?.footer_customization?.footer_style?.textColor || '#6c757d'};">
      ${footerContent}
    </div>`
  }

  // Function to generate HTML email with company settings
  const generateHTML = async (content: string) => {
    console.log('🔧 Generating HTML for enhanced email sender...')
    
    // Get company settings for custom footer
    let companySettings = null
    if (whopUserId) {
      try {
        console.log(`📋 Fetching company settings for user: ${whopUserId}`)
        const response = await fetch(`/api/company-settings?whopUserId=${whopUserId}`)
        const data = await response.json()
        if (data.success) {
          companySettings = data.settings
          console.log('✅ Company settings loaded:', companySettings)
        } else {
          console.log('❌ Failed to load company settings:', data.error)
        }
      } catch (error) {
        console.error('❌ Error fetching company settings:', error)
      }
    }

    // Generate custom footer based on company settings
    const footer = generateCustomFooter(companySettings)
    console.log('📄 Generated footer:', footer)
    
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
        }
        .email-container {
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .email-content {
            padding: 30px;
        }
        @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .email-container { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-content">
            ${content}
        </div>
        ${footer}
    </div>
</body>
</html>`
    
    console.log('📧 Final HTML generated (first 500 chars):', emailHTML.substring(0, 500))
    return emailHTML
  }

  // Import HTML Functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setImportHtmlContent(content)
      }
      reader.readAsText(file)
    }
  }

  const importHtmlTemplate = async () => {
    if (!importHtmlContent.trim() || !importTemplateName.trim() || !whopUserId) {
      return
    }

    try {
      setIsLoading(true)
      
      // Extract subject from HTML if not provided
      let extractedSubject = importSubject
      if (!extractedSubject) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(importHtmlContent, 'text/html')
        const title = doc.querySelector('title')?.textContent || ''
        const metaSubject = doc.querySelector('meta[name="subject"]')?.getAttribute('content') || ''
        extractedSubject = metaSubject || title || 'Imported Email'
      }

      // Save as template
      const { saveEmailTemplate } = await import('@/app/actions/emailsync')
      const result = await saveEmailTemplate(whopUserId, {
        name: importTemplateName,
        description: importTemplateDescription,
        category: importTemplateCategory,
        subject: extractedSubject,
        elements: [], // For enhanced email sender, we'll just save the HTML content
        tags: ['imported', 'html']
      })

      if (result.success) {
        // Load the template content into the form
        setSubject(extractedSubject)
        setHtmlContent(importHtmlContent)
        setSelectedTemplate('custom')
        setShowImportDialog(false)
        
        // Reset import form
        setImportHtmlContent('')
        setImportSubject('')
        setImportTemplateName('')
        setImportTemplateDescription('')
        setImportTemplateCategory('general')
        
        // Refresh templates list
        await loadTemplates()
        
        toast.success('HTML template imported successfully!')
      }
    } catch (error) {
      console.error('Error importing HTML template:', error)
      toast.error('Failed to import HTML template')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Enhanced Email Sender
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fromNameMissing && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">From Name Not Set</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              You need to set a display name in your email configuration before sending emails. 
              This is the name recipients will see as the sender.
            </p>
          </div>
        )}
        
        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose Email</TabsTrigger>
            <TabsTrigger value="designer">Email Designer</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            <div>
              <Label htmlFor="template">Email Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a template or start fresh..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Start Fresh
                    </div>
                  </SelectItem>
                  <SelectItem value="designer">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Use Email Designer
                    </div>
                  </SelectItem>
                  <SelectItem value="import-html">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Import HTML Template
                    </div>
                  </SelectItem>
                  {templates.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {template.name}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="to-email">To Email</Label>
              <Input
                id="to-email"
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="mt-1"
                disabled={!!recipientEmail}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="subject">Subject</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateVariables(!showTemplateVariables)}
                  className="h-6 px-2 text-xs"
                >
                  <HelpCircle className="h-3 w-3 mr-1" />
                  Template Variables
                  {showTemplateVariables ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              </div>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="mt-1"
              />
            </div>

            <Dialog open={showTemplateVariables} onOpenChange={setShowTemplateVariables}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Template Variables
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                                  <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{"{{{FIRST_NAME|Member}}}"}</code>
                    <span className="text-muted-foreground">First name with fallback</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{"{{{LAST_NAME|User}}}"}</code>
                    <span className="text-muted-foreground">Last name with fallback</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{"{{{FIRST_NAME|Member}}} {{{LAST_NAME|User}}}"}</code>
                    <span className="text-muted-foreground">Full name with fallback</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{"{{{EMAIL|user@example.com}}}"}</code>
                    <span className="text-muted-foreground">Email address with fallback</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
                  <strong>How to Use:</strong>
                  <br />
                  Add these variables to your email content (not subject line):
                  <br />
                  <br />
                  <strong>Examples:</strong>
                  <br />
                  • Content: "Hello {'{{{FIRST_NAME|Member}}}'} {'{{{LAST_NAME|User}}}'}, thanks for joining!"
                  <br />
                  • Content: "Your email: {'{{{EMAIL|user@example.com}}}'}"
                  <br />
                  <br />
                  <strong>Note:</strong> Variables work in email content only. Subject lines cannot be personalized in broadcasts.
                </div>
                  <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
                    <strong>Example:</strong> "Hello {'{{first_name}}'}! Welcome to {'{{company_name}}'}!"
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div>
              <Label htmlFor="html-content">Email Content (HTML)</Label>
              <textarea
                id="html-content"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Enter HTML content or use the Email Designer..."
                className="mt-1 w-full min-h-[200px] p-3 border border-input rounded-md resize-y"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <User className="h-3 w-3 mr-1" />
                  From: {fromEmail}
                </Badge>
              </div>
              <Button
                onClick={handleSendEmail}
                disabled={isLoading || fromNameMissing}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>

            {htmlContent && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Email Preview</span>
                </div>
                <div 
                  className="bg-white rounded border p-4 max-h-64 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="designer" className="space-y-4">
            <div className="text-center py-8">
              <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Email Designer</h3>
              <p className="text-muted-foreground mb-4">
                Design your email with our visual editor, then send it individually
              </p>
              <Dialog open={showDesigner} onOpenChange={setShowDesigner}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Open Email Designer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Email Designer</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-hidden">
                    <EmailDesigner
                      key={designerKey}
                      onSend={handleDesignerComplete}
                      initialSubject={subject}
                      whopUserId={whopUserId}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Import HTML Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import HTML Template</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Import Method Selection */}
            <div>
              <Label className="text-sm font-medium">Import Method</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={importMethod === 'paste' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMethod('paste')}
                >
                  Paste HTML
                </Button>
                <Button
                  variant={importMethod === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMethod('file')}
                >
                  Upload File
                </Button>
              </div>
            </div>

            {/* HTML Input */}
            {importMethod === 'paste' ? (
              <div>
                <Label className="text-sm font-medium">HTML Code</Label>
                <textarea
                  value={importHtmlContent}
                  onChange={(e) => setImportHtmlContent(e.target.value)}
                  placeholder="Paste your HTML email code here..."
                  rows={15}
                  className="mt-2 w-full p-3 border border-input rounded-md font-mono text-sm resize-y"
                />
              </div>
            ) : (
              <div>
                <Label className="text-sm font-medium">HTML File</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload an HTML file (max 1MB)
                  </p>
                </div>
              </div>
            )}

            {/* Template Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Template Name</Label>
                <Input
                  value={importTemplateName}
                  onChange={(e) => setImportTemplateName(e.target.value)}
                  placeholder="Enter template name..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Subject Line</Label>
                <Input
                  value={importSubject}
                  onChange={(e) => setImportSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Input
                  value={importTemplateDescription}
                  onChange={(e) => setImportTemplateDescription(e.target.value)}
                  placeholder="Enter template description..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <Select value={importTemplateCategory} onValueChange={setImportTemplateCategory}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            {importHtmlContent && (
              <div>
                <Label className="text-sm font-medium">Preview</Label>
                <div className="mt-2 border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ __html: importHtmlContent }}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={importHtmlTemplate} 
              disabled={isLoading || !importHtmlContent.trim() || !importTemplateName.trim()}
            >
              {isLoading ? 'Importing...' : 'Import Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 