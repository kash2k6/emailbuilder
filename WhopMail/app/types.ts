export interface WhopMembership {
  id: string
  email: string
  name?: string
  first_name?: string
  last_name?: string
  username?: string
  product?: string | WhopProduct
  product_id?: string
  status: string
  expires_at?: string | null
  created_at: string
  valid: boolean
  user: string
  user_id?: string // Add user_id field from v2 API
  // Enhanced fields from Whop API
  profile_pic_url?: string
  user_created_at?: string
  user_updated_at?: string
  product_title?: string
  product_description?: string
  product_logo_url?: string
  plan_id?: string
  plan_name?: string
  plan_price?: number
  plan_currency?: string
  metadata?: Record<string, any>
  // AI-enhanced fields
  engagement_score?: number
  member_tier?: 'premium' | 'standard' | 'trial'
  predicted_lifetime_value?: number
  churn_risk?: 'low' | 'medium' | 'high'
  recommended_segments?: string[]
  // Enhanced user details
  userDetails?: any
  // Additional membership details from v5 API
  membershipDetails?: {
    user_id?: string
    product_id?: string
    plan_id?: string
    page_id?: string
    created_at?: number
    expires_at?: number
    renewal_period_start?: number
    renewal_period_end?: number
    quantity?: number
    status?: string
    valid?: boolean
    cancel_at_period_end?: boolean
    license_key?: string
    metadata?: Record<string, any>
    checkout_id?: string
    affiliate_username?: string
    manage_url?: string
    company_buyer_id?: number
    marketplace?: boolean
    custom_field_responses?: Array<{
      id: string
      created_at: number
      updated_at: number
      question: string
      answer: string
    }>
  }
}

export interface WhopProduct {
  id: string
  title: string
  description?: string
  logo_url?: string
  route?: string
  headline?: string
  created_at?: string
  updated_at?: string
}

export interface WhopPlan {
  id: string
  name: string
  price: number
  currency: string
  interval?: 'monthly' | 'yearly' | 'one_time'
  trial_days?: number
  features?: string[]
}

export interface WhopUser {
  id: string
  username: string
  email: string
  name?: string
  profile_pic_url?: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface EnhancedMemberData {
  membership: WhopMembership
  user: WhopUser
  product: WhopProduct
  plan: WhopPlan
  // AI insights
  ai_insights: {
    engagement_score: number
    member_tier: 'premium' | 'standard' | 'trial'
    predicted_lifetime_value: number
    churn_risk: 'low' | 'medium' | 'high'
    recommended_segments: string[]
    next_best_action: string
    personalization_suggestions: string[]
  }
}

export interface WhopApiResponse {
  success: boolean
  members?: WhopMembership[]
  totalMembers?: number
  activeMembers?: number
  expiringMembers?: number
  completedMembers?: number
  currentPage?: number
  totalPages?: number
  timestamp?: string
  error?: string
}

export type WhopMember = WhopMembership

export interface MailchimpList {
  id: string
  name: string
  stats: {
    member_count: number
  }
  date_created: string
}

export interface MailchimpApiResponse {
  success: boolean
  lists?: MailchimpList[]
  error?: string
  dc?: string // Data center
}

export interface EmailPlatformConfig {
  type: "mailchimp" | "klaviyo" | "convertkit" | "activecampaign" | "gohighlevel" | "resend"
  apiKey: string
  listId: string
  dc?: string
  apiUrl?: string
  locationId?: string
  // Enhanced configuration
  customFields?: Record<string, string>
  tags?: string[]
  segments?: string[]
  automationTriggers?: string[]
}

export interface GoHighLevelList {
  id: string
  name: string
  memberCount?: number
}

export interface GoHighLevelApiResponse {
  success: boolean
  lists?: GoHighLevelList[]
  error?: string
  locationId?: string
}

export interface SyncResult {
  success: boolean
  syncedCount: number
  error?: string
  details?: {
    platform: string
    memberId: string
    email: string
    customFields?: Record<string, any>
    tags?: string[]
  }
}

export interface AIAnalysisResult {
  memberId: string
  email: string
  insights: {
    engagement_score: number
    member_tier: 'premium' | 'standard' | 'trial'
    predicted_lifetime_value: number
    churn_risk: 'low' | 'medium' | 'high'
    recommended_segments: string[]
    next_best_action: string
    personalization_suggestions: string[]
  }
  recommendations: {
    email_frequency: 'high' | 'medium' | 'low'
    content_type: string[]
    send_time: string
    subject_line_suggestions: string[]
  }
}
