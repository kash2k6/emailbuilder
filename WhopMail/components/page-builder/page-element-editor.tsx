"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Settings2 } from "lucide-react"
import { ProductSelector } from "@/components/page-builder/product-selector"

interface PageElement {
  id: string
  type: "heading" | "text" | "image" | "video" | "button" | "divider" | "spacer"
  content: any
  settings: any
}

interface PageElementEditorProps {
  element: PageElement
  onChange: (updatedElement: PageElement) => void
}

export function PageElementEditor({ element, onChange }: PageElementEditorProps) {
  const [showSettings, setShowSettings] = useState(false)

  const updateContent = (content: any) => {
    onChange({
      ...element,
      content: {
        ...element.content,
        ...content,
      },
    })
  }

  const updateSettings = (settings: any) => {
    onChange({
      ...element,
      settings: {
        ...element.settings,
        ...settings,
      },
    })
  }

  const renderElementPreview = () => {
    switch (element.type) {
      case "heading":
        const HeadingTag = element.settings?.level || "h2"
        return (
          <div
            style={{
              textAlign: element.settings?.alignment || "left",
              color: element.settings?.color || "#1a1a1a",
            }}
          >
            <HeadingTag>{element.content?.text || "Heading"}</HeadingTag>
          </div>
        )

      case "text":
        return (
          <div
            style={{
              textAlign: element.settings?.alignment || "left",
              color: element.settings?.color || "#4a4a4a",
              fontSize:
                element.settings?.size === "small"
                  ? "0.875rem"
                  : element.settings?.size === "large"
                    ? "1.25rem"
                    : "1rem",
            }}
          >
            <p>{element.content?.text || "Text paragraph"}</p>
          </div>
        )

      case "image":
        return (
          <div
            style={{
              textAlign: element.settings?.alignment || "center",
              width: "100%",
            }}
          >
            <img
              src={element.content?.src || "/placeholder.svg?height=200&width=400"}
              alt={element.content?.alt || "Image"}
              style={{
                width: element.settings?.width || "100%",
                border: element.settings?.border ? "1px solid #e5e7eb" : "none",
                borderRadius: "4px",
              }}
            />
          </div>
        )

      case "video":
        return (
          <div style={{ width: "100%" }}>
            {element.content?.url ? (
              <iframe
                src={element.content.url}
                width={element.settings?.width || "100%"}
                height="315"
                style={{
                  aspectRatio: element.settings?.aspectRatio || "16/9",
                  border: "none",
                  borderRadius: "4px",
                }}
                allowFullScreen
              ></iframe>
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  backgroundColor: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
              >
                <p className="text-muted-foreground">Video Placeholder</p>
              </div>
            )}
          </div>
        )

      case "button":
        const buttonStyles: React.CSSProperties = {
          display: "inline-block",
          padding:
            element.settings?.size === "small"
              ? "0.5rem 1rem"
              : element.settings?.size === "large"
                ? "0.75rem 1.5rem"
                : "0.625rem 1.25rem",
          backgroundColor:
            element.settings?.style === "primary"
              ? "#3b82f6"
              : element.settings?.style === "secondary"
                ? "#10b981"
                : "transparent",
          color: element.settings?.style === "outline" ? "#3b82f6" : "#ffffff",
          border: element.settings?.style === "outline" ? "1px solid #3b82f6" : "none",
          borderRadius: "0.25rem",
          fontWeight: "500",
          textDecoration: "none",
          textAlign: "center",
          cursor: "pointer",
          width: element.settings?.fullWidth ? "100%" : "auto",
        }

        return (
          <div
            style={{
              textAlign: element.settings?.alignment || "center",
              width: "100%",
            }}
          >
            <button style={buttonStyles}>{element.content?.text || "Button Text"}</button>
          </div>
        )

      case "divider":
        return (
          <hr
            style={{
              borderStyle: element.settings?.style || "solid",
              borderColor: element.settings?.color || "#e5e7eb",
              margin:
                element.settings?.spacing === "small"
                  ? "0.5rem 0"
                  : element.settings?.spacing === "large"
                    ? "2rem 0"
                    : "1rem 0",
            }}
          />
        )

      case "spacer":
        return (
          <div
            style={{
              height:
                element.settings?.height === "small" ? "1rem" : element.settings?.height === "large" ? "4rem" : "2rem",
            }}
          ></div>
        )

      default:
        return <div>Unknown element type</div>
    }
  }

  const renderElementEditor = () => {
    switch (element.type) {
      case "heading":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="heading-text">Heading Text</Label>
              <Input
                id="heading-text"
                value={element.content?.text || ""}
                onChange={(e) => updateContent({ text: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="heading-level">Heading Level</Label>
                <Select
                  value={element.settings?.level || "h2"}
                  onValueChange={(value) => updateSettings({ level: value })}
                >
                  <SelectTrigger id="heading-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h1">H1 (Largest)</SelectItem>
                    <SelectItem value="h2">H2</SelectItem>
                    <SelectItem value="h3">H3</SelectItem>
                    <SelectItem value="h4">H4</SelectItem>
                    <SelectItem value="h5">H5</SelectItem>
                    <SelectItem value="h6">H6 (Smallest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="heading-alignment">Alignment</Label>
                <Select
                  value={element.settings?.alignment || "left"}
                  onValueChange={(value) => updateSettings({ alignment: value })}
                >
                  <SelectTrigger id="heading-alignment">
                    <SelectValue placeholder="Select alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="heading-color">Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="heading-color"
                  type="color"
                  value={element.settings?.color || "#1a1a1a"}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={element.settings?.color || "#1a1a1a"}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )

      case "text":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-content">Text Content</Label>
              <Textarea
                id="text-content"
                value={element.content?.text || ""}
                onChange={(e) => updateContent({ text: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="text-size">Text Size</Label>
                <Select
                  value={element.settings?.size || "medium"}
                  onValueChange={(value) => updateSettings({ size: value })}
                >
                  <SelectTrigger id="text-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="text-alignment">Alignment</Label>
                <Select
                  value={element.settings?.alignment || "left"}
                  onValueChange={(value) => updateSettings({ alignment: value })}
                >
                  <SelectTrigger id="text-alignment">
                    <SelectValue placeholder="Select alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="justify">Justify</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="text-color">Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="text-color"
                  type="color"
                  value={element.settings?.color || "#4a4a4a"}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={element.settings?.color || "#4a4a4a"}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )

      case "image":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-src">Image URL</Label>
              <Input
                id="image-src"
                value={element.content?.src || ""}
                onChange={(e) => updateContent({ src: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="image-alt">Alt Text</Label>
              <Input
                id="image-alt"
                value={element.content?.alt || ""}
                onChange={(e) => updateContent({ alt: e.target.value })}
                placeholder="Image description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="image-width">Width</Label>
                <Select
                  value={element.settings?.width || "100%"}
                  onValueChange={(value) => updateSettings({ width: value })}
                >
                  <SelectTrigger id="image-width">
                    <SelectValue placeholder="Select width" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25%">25%</SelectItem>
                    <SelectItem value="50%">50%</SelectItem>
                    <SelectItem value="75%">75%</SelectItem>
                    <SelectItem value="100%">100%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="image-alignment">Alignment</Label>
                <Select
                  value={element.settings?.alignment || "center"}
                  onValueChange={(value) => updateSettings({ alignment: value })}
                >
                  <SelectTrigger id="image-alignment">
                    <SelectValue placeholder="Select alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="image-border"
                checked={element.settings?.border || false}
                onCheckedChange={(checked) => updateSettings({ border: checked })}
              />
              <Label htmlFor="image-border">Add border</Label>
            </div>
          </div>
        )

      case "video":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-url">Video URL (YouTube or Vimeo embed URL)</Label>
              <Input
                id="video-url"
                value={element.content?.url || ""}
                onChange={(e) => updateContent({ url: e.target.value })}
                placeholder="https://www.youtube.com/embed/VIDEO_ID"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use embed URLs like https://www.youtube.com/embed/VIDEO_ID
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="video-aspect-ratio">Aspect Ratio</Label>
                <Select
                  value={element.settings?.aspectRatio || "16:9"}
                  onValueChange={(value) => updateSettings({ aspectRatio: value })}
                >
                  <SelectTrigger id="video-aspect-ratio">
                    <SelectValue placeholder="Select ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                    <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="video-width">Width</Label>
                <Select
                  value={element.settings?.width || "100%"}
                  onValueChange={(value) => updateSettings({ width: value })}
                >
                  <SelectTrigger id="video-width">
                    <SelectValue placeholder="Select width" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50%">50%</SelectItem>
                    <SelectItem value="75%">75%</SelectItem>
                    <SelectItem value="100%">100%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="video-controls"
                checked={element.settings?.controls !== false}
                onCheckedChange={(checked) => updateSettings({ controls: checked })}
              />
              <Label htmlFor="video-controls">Show controls</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="video-autoplay"
                checked={element.settings?.autoplay || false}
                onCheckedChange={(checked) => updateSettings({ autoplay: checked })}
              />
              <Label htmlFor="video-autoplay">Autoplay (may be blocked by browsers)</Label>
            </div>
          </div>
        )

      case "button":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="button-text">Button Text</Label>
              <Input
                id="button-text"
                value={element.content?.text || ""}
                onChange={(e) => updateContent({ text: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="button-action">Button Action</Label>
              <Select
                value={element.content?.actionType || "url"}
                onValueChange={(value) => updateContent({ actionType: value })}
              >
                <SelectTrigger id="button-action">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">External URL</SelectItem>
                  <SelectItem value="checkout">Whop Checkout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {element.content?.actionType === "url" ? (
              <div>
                <Label htmlFor="button-url">Button URL</Label>
                <Input
                  id="button-url"
                  value={element.content?.url || ""}
                  onChange={(e) => updateContent({ url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <ProductSelector
                  value={element.content?.productId || ""}
                  onChange={(value) => updateContent({ productId: value })}
                  label="Select Product"
                  placeholder="Choose a product to sell"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="success-url">Success URL (Optional)</Label>
                    <Input
                      id="success-url"
                      value={element.content?.successUrl || ""}
                      onChange={(e) => updateContent({ successUrl: e.target.value })}
                      placeholder="https://example.com/thank-you"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cancel-url">Cancel URL (Optional)</Label>
                    <Input
                      id="cancel-url"
                      value={element.content?.cancelUrl || ""}
                      onChange={(e) => updateContent({ cancelUrl: e.target.value })}
                      placeholder="https://example.com/cancel"
                    />
                  </div>
                </div>

                <div>
                  <Label>Upsell Product (Optional)</Label>
                  <ProductSelector
                    value={element.content?.upsellProductId || ""}
                    onChange={(value) => updateContent({ upsellProductId: value })}
                    placeholder="Choose an upsell product"
                    label=""
                  />
                </div>

                <div>
                  <Label>Downsell Product (Optional)</Label>
                  <ProductSelector
                    value={element.content?.downsellProductId || ""}
                    onChange={(value) => updateContent({ downsellProductId: value })}
                    placeholder="Choose a downsell product"
                    label=""
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="button-style">Style</Label>
                <Select
                  value={element.settings?.style || "primary"}
                  onValueChange={(value) => updateSettings({ style: value })}
                >
                  <SelectTrigger id="button-style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="button-size">Size</Label>
                <Select
                  value={element.settings?.size || "medium"}
                  onValueChange={(value) => updateSettings({ size: value })}
                >
                  <SelectTrigger id="button-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="button-alignment">Alignment</Label>
              <Select
                value={element.settings?.alignment || "center"}
                onValueChange={(value) => updateSettings({ alignment: value })}
              >
                <SelectTrigger id="button-alignment">
                  <SelectValue placeholder="Select alignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="button-full-width"
                checked={element.settings?.fullWidth || false}
                onCheckedChange={(checked) => updateSettings({ fullWidth: checked })}
              />
              <Label htmlFor="button-full-width">Full width</Label>
            </div>
          </div>
        )

      case "divider":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="divider-style">Style</Label>
              <Select
                value={element.settings?.style || "solid"}
                onValueChange={(value) => updateSettings({ style: value })}
              >
                <SelectTrigger id="divider-style">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="divider-spacing">Spacing</Label>
              <Select
                value={element.settings?.spacing || "medium"}
                onValueChange={(value) => updateSettings({ spacing: value })}
              >
                <SelectTrigger id="divider-spacing">
                  <SelectValue placeholder="Select spacing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="divider-color">Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="divider-color"
                  type="color"
                  value={element.settings?.color || "#e5e7eb"}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={element.settings?.color || "#e5e7eb"}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )

      case "spacer":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="spacer-height">Height</Label>
              <Select
                value={element.settings?.height || "medium"}
                onValueChange={(value) => updateSettings({ height: value })}
              >
                <SelectTrigger id="spacer-height">
                  <SelectValue placeholder="Select height" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (1rem)</SelectItem>
                  <SelectItem value="medium">Medium (2rem)</SelectItem>
                  <SelectItem value="large">Large (4rem)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      default:
        return <div>Unknown element type</div>
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium capitalize">{element.type}</div>
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {showSettings ? renderElementEditor() : renderElementPreview()}
    </div>
  )
}
