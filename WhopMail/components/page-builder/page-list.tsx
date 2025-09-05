"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { Loader2, Plus, ExternalLink, Copy, Trash2, Edit } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Page {
  id: string
  title: string
  slug: string
  status: "draft" | "published"
  updatedAt: string
  type: "landing" | "upsell" | "downsell" | "thank-you"
  views: number
  conversions: number
}

interface PageListProps {
  onPageSelect: (pageId: string) => void
  onCreateNew: () => void
}

export function PageList({ onPageSelect, onCreateNew }: PageListProps) {
  const [pages, setPages] = useState<Page[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // In a real implementation, this would fetch pages from an API
    const fetchPages = async () => {
      try {
        setIsLoading(true)

        // Mock data for demonstration
        const mockPages: Page[] = [
          {
            id: "page-1",
            title: "Main Product Landing Page",
            slug: "main-product",
            status: "published",
            updatedAt: "2023-06-15T10:30:00Z",
            type: "landing",
            views: 1245,
            conversions: 87,
          },
          {
            id: "page-2",
            title: "Premium Upsell Offer",
            slug: "premium-upsell",
            status: "published",
            updatedAt: "2023-06-14T15:45:00Z",
            type: "upsell",
            views: 432,
            conversions: 28,
          },
          {
            id: "page-3",
            title: "Budget Alternative",
            slug: "budget-option",
            status: "draft",
            updatedAt: "2023-06-10T09:15:00Z",
            type: "downsell",
            views: 0,
            conversions: 0,
          },
          {
            id: "page-4",
            title: "Thank You Page",
            slug: "thank-you",
            status: "published",
            updatedAt: "2023-06-12T11:20:00Z",
            type: "thank-you",
            views: 115,
            conversions: 115,
          },
        ]

        // Simulate API delay
        setTimeout(() => {
          setPages(mockPages)
          setIsLoading(false)
        }, 800)
      } catch (error) {
        console.error("Error fetching pages:", error)
        setError("Failed to load pages. Please try again.")
        setIsLoading(false)
      }
    }

    fetchPages()
  }, [])

  const getPageTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "landing":
        return "default"
      case "upsell":
        return "secondary"
      case "downsell":
        return "outline"
      case "thank-you":
        return "default"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const calculateConversionRate = (views: number, conversions: number) => {
    if (views === 0) return "0%"
    return `${Math.round((conversions / views) * 100)}%`
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

  if (pages.length === 0) {
    return (
      <EmptyPlaceholder
        title="No pages created yet"
        description="Create your first landing page to start building your sales funnel."
        button={{
          text: "Create New Page",
          onClick: onCreateNew,
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Pages</h2>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Page
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <Card key={page.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant={getPageTypeBadgeVariant(page.type)} className="mb-2">
                  {page.type.charAt(0).toUpperCase() + page.type.slice(1)}
                </Badge>
                <Badge variant={page.status === "published" ? "default" : "outline"}>
                  {page.status === "published" ? "Published" : "Draft"}
                </Badge>
              </div>
              <CardTitle className="line-clamp-1">{page.title}</CardTitle>
              <CardDescription>Updated {formatDate(page.updatedAt)}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Views</p>
                  <p className="font-medium">{page.views.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Conversions</p>
                  <p className="font-medium">{page.conversions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rate</p>
                  <p className="font-medium">{calculateConversionRate(page.views, page.conversions)}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => onPageSelect(page.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span>View Live</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Duplicate</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
