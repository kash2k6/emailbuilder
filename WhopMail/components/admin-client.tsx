'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { DashboardHeader } from '@/components/dashboard-header'
import { DashboardShell } from '@/components/dashboard-shell'

interface AdminNotification {
  id: string
  type: string
  whop_user_id: string
  audience_id: string
  audience_name: string
  user_email: string
  status: string
  resend_audience_id?: string
  notes?: string
  created_at: string
}

interface AdminClientProps {
  whopToken: string | null
  whopUserId: string | null
  whopCompanyId: string | null
}

export default function AdminClient({ whopToken, whopUserId, whopCompanyId }: AdminClientProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null)
  const [csvData, setCsvData] = useState<any>(null)
  const [resendAudienceId, setResendAudienceId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications')
      const data = await response.json()
      
      if (data.notifications) {
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const generateCSV = async (whopUserId: string, audienceName: string) => {
    try {
      console.log('Starting CSV generation for:', whopUserId, audienceName)
      console.log('Making API call to /api/admin/notifications...')
      
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ whopUserId, audienceName })
      })

      console.log('API response received, status:', response.status)
      const data = await response.json()
      console.log('API response data:', data)
      
      if (data.success) {
        console.log('CSV generation successful, data:', data)
        console.log('Setting csvData state with:', data)
        setCsvData(data)
        console.log('csvData state should now be set')
        toast.success(`✅ Generated CSV with ${data.contactCount} members`)
        
        // Auto-fill the Resend audience ID for linking
        if (data.resendAudienceId) {
          setResendAudienceId(data.resendAudienceId)
        }
      } else {
        console.error('CSV generation failed:', data.error)
        toast.error(data.error || 'Failed to generate CSV')
      }
    } catch (error) {
      console.error('Error generating CSV:', error)
      toast.error('Failed to generate CSV')
    }
  }

  const downloadCSV = () => {
    console.log('Download CSV called, csvData:', csvData)
    if (!csvData) {
      console.error('No CSV data available')
      toast.error('No CSV data available')
      return
    }

    console.log('Creating blob with content length:', csvData.csvContent?.length)
    
    try {
      // Create blob with proper MIME type
      const blob = new Blob([csvData.csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      })
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${csvData.audienceName.replace(/[^a-zA-Z0-9]/g, '_')}_${csvData.contactCount}_contacts.csv`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      console.log('Download triggered for file:', link.download)
      toast.success('CSV download started')
      
      // Alternative method if the first one doesn't work
      setTimeout(() => {
        // Try opening in new window as fallback
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>CSV Download</title></head>
              <body>
                <h2>CSV Data</h2>
                <p>If download didn't start automatically, right-click and "Save As" the link below:</p>
                <a href="${url}" download="${link.download}">Download CSV File</a>
                <pre style="white-space: pre-wrap; max-height: 300px; overflow: auto;">${csvData.csvContent.substring(0, 1000)}...</pre>
              </body>
            </html>
          `)
        }
      }, 2000)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const linkResendAudience = async (audienceId: string) => {
    if (!resendAudienceId.trim()) {
      toast.error('Please enter the Resend audience ID')
      return
    }

    try {
      const response = await fetch('/api/admin/link-resend-audience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audienceId,
          resendAudienceId: resendAudienceId.trim(),
          notes
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Resend audience linked successfully')
        setResendAudienceId('')
        setNotes('')
        fetchNotifications() // Refresh the list
      } else {
        toast.error(data.error || 'Failed to link Resend audience')
      }
    } catch (error) {
      console.error('Error linking Resend audience:', error)
      toast.error('Failed to link Resend audience')
    }
  }

  const syncAudienceCount = async (audienceId: string) => {
    try {
      const response = await fetch('/api/admin/sync-audience-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audienceId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`✅ Count synced: ${data.memberCount} members`)
        fetchNotifications() // Refresh the list
      } else {
        toast.error(data.error || 'Failed to sync count')
      }
    } catch (error) {
      console.error('Error syncing count:', error)
      toast.error('Failed to sync count')
    }
  }

  const markAsReady = async (audienceId: string) => {
    try {
      // Prompt for member count and Resend audience ID
      const memberCount = prompt('Enter the number of members in the list:')
      const resendAudienceId = prompt('Enter the Resend audience ID (optional):')
      
      if (!memberCount) {
        alert('Please enter the member count')
        return
      }

      const response = await fetch('/api/email-lists/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audienceId,
          memberCount: parseInt(memberCount),
          status: 'ready',
          resendAudienceId: resendAudienceId || undefined
        })
      })
      
      if (response.ok) {
        toast.success('✅ List status updated successfully!')
        fetchNotifications() // Refresh the list
      } else {
        const errorData = await response.json()
        toast.error(`❌ Failed to update status: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error updating list status:', error)
      toast.error(`❌ Error updating status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="default">Pending</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'completed':
        return <Badge variant="outline">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="destructive">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Admin Dashboard" text="Manage list requests and CSV exports" />
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading notifications...</div>
          </CardContent>
        </Card>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <DashboardHeader 
        heading="Admin Dashboard" 
        text="Manage list requests and CSV exports for manual Resend processing"
      >
        <div className="flex items-center gap-2">
          <Button onClick={() => window.location.href = '/experiences/email-marketing-email-sync-uEakcLTEbBbod1'} variant="outline" size="sm">
            ← Back to Dashboard
          </Button>
          <Button onClick={fetchNotifications} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </DashboardHeader>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>List Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No list requests found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>List Name</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-mono text-sm">
                        {notification.whop_user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {notification.audience_name}
                      </TableCell>
                      <TableCell>
                        {notification.user_email}
                      </TableCell>
                                           <TableCell>
                       <div className="space-y-1">
                         {getStatusBadge(notification.status)}
                         {notification.resend_audience_id && (
                           <div className="text-xs text-green-600 dark:text-green-400">
                             ✅ Resend: {notification.resend_audience_id.slice(0, 8)}...
                           </div>
                         )}
                       </div>
                     </TableCell>
                      <TableCell>
                        {new Date(notification.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Dialog onOpenChange={(open) => {
                          if (open) {
                            console.log('Dialog opening for notification:', notification)
                            setSelectedNotification(notification)
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              Generate CSV
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Generate CSV for {notification.audience_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>User ID:</Label>
                                <Input value={notification.whop_user_id} readOnly />
                              </div>
                              <div>
                                <Label>List Name:</Label>
                                <Input value={notification.audience_name} readOnly />
                              </div>
                                                            <Button
                                onClick={() => {
                                  console.log('Generate CSV button inside dialog clicked')
                                  console.log('User ID:', notification.whop_user_id)
                                  console.log('Audience name:', notification.audience_name)
                                  generateCSV(notification.whop_user_id, notification.audience_name)
                                }}
                                className="w-full"
                              >
                                Generate CSV
                              </Button>
                              {console.log('Checking csvData condition:', !!csvData, csvData)}
                              {csvData && (
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">
                                    Generated CSV with {csvData.contactCount} members
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Debug: csvData exists, length: {csvData.csvContent?.length || 0}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    CSV content length: {csvData.csvContent?.length || 0}
                                  </p>
                                  {csvData.resendAudienceId && (
                                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                        ✅ Resend Audience Created
                                      </p>
                                      <p className="text-xs text-green-600 dark:text-green-300">
                                        ID: {csvData.resendAudienceId}
                                      </p>
                                      {csvData.resendAudienceUrl && (
                                        <a 
                                          href={csvData.resendAudienceUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-orange-600 dark:text-blue-400 hover:underline"
                                        >
                                          View in Resend →
                                        </a>
                                      )}
                                    </div>
                                  )}
                                                                  <Button 
                                  onClick={() => {
                                    console.log('Download button clicked!')
                                    downloadCSV()
                                  }} 
                                  variant="outline" 
                                  className="w-full"
                                >
                                  Download CSV
                                </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {notification.status === 'processing' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => markAsReady(notification.audience_id)}
                          >
                            Mark as Ready
                          </Button>
                        )}

                        {notification.status === 'pending' && !notification.resend_audience_id && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                Link Resend
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Link Resend Audience</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Resend Audience ID:</Label>
                                  <Input
                                    value={resendAudienceId}
                                    onChange={(e) => setResendAudienceId(e.target.value)}
                                    placeholder="Enter Resend audience ID"
                                  />
                                </div>
                                <div>
                                  <Label>Notes (optional):</Label>
                                  <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any notes about this audience"
                                  />
                                </div>
                                <Button
                                  onClick={() => linkResendAudience(notification.audience_id)}
                                  className="w-full"
                                >
                                  Link Audience
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        {notification.status === 'completed' && notification.resend_audience_id && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => syncAudienceCount(notification.audience_id)}
                            >
                              Sync Count
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => markAsReady(notification.audience_id)}
                            >
                              Mark as Ready
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <h4 className="font-medium mb-2">Workflow:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>User requests a new list via the app</li>
                <li>Click "Generate CSV" to fetch members and create Resend audience</li>
                <li>Download the CSV and upload to the created Resend audience</li>
                <li>Click "Link Resend" (audience ID is auto-filled)</li>
                <li>The list will be activated for the user</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
