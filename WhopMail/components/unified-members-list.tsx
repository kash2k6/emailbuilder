"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Download, ChevronLeft, ChevronRight, Loader2, Filter, Users, Plus, Upload, Trash2 } from "lucide-react"
import type { WhopMembership } from "@/app/types"
import { MemberDetailDialog } from "@/components/member-detail-dialog"
import { ManualListUpload } from "@/components/manual-list-upload"
import { EnhancedBatchListCreator } from "@/components/enhanced-batch-list-creator"
// Removed fetchAllWhopMembers import - no longer needed
import { toast } from "sonner"

interface ManualMember {
  id: string
  email: string
  first_name?: string
  last_name?: string
  status: 'manual'
  source: string
  uploaded_at: string
  created_at: string
  metadata?: Record<string, any>
}

interface UnifiedMember {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  username?: string
  status: string
  type: 'whop' | 'manual'
  created_at: string
  metadata?: Record<string, any>
}

interface UnifiedMembersListProps {
  whopMembers: WhopMembership[]
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
  emailPlatform?: string
  apiKey: string
  whopUserId?: string
  totalWhopMembers?: number
  subscriptionStatus?: {
    hasActiveSubscription: boolean
    subscription?: {
      planName: string
      contactLimit: number
      planPrice: string
    }
  }
}

export function UnifiedMembersList({
  whopMembers,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  emailPlatform,
  apiKey,
  whopUserId,
  totalWhopMembers,
  subscriptionStatus,
}: UnifiedMembersListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedMember, setSelectedMember] = useState<UnifiedMember | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [emailData, setEmailData] = useState<any>(null)
  const [isLoadingEmailData, setIsLoadingEmailData] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [filteredMembers, setFilteredMembers] = useState<UnifiedMember[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [allWhopMembers, setAllWhopMembers] = useState<WhopMembership[]>([])
  const [manualMembers, setManualMembers] = useState<ManualMember[]>([])
  const [hasLoadedAllMembers, setHasLoadedAllMembers] = useState(false)
  const [showManualUpload, setShowManualUpload] = useState(false)
  
  // Manual members pagination
  const [manualMembersPage, setManualMembersPage] = useState(1)
  const [manualMembersTotalPages, setManualMembersTotalPages] = useState(1)
  const [manualMembersTotal, setManualMembersTotal] = useState(0)
  const [isLoadingManualMembers, setIsLoadingManualMembers] = useState(false)
  
  // Delete functionality
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'all' | 'selected'>('all')
  
  // Add to list states
  const [showAddToListDialog, setShowAddToListDialog] = useState(false)
  const [availableAudiences, setAvailableAudiences] = useState<any[]>([])
  const [selectedAudienceId, setSelectedAudienceId] = useState("")
  const [isAddingToList, setIsAddingToList] = useState(false)

  // Load manual members with pagination
  const loadManualMembers = async (page: number = 1) => {
    if (!whopUserId) return

    setIsLoadingManualMembers(true)
    try {
      const response = await fetch(`/api/manual-members?whopUserId=${whopUserId}&page=${page}&limit=50`)
      const data = await response.json()
      
      if (data.success) {
        setManualMembers(data.data.members || [])
        setManualMembersPage(page)
        setManualMembersTotalPages(data.data.pagination.totalPages)
        setManualMembersTotal(data.data.pagination.total)
        console.log(`Loaded ${data.data.members.length} manual members from page ${page} of ${data.data.pagination.totalPages}`)
      } else {
        console.error('Failed to load manual members:', data.error)
        toast.error('Failed to load manual members')
      }
    } catch (error) {
      console.error('Error loading manual members:', error)
      toast.error('Error loading manual members')
    } finally {
      setIsLoadingManualMembers(false)
    }
  }

  // Load available audiences for adding members to lists
  const loadAvailableAudiences = async () => {
    if (!whopUserId) {
      console.log('No whopUserId provided')
      toast.error('User ID not available')
      return
    }
    
    console.log('Loading audiences for whopUserId:', whopUserId)
    
    try {
      const response = await fetch(`/api/email-lists?whopUserId=${whopUserId}`)
      console.log('Email lists API response status:', response.status)
      
      const data = await response.json()
      console.log('Email lists API response data:', data)
      
      if (data.success) {
        setAvailableAudiences(data.audiences || [])
        console.log('Set available audiences:', data.audiences)
      } else {
        console.error('Failed to load email lists:', data.error)
        toast.error(data.error || 'Failed to load email lists')
      }
    } catch (error) {
      console.error('Error loading email lists:', error)
      toast.error('Failed to load email lists')
    }
  }

  // Add filtered members to selected list
  const handleAddFilteredMembersToList = async () => {
    if (!selectedAudienceId) {
      toast.error('Please select a list')
      return
    }

    if (filteredMembers.length === 0) {
      toast.error('No members to add')
      return
    }

    setIsAddingToList(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const member of filteredMembers) {
        if (!member.email) continue

        const response = await fetch('/api/email-lists/add-member', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audienceId: selectedAudienceId,
            memberData: {
              email: member.email,
              firstName: member.name?.split(' ')[0] || '',
              lastName: member.name?.split(' ').slice(1).join(' ') || '',
              fullName: member.name || member.username || member.email
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
        setShowAddToListDialog(false)
        setSelectedAudienceId("")
      } else {
        toast.error('Failed to add any members to the list')
      }
    } catch (error) {
      console.error('Error adding members to list:', error)
      toast.error('Failed to add members to the list')
    } finally {
      setIsAddingToList(false)
    }
  }

  // Load all Whop members when needed for search
  const loadAllWhopMembers = async () => {
    if (hasLoadedAllMembers) return

    setIsSearching(true)
    try {
      // For now, we'll search only within the current page to avoid loading all members
      // This prevents the API from fetching all 365 pages
      setAllWhopMembers(whopMembers)
      setHasLoadedAllMembers(true)
    } catch (error) {
      console.error("Error setting current page members for search:", error)
    } finally {
      setIsSearching(false)
    }
  }

  // Combine Whop and manual members
  const combineMembers = (): UnifiedMember[] => {
    const whopMembersData = (hasLoadedAllMembers && searchQuery ? allWhopMembers : whopMembers).map(member => ({
      id: member.id,
      email: member.email || '',
      name: member.name,
      username: member.username,
      status: member.status || 'unknown',
      type: 'whop' as const,
      created_at: member.created_at || new Date().toISOString(),
      metadata: {}
    }))

    const manualMembersData = manualMembers.map(member => ({
      id: member.id,
      email: member.email,
      firstName: member.first_name,
      lastName: member.last_name,
      name: member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : (member.first_name || member.last_name || ''),
      username: undefined, // Manual members don't have usernames
      status: member.status,
      type: 'manual' as const,
      created_at: member.created_at,
      metadata: member.metadata || {}
    }))

    return [...whopMembersData, ...manualMembersData]
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.trim()
    setSearchQuery(query)

    if (query && !hasLoadedAllMembers && !isSearching) {
      loadAllWhopMembers()
    }
  }

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
  }

  // Handle type filter change
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
  }

  // Update filtered members
  useEffect(() => {
    let allMembers = combineMembers()

    // Apply type filter
    if (typeFilter !== "all") {
      allMembers = allMembers.filter(member => member.type === typeFilter)
    }

    // Apply status filter
    if (statusFilter !== "all") {
      allMembers = allMembers.filter((member) => {
        const memberStatus = member.status?.toLowerCase() || "inactive"
        
        switch (statusFilter) {
          case "active":
            return memberStatus === "active" || (member.type === 'manual' && memberStatus === 'manual')
          case "canceled":
            return memberStatus === "canceled" || memberStatus === "cancelled"
          case "expired":
            return memberStatus === "expired"
          case "trial":
            return memberStatus === "trial" || memberStatus === "trialing"
          case "expiring":
            return memberStatus === "expiring"
          case "manual":
            return member.type === 'manual'
          default:
            return true
        }
      })
    }

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      allMembers = allMembers.filter(
        (member) =>
          member.email.toLowerCase().includes(query) ||
          (member.name && member.name.toLowerCase().includes(query)) ||
          (member.firstName && member.firstName.toLowerCase().includes(query)) ||
          (member.lastName && member.lastName.toLowerCase().includes(query)) ||
          (member.username && member.username.toLowerCase().includes(query))
      )
    }

    setFilteredMembers(allMembers)
  }, [searchQuery, statusFilter, typeFilter, whopMembers, allWhopMembers, manualMembers, hasLoadedAllMembers])

  // Load manual members on mount
  useEffect(() => {
    loadManualMembers(1)
  }, [whopUserId])

  const handleUploadComplete = () => {
    loadManualMembers(1) // Reset to first page
    setShowManualUpload(false)
  }

  // Delete manual members
  const handleDeleteManualMembers = async () => {
    if (!whopUserId) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/manual-members/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whopUserId,
          deleteAll: true
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`Successfully deleted ${data.data.deletedCount} manual members`)
        setManualMembers([])
        setManualMembersTotal(0)
        setManualMembersPage(1)
        setManualMembersTotalPages(1)
        setShowDeleteDialog(false)
      } else {
        toast.error(data.error || 'Failed to delete manual members')
      }
    } catch (error) {
      console.error('Error deleting manual members:', error)
      toast.error('Error deleting manual members')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (member: UnifiedMember) => {
    if (member.type === 'manual') {
      return <Badge variant="secondary">Manual</Badge>
    }

    const status = member.status?.toLowerCase()
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>
      case 'trialing':
        return <Badge variant="outline">Trialing</Badge>
      case 'canceled':
      case 'cancelled':
        return <Badge variant="destructive">Canceled</Badge>
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>
      default:
        return <Badge variant="outline">{member.status || 'Unknown'}</Badge>
    }
  }

  const whopMembersCount = totalWhopMembers || whopMembers.length
  const manualMembersCount = manualMembers.length
  const totalMembers = whopMembersCount + manualMembersTotal
  
  // Calculate plan usage - use total Whop members + manual members for accurate count
  const totalContactCount = (totalWhopMembers || whopMembers.length) + manualMembersTotal
  const contactLimit = subscriptionStatus?.subscription?.contactLimit || 3000
  const planName = subscriptionStatus?.subscription?.planName || 'Basic'
  const usagePercentage = Math.min((totalContactCount / contactLimit) * 100, 100)
  const remainingContacts = Math.max(contactLimit - totalContactCount, 0)
  const isNearLimit = usagePercentage >= 80
  const isOverLimit = totalContactCount > contactLimit

  return (
    <div className="space-y-6">
      {/* Manual Upload Section */}
      {showManualUpload && (
        <ManualListUpload 
          whopUserId={whopUserId} 
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Members
              </CardTitle>
              <CardDescription>
                View and manage your Whop members and manually uploaded contacts.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowManualUpload(!showManualUpload)}
              >
                <Upload className="h-4 w-4 mr-2" />
                {showManualUpload ? 'Hide Upload' : 'Upload Manual List'}
              </Button>
              {manualMembersTotal > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Manual
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{whopMembersCount}</div>
              <div className="text-sm text-muted-foreground">Whop Members</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{manualMembersTotal}</div>
              <div className="text-sm text-muted-foreground">Manual Members</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {manualMembersTotal > 0 ? Math.round((manualMembersTotal / totalMembers) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Manual %</div>
            </div>
          </div>
          
          {/* Plan Usage Indicator */}
          {subscriptionStatus?.hasActiveSubscription && (
            <div className={`p-4 border rounded-lg mb-6 ${
              isOverLimit ? 'border-red-400 bg-red-950/20' : 
              isNearLimit ? 'border-yellow-400 bg-yellow-950/20' : 
              'border-orange-400 bg-orange-950/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    isOverLimit ? 'bg-red-500' : 
                    isNearLimit ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}></div>
                  <span className="font-medium">Plan Usage</span>
                </div>
                <span className="text-sm text-muted-foreground">{planName} Plan</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{totalContactCount.toLocaleString()} / {contactLimit.toLocaleString()} contacts</span>
                <span className={`text-sm font-medium ${
                  isOverLimit ? 'text-red-600' : 
                  isNearLimit ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {Math.round(usagePercentage)}% used
                </span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isOverLimit ? 'bg-red-400' : 
                    isNearLimit ? 'bg-yellow-400' : 
                    'bg-orange-400'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
              {isOverLimit && (
                <div className="text-sm text-red-600 mt-2 font-medium">
                  ⚠️ You've exceeded your plan limit. Please upgrade to continue adding members.
                </div>
              )}
              {isNearLimit && !isOverLimit && (
                <div className="text-sm text-yellow-600 mt-2">
                  ⚠️ You're approaching your plan limit. {remainingContacts.toLocaleString()} contacts remaining.
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={totalPages > 1 ? "Search current page members..." : "Search members..."}
                className="pl-8"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {totalPages > 1 && (
                <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">
                  Search limited to current page ({currentPage} of {totalPages})
                </div>
              )}
            </div>
            <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="whop">Whop Members</SelectItem>
                <SelectItem value="manual">Manual Members</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Members</SelectItem>
                <SelectItem value="canceled">Canceled Members</SelectItem>
                <SelectItem value="expired">Expired Members</SelectItem>
                <SelectItem value="trial">Trial Members</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="manual">Manual Members</SelectItem>
              </SelectContent>
            </Select>
            {whopUserId && (
              <div className="flex gap-2">
                {filteredMembers.length > 0 && (
                  <Dialog open={showAddToListDialog} onOpenChange={setShowAddToListDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          console.log('Add to List button clicked, whopUserId:', whopUserId)
                          loadAvailableAudiences()
                          setShowAddToListDialog(true)
                        }}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Add to List
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add {filteredMembers.length} Member{filteredMembers.length > 1 ? 's' : ''} to List</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Select Email List</label>
                          <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Choose a list..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAudiences.map((audience) => (
                                <SelectItem key={audience.id} value={audience.id}>
                                  {audience.name} ({audience.member_count || 0} members)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          This will add {filteredMembers.length} member{filteredMembers.length > 1 ? 's' : ''} to the selected list.
                          {statusFilter !== "all" && ` Filtered by: ${statusFilter}`}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowAddToListDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAddFilteredMembersToList}
                            disabled={!selectedAudienceId || isAddingToList}
                          >
                            {isAddingToList ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              'Add to List'
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* Batch List Creator for All Members */}
                {totalWhopMembers && totalWhopMembers > 0 && (
                  <EnhancedBatchListCreator
                    whopUserId={whopUserId}
                    totalMemberCount={totalWhopMembers}
                    subscriptionStatus={subscriptionStatus}
                    onListCreated={() => {
                      // Refresh the page or update the UI as needed
                      window.location.reload()
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Members Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow 
                      key={member.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedMember(member)
                        setDetailDialogOpen(true)
                      }}
                    >
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.name || '-'}</TableCell>
                      <TableCell>{member.username || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={member.type === 'whop' ? 'default' : 'secondary'}>
                          {member.type === 'whop' ? 'Whop' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(member)}</TableCell>
                      <TableCell>
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Manual Members Pagination */}
          {manualMembersTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Manual Members: Page {manualMembersPage} of {manualMembersTotalPages} ({manualMembersTotal} total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadManualMembers(manualMembersPage - 1)}
                  disabled={manualMembersPage === 1 || isLoadingManualMembers}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadManualMembers(manualMembersPage + 1)}
                  disabled={manualMembersPage === manualMembersTotalPages || isLoadingManualMembers}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Detail Dialog */}
      {selectedMember && (
        <MemberDetailDialog
          member={selectedMember}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          emailPlatform={emailPlatform}
        />
      )}

      {/* Delete Manual Members Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Manual Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Are you sure you want to delete all {manualMembersTotal.toLocaleString()} manual members? This action cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteManualMembers}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete All Manual Members'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
