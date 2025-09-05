"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { sendIndividualEmail, getEmailSyncConfig } from '@/app/actions/emailsync'
import { toast } from 'sonner'
import { Send, Mail, User, MessageSquare, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface QuickEmailSenderProps {
  whopUserId: string
  fromEmail: string
}

const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to our community!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">Welcome to Our Community!</h1>
        <p style="color: #666; line-height: 1.6;">
          Hi there! 👋
        </p>
        <p style="color: #666; line-height: 1.6;">
          Thank you for joining our community. We're excited to have you on board!
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p style="color: #666; line-height: 1.6;">
          If you have any questions, feel free to reach out to our support team.
        </p>
        <p style="color: #666; line-height: 1.6;">
          Best regards,<br>
          The Team
        </p>
      </div>
    `
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    subject: 'This Week\'s Newsletter',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">This Week's Newsletter</h1>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">📰 Latest Updates</h2>
          <ul style="color: #666; line-height: 1.6;">
            <li>New features released</li>
            <li>Community highlights</li>
            <li>Upcoming events</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Read More
          </a>
        </div>
        <p style="color: #666; line-height: 1.6; text-align: center;">
          Thanks for being part of our community!
        </p>
      </div>
    `
  },
  {
    id: 'promotion',
    name: 'Special Promotion',
    subject: 'Special Offer Just for You!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; text-align: center;">🎉 Special Offer!</h1>
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #856404; margin-top: 0; text-align: center;">50% OFF</h2>
          <p style="color: #856404; text-align: center; font-size: 18px;">
            Limited time offer - Don't miss out!
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Claim Offer Now
          </a>
        </div>
        <p style="color: #666; line-height: 1.6; text-align: center;">
          This offer expires in 24 hours!
        </p>
      </div>
    `
  },
  {
    id: 'custom',
    name: 'Custom Email',
    subject: '',
    html: ''
  }
]

export function QuickEmailSender({ whopUserId, fromEmail }: QuickEmailSenderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome')
  const [toEmail, setToEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fromNameMissing, setFromNameMissing] = useState(false)
  const [showTemplateVariables, setShowTemplateVariables] = useState(false)

  // Check from_name configuration on component mount
  useEffect(() => {
    if (whopUserId) {
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
    console.log('🔧 Generating HTML for quick email sender...')
    
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

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setSubject(template.subject)
      setHtmlContent(template.html)
    }
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
      const emailHTML = await generateHTML(htmlContent)
      const result = await sendIndividualEmail({
        toEmail,
        subject,
        html: emailHTML,
        fromEmail,
        whopUserId
      })

      if (result.success) {
        toast.success(`Email sent successfully! ID: ${result.emailId}`)
        // Reset form
        setToEmail('')
        setSubject('')
        setHtmlContent('')
        setSelectedTemplate('welcome')
        handleTemplateChange('welcome')
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Quick Email Sender
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
        
        <div>
          <Label htmlFor="template">Email Template</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
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
          <Textarea
            id="html-content"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="Enter HTML content..."
            className="mt-1"
            rows={10}
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

        {selectedTemplate !== 'custom' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Template Preview</span>
            </div>
            <div 
              className="bg-white rounded border p-4 max-h-64 overflow-auto"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
} 