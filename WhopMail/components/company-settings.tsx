"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, Building2, Mail, Globe, Phone, Image } from "lucide-react"
import { toast } from "sonner"

interface CompanySettings {
  company_name?: string
  company_address?: string
  company_website?: string
  company_phone?: string
  company_email?: string
  company_logo_url?: string
  footer_customization?: {
    footer_style?: {
      backgroundColor?: string
      textColor?: string
      linkColor?: string
      borderColor?: string
    }
    footer_content?: {
      showCompanyInfo?: boolean
      showUnsubscribeLink?: boolean
      showViewInBrowser?: boolean
      showPoweredBy?: boolean
      customText?: string
    }
  }
}

interface CompanySettingsProps {
  whopUserId: string
}

export function CompanySettings({ whopUserId }: CompanySettingsProps) {
  const [settings, setSettings] = useState<CompanySettings>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load company settings on mount
  useEffect(() => {
    loadCompanySettings()
  }, [whopUserId])

  const loadCompanySettings = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/company-settings?whopUserId=${whopUserId}`)
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.settings || {})
      } else {
        setError(data.error || 'Failed to load company settings')
      }
    } catch (error) {
      setError('Failed to load company settings')
      console.error('Error loading company settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveCompanySettings = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      const response = await fetch('/api/company-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whopUserId,
          settings
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Company settings saved successfully!')
        setSettings(data.settings)
      } else {
        setError(data.error || 'Failed to save company settings')
        toast.error('Failed to save company settings')
      }
    } catch (error) {
      setError('Failed to save company settings')
      toast.error('Failed to save company settings')
      console.error('Error saving company settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateFooterContent = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      footer_customization: {
        ...prev.footer_customization,
        footer_content: {
          ...prev.footer_customization?.footer_content,
          [key]: value
        }
      }
    }))
  }

  const updateFooterStyle = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      footer_customization: {
        ...prev.footer_customization,
        footer_style: {
          ...prev.footer_customization?.footer_style,
          [key]: value
        }
      }
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin h-6 w-6 mr-2" />
        Loading company settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Customize your company details that will appear in email footers and headers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={settings.company_name || ''}
                onChange={(e) => updateSetting('company_name', e.target.value)}
                placeholder="Your Company Name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_website">Website</Label>
              <Input
                id="company_website"
                value={settings.company_website || ''}
                onChange={(e) => updateSetting('company_website', e.target.value)}
                placeholder="https://yourcompany.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_email">Contact Email</Label>
              <Input
                id="company_email"
                type="email"
                value={settings.company_email || ''}
                onChange={(e) => updateSetting('company_email', e.target.value)}
                placeholder="contact@yourcompany.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_phone">Phone Number</Label>
              <Input
                id="company_phone"
                value={settings.company_phone || ''}
                onChange={(e) => updateSetting('company_phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company_address">Company Address</Label>
            <Textarea
              id="company_address"
              value={settings.company_address || ''}
              onChange={(e) => updateSetting('company_address', e.target.value)}
              placeholder="123 Business St, Suite 100&#10;City, State 12345&#10;Country"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company_logo_url">Company Logo URL</Label>
            <Input
              id="company_logo_url"
              value={settings.company_logo_url || ''}
              onChange={(e) => updateSetting('company_logo_url', e.target.value)}
              placeholder="https://yourcompany.com/logo.png"
            />
            <p className="text-sm text-muted-foreground">
              Provide a direct link to your company logo (PNG, JPG, or SVG recommended)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Footer Customization
          </CardTitle>
          <CardDescription>
            Control what appears in your email footers and how they look.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium">Footer Content</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="showCompanyInfo">Show Company Information</Label>
                <Switch
                  id="showCompanyInfo"
                  checked={settings.footer_customization?.footer_content?.showCompanyInfo ?? true}
                  onCheckedChange={(checked) => updateFooterContent('showCompanyInfo', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="showUnsubscribeLink">Show Unsubscribe Link</Label>
                <Switch
                  id="showUnsubscribeLink"
                  checked={settings.footer_customization?.footer_content?.showUnsubscribeLink ?? true}
                  onCheckedChange={(checked) => updateFooterContent('showUnsubscribeLink', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="showViewInBrowser">Show "View in Browser" Link</Label>
                <Switch
                  id="showViewInBrowser"
                  checked={settings.footer_customization?.footer_content?.showViewInBrowser ?? true}
                  onCheckedChange={(checked) => updateFooterContent('showViewInBrowser', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="showPoweredBy">Show "Powered by Email Marketing"</Label>
                <Switch
                  id="showPoweredBy"
                  checked={settings.footer_customization?.footer_content?.showPoweredBy ?? false}
                  onCheckedChange={(checked) => updateFooterContent('showPoweredBy', checked)}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customText">Custom Footer Text</Label>
            <Textarea
              id="customText"
              value={settings.footer_customization?.footer_content?.customText || ''}
              onChange={(e) => updateFooterContent('customText', e.target.value)}
              placeholder="Add any additional text you'd like in your email footer..."
              rows={3}
            />
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">Footer Styling</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="backgroundColor">Background Color</Label>
                <Input
                  id="backgroundColor"
                  type="color"
                  value={settings.footer_customization?.footer_style?.backgroundColor || '#f8f9fa'}
                  onChange={(e) => updateFooterStyle('backgroundColor', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="textColor">Text Color</Label>
                <Input
                  id="textColor"
                  type="color"
                  value={settings.footer_customization?.footer_style?.textColor || '#6c757d'}
                  onChange={(e) => updateFooterStyle('textColor', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="linkColor">Link Color</Label>
                <Input
                  id="linkColor"
                  type="color"
                  value={settings.footer_customization?.footer_style?.linkColor || '#007bff'}
                  onChange={(e) => updateFooterStyle('linkColor', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="borderColor">Border Color</Label>
                <Input
                  id="borderColor"
                  type="color"
                  value={settings.footer_customization?.footer_style?.borderColor || '#e9ecef'}
                  onChange={(e) => updateFooterStyle('borderColor', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={saveCompanySettings} 
          disabled={isSaving || !settings.company_name?.trim()}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Company Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 