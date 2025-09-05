import React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EmailWidthSelectorProps {
  selectedWidth: number
  onWidthChange: (width: number) => void
  className?: string
}

const emailWidthOptions = [
  { value: 500, label: 'Narrow (500px)', description: 'Compact layout, good for simple emails' },
  { value: 600, label: 'Standard (600px)', description: 'Most common width, works well on all devices' },
  { value: 700, label: 'Wide (700px)', description: 'More space for content, great for newsletters' },
  { value: 800, label: 'Extra Wide (800px)', description: 'Maximum width, best for rich content' }
]

export function EmailWidthSelector({ selectedWidth, onWidthChange, className }: EmailWidthSelectorProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
          📧 Email Width
          <Badge variant="secondary" className="text-xs">
            Desktop
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs lg:text-sm">
          Set email width for desktop viewing. Mobile scales automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email-width">Email Container Width</Label>
          <Select value={selectedWidth.toString()} onValueChange={(value) => onWidthChange(parseInt(value))}>
            <SelectTrigger id="email-width">
              <SelectValue placeholder="Select email width" />
            </SelectTrigger>
            <SelectContent>
              {emailWidthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="relative">
            <div className="w-full bg-gray-100 rounded-lg p-4">
              <div 
                className="bg-white border-2 border-dashed border-gray-300 rounded-lg mx-auto"
                style={{ width: `${selectedWidth}px`, maxWidth: '100%' }}
              >
                <div className="p-4 text-center text-sm text-gray-500">
                  Email content area
                  <br />
                  <span className="text-xs">{selectedWidth}px wide</span>
                </div>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className="text-xs">
                {selectedWidth}px
              </Badge>
            </div>
          </div>
        </div>


      </CardContent>
    </Card>
  )
} 