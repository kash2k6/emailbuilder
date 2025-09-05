"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Users, Mail, Search, X, Trash2, Download } from 'lucide-react'

interface ListManagerProps {
  whopUserId: string
  audiences: any[]
  onListCreated: () => void
  onMemberAdded: () => void
  availableMembers?: any[] // Add this prop to use already loaded members
}

interface Member {
  id: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
}

export function ListManager({ whopUserId, audiences, onListCreated, onMemberAdded, availableMembers: propMembers }: ListManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isDeletingList, setIsDeletingList] = useState(false)
  const [listToDelete, setListToDelete] = useState<string | null>(null)
  const [availableMembers, setAvailableMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAudienceId, setSelectedAudienceId] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  
  // Form states for creating new list
  const [listName, setListName] = useState('')
  const [listDescription, setListDescription] = useState('')

  // Load available members when dialog opens
  useEffect(() => {
    if (showAddMemberDialog) {
      loadAvailableMembers()
    }
  }, [showAddMemberDialog])

  // Filter members based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = availableMembers.filter(member =>
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.full_name && member.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredMembers(filtered)
    } else {
      setFilteredMembers(availableMembers)
    }
  }, [searchQuery, availableMembers])

  const loadAvailableMembers = async () => {
    // If we have members passed as props, use those instead of making an API call
    if (propMembers && propMembers.length > 0) {
      const formattedMembers = propMembers.map(member => ({
        id: member.id,
        email: member.email,
        full_name: member.name || member.username,
        first_name: member.name ? member.name.split(' ')[0] : member.username,
        last_name: member.name && member.name.includes(' ') ? member.name.split(' ').slice(1).join(' ') : undefined
      }))
      setAvailableMembers(formattedMembers)
      setFilteredMembers(formattedMembers)
      return
    }
    
    // Fallback to API call if no members provided
    try {
      const response = await fetch(`/api/email-lists/available-members?whopUserId=${whopUserId}`)
      const data = await response.json()
      
      if (data.success) {
        setAvailableMembers(data.members || [])
        setFilteredMembers(data.members || [])
      } else {
        toast.error(data.error || 'Failed to load available members')
      }
    } catch (error) {
      console.error('Error loading available members:', error)
      toast.error('Failed to load available members')
    }
  }

  const handleCreateList = async () => {
    if (!listName.trim()) {
      toast.error('Please enter a list name')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/email-lists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whopUserId,
          listName: listName.trim(),
          description: listDescription.trim() || undefined
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`List "${listName}" created successfully!`)
        setListName('')
        setListDescription('')
        setShowCreateDialog(false)
        onListCreated()
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

  const handleAddMembers = async () => {
    if (!selectedAudienceId) {
      toast.error('Please select a list')
      return
    }

    if (selectedMembers.size === 0) {
      toast.error('Please select at least one member')
      return
    }

    setIsAddingMember(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const memberId of selectedMembers) {
        const member = availableMembers.find(m => m.id === memberId)
        if (!member) continue

        const response = await fetch('/api/email-lists/add-member', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audienceId: selectedAudienceId,
            memberData: {
              email: member.email,
              firstName: member.first_name,
              lastName: member.last_name,
              fullName: member.full_name
            }
          }),
        })

        const data = await response.json()
        
        if (data.success) {
          successCount++
        } else {
          errorCount++
          console.error(`Failed to add ${member.email}:`, data.error)
        }
      }

      if (successCount > 0) {
        toast.success(`Added ${successCount} member${successCount > 1 ? 's' : ''} to the list`)
        if (errorCount > 0) {
          toast.error(`${errorCount} member${errorCount > 1 ? 's' : ''} failed to add`)
        }
        setSelectedMembers(new Set())
        setShowAddMemberDialog(false)
        onMemberAdded()
      } else {
        toast.error('Failed to add any members to the list')
      }
    } catch (error) {
      console.error('Error adding members:', error)
      toast.error('Failed to add members to the list')
    } finally {
      setIsAddingMember(false)
    }
  }

  const toggleMemberSelection = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)
  }

  const selectAllMembers = () => {
    setSelectedMembers(new Set(filteredMembers.map(m => m.id)))
  }

  const clearSelection = () => {
    setSelectedMembers(new Set())
  }

  const handleDeleteList = async (audienceId: string) => {
    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      return
    }

    setIsDeletingList(true)
    setListToDelete(audienceId)
    
    try {
      const response = await fetch(`/api/email-lists/delete?audienceId=${audienceId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('List deleted successfully!')
        onListCreated() // Refresh the lists
      } else {
        toast.error(data.error || 'Failed to delete list')
      }
    } catch (error) {
      console.error('Error deleting list:', error)
      toast.error('Failed to delete list')
    } finally {
      setIsDeletingList(false)
      setListToDelete(null)
    }
  }

  const handleExport = async (audienceId: string, audienceName: string, format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await fetch('/api/email-lists/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audienceId,
          whopUserId,
          format
        }),
      })

      if (response.ok) {
        // Create download link
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${audienceName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success(`${format.toUpperCase()} export completed!`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-4">
      {/* Create New List Button */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create New List
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Email List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="listName">List Name *</Label>
              <Input
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Enter list name..."
                disabled={isCreating}
              />
            </div>
            <div>
              <Label htmlFor="listDescription">Description (Optional)</Label>
              <Textarea
                id="listDescription"
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                placeholder="Enter list description..."
                rows={3}
                disabled={isCreating}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateList} 
                disabled={isCreating || !listName.trim()}
                className="flex-1"
              >
                {isCreating ? 'Creating...' : 'Create List'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Members to List Button */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Users className="h-4 w-4 mr-2" />
            Add Members to List
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Members to List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* List Selection */}
            <div>
              <Label htmlFor="audienceSelect">Select List</Label>
              <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a list..." />
                </SelectTrigger>
                <SelectContent>
                  {audiences.map((audience) => (
                    <SelectItem key={audience.id} value={audience.id}>
                      {audience.name} ({audience.member_count} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Select Members</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllMembers}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.trim())}
                  className="pl-10"
                />
              </div>

              {/* Members List */}
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {searchQuery ? 'No members found' : 'No available members. Members will load automatically when available.'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`p-3 cursor-pointer hover:bg-muted ${
                          selectedMembers.has(member.id) ? 'bg-muted' : ''
                        }`}
                        onClick={() => toggleMemberSelection(member.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">
                              {member.full_name || member.email}
                            </div>
                            {member.full_name && (
                              <div className="text-sm text-muted-foreground">
                                {member.email}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedMembers.has(member.id) && (
                              <Badge variant="default" className="text-xs">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={handleAddMembers} 
                disabled={isAddingMember || selectedMembers.size === 0 || !selectedAudienceId}
                className="flex-1"
              >
                {isAddingMember ? 'Adding...' : `Add ${selectedMembers.size} Member${selectedMembers.size !== 1 ? 's' : ''}`}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddMemberDialog(false)}
                disabled={isAddingMember}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  )
} 