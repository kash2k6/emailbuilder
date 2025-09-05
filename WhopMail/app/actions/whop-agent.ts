'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export interface WhopAgentRequest {
  id: string
  user_id: string
  agent_name: string
  logo_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  approved_agent_id: string | null
  approved_at: string | null
  notes: string | null
}

export interface WhopAgentConfig {
  id: string
  user_id: string
  agent_user_id: string
  agent_name: string
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Create a new agent request
export async function createAgentRequest(
  agentName: string,
  logoUrl?: string
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('whop_agent_requests')
      .insert({
        user_id: user.id,
        agent_name: agentName,
        logo_url: logoUrl || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating agent request:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true, requestId: data.id }
  } catch (error) {
    console.error('Error creating agent request:', error)
    return { success: false, error: 'Failed to create agent request' }
  }
}

// Get user's agent requests
export async function getUserAgentRequests(whopUserId: string): Promise<{ success: boolean; requests?: WhopAgentRequest[]; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('🔍 Fetching agent requests for user:', whopUserId)

    const { data, error } = await supabase
      .from('whop_agent_requests')
      .select('*')
      .eq('user_id', whopUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching agent requests:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Found agent requests:', data)
    return { success: true, requests: data || [] }
  } catch (error) {
    console.error('❌ Error fetching agent requests:', error)
    return { success: false, error: 'Failed to fetch agent requests' }
  }
}

// Get user's approved agent config
export async function getUserAgentConfig(whopUserId: string): Promise<{ success: boolean; config?: WhopAgentConfig; error?: string }> {
  try {
    const supabase = createClient()
    
    console.log('🔍 Fetching agent config for user:', whopUserId)

    const { data, error } = await supabase
      .from('whop_agent_configs')
      .select('*')
      .eq('user_id', whopUserId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        console.log('ℹ️ No agent config found for user:', whopUserId)
        return { success: true, config: null }
      }
      console.error('❌ Error fetching agent config:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Found agent config:', data)
    return { success: true, config: data }
  } catch (error) {
    console.error('❌ Error fetching agent config:', error)
    return { success: false, error: 'Failed to fetch agent config' }
  }
}

// Send agent request message to admin
export async function sendAgentRequestMessage(
  agentName: string,
  logoUrl?: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Send message to admin using the working SDK configuration (same as test)
    const { WhopServerSdk } = await import('@whop/api')
    const appApiKey = process.env.WHOP_API_KEY
    const adminUserId = 'user_ojPhs9dIhFQ9C' // Your user ID
    const agentUserId = 'user_WD1R9sQ7kBE3P' // Your app's agent ID

    if (!appApiKey) {
      return { success: false, error: 'App API Key not configured' }
    }

    console.log('✅ Using App API Key with Agent User ID for agent request:', agentUserId)
    
    const whopSdk = new WhopServerSdk({
      appApiKey: appApiKey,
      onBehalfOfUserId: agentUserId
    })

    const message = `🔔 **New Agent Request**

**User ID:** ${userId || 'Unknown'}
**Agent Name:** ${agentName}
**Logo URL:** ${logoUrl || 'Not provided'}

Please allow 2-3 hours for setup. You'll need to:
1. Create the agent in Whop
2. Add the agent_user_id to the whop_agent_configs table for user: ${userId}
3. Update the request status to 'approved'`

    console.log('✅ Sending agent request message to admin:', adminUserId)
    
    await whopSdk.messages.sendDirectMessageToUser({
      toUserIdOrUsername: adminUserId,
      message: message
    })

    console.log('✅ Agent request message sent successfully!')
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending agent request message:', error)
    return { success: false, error: 'Failed to send agent request' }
  }
} 