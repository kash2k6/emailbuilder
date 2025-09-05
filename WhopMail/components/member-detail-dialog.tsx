"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink, Mail, User, Tag, AlertCircle, Info, Brain, TrendingUp, DollarSign, Target, Sparkles, CreditCard } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import type { WhopMembership } from "@/app/types"
import { UserIcon } from "lucide-react"

interface MemberDetailDialogProps {
  member: (WhopMembership & { userDetails?: any }) | null
  open: boolean
  onOpenChange: (open: boolean) => void
  emailPlatform?: string
  isLoadingEmailData?: boolean
  emailData?: any
}

export function MemberDetailDialog({
  member,
  open,
  onOpenChange,
  emailPlatform,
  isLoadingEmailData = false,
  emailData,
}: MemberDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("profile")
  const [isLoading, setIsLoading] = useState(false)
  const [memberEmailData, setMemberEmailData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchEmailData() {
    if (!member || !open || activeTab !== "email" || !emailPlatform) return

    // Don't fetch email data if member doesn't have an email
    if (!member.email) {
      setError("This member doesn't have an email address associated with their account.")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setMemberEmailData(null)

    try {
      console.log(`Fetching email data for ${member.email} from ${emailPlatform}`)

      // Get the authentication token from localStorage
      const token = localStorage.getItem("emailsync_access_token")

      // Log token presence for debugging
      console.log(`Auth token for API request: ${token ? "Present" : "Missing"}`)

      // Make the request with the auth token in the Authorization header
      // Also send the user ID in a custom header for better authentication
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      // If we're in development mode, also send the user ID directly
      if (process.env.NODE_ENV === 'development' && member.user_id) {
        headers['x-whop-dev-user-id'] = member.user_id
      }

      const response = await fetch(`/api/email-data?email=${encodeURIComponent(member.email)}`, {
        headers,
      })

      console.log(`Email data API response status: ${response.status}`)

      // Check if the response is OK first
      if (!response.ok) {
        // Try to get the error message from the response
        let errorMessage = `Failed to fetch email data: ${response.status} ${response.statusText}`

        try {
          // Try to parse as JSON, but be prepared for non-JSON responses
          const errorData = await response.json()
          if (errorData && errorData.error) {
            errorMessage = errorData.error
          }
        } catch (jsonError) {
          // If JSON parsing fails, try to get the text content
          try {
            const textContent = await response.text()
            if (textContent) {
              // Limit the text content to a reasonable length
              const truncatedContent = textContent.substring(0, 100) + (textContent.length > 100 ? "..." : "")
              errorMessage = `Server error: ${truncatedContent}`
            }
          } catch (textError) {
            // If even text extraction fails, use the default error message
            console.error("Failed to extract error text:", textError)
          }
        }

        // For 404 errors (member not found), show a more user-friendly message
        if (response.status === 404 && errorMessage.includes("Member not found")) {
          setError(`This member's email (${member.email}) was not found in your ${emailPlatform} audience.`)
        } else if (response.status === 401) {
          setError(
            `Authentication error: You need to be logged in to access this data. Please refresh the page and try again.`,
          )
        } else if (response.status === 500) {
          setError(`Server error occurred. Please try again later or check the console for details.`)
        } else {
          setError(errorMessage)
        }

        setIsLoading(false)
        return
      }

      // If response is OK, try to parse the JSON
      try {
        const data = await response.json()
        console.log("Email data fetched successfully:", data)
        setMemberEmailData(data)
      } catch (jsonError) {
        console.error("Failed to parse response as JSON:", jsonError)
        setError("Failed to parse server response. Please try again later.")
      }
    } catch (error) {
      const errorMessage = `Error fetching email data: ${error instanceof Error ? error.message : String(error)}`
      console.error(errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEmailData()
  }, [member, open, activeTab, emailPlatform])

  if (!member) return null

  // Format dates
  const formatDate = (timestamp: number): string => {
    if (!timestamp) return "N/A"
    try {
      const date = new Date(timestamp * 1000)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      return "Invalid Date"
    }
  }

  // Get status badge variant based on status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "expiring":
        return "warning"
      case "trial":
        return "secondary"
      case "expired":
      case "inactive":
        return "outline"
      default:
        return "outline"
    }
  }

  // Capitalize first letter
  const capitalizeFirstLetter = (string: string): string => {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  // Get email platform status badge variant
  const getEmailStatusBadgeVariant = (status: string) => {
    const lowerStatus = status.toLowerCase()
    if (lowerStatus.includes("subscribed") || lowerStatus === "active") {
      return "default"
    } else if (lowerStatus.includes("pending") || lowerStatus === "unconfirmed") {
      return "warning"
    } else if (lowerStatus.includes("unsubscribed") || lowerStatus === "inactive") {
      return "outline"
    } else if (lowerStatus.includes("cleaned") || lowerStatus.includes("bounced")) {
      return "destructive"
    }
    return "secondary"
  }

  // Get churn risk color
  const getChurnRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-600"
      case "medium":
        return "text-yellow-600"
      case "high":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  // Get member tier color
  const getMemberTierColor = (tier: string) => {
    switch (tier) {
      case "premium":
        return "text-purple-600"
      case "standard":
        return "text-orange-600"
      case "trial":
        return "text-orange-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Member Details</DialogTitle>
          <DialogDescription>Detailed information about {member.email}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
            <TabsTrigger value="email" disabled={!emailPlatform || !member.email}>
              Email Data
            </TabsTrigger>
            <TabsTrigger value="product">Product & Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 pt-4">
            {member && (
              <div className="space-y-4">
                {/* Enhanced header with profile picture and member info */}
                <div className="flex items-center space-x-4">
                  {(member.userDetails?.profile_pic_url || member.profile_pic_url) ? (
                    <img
                      src={member.userDetails?.profile_pic_url || member.profile_pic_url || "/placeholder.svg"}
                      alt={member.userDetails?.name || member.name || "Profile"}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">
                      {member.userDetails?.name || member.name || member.userDetails?.username || member.username || "Unknown User"}
                    </h3>
                    {(member.userDetails?.username || member.username) && 
                     (member.userDetails?.name || member.name) && 
                     <p className="text-gray-500">@{member.userDetails?.username || member.username}</p>
                    }
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getStatusBadgeVariant(member.status)}>
                        {member.status}
                      </Badge>
                      {member.member_tier && (
                        <Badge variant="outline" className={getMemberTierColor(member.member_tier)}>
                          {member.member_tier}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Member Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {(member.userDetails?.name || member.name) && (
                          <div className="flex justify-between">
                            <span className="font-medium">Name:</span>
                            <span>{member.userDetails?.name || member.name}</span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="font-medium">Email:</span>
                          <span className="text-right">{member.email}</span>
                        </div>

                        {(member.userDetails?.username || member.username) && (
                          <div className="flex justify-between">
                            <span className="font-medium">Username:</span>
                            <span>@{member.userDetails?.username || member.username}</span>
                          </div>
                        )}

                        {member.userDetails?.city && (
                          <div className="flex justify-between">
                            <span className="font-medium">City:</span>
                            <span>{member.userDetails.city}</span>
                          </div>
                        )}

                        {member.userDetails?.country && (
                          <div className="flex justify-between">
                            <span className="font-medium">Country:</span>
                            <span>{member.userDetails.country}</span>
                          </div>
                        )}

                        {member.userDetails?.bio && (
                          <div className="flex justify-between">
                            <span className="font-medium">Bio:</span>
                            <span className="text-right max-w-xs truncate" title={member.userDetails.bio}>
                              {member.userDetails.bio}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="font-medium">Status:</span>
                          <span className={getStatusColor(member.status)}>{member.status}</span>
                        </div>

                        {member.product && (
                          <div className="flex justify-between">
                            <span className="font-medium">Product:</span>
                            <span>{typeof member.product === 'string' ? member.product : member.product?.title || 'Unknown Product'}</span>
                          </div>
                        )}

                        {member.plan_name && (
                          <div className="flex justify-between">
                            <span className="font-medium">Plan:</span>
                            <span>{member.plan_name}</span>
                          </div>
                        )}

                        {member.plan_price && (
                          <div className="flex justify-between">
                            <span className="font-medium">Plan Price:</span>
                            <span>${member.plan_price} {member.plan_currency?.toUpperCase()}</span>
                          </div>
                        )}

                        {member.expires_at && (
                          <div className="flex justify-between">
                            <span className="font-medium">Expires:</span>
                            <span>{formatDate(parseInt(member.expires_at))}</span>
                          </div>
                        )}

                        {member.created_at && (
                          <div className="flex justify-between">
                            <span className="font-medium">Joined:</span>
                            <span>{formatDate(parseInt(member.created_at))}</span>
                          </div>
                        )}

                        {member.userDetails?.created_at && (
                          <div className="flex justify-between">
                            <span className="font-medium">User Created:</span>
                            <span>{formatDate(parseInt(member.userDetails.created_at))}</span>
                          </div>
                        )}

                        {member.userDetails?.updated_at && (
                          <div className="flex justify-between">
                            <span className="font-medium">User Updated:</span>
                            <span>{formatDate(parseInt(member.userDetails.updated_at))}</span>
                          </div>
                        )}

                        {member.user_created_at && !member.userDetails?.created_at && (
                          <div className="flex justify-between">
                            <span className="font-medium">User Created:</span>
                            <span>{formatDate(parseInt(member.user_created_at))}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Additional Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {member.metadata && Object.keys(member.metadata).length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground">Membership Metadata</h3>
                          <div className="space-y-1 mt-1">
                            {Object.entries(member.metadata).map(([key, value]) => (
                              <p key={key} className="text-sm">
                                {key}: {String(value)}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {member.userDetails?.metadata && Object.keys(member.userDetails.metadata).length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground">User Metadata</h3>
                          <div className="space-y-1 mt-1">
                            {Object.entries(member.userDetails.metadata).map(([key, value]) => (
                              <p key={key} className="text-sm">
                                {key}: {String(value)}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-4 pt-4">
            {member && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI-Powered Insights
                    </CardTitle>
                    <CardDescription>
                      Intelligent analysis and recommendations for this member
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Engagement Score */}
                    {memberEmailData?.engagement_rate !== undefined ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Email Engagement Rate</span>
                          <span className="text-lg font-bold">{memberEmailData.engagement_rate}%</span>
                        </div>
                        <Progress value={memberEmailData.engagement_rate} className="h-2" />
                        <p className="text-sm text-muted-foreground">
                          Based on email opens, clicks, and interactions from {emailPlatform}
                        </p>
                      </div>
                    ) : member.engagement_score !== undefined ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Estimated Engagement Score</span>
                          <span className="text-lg font-bold">{member.engagement_score}%</span>
                        </div>
                        <Progress value={member.engagement_score} className="h-2" />
                        <p className="text-sm text-muted-foreground">
                          Based on Whop activity and interactions (connect email platform for detailed metrics)
                        </p>
                      </div>
                    ) : null}

                    {/* Member Tier */}
                    {member.member_tier && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          <span className="font-medium">Member Tier</span>
                        </div>
                        <Badge variant="outline" className={`text-sm ${getMemberTierColor(member.member_tier)}`}>
                          {member.member_tier.charAt(0).toUpperCase() + member.member_tier.slice(1)}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {member.member_tier === 'premium' && 'High-value member with premium features'}
                          {member.member_tier === 'standard' && 'Regular member with standard access'}
                          {member.member_tier === 'trial' && 'Trial member evaluating the product'}
                        </p>
                      </div>
                    )}

                    {/* Predicted Lifetime Value */}
                    {member.predicted_lifetime_value !== undefined && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">Predicted Lifetime Value</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          ${member.predicted_lifetime_value.toFixed(2)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Estimated total value based on current behavior and patterns
                        </p>
                      </div>
                    )}

                    {/* Churn Risk */}
                    {member.churn_risk && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">Churn Risk</span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-sm ${getChurnRiskColor(member.churn_risk)}`}
                        >
                          {member.churn_risk.charAt(0).toUpperCase() + member.churn_risk.slice(1)} Risk
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {member.churn_risk === 'low' && 'Member shows strong retention signals'}
                          {member.churn_risk === 'medium' && 'Member may need engagement strategies'}
                          {member.churn_risk === 'high' && 'Member at risk of churning - immediate action recommended'}
                        </p>
                      </div>
                    )}

                    {/* Recommended Segments */}
                    {member.recommended_segments && member.recommended_segments.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          <span className="font-medium">Recommended Segments</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {member.recommended_segments.map((segment, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {segment}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          AI-suggested audience segments for targeted campaigns
                        </p>
                      </div>
                    )}

                    {/* Next Best Action */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-800">Recommended Action</span>
                      </div>
                      <p className="text-orange-700 text-sm">
                        {member.churn_risk === 'high' && 'Send personalized retention email with exclusive offer'}
                        {member.churn_risk === 'medium' && 'Increase engagement with targeted content and check-ins'}
                        {member.churn_risk === 'low' && 'Continue current engagement strategy and consider upsell opportunities'}
                        {!member.churn_risk && 'Monitor engagement and provide value through regular communication'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="product" className="space-y-4 pt-4">
            {member && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Product Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Product Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {member.product_title && (
                        <div className="space-y-2">
                          <h3 className="font-medium">Product Name</h3>
                          <p className="text-lg font-semibold">{member.product_title}</p>
                        </div>
                      )}

                      {member.product_description && (
                        <div className="space-y-2">
                          <h3 className="font-medium">Description</h3>
                          <p className="text-sm text-muted-foreground">{member.product_description}</p>
                        </div>
                      )}

                      {member.product_logo_url && (
                        <div className="space-y-2">
                          <h3 className="font-medium">Product Logo</h3>
                          <img 
                            src={member.product_logo_url} 
                            alt="Product Logo" 
                            className="w-16 h-16 object-contain"
                          />
                        </div>
                      )}

                      {member.product_id && (
                        <div className="space-y-2">
                          <h3 className="font-medium">Product ID</h3>
                          <p className="text-sm font-mono bg-muted p-2 rounded">{member.product_id}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Plan Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Plan Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {member.plan_name && (
                        <div className="space-y-2">
                          <h3 className="font-medium">Plan Name</h3>
                          <p className="text-lg font-semibold">{member.plan_name}</p>
                        </div>
                      )}

                      {member.plan_price !== undefined && (
                        <div className="space-y-2">
                          <h3 className="font-medium">Price</h3>
                          <p className="text-2xl font-bold text-green-600">
                            ${member.plan_price} {member.plan_currency?.toUpperCase()}
                          </p>
                        </div>
                      )}

                      {member.plan_id && (
                        <div className="space-y-2">
                          <h3 className="font-medium">Plan ID</h3>
                          <p className="text-sm font-mono bg-muted p-2 rounded">{member.plan_id}</p>
                        </div>
                      )}

                      {member.expires_at && (
                        <div className="space-y-2">
                          <h3 className="font-medium">Expiration</h3>
                          <p className="text-sm">{formatDate(parseInt(member.expires_at))}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced Membership Details */}
                {member.membershipDetails && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Membership Details
                      </CardTitle>
                      <CardDescription>Detailed subscription information from Whop API</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Subscription Status</h3>
                                                         <div className="flex items-center gap-2">
                               <Badge variant={getStatusBadgeVariant(member.membershipDetails.status || 'unknown')}>
                                 {member.membershipDetails.status || 'Unknown'}
                               </Badge>
                              {member.membershipDetails.valid && (
                                <Badge variant="default">Valid</Badge>
                              )}
                              {member.membershipDetails.cancel_at_period_end && (
                                <Badge variant="warning">Canceling</Badge>
                              )}
                            </div>
                          </div>

                          {member.membershipDetails.quantity && member.membershipDetails.quantity > 1 && (
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Quantity</h3>
                              <p className="text-lg font-semibold">{member.membershipDetails.quantity}</p>
                            </div>
                          )}

                          {member.membershipDetails.license_key && (
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">License Key</h3>
                              <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                                {member.membershipDetails.license_key}
                              </p>
                            </div>
                          )}

                          {member.membershipDetails.affiliate_username && (
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Referred By</h3>
                              <p className="text-base">@{member.membershipDetails.affiliate_username}</p>
                            </div>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="space-y-4">
                                                     <div>
                             <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                             <p className="text-sm">{formatDate(member.membershipDetails.created_at || 0)}</p>
                           </div>

                          {member.membershipDetails.expires_at && (
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Expires</h3>
                              <p className="text-sm">{formatDate(member.membershipDetails.expires_at)}</p>
                            </div>
                          )}

                          {member.membershipDetails.renewal_period_start && (
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Renewal Period Start</h3>
                              <p className="text-sm">{formatDate(member.membershipDetails.renewal_period_start)}</p>
                            </div>
                          )}

                          {member.membershipDetails.renewal_period_end && (
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">Renewal Period End</h3>
                              <p className="text-sm">{formatDate(member.membershipDetails.renewal_period_end)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Details */}
                      {(member.membershipDetails.checkout_id || member.membershipDetails.page_id || member.membershipDetails.company_buyer_id) && (
                        <div className="mt-6 pt-6 border-t">
                          <h3 className="text-sm font-medium text-muted-foreground mb-3">Additional Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {member.membershipDetails.checkout_id && (
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground">Checkout ID</h4>
                                <p className="text-sm font-mono bg-muted p-2 rounded text-xs">{member.membershipDetails.checkout_id}</p>
                              </div>
                            )}
                            {member.membershipDetails.page_id && (
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground">Page ID</h4>
                                <p className="text-sm font-mono bg-muted p-2 rounded text-xs">{member.membershipDetails.page_id}</p>
                              </div>
                            )}
                            {member.membershipDetails.company_buyer_id && (
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground">Company Buyer ID</h4>
                                <p className="text-sm font-mono bg-muted p-2 rounded text-xs">{member.membershipDetails.company_buyer_id}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Custom Fields */}
                      {member.membershipDetails.custom_field_responses && member.membershipDetails.custom_field_responses.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                          <h3 className="text-sm font-medium text-muted-foreground mb-3">Custom Fields</h3>
                          <div className="space-y-3">
                            {member.membershipDetails.custom_field_responses.map((field: any, index: number) => (
                              <div key={index} className="flex justify-between items-start">
                                <span className="text-sm font-medium">{field.question}</span>
                                <span className="text-sm text-muted-foreground text-right max-w-xs">{field.answer}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manage URL */}
                      {member.membershipDetails.manage_url && (
                        <div className="mt-6 pt-6 border-t">
                          <Button variant="secondary" asChild>
                            <a
                              href={member.membershipDetails.manage_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              Manage Subscription <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4 pt-4">
            {!member.email ? (
              <div className="text-center p-8">
                <Alert variant="warning" className="bg-amber-50 border-amber-200">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">No Email Address</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    This member doesn't have an email address associated with their account, so email platform data is not available.
                  </AlertDescription>
                </Alert>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                <p className="ml-2">Loading email data from {emailPlatform}...</p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>

                {error.includes("not found in your") && emailPlatform === "Mailchimp" && (
                  <Alert variant="warning" className="bg-amber-50 border-amber-200">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Why is this happening?</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      <p className="mb-2">
                        This member's email address is not in your Mailchimp audience. This could be because:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>The member hasn't been synced to Mailchimp yet</li>
                        <li>The member was unsubscribed or removed from your Mailchimp audience</li>
                        <li>The email address in Whop is different from the one in Mailchimp</li>
                      </ul>
                      <p className="mt-2">
                        Try syncing your members again from the Setup tab, or manually add this member to your Mailchimp
                        audience.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : memberEmailData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Platform Data
                  </CardTitle>
                  <CardDescription>Data from {emailPlatform}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Subscription Status</h3>
                      <Badge variant={getEmailStatusBadgeVariant(memberEmailData.status)} className="mt-1">
                        {memberEmailData.status}
                      </Badge>
                    </div>

                    {memberEmailData.lastEmailSent && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Last Email Sent</h3>
                        <p className="text-base">{memberEmailData.lastEmailSent}</p>
                      </div>
                    )}

                    {memberEmailData.openRate !== null && memberEmailData.openRate !== undefined && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Open Rate</h3>
                        <p className="text-base">
                          {typeof memberEmailData.openRate === "number"
                            ? `${memberEmailData.openRate}%`
                            : memberEmailData.openRate}
                        </p>
                      </div>
                    )}

                    {memberEmailData.clickRate !== null && memberEmailData.clickRate !== undefined && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Click Rate</h3>
                        <p className="text-base">
                          {typeof memberEmailData.clickRate === "number"
                            ? `${memberEmailData.clickRate}%`
                            : memberEmailData.clickRate}
                        </p>
                      </div>
                    )}

                    {memberEmailData.campaigns && memberEmailData.campaigns.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          {emailPlatform === "ConvertKit" ? "Tags & Sequences" : "Campaign History"}
                        </h3>
                        <div className="border rounded-md">
                          <div className="grid grid-cols-3 gap-2 p-2 border-b bg-muted/50 font-medium text-sm">
                            <div>{emailPlatform === "ConvertKit" ? "Tag/Sequence" : "Campaign"}</div>
                            <div>Date</div>
                            <div>Status</div>
                          </div>
                          {memberEmailData.campaigns.map((campaign: any, index: number) => (
                            <div key={index} className="grid grid-cols-3 gap-2 p-2 border-b last:border-0 text-sm">
                              <div>{campaign.name}</div>
                              <div>{campaign.sentDate}</div>
                              <div>
                                {emailPlatform === "ConvertKit" ? (
                                  <Badge variant="secondary">Active</Badge>
                                ) : (
                                  campaign.opened ? (
                                    campaign.clicked ? (
                                      <Badge variant="default">Clicked</Badge>
                                    ) : (
                                      <Badge variant="secondary">Opened</Badge>
                                    )
                                  ) : (
                                    <Badge variant="outline">Not opened</Badge>
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {emailPlatform === "ConvertKit" ? "No tags or sequences found" : "No campaign history available"}
                      </div>
                    )}

                    {/* ConvertKit specific subscriber info */}
                    {emailPlatform === "ConvertKit" && memberEmailData.subscriberInfo && (
                      <div className="mt-6 pt-6 border-t">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Subscriber Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground">First Name</h4>
                            <p className="text-sm">{memberEmailData.subscriberInfo.firstName}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground">Last Name</h4>
                            <p className="text-sm">{memberEmailData.subscriberInfo.lastName}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground">Created Date</h4>
                            <p className="text-sm">{memberEmailData.subscriberInfo.createdAt}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground">Tags</h4>
                            <p className="text-sm">{memberEmailData.subscriberInfo.tags}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ConvertKit limitations notice */}
                    {emailPlatform === "ConvertKit" && (
                      <Alert variant="warning" className="bg-amber-50 border-amber-200 mt-4">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">ConvertKit Data Limitations</AlertTitle>
                        <AlertDescription className="text-amber-700">
                          ConvertKit's API provides basic subscriber information but doesn't include detailed email engagement metrics like open rates, click rates, or campaign history. For detailed analytics, please check your ConvertKit dashboard directly.
                        </AlertDescription>
                      </Alert>
                    )}
                    {memberEmailData.profileUrl && (
                      <Button variant="secondary" asChild>
                        <a
                          href={memberEmailData.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          View Profile <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No email data is available for this member in {emailPlatform}.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This could be because the member is not subscribed to your list or their email address is different in{" "}
                  {emailPlatform}.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "text-green-500"
    case "inactive":
      return "text-red-500"
    default:
      return "text-gray-500"
  }
}
