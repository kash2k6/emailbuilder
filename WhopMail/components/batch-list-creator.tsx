"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { 
  Users, 
  Plus, 
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface BatchListCreatorProps {
  whopUserId: string
  totalMemberCount: number
  subscriptionStatus?: {
    hasActiveSubscription: boolean
    subscription?: {
      planName: string
      contactLimit: number
      planPrice: string
    }
  }
  onListCreated?: () => void
}



export function BatchListCreator({
  whopUserId,
  totalMemberCount,
  subscriptionStatus,
  onListCreated
}: BatchListCreatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [listName, setListName] = useState("")
  const [listDescription, setListDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')


  // Auto-generate list name if empty
  useEffect(() => {
    if (!listName && totalMemberCount > 0) {
      setListName(`All Members (${totalMemberCount.toLocaleString()})`)
    }
  }, [totalMemberCount, listName])

  const handleCreateList = async () => {
    if (!listName.trim()) {
      toast.error('Please enter a list name')
      return
    }

    if (!subscriptionStatus?.hasActiveSubscription) {
      toast.error('Active subscription required')
      return
    }

    setIsCreating(true)
    setProgress(0)
    setProgressMessage('Starting list creation...')

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 90) {
            setProgressMessage('Fetching members from Whop...')
            return prev + 10
          }
          return prev
        })
      }, 1000)

      const response = await fetch('/api/email-lists/instant-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whopUserId,
          listName: listName.trim(),
          listDescription: listDescription.trim() || undefined,
          includeAllMembers: true
        }),
      })

      clearInterval(progressInterval)
      setProgress(100)
      setProgressMessage('List created successfully!')

      const data = await response.json()

      if (data.success) {
        // Show success message
        toast.success(data.message || 'List created successfully! Our team will process your request and sync it to our email platform shortly.')
        setIsOpen(false)
        setListName('')
        setListDescription('')
        if (onListCreated) {
          onListCreated()
        }
      } else {
        toast.error(data.error || 'Failed to create list')
      }
    } catch (error) {
      console.error('Error creating list:', error)
      toast.error('Failed to create list')
    } finally {
      setIsCreating(false)
    }
  }





  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            disabled={!subscriptionStatus?.hasActiveSubscription}
            data-batch-list-creator-trigger
          >
            <Plus className="h-4 w-4 mr-2" />
            Create List
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Create List
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Subscription Check */}
            {!subscriptionStatus?.hasActiveSubscription && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  Active subscription required to create lists. Please upgrade your plan.
                </p>
              </div>
            )}

            {/* Member Count Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Total Members</p>
                    <p className="text-2xl font-bold">{totalMemberCount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Processing Time</p>
                    <p className="text-sm font-medium">
                      {totalMemberCount > 10000 ? '5-10 minutes' : 
                       totalMemberCount > 5000 ? '3-5 minutes' : 
                       totalMemberCount > 1000 ? '1-3 minutes' : 
                       totalMemberCount > 500 ? '30-60 seconds' : '15-30 seconds'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Form */}
          <div className="space-y-4">
              <div>
                <Label htmlFor="listName">List Name</Label>
                <Input
                  id="listName"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Enter list name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="listDescription">Description (Optional)</Label>
                <Textarea
                  id="listDescription"
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  placeholder="Enter list description"
                  className="mt-1"
                  rows={3}
                />
              </div>

              {isCreating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{progressMessage}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800">
                  This will create a list with all {totalMemberCount.toLocaleString()} members. The process may take a few minutes for large lists.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateList}
                  disabled={isCreating || !listName.trim()}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create List
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </div>
            </div>


        </div>
      </DialogContent>
    </Dialog>


    </>
  )
}
