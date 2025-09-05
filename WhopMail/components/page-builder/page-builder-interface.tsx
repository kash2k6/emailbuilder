"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, Eye, ArrowLeft, Plus, Trash2, MoveUp, MoveDown, Settings } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageElementEditor } from "@/components/page-builder/page-element-editor"
import { PagePreview } from "@/components/page-builder/page-preview"
import { PageSettings } from "@/components/page-builder/page-settings"
// Import the ProductPreview component at the top of the file
import { ProductPreview } from "@/components/page-builder/product-preview"

interface PageElement {
  id: string
  type: "heading" | "text" | "image" | "video" | "button" | "divider" | "spacer"
  content: any
  settings: any
}

interface PageData {
  id: string
  title: string
  slug: string
  status: "draft" | "published"
  type: "landing" | "upsell" | "downsell" | "thank-you"
  elements: PageElement[]
  settings: {
    theme: "light" | "dark"
    layout: "centered" | "full-width"
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    showHeader: boolean
    showFooter: boolean
    customCSS: string
  }
}

interface PageBuilderInterfaceProps {
  pageId: string | null
  onSave: () => void
}

export function PageBuilderInterface({ pageId, onSave }: PageBuilderInterfaceProps) {
  const [activeTab, setActiveTab] = useState("editor")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null)

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (pageId) {
          // In a real implementation, this would fetch the page data from an API
          // For now, we'll use mock data
          const mockPage: PageData = {
            id: pageId,
            title: "Main Product Landing Page",
            slug: "main-product",
            status: "draft",
            type: "landing",
            elements: [
              {
                id: "element-1",
                type: "heading",
                content: {
                  text: "Boost Your Business with Our Premium Solution",
                },
                settings: {
                  level: "h1",
                  alignment: "center",
                  color: "#1a1a1a",
                },
              },
              {
                id: "element-2",
                type: "text",
                content: {
                  text: "Our solution helps businesses increase revenue by 30% within the first 3 months. Join thousands of satisfied customers today!",
                },
                settings: {
                  alignment: "center",
                  size: "medium",
                  color: "#4a4a4a",
                },
              },
              {
                id: "element-3",
                type: "video",
                content: {
                  url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                  thumbnail: "/placeholder.svg?height=400&width=600",
                },
                settings: {
                  autoplay: false,
                  controls: true,
                  width: "100%",
                  aspectRatio: "16:9",
                },
              },
              {
                id: "element-4",
                type: "button",
                content: {
                  text: "Get Started Now",
                  url: "#checkout",
                },
                settings: {
                  size: "large",
                  style: "primary",
                  alignment: "center",
                  fullWidth: false,
                },
              },
            ],
            settings: {
              theme: "light",
              layout: "centered",
              primaryColor: "#3b82f6",
              secondaryColor: "#10b981",
              fontFamily: "Inter, sans-serif",
              showHeader: true,
              showFooter: true,
              customCSS: "",
            },
          }

          // Simulate API delay
          setTimeout(() => {
            setPageData(mockPage)
            setIsLoading(false)
          }, 800)
        } else {
          // Create a new page template
          const newPage: PageData = {
            id: "new-page",
            title: "New Landing Page",
            slug: "new-landing-page",
            status: "draft",
            type: "landing",
            elements: [
              {
                id: `element-${Date.now()}-1`,
                type: "heading",
                content: {
                  text: "Your Compelling Headline Here",
                },
                settings: {
                  level: "h1",
                  alignment: "center",
                  color: "#1a1a1a",
                },
              },
              {
                id: `element-${Date.now()}-2`,
                type: "text",
                content: {
                  text: "Write a persuasive description of your product or service here.",
                },
                settings: {
                  alignment: "center",
                  size: "medium",
                  color: "#4a4a4a",
                },
              },
            ],
            settings: {
              theme: "light",
              layout: "centered",
              primaryColor: "#3b82f6",
              secondaryColor: "#10b981",
              fontFamily: "Inter, sans-serif",
              showHeader: true,
              showFooter: true,
              customCSS: "",
            },
          }

          setPageData(newPage)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error loading page data:", error)
        setError("Failed to load page data. Please try again.")
        setIsLoading(false)
      }
    }

    loadPageData()
  }, [pageId])

  const handleSavePage = async () => {
    if (!pageData) return

    try {
      setIsSaving(true)

      // In a real implementation, this would save the page data to an API
      console.log("Saving page data:", pageData)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setIsSaving(false)
      onSave()
    } catch (error) {
      console.error("Error saving page:", error)
      setError("Failed to save page. Please try again.")
      setIsSaving(false)
    }
  }

  const handleAddElement = (type: PageElement["type"]) => {
    if (!pageData) return

    const newElement: PageElement = {
      id: `element-${Date.now()}`,
      type,
      content: {},
      settings: {},
    }

    // Set default content and settings based on element type
    switch (type) {
      case "heading":
        newElement.content = { text: "New Heading" }
        newElement.settings = { level: "h2", alignment: "left", color: "#1a1a1a" }
        break
      case "text":
        newElement.content = { text: "New text paragraph" }
        newElement.settings = { alignment: "left", size: "medium", color: "#4a4a4a" }
        break
      case "image":
        newElement.content = { src: "/placeholder.svg?height=300&width=500", alt: "Image description" }
        newElement.settings = { width: "100%", alignment: "center", border: false }
        break
      case "video":
        newElement.content = { url: "", thumbnail: "/placeholder.svg?height=300&width=500" }
        newElement.settings = { autoplay: false, controls: true, width: "100%", aspectRatio: "16:9" }
        break
      case "button":
        newElement.content = { text: "Click Here", url: "#" }
        newElement.settings = { size: "medium", style: "primary", alignment: "center", fullWidth: false }
        break
      case "divider":
        newElement.settings = { style: "solid", color: "#e5e7eb", spacing: "medium" }
        break
      case "spacer":
        newElement.settings = { height: "medium" }
        break
    }

    const updatedElements = [...pageData.elements, newElement]
    setPageData({ ...pageData, elements: updatedElements })
    setSelectedElementIndex(updatedElements.length - 1)
  }

  const handleUpdateElement = (index: number, updatedElement: PageElement) => {
    if (!pageData) return

    const updatedElements = [...pageData.elements]
    updatedElements[index] = updatedElement
    setPageData({ ...pageData, elements: updatedElements })
  }

  const handleDeleteElement = (index: number) => {
    if (!pageData) return

    const updatedElements = [...pageData.elements]
    updatedElements.splice(index, 1)
    setPageData({ ...pageData, elements: updatedElements })
    setSelectedElementIndex(null)
  }

  const handleMoveElement = (index: number, direction: "up" | "down") => {
    if (!pageData) return

    const updatedElements = [...pageData.elements]

    if (direction === "up" && index > 0) {
      ;[updatedElements[index], updatedElements[index - 1]] = [updatedElements[index - 1], updatedElements[index]]
      setSelectedElementIndex(index - 1)
    } else if (direction === "down" && index < updatedElements.length - 1) {
      ;[updatedElements[index], updatedElements[index + 1]] = [updatedElements[index + 1], updatedElements[index]]
      setSelectedElementIndex(index + 1)
    }

    setPageData({ ...pageData, elements: updatedElements })
  }

  const handleUpdatePageSettings = (settings: PageData["settings"]) => {
    if (!pageData) return
    setPageData({ ...pageData, settings })
  }

  const handleUpdatePageInfo = (info: Pick<PageData, "title" | "slug" | "type">) => {
    if (!pageData) return
    setPageData({ ...pageData, ...info })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!pageData) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load page data. Please try again.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onSave}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pages
          </Button>
          <h2 className="text-2xl font-bold">{pageData.title || "Untitled Page"}</h2>
          <Badge variant={pageData.status === "published" ? "default" : "outline"}>
            {pageData.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setActiveTab("preview")}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handleSavePage} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Page
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Page Details</CardTitle>
              <CardDescription>Basic information about your page</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Page Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="page-title">Page Title</Label>
              <Input
                id="page-title"
                value={pageData.title}
                onChange={(e) => handleUpdatePageInfo({ ...pageData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-slug">Page Slug</Label>
              <Input
                id="page-slug"
                value={pageData.slug}
                onChange={(e) => handleUpdatePageInfo({ ...pageData, slug: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-type">Page Type</Label>
            <Select
              value={pageData.type}
              onValueChange={(value: any) => handleUpdatePageInfo({ ...pageData, type: value })}
            >
              <SelectTrigger id="page-type">
                <SelectValue placeholder="Select page type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="landing">Landing Page</SelectItem>
                <SelectItem value="upsell">Upsell Page</SelectItem>
                <SelectItem value="downsell">Downsell Page</SelectItem>
                <SelectItem value="thank-you">Thank You Page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add Elements</CardTitle>
                  <CardDescription>Drag and drop elements to build your page</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAddElement("heading")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Heading
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => handleAddElement("text")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Text
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => handleAddElement("image")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Image
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => handleAddElement("video")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Video
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => handleAddElement("button")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Button
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAddElement("divider")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Divider
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => handleAddElement("spacer")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Spacer
                  </Button>
                </CardContent>
              </Card>

              {selectedElementIndex !== null && pageData.elements[selectedElementIndex] && (
                <Card>
                  <CardHeader>
                    <CardTitle>Element Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveElement(selectedElementIndex, "up")}
                        disabled={selectedElementIndex === 0}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveElement(selectedElementIndex, "down")}
                        disabled={selectedElementIndex === pageData.elements.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteElement(selectedElementIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="md:col-span-3">
              <Card className="min-h-[500px]">
                <CardHeader>
                  <CardTitle>Page Content</CardTitle>
                  <CardDescription>Click on elements to edit them</CardDescription>
                </CardHeader>
                <CardContent>
                  {pageData.elements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-md p-6 text-center">
                      <p className="text-muted-foreground mb-4">
                        Your page is empty. Add elements from the left panel.
                      </p>
                      <Button onClick={() => handleAddElement("heading")}>Add First Element</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pageData.elements.map((element, index) => (
                        <div
                          key={element.id}
                          className={`p-4 border rounded-md cursor-pointer transition-all ${
                            selectedElementIndex === index
                              ? "border-orange-500 ring-2 ring-orange-500/20"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedElementIndex(index)}
                        >
                          <PageElementEditor
                            element={element}
                            onChange={(updatedElement) => handleUpdateElement(index, updatedElement)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          {selectedElementIndex !== null &&
            pageData.elements[selectedElementIndex] &&
            pageData.elements[selectedElementIndex].type === "button" &&
            pageData.elements[selectedElementIndex].content?.actionType === "checkout" &&
            pageData.elements[selectedElementIndex].content?.productId && (
              <div className="md:col-span-3 mt-4">
                <h3 className="text-lg font-medium mb-2">Selected Product</h3>
                <ProductPreview productId={pageData.elements[selectedElementIndex].content.productId} />

                {(pageData.elements[selectedElementIndex].content?.upsellProductId ||
                  pageData.elements[selectedElementIndex].content?.downsellProductId) && (
                  <div className="mt-4 space-y-4">
                    <h3 className="text-lg font-medium">Funnel Products</h3>

                    {pageData.elements[selectedElementIndex].content?.upsellProductId && (
                      <div>
                        <div className="flex items-center mb-2">
                          <Badge variant="outline" className="mr-2">
                            Upsell
                          </Badge>
                          <span className="text-sm">This product will be offered after the main purchase</span>
                        </div>
                        <ProductPreview productId={pageData.elements[selectedElementIndex].content.upsellProductId} />
                      </div>
                    )}

                    {pageData.elements[selectedElementIndex].content?.downsellProductId && (
                      <div className="mt-4">
                        <div className="flex items-center mb-2">
                          <Badge variant="outline" className="mr-2">
                            Downsell
                          </Badge>
                          <span className="text-sm">This product will be offered if the upsell is declined</span>
                        </div>
                        <ProductPreview productId={pageData.elements[selectedElementIndex].content.downsellProductId} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Preview</CardTitle>
              <CardDescription>Preview how your page will look to visitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 min-h-[600px] bg-white">
                <PagePreview pageData={pageData} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("editor")}>
                Back to Editor
              </Button>
              <Button onClick={handleSavePage} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Page
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 pt-4">
          <PageSettings
            settings={pageData.settings}
            onChange={handleUpdatePageSettings}
            onBack={() => setActiveTab("editor")}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
