"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  Loader2, 
  CheckCircle, 
  Mail, 
  Globe, 
  Settings, 
  Users, 
  Send, 
  ExternalLink, 
  Shield, 
  Info, 
  Building2
} from "lucide-react"
import { AlertCircle } from "lucide-react"
import { saveEmailSyncConfig, saveWhopmailConfig, checkWhopmailUsernameAvailability, updateFromName, clearEmailSyncConfig } from "@/app/actions/emailsync"
import { addDomainToResend } from '@/app/actions/resend'

interface EmailSetupFormProps {
  onSuccess: (domain: string, emailType: 'whopmail' | 'custom') => void
  whopUserId: string
  existingConfig?: {
    id?: string
    email_type: 'whopmail' | 'custom'
    username?: string
    from_name?: string
    from_email?: string
    custom_domain?: string
    domain_id?: string
    platform_type?: string
    is_active?: boolean
  } | null
  isEditMode?: boolean
  onConfigCleared?: () => void
}

interface CompanySettings {
  company_name?: string
  company_address?: string
  company_website?: string
  company_phone?: string
  company_email?: string
  company_logo_url?: string
}

export function EmailSetupForm({ onSuccess, whopUserId, existingConfig, isEditMode = false, onConfigCleared }: EmailSetupFormProps) {
  const [emailType, setEmailType] = useState<'whopmail' | 'custom'>(existingConfig?.email_type || 'whopmail')
  const [customDomain, setCustomDomain] = useState(existingConfig?.custom_domain || "")
  const [whopmailUsername, setWhopmailUsername] = useState(existingConfig?.username || "")
  const [fromName, setFromName] = useState(existingConfig?.from_name || "")
  const [fromEmail, setFromEmail] = useState(existingConfig?.from_email || "")
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [loadingCompanySettings, setLoadingCompanySettings] = useState(true)

  // Update emailType and fromEmail when existingConfig changes
  useEffect(() => {
    if (existingConfig?.email_type) {
      setEmailType(existingConfig.email_type)
    }
    if (existingConfig?.from_email) {
      setFromEmail(existingConfig.from_email)
    }
  }, [existingConfig])

  // Fetch company settings on component mount
  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await fetch(`/api/company-settings?whopUserId=${whopUserId}`)
        const data = await response.json()
        if (data.success && data.settings) {
          setCompanySettings(data.settings)
          // Pre-fill fromName with company name if available
          if (data.settings.company_name && !fromName) {
            setFromName(data.settings.company_name)
          }
        }
      } catch (error) {
        console.error('Error fetching company settings:', error)
      } finally {
        setLoadingCompanySettings(false)
      }
    }

    fetchCompanySettings()
  }, [whopUserId, fromName])

  const handleUsernameCheck = async (username: string) => {
    if (!username.trim()) {
      setUsernameAvailable(null)
      return
    }
    
    setCheckingUsername(true)
    try {
      const result = await checkWhopmailUsernameAvailability(username)
      setUsernameAvailable(result.available)
    } catch (error) {
      console.error('Error checking username:', error)
      setUsernameAvailable(null)
    } finally {
      setCheckingUsername(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)
    setError(null)

    // If we have an existing config and from_name or from_email changed, use updateFromName
    if (existingConfig && 
        (fromName !== existingConfig.from_name || fromEmail !== existingConfig.from_email) &&
        emailType === existingConfig.email_type && 
        (emailType === 'whopmail' ? whopmailUsername === existingConfig.username : true)) {
      try {
        const result = await updateFromName(whopUserId, fromName, fromEmail)
        if (!result.success) {
          setError(result.error || 'Failed to update configuration')
          setIsValidating(false)
          return
        }
        // Success - refresh the page or show success message
        window.location.reload()
        return
      } catch (error) {
        console.error('Error updating configuration:', error)
        setError('Failed to update configuration')
        setIsValidating(false)
        return
      }
    }

    if (emailType === 'whopmail') {
      if (!whopmailUsername.trim()) {
        setError("Please enter a username for your whopmail.com address")
        setIsValidating(false)
        return
      }

      try {
        const result = await saveWhopmailConfig(whopUserId, whopmailUsername, fromName, fromEmail)
        if (!result.success) {
          setError(result.error || 'Failed to save whopmail configuration')
          setIsValidating(false)
          return
        }
        
        onSuccess('whopmail.com', 'whopmail')
      } catch (error) {
        console.error('Error in whopmail setup:', error)
        setError(error instanceof Error ? error.message : "An error occurred during setup")
      } finally {
        setIsValidating(false)
      }
    } else {
      if (!customDomain.trim()) {
        setError("Please enter your domain")
        setIsValidating(false)
        return
      }

      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
      if (!domainRegex.test(customDomain)) {
        setError("Please enter a valid domain (e.g., mycompany.com)")
        setIsValidating(false)
        return
      }

      try {
        console.log('Adding domain to Resend:', customDomain)
        
        // First, add domain to Resend
        const addResult = await addDomainToResend(customDomain)
        if (!addResult.success) {
          setError(addResult.error || 'Failed to add domain to Resend')
          setIsValidating(false)
          return
        }

        console.log('Domain added to Resend with ID:', addResult.domainId)

        // Then save to Supabase with the domain ID
        const saveResult = await saveEmailSyncConfig(whopUserId, customDomain, addResult.domainId, fromName)
        if (!saveResult.success) {
          setError(saveResult.error || 'Failed to save domain configuration')
          setIsValidating(false)
          return
        }

        console.log('Domain configuration saved to Supabase')
        onSuccess(customDomain, 'custom')
      } catch (error) {
        console.error('Error in domain setup:', error)
        setError(error instanceof Error ? error.message : "An error occurred during setup")
      } finally {
        setIsValidating(false)
      }
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Email Marketing Setup Guide
          </CardTitle>
          <CardDescription>
            Follow these steps to set up your email system and start sending emails to your Whop members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step-1">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-semibold">
                    1
                  </div>
                  <div>
                    <div className="font-semibold">Choose Your Email Domain</div>
                    <div className="text-sm text-muted-foreground">Select between whopmail.com or your custom domain</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Domain Options:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-orange-800">whopmail.com</h5>
                        <p className="text-sm text-orange-700">Use our pre-verified domain for quick setup. Choose your username and start sending emails right away.</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-orange-700 mt-1">
                          <li>Quick setup - no domain verification needed</li>
                          <li>Professional appearance with your username</li>
                          <li>Managed by our team for optimal deliverability</li>
                          <li>Good for testing or quick deployment</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-green-800">Custom Domain (Recommended)</h5>
                        <p className="text-sm text-green-700">Use your own domain for complete brand control and professional appearance.</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-green-700 mt-1">
                          <li>Full brand control with your domain</li>
                          <li>Professional appearance for your business</li>
                          <li>Maintains your brand image and trust</li>
                          <li>Best for established businesses and brand building</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Once you choose whopmail.com, your username cannot be changed. Contact support if you need to modify it.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-2">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full font-semibold">
                    2
                  </div>
                  <div>
                    <div className="font-semibold">Verify Your Domain</div>
                    <div className="text-sm text-muted-foreground">Add DNS records to prove domain ownership</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">DNS Verification Process:</h4>
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium">1. Get DNS Records</h5>
                      <p className="text-sm text-muted-foreground">After adding your domain, you'll see specific DNS records to add</p>
                    </div>
                    <div>
                      <h5 className="font-medium">2. Add to Your Domain Provider</h5>
                      <p className="text-sm text-muted-foreground">Log into your domain provider (GoDaddy, Namecheap, Cloudflare, etc.) and add the provided DNS records</p>
                    </div>
                    <div>
                      <h5 className="font-medium">3. Wait for Propagation</h5>
                      <p className="text-sm text-muted-foreground">DNS changes can take up to 48 hours to propagate globally</p>
                    </div>
                    <div>
                      <h5 className="font-medium">4. Verify</h5>
                      <p className="text-sm text-muted-foreground">Click "Verify Domain" to confirm the DNS records are working</p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <h4 className="font-semibold mb-2">Common Domain Providers:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• GoDaddy</div>
                    <div>• Namecheap</div>
                    <div>• Cloudflare</div>
                    <div>• Google Domains</div>
                    <div>• AWS Route 53</div>
                    <div>• Name.com</div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-3">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-semibold">
                    3
                  </div>
                  <div>
                    <div className="font-semibold">Sync Your Whop Members</div>
                    <div className="text-sm text-muted-foreground">Import all your Whop members as email contacts</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Member Sync Process:</h4>
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium">1. Automatic Import</h5>
                      <p className="text-sm text-muted-foreground">All your Whop members will be automatically imported with their email addresses</p>
                    </div>
                    <div>
                      <h5 className="font-medium">2. Member Data</h5>
                      <p className="text-sm text-muted-foreground">Each member's email, name, and subscription status will be synced</p>
                    </div>
                    <div>
                      <h5 className="font-medium">3. Audience Creation</h5>
                      <p className="text-sm text-muted-foreground">Members are organized into audiences based on their subscription plans</p>
                    </div>
                    <div>
                      <h5 className="font-medium">4. Real-time Updates</h5>
                      <p className="text-sm text-muted-foreground">New members are automatically added, and cancelled members are removed</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Privacy:</strong> Only members who have agreed to receive emails will be included in your audience.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-4">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-semibold">
                    4
                  </div>
                  <div>
                    <div className="font-semibold">Send Emails</div>
                    <div className="text-sm text-muted-foreground">Create and send mass emails or individual messages</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Email Sending Options:</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium">📧 Mass Emails</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Send to all members or specific audiences</li>
                        <li>Use our email designer with templates</li>
                        <li>Track open rates and click-through rates</li>
                        <li>Schedule emails for later delivery</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium">💬 Individual Emails</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Send personalized messages to specific members</li>
                        <li>Use member data for personalization</li>
                        <li>Track individual email engagement</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium">📊 Analytics</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>View delivery rates and bounces</li>
                        <li>Track opens, clicks, and unsubscribes</li>
                        <li>Monitor spam complaints</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <h4 className="font-semibold mb-2">Best Practices:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Send emails at optimal times for your audience</li>
                    <li>Use engaging subject lines</li>
                    <li>Include clear call-to-action buttons</li>
                    <li>Test emails before sending to large audiences</li>
                    <li>Respect unsubscribe requests</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Domain Setup Form */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditMode ? <Settings className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
            {isEditMode ? 'Update Email Configuration' : 'Step 1: Choose Your Email Domain'}
          </CardTitle>
          <CardDescription>
            {isEditMode 
              ? 'Update your email display name and review your current configuration'
              : 'Select between whopmail.com (quick setup) or your custom domain for better brand image'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Simple Edit From Name Form - when in edit mode */}
            {isEditMode && existingConfig ? (
              <div className="space-y-6">
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2">Current Configuration</h4>
                  <div className="text-sm text-orange-700 space-y-1">
                    <p><strong>Email Type:</strong> {existingConfig.email_type}</p>
                    {existingConfig.email_type === 'whopmail' && (
                      <p><strong>Username:</strong> {existingConfig.username}@whopmail.com</p>
                    )}
                    {existingConfig.email_type === 'custom' && (
                      <p><strong>Domain:</strong> {existingConfig.custom_domain}</p>
                    )}
                    <p><strong>Current From Name:</strong> {existingConfig.from_name}</p>
                    <p><strong>Current From Email:</strong> {existingConfig.from_email}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFromName" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Update From Name *
                    </Label>
                    <Input
                      id="editFromName"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Your Name or Company Name"
                      disabled={isValidating}
                      className={!fromName.trim() ? "border-red-500" : ""}
                    />
                    {!fromName.trim() && (
                      <p className="text-xs text-red-600">
                        From Name is required to send emails. This is the name recipients will see as the sender.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This is the name recipients will see as the sender. You can update it here.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editFromEmail" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Update From Email
                    </Label>
                    <Input
                      id="editFromEmail"
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="your-email@domain.com"
                      disabled={isValidating}
                    />
                    <p className="text-xs text-muted-foreground">
                      This is the email address that will appear as the sender. You can customize it here.
                    </p>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isValidating || !fromName.trim() || !fromEmail.trim() || 
                             (fromName === existingConfig.from_name && fromEmail === existingConfig.from_email)}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Update Configuration
                      </>
                    )}
                  </Button>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Only the display name can be updated - other settings are locked</p>
                    <p>• Your email configuration will remain active during updates</p>
                    <p>• Changes take effect immediately for new emails</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Current Configuration Display */}
                {existingConfig && existingConfig.email_type && existingConfig.from_email && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-semibold text-orange-800 mb-2">Current Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Domain Type:</span>
                        <span className="text-orange-700">
                          {existingConfig.email_type === 'whopmail' ? 'whopmail.com' : 'Custom Domain'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Email Address:</span>
                        <span className="text-orange-700 font-mono">{existingConfig.from_email}</span>
                      </div>
                      {existingConfig.email_type === 'whopmail' && existingConfig.username && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Username:</span>
                          <span className="text-orange-700">{existingConfig.username}@whopmail.com</span>
                        </div>
                      )}
                      {existingConfig.email_type === 'custom' && existingConfig.custom_domain && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Custom Domain:</span>
                          <span className="text-orange-700">{existingConfig.custom_domain}</span>
                        </div>
                      )}
                    </div>
                    
                                         {/* Switch Domain Button */}
                     <div className="mt-4 pt-4 border-t border-orange-200">
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={async () => {
                           try {
                             setIsValidating(true)
                             setError(null)
                             
                             // Clear the existing configuration
                             const result = await clearEmailSyncConfig(whopUserId)
                             if (!result.success) {
                               setError(result.error || 'Failed to clear configuration')
                               return
                             }
                             
                             // Reset form to allow domain switching
                             setEmailType('whopmail')
                             setCustomDomain('')
                             setWhopmailUsername('')
                             setFromName('')
                             setFromEmail('')
                             
                             // Clear error state
                             setError(null)
                             
                             // Notify parent component that config was cleared
                             if (onConfigCleared) {
                               onConfigCleared()
                             }
                           } catch (error) {
                             console.error('Error switching domain:', error)
                             setError('Failed to switch domain. Please try again.')
                           } finally {
                             setIsValidating(false)
                           }
                         }}
                         disabled={isValidating}
                         className="text-orange-700 border-orange-300 hover:bg-orange-100"
                       >
                         {isValidating ? (
                           <>
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             Switching...
                           </>
                         ) : (
                           'Switch Domain Type'
                         )}
                       </Button>
                       <p className="text-xs text-orange-600 mt-2">
                         Need to change your domain? Click above to switch between whopmail.com and custom domain.
                       </p>
                     </div>
                  </div>
                )}

                {/* Domain Type Selection - show if no existing config or if config is cleared */}
                {(!existingConfig || !existingConfig.username || !existingConfig.custom_domain || (existingConfig.from_email === 'noreply@example.com' || !existingConfig.from_email) || !existingConfig.domain_id || !existingConfig.is_active) && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Domain Type</Label>
                    <RadioGroup 
                      value={emailType} 
                      onValueChange={(value) => setEmailType(value as 'whopmail' | 'custom')}
                    >
                      <div className="grid gap-3">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="whopmail" id="whopmail" />
                          <div className="flex-1">
                            <Label htmlFor="whopmail" className="font-medium cursor-pointer">whopmail.com</Label>
                            <p className="text-sm text-muted-foreground">Quick setup with our pre-verified domain</p>
                          </div>
                          <Shield className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="custom" id="custom" />
                          <div className="flex-1">
                            <Label htmlFor="custom" className="font-medium cursor-pointer">Custom Domain (Recommended)</Label>
                            <p className="text-sm text-muted-foreground">Maintain your brand image with your own domain</p>
                          </div>
                          <Globe className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* From Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="fromName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    From Name (Display Name) *
                  </Label>
                  <Input
                    id="fromName"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Your Name or Company Name"
                    disabled={isValidating}
                    className={!fromName.trim() ? "border-red-500" : ""}
                  />
                  {!fromName.trim() && (
                    <p className="text-xs text-red-600">
                      From Name is required to send emails. This is the name recipients will see as the sender.
                    </p>
                  )}
                  {companySettings?.company_name ? (
                    <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-md">
                      <Info className="h-3 w-3" />
                      <span>
                        <strong>Auto-filled from Company Settings:</strong> "{companySettings.company_name}"
                      </span>
                    </div>
                  ) : loadingCompanySettings ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading company settings...
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isEditMode 
                        ? 'This is the name recipients will see as the sender. You can update it here.'
                        : 'This is the name recipients will see as the sender. Set your company name in the Company tab to auto-fill this field.'
                      }
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This is the name recipients will see as the sender (e.g., "John Doe" instead of just "john@domain.com")
                  </p>
                </div>

                {/* Domain-specific fields - only show if not in edit mode or if creating new config */}
                {!isEditMode && emailType === 'whopmail' ? (
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    {existingConfig?.username ? (
                      // Show existing username as read-only
                      <div className="flex gap-2">
                        <Input
                          id="username"
                          value={existingConfig.username}
                          disabled={true}
                          className="flex-1 bg-muted"
                        />
                        <div className="flex items-center px-3 bg-muted text-muted-foreground border rounded-r-md">
                          @whopmail.com
                        </div>
                      </div>
                    ) : (
                      // Allow new username input
                      <div className="flex gap-2">
                        <Input
                          id="username"
                          value={whopmailUsername}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                            setWhopmailUsername(value)
                            if (value.length >= 2) {
                              handleUsernameCheck(value)
                            } else {
                              setUsernameAvailable(null)
                            }
                          }}
                          placeholder="yourname"
                          disabled={isValidating}
                          className="flex-1"
                        />
                        <div className="flex items-center px-3 bg-muted text-muted-foreground border rounded-r-md">
                          @whopmail.com
                        </div>
                      </div>
                    )}
                    {!existingConfig?.username && (
                      <>
                        <div className="flex items-center gap-2 text-xs">
                          {checkingUsername ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : usernameAvailable === true ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : usernameAvailable === false ? (
                            <AlertCircle className="h-3 w-3 text-red-600" />
                          ) : null}
                          {checkingUsername && <span className="text-muted-foreground">Checking availability...</span>}
                          {usernameAvailable === true && <span className="text-green-600">Username available!</span>}
                          {usernameAvailable === false && <span className="text-red-600">Username already taken</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Choose a username 2-32 characters long. Only letters, numbers, and hyphens allowed. Cannot start or end with hyphen.
                        </p>
                      </>
                    )}
                    {existingConfig?.username && (
                      <p className="text-xs text-amber-600 font-medium">
                        Username cannot be changed once set. Only administrators can modify it. Contact support if you need to change it.
                      </p>
                    )}
                  </div>
                ) : isEditMode && existingConfig?.email_type === 'whopmail' ? (
                  <div className="space-y-2">
                    <Label>Current Username</Label>
                    <div className="flex gap-2">
                      <Input
                        value={existingConfig.username || ''}
                        disabled={true}
                        className="flex-1 bg-muted"
                      />
                      <div className="flex items-center px-3 bg-muted text-muted-foreground border rounded-r-md">
                        @whopmail.com
                      </div>
                    </div>
                    <p className="text-xs text-amber-600 font-medium">
                      Username cannot be changed once set. Contact support if you need to change it.
                    </p>
                  </div>
                ) : !isEditMode && emailType === 'custom' ? (
                  <div className="space-y-2">
                    <Label htmlFor="domain">Your Domain</Label>
                    <Input
                      id="domain"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                      placeholder="mycompany.com"
                      disabled={isValidating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your domain without http:// or www. You'll need to verify this domain before sending emails.
                    </p>
                  </div>
                ) : isEditMode && existingConfig?.email_type === 'custom' ? (
                  <div className="space-y-2">
                    <Label>Current Domain</Label>
                    <Input
                      value={existingConfig.custom_domain || ''}
                      disabled={true}
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Domain cannot be changed in edit mode. Contact support if you need to change it.
                    </p>
                  </div>
                                ) : null}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isValidating || 
                    (isEditMode ? false : emailType === 'whopmail' ? !whopmailUsername.trim() || usernameAvailable === false : !customDomain.trim()) ||
                    !fromName.trim() // Require from_name to be set
                  }
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Setting up email...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {isEditMode 
                        ? 'Update From Name' 
                        : emailType === 'whopmail' ? 'Setup whopmail.com & Continue' : 'Add Domain & Continue'
                      }
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  {isEditMode ? (
                    <>
                      <p>• Only the display name can be updated - other settings are locked</p>
                      <p>• Your email configuration will remain active during updates</p>
                      <p>• Changes take effect immediately for new emails</p>
                    </>
                  ) : emailType === 'whopmail' ? (
                    <>
                      <p>• Your username cannot be changed once set - contact support if needed</p>
                      <p>• No domain verification required - start sending immediately</p>
                      <p>• Professional appearance with your custom username</p>
                    </>
                  ) : (
                    <>
                      <p>• You'll need to verify your domain before sending emails</p>
                      <p>• All emails are sent through our secure email infrastructure</p>
                      <p>• You can add multiple domains to your account</p>
                    </>
                  )}
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 