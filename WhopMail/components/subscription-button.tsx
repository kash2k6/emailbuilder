"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { iframeSdk } from "@/lib/iframe-sdk"

interface SubscriptionButtonProps {
  className?: string
  children?: React.ReactNode
  planId?: string
}

export function SubscriptionButton({ className, children, planId }: SubscriptionButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Use the provided planId or default to the basic plan
      const targetPlanId = planId || process.env.NEXT_PUBLIC_BASIC_PLAN_ID || 'plan_basic_29_95'
      
      const res = await iframeSdk.inAppPurchase({ planId: targetPlanId })
      
      if (res.status === "ok") {
        // Optionally trigger a page refresh or redirect after successful purchase
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
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
    <Button 
      onClick={handleSubscribe} 
      className={className}
      disabled={isProcessing}
    >
      {isProcessing ? "Processing..." : (children || "Subscribe Now")}
    </Button>
  )
} 