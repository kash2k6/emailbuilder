'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Abstract API Email Reputation configuration
const ABSTRACT_API_KEY = process.env.ABSTRACT_API_KEY || '10f36e0e9caa43bd91259adb4ea3ab85'
const ABSTRACT_API_URL = 'https://emailreputation.abstractapi.com/v1'

export interface DomainHealthData {
  email_address: string
  email_deliverability: {
    status: string
    status_detail: string
    is_format_valid: boolean
    is_smtp_valid: boolean
    is_mx_valid: boolean
    mx_records: string[]
  }
  email_quality: {
    score: number
    is_free_email: boolean
    is_username_suspicious: boolean
    is_disposable: boolean
    is_catchall: boolean
    is_subaddress: boolean
    is_role: boolean
    is_dmarc_enforced: boolean
    is_spf_strict: boolean
    minimum_age: number
  }
  email_sender: {
    first_name: string | null
    last_name: string | null
    email_provider_name: string | null
    organization_name: string | null
    organization_type: string | null
  }
  email_domain: {
    domain: string
    domain_age: number
    is_live_site: boolean
    registrar: string | null
    registrar_url: string | null
    date_registered: string | null
    date_last_renewed: string | null
    date_expires: string | null
    is_risky_tld: boolean
  }
  email_risk: {
    address_risk_status: string
    domain_risk_status: string
  }
  email_breaches: {
    total_breaches: number
    date_first_breached: string | null
    date_last_breached: string | null
    breached_domains: Array<{
      domain: string
      date_breached: string
    }>
  }
}

export interface DomainHealthRecord {
  id: number
  domain: string
  email_address: string
  user_id: string
  deliverability_status: string | null
  deliverability_status_detail: string | null
  is_format_valid: boolean | null
  is_smtp_valid: boolean | null
  is_mx_valid: boolean | null
  mx_records: any
  quality_score: number | null
  is_free_email: boolean | null
  is_username_suspicious: boolean | null
  is_disposable: boolean | null
  is_catchall: boolean | null
  is_subaddress: boolean | null
  is_role: boolean | null
  is_dmarc_enforced: boolean | null
  is_spf_strict: boolean | null
  minimum_age: number | null
  sender_first_name: string | null
  sender_last_name: string | null
  email_provider_name: string | null
  organization_name: string | null
  organization_type: string | null
  domain_age: number | null
  is_live_site: boolean | null
  registrar: string | null
  registrar_url: string | null
  date_registered: string | null
  date_last_renewed: string | null
  date_expires: string | null
  is_risky_tld: boolean | null
  address_risk_status: string | null
  domain_risk_status: string | null
  total_breaches: number | null
  date_first_breached: string | null
  date_last_breached: string | null
  breached_domains: any
  last_checked_at: string
  next_check_at: string
  created_at: string
  updated_at: string
}

/**
 * Get user's current domain from email platform configs
 */
export async function getUserVerifiedDomain(userId: string): Promise<{
  success: boolean
  domain?: string
  fromEmail?: string
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('email_platform_configs')
      .select('custom_domain, from_email, domain_status')
      .eq('whop_user_id', userId)
      .eq('platform_type', 'resend')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No domain found
        return { 
          success: false, 
          error: 'No domain found. Please set up a domain in the EmailSync setup first.' 
        }
      }
      console.error('Error fetching domain:', error)
      return { success: false, error: 'Failed to fetch domain information' }
    }

    if (!data.custom_domain) {
      return { 
        success: false, 
        error: 'No custom domain configured. Please set up a custom domain in EmailSync first.' 
      }
    }

    return {
      success: true,
      domain: data.custom_domain,
      fromEmail: data.from_email
    }
  } catch (error) {
    console.error('Error in getUserVerifiedDomain:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Check if domain health data needs to be refreshed (older than 7 days)
 */
export async function shouldRefreshDomainHealth(domain: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('domain_health')
      .select('next_check_at')
      .eq('domain', domain)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return true // No existing data, need to check
    }

    const nextCheckAt = new Date(data.next_check_at)
    const now = new Date()
    
    return now >= nextCheckAt
  } catch (error) {
    console.error('Error checking domain health refresh status:', error)
    return true
  }
}

/**
 * Fetch domain health data from Abstract API
 */
async function fetchDomainHealthFromAPI(email: string): Promise<DomainHealthData | null> {
  try {
    const url = `${ABSTRACT_API_URL}?api_key=${ABSTRACT_API_KEY}&email=${encodeURIComponent(email)}`
    
    console.log(`🔍 Fetching domain health for: ${email}`)
    console.log(`🔍 Using API key: ${ABSTRACT_API_KEY}`)
    console.log(`🔍 Full URL: ${url}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log(`🔍 Response status: ${response.status}`)
    console.log(`🔍 Response status text: ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Abstract API error: ${response.status} ${response.statusText}`)
      console.error(`❌ Error response body: ${errorText}`)
      return null
    }

    const data: DomainHealthData = await response.json()
    console.log(`✅ Domain health fetched successfully for: ${email}`)
    console.log(`✅ Response data:`, JSON.stringify(data, null, 2))
    
    return data
  } catch (error) {
    console.error('Error fetching domain health from Abstract API:', error)
    return null
  }
}

/**
 * Save domain health data to database
 */
async function saveDomainHealthData(
  domain: string,
  email: string,
  userId: string,
  data: DomainHealthData
): Promise<boolean> {
  try {
    const nextCheckAt = new Date()
    nextCheckAt.setDate(nextCheckAt.getDate() + 7) // 7 days from now

    const { error } = await supabase
      .from('domain_health')
      .upsert({
        domain,
        email_address: email,
        user_id: userId,
        deliverability_status: data.email_deliverability.status,
        deliverability_status_detail: data.email_deliverability.status_detail,
        is_format_valid: data.email_deliverability.is_format_valid,
        is_smtp_valid: data.email_deliverability.is_smtp_valid,
        is_mx_valid: data.email_deliverability.is_mx_valid,
        mx_records: data.email_deliverability.mx_records,
        quality_score: data.email_quality.score,
        is_free_email: data.email_quality.is_free_email,
        is_username_suspicious: data.email_quality.is_username_suspicious,
        is_disposable: data.email_quality.is_disposable,
        is_catchall: data.email_quality.is_catchall,
        is_subaddress: data.email_quality.is_subaddress,
        is_role: data.email_quality.is_role,
        is_dmarc_enforced: data.email_quality.is_dmarc_enforced,
        is_spf_strict: data.email_quality.is_spf_strict,
        minimum_age: data.email_quality.minimum_age,
        sender_first_name: data.email_sender.first_name,
        sender_last_name: data.email_sender.last_name,
        email_provider_name: data.email_sender.email_provider_name,
        organization_name: data.email_sender.organization_name,
        organization_type: data.email_sender.organization_type,
        domain_age: data.email_domain.domain_age,
        is_live_site: data.email_domain.is_live_site,
        registrar: data.email_domain.registrar,
        registrar_url: data.email_domain.registrar_url,
        date_registered: data.email_domain.date_registered,
        date_last_renewed: data.email_domain.date_last_renewed,
        date_expires: data.email_domain.date_expires,
        is_risky_tld: data.email_domain.is_risky_tld,
        address_risk_status: data.email_risk.address_risk_status,
        domain_risk_status: data.email_risk.domain_risk_status,
        total_breaches: data.email_breaches.total_breaches,
        date_first_breached: data.email_breaches.date_first_breached,
        date_last_breached: data.email_breaches.date_last_breached,
        breached_domains: data.email_breaches.breached_domains,
        last_checked_at: new Date().toISOString(),
        next_check_at: nextCheckAt.toISOString()
      }, {
        onConflict: 'domain,user_id'
      })

    if (error) {
      console.error('Error saving domain health data:', error)
      return false
    }

    console.log(`✅ Domain health data saved for: ${domain}`)
    return true
  } catch (error) {
    console.error('Error saving domain health data:', error)
    return false
  }
}

/**
 * Get domain health data for user's verified domain (cached or fresh)
 */
export async function getUserDomainHealth(userId: string): Promise<{
  success: boolean
  data?: DomainHealthRecord
  error?: string
  isFresh?: boolean
  domain?: string
  fromEmail?: string
}> {
  try {
    // First, get the user's verified domain
    const domainResult = await getUserVerifiedDomain(userId)
    
    if (!domainResult.success) {
      return { success: false, error: domainResult.error }
    }

    const domain = domainResult.domain!
    const fromEmail = domainResult.fromEmail!

    // Check if we need to refresh the data
    const needsRefresh = await shouldRefreshDomainHealth(domain, userId)
    
    if (!needsRefresh) {
      // Return cached data
      const { data, error } = await supabase
        .from('domain_health')
        .select('*')
        .eq('domain', domain)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching cached domain health:', error)
        return { success: false, error: 'Failed to fetch cached data' }
      }

      return { 
        success: true, 
        data, 
        isFresh: false,
        domain,
        fromEmail
      }
    }

    // Fetch fresh data from API
    const apiData = await fetchDomainHealthFromAPI(fromEmail)
    
    if (!apiData) {
      return { success: false, error: 'Failed to fetch data from Abstract API' }
    }

    // Save to database
    const saved = await saveDomainHealthData(domain, fromEmail, userId, apiData)
    
    if (!saved) {
      return { success: false, error: 'Failed to save domain health data' }
    }

    // Return the fresh data
    const { data, error } = await supabase
      .from('domain_health')
      .select('*')
      .eq('domain', domain)
      .eq('user_id', userId)
      .single()

    if (error) {
      return { success: false, error: 'Failed to fetch saved data' }
    }

    return { 
      success: true, 
      data, 
      isFresh: true,
      domain,
      fromEmail
    }

  } catch (error) {
    console.error('Error in getUserDomainHealth:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Get all domain health records for a user
 */
export async function getUserDomainHealthHistory(userId: string): Promise<{
  success: boolean
  data?: DomainHealthRecord[]
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('domain_health')
      .select('*')
      .eq('user_id', userId)
      .order('last_checked_at', { ascending: false })

    if (error) {
      console.error('Error fetching user domain health history:', error)
      return { success: false, error: 'Failed to fetch domain health history' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getUserDomainHealthHistory:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Force refresh domain health data for user's verified domain (ignore cache)
 */
export async function forceRefreshUserDomainHealth(userId: string): Promise<{
  success: boolean
  data?: DomainHealthRecord
  error?: string
  domain?: string
  fromEmail?: string
}> {
  try {
    // First, get the user's verified domain
    const domainResult = await getUserVerifiedDomain(userId)
    
    if (!domainResult.success) {
      return { success: false, error: domainResult.error }
    }

    const domain = domainResult.domain!
    const fromEmail = domainResult.fromEmail!

    // Fetch fresh data from API
    const apiData = await fetchDomainHealthFromAPI(fromEmail)
    
    if (!apiData) {
      return { success: false, error: 'Failed to fetch data from Abstract API' }
    }

    // Save to database
    const saved = await saveDomainHealthData(domain, fromEmail, userId, apiData)
    
    if (!saved) {
      return { success: false, error: 'Failed to save domain health data' }
    }

    // Return the fresh data
    const { data, error } = await supabase
      .from('domain_health')
      .select('*')
      .eq('domain', domain)
      .eq('user_id', userId)
      .single()

    if (error) {
      return { success: false, error: 'Failed to fetch saved data' }
    }

    return { 
      success: true, 
      data,
      domain,
      fromEmail
    }
  } catch (error) {
    console.error('Error in forceRefreshUserDomainHealth:', error)
    return { success: false, error: 'Internal server error' }
  }
} 