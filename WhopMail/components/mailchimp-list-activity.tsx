"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, BarChart, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
} from "recharts"

interface ListActivity {
  day: string
  emails_sent: number
  unique_opens: number
  recipient_clicks: number
  hard_bounce: number
  soft_bounce: number
  subs: number
  unsubs: number
  other_adds: number
  other_removes: number
}

interface ListActivityResponse {
  activity: ListActivity[]
  list_id: string
  total_items: number
  error?: string
}

export function MailchimpListActivity() {
  const [activityData, setActivityData] = useState<ListActivityResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("engagement")
  const [retryCount, setRetryCount] = useState(0)
  const fetchListActivity = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get the authentication token from localStorage
      const token = localStorage.getItem("emailsync_access_token")

      // For debugging
      console.log(`Fetching Mailchimp list activity with token: ${token ? "present" : "missing"}`)
      if (token) {
        console.log(`Token first 10 chars: ${token.substring(0, 10)}...`)
      }

      // Make the request with the auth token in the Authorization header
      const response = await fetch("/api/mailchimp-list-activity", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })

      console.log(`API response status: ${response.status}`)

      // Always try to parse the response, even for error status codes
      const data = await response.json()

      // Check if the response contains an error field
      if (!response.ok || data.error) {
        const errorMessage = data.error || `Failed to fetch list activity: ${response.status} ${response.statusText}`
        console.error("API error:", errorMessage)
        throw new Error(errorMessage)
      }

      // If we got here, we have valid data
      console.log("Successfully fetched Mailchimp activity data")
      setActivityData(data)
    } catch (error) {
      console.error("Error fetching list activity:", error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchListActivity()
  }, [retryCount])

  // Format data for charts
  const formatChartData = (data: ListActivity[] | undefined) => {
    if (!data) return []

    // Sort by date ascending
    return [...data]
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .map((item) => ({
        ...item,
        day: new Date(item.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }))
  }

  const chartData = formatChartData(activityData?.activity)

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    // Don't increment retryAttempts here since this is a manual retry
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Mailchimp List Activity
          </CardTitle>
          <CardDescription>Loading audience activity data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Mailchimp List Activity
          </CardTitle>
          <CardDescription>Audience activity data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.includes("No Mailchimp integration found") ? (
                <>
                  {error} <br />
                  <span className="block mt-2 text-sm">
                    Please go to the Setup tab and connect your Mailchimp account to view list activity. The system is
                    looking for a record in the 'integrations' table with platform="mailchimp".
                  </span>
                </>
              ) : error.includes("No email integrations found") ? (
                <>
                  {error} <br />
                  <span className="block mt-2 text-sm">
                    No integrations were found in the database. Please go to the Setup tab and connect an email
                    platform. The system is checking the 'integrations' table in file-based storage.
                  </span>
                </>
              ) : (
                error
              )}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={handleRetry} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!activityData || !activityData.activity || activityData.activity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Mailchimp List Activity
          </CardTitle>
          <CardDescription>Audience activity data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>No activity data available for this audience.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Mailchimp List Activity
          </CardTitle>
          <CardDescription>
            Recent activity for your Mailchimp audience (last {activityData.activity.length} days)
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRetry} className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            <TabsTrigger value="bounces">Bounces</TabsTrigger>
          </TabsList>

          <TabsContent value="engagement" className="pt-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="emails_sent" name="Emails Sent" stroke="#8884d8" />
                  <Line type="monotone" dataKey="unique_opens" name="Opens" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="recipient_clicks" name="Clicks" stroke="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="subscribers" className="pt-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="subs" name="Subscribes" fill="#82ca9d" />
                  <Bar dataKey="unsubs" name="Unsubscribes" fill="#ff8042" />
                  <Bar dataKey="other_adds" name="Other Adds" fill="#8884d8" />
                  <Bar dataKey="other_removes" name="Other Removes" fill="#d88884" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="bounces" className="pt-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="hard_bounce" name="Hard Bounces" stroke="#ff0000" />
                  <Line type="monotone" dataKey="soft_bounce" name="Soft Bounces" stroke="#ff8042" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
