'use server'

import { headers } from 'next/headers'
import { whopSdk } from '@/lib/whop-sdk'

export interface WhopUser {
  id: string
  email: string
  username?: string
  name?: string
  profile_pic_url?: string | null
  created_at: number
  updated_at: number
}

/**
 * Server action to get the current user using the proper Whop SDK
 */
export async function getCurrentUser(): Promise<WhopUser | null> {
  try {
    console.log('🔐 AUTH: === GET CURRENT USER SERVER ACTION ===')
    
    const headersList = await headers()
    
    // Debug: Log all available headers
    console.log('🔐 AUTH: All headers:', Object.fromEntries(headersList.entries()))
    
    // Use the proper Whop SDK method to verify user token and extract user ID
    try {
      console.log('🔐 AUTH: Calling whopSdk.verifyUserToken...')
      const { userId } = await whopSdk.verifyUserToken(headersList)
      console.log('🔐 AUTH: ✅ Successfully extracted user ID from Whop headers:', userId)
      
      // Now fetch user details using the proper Whop SDK method
      console.log('🔐 AUTH: Calling whopSdk.users.getUser...')
      const user = await whopSdk.users.getUser({ userId })
      console.log('🔐 AUTH: ✅ Successfully fetched user from Whop SDK:', user)
      
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        profile_pic_url: user.profile_pic_url,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
      
    } catch (error) {
      console.log('🔐 AUTH: ❌ whopSdk.verifyUserToken failed:', error)
      console.log('🔐 AUTH: This is normal in local development without proper Whop headers')
      return null
    }
    
  } catch (error) {
    console.error('🔐 AUTH: ❌ Error in getCurrentUser server action:', error)
    return null
  }
}
