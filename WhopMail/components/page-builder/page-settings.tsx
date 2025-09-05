"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"

interface PageSettings {
  theme: "light" | "dark"
  layout: "centered" | "full-width"
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  showHeader: boolean
  showFooter: boolean
  customCSS: string
}

interface PageSettingsProps {
  settings: PageSettings
  onChange: (settings: PageSettings) => void
  onBack: () => void
}

export function PageSettings({ settings, onChange, onBack }: PageSettingsProps) {
  const updateSetting = <K extends keyof PageSettings>(key: K, value: PageSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Settings</CardTitle>
        <CardDescription>Configure the appearance and behavior of your page</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={settings.theme} onValueChange={(value: "light" | "dark") => updateSetting("theme", value)}>
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="layout">Layout</Label>
              <Select
                value={settings.layout}
                onValueChange={(value: "centered" | "full-width") => updateSetting("layout", value)}
              >
                <SelectTrigger id="layout">
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="centered">Centered</SelectItem>
                  <SelectItem value="full-width">Full Width</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="font-family">Font Family</Label>
              <Select value={settings.fontFamily} onValueChange={(value) => updateSetting("fontFamily", value)}>
                <SelectTrigger id="font-family">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                  <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                  <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                  <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                  <SelectItem value="'Playfair Display', serif">Playfair Display</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting("primaryColor", e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting("primaryColor", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={settings.secondaryColor}
                  onChange={(e) => updateSetting("secondaryColor", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-header"
                  checked={settings.showHeader}
                  onCheckedChange={(checked) => updateSetting("showHeader", checked)}
                />
                <Label htmlFor="show-header">Show Header</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-footer"
                  checked={settings.showFooter}
                  onCheckedChange={(checked) => updateSetting("showFooter", checked)}
                />
                <Label htmlFor="show-footer">Show Footer</Label>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="custom-css">Custom CSS</Label>
          <Textarea
            id="custom-css"
            value={settings.customCSS}
            onChange={(e) => updateSetting("customCSS", e.target.value)}
            placeholder=".my-custom-class { color: red; }"
            rows={6}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Add custom CSS to further customize your page. Use with caution.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Editor
        </Button>
        <Button onClick={onBack}>
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  )
}
