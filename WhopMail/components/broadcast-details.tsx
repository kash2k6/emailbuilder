'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { RefreshCw, Mail, Eye, MousePointer, AlertTriangle, Flag, XCircle, MapPin } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface BroadcastDetailsProps {
  resendBroadcastId: string
  whopUserId: string
  onClose: () => void
}

interface BroadcastData {
  id: string
  resendBroadcastId: string
  subject: string
  status: string
  recipientCount: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  failed: number
  sentAt: string
  createdAt: string
  deliveryRate: number
  openRate: number
  clickRate: number
  bounceRate: number
  complaintRate: number
}

interface ClickEvent {
  id: string
  recipientEmail: string
  clickedLink: string
  displayLink: string
  ipAddress: string
  userAgent: string
  clickedAt: string
  deviceType: string
  location?: {
    country: string
    country_code: string
    continent: string
    continent_code: string
    as_name: string
  } | null
}

// Simple world map component using CSS
function WorldMap({ clickEvents }: { clickEvents: ClickEvent[] }) {
  const countryStats = clickEvents.reduce((acc, event) => {
    if (event.location?.country_code) {
      const countryCode = event.location.country_code.toLowerCase()
      acc[countryCode] = (acc[countryCode] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const maxClicks = Math.max(...Object.values(countryStats), 1)

  return (
    <div className="relative w-full h-64 bg-blue-50 rounded-lg overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-8 w-8 mx-auto text-blue-600 mb-2" />
          <h3 className="font-semibold text-lg">Click Locations</h3>
          <p className="text-sm text-muted-foreground">
            {Object.keys(countryStats).length} countries
          </p>
        </div>
      </div>
      
      {/* Country indicators */}
      {Object.entries(countryStats).map(([countryCode, clicks]) => (
        <div
          key={countryCode}
          className="absolute w-3 h-3 bg-red-500 rounded-full opacity-75 animate-pulse"
          style={{
            left: `${Math.random() * 80 + 10}%`,
            top: `${Math.random() * 60 + 20}%`,
            transform: 'translate(-50%, -50%)',
            opacity: 0.3 + (clicks / maxClicks) * 0.7,
            width: `${Math.max(8, (clicks / maxClicks) * 20)}px`,
            height: `${Math.max(8, (clicks / maxClicks) * 20)}px`,
          }}
          title={`${countryCode.toUpperCase()}: ${clicks} clicks`}
        />
      ))}
    </div>
  )
}

// Country statistics component
function CountryStats({ clickEvents }: { clickEvents: ClickEvent[] }) {
  const countryStats = clickEvents.reduce((acc, event) => {
    if (event.location?.country) {
      const country = event.location.country
      if (!acc[country]) {
        acc[country] = {
          clicks: 0,
          country_code: event.location.country_code,
          continent: event.location.continent
        }
      }
      acc[country].clicks++
    }
    return acc
  }, {} as Record<string, { clicks: number; country_code: string; continent: string }>)

  const sortedCountries = Object.entries(countryStats)
    .sort(([, a], [, b]) => b.clicks - a.clicks)
    .slice(0, 10)

  if (sortedCountries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Flag className="h-8 w-8 mx-auto mb-2" />
        <p>No location data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Top Countries by Clicks</h4>
      {sortedCountries.map(([country, stats]) => (
        <div key={country} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-xs">
              {stats.country_code}
            </Badge>
            <div>
              <div className="font-medium">{country}</div>
              <div className="text-xs text-muted-foreground">{stats.continent}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{stats.clicks}</div>
            <div className="text-xs text-muted-foreground">clicks</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function BroadcastDetails({ resendBroadcastId, whopUserId, onClose }: BroadcastDetailsProps) {
  const [broadcast, setBroadcast] = useState<BroadcastData | null>(null)
  const [clickEvents, setClickEvents] = useState<ClickEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadBroadcastDetails()
  }, [resendBroadcastId])

  const loadBroadcastDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/broadcast/${resendBroadcastId}`)
      const result = await response.json()
      
      if (result.success) {
        setBroadcast(result.data)
        // Load click events for this broadcast
        await loadClickEvents(result.data.id)
      } else {
        setError(result.error || 'Failed to load broadcast details')
      }
    } catch (err) {
      setError('Failed to load broadcast details')
      console.error('Error loading broadcast details:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadClickEvents = async (broadcastId: string) => {
    try {
      const response = await fetch(`/api/broadcast-click-events?broadcastId=${resendBroadcastId}&whopUserId=${whopUserId}`)
      const result = await response.json()
      
      if (result.success) {
        setClickEvents(result.data || [])
      } else {
        console.error('Failed to load click events:', result.error)
      }
    } catch (err) {
      console.error('Error loading click events:', err)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await loadBroadcastDetails()
      toast({
        title: "Refreshed",
        description: "Broadcast statistics updated",
      })
    } catch (err) {
      toast({
        title: "Refresh Failed",
        description: "Failed to update broadcast statistics",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'queued':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
      case 'bounced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>Loading Broadcast Details...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Broadcast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-600">
              <XCircle className="h-12 w-12 mx-auto mb-4" />
              <p>{error}</p>
              <Button onClick={onClose} className="mt-4">Close</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!broadcast) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Broadcast Details</CardTitle>
              <CardDescription>{broadcast.subject}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Subject:</span> {broadcast.subject}</div>
                <div><span className="font-medium">Status:</span> 
                  <Badge className={`ml-2 ${getStatusColor(broadcast.status)}`}>
                    {broadcast.status}
                  </Badge>
                </div>
                <div><span className="font-medium">Sent:</span> {formatDate(broadcast.sentAt)}</div>
                <div><span className="font-medium">Created:</span> {formatDate(broadcast.createdAt)}</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Recipient Summary</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Total Recipients:</span> {broadcast.recipientCount.toLocaleString()}</div>
                <div><span className="font-medium">Delivered:</span> {broadcast.delivered.toLocaleString()}</div>
                <div><span className="font-medium">Bounced:</span> {broadcast.bounced.toLocaleString()}</div>
                <div><span className="font-medium">Failed:</span> {broadcast.failed.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div>
            <h3 className="font-semibold mb-4">Key Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-600">{broadcast.deliveryRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Delivery Rate</div>
                    </div>
                  </div>
                  <Progress value={broadcast.deliveryRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{broadcast.openRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Open Rate</div>
                    </div>
                  </div>
                  <Progress value={broadcast.openRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <MousePointer className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{broadcast.clickRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Click Rate</div>
                    </div>
                  </div>
                  <Progress value={broadcast.clickRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold text-red-600">{broadcast.bounceRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Bounce Rate</div>
                    </div>
                  </div>
                  <Progress value={broadcast.bounceRate} className="mt-2" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Statistics */}
          <div>
            <h3 className="font-semibold mb-4">Detailed Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{broadcast.delivered.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Delivered</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{broadcast.opened.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Opened</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{broadcast.clicked.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Clicked</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">{broadcast.bounced.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Bounced</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{broadcast.complained.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Complained</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{broadcast.failed.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </div>

          {/* Click Events */}
          {broadcast.clicked > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Click Details ({clickEvents.length} clicks)</h3>
              
              {/* Map and Country Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Geographic Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WorldMap clickEvents={clickEvents} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Country Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CountryStats clickEvents={clickEvents} />
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-3">
                {clickEvents.length > 0 ? (
                  clickEvents.map((click) => (
                    <div key={click.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{click.recipientEmail}</div>
                          <div className="text-sm">
                            {click.displayLink === 'Unsubscribe link clicked' ? (
                              <span className="text-muted-foreground">Unsubscribe link clicked</span>
                            ) : (
                              <a 
                                href={click.clickedLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {click.displayLink}
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            IP: {click.ipAddress} • {click.deviceType} • {formatDate(click.clickedAt)}
                            {click.location && (
                              <span className="ml-2">
                                • <Badge variant="outline" className="text-xs">
                                  {click.location.country} ({click.location.country_code})
                                </Badge>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No click details available yet
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
