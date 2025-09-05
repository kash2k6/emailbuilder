'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Mail, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity,
  Target,
  Zap,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { BroadcastDetails } from './broadcast-details'

interface EmailAnalyticsProps {
  whopUserId: string
}

interface AnalyticsData {
  overview: {
    totalFlows: number
    activeFlows: number
    totalTemplates: number
    totalTriggered: number
    totalCompleted: number
    totalFailed: number
    // Email analytics from Resend
    totalSent: number
    totalDelivered: number
    totalPending: number
    opened: number
    clicked: number
    bounced: number
    complained: number
    failed: number
    deliveryRate: number
  }
  performance: {
    flowSuccessRate: number
    // Email performance from Resend
    openRate: number
    clickRate: number
    bounceRate: number
    complaintRate: number
  }
  recentActivity: {
    flows: Array<{
      id: string
      name: string
      trigger_type: string
      total_triggered: number
      total_completed: number
      is_active: boolean
      created_at: string
    }>
    broadcasts: Array<{
      id: string
      resendBroadcastId: string
      subject: string
      status: string
      messages_sent: number
      messages_failed: number
      created_at: string
    }>
    emails: Array<{
      id: string
      resendBroadcastId: string
      subject: string
      recipientCount: number
      delivered: number
      opened: number
      clicked: number
      bounced: number
      complained: number
      status: string
      sentAt: string
      createdAt: string
    }>
  }
  syncInfo?: {
    syncedCount: number
    lastSync: string
  }
}

export function EmailAnalytics({ whopUserId }: EmailAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedBroadcast, setSelectedBroadcast] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [whopUserId])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/email-analytics?whopUserId=${whopUserId}`)
      const result = await response.json()
      
      if (result.success) {
        setAnalytics(result.data)
      } else {
        setError(result.error || 'Failed to load analytics')
      }
    } catch (err) {
      setError('Failed to load analytics')
      console.error('Error loading analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    try {
      setSyncing(true)
      
      const response = await fetch(`/api/email-analytics/sync?whopUserId=${whopUserId}&hoursBack=24`, {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        // Reload analytics after sync
        await loadAnalytics()
        toast({
          title: "Sync Complete",
          description: result.message || `Updated ${result.syncedCount} emails`,
        })
      } else {
        toast({
          title: "Sync Failed",
          description: result.error || 'Failed to update email data',
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Sync Failed",
        description: 'Failed to update email data',
        variant: "destructive",
      })
      console.error('Error syncing emails:', err)
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'active': return 'bg-orange-100 text-orange-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <XCircle className="h-12 w-12 mx-auto mb-4" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return null
  }

  // Prepare chart data
  const flowPerformanceData = [
    { name: 'Triggered', value: analytics.overview.totalTriggered || 0, color: '#3b82f6' },
    { name: 'Completed', value: analytics.overview.totalCompleted || 0, color: '#10b981' },
    { name: 'Failed', value: analytics.overview.totalFailed || 0, color: '#ef4444' }
  ].filter(item => item.value > 0) // Only show items with data

  const broadcastPerformanceData = [
                    { name: 'Delivered', value: analytics.overview.totalDelivered, color: '#10b981' },
                { name: 'Bounced', value: analytics.overview.bounced, color: '#ef4444' }
  ]

  const recentFlowsData = analytics.recentActivity.flows.map(flow => ({
    name: flow.name,
    triggered: flow.total_triggered,
    completed: flow.total_completed,
    successRate: flow.total_triggered > 0 ? (flow.total_completed / flow.total_triggered) * 100 : 0
  }))

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalSent}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.totalDelivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof analytics.performance.openRate === 'number' 
                ? analytics.performance.openRate.toFixed(2) 
                : '0.00'}%
            </div>
            <Progress value={analytics.performance.openRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof analytics.performance.clickRate === 'number' 
                ? analytics.performance.clickRate.toFixed(2) 
                : '0.00'}%
            </div>
            <Progress value={analytics.performance.clickRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof analytics.performance.bounceRate === 'number' 
                ? analytics.performance.bounceRate.toFixed(2) 
                : '0.00'}%
            </div>
            <Progress value={analytics.performance.bounceRate || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="emails">Email Analytics</TabsTrigger>
          <TabsTrigger value="flows">Email Flows</TabsTrigger>
          <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Performance</CardTitle>
                <CardDescription>Email delivery and engagement statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Delivered */}
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                      {analytics.overview.totalDelivered.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-green-700 dark:text-green-300">Delivered</div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {analytics.overview.totalSent > 0 ? 
                        `${((analytics.overview.totalDelivered / analytics.overview.totalSent) * 100).toFixed(1)}%` : 
                        '0%'
                      } of total
                    </div>
                  </div>

                  {/* Opened */}
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {analytics.overview.opened.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Opened</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {analytics.overview.totalDelivered > 0 ? 
                        `${((analytics.overview.opened / analytics.overview.totalDelivered) * 100).toFixed(1)}%` : 
                        '0%'
                      } open rate
                    </div>
                  </div>

                  {/* Clicked */}
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                      {analytics.overview.clicked.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Clicked</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      {analytics.overview.totalDelivered > 0 ? 
                        `${((analytics.overview.clicked / analytics.overview.totalDelivered) * 100).toFixed(1)}%` : 
                        '0%'
                      } click rate
                    </div>
                  </div>

                  {/* Bounced */}
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                      {analytics.overview.bounced.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-red-700 dark:text-red-300">Bounced</div>
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {analytics.overview.totalSent > 0 ? 
                        `${((analytics.overview.bounced / analytics.overview.totalSent) * 100).toFixed(1)}%` : 
                        '0%'
                      } bounce rate
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {analytics.overview.totalSent.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Sent</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {analytics.performance.openRate.toFixed(2)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Open Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {analytics.performance.clickRate.toFixed(2)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Click Rate</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Flow Performance</CardTitle>
                <CardDescription>Email flow execution statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {flowPerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={flowPerformanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {flowPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    <div className="text-muted-foreground mb-2">
                      <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-muted-foreground">No Flow Data Available</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Email flows will appear here once you create and trigger them.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Analytics</CardTitle>
                  <CardDescription>Detailed email performance metrics</CardDescription>
                </div>
                <Button 
                  onClick={handleManualSync} 
                  disabled={syncing}
                  variant="outline"
                  size="sm"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Data
                    </>
                  )}
                </Button>
              </div>
              {analytics?.syncInfo && (
                <div className="text-xs text-muted-foreground mt-2">
                  Last updated: {formatDate(analytics.syncInfo.lastSync)} 
                  {analytics.syncInfo.syncedCount > 0 && ` (${analytics.syncInfo.syncedCount} emails refreshed)`}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analytics.overview.totalDelivered}</div>
                  <div className="text-sm text-muted-foreground">Delivered</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{analytics.overview.opened}</div>
                  <div className="text-sm text-muted-foreground">Opened</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analytics.overview.clicked}</div>
                  <div className="text-sm text-muted-foreground">Clicked</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{analytics.overview.bounced}</div>
                  <div className="text-sm text-muted-foreground">Bounced</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold">Recent Broadcasts</h3>
                {analytics.recentActivity.emails.length > 0 ? (
                  analytics.recentActivity.emails.map((broadcast) => (
                    <div key={broadcast.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedBroadcast(broadcast.resendBroadcastId)}
                            className="text-left hover:text-orange-600 hover:underline cursor-pointer font-medium"
                          >
                            {broadcast.subject}
                          </button>
                          <Badge variant="secondary" className="text-xs">
                            {broadcast.recipientCount} recipients
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Delivered: {broadcast.delivered} | Opened: {broadcast.opened} | Clicked: {broadcast.clicked} | Bounced: {broadcast.bounced}
                        </div>
                        <div className="text-xs text-orange-600 mt-1">
                          💡 Click the subject to view detailed analytics and click tracking
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(broadcast.status)}>
                          {broadcast.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(broadcast.sentAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No broadcasts sent yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Email Flows Performance</CardTitle>
              <CardDescription>Success rates for recent email flows</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={recentFlowsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="successRate" fill="#3b82f6" name="Success Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcasts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast Statistics</CardTitle>
              <CardDescription>Detailed broadcast performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.overview.totalDelivered?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Messages Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {analytics.overview.bounced.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Messages Bounced</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {analytics.overview.totalSent.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Emails</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Email Flows</CardTitle>
                <CardDescription>Latest email flow activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.recentActivity.flows.map((flow) => (
                    <div key={flow.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{flow.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {flow.total_triggered} triggered, {flow.total_completed} completed
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={flow.is_active ? "default" : "secondary"}>
                          {flow.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(flow.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Broadcasts</CardTitle>
                <CardDescription>Latest broadcast campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.recentActivity.broadcasts.map((broadcast) => (
                    <div key={broadcast.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{broadcast.subject}</div>
                        <div className="text-sm text-muted-foreground">
                          {broadcast.messages_sent} delivered, {broadcast.messages_failed} bounced
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(broadcast.status)}>
                          {broadcast.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(broadcast.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Broadcast Details Modal */}
      {selectedBroadcast && (
        <BroadcastDetails
          resendBroadcastId={selectedBroadcast}
          whopUserId={whopUserId}
          onClose={() => setSelectedBroadcast(null)}
        />
      )}
    </div>
  )
} 