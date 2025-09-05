"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, CheckCircle, Mail, Globe, Shield, Info, AlertCircle } from "lucide-react"
import { saveWhopmailConfig, checkWhopmailUsernameAvailability } from "@/app/actions/emailsync"

interface EmailDomainSelectorProps {
  onSuccess: (domain: string, emailType: 'whopmail' | 'custom') => void
  whopUserId: string
}

export function EmailDomainSelector({ onSuccess, whopUserId }: EmailDomainSelectorProps) {
  const [emailType, setEmailType] = useState<'whopmail' | 'custom'>('whopmail')
  const [whopmailUsername, setWhopmailUsername] = useState("")
  const [fromName, setFromName] = useState("")
  const [customDomain, setCustomDomain] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)

  // Check username availability when username changes
  useEffect(() => {
    if (whopmailUsername.length >= 2 && emailType === 'whopmail') {
      const checkUsername = async () => {
        setIsCheckingUsername(true)
        const result = await checkWhopmailUsernameAvailability(whopmailUsername, whopUserId)
        if (result.success) {
          setUsernameAvailable(result.available)
        }
        setIsCheckingUsername(false)
      }
      
      const timeoutId = setTimeout(checkUsername, 500) // Debounce
      return () => clearTimeout(timeoutId)
    } else {
      setUsernameAvailable(null)
    }
  }, [whopmailUsername, emailType, whopUserId])

  const handleWhopmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)
    setError(null)

    if (!whopmailUsername.trim()) {
      setError("Please enter a username")
      setIsValidating(false)
      return
    }

    if (usernameAvailable === false) {
      setError("Username is already taken. Please choose a different username.")
      setIsValidating(false)
      return
    }

    try {
      const result = await saveWhopmailConfig(whopUserId, whopmailUsername, fromName || undefined)
      if (!result.success) {
        setError(result.error || 'Failed to save whopmail configuration')
        setIsValidating(false)
        return
      }

      console.log('Whopmail configuration saved successfully')
      onSuccess('whopmail.com', 'whopmail')
    } catch (error) {
      console.error('Error in whopmail setup:', error)
      setError(error instanceof Error ? error.message : "An error occurred during setup")
    } finally {
      setIsValidating(false)
    }
  }

  const handleCustomDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customDomain.trim()) {
      setError("Please enter your domain")
      return
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(customDomain)) {
      setError("Please enter a valid domain (e.g., mycompany.com)")
      return
    }

    // For custom domains, we'll redirect to the existing setup flow
    onSuccess(customDomain, 'custom')
  }

  const getUsernameStatus = () => {
    if (isCheckingUsername) {
      return { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: "Checking availability...", color: "text-muted-foreground" }
    }
    
    if (usernameAvailable === true) {
      return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: "Username available", color: "text-green-600" }
    }
    
    if (usernameAvailable === false) {
      return { icon: <AlertCircle className="h-4 w-4 text-red-500" />, text: "Username taken", color: "text-red-600" }
    }
    
    return null
  }

  const usernameStatus = getUsernameStatus()

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Choose Your Email Domain
          </CardTitle>
          <CardDescription>
            Select how you want to send emails to your Whop members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Two Options Available:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Whopmail.com Domain:</strong> Quick setup with our pre-verified domain (username@whopmail.com)</li>
                <li><strong>Custom Domain:</strong> Use your own domain for professional branding (you@yourcompany.com)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Whopmail.com Option */}
        <Card className={`border-2 ${emailType === 'whopmail' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-orange-600" />
              Whopmail.com Domain
            </CardTitle>
            <CardDescription>
              Quick setup with our pre-verified domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={emailType} onValueChange={(value) => setEmailType(value as 'whopmail' | 'custom')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whopmail" id="whopmail" />
                <Label htmlFor="whopmail" className="font-medium">Use whopmail.com</Label>
              </div>
            </RadioGroup>

            {emailType === 'whopmail' && (
              <form onSubmit={handleWhopmailSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="username"
                      value={whopmailUsername}
                      onChange={(e) => setWhopmailUsername(e.target.value.toLowerCase())}
                      placeholder="yourname"
                      disabled={isValidating}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">@whopmail.com</span>
                  </div>
                  {usernameStatus && (
                    <div className={`flex items-center gap-2 text-sm ${usernameStatus.color}`}>
                      {usernameStatus.icon}
                      {usernameStatus.text}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Choose a username between 2-32 characters. Only letters, numbers, and hyphens allowed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name (Optional)</Label>
                  <Input
                    id="fromName"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Your Name or Company"
                    disabled={isValidating}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be the display name recipients see (e.g., "John Doe" instead of "john@whopmail.com")
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isValidating || !whopmailUsername.trim() || usernameAvailable === false}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up whopmail.com...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Use whopmail.com
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Instant setup - no domain verification needed</p>
                  <p>• Professional email address for your business</p>
                  <p>• Username cannot be changed after setup</p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Custom Domain Option */}
        <Card className={`border-2 ${emailType === 'custom' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-green-600" />
              Custom Domain
            </CardTitle>
            <CardDescription>
              Use your own domain for professional branding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={emailType} onValueChange={(value) => setEmailType(value as 'whopmail' | 'custom')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-medium">Use my own domain</Label>
              </div>
            </RadioGroup>

            {emailType === 'custom' && (
              <form onSubmit={handleCustomDomainSubmit} className="space-y-4 mt-4">
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isValidating || !customDomain.trim()}
                >
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Continue with Custom Domain
                  </>
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Professional branding with your domain</p>
                  <p>• Requires domain verification</p>
                  <p>• You'll need DNS access to verify</p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-6 w-6" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-yellow-800">
                <strong>Username Changes:</strong> If you choose whopmail.com, your username cannot be changed after setup. 
                If you need to change it, you'll need to contact support.
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-orange-800">
                <strong>From Name:</strong> You can customize the display name that recipients see. 
                This helps with brand recognition and trust.
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-green-800">
                <strong>Domain Verification:</strong> Custom domains require verification before you can send emails. 
                This ensures better deliverability and prevents spam.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
