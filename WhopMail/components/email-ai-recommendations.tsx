'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  Lightbulb, 
  RefreshCw,
  BarChart3,
  Target,
  Globe
} from 'lucide-react'

interface OptimalSendTime {
  sendTime: string
  targetOpenTime: string
  reasoning: string
}

interface BestDay {
  day: string
  count: number
  percentage: number
}

interface BestHour {
  hour: string
  count: number
  percentage: number
}

interface BestTimeZone {
  timeZone: string
  count: number
  percentage: number
}

interface AIRecommendations {
  bestDays: BestDay[]
  bestHours: BestHour[]
  bestTimeZones: BestTimeZone[]
  optimalSendTimes: OptimalSendTime[]
  insights: string[]
}

interface EmailAIRecommendationsProps {
  whopUserId?: string
}

export function EmailAIRecommendations({ whopUserId }: EmailAIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalOpens, setTotalOpens] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!whopUserId) {
        throw new Error('whopUserId is required')
      }

      const response = await fetch(`/api/email-analytics/optimal-send-times?whopUserId=${encodeURIComponent(whopUserId)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations')
      }

      setRecommendations(data.recommendations)
      setTotalOpens(data.totalOpens || 0)
      setTotalClicks(data.totalClicks || 0)
    } catch (err) {
      console.error('Error fetching AI recommendations:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (whopUserId) {
      fetchRecommendations()
    }
  }, [whopUserId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Send Time Recommendations
          </CardTitle>
          <CardDescription>
            Analyzing your email engagement patterns to suggest optimal send times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Analyzing your data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Send Time Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={fetchRecommendations} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const totalEngagement = totalOpens + totalClicks
  
  if (!recommendations || totalEngagement === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Send Time Recommendations
          </CardTitle>
          <CardDescription>
            Get personalized recommendations for when to send your emails based on engagement patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">No data available yet</p>
                  <p className="text-sm text-muted-foreground">
                    Send more emails to get AI-powered recommendations for optimal send times. 
                    We need at least 10 email engagements (opens and clicks) to provide meaningful insights.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Send Time Recommendations
        </CardTitle>
        <CardDescription>
          Based on {totalOpens} email opens from your campaigns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Insights */}
        {recommendations.insights.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Key Insights
            </h3>
            <div className="space-y-2">
              {recommendations.insights.map((insight, index) => (
                <div key={index} className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {insight}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optimal Send Times */}
        {recommendations.optimalSendTimes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recommended Send Times
            </h3>
            <div className="grid gap-3">
              {recommendations.optimalSendTimes.slice(0, 3).map((time, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
                  <div>
                    <div className="font-medium">{time.sendTime}</div>
                    <div className="text-sm text-muted-foreground">
                      Target opens around {time.targetOpenTime}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Days */}
        {recommendations.bestDays.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Best Performing Days
            </h3>
            <div className="grid gap-2">
              {recommendations.bestDays.map((day, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="font-medium">{day.day}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{day.count} opens</span>
                    <Badge variant="outline">{day.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Hours */}
        {recommendations.bestHours.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Peak Open Hours
            </h3>
            <div className="grid gap-2">
              {recommendations.bestHours.slice(0, 5).map((hour, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="font-medium">{hour.hour}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{hour.count} opens</span>
                    <Badge variant="outline">{hour.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Zone Patterns */}
        {recommendations.bestTimeZones.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Time Zone Patterns
            </h3>
            <div className="grid gap-2">
              {recommendations.bestTimeZones.map((timeZone, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="font-medium">{timeZone.timeZone}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{timeZone.count} opens</span>
                    <Badge variant="outline">{timeZone.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="pt-4 border-t">
          <Button onClick={fetchRecommendations} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
