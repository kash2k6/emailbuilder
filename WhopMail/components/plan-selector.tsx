"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, TrendingUp, Crown, Building } from "lucide-react"
import { iframeSdk } from "@/lib/iframe-sdk"
import { EMAILSYNC_PLANS } from "@/lib/plan-config"

interface PlanSelectorProps {
  currentPlan: {
    planName: string
    contactLimit: number
    planPrice: string
    planId: string
  }
  currentContactCount?: number
  totalWhopMembers?: number
  manualMembersCount?: number
}

// Map icon names to actual icon components
const iconMap = {
  Users,
  Zap,
  TrendingUp,
  Crown,
  Building
}

export function PlanSelector({ currentPlan, currentContactCount = 0, totalWhopMembers = 0, manualMembersCount = 0 }: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)

  const isCurrentPlan = (planId: string) => planId === currentPlan.planId

  const handlePlanPurchase = async (planId: string) => {
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

  const totalContactCount = currentContactCount + totalWhopMembers + manualMembersCount

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            Current Plan: {currentPlan.planName}
          </CardTitle>
          <CardDescription className="text-orange-600 dark:text-orange-400">
            You're currently on the {currentPlan.planName} plan with {currentPlan.contactLimit.toLocaleString()} contact limit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {currentPlan.contactLimit.toLocaleString()}
              </div>
              <div className="text-orange-600 dark:text-orange-400">Contact Limit</div>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {totalContactCount.toLocaleString()}
              </div>
              <div className="text-orange-600 dark:text-orange-400">Current Contacts</div>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {Math.max(0, currentPlan.contactLimit - totalContactCount).toLocaleString()}
              </div>
              <div className="text-orange-600 dark:text-orange-400">Remaining</div>
            </div>
          </div>
          
          {totalContactCount > currentPlan.contactLimit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-700 font-medium">
                ⚠️ You're over your plan limit by {(totalContactCount - currentPlan.contactLimit).toLocaleString()} contacts
              </div>
              <div className="text-xs text-red-600 mt-1">
                Consider upgrading to a higher plan to avoid any service interruptions
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Upgrade Your Plan</h3>
          <p className="text-muted-foreground">
            Choose a plan that better fits your community size and needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EMAILSYNC_PLANS.map((plan) => {
            const Icon = iconMap[plan.icon as keyof typeof iconMap] || Users
            const isCurrent = isCurrentPlan(plan.id)
            const isSelected = selectedPlan === plan.id
            const isUpgrade = plan.contacts > currentPlan.contactLimit
            
            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-200 hover:shadow-lg ${
                  isCurrent ? 'ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/20' :
                  isSelected ? 'ring-2 ring-orange-500 shadow-lg scale-105' : 
                  'hover:scale-105'
                } ${plan.popular ? 'border-orange-500' : ''}`}
                onClick={() => !isCurrent && setSelectedPlan(plan.id)}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-500 text-white px-3 py-1 text-xs font-medium">
                      Current Plan
                    </Badge>
                  </div>
                )}
                
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 right-4">
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
                    {isCurrent ? (
                      <Button 
                        className="w-full bg-green-500 hover:bg-green-600 cursor-not-allowed"
                        disabled
                      >
                        Current Plan
                      </Button>
                    ) : (
                      <Button 
                        className={`w-full ${
                          isSelected 
                            ? 'bg-orange-500 hover:bg-orange-600' 
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                        disabled={!isSelected}
                        onClick={() => handlePlanPurchase(plan.id)}
                      >
                        {isSelected ? 'Upgrade to This Plan' : 'Select Plan'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
          {error}
        </div>
      )}
      
      {receiptId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-center">
          Upgrade successful! Receipt ID: {receiptId}
        </div>
      )}
    </div>
  )
} 