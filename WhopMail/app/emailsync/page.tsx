"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Mail, 
  Users, 
  BarChart3, 
  Settings, 
  Globe, 
  Send, 
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Webhook,
  Copy,
  ExternalLink,
  Shield,
  Trash2,
  Building2,
  Type,
  HelpCircle,
  Wrench
} from "lucide-react"
import { EmailSetupForm } from "@/components/email-setup-form"

import { EmailSender } from "@/components/email-sender"
import { DomainVerification } from "@/components/domain-verification"
import { EmailDesigner } from "@/components/email-designer"
import { DomainConfiguration } from "@/components/domain-configuration"
import { DomainHealth } from "@/components/domain-health"
import { EmailAnalytics } from "@/components/email-analytics"
import { EmailAIRecommendations } from "@/components/email-ai-recommendations"
import { EnhancedEmailSender } from "@/components/enhanced-email-sender"
import { CompanySettings } from "@/components/company-settings"
import { AutomationTriggers } from "@/components/automation-triggers"
import { EmailFlows } from "@/components/email-flows"
import { ListManager } from "@/components/list-manager"
import { FormBuilder } from "@/components/form-builder"
// import { AppBuilderApiKeys } from "@/components/app-builder-api-keys"
// import { AppBuilderCompanies } from "@/components/app-builder-companies"
import { 
  getUserEmailAudiences, 
  getEmailSyncConfig, 
  setupEmailSyncWithMembers,
  syncAudienceToResend,
  updateAudienceWithNewMembers,
  resyncAudienceToResend,
  sendEmailCampaign,
  fixCorruptedDomainData,
  checkAndUpdateDomainStatus,
  getAudienceContacts,
  deleteEmailList
} from '@/app/actions/emailsync'
import { fetchAllWhopMembers } from "@/app/actions"
import { getDomainStatus, listResendAudiences } from "@/app/actions/resend"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AutomationSettings from "@/components/automation-settings"
import UserWebhookManager from "@/components/user-webhook-manager"

interface EmailSyncDashboardProps {
  whopUserId: string
  whopApiKey: string
  members: any[]
  totalMemberCount: number
  showHeader?: boolean // Add this prop to control header visibility
}

export default function EmailSyncDashboard({ 
  whopUserId, 
  whopApiKey, 
  members, 
  totalMemberCount,
  showHeader = true // Default to true for backward compatibility
}: EmailSyncDashboardProps) {

  const [activeTab, setActiveTab] = useState("overview")
  const [emailDomain, setEmailDomain] = useState<string | null>(null)
  const [domainId, setDomainId] = useState<string | null>(null) // Add domainId state
  const [showDomainVerification, setShowDomainVerification] = useState(false)

  const [syncedAudienceId, setSyncedAudienceId] = useState<string | null>(null)
  const [syncedCount, setSyncedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [domainStatus, setDomainStatus] = useState<string | null>(null)
  const [resendAudiences, setResendAudiences] = useState<any[]>([])
  const [audiences, setAudiences] = useState<any[]>([])
  const [expandedAudienceId, setExpandedAudienceId] = useState<string | null>(null)
  const [audienceMembers, setAudienceMembers] = useState<{ [audienceId: string]: any[] }>({})
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailModalMember, setEmailModalMember] = useState<any | null>(null)
  const [emailModalAudience, setEmailModalAudience] = useState<any | null>(null)
  const [isRefreshingLists, setIsRefreshingLists] = useState(false)
  const [listSuccessMessage, setListSuccessMessage] = useState<string | null>(null)
  const [campaignSuccessMessage, setCampaignSuccessMessage] = useState<string | null>(null)
  const [campaignSubject, setCampaignSubject] = useState("")
  const [selectedAudienceId, setSelectedAudienceId] = useState("")
  const [showTemplateVariables, setShowTemplateVariables] = useState(false)
  const [campaignErrorMessage, setCampaignErrorMessage] = useState<string | null>(null)
  const [isSendingCampaign, setIsSendingCampaign] = useState(false)
  const [syncingAudienceId, setSyncingAudienceId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  
  // Auto-save functionality
  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  const AUTO_SAVE_KEY = `email-campaign-draft-${whopUserId}`
  
  // Load saved draft on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(AUTO_SAVE_KEY)
        if (saved) {
          const draft = JSON.parse(saved)
          if (draft.subject && draft.subject.trim()) {
            setCampaignSubject(draft.subject)
            setHasSavedDraft(true)
          }
        }
      } catch (error) {
        console.warn('Failed to load saved draft:', error)
      }
    }
  }, [AUTO_SAVE_KEY])
  
  // Auto-save function
  const saveDraft = useCallback(() => {
    try {
      const draft = {
        subject: campaignSubject,
        timestamp: new Date().toISOString(),
        whopUserId
      }
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft))
      setHasSavedDraft(true)
      console.log('Auto-saved draft at:', new Date().toISOString())
    } catch (error) {
      console.warn('Failed to save draft:', error)
    }
  }, [campaignSubject, whopUserId, AUTO_SAVE_KEY])
  
  // Auto-save when subject changes (with debounce)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const timeoutId = setTimeout(() => {
      if (campaignSubject.trim()) {
        saveDraft()
      }
    }, 2000) // Save after 2 seconds of no typing
    
    return () => clearTimeout(timeoutId)
  }, [campaignSubject, saveDraft])
  
  // Clear draft when campaign is sent
  const clearDraft = () => {
    localStorage.removeItem(AUTO_SAVE_KEY)
    setHasSavedDraft(false)
  }
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [selectedMemberForList, setSelectedMemberForList] = useState<any>(null)
  const [isAddingMemberToList, setIsAddingMemberToList] = useState(false)
  const [existingEmailConfig, setExistingEmailConfig] = useState<any>(null)


  const [domainVerificationDns, setDomainVerificationDns] = useState<any[]>([])

  // Load existing EmailSync configuration on component mount
  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        const config = await getEmailSyncConfig(whopUserId)
        console.log("Loaded EmailSync config:", config)
        
        if (config.success && config.config) {
          const existingConfig = config.config
          
          // Store the full config for use in EmailSetupForm
          setExistingEmailConfig(existingConfig)
          
          // Check if config is "cleared" (main fields are null, but email_type might be set to satisfy NOT NULL constraint)
          const isConfigCleared = !existingConfig.username && 
                                 !existingConfig.custom_domain && 
                                 (existingConfig.from_email === 'noreply@example.com' || !existingConfig.from_email) &&
                                 !existingConfig.domain_id &&
                                 !existingConfig.is_active
          
          if (isConfigCleared) {
            // Config exists but is cleared, show setup form
            setEmailDomain(null)
            setDomainId(null)
            setDomainStatus(null)
            setShowDomainVerification(false)
            setCompanyName(null)
          } else if (existingConfig.email_type === 'whopmail') {
            // For whopmail.com users, set domain and show audience selector
            setEmailDomain('whopmail.com')
            setDomainId(null) // No domain ID for whopmail.com
            setDomainStatus('verified') // whopmail.com is pre-verified
            setShowDomainVerification(false)
          } else if (existingConfig.custom_domain) {
            // For custom domain users
            setEmailDomain(existingConfig.custom_domain)
            setDomainId(existingConfig.domain_id || null)
            setDomainStatus(existingConfig.domain_status || null)
            setDomainVerificationDns(existingConfig.domain_verification_dns || [])
            
            // If domain exists but not verified, show audience selector
            if (existingConfig.domain_status === 'verified') {
              setShowDomainVerification(false)
            } else {
              // If domain exists but not verified, show verification
              setShowDomainVerification(true)
            }
          }
          
          setCompanyName(existingConfig.company_name || null)
        } else {
          // No config found or error
          console.log("No existing EmailSync config found for user:", whopUserId)
          setEmailDomain(null)
          setDomainId(null)
          setDomainStatus(null)
          setCompanyName(null)
        }
      } catch (error) {
        console.error("Error loading existing EmailSync config:", error)
        setEmailDomain(null)
        setDomainId(null)
        setDomainStatus(null)
        setCompanyName(null)
      } finally {
        setIsLoading(false)
      }
          }

      if (whopUserId) {
        loadExistingConfig()
      } else {
        setIsLoading(false)
      }
  }, [whopUserId])



  // Fetch all audiences on mount or when whopUserId changes
  useEffect(() => {
    async function fetchAudiences() {
      if (!whopUserId) return
      try {
        const data = await getUserEmailAudiences(whopUserId)
        setAudiences(data || [])
      } catch (err) {
        setAudiences([])
      }
    }
    fetchAudiences()
  }, [whopUserId])

  const handleEmailSetupSuccess = (domain: string, emailType: 'whopmail' | 'custom') => {
    console.log("Email setup success with domain:", domain, "type:", emailType)
    setEmailDomain(domain)
    
    if (emailType === 'whopmail') {
      // For whopmail.com, skip domain verification
      setShowDomainVerification(false)
      setDomainStatus('verified') // whopmail.com is pre-verified
    } else {
      // For custom domains, show domain verification
      setShowDomainVerification(true)
      setDomainStatus('pending') // Set initial status as pending
    }
  }

  const handleDomainVerified = () => {
    setShowDomainVerification(false)
    setDomainStatus('verified')
  }

  const updateFromNameDirectly = async (newFromName: string) => {
    try {
      console.log("Updating from name directly to:", newFromName)
      
      // Import the updateFromName function
      const { updateFromName } = await import('@/app/actions/emailsync')
      
      const result = await updateFromName(whopUserId, newFromName)
      
      if (result.success) {
        console.log("From name updated successfully")
        // Refresh the config to show the updated values
        await refreshConfig()
        toast.success(`From name updated to "${newFromName}"`)
      } else {
        console.error("Failed to update from name:", result.error)
        toast.error(`Failed to update from name: ${result.error}`)
      }
    } catch (error) {
      console.error("Error updating from name:", error)
      toast.error("Failed to update from name")
    }
  }



  const refreshConfig = async () => {
    try {
      const config = await getEmailSyncConfig(whopUserId)
      console.log("Refreshed EmailSync config:", config)
      
      if (config.success && config.config) {
        setExistingEmailConfig(config.config)
        setEmailDomain(config.config.custom_domain || (config.config.email_type === 'whopmail' ? 'whopmail.com' : null))
        setDomainId(config.config.domain_id || null)
        setDomainStatus(config.config.domain_status || null)
      }
      
      if (config.success && config.config) {
        const existingConfig = config.config
        
        // Handle whopmail.com vs custom domain differently
        if (existingConfig.email_type === 'whopmail') {
          // For whopmail.com users, set domain and show audience selector
          setEmailDomain('whopmail.com')
          setDomainId(null) // No domain ID for whopmail.com
          setDomainStatus('verified') // whopmail.com is pre-verified
          setShowDomainVerification(false)
        } else if (existingConfig.custom_domain) {
          // For custom domain users
          setEmailDomain(existingConfig.custom_domain)
          setDomainId(existingConfig.domain_id || null)
          setDomainStatus(existingConfig.domain_status || null)
          
          // If domain is verified, show audience selector
          if (existingConfig.domain_status === 'verified') {
            setShowDomainVerification(false)
          } else {
            // If domain exists but not verified, show verification
            setShowDomainVerification(true)
          }
        }
        
        setCompanyName(existingConfig.company_name || null)
      }
    } catch (error) {
      console.error("Error refreshing EmailSync config:", error)
    }
  }

  const checkDomainStatus = async () => {
    console.log("checkDomainStatus called. emailDomain:", emailDomain, "domainId:", domainId);
    if (!domainId) {
      console.log("No domainId set, aborting check.");
      return;
    }
    console.log("Manually checking domain status for domainId:", domainId)
    try {
      // Use the function that properly updates the database
      const result = await checkAndUpdateDomainStatus(whopUserId)
      console.log("Domain verification check result:", result)
      if (result.success) {
        if (result.status === 'verified') {
          console.log("Domain is verified, updating status")
          setDomainStatus('verified')
          setShowDomainVerification(false)
        } else {
          console.log("Domain is not verified yet")
          setDomainStatus('pending')
        }
        // Refresh the config to get updated data
        await refreshConfig()
      } else {
        console.error("Failed to check domain verification:", result.error)
        setDomainStatus('failed')
      }
    } catch (error) {
      console.error("Error checking domain status:", error)
      setDomainStatus('failed')
    }
  }

  const handleEmailSync = (audienceId: string, count: number) => {
    setSyncedAudienceId(audienceId)
    setSyncedCount(count)
    setListSuccessMessage(`Email list created successfully! ${count} members synced. Use the "Refresh Lists" button to see your new list.`)
    setTimeout(() => setListSuccessMessage(null), 8000)
    setActiveTab("campaigns")
  }

  const getEmailAddress = () => {
    console.log("getEmailAddress called with:", { emailDomain, existingEmailConfig })
    
    if (emailDomain) {
      // Check if this is a whopmail.com configuration
      if (emailDomain === 'whopmail.com') {
        // For whopmail.com, get the username from the existing config
        if (existingEmailConfig?.username) {
          return `${existingEmailConfig.username}@whopmail.com`
        }
        return "username@whopmail.com" // Fallback if username not loaded yet
      } else {
        // For custom domains, use the from_email if it exists, otherwise default
        if (existingEmailConfig?.from_email && existingEmailConfig.from_email.includes('@')) {
          console.log("Using existing from_email:", existingEmailConfig.from_email)
          return existingEmailConfig.from_email
        }
        console.log("Using default email:", `noreply@${emailDomain}`)
        return `noreply@${emailDomain}`
      }
    }
    return "Not configured"
  }

  const listAudiences = async () => {
    console.log("Listing Resend audiences...")
    try {
      const result = await listResendAudiences()
      console.log("Resend audiences result:", result)
      if (result.success) {
        console.log("Setting audiences in state:", result.audiences)
        setResendAudiences(result.audiences || [])
        // Force a re-render
        setTimeout(() => {
          console.log("Current audiences state:", resendAudiences)
        }, 100)
      } else {
        console.error("Failed to list Resend audiences:", result.error)
        setResendAudiences([])
      }
    } catch (error) {
      console.error("Error listing Resend audiences:", error)
      setResendAudiences([])
    }
  }

  const cleanupDomain = async () => {
    console.log("Starting domain cleanup...")
    try {
      const result = await fixCorruptedDomainData(whopUserId)
      if (result.success) {
        console.log("Domain data fixed successfully")
        // Refresh the config
        await refreshConfig()
        // Force a page reload to see the changes
        window.location.reload()
      } else {
        console.error("Failed to fix domain data:", result.error)
        alert(`Failed to fix domain data: ${result.error}`)
      }
    } catch (error) {
      console.error("Error cleaning up domain:", error)
      alert(`Error cleaning up domain: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const checkDomainStatusFromResend = async () => {
    console.log("Checking domain status from Resend...")
    try {
      const result = await checkAndUpdateDomainStatus(whopUserId)
      if (result.success) {
        console.log("Domain status updated:", result.status)
        // Refresh the config
        await refreshConfig()
        // Force a page reload to see the changes
        window.location.reload()
      } else {
        console.error("Failed to check domain status:", result.error)
        alert(`Failed to check domain status: ${result.error}`)
      }
    } catch (error) {
      console.error("Error checking domain status:", error)
      alert(`Error checking domain status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Fetch members for expanded audience
  const handleExpandAudience = async (audienceId: string) => {
    setExpandedAudienceId(audienceId === expandedAudienceId ? null : audienceId)
    if (audienceId !== expandedAudienceId && !audienceMembers[audienceId]) {
      const members = await getAudienceContacts(audienceId)
      setAudienceMembers((prev) => ({ ...prev, [audienceId]: members || [] }))
    }
  }

  const handleOpenEmailModal = (member: any, audience: any) => {
    setEmailModalMember(member)
    setEmailModalAudience(audience)
    setShowEmailModal(true)
  }

  const handleRefreshLists = async () => {
    setIsRefreshingLists(true)
    setListSuccessMessage(null)
    
    try {
      const data = await getUserEmailAudiences(whopUserId)
      setAudiences(data || [])
      setListSuccessMessage('Lists refreshed successfully!')
      setTimeout(() => setListSuccessMessage(null), 5000)
    } catch (error) {
      console.error('Error refreshing lists:', error)
    } finally {
      setIsRefreshingLists(false)
    }
  }

  const handleSyncToResend = async (audienceId: string) => {
    setSyncingAudienceId(audienceId)
    setListSuccessMessage(null)
    
    try {
      console.log(`🔄 Starting mass email sync for audience: ${audienceId}`)
      const result = await syncAudienceToResend(audienceId)
      
      if (result.success) {
        setListSuccessMessage(`✅ Successfully synced ${result.syncedCount || 0} contacts for mass email!`)
        // Refresh the lists to show updated status
        const data = await getUserEmailAudiences(whopUserId)
        setAudiences(data || [])
      } else {
        setListSuccessMessage(`❌ Failed to sync for mass email: ${result.error}`)
      }
      
      setTimeout(() => setListSuccessMessage(null), 8000)
    } catch (error) {
      console.error('Error syncing for mass email:', error)
      setListSuccessMessage(`❌ Error syncing for mass email: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setListSuccessMessage(null), 8000)
    } finally {
      setSyncingAudienceId(null)
    }
  }

  const handleUpdateList = async (audienceId: string) => {
    setSyncingAudienceId(audienceId)
    setListSuccessMessage(null)
    
    try {
      console.log(`🔧 Starting list update for audience: ${audienceId}`)
      const result = await updateAudienceWithNewMembers(audienceId, whopApiKey)
      
      if (result.success) {
        setListSuccessMessage(`✅ Successfully updated list: ${result.updatedCount} contacts updated, ${result.syncedCount} synced to email service.`)
        // Refresh the lists to show updated status
        const data = await getUserEmailAudiences(whopUserId)
        setAudiences(data || [])
      } else {
        setListSuccessMessage(`❌ Failed to update list: ${result.error}`)
      }
      
      setTimeout(() => setListSuccessMessage(null), 8000)
    } catch (error) {
      console.error('Error updating list:', error)
      setListSuccessMessage(`❌ Error updating list: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setListSuccessMessage(null), 8000)
    } finally {
      setSyncingAudienceId(null)
    }
  }

  const handleFixProcessingStatus = async (audienceId: string, memberCount: number) => {
    setSyncingAudienceId(audienceId)
    setListSuccessMessage(null)
    
    try {
      console.log(`🔧 Fixing processing status for audience: ${audienceId}`)
      
      const response = await fetch('/api/email-lists/fix-processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audienceId,
          memberCount
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        const successMessage = `✅ Successfully fixed processing status for list. List is now ready for use.`
        setListSuccessMessage(successMessage)
        toast.success(successMessage)
        
        // Refresh the lists to show updated status
        const data = await getUserEmailAudiences(whopUserId)
        setAudiences(data || [])
      } else {
        const errorData = await response.json()
        const errorMessage = `❌ Failed to fix processing status: ${errorData.error}`
        setListSuccessMessage(errorMessage)
        toast.error(errorMessage)
      }
      
      setTimeout(() => setListSuccessMessage(null), 8000)
    } catch (error) {
      console.error('Error fixing processing status:', error)
      const errorMessage = `❌ Error fixing processing status: ${error instanceof Error ? error.message : 'Unknown error'}`
      setListSuccessMessage(errorMessage)
      toast.error(errorMessage)
      setTimeout(() => setListSuccessMessage(null), 8000)
    } finally {
      setSyncingAudienceId(null)
    }
  }

  const handleResyncToResend = async (audienceId: string) => {
    setSyncingAudienceId(audienceId)
    setListSuccessMessage(null)
    
    try {
      console.log(`🔄 Starting re-sync for audience: ${audienceId}`)
      const result = await resyncAudienceToResend(audienceId) // Re-using syncAudienceToResend for re-sync
      
      if (result.success) {
        setListSuccessMessage(`✅ Successfully re-synced ${result.syncedCount || 0} contacts for mass email.`)
        // Refresh the lists to show updated status
        const data = await getUserEmailAudiences(whopUserId)
        setAudiences(data || [])
      } else {
        setListSuccessMessage(`❌ Failed to re-sync for mass email: ${result.error}`)
      }
      
      setTimeout(() => setListSuccessMessage(null), 8000)
    } catch (error) {
      console.error('Error re-syncing for mass email:', error)
      setListSuccessMessage(`❌ Error re-syncing for mass email: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setListSuccessMessage(null), 8000)
    } finally {
      setSyncingAudienceId(null)
    }
  }



  const handleDeleteList = async (audienceId: string) => {
    if (!window.confirm(`Are you sure you want to delete the list "${audiences.find(aud => aud.id === audienceId)?.name}"? This action cannot be undone.`)) {
      return;
    }

    setSyncingAudienceId(audienceId);
    setListSuccessMessage(null);

    try {
      console.log(`🗑️ Starting list deletion for audience: ${audienceId}`);
      const result = await deleteEmailList(audienceId); // Assuming deleteAudience is an action

      if (result.success) {
        toast.success(`List "${audiences.find(aud => aud.id === audienceId)?.name}" deleted successfully.`);
        setAudiences(audiences.filter(aud => aud.id !== audienceId));
      } else {
        toast.error(`Failed to delete list: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Failed to delete list');
    } finally {
      setSyncingAudienceId(null);
    }
  }



  const handleAddMemberToList = (member: any) => {
    setSelectedMemberForList(member)
    setShowAddMemberDialog(true)
  }



  const handleAddMemberToListConfirm = async (audienceId: string) => {
    if (!selectedMemberForList) return

    setIsAddingMemberToList(true)
    try {
      const response = await fetch('/api/email-lists/add-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audienceId,
          memberData: {
            email: selectedMemberForList.email,
            firstName: selectedMemberForList.first_name,
            lastName: selectedMemberForList.last_name,
            fullName: selectedMemberForList.full_name
          }
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`Added ${selectedMemberForList.email} to the list`)
        setShowAddMemberDialog(false)
        setSelectedMemberForList(null)
        // Refresh the lists to update member counts
        await handleRefreshLists()
      } else {
        toast.error(data.error || 'Failed to add member to list')
      }
    } catch (error) {
      console.error('Error adding member to list:', error)
      toast.error('Failed to add member to list')
    } finally {
      setIsAddingMemberToList(false)
    }
  }

  const handleSendCampaign = async (emailData: { 
    subject: string; 
    html: string; 
    text: string; 
    error?: string; 
    selectedAudienceId?: string;
    scheduledAt?: string;
    emailWidth?: number;
  }) => {
    if (emailData.error) {
      setCampaignErrorMessage(emailData.error)
      setTimeout(() => setCampaignErrorMessage(null), 8000)
      return
    }
    
    setIsSendingCampaign(true)
    setCampaignErrorMessage(null)
    setCampaignSuccessMessage(null)

    try {
      // Get available audiences
      const audiences = await getUserEmailAudiences(whopUserId)
      if (!audiences || audiences.length === 0) {
        setCampaignErrorMessage('No audiences found. Please create an audience first.')
        return
      }

      // Use selected audience or first audience as fallback
      const selectedAudienceId = emailData.selectedAudienceId || audiences[0]?.id
      const audience = audiences.find(aud => aud.id === selectedAudienceId)
      
      if (!audience) {
        setCampaignErrorMessage('Selected audience not found.')
        return
      }

      const config = await getEmailSyncConfig(whopUserId)
      
      if (!config.success || !config.config) {
        setCampaignErrorMessage('Email configuration not found. Please set up your domain first.')
        return
      }

      const result = await sendEmailCampaign({
        audienceId: audience.id,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        fromEmail: getEmailAddress(),
        whopUserId: whopUserId,
        scheduledAt: emailData.scheduledAt,
        emailWidth: emailData.emailWidth
      })

      // Debug logging
      console.log('📧 Campaign Send Result:')
      console.log('HTML Content Length:', emailData.html?.length || 0)
      console.log('Text Content Length:', emailData.text?.length || 0)
      console.log('HTML Contains <strong>:', emailData.html?.includes('<strong>') || false)
      console.log('HTML Contains <p>:', emailData.html?.includes('<p>') || false)
      console.log('Scheduled At:', emailData.scheduledAt)
      console.log('Result:', result)

      if (result.success) {
        const actionText = emailData.scheduledAt ? 'scheduled' : 'sent'
        setCampaignSuccessMessage(`Campaign ${actionText} successfully! ${emailData.scheduledAt ? 'Will be sent to' : 'Sent to'} ${result.sentCount} recipients.`)
        // Clear draft after successful send
        clearDraft()
      } else {
        setCampaignErrorMessage(result.error || 'Failed to send campaign')
      }
    } catch (error) {
      setCampaignErrorMessage(error instanceof Error ? error.message : 'An error occurred while sending campaign')
    } finally {
      setIsSendingCampaign(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading EmailSync configuration...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your email marketing campaigns and member communications
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {totalMemberCount} Members Available
          </Badge>
        </div>
      )}

      {/* Main Tabs */}
      {showHeader ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-10">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="setup" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Settings className="h-4 w-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger 
              value="domains" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Globe className="h-4 w-4" />
              Domains
            </TabsTrigger>
            <TabsTrigger 
              value="lists" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              Lists
            </TabsTrigger>
            <TabsTrigger 
              value="campaigns" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Send className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger 
              value="automation" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Clock className="h-4 w-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger 
              value="ai-design" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Plus className="h-4 w-4" />
              AI Design
            </TabsTrigger>
            <TabsTrigger 
              value="company" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Mail className="h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger 
              value="forms" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Type className="h-4 w-4" />
              Forms
            </TabsTrigger>

          </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Domain Status</CardTitle>
                {domainStatus === 'verified' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : domainStatus === 'pending' ? (
                  <Clock className="h-4 w-4 text-yellow-500" />
                ) : domainStatus === 'failed' ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {domainStatus === 'verified' ? "Verified" : 
                   domainStatus === 'pending' ? "Pending" :
                   domainStatus === 'failed' ? "Failed" :
                   emailDomain ? "Not Verified" : "Not Setup"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {emailDomain ? getEmailAddress() : "Complete setup to start sending"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Synced Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{syncedCount}</div>
                <p className="text-xs text-muted-foreground">
                  of {totalMemberCount} total members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campaigns Sent</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{audiences.length}</div>
                <p className="text-xs text-muted-foreground">
                  {audiences.length === 0 ? 'No campaigns sent yet' : `${audiences.length} email lists created`}
                </p>
              </CardContent>
            </Card>


          </div>

          {/* Analytics Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Email Analytics
              </CardTitle>
              <CardDescription>
                Track your email performance and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailAnalytics whopUserId={whopUserId} />
            </CardContent>
          </Card>

          {/* AI Send Time Recommendations */}
          <EmailAIRecommendations whopUserId={whopUserId} />

          {!emailDomain && (
            <Card>
              <CardHeader>
                <CardTitle>Get Started with EmailSync</CardTitle>
                <CardDescription>
                  Add your domain to start sending campaigns to your Whop members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setActiveTab("setup")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Add Domain
                </Button>
              </CardContent>
            </Card>
          )}

          {emailDomain && domainStatus !== 'verified' && (
            <Card>
              <CardHeader>
                <CardTitle>Domain Verification Required</CardTitle>
                <CardDescription>
                  Your domain needs to be verified before you can start sending emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => setActiveTab("setup")}>
                  <Globe className="mr-2 h-4 w-4" />
                  Verify Domain
                </Button>
                <Button variant="outline" onClick={checkDomainStatus}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Check Domain Status
                </Button>
                <Button variant="outline" onClick={refreshConfig}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Status
                </Button>
              </CardContent>
            </Card>
          )}


        </TabsContent>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          {!emailDomain || (existingEmailConfig && !existingEmailConfig.username && !existingEmailConfig.custom_domain && (existingEmailConfig.from_email === 'noreply@example.com' || !existingEmailConfig.from_email) && !existingEmailConfig.domain_id && !existingEmailConfig.is_active) ? (
            <EmailSetupForm 
              onSuccess={handleEmailSetupSuccess} 
              whopUserId={whopUserId} 
              existingConfig={existingEmailConfig}
              onConfigCleared={refreshConfig}
            />
          ) : showDomainVerification && emailDomain && domainId ? (
            <DomainVerification
              domain={emailDomain}
              domainId={domainId}
              onVerified={handleDomainVerified}
              whopUserId={whopUserId}
              domainVerificationDns={domainVerificationDns}
            />

          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Domain Setup Complete
                </CardTitle>
                <CardDescription>
                  Your domain is configured and ready to use
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p><strong>From Email:</strong> {getEmailAddress()}</p>
                  <p><strong>Status:</strong> Active</p>
                  <p><strong>Domain Type:</strong> {emailDomain === 'whopmail.com' ? 'whopmail.com (System Default)' : 'Custom Domain'}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setActiveTab("lists")}>
                    <Users className="mr-2 h-4 w-4" />
                    Manage Lists
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEmailDomain(null)
                      setDomainId(null)
                      setDomainStatus(null)
                      setShowDomainVerification(false)
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Change Domain Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-6">
          {/* Domain Configuration */}
          {domainStatus === 'verified' && (
            <DomainConfiguration 
              whopUserId={whopUserId} 
              domainId={domainId || undefined} 
            />
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-6 w-6" />
                Domain Management
              </CardTitle>
              <CardDescription>
                Manage your sending domains for better deliverability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailDomain ? (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p><strong>Custom Domain:</strong> {emailDomain}</p>
                    <p><strong>Status:</strong> 
                      {domainStatus === 'verified' ? (
                        <Badge variant="default" className="bg-green-500">Verified</Badge>
                      ) : domainStatus === 'pending' ? (
                        <Badge variant="secondary">Pending Verification</Badge>
                      ) : domainStatus === 'failed' ? (
                        <Badge variant="destructive">Verification Failed</Badge>
                      ) : (
                        <Badge variant="outline">Not Verified</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {domainStatus === 'verified' 
                        ? 'Domain is verified and ready to send emails'
                        : domainStatus === 'pending'
                        ? 'Domain needs DNS verification before sending'
                        : domainStatus === 'failed'
                        ? 'Domain verification failed. Please check your DNS settings.'
                        : 'Domain needs to be verified before sending emails'
                      }
                    </p>
                  </div>
                  
                  {/* From Name and Email Configuration */}
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-3">Email Sender Configuration</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-orange-700">From Name (Display Name)</label>
                        <p className="text-sm text-orange-600">
                          {existingEmailConfig?.from_name || 'Not set'}
                        </p>
                        <p className="text-xs text-blue-500 mt-1">
                          This is the name recipients will see as the sender
                        </p>
                        {existingEmailConfig?.company_name && (
                          <p className="text-xs text-green-600 mt-1">
                            ✅ Using company name: "{existingEmailConfig.company_name}"
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-orange-700">From Email Address</label>
                        <p className="text-sm text-orange-600 font-mono">
                          {existingEmailConfig?.from_email || `noreply@${emailDomain}`}
                        </p>
                        <p className="text-xs text-blue-500 mt-1">
                          This is the email address that will appear as the sender
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveTab("setup")}
                          className="text-orange-700 border-orange-300 hover:bg-orange-100"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Update Sender Configuration
                        </Button>

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Allow user to set custom email prefix only
                            const currentPrefix = existingEmailConfig?.from_email?.split('@')[0] || 'noreply'
                            const customPrefix = prompt("Enter your email prefix (e.g., 'support', 'sales', 'info'):", currentPrefix)
                            if (customPrefix && customPrefix.trim()) {
                              const fullEmail = `${customPrefix.trim()}@${emailDomain}`
                              // Import the updateFromName function
                              import('@/app/actions/emailsync').then(({ updateFromName }) => {
                                updateFromName(whopUserId, existingEmailConfig?.from_name || 'Support', fullEmail)
                                  .then(result => {
                                    if (result.success) {
                                      refreshConfig()
                                      toast.success(`From email updated to "${fullEmail}"`)
                                    } else {
                                      toast.error(`Failed to update from email: ${result.error}`)
                                    }
                                  })
                              })
                            }
                          }}
                          className="text-orange-700 border-orange-300 hover:bg-orange-100"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Set Custom Email
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowDomainVerification(true)}>
                      <Globe className="mr-2 h-4 w-4" />
                      Verify Domain
                    </Button>
                    <Button variant="outline" onClick={checkDomainStatusFromResend}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Check Status
                    </Button>
                    <Button variant="outline" onClick={listAudiences}>
                      <Users className="mr-2 h-4 w-4" />
                      List Audiences
                    </Button>
                    <Button variant="outline" onClick={cleanupDomain}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Fix Domain Data
                    </Button>
                    <Button variant="outline" onClick={checkDomainStatusFromResend}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Check Email Service Status
                    </Button>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    {resendAudiences.length > 0 ? (
                      <div>
                        <h4 className="font-medium mb-2">Email Audiences ({resendAudiences.length}):</h4>
                        <div className="space-y-2">
                          {resendAudiences.map((audience) => (
                            <div key={audience.id} className="text-sm bg-background p-2 rounded border">
                              <strong>{audience.name}</strong>
                              <br />
                              <span className="text-muted-foreground">ID: {audience.id}</span>
                              {audience.created_at && (
                                <React.Fragment>
                                  <br />
                                  <span className="text-muted-foreground">Created: {new Date(audience.created_at).toLocaleDateString()}</span>
                                </React.Fragment>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No email audiences found. Click "List Audiences" to check.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Add a domain to start sending emails</p>
                  <Button onClick={() => setActiveTab("setup")} className="mt-4">
                    Add Domain
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Domain Health Section */}
          {emailDomain && domainStatus === 'verified' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  Domain Health & Reputation
                </CardTitle>
                <CardDescription>
                  Monitor your domain's email deliverability and reputation using our 3rd party partner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DomainHealth userId={whopUserId} />
              </CardContent>
            </Card>
          )}

          {/* Webhook Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Setup for Automation
              </CardTitle>
              <CardDescription>
                Configure webhooks in your Whop dashboard to enable automation triggers and email flows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Important:</strong> Webhooks are required for automation to work. Without webhooks, your automation triggers and email flows won't receive events from Whop.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Step 1: Get Your Webhook URL</h4>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Input
                      value={`https://www.whopmail.com/api/webhook`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText('https://www.whopmail.com/api/webhook')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Copy this URL to use in your Whop dashboard webhook configuration
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Step 2: Configure in Whop Dashboard</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Go to your <a href="https://whop.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline inline-flex items-center gap-1">
                      Whop Dashboard <ExternalLink className="h-3 w-3" />
                    </a></li>
                    <li>Navigate to <strong>Settings → Webhooks</strong></li>
                    <li>Click <strong>"Add Webhook"</strong></li>
                    <li>Enter the webhook URL from Step 1</li>
                    <li>Select these events:
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li><code className="bg-muted px-1 rounded text-xs">membership.went_valid</code> - When membership becomes active</li>
                        <li><code className="bg-muted px-1 rounded text-xs">membership.went_invalid</code> - When membership expires</li>
                        <li><code className="bg-muted px-1 rounded text-xs">membership.created</code> - When membership is created</li>
                        <li><code className="bg-muted px-1 rounded text-xs">membership.updated</code> - When membership is updated</li>
                        <li><code className="bg-muted px-1 rounded text-xs">payment_succeeded</code> - When payment is successful</li>
                        <li><code className="bg-muted px-1 rounded text-xs">payment_failed</code> - When payment fails</li>
                        <li><code className="bg-muted px-1 rounded text-xs">refund_created</code> - When refund is issued</li>
                        <li><code className="bg-muted px-1 rounded text-xs">dispute_created</code> - When dispute is created</li>
                      </ul>
                    </li>
                    <li>Click <strong>"Save Webhook"</strong></li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Step 3: Test Your Webhook</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    After setting up the webhook, you can test it by:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Creating a test automation trigger in the <strong>Automation</strong> tab</li>
                    <li>Using the "Test" button to simulate webhook events</li>
                    <li>Checking the webhook logs in your Whop dashboard</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists" className="space-y-6">
          {listSuccessMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">{listSuccessMessage}</p>
              </div>
            </div>
          )}
          
          {/* List Manager */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-6 w-6" />
                List Management
              </CardTitle>
              <CardDescription>
                Create new lists and add members to existing lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListManager
                whopUserId={whopUserId}
                audiences={audiences}
                onListCreated={handleRefreshLists}
                onMemberAdded={handleRefreshLists}
                availableMembers={members}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Email Lists
                  </CardTitle>
                  <CardDescription>
                    Manage your email lists and member subscriptions
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleRefreshLists} 
                  disabled={isRefreshingLists}
                  variant="outline"
                  size="sm"
                >
                  {isRefreshingLists ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Lists
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {audiences.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No email lists created yet</p>
                  <Button onClick={() => setActiveTab("setup")}>Create Your First List</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {audiences.map((aud) => (
                    <div key={aud.id} className="border rounded-lg p-4 bg-muted">
                      <div className="flex items-center justify-between">
                        <div>
                          <strong>{aud.name}</strong>
                          <span className="ml-2 text-xs text-muted-foreground">({aud.member_count} members)</span>
                          {(() => {
                            // Check if the list is still processing
                            const isProcessing = aud.audience_id && (
                              aud.audience_id.startsWith('temp_') || 
                              aud.audience_id.startsWith('instant_') ||
                              (aud.platform_audience_data?.processing === true)
                            )
                            
                            // Check if the list is ready (has a real Resend audience ID)
                            const isReady = aud.audience_id && 
                              !aud.audience_id.startsWith('temp_') && 
                              !aud.audience_id.startsWith('instant_') &&
                              aud.platform_audience_data?.export_ready === true

                            if (isProcessing) {
                              return <Badge variant="secondary" className="ml-2">Processing...</Badge>
                            } else if (isReady) {
                              return <Badge variant="default" className="ml-2 bg-green-500">Ready for Mass Email</Badge>
                            } else {
                              return <Badge variant="outline" className="ml-2">Ready</Badge>
                            }
                          })()}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleExpandAudience(aud.id)}>
                            {expandedAudienceId === aud.id ? "Hide Members" : "View Members"}
                          </Button>

                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleUpdateList(aud.id)}
                            disabled={isRefreshingLists || syncingAudienceId === aud.id}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Update List
                          </Button>

                          {/* Fix Status button for stuck processing lists */}
                          {(() => {
                            const isProcessing = aud.audience_id && (
                              aud.audience_id.startsWith('temp_') || 
                              aud.audience_id.startsWith('instant_') ||
                              (aud.platform_audience_data?.processing === true)
                            )
                            
                            if (isProcessing) {
                              return (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleFixProcessingStatus(aud.id, aud.member_count || 0)}
                                  disabled={isRefreshingLists || syncingAudienceId === aud.id}
                                  title="Fix stuck processing status"
                                >
                                  <Wrench className="h-4 w-4 mr-2" />
                                  Fix Status
                                </Button>
                              )
                            }
                            return null
                          })()}


                          {aud.audience_id && (aud.audience_id.startsWith('temp_') || aud.audience_id.startsWith('instant_')) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncToResend(aud.id)}
                              disabled={isRefreshingLists || syncingAudienceId === aud.id}
                            >
                              {syncingAudienceId === aud.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Syncing...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Sync for Mass Email
                                </>
                              )}
                            </Button>
                          )}
                          {aud.audience_id && !aud.audience_id.startsWith('temp_') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResyncToResend(aud.id)}
                              disabled={isRefreshingLists || syncingAudienceId === aud.id}
                            >
                              {syncingAudienceId === aud.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Re-syncing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Re-sync
                                </>
                              )}
                            </Button>
                          )}

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteList(aud.id)}
                            disabled={isRefreshingLists || syncingAudienceId === aud.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {expandedAudienceId === aud.id && (
                        <div className="mt-4 space-y-2">
                          {audienceMembers[aud.id] && audienceMembers[aud.id].length > 0 ? (
                            audienceMembers[aud.id].map((member) => (
                              <div key={member.id} className="flex items-center justify-between border-b py-2">
                                <div>
                                  <span className="font-medium">{member.full_name || member.email}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">{member.email}</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleOpenEmailModal(member, aud)}>
                                    Send Email
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleAddMemberToList(member)}
                                  >
                                    Add to List
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">No members in this list.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Send Individual Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-sm">
                    <strong>To:</strong> {emailModalMember?.email || ""}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>From:</strong> {getEmailAddress()}
                  </div>
                </div>
                <EnhancedEmailSender
                  whopUserId={whopUserId}
                  fromEmail={getEmailAddress()}
                  recipientEmail={emailModalMember?.email}
                />
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          {campaignSuccessMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">{campaignSuccessMessage}</p>
              </div>
            </div>
          )}
          {campaignErrorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">{campaignErrorMessage}</p>
              </div>
            </div>
          )}
          {audiences.length > 0 ? (
            <div className="space-y-6">
                             <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Send className="h-6 w-6" />
                     Email Campaign Designer
                   </CardTitle>
                   <CardDescription>
                     Design beautiful email campaigns with our visual editor
                   </CardDescription>
                   
                   {/* Campaign Controls */}
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
                     {/* Subject Line */}
                     <div>
                       <div className="flex items-center justify-between">
                         <label htmlFor="subject" className="text-sm font-medium">Subject Line</label>
                         <button
                           type="button"
                           onClick={() => setShowTemplateVariables(!showTemplateVariables)}
                           className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                         >
                           <HelpCircle className="h-3 w-3" />
                           Template Variables
                         </button>
                       </div>
                       <input
                         id="subject"
                         type="text"
                         value={campaignSubject}
                         onChange={(e) => setCampaignSubject(e.target.value)}
                         placeholder="Enter email subject..."
                         className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                       />
                       
                       {/* Auto-save Status */}
                       <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded-md border">
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                           <span className="text-xs text-gray-600">Auto-saving...</span>
                         </div>
                         <div className="flex items-center gap-2">
                           {hasSavedDraft && (
                             <button
                               type="button"
                               onClick={() => {
                                 try {
                                   const saved = localStorage.getItem(AUTO_SAVE_KEY)
                                   if (saved) {
                                     const draft = JSON.parse(saved)
                                     if (draft.subject) {
                                       setCampaignSubject(draft.subject)
                                       // Show success message
                                       const button = event?.target as HTMLButtonElement
                                       if (button) {
                                         const originalText = button.textContent
                                         button.textContent = 'Restored!'
                                         button.disabled = true
                                         setTimeout(() => {
                                           button.textContent = originalText
                                           button.disabled = false
                                         }, 1500)
                                       }
                                     }
                                   }
                                 } catch (error) {
                                   console.warn('Failed to restore draft:', error)
                                 }
                               }}
                               className="text-xs px-2 py-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded"
                             >
                               Restore Draft
                             </button>
                           )}
                           <button
                             type="button"
                             onClick={saveDraft}
                             className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded"
                           >
                             Save Draft
                           </button>
                         </div>
                       </div>
                     </div>

                     {/* Audience Selection */}
                     {audiences.length > 0 && (
                       <div>
                         <label htmlFor="audience" className="text-sm font-medium">Send To Audience</label>
                         <select 
                           id="audience"
                           value={selectedAudienceId}
                           onChange={(e) => setSelectedAudienceId(e.target.value)}
                           className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                         >
                           <option value="">Select an audience...</option>
                           {audiences.map((audience) => (
                             <option key={audience.id} value={audience.id}>
                               {audience.name} ({audience.member_count} members)
                             </option>
                           ))}
                         </select>
                       </div>
                     )}

                     {/* Email Width */}
                     <div>
                       <label className="text-sm font-medium">Email Width</label>
                       <select 
                         className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                         defaultValue="600"
                       >
                         <option value="500">Narrow (500px)</option>
                         <option value="600">Standard (600px)</option>
                         <option value="700">Wide (700px)</option>
                         <option value="800">Extra Wide (800px)</option>
                       </select>
                     </div>
                   </div>

                   {/* Template Variables Dialog */}
                   <Dialog open={showTemplateVariables} onOpenChange={setShowTemplateVariables}>
                     <DialogContent className="max-w-md">
                       <DialogHeader>
                         <DialogTitle className="flex items-center gap-2">
                           <HelpCircle className="h-4 w-4" />
                           Template Variables
                         </DialogTitle>
                       </DialogHeader>
                       <div className="space-y-4">
                         <div className="grid grid-cols-1 gap-2 text-sm">
                           <div className="flex items-center justify-between">
                             <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{"{{{FIRST_NAME|Member}}}"}</code>
                             <span className="text-muted-foreground">First name with fallback</span>
                           </div>
                           <div className="flex items-center justify-between">
                             <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{"{{{LAST_NAME|User}}}"}</code>
                             <span className="text-muted-foreground">Last name with fallback</span>
                           </div>
                           <div className="flex items-center justify-between">
                             <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{"{{{FIRST_NAME|Member}}} {{{LAST_NAME|User}}}"}</code>
                             <span className="text-muted-foreground">Full name with fallback</span>
                           </div>
                           <div className="flex items-center justify-between">
                             <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{"{{{EMAIL|user@example.com}}}"}</code>
                             <span className="text-muted-foreground">Email address with fallback</span>
                           </div>
                         </div>
                         <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
                           <strong>How to Use:</strong>
                           <br />
                           Add these variables to your email content (not subject line):
                           <br />
                           <br />
                           <strong>Examples:</strong>
                           <br />
                           • Content: "Hello {'{{{FIRST_NAME|Member}}}'} {'{{{LAST_NAME|User}}}'}, thanks for joining!"
                           <br />
                           • Content: "Your email: {'{{{EMAIL|user@example.com}}}'}"
                           <br />
                           <br />
                           <strong>Note:</strong> Variables work in email content only. Subject lines cannot be personalized in broadcasts.
                         </div>
                       </div>
                     </DialogContent>
                   </Dialog>
                 </CardHeader>
                 <CardContent>
                   <div className="h-[800px] border rounded-lg">
                     <EmailDesigner
                       onSend={async (emailData) => {
                         await handleSendCampaign(emailData)
                       }}
                       initialSubject={campaignSubject}
                       selectedAudienceId={selectedAudienceId}
                       whopUserId={whopUserId}
                       isSending={isSendingCampaign}
                       availableAudiences={audiences}
                     />
                   </div>
                 </CardContent>
               </Card>


            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No email lists available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create an email list to start sending campaigns
                </p>
                <Button onClick={() => setActiveTab("lists")}>
                  <Users className="mr-2 h-4 w-4" />
                  Create Email List
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>



        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          {/* Webhook Setup Notice */}
          <Alert>
            <Webhook className="h-4 w-4" />
            <AlertDescription>
              <strong>Webhook Setup Required:</strong> Configure webhooks in your Whop dashboard to enable automation. 
              <a href="#overview" onClick={() => setActiveTab("overview")} className="text-orange-600 hover:underline ml-1">
                View setup instructions →
              </a>
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="triggers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="triggers">Automation Triggers</TabsTrigger>
              <TabsTrigger value="flows">Email Flows</TabsTrigger>
              <TabsTrigger value="webhook">Webhook Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="triggers" className="space-y-6">
              <AutomationTriggers whopUserId={whopUserId} />
            </TabsContent>
            
            <TabsContent value="flows" className="space-y-6">
              <EmailFlows whopUserId={whopUserId} />
            </TabsContent>

            <TabsContent value="webhook" className="space-y-6">
              <AutomationSettings whopUserId={whopUserId} />
              <UserWebhookManager whopUserId={whopUserId} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* AI Design Tab */}
        <TabsContent value="ai-design" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-6 w-6" />
                AI-Powered Email Design
              </CardTitle>
              <CardDescription>
                Create stunning emails with AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Plus className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground mb-4">AI-powered email design and content creation</p>
                <div className="bg-muted/50 p-4 rounded-lg max-w-md mx-auto">
                  <h4 className="font-medium mb-2">What's coming:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• AI-generated email templates</li>
                    <li>• Smart content suggestions</li>
                    <li>• Subject line optimization</li>
                    <li>• Personalized content creation</li>
                    <li>• Design layout recommendations</li>
                    <li>• Brand-consistent styling</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-6">
          <CompanySettings whopUserId={whopUserId} />
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-6">
          <FormBuilder whopUserId={whopUserId} />
        </TabsContent>

        </Tabs>
      ) : (
        <div className="space-y-6">
          {/* Show content without tabs when showHeader is false */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Overview Tab Content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Domain Status</CardTitle>
                    {domainStatus === 'verified' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : domainStatus === 'pending' ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : domainStatus === 'failed' ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {domainStatus === 'verified' ? "Verified" : 
                       domainStatus === 'pending' ? "Pending" :
                       domainStatus === 'failed' ? "Failed" :
                       emailDomain ? "Not Verified" : "Not Setup"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {emailDomain ? getEmailAddress() : "Complete setup to start sending"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Synced Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{syncedCount}</div>
                    <p className="text-xs text-muted-foreground">
                      of {totalMemberCount} total members
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Campaigns Sent</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">
                      No campaigns sent yet
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member to List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Add <strong>{selectedMemberForList?.email}</strong> to a list:
              </p>
              <Select onValueChange={(value) => handleAddMemberToListConfirm(value)}>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}