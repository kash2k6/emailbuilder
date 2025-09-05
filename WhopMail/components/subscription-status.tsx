"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, CheckCircle, XCircle, CreditCard } from "lucide-react"
import { checkSubscriptionStatus } from "@/app/actions"
import { SubscriptionButton } from "@/components/subscription-button"

interface SubscriptionStatusProps {
  userId: string
  subscriptionData?: any
}

export function SubscriptionStatus({ userId, subscriptionData }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState(subscriptionData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!subscription && userId) {
      fetchSubscription()
    }
  }, [userId])

  const fetchSubscription = async () => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Use server action directly instead of API route
      const result = await checkSubscriptionStatus(userId)
      setSubscription(result.subscription)
    } catch (err) {
      setError("Error fetching subscription status")
    } finally {
      setIsLoading(false)
    }
  }

  const getTrialStatus = () => {
    if (!subscription?.trial_ends_at) return null
    
    const trialEnd = new Date(subscription.trial_ends_at)
    const now = new Date()
    const isExpired = trialEnd < now
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      isExpired,
      daysLeft: Math.max(0, daysLeft),
      trialEnd
    }
  }

  const getSubscriptionStatus = () => {
    if (!subscription) return "no_subscription"
    if (subscription.status === "cancelled") return "cancelled"
    if (subscription.status === "active") return "active"
    if (subscription.status === "trialing") return "trialing"
    return "inactive"
  }

  const status = getSubscriptionStatus()
  const trialStatus = getTrialStatus()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
            <span>Loading subscription status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Subscription Status</span>
        </CardTitle>
        <CardDescription>
          Manage your Email Marketing subscription and trial period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "no_subscription" && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <XCircle className="h-8 w-8 text-muted-foreground" />
              <span className="text-lg font-medium">No Active Subscription</span>
            </div>
            <p className="text-muted-foreground">
              Start your 1-day free trial to access all Email Marketing features
            </p>
            <SubscriptionButton userId={userId} experienceId="exp_yztLo7SEvKbTNF">
              Start Free Trial
            </SubscriptionButton>
          </div>
        )}

        {status === "trialing" && trialStatus && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Free Trial</span>
              </div>
              <Badge variant="secondary">
                {trialStatus.daysLeft} days left
              </Badge>
            </div>
            
            {/* Plan Information */}
            {subscription.planName && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Trial Plan</span>
                  <Badge variant="secondary">{subscription.planName}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contact Limit:</span>
                    <div className="font-medium">{subscription.contactLimit?.toLocaleString() || 'Unlimited'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>
                    <div className="font-medium">{subscription.planPrice || 'N/A'}</div>
                  </div>
                </div>
                {subscription.planId && (
                  <div className="text-xs text-muted-foreground">
                    Plan ID: {subscription.planId}
                  </div>
                )}
              </div>
            )}
            
            {trialStatus.isExpired ? (
              <Alert>
                <AlertDescription>
                  Your free trial has expired. Upgrade to continue using Email Marketing.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="text-sm text-muted-foreground">
                Trial ends on {trialStatus.trialEnd.toLocaleDateString()}
              </div>
            )}
            
            <SubscriptionButton userId={userId} experienceId="exp_yztLo7SEvKbTNF">
              Upgrade Now
            </SubscriptionButton>
          </div>
        )}

        {status === "active" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Active Subscription</span>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            
            {/* Plan Information */}
            {subscription.planName && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Current Plan</span>
                  <Badge variant="secondary">{subscription.planName}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contact Limit:</span>
                    <div className="font-medium">{subscription.contactLimit?.toLocaleString() || 'Unlimited'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>
                    <div className="font-medium">{subscription.planPrice || 'N/A'}</div>
                  </div>
                </div>
                {subscription.planId && (
                  <div className="text-xs text-muted-foreground">
                    Plan ID: {subscription.planId}
                  </div>
                )}
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              <div>Next billing: {subscription.current_period_ends_at ? 
                new Date(subscription.current_period_ends_at).toLocaleDateString() : 
                "N/A"
              }</div>
            </div>
            
            <Button 
              onClick={() => window.open("https://whop.com/account", "_blank")}
              variant="outline"
              className="w-full"
            >
              Manage Subscription
            </Button>
          </div>
        )}

        {status === "cancelled" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">Subscription Cancelled</span>
              </div>
              <Badge variant="destructive">Cancelled</Badge>
            </div>
            
            <Alert>
              <AlertDescription>
                Your subscription has been cancelled. You can reactivate it anytime.
              </AlertDescription>
            </Alert>
            
            <SubscriptionButton userId={userId} experienceId="exp_yztLo7SEvKbTNF">
              Reactivate Subscription
            </SubscriptionButton>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 