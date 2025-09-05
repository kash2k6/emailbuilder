"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  Building2, 
  Users, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react"
import { 
  getAppBuilderApiKeys, 
  addAppBuilderApiKey, 
  updateAppBuilderApiKey, 
  deleteAppBuilderApiKey,
  type AppBuilderApiKey 
} from "@/app/actions/app-builder"

interface AppBuilderApiKeysProps {
  whopUserId: string
}

export function AppBuilderApiKeys({ whopUserId }: AppBuilderApiKeysProps) {
  const [apiKeys, setApiKeys] = useState<AppBuilderApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedApiKey, setSelectedApiKey] = useState<AppBuilderApiKey | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Form states
  const [apiKeyName, setApiKeyName] = useState("")
  const [whopApiKey, setWhopApiKey] = useState("")
  const [appId, setAppId] = useState("")

  useEffect(() => {
    loadApiKeys()
  }, [whopUserId])

  const loadApiKeys = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await getAppBuilderApiKeys(whopUserId)
      if (result.success) {
        setApiKeys(result.apiKeys || [])
      } else {
        setError(result.error || 'Failed to load API keys')
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
      setError('Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddApiKey = async () => {
    if (!apiKeyName.trim() || !whopApiKey.trim()) {
      setSubmitError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await addAppBuilderApiKey(whopUserId, apiKeyName.trim(), whopApiKey.trim(), appId.trim() || undefined)
      if (result.success) {
        setShowAddDialog(false)
        resetForm()
        await loadApiKeys()
      } else {
        setSubmitError(result.error || 'Failed to add API key')
      }
    } catch (error) {
      console.error('Error adding API key:', error)
      setSubmitError('Failed to add API key')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditApiKey = async () => {
    if (!selectedApiKey || !apiKeyName.trim()) {
      setSubmitError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await updateAppBuilderApiKey(selectedApiKey.id, {
        api_key_name: apiKeyName.trim(),
        whop_api_key: whopApiKey.trim() || undefined,
        app_id: appId.trim() || null
      })
      if (result.success) {
        setShowEditDialog(false)
        resetForm()
        await loadApiKeys()
      } else {
        setSubmitError(result.error || 'Failed to update API key')
      }
    } catch (error) {
      console.error('Error updating API key:', error)
      setSubmitError('Failed to update API key')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteApiKey = async () => {
    if (!selectedApiKey) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await deleteAppBuilderApiKey(selectedApiKey.id)
      if (result.success) {
        setShowDeleteDialog(false)
        setSelectedApiKey(null)
        await loadApiKeys()
      } else {
        setSubmitError(result.error || 'Failed to delete API key')
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      setSubmitError('Failed to delete API key')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setApiKeyName("")
    setWhopApiKey("")
    setAppId("")
    setSelectedApiKey(null)
    setSubmitError(null)
  }

  const openEditDialog = (apiKey: AppBuilderApiKey) => {
    setSelectedApiKey(apiKey)
    setApiKeyName(apiKey.api_key_name)
    setWhopApiKey("") // Don't show the actual API key for security
    setAppId(apiKey.app_id || "")
    setShowEditDialog(true)
  }

  const openDeleteDialog = (apiKey: AppBuilderApiKey) => {
    setSelectedApiKey(apiKey)
    setShowDeleteDialog(true)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              App Builder API Keys
            </CardTitle>
            <CardDescription>
              Manage API keys to access companies that installed your apps but didn't convert
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add API Key
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading API keys...</span>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No API Keys</h3>
            <p className="text-muted-foreground mb-4">
              Add your first API key to start accessing companies that installed your apps
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First API Key
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{apiKey.api_key_name}</h3>
                      <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                        {apiKey.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {apiKey.app_id && (
                      <p className="text-sm text-muted-foreground mb-2">
                        App ID: {apiKey.app_id}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Last used: {formatDate(apiKey.last_used_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Created: {formatDate(apiKey.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(apiKey)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(apiKey)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add API Key Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add App Builder API Key</DialogTitle>
            <DialogDescription>
              Add a Whop API key to access companies that installed your app
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKeyName">API Key Name *</Label>
              <Input
                id="apiKeyName"
                placeholder="e.g., My First App, SaaS Tool"
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="whopApiKey">Whop API Key *</Label>
              <Input
                id="whopApiKey"
                type="password"
                placeholder="Enter your Whop API key"
                value={whopApiKey}
                onChange={(e) => setWhopApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This should be the API key for your app, not your personal Whop API key
              </p>
            </div>
            <div>
              <Label htmlFor="appId">App ID (Optional)</Label>
              <Input
                id="appId"
                placeholder="Enter your app ID"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
            </div>
            {submitError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddApiKey} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add API Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit API Key Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit App Builder API Key</DialogTitle>
            <DialogDescription>
              Update your API key information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editApiKeyName">API Key Name *</Label>
              <Input
                id="editApiKeyName"
                placeholder="e.g., My First App, SaaS Tool"
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editWhopApiKey">Whop API Key (Optional)</Label>
              <Input
                id="editWhopApiKey"
                type="password"
                placeholder="Leave blank to keep current API key"
                value={whopApiKey}
                onChange={(e) => setWhopApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only enter a new API key if you want to change it
              </p>
            </div>
            <div>
              <Label htmlFor="editAppId">App ID (Optional)</Label>
              <Input
                id="editAppId"
                placeholder="Enter your app ID"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
            </div>
            {submitError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditApiKey} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update API Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete API Key Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedApiKey?.api_key_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteApiKey} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete API Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 