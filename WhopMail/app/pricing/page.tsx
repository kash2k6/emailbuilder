"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { iframeSdk } from "@/lib/iframe-sdk"

const pricingPlans = [
  {
    name: "Basic",
    price: "$29.95",
    period: "/month",
    description: "Perfect for small creators and startups",
    features: [
      "3,000 contacts",
      "Unlimited email sending",
      "Basic email templates",
      "Email analytics",
      "Whop integration",
      "Email support"
    ],
    popular: false,
    planId: process.env.NEXT_PUBLIC_BASIC_PLAN_ID || "plan_basic"
  },
  {
    name: "Starter",
    price: "$59.95",
    period: "/month",
    description: "Perfect for small communities and creators",
    features: [
      "5,000 contacts",
      "Unlimited email sending",
      "Basic email templates",
      "Email analytics",
      "Whop integration",
      "Email support"
    ],
    popular: false,
    planId: process.env.NEXT_PUBLIC_STARTER_PLAN_ID || "plan_starter"
  },
  {
    name: "Growth",
    price: "$129.95",
    period: "/month",
    description: "Ideal for growing communities and businesses",
    features: [
      "10,000 contacts",
      "Unlimited email sending",
      "Advanced templates",
      "A/B testing",
      "Automation workflows",
      "Priority support"
    ],
    popular: true,
    planId: process.env.NEXT_PUBLIC_GROWTH_PLAN_ID || "plan_growth"
  },
  {
    name: "Pro",
    price: "$299.95",
    period: "/month",
    description: "For established businesses and large communities",
    features: [
      "25,000 contacts",
      "Unlimited email sending",
      "Custom branding",
      "Advanced analytics",
      "API access",
      "Dedicated support"
    ],
    popular: false,
    planId: process.env.NEXT_PUBLIC_PRO_PLAN_ID || "plan_pro"
  },
  {
    name: "Enterprise",
    price: "$599.95",
    period: "/month",
    description: "For large-scale operations and agencies",
    features: [
      "50,000 contacts",
      "Unlimited email sending",
      "White-label solution",
      "Custom integrations",
      "Account manager",
      "SLA guarantee"
    ],
    popular: false,
    planId: process.env.NEXT_PUBLIC_ENTERPRISE_PLAN_ID || "plan_enterprise"
  }
]

export default function PricingPage() {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)

  const handlePlanPurchase = async (planId: string, planName: string) => {
    setIsProcessing(planId)
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
      setIsProcessing(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for your community size. All plans include unlimited email sending and Whop integration.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center mb-8">
          {error}
        </div>
      )}
      
      {receiptId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-center mb-8">
          Purchase successful! Receipt ID: {receiptId}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
        {pricingPlans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative ${plan.popular ? 'border-orange-500 shadow-lg scale-105' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-orange-600-foreground">
                Most Popular
              </Badge>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <CardDescription className="text-sm">
                {plan.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full mt-6" 
                variant={plan.popular ? "default" : "outline"}
                disabled={isProcessing !== null}
                onClick={() => handlePlanPurchase(plan.planId, plan.name)}
              >
                {isProcessing === plan.planId ? "Processing..." : "Get Started"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-left">
            <div>
              <h3 className="font-semibold mb-2">What counts as a contact?</h3>
              <p className="text-muted-foreground">
                A contact is any unique email address in your audience. You can send unlimited emails to your contacts within your plan limit.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Can I upgrade or downgrade my plan?</h3>
              <p className="text-muted-foreground">
                Yes! You can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at your next billing cycle.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">What happens if I exceed my contact limit?</h3>
              <p className="text-muted-foreground">
                We'll notify you when you're approaching your limit. You can upgrade your plan or remove inactive contacts to stay within your limit.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                We offer a 30-day money-back guarantee. If you're not satisfied, contact us within 30 days for a full refund.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
