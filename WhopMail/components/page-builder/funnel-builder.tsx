"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { ArrowDown, Check, Plus, Save, Trash2, X } from "lucide-react"

interface FunnelStep {
  id: string
  pageId: string
  pageName: string
  type: "landing" | "upsell" | "downsell" | "thank-you"
  nextStepId?: string
  noThanksStepId?: string
}

interface Funnel {
  id: string
  name: string
  description: string
  steps: FunnelStep[]
  startStepId: string
}

export function FunnelBuilder() {
  const [activeTab, setActiveTab] = useState("list")
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null)
  const [funnels, setFunnels] = useState<Funnel[]>([
    {
      id: "funnel-1",
      name: "Main Product Funnel",
      description: "Primary sales funnel for our main product",
      steps: [
        {
          id: "step-1",
          pageId: "page-1",
          pageName: "Main Product Landing Page",
          type: "landing",
          nextStepId: "step-2",
        },
        {
          id: "step-2",
          pageId: "page-2",
          pageName: "Premium Upsell Offer",
          type: "upsell",
          nextStepId: "step-4",
          noThanksStepId: "step-3",
        },
        {
          id: "step-3",
          pageId: "page-3",
          pageName: "Budget Alternative",
          type: "downsell",
          nextStepId: "step-4",
        },
        {
          id: "step-4",
          pageId: "page-4",
          pageName: "Thank You Page",
          type: "thank-you",
        },
      ],
      startStepId: "step-1",
    },
  ])

  const [availablePages, setAvailablePages] = useState([
    { id: "page-1", name: "Main Product Landing Page", type: "landing" },
    { id: "page-2", name: "Premium Upsell Offer", type: "upsell" },
    { id: "page-3", name: "Budget Alternative", type: "downsell" },
    { id: "page-4", name: "Thank You Page", type: "thank-you" },
    { id: "page-5", name: "Bonus Offer", type: "upsell" },
  ])

  const [newFunnel, setNewFunnel] = useState<Omit<Funnel, "id" | "steps" | "startStepId">>({
    name: "",
    description: "",
  })

  const selectedFunnel = selectedFunnelId ? funnels.find((funnel) => funnel.id === selectedFunnelId) : null

  const handleCreateFunnel = () => {
    if (!newFunnel.name) return

    const newFunnelId = `funnel-${Date.now()}`

    setFunnels([
      ...funnels,
      {
        id: newFunnelId,
        name: newFunnel.name,
        description: newFunnel.description,
        steps: [],
        startStepId: "",
      },
    ])

    setNewFunnel({
      name: "",
      description: "",
    })

    setSelectedFunnelId(newFunnelId)
    setActiveTab("editor")
  }

  const handleAddStep = (pageId: string) => {
    if (!selectedFunnel) return

    const page = availablePages.find((p) => p.id === pageId)
    if (!page) return

    const newStepId = `step-${Date.now()}`
    const newStep: FunnelStep = {
      id: newStepId,
      pageId,
      pageName: page.name,
      type: page.type as FunnelStep["type"],
    }

    // If this is the first step, set it as the start step
    const updatedFunnel = { ...selectedFunnel }

    if (updatedFunnel.steps.length === 0) {
      updatedFunnel.startStepId = newStepId
    }

    updatedFunnel.steps = [...updatedFunnel.steps, newStep]

    setFunnels(funnels.map((f) => (f.id === selectedFunnelId ? updatedFunnel : f)))
  }

  const handleRemoveStep = (stepId: string) => {
    if (!selectedFunnel) return

    // Remove the step
    const updatedSteps = selectedFunnel.steps.filter((step) => step.id !== stepId)

    // Update any steps that reference this step
    const updatedStepsWithFixedReferences = updatedSteps.map((step) => {
      if (step.nextStepId === stepId) {
        return { ...step, nextStepId: undefined }
      }
      if (step.noThanksStepId === stepId) {
        return { ...step, noThanksStepId: undefined }
      }
      return step
    })

    // If the removed step was the start step, update the start step
    let updatedStartStepId = selectedFunnel.startStepId
    if (updatedStartStepId === stepId) {
      updatedStartStepId = updatedStepsWithFixedReferences.length > 0 ? updatedStepsWithFixedReferences[0].id : ""
    }

    const updatedFunnel = {
      ...selectedFunnel,
      steps: updatedStepsWithFixedReferences,
      startStepId: updatedStartStepId,
    }

    setFunnels(funnels.map((f) => (f.id === selectedFunnelId ? updatedFunnel : f)))
  }

  const handleUpdateStepConnections = (stepId: string, nextStepId?: string, noThanksStepId?: string) => {
    if (!selectedFunnel) return

    const updatedSteps = selectedFunnel.steps.map((step) => {
      if (step.id === stepId) {
        return {
          ...step,
          nextStepId,
          noThanksStepId: step.type === "upsell" ? noThanksStepId : undefined,
        }
      }
      return step
    })

    const updatedFunnel = {
      ...selectedFunnel,
      steps: updatedSteps,
    }

    setFunnels(funnels.map((f) => (f.id === selectedFunnelId ? updatedFunnel : f)))
  }

  const handleSetStartStep = (stepId: string) => {
    if (!selectedFunnel) return

    const updatedFunnel = {
      ...selectedFunnel,
      startStepId: stepId,
    }

    setFunnels(funnels.map((f) => (f.id === selectedFunnelId ? updatedFunnel : f)))
  }

  const renderFunnelList = () => {
    if (funnels.length === 0) {
      return (
        <EmptyPlaceholder
          title="No funnels created yet"
          description="Create your first sales funnel to guide customers through your offers."
          button={{
            text: "Create New Funnel",
            onClick: () => setActiveTab("create"),
          }}
        />
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Your Funnels</h2>
          <Button onClick={() => setActiveTab("create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Funnel
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {funnels.map((funnel) => (
            <Card
              key={funnel.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedFunnelId(funnel.id)
                setActiveTab("editor")
              }}
            >
              <CardHeader>
                <CardTitle>{funnel.name}</CardTitle>
                <CardDescription>{funnel.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <span className="font-medium">{funnel.steps.length}</span> steps in this funnel
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderCreateFunnel = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create New Funnel</CardTitle>
          <CardDescription>Set up a new sales funnel to guide customers through your offers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="funnel-name">Funnel Name</Label>
            <Input
              id="funnel-name"
              value={newFunnel.name}
              onChange={(e) => setNewFunnel({ ...newFunnel, name: e.target.value })}
              placeholder="Main Product Funnel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="funnel-description">Description (optional)</Label>
            <Input
              id="funnel-description"
              value={newFunnel.description}
              onChange={(e) => setNewFunnel({ ...newFunnel, description: e.target.value })}
              placeholder="Primary sales funnel for our main product"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setActiveTab("list")}>
              Cancel
            </Button>
            <Button onClick={handleCreateFunnel} disabled={!newFunnel.name}>
              Create Funnel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderFunnelEditor = () => {
    if (!selectedFunnel) {
      return (
        <Alert>
          <AlertDescription>No funnel selected. Please select a funnel from the list.</AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{selectedFunnel.name}</h2>
            <p className="text-muted-foreground">{selectedFunnel.description}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setActiveTab("list")}>
              Back to List
            </Button>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Funnel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Funnel Steps</CardTitle>
            <CardDescription>Add and arrange the pages in your funnel</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedFunnel.steps.length === 0 ? (
              <div className="text-center p-6 border-2 border-dashed rounded-md">
                <p className="text-muted-foreground mb-4">
                  Your funnel doesn't have any steps yet. Add your first page to get started.
                </p>
                <Select onValueChange={handleAddStep}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name} ({page.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Select onValueChange={handleAddStep}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Add another page" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.name} ({page.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {selectedFunnel.steps.map((step) => {
                    const isStartStep = selectedFunnel.startStepId === step.id

                    return (
                      <div key={step.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{step.pageName}</h3>
                              <span className="text-xs bg-muted px-2 py-1 rounded-md capitalize">{step.type}</span>
                              {isStartStep && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-md">
                                  Start Step
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">Page ID: {step.pageId}</p>
                          </div>
                          <div className="flex space-x-2">
                            {!isStartStep && (
                              <Button variant="outline" size="sm" onClick={() => handleSetStartStep(step.id)}>
                                Set as Start
                              </Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => handleRemoveStep(step.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm">If customer says "Yes" (Next Step)</Label>
                            <Select
                              value={step.nextStepId}
                              onValueChange={(value) =>
                                handleUpdateStepConnections(step.id, value || undefined, step.noThanksStepId)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select next step" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">End of funnel</SelectItem>
                                {selectedFunnel.steps
                                  .filter((s) => s.id !== step.id)
                                  .map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.pageName} ({s.type})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {step.type === "upsell" && (
                            <div>
                              <Label className="text-sm">If customer says "No Thanks" (Alternative Path)</Label>
                              <Select
                                value={step.noThanksStepId}
                                onValueChange={(value) =>
                                  handleUpdateStepConnections(step.id, step.nextStepId, value || undefined)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select alternative path" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">End of funnel</SelectItem>
                                  {selectedFunnel.steps
                                    .filter((s) => s.id !== step.id)
                                    .map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.pageName} ({s.type})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedFunnel.steps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Funnel Flow Visualization</CardTitle>
              <CardDescription>Visual representation of your funnel flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-md bg-muted/20">{renderFunnelFlow(selectedFunnel)}</div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderFunnelFlow = (funnel: Funnel) => {
    if (!funnel.startStepId || funnel.steps.length === 0) {
      return (
        <div className="text-center p-4">
          <p className="text-muted-foreground">Set a start step to visualize your funnel flow.</p>
        </div>
      )
    }

    const renderStep = (stepId: string, depth = 0) => {
      if (!stepId || depth > 10) return null // Prevent infinite loops

      const step = funnel.steps.find((s) => s.id === stepId)
      if (!step) return null

      return (
        <div className="flex flex-col items-center">
          <div
            className={`p-3 border rounded-md ${funnel.startStepId === step.id ? "border-orange-500" : "border-border"} bg-card mb-2 w-full max-w-xs`}
          >
            <div className="font-medium">{step.pageName}</div>
            <div className="text-xs text-muted-foreground capitalize">{step.type}</div>
          </div>

          {step.type === "upsell" && (
            <div className="grid grid-cols-2 gap-8 w-full max-w-xl">
              <div className="flex flex-col items-center">
                <div className="flex items-center text-xs text-green-600 mb-2">
                  <Check className="h-3 w-3 mr-1" />
                  Yes
                </div>
                <ArrowDown className="h-4 w-4 text-muted-foreground mb-2" />
                {step.nextStepId ? (
                  renderStep(step.nextStepId, depth + 1)
                ) : (
                  <div className="p-2 border border-dashed rounded-md text-xs text-muted-foreground">End of funnel</div>
                )}
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center text-xs text-red-600 mb-2">
                  <X className="h-3 w-3 mr-1" />
                  No thanks
                </div>
                <ArrowDown className="h-4 w-4 text-muted-foreground mb-2" />
                {step.noThanksStepId ? (
                  renderStep(step.noThanksStepId, depth + 1)
                ) : (
                  <div className="p-2 border border-dashed rounded-md text-xs text-muted-foreground">End of funnel</div>
                )}
              </div>
            </div>
          )}

          {step.type !== "upsell" && step.nextStepId && (
            <div className="flex flex-col items-center">
              <ArrowDown className="h-4 w-4 text-muted-foreground my-2" />
              {renderStep(step.nextStepId, depth + 1)}
            </div>
          )}

          {step.type !== "upsell" && !step.nextStepId && step.type !== "thank-you" && (
            <div className="flex flex-col items-center">
              <ArrowDown className="h-4 w-4 text-muted-foreground my-2" />
              <div className="p-2 border border-dashed rounded-md text-xs text-muted-foreground">End of funnel</div>
            </div>
          )}
        </div>
      )
    }

    return renderStep(funnel.startStepId)
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="list">Funnel List</TabsTrigger>
        <TabsTrigger value="create">Create New</TabsTrigger>
        <TabsTrigger value="editor" disabled={!selectedFunnelId}>
          Funnel Editor
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="pt-4">
        {renderFunnelList()}
      </TabsContent>

      <TabsContent value="create" className="pt-4">
        {renderCreateFunnel()}
      </TabsContent>

      <TabsContent value="editor" className="pt-4">
        {renderFunnelEditor()}
      </TabsContent>
    </Tabs>
  )
}
