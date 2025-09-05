'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  MessageSquare, 
  Users, 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  User,
  Mail,
  Plus,
  Clock,
  XCircle
} from "lucide-react"
import { sendAgentRequestMessage, getUserAgentConfig, getUserAgentRequests, type WhopAgentRequest } from "@/app/actions/whop-agent"
import { EmojiPicker } from "@/components/emoji-picker"
import { useToast } from "@/hooks/use-toast"

interface WhopMember {
  id: string
  user: {
    id: string
    email: string
    username?: string
    name?: string
  }
}

interface WhopInternalMarketingProps {
  whopUserId: string
  whopApiKey: string
}

export default function WhopInternalMarketing({ whopUserId, whopApiKey }: WhopInternalMarketingProps) {
  const { toast } = useToast()
  // State for API key management
  const apiKey = whopApiKey // Use the passed API key directly
  

  
  // State for messaging
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    success: boolean
    sentCount?: number
    errors?: string[]
    jobId?: string
  } | null>(null)
  
  // State for background job tracking
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [jobProgress, setJobProgress] = useState<{
    processedCount: number
    successCount: number
    errorCount: number
    totalMembers: number
    status: string
  } | null>(null)
  
  // State for showing/hiding user IDs (for developers)
  const [showUserIds, setShowUserIds] = useState(false)
  
  // State for member selection
  const [members, setMembers] = useState<WhopMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  
  // State for active tab
  const [activeTab, setActiveTab] = useState("broadcast")
  
  // State for agent configuration
  const [agentConfig, setAgentConfig] = useState<any>(null)
  const [agentRequests, setAgentRequests] = useState<WhopAgentRequest[]>([])
  const [isLoadingAgentConfig, setIsLoadingAgentConfig] = useState(false)
  const [showAgentRequestDialog, setShowAgentRequestDialog] = useState(false)
  const [agentRequestForm, setAgentRequestForm] = useState({
    agentName: '',
    logoUrl: ''
  })
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  // Load members when API key changes
  useEffect(() => {
    if (apiKey) {
      loadMembers()
    }
  }, [apiKey, whopApiKey]) // Include whopApiKey to react to changes

  // Load agent configuration
  useEffect(() => {
    loadAgentConfig()
    loadAgentRequests()
  }, [])

  // Poll job status when there's an active job
  useEffect(() => {
    if (currentJobId && jobProgress?.status !== 'completed' && jobProgress?.status !== 'failed') {
      const interval = setInterval(() => {
        pollJobStatus(currentJobId)
      }, 2000) // Poll every 2 seconds
      
      return () => clearInterval(interval)
    }
  }, [currentJobId, jobProgress?.status])

  const loadMembers = async () => {
    if (!apiKey) {
      console.log('Missing apiKey:', { apiKey: apiKey ? 'present' : 'missing' })
      return
    }
    
    console.log('Loading all members')
    setIsLoadingMembers(true)
    try {
      const response = await fetch('/api/whop-marketing/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey
        })
      })
      
      const result = await response.json()
      console.log('Members API response:', result)
      
      if (result.success && result.members) {
        setMembers(result.members)
        console.log('Loaded members:', result.members.length)
      } else {
        console.error('Failed to load members:', result.error)
      }
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const loadAgentConfig = async () => {
    setIsLoadingAgentConfig(true)
    try {
      const result = await getUserAgentConfig(whopUserId)
      if (result.success) {
        setAgentConfig(result.config)
      } else {
        console.error('Failed to load agent config:', result.error)
      }
    } catch (error) {
      console.error('Error loading agent config:', error)
    } finally {
      setIsLoadingAgentConfig(false)
    }
  }

  const loadAgentRequests = async () => {
    try {
      const result = await getUserAgentRequests(whopUserId)
      if (result.success) {
        setAgentRequests(result.requests || [])
      } else {
        console.error('Failed to load agent requests:', result.error)
      }
    } catch (error) {
      console.error('Error loading agent requests:', error)
    }
  }

  const handleAgentRequest = async () => {
    if (!agentRequestForm.agentName.trim()) {
      alert('Please enter an agent name')
      return
    }

    setIsSubmittingRequest(true)
    try {
      const result = await sendAgentRequestMessage(
        agentRequestForm.agentName,
        agentRequestForm.logoUrl || undefined,
        whopUserId // Pass the user ID
      )
      
      if (result.success) {
        alert('Agent request sent successfully! Please allow 2-3 hours for setup.')
        setShowAgentRequestDialog(false)
        setAgentRequestForm({ agentName: '', logoUrl: '' })
        loadAgentRequests() // Refresh the requests list
      } else {
        alert(`Failed to send request: ${result.error}`)
      }
    } catch (error) {
      console.error('Error sending agent request:', error)
      alert('Failed to send agent request')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  const handleBroadcastMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message",
        variant: "destructive",
      })
      return
    }

    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "No API key available",
        variant: "destructive",
      })
      return
    }

    // Check if user has agent configuration
    if (!agentConfig) {
      toast({
        title: "Agent Setup Required",
        description: "You need to set up an agent first. Please request agent setup.",
        variant: "destructive",
      })
      return
    }
    
    setIsSending(true)
    setSendResult(null)
    
    try {
      const response = await fetch('/api/whop-marketing/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          apiKey,
          agentUserId: agentConfig.agent_user_id
        })
      })
      
      const result = await response.json()
      setSendResult(result)
      
      if (result.success) {
        if (result.jobId) {
          // Large broadcast - start tracking job
          setCurrentJobId(result.jobId)
          setJobProgress({
            processedCount: 0,
            successCount: 0,
            errorCount: 0,
            totalMembers: 0,
            status: 'pending'
          })
          toast({
            title: "Broadcast Started",
            description: `Broadcast job started! Processing ${result.sentCount || 0} members in the background.`,
          })
        } else {
          // Small broadcast - completed immediately
          setMessage("") // Clear message on success
          toast({
            title: "Message Sent",
            description: `Successfully sent message to ${result.sentCount || 0} members!`,
          })
        }
      } else {
        toast({
          title: "Error",
          description: result.errors?.join(', ') || "Failed to send broadcast message",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error sending broadcast:', error)
      setSendResult({
        success: false,
        errors: ['Failed to send broadcast message']
      })
      toast({
        title: "Error",
        description: "Failed to send broadcast message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleSendToSelected = async () => {
    if (selectedMembers.size === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one member",
        variant: "destructive",
      })
      return
    }
    
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message",
        variant: "destructive",
      })
      return
    }

    if (!agentConfig) {
      toast({
        title: "Agent Setup Required",
        description: "You need to set up an agent first. Please request agent setup.",
        variant: "destructive",
      })
      return
    }
    
    setIsSending(true)
    setSendResult(null)
    
    try {
      const response = await fetch('/api/whop-marketing/selected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberIds: Array.from(selectedMembers),
          message: message.trim(),
          apiKey,
          agentUserId: agentConfig.agent_user_id
        })
      })
      
      const result = await response.json()
      setSendResult(result)
      
      if (result.success) {
        setMessage("") // Clear message on success
        setSelectedMembers(new Set()) // Clear selection
        toast({
          title: "Messages Sent",
          description: `Successfully sent messages to ${result.sentCount || selectedMembers.size} selected members!`,
        })
      } else {
        toast({
          title: "Error",
          description: result.errors?.join(', ') || "Failed to send messages to selected members",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error sending to selected:', error)
      setSendResult({
        success: false,
        errors: ['Failed to send messages to selected members']
      })
      toast({
        title: "Error",
        description: "Failed to send messages to selected members",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(members.map(m => m.user.id)))
    }
  }

  const handleSelectMember = (userId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedMembers(newSelected)
  }

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji)
  }

  const insertPlaceholder = (placeholder: string) => {
    setMessage(prev => prev + placeholder)
  }

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/whop-marketing/broadcast/status?jobId=${jobId}`)
      const result = await response.json()
      
      if (result.success && result.job) {
        const job = result.job
        setJobProgress({
          processedCount: job.processedCount,
          successCount: job.successCount,
          errorCount: job.errorCount,
          totalMembers: job.totalMembers,
          status: job.status
        })
        
        // If job is completed, update the final result
        if (job.status === 'completed') {
          setSendResult({
            success: job.successCount > 0,
            sentCount: job.successCount,
            errors: job.errors.length > 0 ? job.errors : undefined
          })
          setCurrentJobId(null)
          setJobProgress(null)
        } else if (job.status === 'failed') {
          setSendResult({
            success: false,
            errors: job.errors
          })
          setCurrentJobId(null)
          setJobProgress(null)
        }
      }
    } catch (error) {
      console.error('Error polling job status:', error)
    }
  }

  const filteredMembers = members.filter(member =>
    member.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Whop Internal Marketing
          </CardTitle>
          <CardDescription>
            Send broadcast messages to all members or selected members using Whop's internal messaging system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agent Configuration */}
          <div className="space-y-4">
            {isLoadingAgentConfig ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2">Loading agent configuration...</span>
              </div>
            ) : agentConfig ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Agent Configuration</p>
                    <p className="text-sm text-muted-foreground">
                      Agent: {agentConfig.agent_name}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No agent configured. You need to request agent setup to send broadcast messages.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Agent Requests */}
          {agentRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Agent Requests</p>
              <div className="space-y-2">
                {agentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{request.agent_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge 
                      variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}
                    >
                      {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Agent Setup */}
          {!agentConfig && (
            <div className="space-y-2">
              <Dialog open={showAgentRequestDialog} onOpenChange={setShowAgentRequestDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Request Agent Setup
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Agent Setup</DialogTitle>
                    <DialogDescription>
                      Request a custom agent to send broadcast messages. Please allow 2-3 hours for setup.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="agentName">Agent Name</Label>
                      <Input
                        id="agentName"
                        value={agentRequestForm.agentName}
                        onChange={(e) => setAgentRequestForm(prev => ({ ...prev, agentName: e.target.value }))}
                        placeholder="Enter agent name (e.g., My App Agent)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
                      <Input
                        id="logoUrl"
                        value={agentRequestForm.logoUrl}
                        onChange={(e) => setAgentRequestForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <Button 
                      onClick={handleAgentRequest}
                      disabled={isSubmittingRequest || !agentRequestForm.agentName.trim()}
                      className="w-full"
                    >
                      {isSubmittingRequest ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending Request...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Request
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* API Configuration */}
          <div className="space-y-4">
            {!apiKey ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No API key found. Please set up your Whop API key in the Setup tab first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Using API key from setup page. To change it, go to the Setup tab.
                </p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="broadcast">Broadcast to All</TabsTrigger>
              <TabsTrigger value="selected">Send to Selected</TabsTrigger>
            </TabsList>

            <TabsContent value="broadcast" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="broadcastMessage">Message</Label>
                <div className="relative">
                  <Textarea
                    id="broadcastMessage"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your broadcast message... Use {{name}} to insert member names"
                    rows={4}
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertPlaceholder('{{name}}')}
                      className="h-8 px-2 text-xs"
                    >
                      Name
                    </Button>
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleBroadcastMessage}
                disabled={isSending || !message.trim()}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Broadcast...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Broadcast to All Members
                  </>
                )}
              </Button>

              {/* Job Progress Indicator */}
              {jobProgress && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Background Processing</span>
                    <Badge variant={jobProgress.status === 'completed' ? 'default' : 'secondary'}>
                      {jobProgress.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{jobProgress.processedCount} / {jobProgress.totalMembers}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${jobProgress.totalMembers > 0 ? (jobProgress.processedCount / jobProgress.totalMembers) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-600 font-medium">✓ {jobProgress.successCount}</span>
                      <span className="text-muted-foreground ml-1">sent</span>
                    </div>
                    <div>
                      <span className="text-red-600 font-medium">✗ {jobProgress.errorCount}</span>
                      <span className="text-muted-foreground ml-1">errors</span>
                    </div>
                  </div>
                  
                  {jobProgress.status === 'processing' && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Processing in background...
                    </div>
                  )}
                </div>
              )}
            </TabsContent>



            <TabsContent value="selected" className="space-y-4">
              {/* Member Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Select Members</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUserIds(!showUserIds)}
                      className="text-xs"
                    >
                      {showUserIds ? 'Hide' : 'Show'} User IDs
                      <Badge variant="outline" className="ml-1 text-xs">Dev</Badge>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={members.length === 0}
                    >
                      {selectedMembers.size === members.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {isLoadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading members...</span>
                  </div>
                ) : members.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          {showUserIds && <TableHead>User ID</TableHead>}
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMembers.map((member) => (
                          <TableRow key={member.user.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedMembers.has(member.user.id)}
                                onCheckedChange={() => handleSelectMember(member.user.id)}
                              />
                            </TableCell>
                            {showUserIds && (
                              <TableCell className="font-mono text-sm">
                                {member.user.id}
                              </TableCell>
                            )}
                            <TableCell className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {member.user.email}
                            </TableCell>
                            <TableCell>
                              {member.user.name ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {member.user.name}
                                </div>
                              ) : member.user.username ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {member.user.username}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No name</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {member.user.username && member.user.username !== member.user.name ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">@{member.user.username}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No members found. Please enter a valid Product ID and API Key.
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {selectedMembers.size} of {members.length} members selected
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="selectedMessage">Message</Label>
                <div className="relative">
                  <Textarea
                    id="selectedMessage"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message... Use {{name}} to insert member names"
                    rows={4}
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertPlaceholder('{{name}}')}
                      className="h-8 px-2 text-xs"
                    >
                      Name
                    </Button>
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleSendToSelected}
                disabled={isSending || selectedMembers.size === 0 || !message.trim()}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Messages...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send to {selectedMembers.size} Selected Members
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Results */}
          {sendResult && (
            <Alert className={sendResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {sendResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={sendResult.success ? "text-green-800" : "text-red-800"}>
                {sendResult.success ? (
                  <div>
                    <p className="font-medium">✅ Success!</p>
                    <p>Sent {sendResult.sentCount} message(s) successfully.</p>
                    {sendResult.errors && sendResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Some errors occurred:</p>
                        <ul className="list-disc list-inside text-sm">
                          {sendResult.errors.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {sendResult.errors.length > 5 && (
                            <li>... and {sendResult.errors.length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">❌ Failed to send messages</p>
                    {sendResult.errors && (
                      <ul className="list-disc list-inside text-sm">
                        {sendResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 