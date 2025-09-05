"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, TrendingUp, Crown, Building } from "lucide-react"
import { iframeSdk } from "@/lib/iframe-sdk"
import { EMAILSYNC_PLANS } from "@/lib/plan-config"

interface PlanSelectionOnboardingProps {
  onPlanSelect?: (planId: string) => void
  isTrialExpired?: boolean
}

// Map icon names to actual icon components
const iconMap = {
  Users,
  Zap,
  TrendingUp,
  Crown,
  Building
}

export function PlanSelectionOnboarding({ onPlanSelect, isTrialExpired = false }: PlanSelectionOnboardingProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    setError(null)
    setReceiptId(null)
    onPlanSelect?.(planId)
  }

  const handleStartTrial = async () => {
    if (!isClient) {
      setError("Payment system not available. Please refresh the page.")
      return
    }

    const planId = selectedPlan || EMAILSYNC_PLANS[0].id
    setIsProcessing(true)
    setError(null)
    setReceiptId(null)

    try {
      const res = await iframeSdk.inAppPurchase({ planId })
      
      if (res.status === "ok") {
        setReceiptId(res.data.receiptId)
        setError(null)
        // Optionally trigger a page refresh or redirect after successful purchase
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setReceiptId(null)
        setError(res.error || "Purchase failed")
      }
    } catch (error) {
      console.error("Purchase failed:", error)
      setError("Purchase failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">
          {isTrialExpired ? "Choose Your Plan" : "Start Your Free Trial"}
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {isTrialExpired 
            ? "Upgrade to continue using EmailSync with the plan that fits your needs."
            : "All plans include a 3-day free trial. Choose the plan that best fits your community size."
          }
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
          {error}
        </div>
      )}
      
      {receiptId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-center">
          Purchase successful! Receipt ID: {receiptId}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EMAILSYNC_PLANS.map((plan) => {
          const Icon = iconMap[plan.icon as keyof typeof iconMap] || Users
          const isSelected = selectedPlan === plan.id
          
          return (
            <Card 
              key={plan.id} 
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-orange-500 shadow-lg scale-105' 
                  : 'hover:scale-105'
              } ${plan.popular ? 'border-orange-500' : ''}`}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white px-3 py-1 text-xs font-medium">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="text-center space-y-4">
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{plan.price}</div>
                  <div className="text-sm text-muted-foreground">{plan.period}</div>
                  <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    {plan.contacts.toLocaleString()} contacts
                  </div>
                </div>
                
                <ul className="space-y-2 text-sm text-left">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <div className="pt-4">
                  <Button 
                    className={`w-full ${
                      isSelected 
                        ? 'bg-orange-500 hover:bg-orange-600' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                    disabled={!isSelected}
                  >
                    {isSelected ? 'Selected' : 'Select Plan'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Start Trial Button */}
      <div className="text-center">
        <Button 
          onClick={handleStartTrial}
          disabled={!selectedPlan || isProcessing}
          size="lg"
          className="px-8 py-3 text-lg"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Processing...
            </>
          ) : (
            `Start ${selectedPlan ? EMAILSYNC_PLANS.find(p => p.id === selectedPlan)?.name || 'Plan' : 'Plan'}`
          )}
        </Button>
        
        {!selectedPlan && (
          <p className="text-sm text-muted-foreground mt-3">
            Please select a plan to continue
          </p>
        )}
        
        {selectedPlan && (
          <p className="text-sm text-muted-foreground mt-3">
            {(() => {
              const plan = EMAILSYNC_PLANS.find(p => p.id === selectedPlan)
              if (plan?.trialDays && plan.trialDays > 0) {
                return `Basic plan includes a ${plan.trialDays}-day free trial`
              }
              return 'No free trial - subscription starts immediately'
            })()}
          </p>
        )}
      </div>
    </div>
  )
} 