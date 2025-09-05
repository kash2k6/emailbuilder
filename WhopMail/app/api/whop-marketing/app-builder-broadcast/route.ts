import { NextRequest, NextResponse } from 'next/server'
import { sendAppBuilderBroadcastMessage } from '@/app/actions/whop-marketing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, targetCompanies, whopUserId } = body

    console.log('App Builder broadcast request received:', {
      hasMessage: !!message,
      hasTargetCompanies: !!targetCompanies,
      hasWhopUserId: !!whopUserId,
      targetCompaniesLength: targetCompanies?.length,
      sampleCompany: targetCompanies?.[0]
    })

    if (!message || !targetCompanies || !whopUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: message, targetCompanies, or whopUserId' },
        { status: 400 }
      )
    }

    if (!Array.isArray(targetCompanies) || targetCompanies.length === 0) {
      return NextResponse.json(
        { success: false, error: 'targetCompanies must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate that each company has the required structure
    const invalidCompanies = []
    for (let i = 0; i < targetCompanies.length; i++) {
      const company = targetCompanies[i]
      console.log(`Validating company ${i}:`, {
        hasId: !!company.id,
        hasOwner: !!company.owner,
        ownerId: company.owner?.id,
        ownerName: company.owner?.name,
        ownerEmail: company.owner?.email
      })
      
      if (!company.id || !company.owner || !company.owner.id || !company.owner.name || !company.owner.email) {
        invalidCompanies.push({
          index: i,
          company: {
            id: company.id,
            ownerId: company.owner?.id,
            ownerName: company.owner?.name,
            ownerEmail: company.owner?.email
          }
        })
      }
    }

    if (invalidCompanies.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Found ${invalidCompanies.length} companies with missing required fields. Please ensure all companies have valid owner data.`,
          invalidCompanies
        },
        { status: 400 }
      )
    }

    console.log(`App Builder broadcast request: ${targetCompanies.length} companies, user: ${whopUserId}`)

    const result = await sendAppBuilderBroadcastMessage({
      message,
      targetCompanies,
      agentUserId: whopUserId
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in App Builder broadcast API route:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 