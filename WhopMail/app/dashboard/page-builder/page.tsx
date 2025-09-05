"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { PageBuilderInterface } from "@/components/page-builder/page-builder-interface"
import { PageList } from "@/components/page-builder/page-list"
import { FunnelBuilder } from "@/components/page-builder/funnel-builder"
import { LockIcon } from "lucide-react"

export default function PageBuilderPage() {
  const [activeTab, setActiveTab] = useState("pages")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)

  // Check if user is authorized to access this feature
  useEffect(() => {
    // This is a placeholder for actual authorization logic
    // In a real implementation, you would check if the user has access to this feature
    const checkAuthorization = async () => {
      try {
        // For now, we'll just set this to true for development
        // In production, you would check against a database or other source
        setIsAuthorized(true)
        setIsLoading(false)
      } catch (error) {
        console.error("Error checking authorization:", error)
        setIsAuthorized(false)
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [])

  const handlePageSelect = (pageId: string) => {
    setSelectedPageId(pageId)
    setActiveTab("editor")
  }

  const handleCreateNewPage = () => {
    setSelectedPageId(null)
    setActiveTab("editor")
  }

  if (isLoading) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Page Builder" text="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </DashboardShell>
    )
  }

  if (!isAuthorized) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Page Builder" text="Create landing pages with upsell/downsell funnels" />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LockIcon className="mr-2 h-5 w-5" />
              Feature Locked
            </CardTitle>
            <CardDescription>This feature is currently in private beta.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                The landing page builder is currently available by invitation only. Please contact support if you would
                like early access to this feature.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Page Builder" text="Create landing pages with upsell/downsell funnels" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pages">My Pages</TabsTrigger>
          <TabsTrigger value="editor">Page Editor</TabsTrigger>
          <TabsTrigger value="funnels">Funnels</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4 pt-4">
          <PageList onPageSelect={handlePageSelect} onCreateNew={handleCreateNewPage} />
        </TabsContent>

        <TabsContent value="editor" className="space-y-4 pt-4">
          <PageBuilderInterface pageId={selectedPageId} onSave={() => setActiveTab("pages")} />
        </TabsContent>

        <TabsContent value="funnels" className="space-y-4 pt-4">
          <FunnelBuilder />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
