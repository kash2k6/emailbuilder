"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  Building2, 
  Users, 
  Mail, 
  Calendar,
  AlertCircle,
  Loader2,
  Search,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
  MessageSquare,
  Send
} from "lucide-react"
import { 
  fetchAllCompaniesForUser,
  fetchMembershipsForFiltering,
  getAppBuilderApiKeys,
  addCompaniesToMembers,
  fetchAdditionalCompanyPages,
  type WhopCompany,
  type WhopMembership
} from "@/app/actions/app-builder"
import { getUserEmailAudiences, createEmailSyncAudience, syncAudienceToResend } from "@/app/actions/emailsync"
import { ContactDetailsDialog } from "@/components/contact-details-dialog"
import { useToast } from "@/hooks/use-toast"

interface AppBuilderCompaniesProps {
  whopUserId: string
}

export function AppBuilderCompanies({ whopUserId }: AppBuilderCompaniesProps) {
  const { toast } = useToast()
  const [companies, setCompanies] = useState<WhopCompany[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [selectedApiKeyFilter, setSelectedApiKeyFilter] = useState<string>("all")

  const [availableApiKeys, setAvailableApiKeys] = useState<{ id: string; name: string }[]>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  // Manual pagination state for loading more data
  const [loadedPages, setLoadedPages] = useState<{ [apiKeyId: string]: number }>({})
  const [apiKeyTotalPages, setApiKeyTotalPages] = useState<{ [apiKeyId: string]: number }>({})
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Email functionality state
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())
  const [isAddingToMembers, setIsAddingToMembers] = useState(false)
  const [addingProgress, setAddingProgress] = useState<{
    current: number
    total: number
    status: string
  } | null>(null)
  const [selectedAudience, setSelectedAudience] = useState<string>("default")
  const [availableAudiences, setAvailableAudiences] = useState<Array<{ id: string; name: string; member_count: number }>>([])
  const [showCreateAudience, setShowCreateAudience] = useState(false)
  const [newAudienceName, setNewAudienceName] = useState("")
  const [isCreatingAudience, setIsCreatingAudience] = useState(false)
  const [isSyncingAudience, setIsSyncingAudience] = useState(false)
  
  // Contact details dialog
  const [selectedContact, setSelectedContact] = useState<WhopCompany | null>(null)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  
  // Memberships for filtering
  const [memberships, setMemberships] = useState<WhopMembership[]>([])
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false)
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("all")
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all")
  const [membershipsLoaded, setMembershipsLoaded] = useState(false) // Cache flag
  
  // Broadcast functionality
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)
  const [broadcastTarget, setBroadcastTarget] = useState<"selected" | "all">("selected")

  useEffect(() => {
    loadCompanies()
    loadAudiences()
    // Only load memberships if not already loaded
    if (!membershipsLoaded) {
      loadMemberships()
    }
  }, [whopUserId, membershipsLoaded])

  const loadAudiences = async () => {
    try {
      const audiences = await getUserEmailAudiences(whopUserId)
      setAvailableAudiences(audiences || [])
    } catch (error) {
      console.error('Error loading audiences:', error)
    }
  }

  const loadMemberships = async () => {
    // Don't load if already loaded
    if (membershipsLoaded) {
      console.log('Memberships already loaded, skipping...')
      return
    }
    
    console.log('Starting to load first page of memberships for filtering...')
    setIsLoadingMemberships(true)
    try {
      const result = await fetchMembershipsForFiltering(whopUserId, 1) // Only fetch first page per API key
      if (result.success && result.memberships) {
        setMemberships(result.memberships)
        setMembershipsLoaded(true) // Mark as loaded
        console.log(`Loaded ${result.memberships.length} memberships from first pages for filtering`)
        
        // Log unique products and plans for debugging (only once)
        if (result.memberships.length > 0) {
          const uniqueProducts = Array.from(new Set(result.memberships.map(m => m.product_id)))
          const uniquePlans = Array.from(new Set(result.memberships.map(m => m.plan_id)))
          console.log('Available products:', uniqueProducts)
          console.log('Available plans:', uniquePlans)
        }
      } else {
        console.error('Failed to load memberships:', result.error)
      }
    } catch (error) {
      console.error('Error loading memberships:', error)
    } finally {
      console.log('Finished loading first page of memberships, setting isLoadingMemberships to false')
      setIsLoadingMemberships(false)
    }
  }

  const handleContactClick = (contact: WhopCompany) => {
    setSelectedContact(contact)
    setIsContactDialogOpen(true)
  }

  const closeContactDialog = () => {
    setIsContactDialogOpen(false)
    setSelectedContact(null)
  }

  const handleCreateAudience = async () => {
    if (!newAudienceName.trim()) return
    
    setIsCreatingAudience(true)
    try {
      const result = await createEmailSyncAudience(
        whopUserId,
        newAudienceName.trim(),
        `Companies from ${newAudienceName.trim()} app`
      )
      
      if (result.success && result.audienceId) {
        // Refresh audiences to get the new one with full data
        await loadAudiences()
        setSelectedAudience(result.audienceId)
        setNewAudienceName("")
        setShowCreateAudience(false)
      } else {
        toast({
          title: "Error",
          description: `Failed to create audience: ${result.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating audience:', error)
      toast({
        title: "Error",
        description: "Failed to create audience",
        variant: "destructive",
      })
    } finally {
      setIsCreatingAudience(false)
    }
  }

  const handleSyncAudience = async () => {
    if (selectedAudience === "default" || selectedAudience === "create_new") {
      toast({
        title: "Selection Required",
        description: "Please select a specific audience to sync",
        variant: "destructive",
      })
      return
    }
    
    setIsSyncingAudience(true)
    try {
      const result = await syncAudienceToResend(selectedAudience)
      
      if (result.success) {
        toast({
          title: "Audience Synced",
          description: `Successfully synced audience to Resend! Synced ${result.syncedCount} contacts.`,
        })
        await loadAudiences() // Refresh to get updated member counts
      } else {
        toast({
          title: "Error",
          description: `Failed to sync audience: ${result.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error syncing audience:', error)
      toast({
        title: "Error",
        description: "Failed to sync audience",
        variant: "destructive",
      })
    } finally {
      setIsSyncingAudience(false)
    }
  }

  // Memoized filtering logic to prevent unnecessary recalculations
  const filteredCompanies = useMemo(() => {
    let filtered = companies

    // Filter by API key source
    if (selectedApiKeyFilter !== "all") {
      filtered = filtered.filter(company => company._source_api_key_id === selectedApiKeyFilter)
    }

    // Filter by search query
    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter(company => 
        company.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        company.owner.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        company.owner.username.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        company.owner.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (company.authorized_user?.user?.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || false) ||
        (company.authorized_user?.user?.username.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || false)
      )
    }

    // Filter by product
    if (selectedProductFilter !== "all") {
      filtered = filtered.filter(company => {
        const companyMemberships = memberships.filter(m => m.company_buyer_id === company.id)
        return companyMemberships.some(m => m.product_id === selectedProductFilter)
      })
    }

    // Filter by plan
    if (selectedPlanFilter !== "all") {
      filtered = filtered.filter(company => {
        const companyMemberships = memberships.filter(m => m.company_buyer_id === company.id)
        return companyMemberships.some(m => m.plan_id === selectedPlanFilter)
      })
    }

    return filtered
  }, [searchQuery, selectedApiKeyFilter, selectedProductFilter, selectedPlanFilter, companies, memberships])

  // Debounce search query to prevent excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, selectedApiKeyFilter, selectedProductFilter, selectedPlanFilter])

  // Pagination calculations
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCompanies = filteredCompanies.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const loadCompanies = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Starting to fetch all companies from all API keys...')
      
      // Fetch companies and API keys in parallel
      const [companiesResult, apiKeysResult] = await Promise.all([
        fetchAllCompaniesForUser(whopUserId),
        getAppBuilderApiKeys(whopUserId)
      ])

      if (companiesResult.success) {
        console.log(`Successfully loaded ${companiesResult.companies?.length || 0} companies`)
        setCompanies(companiesResult.companies || [])
        
        // Store total pages information for manual loading
        if (companiesResult.totalPages) {
          setApiKeyTotalPages(companiesResult.totalPages)
          // Initialize loaded pages to 1 for each API key
          const initialLoadedPages: { [apiKeyId: string]: number } = {}
          Object.keys(companiesResult.totalPages).forEach(apiKeyId => {
            initialLoadedPages[apiKeyId] = 1
          })
          setLoadedPages(initialLoadedPages)
        }
      } else {
        console.error('Failed to load companies:', companiesResult.error)
        setError(companiesResult.error || 'Failed to load companies')
      }

      if (apiKeysResult.success) {
        setAvailableApiKeys(apiKeysResult.apiKeys?.map(key => ({
          id: key.id,
          name: key.api_key_name
        })) || [])
      }
    } catch (error) {
      console.error('Error loading companies:', error)
      setError('Failed to load companies')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const handleRefresh = () => {
    loadCompanies()
    // Reset memberships cache to allow fresh data
    setMembershipsLoaded(false)
    setMemberships([])
  }

  const handleLoadMore = async (apiKeyId: string) => {
    if (isLoadingMore) return
    
    const currentLoaded = loadedPages[apiKeyId] || 1
    const totalForApiKey = apiKeyTotalPages[apiKeyId] || 1
    
    if (currentLoaded >= totalForApiKey) {
      toast({
        title: "All Pages Loaded",
        description: "All pages for this API key have been loaded!",
      })
      return
    }
    
    setIsLoadingMore(true)
    try {
      // Get API key details
      const apiKey = availableApiKeys.find(key => key.id === apiKeyId)
      if (!apiKey) {
        throw new Error('API key not found')
      }
      
      // Get the actual API key from the database
      const apiKeysResult = await getAppBuilderApiKeys(whopUserId)
      const apiKeyData = apiKeysResult.apiKeys?.find(key => key.id === apiKeyId)
      if (!apiKeyData) {
        throw new Error('API key data not found')
      }
      
      // Calculate next pages to load (load 2 more pages at a time)
      const nextPage = currentLoaded + 1
      const endPage = Math.min(currentLoaded + 2, totalForApiKey)
      
      console.log(`Loading pages ${nextPage}-${endPage} for API key: ${apiKey.name}`)
      
      const result = await fetchAdditionalCompanyPages(
        apiKeyId,
        apiKey.name,
        apiKeyData.whop_api_key,
        nextPage,
        endPage
      )
      
      if (result.success && result.companies) {
        // Add new companies to existing list
        setCompanies(prev => [...prev, ...result.companies!])
        
        // Update loaded pages count
        setLoadedPages(prev => ({
          ...prev,
          [apiKeyId]: endPage
        }))
        
        console.log(`Successfully loaded ${result.companies.length} additional companies from pages ${nextPage}-${endPage}`)
      } else {
        throw new Error(result.error || 'Failed to load additional pages')
      }
    } catch (error) {
      console.error('Error loading more pages:', error)
      toast({
        title: "Error",
        description: `Failed to load more pages: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleAddToMembers = async () => {
    console.log('handleAddToMembers called')
    console.log('selectedCompanies.size:', selectedCompanies.size)
    console.log('selectedCompanies:', Array.from(selectedCompanies))
    console.log('filteredCompanies.length:', filteredCompanies.length)
    
    if (selectedCompanies.size === 0) {
      console.log('No companies selected, returning early')
      toast({
        title: "No Companies Selected",
        description: "Please select at least one company to add to members.",
        variant: "destructive",
      })
      return
    }
    
    // Get the selected audience name for display
    const audienceName = selectedAudience === "default" 
      ? "App Builder Companies" 
      : availableAudiences.find(a => a.id === selectedAudience)?.name || "Selected Audience"
    
    console.log('Starting to add companies to members...')
    setIsAddingToMembers(true)
    setAddingProgress({
      current: 0,
      total: selectedCompanies.size,
      status: 'Preparing companies...'
    })
    
    try {
      // Convert selected companies to member format
      const companiesToAdd = filteredCompanies.filter(company => 
        selectedCompanies.has(company.id)
      ).map(company => ({
        id: company.id,
        email: company.owner.email,
        name: company.owner.name || company.owner.username,
        username: company.owner.username,
        status: 'completed',
        source: 'app_builder',
        source_api_key: company._source_api_key_name || 'Unknown',
        company_title: company.title,
        has_payment_method: company.has_payment_method,
        audience_id: selectedAudience === "default" ? undefined : selectedAudience
      }))

      console.log('Adding companies to members:', companiesToAdd)
      
      setAddingProgress({
        current: 0,
        total: companiesToAdd.length,
        status: `Adding ${companiesToAdd.length} companies to database...`
      })
      
      // Call server action to add companies to members system
      const result = await addCompaniesToMembers(whopUserId, companiesToAdd)
      
      if (result.success) {
        setAddingProgress({
          current: result.addedCount || selectedCompanies.size,
          total: selectedCompanies.size,
          status: 'Completed successfully!'
        })
        
        // Show success message after a brief delay
        setTimeout(() => {
          toast({
            title: "Companies Added",
            description: `Successfully added ${result.addedCount} companies to email contacts! They are now available in your "${audienceName}" audience for email campaigns.`,
          })
          setSelectedCompanies(new Set())
          setAddingProgress(null)
          // Refresh audiences to update member counts
          loadAudiences()
        }, 1000)
      } else {
        setAddingProgress(null)
        toast({
          title: "Error",
          description: `Failed to add companies: ${result.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding companies to members:', error)
      setAddingProgress(null)
      toast({
        title: "Error",
        description: "Failed to add companies to members system",
        variant: "destructive",
      })
    } finally {
      setIsAddingToMembers(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedCompanies.size === currentCompanies.length) {
      setSelectedCompanies(new Set())
    } else {
      setSelectedCompanies(new Set(currentCompanies.map(company => company.id)))
    }
  }

  const handleSelectAllCompanies = () => {
    if (selectedCompanies.size === filteredCompanies.length) {
      setSelectedCompanies(new Set())
    } else {
      setSelectedCompanies(new Set(filteredCompanies.map(company => company.id)))
    }
  }

  const handleSelectCompany = (companyId: string) => {
    console.log('handleSelectCompany called with:', companyId)
    const newSelected = new Set(selectedCompanies)
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId)
      console.log('Removed company from selection')
    } else {
      newSelected.add(companyId)
      console.log('Added company to selection')
    }
    console.log('New selection size:', newSelected.size)
    setSelectedCompanies(newSelected)
  }

  const exportToCsv = () => {
    const headers = ['Company ID', 'Company Name', 'Owner User ID', 'Owner Email', 'Owner Username', 'Source API Key', 'Created Date', 'Has Payment Method', 'Route']
    const csvContent = [
      headers.join(','),
      ...filteredCompanies.map(company => [
        company.id,
        `"${company.title}"`,
        company.owner.id,
        company.owner.email,
        company.owner.username,
        company._source_api_key_name || 'Unknown',
        formatDate(company.created_at),
        company.has_payment_method ? 'Yes' : 'No',
        company.route || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `app-builder-companies-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleBroadcastClick = () => {
    setIsBroadcastDialogOpen(true)
    setBroadcastMessage("")
    setBroadcastTarget("selected")
  }

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive",
      })
      return
    }

    setIsSendingBroadcast(true)
    try {
      // Get the target companies
      let targetCompanies: any[] = []
      
      if (broadcastTarget === "selected") {
        // Get selected companies
        targetCompanies = filteredCompanies.filter(company => selectedCompanies.has(company.id))
      } else {
        // Get all filtered companies
        targetCompanies = filteredCompanies
      }

      // Filter out companies with missing owner data
      const validCompanies = targetCompanies.filter(company => 
        company.owner && 
        company.owner.id && 
        company.owner.name && 
        company.owner.email
      )

      if (validCompanies.length === 0) {
        toast({
          title: "No Valid Recipients",
          description: "No companies with valid user data found",
          variant: "destructive",
        })
        return
      }

      if (validCompanies.length !== targetCompanies.length) {
        console.warn(`Filtered out ${targetCompanies.length - validCompanies.length} companies with missing owner data`)
        toast({
          title: "Some Companies Skipped",
          description: `${validCompanies.length} of ${targetCompanies.length} companies have valid user data`,
        })
      }

      targetCompanies = validCompanies

      console.log(`Sending App Builder broadcast to ${targetCompanies.length} companies`)
      console.log('Sample company data:', JSON.stringify(targetCompanies[0], null, 2))

      // Send the broadcast message using the new App Builder-specific endpoint
      const response = await fetch('/api/whop-marketing/app-builder-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: broadcastMessage,
          targetCompanies: targetCompanies,
          whopUserId: whopUserId
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('App Builder broadcast sent successfully:', result)
        toast({
          title: "Message Sent",
          description: `Message sent successfully to ${targetCompanies.length} companies!`,
        })
        setIsBroadcastDialogOpen(false)
        setBroadcastMessage("")
      } else {
        const error = await response.text()
        console.error('Failed to send App Builder broadcast:', error)
        console.error('Response status:', response.status)
        console.error('Response headers:', Object.fromEntries(response.headers.entries()))
        toast({
          title: "Error",
          description: `Failed to send message: ${error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error sending App Builder broadcast:', error)
      toast({
        title: "Error",
        description: `Error sending message: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsSendingBroadcast(false)
    }
  }

  const closeBroadcastDialog = () => {
    setIsBroadcastDialogOpen(false)
    setBroadcastMessage("")
    setBroadcastTarget("selected")
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                App Builder Companies
              </CardTitle>
                        <CardDescription>
            Companies that installed your apps but may not have converted
            {memberships.length > 0 && (
              <span className="ml-2 text-xs text-green-600">
                • {memberships.length} memberships loaded (first page only)
              </span>
            )}
          </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Select {selectedCompanies.size > 0 ? `${selectedCompanies.size} companies` : 'Companies'}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleSelectAll}>
                  {selectedCompanies.size === currentCompanies.length ? 'Deselect' : 'Select'} Current Page ({currentCompanies.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSelectAllCompanies}>
                  {selectedCompanies.size === filteredCompanies.length ? 'Deselect' : 'Select'} All Companies ({filteredCompanies.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedCompanies(new Set())}>
                  Clear Selection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Audience Selection */}
            <div className="flex items-center gap-2">
              <Select value={selectedAudience} onValueChange={(value) => {
                console.log('Audience selection changed to:', value)
                setSelectedAudience(value)
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">App Builder Companies (Default)</SelectItem>
                  {availableAudiences.map((audience) => (
                    <SelectItem key={audience.id} value={audience.id}>
                      {audience.name} ({audience.member_count})
                    </SelectItem>
                  ))}
                  <SelectItem value="create_new">+ Create New Audience</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedAudience === "create_new" && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Audience name"
                    value={newAudienceName}
                    onChange={(e) => setNewAudienceName(e.target.value)}
                    className="w-40"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleCreateAudience}
                    disabled={!newAudienceName.trim() || isCreatingAudience}
                  >
                    {isCreatingAudience ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('Button clicked!')
                console.log('Button disabled state:', selectedCompanies.size === 0 || isAddingToMembers || selectedAudience === "create_new")
                console.log('selectedCompanies.size:', selectedCompanies.size)
                console.log('isAddingToMembers:', isAddingToMembers)
                console.log('selectedAudience:', selectedAudience)
                console.log('availableAudiences:', availableAudiences)
                handleAddToMembers()
              }} 
              disabled={selectedCompanies.size === 0 || isAddingToMembers}
              title={
                selectedCompanies.size === 0 
                  ? "Please select at least one company" 
                  : selectedAudience === "create_new" 
                    ? "Please create the new audience first or select an existing audience"
                    : "Add selected companies to members"
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {isAddingToMembers ? 'Adding...' : `Add ${selectedCompanies.size} to Members`}
            </Button>
            
            {/* Status indicator */}
            {(selectedCompanies.size === 0 || selectedAudience === "create_new") && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedCompanies.size === 0 
                  ? "💡 Select companies using the checkboxes above" 
                  : selectedAudience === "create_new" 
                    ? "💡 Create the new audience first or select an existing audience"
                    : ""
                }
              </div>
            )}
            
            {/* Progress Indicator */}
            {addingProgress && (
              <div className="w-full max-w-md bg-background border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Adding Companies</span>
                  <span className="text-muted-foreground">
                    {addingProgress.current} / {addingProgress.total}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((addingProgress.current / addingProgress.total) * 100, 100)}%` 
                    }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {addingProgress.status}
                </div>
              </div>
            )}
            <Button 
              variant="outline" 
              onClick={handleSyncAudience} 
              disabled={selectedAudience === "default" || selectedAudience === "create_new" || isSyncingAudience}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingAudience ? 'animate-spin' : ''}`} />
              {isSyncingAudience ? 'Syncing...' : 'Sync to Resend'}
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportToCsv} disabled={filteredCompanies.length === 0}>
              <Mail className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={handleBroadcastClick}
              disabled={filteredCompanies.length === 0}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Broadcast
            </Button>
          </div>

          {/* Search and Filters Row */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search companies by name, owner email, username, or user ID..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedApiKeyFilter} onValueChange={setSelectedApiKeyFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by API key" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All API Keys</SelectItem>
                {availableApiKeys.map((apiKey) => (
                  <SelectItem key={apiKey.id} value={apiKey.id}>
                    {apiKey.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter} disabled={isLoadingMemberships}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={isLoadingMemberships ? "Loading products..." : "Filter by Product"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {memberships.length > 0 ? (
                  Array.from(new Set(memberships.map(m => m.product_id))).map((productId) => (
                    <SelectItem key={productId} value={productId}>
                      {productId}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no_data" disabled>
                    {isLoadingMemberships ? "Loading..." : "No product data available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={selectedPlanFilter} onValueChange={setSelectedPlanFilter} disabled={isLoadingMemberships}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={isLoadingMemberships ? "Loading plans..." : "Filter by Plan"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {memberships.length > 0 ? (
                  Array.from(new Set(memberships.map(m => m.plan_id))).map((planId) => (
                    <SelectItem key={planId} value={planId}>
                      {planId}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no_data" disabled>
                    {isLoadingMemberships ? "Loading..." : "No plan data available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
                    {debouncedSearchQuery && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Found {filteredCompanies.length} companies
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            </div>
          )}
          
          {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {memberships.length === 0 && !isLoadingMemberships && (
          <Alert className="mb-4">
            <AlertDescription>
              <strong>Product/Plan Filtering:</strong> To enable filtering by product and plan subscriptions, 
              you need to use <strong>App API keys</strong> instead of Company API keys. 
              Visit <a href="https://whop.com/apps" target="_blank" rel="noopener noreferrer" className="underline">https://whop.com/apps</a> to create/retrieve your App API keys.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading all companies from all API keys...</span>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Companies Found</h3>
            <p className="text-muted-foreground mb-4">
              Companies will appear here once you add API keys and they have companies that installed your apps. 
              The system fetches all companies from all pages for each API key.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedCompanies.size === currentCompanies.length && currentCompanies.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Owner User ID</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentCompanies.map((company) => (
                  <TableRow 
                    key={company.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleContactClick(company)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedCompanies.has(company.id)}
                        onCheckedChange={() => handleSelectCompany(company.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{company.title}</div>
                        <div className="text-sm text-muted-foreground">{company.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{company.owner.username}</div>
                        <div className="text-sm text-muted-foreground">{company.owner.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{company.owner.id}</div>
                        <div className="text-sm text-muted-foreground">{company.owner.username}</div>
                        <div className="text-xs text-muted-foreground">{company.owner.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {company._source_api_key_name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(company.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.has_payment_method ? "default" : "secondary"}>
                        {company.has_payment_method ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement email marketing to this company
                            console.log('Send email to company:', company)
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        {company.route && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(company.route, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Load More Buttons */}
            {Object.keys(apiKeyTotalPages).length > 0 && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">Load More Companies</h4>
                <div className="flex flex-wrap gap-2">
                  {availableApiKeys.map((apiKey) => {
                    const currentLoaded = loadedPages[apiKey.id] || 1
                    const totalForApiKey = apiKeyTotalPages[apiKey.id] || 1
                    const hasMorePages = currentLoaded < totalForApiKey
                    
                    return (
                      <div key={apiKey.id} className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadMore(apiKey.id)}
                          disabled={!hasMorePages || isLoadingMore}
                        >
                          {isLoadingMore ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          Load More {apiKey.name}
                          {hasMorePages && (
                            <span className="ml-1 text-xs">
                              ({currentLoaded}/{totalForApiKey})
                            </span>
                          )}
                        </Button>
                        {!hasMorePages && (
                          <Badge variant="secondary" className="text-xs">
                            All loaded
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Loads 2 additional pages at a time. Each page contains up to 50 companies.
                </p>
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredCompanies.length)} of {filteredCompanies.length} companies
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Contact Details Dialog */}
    <ContactDetailsDialog
      contact={selectedContact}
      isOpen={isContactDialogOpen}
      onClose={closeContactDialog}
    />

    {/* Broadcast Dialog */}
    <Dialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Broadcast Message
          </DialogTitle>
          <DialogDescription>
            Send a message to {broadcastTarget === "selected" ? `${selectedCompanies.size} selected` : "all"} company owners.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Target Selection */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <div className="flex gap-2">
              <Button
                variant={broadcastTarget === "selected" ? "default" : "outline"}
                size="sm"
                onClick={() => setBroadcastTarget("selected")}
                disabled={selectedCompanies.size === 0}
              >
                Selected Companies ({selectedCompanies.size})
              </Button>
              <Button
                variant={broadcastTarget === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setBroadcastTarget("all")}
              >
                All Companies ({filteredCompanies.length})
              </Button>
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="broadcast-message">Message</Label>
            <Textarea
              id="broadcast-message"
              placeholder="Enter your message here..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground">
              Use {'{{name}}'} to personalize the message with the owner's name.
            </div>
          </div>

          {/* Preview */}
          {broadcastMessage && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                <div className="font-medium">Message:</div>
                <div className="mt-1">{broadcastMessage}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Will be sent to {broadcastTarget === "selected" ? selectedCompanies.size : filteredCompanies.length} company owners
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeBroadcastDialog} disabled={isSendingBroadcast}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendBroadcast} 
            disabled={!broadcastMessage.trim() || isSendingBroadcast}
          >
            {isSendingBroadcast ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
} 