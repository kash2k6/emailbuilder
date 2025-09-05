import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllWhopMembers } from '@/app/actions'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all admin notifications
    const { data: notifications, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Error in admin notifications API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { whopUserId, audienceName } = await request.json()

    if (!whopUserId || !audienceName) {
      return NextResponse.json({ error: 'Missing user ID or audience name' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, let's fetch the user's Whop API key to get their members
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('whop_api_key')
      .eq('whop_user_id', whopUserId)
      .single()

    if (profileError || !profile?.whop_api_key) {
      console.error('Error fetching user profile or no API key:', profileError)
      return NextResponse.json({ error: 'User not found or no API key configured' }, { status: 404 })
    }

    // Fetch all members from Whop API with user details (same as instant-create)
    console.log('🔍 Fetching all members from Whop API with user details...')
    
    const allMemberships: any[] = []
    let page = 1
    let hasMorePages = true
    const maxPages = 300 // Allow fetching up to 300,000 members for admin processing
    
    // Step 1: Fetch all memberships across all pages using v5 API
    while (hasMorePages && page <= maxPages) {
      try {
        const url = `https://api.whop.com/api/v5/company/memberships?valid=true&page=${page}&per=1000`
        console.log(`📄 Fetching memberships page ${page}: ${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${profile.whop_api_key}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ Failed to fetch memberships page ${page}: ${response.status} - ${errorText}`)
          throw new Error(`Whop API error: ${response.status} - ${errorText}`)
        }

        const result = await response.json()
        console.log(`📄 Memberships page ${page}: Fetched ${result.data?.length || 0} memberships`)
        
        if (!result.data || result.data.length === 0) {
          console.log(`📄 No more data on page ${page}, stopping pagination`)
          hasMorePages = false
        } else {
          allMemberships.push(...result.data)
          
          // Check if there are more pages
          if (result.pagination && result.pagination.current_page >= result.pagination.total_pages) {
            console.log(`📄 Reached last page (${result.pagination.current_page}/${result.pagination.total_pages}), stopping pagination`)
            hasMorePages = false
          } else {
            console.log(`📄 More pages available (${result.pagination?.current_page || page}/${result.pagination?.total_pages || 'unknown'}), continuing...`)
          }
        }
        
        page++
        
        // Add delay between API calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`❌ Error fetching memberships page ${page}:`, error)
        throw error
      }
    }
    
    console.log(`📊 Total memberships fetched: ${allMemberships.length}`)
    
    if (allMemberships.length === 0) {
      console.log('⚠️ No memberships found')
      return NextResponse.json({ error: 'No members found for this user' }, { status: 404 })
    }

    // Step 2: Extract unique user IDs
    const userIds = [...new Set(allMemberships.map((m: any) => m.user_id).filter(Boolean))]
    console.log(`📊 Found ${userIds.length} unique user IDs`)

    // Step 3: Fetch user details in batches
    const userDetails = await fetchUserDetailsBatch(profile.whop_api_key, userIds)
    console.log(`📊 Fetched details for ${Object.keys(userDetails).length} users`)

    // Step 4: Combine membership data with user details
    const allMembers = allMemberships.map((membership: any) => {
      const user = userDetails[membership.user_id] || {}
      return {
        id: membership.id,
        email: user.email || null,
        first_name: user.first_name || user.name?.split(' ')[0] || '',
        last_name: user.last_name || user.name?.split(' ').slice(1).join(' ') || '',
        username: user.username || null,
        product: membership.product || {},
        status: membership.status,
        created_at: membership.created_at,
        expires_at: membership.expires_at
      }
    }).filter(member => member.email) // Only include members with emails

    console.log(`📊 Processed ${allMembers.length} members with user details`)

    if (allMembers.length === 0) {
      return NextResponse.json({ error: 'No members found for this user' }, { status: 404 })
    }

    // Get the existing Resend audience ID from the notification
    console.log('🔍 Getting existing Resend audience ID...')
    const { data: existingNotification, error: notificationError } = await supabase
      .from('admin_notifications')
      .select('resend_audience_id')
      .eq('whop_user_id', whopUserId)
      .eq('audience_name', audienceName)
      .eq('type', 'instant_list_created')
      .single()

    const resendAudienceId = existingNotification?.resend_audience_id

    if (resendAudienceId) {
      console.log(`✅ Found existing Resend audience: ${resendAudienceId}`)
    } else {
      console.log('⚠️ No existing Resend audience found. Admin will need to create one manually.')
    }

    // Generate CSV content from Whop members
    console.log('📄 Generating CSV with member data...')
    console.log('📄 Sample member structure:', JSON.stringify(allMembers[0], null, 2))
    
    const headers = ['Email', 'First Name', 'Last Name', 'Username', 'Product', 'Status', 'Created At', 'Expires At']
    
    const rows = allMembers.map(member => {
      // The fetchAllWhopMembers function returns WhopMembership objects with user details
      const email = member.email || ''
      const firstName = member.first_name || member.firstName || ''
      const lastName = member.last_name || member.lastName || ''
      const username = member.username || ''
      const productName = member.product_name || member.product?.name || ''
      const status = member.status || ''
      const createdAt = member.created_at || ''
      const expiresAt = member.expires_at || ''
      
      return [
        email,
        firstName,
        lastName,
        username,
        productName,
        status,
        createdAt,
        expiresAt
      ].map(field => `"${field || ''}"`).join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')

    console.log(`📄 Generated CSV for user ${whopUserId}: ${allMembers.length} members`)
    console.log(`📄 CSV preview (first 3 rows):`, csvContent.split('\n').slice(0, 4).join('\n'))

    return NextResponse.json({
      success: true,
      csvContent,
      contactCount: allMembers.length,
      audienceName,
      whopUserId,
      resendAudienceId,
      resendAudienceUrl: `https://resend.com/audiences/${resendAudienceId}`
    })

  } catch (error) {
    console.error('Error generating CSV:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to fetch user details in batches
async function fetchUserDetailsBatch(whopApiKey: string, userIds: string[]): Promise<{ [userId: string]: any }> {
  const userDetails: { [userId: string]: any } = {}
  const batchSize = 20 // Process 20 users at a time for better performance
  
  console.log(`🔍 Fetching user details for ${userIds.length} users in batches of ${batchSize}`)
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(userIds.length / batchSize)
    
    console.log(`📄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)`)
    
    await Promise.all(batch.map(async (userId) => {
      try {
        const response = await fetch(`https://api.whop.com/api/v5/company/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${whopApiKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          userDetails[userId] = userData
        } else {
          console.warn(`Failed to fetch user ${userId}: ${response.status}`)
        }
      } catch (error) {
        console.warn(`Failed to fetch user ${userId}:`, error)
      }
    }))
    
    // Add delay between batches
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100)) // Reduced delay for faster processing
    }
  }
  
  console.log(`✅ Successfully fetched details for ${Object.keys(userDetails).length}/${userIds.length} users`)
  return userDetails
}
