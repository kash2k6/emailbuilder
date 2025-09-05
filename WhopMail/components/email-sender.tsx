"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Send, Mail, Users, AlertTriangle, Clock, Calendar, HelpCircle, ChevronDown, ChevronUp } from "lucide-react"
import { sendEmailCampaignToWhopMembers } from "@/app/actions/resend"
import { fetchAllWhopMembers } from "@/app/actions"
import { getEmailSyncConfig } from "@/app/actions/emailsync"
import type { WhopMembership } from "@/app/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface EmailSenderProps {
  audienceId: string
  memberCount: number
  fromEmail: string
  domain: string
  whopUserId: string
  whopApiKey: string
}

export function EmailSender({ audienceId, memberCount, fromEmail, domain, whopUserId, whopApiKey }: EmailSenderProps) {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [planInfo, setPlanInfo] = useState<{ name: string; contactLimit: number; currentUsage?: number } | null>(null)
  const [fromNameMissing, setFromNameMissing] = useState(false)
  const [showTemplateVariables, setShowTemplateVariables] = useState(false)
  
  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [scheduleType, setScheduleType] = useState<"immediate" | "custom" | "preset">("immediate")
  const [presetSchedule, setPresetSchedule] = useState<string>("")

  // Load plan information and check configuration on component mount
  useEffect(() => {
    const loadPlanInfo = async () => {
      try {
        const { checkEmailPlanLimit } = await import('@/app/actions/emailsync')
        const planCheck = await checkEmailPlanLimit(whopUserId, memberCount)
        if (planCheck.planDetails) {
          setPlanInfo(planCheck.planDetails)
        }
      } catch (error) {
        console.error('Error loading plan info:', error)
      }
    }
    
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
    
    loadPlanInfo()
    checkFromNameConfig()
  }, [whopUserId, memberCount])

  // Set default date and time for scheduling
  useEffect(() => {
    if (isScheduled && !scheduledDate) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setScheduledDate(tomorrow.toISOString().split('T')[0])
      setScheduledTime("09:00")
    }
  }, [isScheduled, scheduledDate])

  // Helper function to format scheduled time for Resend
  const formatScheduledTime = (): string | undefined => {
    if (!isScheduled) return undefined
    
    if (scheduleType === "preset" && presetSchedule) {
      return presetSchedule
    }
    
    if (scheduleType === "custom" && scheduledDate && scheduledTime) {
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      return dateTime.toISOString()
    }
    
    return undefined
  }

  // Function to generate custom footer based on company settings
  const generateCustomFooter = (companySettings: any) => {
    const linkColor = companySettings?.footer_customization?.footer_style?.linkColor || '#007bff'
    const showCompanyInfo = companySettings?.footer_customization?.footer_content?.showCompanyInfo ?? true
    const showUnsubscribeLink = companySettings?.footer_customization?.footer_content?.showUnsubscribeLink ?? true
    const showViewInBrowser = companySettings?.footer_customization?.footer_content?.showViewInBrowser ?? true
    const showPoweredBy = companySettings?.footer_customization?.footer_content?.showPoweredBy ?? false
    const customText = companySettings?.footer_customization?.footer_content?.customText || ''

    let footerContent = ''

    // Company information section
    if (showCompanyInfo && companySettings?.company_name) {
      footerContent += `
        <div style="margin-bottom: 15px;">
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #333;">${companySettings.company_name}</p>`
      
      if (companySettings.company_address) {
        footerContent += `<p style="margin: 5px 0; font-size: 12px; color: #666;">${companySettings.company_address}</p>`
      }
      
      if (companySettings.company_website || companySettings.company_email || companySettings.company_phone) {
        footerContent += `<p style="margin: 5px 0; font-size: 12px; color: #666;">`
        if (companySettings.company_website) {
          footerContent += `<a href="${companySettings.company_website}" style="color: ${linkColor}; text-decoration: none;">${companySettings.company_website}</a>`
        }
        if (companySettings.company_email) {
          if (companySettings.company_website) footerContent += ' | '
          footerContent += `<a href="mailto:${companySettings.company_email}" style="color: ${linkColor}; text-decoration: none;">${companySettings.company_email}</a>`
        }
        if (companySettings.company_phone) {
          if (companySettings.company_website || companySettings.company_email) footerContent += ' | '
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

    return `<div class="email-footer">${footerContent}</div>`
  }

  // Function to generate HTML email with company settings
  const generateHTML = async (message: string) => {
    console.log('🔧 Generating HTML for individual email...')
    
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
    
    // Convert message to HTML (simple conversion)
    const htmlContent = message.replace(/\n/g, '<br>')
    
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
        .email-header {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid #e9ecef;
        }
        .email-content {
            padding: 30px;
        }
        .email-footer {
            background: ${companySettings?.footer_customization?.footer_style?.backgroundColor || '#f8f9fa'};
            padding: 20px;
            text-align: center;
            border-top: 1px solid ${companySettings?.footer_customization?.footer_style?.borderColor || '#e9ecef'};
            font-size: 12px;
            color: ${companySettings?.footer_customization?.footer_style?.textColor || '#6c757d'};
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
            ${htmlContent}
        </div>
        ${footer}
    </div>
</body>
</html>`
    
    console.log('📧 Final HTML generated (first 500 chars):', emailHTML.substring(0, 500))
    return emailHTML
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subject.trim()) {
      setError("Please enter a subject")
      return
    }

    if (!message.trim()) {
      setError("Please enter a message")
      return
    }

    setIsSending(true)
    setError(null)
    setSuccess(null)

    try {
      // Fetch all Whop members first
      const membersResult = await fetchAllWhopMembers(whopApiKey)
      
      if (!membersResult.success || !membersResult.members) {
        setError("Failed to fetch Whop members")
        return
      }
      
      const members = membersResult.members.filter((member: WhopMembership) => member.email)
      
      if (members.length === 0) {
        setError("No members with email addresses found")
        return
      }
      
      console.log(`Sending email to ${members.length} Whop members`)
      
      // Check plan limits before sending
      const { checkEmailPlanLimit } = await import('@/app/actions/emailsync')
      const planCheck = await checkEmailPlanLimit(whopUserId, members.length)
      
      if (!planCheck.canSend) {
        setError(planCheck.error || 'Plan limit exceeded')
        return
      }
      
      // Generate HTML with company settings
      const htmlContent = await generateHTML(message)
      console.log('📤 Sending HTML content (first 300 chars):', htmlContent.substring(0, 300))
      
      const result = await sendEmailCampaignToWhopMembers(
        process.env.RESEND_API_KEY || "",
        fromEmail,
        subject,
        htmlContent,
        message, // Plain text version
        members,
        whopUserId, // Pass whopUserId for analytics tracking
        formatScheduledTime() // Pass scheduled time if applicable
      )

      if (result.success) {
        setSuccess(`Email campaign sent successfully! Sent to ${result.sentCount} members.`)
        setSubject("")
        setMessage("")
      } else {
        setError(result.error || "Failed to send email campaign")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred while sending email")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-6 w-6" />
          Send Email to Your Members
        </CardTitle>
        <CardDescription>
          Send an email to all {memberCount} members in your list: <strong>{audienceId}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {fromNameMissing && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
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
        
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateVariables(!showTemplateVariables)}
                className="h-6 px-2 text-xs"
                disabled={isSending}
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
              disabled={isSending}
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
                  <br />
                  <strong>Note:</strong> Variables are automatically converted to Resend merge tags for personalization using contact data.
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your email message..."
              rows={8}
              disabled={isSending}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span>This email will be sent to {memberCount} members</span>
            </div>
            <div className="text-sm mt-1">
              <span><strong>From:</strong> {fromEmail}</span>
            </div>
            
            {/* Plan Limit Information */}
            {planInfo && (
              <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Plan Limit Check</span>
                </div>
                <div className="text-xs text-orange-700 mt-1">
                  <div><strong>Plan:</strong> {planInfo.name}</div>
                  <div><strong>Contact Limit:</strong> {planInfo.contactLimit.toLocaleString()}</div>
                  {planInfo.currentUsage !== undefined && (
                    <div><strong>Current Usage:</strong> {planInfo.currentUsage.toLocaleString()}</div>
                  )}
                  <div><strong>This Campaign:</strong> {memberCount.toLocaleString()} contacts</div>
                </div>
                {memberCount > planInfo.contactLimit && (
                  <div className="text-xs text-red-600 mt-1 font-medium">
                    ⚠️ Exceeds plan limit! Please upgrade your plan.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scheduling Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Label className="text-sm font-medium">Schedule Email</Label>
              </div>
              <Switch
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
                disabled={isSending}
              />
            </div>

            {isScheduled && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Select
                    value={scheduleType}
                    onValueChange={(value: "immediate" | "custom" | "preset") => setScheduleType(value)}
                    disabled={isSending}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Send Now</SelectItem>
                      <SelectItem value="preset">Preset</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>

                  {scheduleType === "preset" && (
                    <Select
                      value={presetSchedule}
                      onValueChange={setPresetSchedule}
                      disabled={isSending}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in 1 hour">In 1 hour</SelectItem>
                        <SelectItem value="in 2 hours">In 2 hours</SelectItem>
                        <SelectItem value="in 4 hours">In 4 hours</SelectItem>
                        <SelectItem value="in 6 hours">In 6 hours</SelectItem>
                        <SelectItem value="in 12 hours">In 12 hours</SelectItem>
                        <SelectItem value="tomorrow at 9am">Tomorrow at 9am</SelectItem>
                        <SelectItem value="tomorrow at 2pm">Tomorrow at 2pm</SelectItem>
                        <SelectItem value="next monday at 9am">Next Monday at 9am</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {scheduleType === "custom" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        disabled={isSending}
                        className="w-40"
                      />
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        disabled={isSending}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>

                {scheduleType !== "immediate" && (
                  <div className="text-xs text-muted-foreground">
                    {scheduleType === "preset" && presetSchedule && (
                      <span>Email will be sent: {presetSchedule}</span>
                    )}
                    {scheduleType === "custom" && scheduledDate && scheduledTime && (
                      <span>Email will be sent: {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSending || !subject.trim() || !message.trim() || fromNameMissing}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isScheduled ? "Scheduling..." : "Sending..."}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {isScheduled ? "Schedule Email" : "Send Email"}
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Emails are sent from your configured email address</p>
            <p>• You can track delivery and engagement in your dashboard</p>
            <p>• Unsubscribed members will not receive emails</p>
            {fromNameMissing && (
              <p className="text-yellow-600">• Set a display name in your email configuration to enable sending</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 