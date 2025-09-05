"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Download, ChevronLeft, ChevronRight, Loader2, Filter, Users, Plus } from "lucide-react"
import type { WhopMembership } from "@/app/types"
import { MemberDetailDialog } from "@/components/member-detail-dialog"
// Removed fetchAllWhopMembers import - no longer needed
import { toast } from "sonner"

interface MembersListProps {
  members: WhopMembership[]
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
  emailPlatform?: string
  apiKey: string // Add apiKey prop to fetch all members when searching
  whopUserId?: string // Add whopUserId for list operations
}

export function MembersList({
  members,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  emailPlatform,
  apiKey,
  whopUserId,
}: MembersListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedMember, setSelectedMember] = useState<WhopMembership | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [emailData, setEmailData] = useState<any>(null)
  const [isLoadingEmailData, setIsLoadingEmailData] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [filteredMembers, setFilteredMembers] = useState<WhopMembership[]>(members)
  const [isSearching, setIsSearching] = useState(false)
  const [allMembers, setAllMembers] = useState<WhopMembership[]>([])
  const [hasLoadedAllMembers, setHasLoadedAllMembers] = useState(false)
  
  // Add to list states
  const [showAddToListDialog, setShowAddToListDialog] = useState(false)
  const [availableAudiences, setAvailableAudiences] = useState<any[]>([])
  const [selectedAudienceId, setSelectedAudienceId] = useState("")
  const [isAddingToList, setIsAddingToList] = useState(false)

  // Load all members when needed for search
  const loadAllMembers = async () => {
    if (hasLoadedAllMembers) return // Don't reload if we already have all members

    setIsSearching(true)
    try {
      // For now, we'll search only within the current page to avoid loading all members
      // This prevents the API from fetching all 365 pages
      setAllMembers(members)
      setHasLoadedAllMembers(true)
    } catch (error) {
      console.error("Error setting current page members for search:", error)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.trim()
    setSearchQuery(query)

    // If search query is not empty, load all members for global search
    if (query && !hasLoadedAllMembers && !isSearching) {
      loadAllMembers()
    }
  }

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
  }

  // Update filtered members when search query, status filter, or members change
  useEffect(() => {
    let membersToFilter = members

    // If we have all members loaded and there's a search query, use all members
    if (hasLoadedAllMembers && searchQuery) {
      membersToFilter = allMembers
    }

    let filtered = membersToFilter

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((member) => {
        const memberStatus = member.status?.toLowerCase() || "inactive"
        const memberValid = member.valid || false
        
        switch (statusFilter) {
          case "active":
            return memberStatus === "active" && memberValid
          case "canceled":
            return memberStatus === "canceled" || memberStatus === "cancelled"
          case "expired":
            return memberStatus === "expired" || !memberValid
          case "trial":
            return memberStatus === "trial" || memberStatus === "trialing"
          case "expiring":
            return memberStatus === "expiring"
          default:
            return true
        }
      })
    }

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (member) =>
          member.email.toLowerCase().includes(query) ||
          (member.name && member.name.toLowerCase().includes(query)) ||
          (member.username && member.username.toLowerCase().includes(query)) ||
          (member.product && typeof member.product === 'string' && member.product.toLowerCase().includes(query)) ||
          (member.status && member.status.toLowerCase().includes(query)) ||
          (member.user && member.user.toLowerCase().includes(query)),
      )
    }

    setFilteredMembers(filtered)
  }, [searchQuery, statusFilter, members, allMembers, hasLoadedAllMembers])

  useEffect(() => {
    async function fetchEmailData() {
      if (!selectedMember || !detailDialogOpen || !emailPlatform) return

      setIsLoadingEmailData(true)
      setEmailData(null)
      setEmailError(null)

      let errorMessage: string | null = null
      let response: Response | null = null

      try {
        console.log(`Fetching email data for ${selectedMember.email} from ${emailPlatform}`)

        // Get the authentication token
        const token = localStorage.getItem("emailsync_access_token")

        response = await fetch(`/api/email-data?email=${encodeURIComponent(selectedMember.email)}`, {
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        })

        console.log(`Email data API response status: ${response.status}`)

        // Check if the response is OK first
        if (!response.ok) {
          // Try to get the error message from the response
          errorMessage = `Failed to fetch email data: ${response.status} ${response.statusText}`

          try {
            // Try to parse as JSON, but be prepared for non-JSON responses
            const errorData = await response.json()
            if (errorData && errorData.error) {
              errorMessage = errorData.error
            }
          } catch (jsonError) {
            // If JSON parsing fails, try to get the text content
            try {
              const textContent = await response.text()
              if (textContent) {
                // Limit the text content to a reasonable length
                const truncatedContent = textContent.substring(0, 100) + (textContent.length > 100 ? "..." : "")
                errorMessage = `Server error: ${truncatedContent}`
              }
            } catch (textError) {
              // If even text extraction fails, use the default error message
              console.error("Failed to extract error text:", textError)
            }
          }

          // For 404 errors (member not found), show a more user-friendly message
          if (response.status === 404 && errorMessage?.includes("Member not found")) {
            setEmailError(
              `This member's email (${selectedMember.email}) was not found in your ${emailPlatform} audience. They may need to be added to your list first.`,
            )
          } else if (response.status === 500) {
            setEmailError(`Server error occurred. Please try again later or check the console for details.`)
          } else {
            setEmailError(errorMessage)
          }

          setIsLoadingEmailData(false)
          return
        }

        // If response is OK, try to parse the JSON
        const data = await response.json()
        console.log("Email data fetched successfully:", data)
        setEmailData(data)
      } catch (error) {
        errorMessage = `Error fetching email data: ${error instanceof Error ? error.message : String(error)}`
        console.error(errorMessage)
        setEmailError(errorMessage)
      } finally {
        setIsLoadingEmailData(false)
      }
    }

    // Call the function
    fetchEmailData()
  }, [selectedMember, detailDialogOpen, emailPlatform])

  const handleExport = () => {
    // Create CSV content
    const headers = ["Email", "Name", "Username", "Product", "Status", "Valid", "Expires At", "Created At"]
    const csvContent = [
      headers.join(","),
      ...filteredMembers.map((member) =>
        [
          `"${member.email}"`,
          `"${member.name || ""}"`,
          `"${member.username || ""}"`,
          `"${member.product || ""}"`,
          `"${member.status || ""}"`,
          `"${member.valid ? "Yes" : "No"}"`,
          `"${formatDate(typeof member.expires_at === 'number' ? member.expires_at : 0)}"`,
          `"${formatDate(typeof member.created_at === 'number' ? member.created_at : 0)}"`,
        ].join(","),
      ),
    ].join("\n")

    // Create a blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `whop-members-${statusFilter !== "all" ? statusFilter : "all"}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Get status badge variant based on status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "expiring":
        return "warning"
      case "trial":
        return "secondary"
      case "expired":
      case "inactive":
        return "outline"
      default:
        return "outline"
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

  // Clear search and reset to current page view
  const clearSearch = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setFilteredMembers(members)
  }

  const handleExportCSV = () => {
    if (!filteredMembers?.length) return

    // Create CSV header
    const csvHeader = "Email,Name,Status,Product,Expires At\n"

    // Create CSV rows with name included
    const csvRows = filteredMembers.map((member) => {
      const expiresDate = member.expires_at && typeof member.expires_at === 'number' ? new Date(member.expires_at * 1000).toLocaleDateString() : "N/A"

      // Include name in the CSV export
      const name = member.name || member.username || "Unknown"

      return `${member.email},"${name}",${member.status},${member.product},${expiresDate}`
    })

    // Combine header and rows
    const csvString = csvHeader + csvRows.join("\n")

    // Create a blob and download
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `whop-members-${statusFilter !== "all" ? statusFilter : "all"}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToCsv = () => {
    if (!filteredMembers?.length) return

    // Create CSV header
    const csvHeader = ["Email", "Name", "Username", "Status", "Product", "Expires At"]

    // Create CSV rows
    const csvRows = filteredMembers.map((member) => {
      const expiresDate = member.expires_at && typeof member.expires_at === 'number' ? new Date(member.expires_at * 1000).toLocaleDateString() : "N/A"

      return [
        member.email || "No Email",
        member.name || "", // Include name in CSV export
        member.username || "",
        member.status || "unknown",
        member.product || "Unknown Product",
        expiresDate,
      ]
    })

    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `whop-members-${statusFilter !== "all" ? statusFilter : "all"}-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Whop Members</CardTitle>
          {emailPlatform && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>•</span>
              <span>Synced to {emailPlatform}</span>
            </div>
          )}
        </div>
        <CardDescription>View and manage your Whop members.</CardDescription>
        <div className="flex items-center gap-2">
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
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="active">Active Members</SelectItem>
              <SelectItem value="canceled">Canceled Members</SelectItem>
              <SelectItem value="expired">Expired Members</SelectItem>
              <SelectItem value="trial">Trial Members</SelectItem>
              <SelectItem value="expiring">Expiring Soon</SelectItem>
            </SelectContent>
          </Select>
                    {whopUserId && filteredMembers.length > 0 && (
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
                    {availableAudiences.length === 0 ? (
                      <div className="mt-1 p-3 border rounded-md bg-muted">
                        <p className="text-sm text-muted-foreground">
                          No email lists found. You need to create an email list first.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Go to the EmailSync tab to create your first email list.
                        </p>
                      </div>
                    ) : (
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
                    )}
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
                      disabled={!selectedAudienceId || isAddingToList || availableAudiences.length === 0}
                    >
                      {isAddingToList ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add to List
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" onClick={exportToCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
        {(searchQuery || statusFilter !== "all") && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {searchQuery && hasLoadedAllMembers 
                ? `Found ${filteredMembers.length} results across all pages`
                : `Showing ${filteredMembers.length} members`
              }
              {statusFilter !== "all" && ` (filtered by ${statusFilter})`}
            </p>
            <Button variant="ghost" size="sm" onClick={clearSearch}>
              Clear filters
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Name</TableHead>
                <TableHead className="hidden lg:table-cell">Username</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isSearching ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="animate-pulse bg-muted h-8"></TableCell>
                    <TableCell className="animate-pulse bg-muted h-8 hidden md:table-cell"></TableCell>
                    <TableCell className="animate-pulse bg-muted h-8 hidden lg:table-cell"></TableCell>
                    <TableCell className="animate-pulse bg-muted h-8"></TableCell>
                  </TableRow>
                ))
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    {searchQuery ? "No matching members found." : "No memberships found."}
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
                    <TableCell className="font-medium">{member.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{member.name || "N/A"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{member.username || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(member.status || "inactive")}>
                        {capitalizeFirstLetter(member.status || "inactive")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls - only show when not searching or filtering */}
        {!searchQuery && statusFilter === "all" && (
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous Page</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next Page</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <MemberDetailDialog
        member={selectedMember}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        emailPlatform={emailPlatform}
        isLoadingEmailData={isLoadingEmailData}
        emailData={emailData}
      />
    </Card>
  )
}

// Helper function to format Unix timestamp to readable date
function formatDate(timestamp: number): string {
  if (!timestamp) return "N/A"

  try {
    const date = new Date(timestamp * 1000) // Convert seconds to milliseconds
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch (e) {
    return "Invalid Date"
  }
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
