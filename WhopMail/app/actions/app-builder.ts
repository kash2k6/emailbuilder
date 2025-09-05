'use server'

import { createClient } from '@/lib/supabase-server'

export interface AppBuilderApiKey {
  id: string
  whop_user_id: string
  api_key_name: string
  whop_api_key: string
  app_id: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface WhopCompany {
  id: string
  created_at: number
  title: string
  image_url: string | null
  authorized_user: {
    id: string
    user_id: string
    role: string
    company_id: string
    user: {
      id: string
      name: string
      username: string
      email: string
      profile_pic_url: string | null
      created_at: number
      profile_pic_url_32: string | null
      profile_pic_url_64: string | null
      profile_pic_url_128: string | null
    }
  } | null
  has_payment_method: boolean
  route: string | null
  owner: {
    id: string
    name: string
    username: string
    email: string
    profile_pic_url: string | null
    created_at: number
    profile_pic_url_32: string | null
    profile_pic_url_64: string | null
    profile_pic_url_128: string | null
  }
  // Source tracking for API key identification
  _source_api_key_id?: string
  _source_api_key_name?: string
}

export interface WhopCompaniesResponse {
  pagination: {
    current_page: number
    total_pages: number
    next_page: number | null
    prev_page: number | null
    total_count: number
  }
  data: WhopCompany[]
}

export interface WhopMembership {
  id: string
  product_id: string
  user_id: string | null
  plan_id: string
  page_id: string
  created_at: number
  expires_at: number | null
  renewal_period_start: number | null
  renewal_period_end: number | null
  quantity: number
  status: string
  valid: boolean
  cancel_at_period_end: boolean
  license_key: string | null
  metadata: Record<string, any>
  checkout_id: string | null
  affiliate_username: string | null
  manage_url: string
  company_buyer_id: string | null
  marketplace: boolean
  custom_field_responses: Array<{
    id: string
    created_at: number
    updated_at: number
    question: string
    answer: string
  }>
}

export interface WhopMembershipsResponse {
  pagination: {
    current_page: number
    total_pages: number
    next_page: number | null
    prev_page: number | null
    total_count: number
  }
  data: WhopMembership[]
}

/**
 * Get all app builder API keys for a user
 */
export async function getAppBuilderApiKeys(whopUserId: string): Promise<{
  success: boolean
  apiKeys?: AppBuilderApiKey[]
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('app_builder_api_keys')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching app builder API keys:', error)
      return { success: false, error: error.message }
    }

    return { success: true, apiKeys: data || [] }
  } catch (error) {
    console.error('Error in getAppBuilderApiKeys:', error)
    return { success: false, error: 'Failed to fetch API keys' }
  }
}

/**
 * Add a new app builder API key
 */
export async function addAppBuilderApiKey(
  whopUserId: string,
  apiKeyName: string,
  whopApiKey: string,
  appId?: string
): Promise<{
  success: boolean
  apiKey?: AppBuilderApiKey
  error?: string
}> {
  try {
    const supabase = createClient()

    // Validate the API key by making a test request to Whop
    const testResult = await testWhopApiKey(whopApiKey)
    if (!testResult.success) {
      return { success: false, error: 'Invalid API key or API error' }
    }

    const { data, error } = await supabase
      .from('app_builder_api_keys')
      .insert({
        whop_user_id: whopUserId,
        api_key_name: apiKeyName,
        whop_api_key: whopApiKey,
        app_id: appId || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding app builder API key:', error)
      return { success: false, error: error.message }
    }

    return { success: true, apiKey: data }
  } catch (error) {
    console.error('Error in addAppBuilderApiKey:', error)
    return { success: false, error: 'Failed to add API key' }
  }
}

/**
 * Update an app builder API key
 */
export async function updateAppBuilderApiKey(
  apiKeyId: string,
  updates: {
    api_key_name?: string
    whop_api_key?: string
    app_id?: string
    is_active?: boolean
  }
): Promise<{
  success: boolean
  apiKey?: AppBuilderApiKey
  error?: string
}> {
  try {
    const supabase = createClient()

    // If updating the API key, validate it first
    if (updates.whop_api_key) {
      const testResult = await testWhopApiKey(updates.whop_api_key)
      if (!testResult.success) {
        return { success: false, error: 'Invalid API key or API error' }
      }
    }

    const { data, error } = await supabase
      .from('app_builder_api_keys')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', apiKeyId)
      .select()
      .single()

    if (error) {
      console.error('Error updating app builder API key:', error)
      return { success: false, error: error.message }
    }

    return { success: true, apiKey: data }
  } catch (error) {
    console.error('Error in updateAppBuilderApiKey:', error)
    return { success: false, error: 'Failed to update API key' }
  }
}

/**
 * Delete an app builder API key
 */
export async function deleteAppBuilderApiKey(apiKeyId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('app_builder_api_keys')
      .delete()
      .eq('id', apiKeyId)

    if (error) {
      console.error('Error deleting app builder API key:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteAppBuilderApiKey:', error)
    return { success: false, error: 'Failed to delete API key' }
  }
}

/**
 * Test a Whop API key by making a request to the companies endpoint
 */
async function testWhopApiKey(apiKey: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Clean the API key - remove "Bearer " prefix if present
    const cleanApiKey = apiKey.replace(/^Bearer\s+/i, '')
    
    const response = await fetch('https://api.whop.com/api/v5/app/companies?page=1&per=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Whop API test failed:', response.status, errorData)
      return { success: false, error: `API test failed: ${response.status} - ${errorData.message || 'Unknown error'}` }
    }

    return { success: true }
  } catch (error) {
    console.error('Error testing Whop API key:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Fetch memberships from Whop using an app builder API key
 */
export async function fetchWhopMemberships(
  apiKeyId: string,
  page: number = 1,
  per: number = 50
): Promise<{
  success: boolean
  memberships?: WhopMembershipsResponse
  error?: string
}> {
  try {
    const supabase = createClient()

    // Get the API key from the database
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('app_builder_api_keys')
      .select('whop_api_key')
      .eq('id', apiKeyId)
      .eq('is_active', true)
      .single()

    if (apiKeyError || !apiKeyData) {
      return { success: false, error: 'API key not found or inactive' }
    }

    // Update last_used_at
    await supabase
      .from('app_builder_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyId)

    // Clean the API key - remove "Bearer " prefix if present
    const cleanApiKey = apiKeyData.whop_api_key.replace(/^Bearer\s+/i, '')
    
    // Fetch memberships from Whop API
    const response = await fetch(
      `https://api.whop.com/api/v5/app/memberships?page=${page}&per=${per}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Whop API memberships fetch failed:', response.status, errorData)
      return { 
        success: false, 
        error: `API fetch failed: ${response.status} - ${errorData.message || 'Unknown error'}` 
      }
    }

    const membershipsData: WhopMembershipsResponse = await response.json()
    console.log(`Successfully fetched ${membershipsData.data.length} memberships from API key ${apiKeyId}`)
    
    return { success: true, memberships: membershipsData }
  } catch (error) {
    console.error('Error fetching Whop memberships:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Fetch only the first page of memberships for a single API key (manual loading only)
 */
async function fetchLimitedMembershipsForApiKey(
  apiKeyId: string,
  apiKeyName: string,
  whopApiKey: string,
  maxPages: number = 1 // Changed to 1 - only first page
): Promise<{
  success: boolean
  memberships?: WhopMembership[]
  totalCount?: number
  error?: string
}> {
  try {
    console.log(`Fetching first page of memberships for API key: ${apiKeyName}`)
    
    // Only get the first page - no automatic pagination
    const firstPageResult = await fetchWhopMemberships(apiKeyId, 1, 50)
    if (!firstPageResult.success || !firstPageResult.memberships) {
      return { success: false, error: firstPageResult.error }
    }
    
    const totalPages = firstPageResult.memberships.pagination.total_pages
    console.log(`Total pages available for API key ${apiKeyName}: ${totalPages}, but only fetching first page`)
    
    const memberships = firstPageResult.memberships.data
    console.log(`Fetched ${memberships.length} memberships from first page for API key: ${apiKeyName}`)
    
    return { success: true, memberships: memberships, totalCount: memberships.length }
  } catch (error) {
    console.error(`Error fetching first page of memberships for API key ${apiKeyName}:`, error)
    return { success: false, error: 'Failed to fetch memberships' }
  }
}

/**
 * Fetch first page of memberships for a single API key (manual loading only)
 */
async function fetchAllMembershipsForApiKey(
  apiKeyId: string,
  apiKeyName: string,
  whopApiKey: string
): Promise<{
  success: boolean
  memberships?: WhopMembership[]
  totalCount?: number
  error?: string
}> {
  try {
    console.log(`Fetching first page of memberships for API key: ${apiKeyName}`)
    
    // Only get the first page - no automatic pagination
    const firstPageResult = await fetchWhopMemberships(apiKeyId, 1, 50)
    if (!firstPageResult.success || !firstPageResult.memberships) {
      return { success: false, error: firstPageResult.error }
    }
    
    const totalPages = firstPageResult.memberships.pagination.total_pages
    console.log(`Total pages available for API key ${apiKeyName}: ${totalPages}, but only fetching first page`)
    
    const memberships = firstPageResult.memberships.data
    console.log(`Fetched ${memberships.length} memberships from first page for API key: ${apiKeyName}`)
    
    return { success: true, memberships: memberships, totalCount: memberships.length }
  } catch (error) {
    console.error(`Error fetching first page of memberships for API key ${apiKeyName}:`, error)
    return { success: false, error: 'Failed to fetch memberships' }
  }
}

/**
 * Fetch first page of memberships for filtering purposes (manual loading only)
 */
export async function fetchMembershipsForFiltering(
  whopUserId: string,
  maxPagesPerKey: number = 1 // Changed to 1 - only first page
): Promise<{
  success: boolean
  memberships?: WhopMembership[]
  totalCount?: number
  error?: string
}> {
  try {
    const supabase = createClient()

    // Get all active API keys for the user
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('app_builder_api_keys')
      .select('id, api_key_name, whop_api_key')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)

    if (apiKeysError) {
      console.error('Error fetching API keys:', apiKeysError)
      return { success: false, error: 'Failed to fetch API keys' }
    }

    if (!apiKeys || apiKeys.length === 0) {
      return { success: false, error: 'No active API keys found' }
    }

    console.log(`Fetching first page of memberships from ${apiKeys.length} API keys`)
    
    let allMemberships: WhopMembership[] = []
    
    // Fetch first page of memberships from each API key
    for (const apiKey of apiKeys) {
      const membershipsResult = await fetchLimitedMembershipsForApiKey(
        apiKey.id,
        apiKey.api_key_name,
        apiKey.whop_api_key,
        maxPagesPerKey
      )
      
      if (membershipsResult.success && membershipsResult.memberships) {
        // Add source tracking to memberships
        const membershipsWithSource = membershipsResult.memberships.map(membership => ({
          ...membership,
          _source_api_key_id: apiKey.id,
          _source_api_key_name: apiKey.api_key_name
        }))
        
        allMemberships.push(...membershipsWithSource)
        console.log(`Successfully fetched ${membershipsResult.memberships.length} memberships from first page of API key: ${apiKey.api_key_name}`)
      } else {
        console.error(`Failed to fetch memberships from API key ${apiKey.api_key_name}:`, membershipsResult.error)
      }
    }
    
    console.log(`Total memberships fetched from first pages of all API keys: ${allMemberships.length}`)
    return { success: true, memberships: allMemberships, totalCount: allMemberships.length }
  } catch (error) {
    console.error('Error fetching memberships for filtering:', error)
    return { success: false, error: 'Failed to fetch memberships' }
  }
}

/**
 * Fetch all memberships for a user across all their API keys (complete data)
 */
export async function fetchAllMembershipsForUser(
  whopUserId: string
): Promise<{
  success: boolean
  memberships?: WhopMembership[]
  totalCount?: number
  error?: string
}> {
  try {
    const supabase = createClient()

    // Get all active API keys for the user
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('app_builder_api_keys')
      .select('id, api_key_name, whop_api_key')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)

    if (apiKeysError) {
      console.error('Error fetching API keys:', apiKeysError)
      return { success: false, error: 'Failed to fetch API keys' }
    }

    if (!apiKeys || apiKeys.length === 0) {
      return { success: false, error: 'No active API keys found' }
    }

    console.log(`Fetching ALL memberships from ${apiKeys.length} API keys`)
    
    let allMemberships: WhopMembership[] = []
    
    // Fetch memberships from each API key
    for (const apiKey of apiKeys) {
      const membershipsResult = await fetchAllMembershipsForApiKey(
        apiKey.id,
        apiKey.api_key_name,
        apiKey.whop_api_key
      )
      
      if (membershipsResult.success && membershipsResult.memberships) {
        // Add source tracking to memberships
        const membershipsWithSource = membershipsResult.memberships.map(membership => ({
          ...membership,
          _source_api_key_id: apiKey.id,
          _source_api_key_name: apiKey.api_key_name
        }))
        
        allMemberships.push(...membershipsWithSource)
        console.log(`Successfully fetched ${membershipsResult.memberships.length} memberships from API key: ${apiKey.api_key_name}`)
      } else {
        console.error(`Failed to fetch memberships from API key ${apiKey.api_key_name}:`, membershipsResult.error)
      }
    }
    
    console.log(`Total memberships fetched from all API keys: ${allMemberships.length}`)
    return { success: true, memberships: allMemberships, totalCount: allMemberships.length }
  } catch (error) {
    console.error('Error fetching all memberships for user:', error)
    return { success: false, error: 'Failed to fetch memberships' }
  }
}

/**
 * Fetch companies from Whop using an app builder API key
 */
export async function fetchWhopCompanies(
  apiKeyId: string,
  page: number = 1,
  per: number = 10
): Promise<{
  success: boolean
  companies?: WhopCompaniesResponse
  error?: string
}> {
  try {
    const supabase = createClient()

    // Get the API key from the database
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('app_builder_api_keys')
      .select('whop_api_key')
      .eq('id', apiKeyId)
      .eq('is_active', true)
      .single()

    if (apiKeyError || !apiKeyData) {
      return { success: false, error: 'API key not found or inactive' }
    }

    // Update last_used_at
    await supabase
      .from('app_builder_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyId)

    // Clean the API key - remove "Bearer " prefix if present
    const cleanApiKey = apiKeyData.whop_api_key.replace(/^Bearer\s+/i, '')
    
    // Fetch companies from Whop API
    const response = await fetch(
      `https://api.whop.com/api/v5/app/companies?page=${page}&per=${per}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Whop API request failed:', response.status, errorData)
      return { success: false, error: `API request failed: ${response.status}` }
    }

    const companiesData: WhopCompaniesResponse = await response.json()
    return { success: true, companies: companiesData }
  } catch (error) {
    console.error('Error fetching Whop companies:', error)
    return { success: false, error: 'Failed to fetch companies' }
  }
}

/**
 * Fetch ALL companies from ALL pages for a single API key
 */
async function fetchAllCompaniesForApiKey(
  apiKeyId: string,
  apiKeyName: string,
  whopApiKey: string
): Promise<{
  success: boolean
  companies?: WhopCompany[]
  totalCount?: number
  error?: string
}> {
  try {
    const currentPage = 1
    const perPage = 50 // Maximum per page

    // Clean the API key - remove "Bearer " prefix if present
    const cleanApiKey = whopApiKey.replace(/^Bearer\s+/i, '')

    // Fetch only first page
    console.log(`Fetching first page of companies for API key: ${apiKeyName}`)
    
    const response = await fetch(
      `https://api.whop.com/api/v5/app/companies?page=${currentPage}&per=${perPage}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Whop API request failed for page ${currentPage}:`, response.status, errorData)
      return { success: false, error: `API request failed for page ${currentPage}: ${response.status}` }
    }

    const companiesData: WhopCompaniesResponse = await response.json()
    
    const totalPages = companiesData.pagination.total_pages
    console.log(`Total pages available for API key ${apiKeyName}: ${totalPages}, but only fetching first page`)

    // Add source tracking to each company
    const companiesWithSource = companiesData.data.map(company => ({
      ...company,
      _source_api_key_id: apiKeyId,
      _source_api_key_name: apiKeyName
    }))

    console.log(`Fetched ${companiesData.data.length} companies from first page for API key: ${apiKeyName}`)
    return { success: true, companies: companiesWithSource, totalCount: companiesData.data.length, totalPages }
  } catch (error) {
    console.error('Error fetching first page of companies for API key:', error)
    return { success: false, error: 'Failed to fetch companies for API key' }
  }
}

/**
 * Fetch additional pages of companies for a single API key
 */
export async function fetchAdditionalCompanyPages(
  apiKeyId: string,
  apiKeyName: string,
  whopApiKey: string,
  startPage: number,
  endPage: number
): Promise<{
  success: boolean
  companies?: WhopCompany[]
  totalCount?: number
  error?: string
}> {
  try {
    const perPage = 50 // Maximum per page
    const allCompanies: WhopCompany[] = []

    // Clean the API key - remove "Bearer " prefix if present
    const cleanApiKey = whopApiKey.replace(/^Bearer\s+/i, '')

    console.log(`Fetching pages ${startPage}-${endPage} of companies for API key: ${apiKeyName}`)

    // Fetch specified pages
    for (let page = startPage; page <= endPage; page++) {
      console.log(`Fetching page ${page} for API key: ${apiKeyName}`)
      
      const response = await fetch(
        `https://api.whop.com/api/v5/app/companies?page=${page}&per=${perPage}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cleanApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`Whop API request failed for page ${page}:`, response.status, errorData)
        return { success: false, error: `API request failed for page ${page}: ${response.status}` }
      }

      const companiesData: WhopCompaniesResponse = await response.json()

      // Add source tracking to each company
      const companiesWithSource = companiesData.data.map(company => ({
        ...company,
        _source_api_key_id: apiKeyId,
        _source_api_key_name: apiKeyName
      }))

      allCompanies.push(...companiesWithSource)
      console.log(`Fetched ${companiesData.data.length} companies from page ${page} for API key: ${apiKeyName}`)

      // Add a small delay to respect rate limits
      if (page < endPage) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`Total companies fetched from pages ${startPage}-${endPage} for API key ${apiKeyName}: ${allCompanies.length}`)
    return { success: true, companies: allCompanies, totalCount: allCompanies.length }
  } catch (error) {
    console.error(`Error fetching additional pages for API key ${apiKeyName}:`, error)
    return { success: false, error: 'Failed to fetch additional pages' }
  }
}

/**
 * Fetch all companies from all API keys for a user
 */
export async function fetchAllCompaniesForUser(
  whopUserId: string
): Promise<{
  success: boolean
  companies?: WhopCompany[]
  totalCount?: number
  totalPages?: { [apiKeyId: string]: number }
  error?: string
}> {
  try {
    // Get all active API keys for the user
    const apiKeysResult = await getAppBuilderApiKeys(whopUserId)
    if (!apiKeysResult.success || !apiKeysResult.apiKeys?.length) {
      return { success: false, error: 'No active API keys found' }
    }

    const supabase = createClient()
    const allCompanies: WhopCompany[] = []
    let totalCount = 0
    const totalPages: { [apiKeyId: string]: number } = {}

    console.log(`Fetching companies from ${apiKeysResult.apiKeys.length} API keys`)

    // Fetch first page of companies from each API key
    for (const apiKey of apiKeysResult.apiKeys) {
      console.log(`Processing API key: ${apiKey.api_key_name}`)
      
      // Update last_used_at
      await supabase
        .from('app_builder_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKey.id)

      const companiesResult = await fetchAllCompaniesForApiKey(
        apiKey.id, 
        apiKey.api_key_name, 
        apiKey.whop_api_key
      )
      
      if (companiesResult.success && companiesResult.companies) {
        allCompanies.push(...companiesResult.companies)
        totalCount += companiesResult.totalCount || 0
        if (companiesResult.totalPages) {
          totalPages[apiKey.id] = companiesResult.totalPages
        }
        console.log(`Successfully fetched ${companiesResult.companies.length} companies from API key: ${apiKey.api_key_name}`)
      } else {
        console.error(`Failed to fetch companies from API key: ${apiKey.api_key_name}`, companiesResult.error)
      }
    }

    console.log(`Total companies fetched from all API keys: ${allCompanies.length}`)
    return { success: true, companies: allCompanies, totalCount, totalPages }
  } catch (error) {
    console.error('Error fetching all companies for user:', error)
    return { success: false, error: 'Failed to fetch companies' }
  }
} 

/**
 * Add companies from app builder to the email contacts system
 */
export async function addCompaniesToMembers(
  whopUserId: string,
  companies: Array<{
    id: string
    email: string
    name: string
    username: string
    status: string
    source: string
    source_api_key: string
    company_title: string
    has_payment_method: boolean
    audience_id?: string
  }>
): Promise<{
  success: boolean
  addedCount?: number
  error?: string
}> {
  try {
    const supabase = createClient()

    // First, get or create a default audience for app builder companies
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)
      .single()

    if (configError || !configData) {
      return { success: false, error: 'No active email configuration found. Please set up your email platform first.' }
    }

    // Get or create an audience for app builder companies
    let audienceId: string
    
    // Check if a specific audience was requested
    if (companies[0]?.audience_id && companies[0].audience_id !== "default") {
      // Use the specified audience
      const { data: specifiedAudience, error: specifiedError } = await supabase
        .from('email_audiences')
        .select('id')
        .eq('id', companies[0].audience_id)
        .single()

      if (specifiedError || !specifiedAudience) {
        return { success: false, error: 'Specified audience not found' }
      }
      audienceId = specifiedAudience.id
    } else {
      // Use default "App Builder Companies" audience
      const { data: existingAudience, error: audienceError } = await supabase
        .from('email_audiences')
        .select('id')
        .eq('config_id', configData.id)
        .eq('name', 'App Builder Companies')
        .single()

      if (audienceError || !existingAudience) {
        // Create new audience with temporary ID first
        const { data: newAudience, error: createError } = await supabase
          .from('email_audiences')
          .insert({
            config_id: configData.id,
            audience_id: `temp_${Date.now()}`,
            name: 'App Builder Companies',
            description: 'Companies discovered through App Builder API',
            member_count: 0,
            whop_user_id: whopUserId,
            is_active: true
          })
          .select('id')
          .single()

        if (createError || !newAudience) {
          return { success: false, error: 'Failed to create audience for app builder companies' }
        }
        audienceId = newAudience.id
        
        // Immediately sync the audience to Resend to get a proper UUID
        const { syncAudienceToResend } = await import('@/app/actions/emailsync')
        const syncResult = await syncAudienceToResend(audienceId)
        
        if (!syncResult.success) {
          console.error('Failed to sync audience to Resend:', syncResult.error)
          // Continue anyway - the audience exists in database
        } else {
          console.log('Successfully synced audience to Resend:', syncResult.resendAudienceId)
        }
      } else {
        audienceId = existingAudience.id
        
        // Check if this audience needs to be synced to Resend
        const { data: audienceData } = await supabase
          .from('email_audiences')
          .select('audience_id')
          .eq('id', audienceId)
          .single()
        
        if (audienceData?.audience_id?.startsWith('temp_')) {
          // Sync to Resend to get proper UUID
          const { syncAudienceToResend } = await import('@/app/actions/emailsync')
          const syncResult = await syncAudienceToResend(audienceId)
          
          if (!syncResult.success) {
            console.error('Failed to sync existing audience to Resend:', syncResult.error)
          } else {
            console.log('Successfully synced existing audience to Resend:', syncResult.resendAudienceId)
          }
        }
      }
    }

    // Convert companies to email contacts format and remove duplicates
    const contactsToAdd = companies.map(company => ({
      audience_id: audienceId,
      email: company.email,
      whop_member_id: company.id,
      first_name: company.name?.split(' ')[0] || null,
      last_name: company.name?.split(' ').slice(1).join(' ') || null,
      full_name: company.name,
      is_subscribed: true,
      is_unsubscribed: false,
      custom_fields: {
        source: company.source,
        source_api_key: company.source_api_key,
        company_title: company.company_title,
        has_payment_method: company.has_payment_method,
        username: company.username,
        added_from_app_builder: true,
        added_at: new Date().toISOString()
      },
      sync_status: 'synced'
    }))

    // Remove duplicates based on email
    const uniqueContacts = contactsToAdd.filter((contact, index, self) => 
      index === self.findIndex(c => c.email === contact.email)
    )

    console.log(`Original companies: ${companies.length}, Unique contacts: ${uniqueContacts.length}`)

    // Check for existing contacts to avoid conflicts
    const emails = uniqueContacts.map(contact => contact.email)
    const { data: existingContacts, error: checkError } = await supabase
      .from('email_contacts')
      .select('email')
      .eq('audience_id', audienceId)
      .in('email', emails)

    if (checkError) {
      console.error('Error checking existing contacts:', checkError)
    } else {
      const existingEmails = existingContacts?.map(c => c.email) || []
      const newEmails = emails.filter(email => !existingEmails.includes(email))
      console.log(`Existing emails: ${existingEmails.length}, New emails: ${newEmails.length}`)
    }

    // Insert into email_contacts table
    const { data, error } = await supabase
      .from('email_contacts')
      .upsert(uniqueContacts, { 
        onConflict: 'email,audience_id',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error('Error adding companies to email contacts:', error)
      return { success: false, error: error.message }
    }

    // Update audience member count with actual added count
    const addedCount = data?.length || 0
    const { error: updateError } = await supabase
      .from('email_audiences')
      .update({ 
        member_count: addedCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', audienceId)

    if (updateError) {
      console.error('Error updating audience count:', updateError)
    }

    // Sync the audience to Resend to ensure contacts are properly synced
    const { syncAudienceToResend } = await import('@/app/actions/emailsync')
    const syncResult = await syncAudienceToResend(audienceId)
    
    if (!syncResult.success) {
      console.error('Failed to sync audience to Resend after adding contacts:', syncResult.error)
      // Return success anyway since contacts were added to database
    } else {
      console.log(`Successfully synced ${syncResult.syncedCount} contacts to Resend`)
    }

    console.log(`Successfully added ${data?.length || 0} unique companies to email contacts`)
    return { success: true, addedCount: data?.length || 0 }
  } catch (error) {
    console.error('Error in addCompaniesToMembers:', error)
    return { success: false, error: 'Failed to add companies to email contacts' }
  }
} 