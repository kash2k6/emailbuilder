'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function TestWhopPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testWhopAPI = async () => {
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/test-whop?userId=user_ojPhs9dIhFQ9C')
      const data = await response.json()
      
      if (response.ok) {
        setResults(data)
      } else {
        setError(data.error || 'Failed to test Whop API')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const testDevMode = async () => {
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/test-whop-dev?userId=test-user-id')
      const data = await response.json()
      
      if (response.ok) {
        setResults(data)
      } else {
        setError(data.error || 'Failed to test dev mode')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔍 Whop API Test
              <Badge variant="secondary">Debug Tool</Badge>
            </CardTitle>
            <CardDescription>
              Test the Whop API to see your actual subscription status and membership details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Button 
                onClick={testWhopAPI} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    🚀 Test Whop API
                  </>
                )}
              </Button>
              <Button 
                onClick={testDevMode} 
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    🧪 Test Dev Mode
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                User ID: user_ojPhs9dIhFQ9C
              </span>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-700">
                    <span>❌</span>
                    <span className="font-medium">Error:</span>
                    <span>{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {results && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">✅ Test Completed</CardTitle>
                    <CardDescription>
                      {results.message || 'Check the server logs (terminal) for detailed API responses'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Status:</span>
                        <Badge variant="outline" className="text-green-700 border-green-200">
                          Success
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">User ID:</span>
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {results.userId}
                        </code>
                      </div>
                      {results.subscription && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Subscription:</span>
                          <Badge variant={results.subscription.status === 'active' ? 'default' : 'secondary'}>
                            {results.subscription.status}
                          </Badge>
                        </div>
                      )}
                      {results.access && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Access:</span>
                          <Badge variant={results.access.hasAccess ? 'default' : 'destructive'}>
                            {results.access.hasAccess ? 'Granted' : 'Denied'}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Message:</span>
                        <span className="text-muted-foreground">{results.message || 'Test completed successfully'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📋 What to Check</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-orange-600">1.</span>
                        <div>
                          <span className="font-medium">Server Terminal:</span>
                          <span className="text-muted-foreground"> Look for "=== TESTING WHOP API ===" logs</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-600">2.</span>
                        <div>
                          <span className="font-medium">User Details:</span>
                          <span className="text-muted-foreground"> Check if your user exists and is valid</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-600">3.</span>
                        <div>
                          <span className="font-medium">Access Passes:</span>
                          <span className="text-muted-foreground"> See what access passes are available</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-600">4.</span>
                        <div>
                          <span className="font-medium">Membership Status:</span>
                          <span className="text-muted-foreground"> Check if you have active memberships</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🔧 Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        After running the test, check your terminal/server logs for the detailed Whop API responses. 
                        This will help us understand why the subscription check is failing.
                      </p>
                      <Separator />
                      <p className="text-muted-foreground">
                        <strong>Expected Issues:</strong>
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                        <li>API key permissions (403 errors)</li>
                        <li>Wrong product/access pass ID</li>
                        <li>User not found or invalid</li>
                        <li>Expired or inactive membership</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 