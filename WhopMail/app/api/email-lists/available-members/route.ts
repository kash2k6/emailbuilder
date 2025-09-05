import { NextRequest, NextResponse } from 'next/server'
import { fetchWhopMembers } from '@/app/actions'
import { getProfile } from '@/app/actions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')
    
    if (!whopUserId) {
      return NextResponse.json(
        { success: false, error: 'whopUserId is required' },
        { status: 400 }
      )
    }
    
    // Get the user's profile to retrieve their personal Whop API key
    const profile = await getProfile(whopUserId)
    if (!profile || !profile.whop_api_key) {
      return NextResponse.json(
        { success: false, error: 'User API key not found. Please set up your Whop API key first.' },
        { status: 400 }
      )
    }
    
    const whopApiKey = profile.whop_api_key
    
    // Fetch first page of members using paginated approach
    const { fetchWhopMembers } = await import('@/app/actions')
    const result = await fetchWhopMembers(whopApiKey, 1, 100)
    
    if (result.success && result.members) {
      // Transform to the expected format for the frontend
      const formattedMembers = result.members.map(member => ({
        id: member.id,
        email: member.email,
        full_name: member.name || member.username,
        first_name: member.name ? member.name.split(' ')[0] : member.username,
        last_name: member.name && member.name.includes(' ') ? member.name.split(' ').slice(1).join(' ') : undefined
      }))
      
      return NextResponse.json({
        success: true,
        members: formattedMembers,
        note: "Showing first 100 members. For more members, use the members page with pagination."
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch members' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error getting available members:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 