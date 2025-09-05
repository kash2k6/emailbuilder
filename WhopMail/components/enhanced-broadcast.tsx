'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { Send, Clock, CheckCircle, XCircle, History, Users, MessageSquare } from 'lucide-react'
import { EmojiPicker } from './emoji-picker'

interface BroadcastJob {
  id: string
  user_id: string
  message: string
  total_members: number
  processed_count: number
  success_count: number
  error_count: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
}

interface BroadcastStats {
  total: number
  sent: number
  failed: number
  pending: number
  successRate: number
}

interface EnhancedBroadcastProps {
  apiKey: string
  agentUserId: string
  userId: string
  targetUserIds?: string[]
  onComplete?: () => void
}

export function EnhancedBroadcast({
  apiKey,
  agentUserId,
  userId,
  targetUserIds,
  onComplete
}: EnhancedBroadcastProps) {
  const { toast } = useToast()
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [jobProgress, setJobProgress] = useState<{
    job: BroadcastJob | null
    stats: BroadcastStats | null
  }>({ job: null, stats: null })
  const [showHistory, setShowHistory] = useState(false)
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastJob[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [resumingJobId, setResumingJobId] = useState<string | null>(null)

  // Poll for job progress
  useEffect(() => {
    if (!currentJobId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/whop-marketing/enhanced-broadcast/status?jobId=${currentJobId}`)
        const data = await response.json()

        if (data.success) {
          setJobProgress({
            job: data.job,
            stats: data.stats
          })

          // If job is completed or failed, stop polling
          if (data.job.status === 'completed' || data.job.status === 'failed') {
            clearInterval(pollInterval)
            setIsSending(false)
            setCurrentJobId(null)
            
            if (data.job.status === 'completed') {
              toast({
                title: 'Broadcast Completed!',
                description: `Successfully sent ${data.job.success_count} messages`,
                variant: 'default'
              })
            } else {
              toast({
                title: 'Broadcast Failed',
                description: `Failed to send messages. Check logs for details.`,
                variant: 'destructive'
              })
            }

            if (onComplete) {
              onComplete()
            }
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [currentJobId, toast, onComplete])

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter a message to send',
        variant: 'destructive'
      })
      return
    }

    if (!apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please configure your API key first',
        variant: 'destructive'
      })
      return
    }

    setIsSending(true)
    setJobProgress({ job: null, stats: null })

    try {
      const response = await fetch('/api/whop-marketing/enhanced-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          apiKey,
          agentUserId,
          userId,
          targetUserIds
        })
      })

      const data = await response.json()

      if (data.success) {
        if (data.jobId) {
          setCurrentJobId(data.jobId)
          toast({
            title: 'Broadcast Started',
            description: 'Your broadcast is being processed in the background',
            variant: 'default'
          })
        } else if (data.sentCount) {
          toast({
            title: 'Messages Sent',
            description: `Successfully sent ${data.sentCount} messages immediately`,
            variant: 'default'
          })
          setIsSending(false)
          if (onComplete) {
            onComplete()
          }
        }
      } else {
        toast({
          title: 'Broadcast Failed',
          description: data.errors?.join(', ') || 'Failed to send broadcast',
          variant: 'destructive'
        })
        setIsSending(false)
      }
    } catch (error) {
      console.error('Error sending broadcast:', error)
      toast({
        title: 'Error',
        description: 'Failed to send broadcast. Please try again.',
        variant: 'destructive'
      })
      setIsSending(false)
    }
  }

  const loadBroadcastHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/whop-marketing/enhanced-broadcast/history?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setBroadcastHistory(data.jobs || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load broadcast history',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading broadcast history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load broadcast history',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleResumeJob = async (jobId: string) => {
    setResumingJobId(jobId)
    try {
      const response = await fetch('/api/whop-marketing/enhanced-broadcast/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Broadcast Resumed',
          description: data.message || 'Broadcast job resumed successfully',
          variant: 'default'
        })
        
        // Start polling for this job
        setCurrentJobId(jobId)
      } else {
        toast({
          title: 'Resume Failed',
          description: data.error || 'Failed to resume broadcast',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error resuming broadcast job:', error)
      toast({
        title: 'Error',
        description: 'Failed to resume broadcast job',
        variant: 'destructive'
      })
    } finally {
      setResumingJobId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Message Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Enhanced Broadcast Message
          </CardTitle>
          <CardDescription>
            Send personalized messages to {targetUserIds ? `${targetUserIds.length} selected users` : 'all your members'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here... Use {{name}} to personalize with member names"
                className="min-h-[120px] pr-10"
                disabled={isSending}
              />
              <div className="absolute bottom-2 right-2">
                <EmojiPicker
                  onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)}
                  disabled={isSending}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMessage(prev => prev + '{{name}}')}
                disabled={isSending}
              >
                Add Name
              </Button>
              <span>Use {'{{name}}'} to personalize with member names</span>
            </div>
          </div>

          <Button
            onClick={handleSendBroadcast}
            disabled={!message.trim() || isSending}
            className="w-full"
          >
            {isSending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Broadcast
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Job Progress */}
      {jobProgress.job && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(jobProgress.job.status)}
              Broadcast Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge className={getStatusColor(jobProgress.job.status)}>
                {jobProgress.job.status.charAt(0).toUpperCase() + jobProgress.job.status.slice(1)}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{jobProgress.job.processed_count} / {jobProgress.job.total_members}</span>
              </div>
              <Progress 
                value={(jobProgress.job.processed_count / jobProgress.job.total_members) * 100} 
                className="h-2"
              />
            </div>

            {jobProgress.stats && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Sent: {jobProgress.stats.sent}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Failed: {jobProgress.stats.failed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span>Pending: {jobProgress.stats.pending}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>Success Rate: {jobProgress.stats.successRate.toFixed(1)}%</span>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Job ID: {jobProgress.job.id}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Broadcast History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Broadcast History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              setShowHistory(!showHistory)
              if (!showHistory && broadcastHistory.length === 0) {
                loadBroadcastHistory()
              }
            }}
            disabled={isLoadingHistory}
          >
            {isLoadingHistory ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                {showHistory ? 'Hide History' : 'Show History'}
              </>
            )}
          </Button>

          {showHistory && (
            <div className="mt-4 space-y-3">
              {broadcastHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No broadcast history found</p>
              ) : (
                                 broadcastHistory.map((job) => (
                   <div key={job.id} className="border rounded-lg p-3 space-y-2">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         {getStatusIcon(job.status)}
                         <span className="text-sm font-medium">
                           {job.message.length > 50 ? job.message.substring(0, 50) + '...' : job.message}
                         </span>
                       </div>
                       <div className="flex items-center gap-2">
                         <Badge className={getStatusColor(job.status)}>
                           {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                         </Badge>
                         {job.status === 'pending' && (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handleResumeJob(job.id)}
                             disabled={resumingJobId === job.id}
                           >
                             {resumingJobId === job.id ? (
                               <>
                                 <Clock className="h-3 w-3 mr-1 animate-spin" />
                                 Resuming...
                               </>
                             ) : (
                               <>
                                 <Send className="h-3 w-3 mr-1" />
                                 Resume
                               </>
                             )}
                           </Button>
                         )}
                       </div>
                     </div>
                     <div className="flex items-center justify-between text-xs text-gray-500">
                       <span>{job.total_members} members</span>
                       <span>{formatDate(job.created_at)}</span>
                     </div>
                     {job.status === 'completed' && (
                       <div className="text-xs text-green-600">
                         ✅ {job.success_count} sent successfully
                       </div>
                     )}
                     {job.status === 'pending' && (
                       <div className="text-xs text-yellow-600">
                         ⏸️ Job interrupted - click Resume to continue
                       </div>
                     )}
                   </div>
                 ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 