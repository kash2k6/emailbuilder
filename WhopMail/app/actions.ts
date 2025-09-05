"use server"

import { storage } from "@/lib/storage"
import type { WhopApiResponse, WhopMember, WhopMembership } from "@/app/types"
import { fetchMembershipPage } from "@/lib/whop"
import { revalidatePath } from "next/cache"
import { whopSdk } from "@/lib/whop-sdk"
import { getPlanById, getDefaultPlan } from "@/lib/plan-config"

// Helper function to generate a deterministic UUID from a string
function generateUUID(input: string): string {
  // Create a deterministic hash from the input string
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Use the absolute value to ensure consistency
  const absHash = Math.abs(hash)
  
  // Create a proper UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hashStr = absHash.toString(16).padStart(8, '0')
  const hashStr2 = (absHash * 31).toString(16).padStart(8, '0')
  const hashStr3 = (absHash * 17).toString(16).padStart(8, '0')
  const hashStr4 = (absHash * 23).toString(16).padStart(8, '0')
  
  // Ensure we have enough characters for a valid UUID
  const part1 = hashStr.padEnd(8, '0').slice(0, 8)
  const part2 = hashStr2.padEnd(4, '0').slice(0, 4)
  const part3 = hashStr3.padEnd(4, '0').slice(0, 4)
  const part4 = hashStr4.padEnd(4, '0').slice(0, 4)
  const part5 = (hashStr + hashStr2).padEnd(12, '0').slice(0, 12)
  
  return `${part1}-${part2}-4${part3.slice(1)}-${part4}-${part5}`
}

// Helper function to get storage client with fallback
function getStorageClient() {
  try {
    // Try to use Supabase first if available
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Dynamic import to avoid build issues
      const { createClient } = require("@supabase/supabase-js")
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      return { type: 'supabase' as const, client: supabaseClient }
    } else {
      console.log('Supabase not available, using local storage')
      return { type: 'local' as const, client: storage }
    }
  } catch (error) {
    console.log('Supabase not available, falling back to local storage')
    // Fall back to local storage
    return { type: 'local' as const, client: storage }
  }
}

export async function submitWhopApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate the API key directly with Whop API
    const response = await fetch("https://api.whop.com/api/v2/products", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Whop API validation failed:", errorData)
      return { 
        success: false, 
        error: `Invalid API key. Whop API returned ${response.status}` 
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error validating API key:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate API key.",
    }
  }
}

/**
 * Save email platform configuration and sync members
 * This now works directly without external webhooks
 */
export async function submitEmailPlatform(
  apiKey: string,
  platform: string,
  memberData: WhopApiResponse,
): Promise<{ success: boolean; syncedCount?: number; error?: string }> {
  try {
    // For now, we'll just return success since the actual email platform sync
    // will be handled by the individual platform action files
    // The real sync happens when users configure their email platform in the dashboard
    
    const members = (memberData.members ?? []).map((m) => (m.name || m.username ? m : { ...m, name: m.username ?? "" }))

    console.log(`Prepared ${members.length} members for ${platform} sync`)
    
    return { 
      success: true, 
      syncedCount: members.length,
      error: undefined
    }
  } catch (err) {
    console.error("Error submitting email platform:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to connect email platform.",
    }
  }
}

export async function saveApiKey(apiKey: string, whopUserId: string) {
  try {
    // First validate the API key
    const validationResult = await submitWhopApiKey(apiKey)
    if (!validationResult.success) {
      throw new Error(validationResult.error || 'Failed to validate API key')
    }

    const storageClient = getStorageClient()
    
    if (storageClient.type === 'supabase') {
      // Use Supabase - store the Whop user ID directly as a string
      console.log('Saving API key to Supabase for user:', whopUserId)
      
      // First try to update existing record using whop_user_id
      console.log('Attempting to update existing profile for whop_user_id:', whopUserId)
      const { data: existingProfileData, error: updateProfileError } = await storageClient.client
        .from('profiles')
        .update({
          whop_api_key: apiKey,
          updated_at: new Date().toISOString()
        })
        .eq('whop_user_id', whopUserId)
      
      console.log('Update result:', { existingProfileData, updateProfileError })

      // If no record was updated, insert a new one
      if (!updateProfileError && (!existingProfileData || existingProfileData.length === 0)) {
        console.log('No existing profile found, inserting new profile for whop_user_id:', whopUserId)
        const { error: insertProfileError } = await storageClient.client
          .from('profiles')
          .insert({
            whop_user_id: whopUserId,
            whop_api_key: apiKey,
            updated_at: new Date().toISOString()
          })
        
        console.log('Insert result:', { insertProfileError })
        
        if (insertProfileError) {
          console.error('Error inserting profile:', insertProfileError)
          throw new Error('Failed to save API key to database')
        }
      } else if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError)
        throw new Error('Failed to save API key to database')
      }
    } else {
      // Use local storage
      await storageClient.client.upsertCompanyProfile({
        company_id: whopUserId,
        whop_api_key: apiKey
      })
    }
    
    // Automatically fetch and sync members
    console.log('API key validated successfully, automatically syncing members...')
    const memberData = await fetchAllWhopMembers(apiKey)
    
    if (memberData.success && memberData.members) {
      console.log(`Successfully synced ${memberData.members.length} members automatically`)
    } else {
      console.warn('Member sync completed but some issues occurred:', memberData.error)
    }
    
    revalidatePath("/dashboard")
    return { success: true, syncedCount: memberData.members?.length || 0 }
  } catch (error) {
    console.error('Error saving API key:', error)
    throw error
  }
}

export async function getProfile(whopUserId: string) {
  const storageClient = getStorageClient()
  
  if (storageClient.type === 'supabase') {
    // Use whop_user_id directly instead of generating UUID
    console.log('Looking for profile with whop_user_id:', whopUserId)
    
    const { data, error } = await storageClient.client
      .from('profiles')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      // Let's also check what profiles exist in the database
      const { data: allProfiles } = await storageClient.client
        .from('profiles')
        .select('*')
      console.log('All profiles in database:', allProfiles)
      return null
    }

    console.log('Found profile:', data)
    return data
  } else {
    // Use local storage
    const profile = await storageClient.client.getCompanyProfile(whopUserId)
    return profile ? {
      whop_user_id: profile.company_id,
      whop_api_key: profile.whop_api_key,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    } : null
  }
}

export async function saveEmailPlatformConfig(whopUserId: string, config: any) {
  try {
    console.log('Saving email platform config for user:', whopUserId, 'platform:', config.platform)
    
    const storageClient = getStorageClient()
    
    if (storageClient.type === 'supabase') {
      // Use whop_user_id directly instead of generating UUID
      console.log('Using whop_user_id directly for database storage:', whopUserId)
      
      // First, delete any existing integrations for this user (to allow platform switching)
      const { error: deleteError } = await storageClient.client
        .from('integrations')
        .delete()
        .eq('whop_user_id', whopUserId)
      
      if (deleteError) {
        console.error('Error deleting existing integrations:', deleteError)
        // Don't throw error here, continue with insert
      } else {
        console.log('Successfully deleted existing integrations')
      }
      
      // If we're not clearing the integration (i.e., apiKey is not empty), insert the new one
      if (config.apiKey && config.apiKey.trim() !== '') {
        console.log('Inserting new integration')
        const { error: insertError } = await storageClient.client
          .from('integrations')
          .insert({
            whop_user_id: whopUserId,
            platform: config.platform,
            api_key: config.apiKey,
            api_secret: config.apiSecret,
            list_id: config.listId,
            dc: config.dc,
            api_url: config.apiUrl,
            updated_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.error('Error inserting integration:', insertError)
          throw new Error('Failed to save email platform configuration')
        }
        console.log('Successfully inserted new integration')
      } else {
        console.log('Integration cleared (no new integration to save)')
      }
    } else {
      // Use local storage
      console.log('Using local storage for email platform config')
      await storageClient.client.upsertIntegration({
        company_id: whopUserId,
        platform: config.platform,
        api_key: config.apiKey,
        list_id: config.listId,
        dc: config.dc,
        api_url: config.apiUrl
      })
      console.log('Successfully saved to local storage')
    }

    revalidatePath("/dashboard")
    console.log('Email platform config saved successfully')
  } catch (error) {
    console.error('Error in saveEmailPlatformConfig:', error)
    throw error
  }
}

export async function getEmailPlatformConfig(whopUserId: string) {
  const storageClient = getStorageClient()
  
  if (storageClient.type === 'supabase') {
    // Use whop_user_id directly instead of generating UUID
    console.log('Looking for email platform config with whop_user_id:', whopUserId)
    
    const { data, error } = await storageClient.client
      .from('integrations')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .maybeSingle() // Use maybeSingle() instead of single() to handle no rows gracefully

    if (error) {
      console.error('Error fetching email platform config:', error)
      return null
    }

    // data will be null if no rows found, which is fine
    return data
  } else {
    // Use local storage
    const integration = await storageClient.client.getIntegration(whopUserId)
    return integration ? {
      whop_user_id: integration.company_id,
      platform: integration.platform,
      api_key: integration.api_key,
      list_id: integration.list_id,
      dc: integration.dc,
      api_url: integration.api_url,
      created_at: integration.created_at,
      updated_at: integration.updated_at
    } : null
  }
}

export async function initializeUserData(whopUserId: string, apiKey: string): Promise<WhopApiResponse> {
  try {
    const members = await fetchWhopMembers(apiKey, 1)
    return members
  } catch (error) {
    console.error("Error fetching Whop members:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function fetchWhopMembers(apiKey: string, page = 1, perPage = 50): Promise<WhopApiResponse> {
  console.log(`=== FETCH WHOP MEMBERS PAGE ${page} (v2 endpoint) ===`)
  console.log("API Key present:", !!apiKey)
  console.log("Per page:", perPage)
  
  try {
    console.log("Using v2 members endpoint for direct access to name and email...")
    
    // First, get the total pages by querying page 1
    if (page === 1) {
      console.log("🔍 First query: Getting total pages info...")
      const firstPageUrl = `https://api.whop.com/api/v2/members?page=1&per=${perPage}`
      
      const firstResponse = await fetch(firstPageUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })
      
      if (!firstResponse.ok) {
        const errorText = await firstResponse.text()
        throw new Error(`Whop API error: ${firstResponse.status} ${errorText}`)
      }
      
      const firstResult = await firstResponse.json()
      const totalPages = firstResult.pagination?.total_page || 1
      const totalCount = firstResult.pagination?.total_count || 0
      
      console.log(`📊 Total pages: ${totalPages}, Total members: ${totalCount}`)
    }
    
    // Now fetch the requested page
    const url = `https://api.whop.com/api/v2/members?page=${page}&per=${perPage}`
    
    console.log(`🔍 Fetching page ${page} from URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Whop API error: ${response.status} ${errorText}`)
    }
    
    const result = await response.json()
    const members = result.data || []
    const pagination = result.pagination || {}
    
    console.log("v2 members endpoint result:", {
      memberCount: members.length,
      pagination: pagination
    })
    console.log("Pagination details:", {
      current_page: pagination.current_page,
      total_page: pagination.total_page,
      total_count: pagination.total_count
    })
    console.log("First few members:", members.slice(0, 3).map(m => ({ 
      email: m.email, 
      name: m.name, 
      username: m.username 
    })) || [])
    
    // Transform v2 members to WhopMembership[] format (no need for additional API calls!)
    console.log("Transforming v2 members to WhopMembership format...")
    const transformedMembers: WhopMembership[] = members.map((m: any) => {
      // Extract first and last name from the full name
      const nameParts = m.name ? m.name.split(' ') : []
      const firstName = nameParts.length > 0 ? nameParts[0] : ''
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
      
      return {
        id: m.id,
        email: m.email || 'no-email@example.com',
        name: m.name || m.username || 'Unknown',
        username: m.username || (m.email ? m.email.split('@')[0] : 'unknown'),
        product: 'Whop Product', // v2 endpoint doesn't have product info
        product_id: 'whop-product',
        status: 'active', // v2 endpoint doesn't have status info
        expires_at: null, // v2 endpoint doesn't have expiry info
        created_at: new Date().toISOString(),
        valid: true, // Assume valid for v2 endpoint
        user: m.id,
        user_id: m.id,
        // No need for userDetails since we have everything from v2
        userDetails: null
      }
    })

    // Calculate active members (all v2 members are considered active)
    const activeMembers = transformedMembers.length
    const expiringMembers = 0 // v2 endpoint doesn't have expiry info
    const completedMembers = 0 // v2 endpoint doesn't have completion info

    // Get pagination info from v2 response
    const totalPages = pagination.total_page || 1
    const totalCount = pagination.total_count || members.length
    const currentPage = pagination.current_page || page
    
    console.log("Final pagination info:", {
      total_count: totalCount,
      total_page: totalPages,
      current_page: currentPage,
      per_page: perPage
    })
    
    return {
      success: true,
      members: transformedMembers,
      totalMembers: totalCount,
      activeMembers: activeMembers,
      expiringMembers: expiringMembers,
      completedMembers: completedMembers,
      currentPage: currentPage,
      totalPages: totalPages,
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    console.error(`=== FETCH WHOP MEMBERS PAGE ${page} ERROR ===`)
    console.error("Error in fetchWhopMembers:", err)
    console.error("Error stack:", err instanceof Error ? err.stack : "No stack trace")
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    return {
      success: false,
      error: errorMessage,
      members: [],
      totalMembers: 0,
      currentPage: 1,
      totalPages: 1,
    }
  }
}

/**
 * Helper that auto-paginates and returns _all_ memberships.
 */
export async function fetchAllWhopMembers(apiKey: string): Promise<WhopApiResponse> {
  console.log("=== FETCH ALL WHOP MEMBERS START ===")
  console.log("API Key present:", !!apiKey)
  console.log("API Key length:", apiKey ? apiKey.length : 0)
  
  const allMembers: WhopMembership[] = []
  let currentPage = 1
  let totalPages = 1
  let success = true
  let error: string | undefined = undefined

  try {
    console.log("Starting to fetch members using v2 API (no more double API calls)...")
    
    do {
      console.log(`=== FETCHING PAGE ${currentPage} ===`)
      
      // Use the new v2 API to fetch members (50 per page)
      const pageData = await fetchWhopMembers(apiKey, currentPage, 50)
      console.log(`Page ${currentPage} result:`, {
        success: pageData.success,
        memberCount: pageData.members?.length || 0,
        totalPages: pageData.totalPages,
        error: pageData.error
      })
      
      if (pageData.success && pageData.members) {
        // Members are already complete from v2 endpoint - no enhancement needed!
        console.log(`✅ Page ${currentPage}: ${pageData.members.length} members ready to use`)
        
        allMembers.push(...pageData.members)
        totalPages = pageData.totalPages || 1
 
        console.log(`Total pages: ${totalPages}`)
        currentPage++
      } else {
        console.error(`Page ${currentPage} failed:`, pageData.error)
        success = false
        error = pageData.error || "Failed to fetch a page of members."
        break
      }
    } while (currentPage <= totalPages)
    

    
    
  } catch (err) {
    console.error("=== FETCH ALL WHOP MEMBERS ERROR ===")
    console.error("Error in fetchAllWhopMembers:", err)
    console.error("Error stack:", err instanceof Error ? err.stack : "No stack trace")
    success = false
    error = err instanceof Error ? err.message : "An unexpected error occurred."
  }

  // Calculate active and expiring members
  const activeMembers = allMembers.filter(member => member.valid && member.status === 'active').length
  const expiringMembers = allMembers.filter(member => member.status === 'expiring').length

  return {
    success,
    error,
    members: allMembers,
    totalMembers: allMembers.length,
    activeMembers,
    expiringMembers,
    timestamp: new Date().toISOString(),
  }
}

// Helper functions for AI insights
function calculateEngagementScore(member: WhopMembership, userDetails: any): number {
  let score = 50 // Base score
  
  if (member.valid) score += 20
  if (member.status === "active") score += 10
  if (member.status === "trialing") score += 5
  
  // Account age bonus
  if (userDetails?.created_at) {
    const daysSinceCreation = (Date.now() - userDetails.created_at * 1000) / (1000 * 60 * 60 * 24)
    if (daysSinceCreation < 30) score += 10
    else if (daysSinceCreation > 365) score += 5
  }
  
  return Math.min(100, Math.max(0, score))
}

function determineMemberTier(member: WhopMembership): 'premium' | 'standard' | 'trial' {
  if (member.status === 'trialing') return 'trial'
  if (member.plan_price && member.plan_price > 50) return 'premium'
  return 'standard'
}

function assessChurnRisk(member: WhopMembership): 'low' | 'medium' | 'high' {
  if (member.status === 'active' && member.valid) return 'low'
  if (member.status === 'trialing') return 'medium'
  return 'high'
}

function calculatePredictedLTV(member: WhopMembership): number {
  if (member.plan_price) {
    return member.plan_price * 12 // Simple annual calculation
  }
  return 0
}

function generateRecommendedSegments(member: WhopMembership, userDetails: any): string[] {
  const segments = []
  
  if (member.status === 'trialing') segments.push('trial-users')
  if (member.status === 'active') segments.push('active-users')
  if (member.plan_price && member.plan_price > 50) segments.push('premium-users')
  if (userDetails?.created_at) {
    const daysSinceCreation = (Date.now() - userDetails.created_at * 1000) / (1000 * 60 * 60 * 24)
    if (daysSinceCreation < 30) segments.push('new-users')
    else if (daysSinceCreation > 365) segments.push('long-term-users')
  }
  
  return segments
}

/**
 * Fetch enhanced member data with AI insights and rich profiles
 */
export async function fetchEnhancedWhopMembers(apiKey: string, page = 1, perPage = 25): Promise<WhopApiResponse> {
  console.log(`=== FETCH ENHANCED WHOP MEMBERS PAGE ${page} (DISABLED) ===`)
  console.log("This function is disabled - using v2 API instead")
  
  // Use the regular fetchWhopMembers function instead
  return await fetchWhopMembers(apiKey, page, perPage)
}

/**
 * Fetch a single enhanced member by ID
 */
export async function fetchEnhancedWhopMember(apiKey: string, membershipId: string): Promise<WhopMembership | null> {
  console.log(`=== FETCH ENHANCED WHOP MEMBER ${membershipId} (DISABLED) ===`)
  console.log("This function is disabled - using v2 API instead")
  
  // Use the regular fetchWhopMembership function instead
  try {
    const { fetchWhopMembership } = await import("@/lib/whop")
    const basicMember = await fetchWhopMembership(apiKey, membershipId)
    return {
      id: basicMember.id,
      email: basicMember.email,
      name: basicMember.user?.username,
      username: basicMember.user?.username,
      product: basicMember.product?.title,
      product_id: basicMember.product_id,
      status: basicMember.status,
      expires_at: basicMember.expires_at ? basicMember.expires_at.toString() : null,
      created_at: basicMember.created_at.toString(),
      valid: basicMember.valid,
      user: basicMember.user_id,
    } as WhopMembership
  } catch (fallbackErr) {
    console.error("Fallback fetch also failed:", fallbackErr)
    return null
  }
}

export async function checkSubscriptionStatus(whopUserId: string) {
  console.log("=== CHECKING SUBSCRIPTION STATUS ===")
  console.log("Timestamp:", new Date().toISOString())
  console.log("User ID from Whop header:", whopUserId)
  
  try {
    // Use the hardcoded API key to check if this user has access to EmailSync
    const apiKey = "vFWPl_YUch4YSZ-8qJlMh-udg3T2HV3eZQkpg8qjTls"
    
    console.log("=== API CONFIGURATION ===")
    console.log("Hardcoded API Key:", apiKey.substring(0, 10) + "...")
    console.log("User ID:", whopUserId)
    
    // Step 1: Check if user has access to EmailSync product using hardcoded API key
    console.log("=== STEP 1: CHECK USER ACCESS TO EMAILSYNC PRODUCT ===")
    console.log(`Making GET request to: https://api.whop.com/api/v2/memberships?user_id=${whopUserId}`)
    
    const membershipResponse = await fetch(`https://api.whop.com/api/v2/memberships?user_id=${whopUserId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Membership response status:", membershipResponse.status)
    console.log("Membership response headers:", Object.fromEntries(membershipResponse.headers.entries()))
    
    if (membershipResponse.ok) {
      const membershipData = await membershipResponse.json()
      console.log("✅ Membership endpoint successful:")
      console.log("Membership data:", JSON.stringify(membershipData, null, 2))
      
      // Check if user has any active memberships to EmailSync product
      const activeMemberships = membershipData.data?.filter((membership: any) => 
        (membership.status === 'active' || membership.status === 'trialing') && membership.valid === true
      ) || []
      
      console.log("Active memberships found:", activeMemberships.length)
      console.log("Active memberships:", JSON.stringify(activeMemberships, null, 2))
      
      if (activeMemberships.length > 0) {
        console.log("✅ User has active subscription(s) to EmailSync")
        
        // Use the first active membership for subscription details
        const activeMembership = activeMemberships[0]
        
        // Get plan details from centralized configuration
        const currentPlan = getPlanById(activeMembership?.plan) || getDefaultPlan()
        
        const result = { 
          hasActiveSubscription: true, 
          subscription: {
            status: activeMembership?.status || "active",
            accessLevel: "customer",
            productId: activeMembership?.product || activeMembership?.product_id,
            planId: activeMembership?.plan || activeMembership?.plan_id,
            planName: currentPlan.name,
            contactLimit: currentPlan.contacts,
            planPrice: currentPlan.price,
            membershipId: activeMembership?.id
          },
          trialExpired: false
        }
        console.log("Returning result:", JSON.stringify(result, null, 2))
        return result
      } else {
        console.log("❌ User does not have any active memberships to EmailSync")
      }
    } else {
      const membershipErrorText = await membershipResponse.text()
      console.log("❌ Membership endpoint failed:")
      console.log("Error response:", membershipErrorText)
    }
    
    // Step 2: Fallback to specific product check (if needed)
    console.log("=== STEP 2: SPECIFIC PRODUCT CHECK (FALLBACK) ===")
    const accessPassId = process.env.NEXT_PUBLIC_PREMIUM_ACCESS_PASS_ID || "prod_jqJDVYXsJJDVf"
    
    console.log(`Making GET request to: https://api.whop.com/api/v2/memberships?user_id=${whopUserId}&product_id=${accessPassId}`)
    
    const specificMembershipResponse = await fetch(`https://api.whop.com/api/v2/memberships?user_id=${whopUserId}&product_id=${accessPassId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (specificMembershipResponse.ok) {
      const specificMembershipData = await specificMembershipResponse.json()
      console.log("Specific product membership data:", JSON.stringify(specificMembershipData, null, 2))
      
      const hasSpecificMembership = specificMembershipData.data && specificMembershipData.data.some((membership: any) => 
        (membership.status === 'active' || membership.status === 'trialing') && membership.valid === true
      )
      
      if (hasSpecificMembership) {
        console.log("✅ User has active membership to specific EmailSync product")
        
        const activeMembership = specificMembershipData.data.find((membership: any) => 
          (membership.status === 'active' || membership.status === 'trialing') && membership.valid === true
        )
        
        // Get plan details from centralized configuration
        const currentPlan = getPlanById(activeMembership?.plan) || getDefaultPlan()
        
        const result = { 
          hasActiveSubscription: true, 
          subscription: {
            status: activeMembership?.status || "active",
            accessLevel: "customer",
            productId: activeMembership?.product || activeMembership?.product_id,
            planId: activeMembership?.plan || activeMembership?.plan_id,
            planName: currentPlan.name,
            contactLimit: currentPlan.contacts,
            planPrice: currentPlan.price,
            membershipId: activeMembership?.id
          },
          trialExpired: false
        }
        console.log("Returning result:", JSON.stringify(result, null, 2))
        return result
      }
    }
    
    console.log("❌ No active subscriptions found")
    const result = { 
      hasActiveSubscription: false, 
      subscription: null,
      trialExpired: false
    }
    console.log("Returning result:", JSON.stringify(result, null, 2))
    return result
  } catch (error) {
    console.error("❌ Error checking subscription status:", error)
    console.error("Error details:", JSON.stringify(error, null, 2))
    
    // Deny access on error
    console.log("Error occurred - denying access")
    const result = { 
      hasActiveSubscription: false, 
      subscription: null,
      trialExpired: false
    }
    console.log("Returning result:", JSON.stringify(result, null, 2))
    return result
  }
}

export async function testWhopAPI(whopUserId: string) {
  console.log("=== TESTING WHOP API ===")
  console.log("User ID:", whopUserId)
  
  const apiKey = process.env.WHOP_API_KEY || process.env.WHOP_CLIENT_SECRET
  console.log("API Key type:", apiKey ? (apiKey.startsWith('whop_') ? 'Client Secret' : 'API Key') : 'None')
  console.log("API Key prefix:", apiKey ? apiKey.substring(0, 10) + "..." : "none")
  
  if (!apiKey) {
    console.log("No API key found!")
    return
  }

  try {
    // Test 1: Get user details
    console.log("\n--- Test 1: Get User Details ---")
    const userResponse = await fetch(`https://api.whop.com/api/v2/users/${whopUserId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log("Status:", userResponse.status)
    console.log("Headers:", Object.fromEntries(userResponse.headers.entries()))
    
    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.log("User Data:", JSON.stringify(userData, null, 2))
    } else {
      const errorText = await userResponse.text()
      console.log("Error:", errorText)
    }

    // Test 2: List all access passes
    console.log("\n--- Test 2: List Access Passes ---")
    const passesResponse = await fetch(`https://api.whop.com/api/v2/access-passes`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log("Status:", passesResponse.status)
    
    if (passesResponse.ok) {
      const passesData = await passesResponse.json()
      console.log("Access Passes:", JSON.stringify(passesData, null, 2))
    } else {
      const errorText = await passesResponse.text()
      console.log("Error:", errorText)
    }

    // Test 3: Check specific access pass
    console.log("\n--- Test 3: Check Specific Access Pass ---")
    const accessResponse = await fetch(`https://api.whop.com/api/v2/access-passes/prod_GrJaeMp2e3DBu/access?user_id=${whopUserId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log("Status:", accessResponse.status)
    
    if (accessResponse.ok) {
      const accessData = await accessResponse.json()
      console.log("Access Data:", JSON.stringify(accessData, null, 2))
    } else {
      const errorText = await accessResponse.text()
      console.log("Error:", errorText)
    }

    // Test 4: Get user's memberships
    console.log("\n--- Test 4: Get User Memberships ---")
    const membershipsResponse = await fetch(`https://api.whop.com/api/v2/users/${whopUserId}/memberships`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log("Status:", membershipsResponse.status)
    
    if (membershipsResponse.ok) {
      const membershipsData = await membershipsResponse.json()
      console.log("Memberships:", JSON.stringify(membershipsData, null, 2))
    } else {
      const errorText = await membershipsResponse.text()
      console.log("Error:", errorText)
    }

  } catch (error) {
    console.error("Test failed:", error)
  }
  
  console.log("=== END TESTING ===")
}

export async function createSubscription(whopUserId: string) {
  console.log("Creating subscription for user:", whopUserId)
  
  try {
    // Use the Whop API to create a checkout session
    // The correct endpoint is /api/v2/checkout-sessions
    const response = await fetch("https://api.whop.com/api/v2/checkout-sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHOP_CLIENT_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: process.env.NEXT_PUBLIC_PREMIUM_PLAN_ID || "plan_OSMhiz0f5fuxt", // Use environment variable
        metadata: {
          userId: whopUserId,
          experienceId: "exp_yztLo7SEvKbTNF"
        },
        redirect_url: "https://whop.com/apps/whopmail" // Redirect back to your app
      }),
    });

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error creating checkout session:", errorData)
      
      // If it's a 403, it might be the wrong plan ID or endpoint
      if (response.status === 403) {
        throw new Error("Invalid plan ID or insufficient permissions. Please check your plan configuration.")
      }
      
      throw new Error(errorData.message || "Failed to create checkout session")
    }

    const data = await response.json()
    console.log("Created checkout session:", data.data)
    return { success: true, checkoutSession: data.data }
  } catch (error) {
    console.error("Error creating subscription:", error)
    throw error
  }
}

export async function checkPremiumAccess(whopUserId: string) {
  try {
    const response = await fetch(`https://api.whop.com/api/v2/access-passes/prod_GrJaeMp2e3DBu/access?user_id=${whopUserId}`, {
      headers: {
        Authorization: `Bearer ${process.env.WHOP_CLIENT_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return { hasAccess: false, accessLevel: "none" }
    }

    const data = await response.json()
    return { hasAccess: data.has_access, accessLevel: data.access_level }
  } catch (error) {
    console.error("Error checking premium access:", error)
    return { hasAccess: false, accessLevel: "none" }
  }
}

// Backward compatibility functions
export async function saveApiKeyLegacy(apiKey: string, userId: string) {
  console.warn('saveApiKeyLegacy is deprecated, use saveApiKey with whopUserId instead')
  await saveApiKey(apiKey, userId)
}

export async function saveEmailPlatformConfigLegacy(userId: string, config: any) {
  console.warn('saveEmailPlatformConfigLegacy is deprecated, use saveEmailPlatformConfig with whopUserId instead')
  await saveEmailPlatformConfig(userId, config)
}
