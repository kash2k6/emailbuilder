import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkSubscriptionStatus } from '@/app/actions'

interface ManualMember {
  id: string
  email: string
  firstName?: string
  lastName?: string
  status: 'manual'
  source: string
  uploaded_at: string
  metadata?: Record<string, any>
}

interface UploadRequest {
  whopUserId: string
  members: ManualMember[]
  listName: string
  listDescription: string
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequest = await request.json()
    const { whopUserId, members, listName, listDescription } = body

    if (!whopUserId) {
      return NextResponse.json({ success: false, error: 'Whop user ID is required' }, { status: 400 })
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ success: false, error: 'No members provided' }, { status: 400 })
    }

               // Check subscription status
           const subscriptionCheck = await checkSubscriptionStatus(whopUserId)
    if (!subscriptionCheck.hasActiveSubscription) {
      return NextResponse.json({ success: false, error: 'Active subscription required' }, { status: 403 })
    }

    const supabase = createClient()

    // Check plan limits
    const contactLimit = subscriptionCheck.subscription?.contactLimit || 3000
    
    // Get current member count (Whop + Manual)
    const { count: whopCount } = await supabase
      .from('email_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('whop_user_id', whopUserId)
      .eq('member_type', 'whop')
    
    const { count: manualCount } = await supabase
      .from('manual_members')
      .select('*', { count: 'exact', head: true })
      .eq('whop_user_id', whopUserId)
    
    const currentTotal = (whopCount || 0) + (manualCount || 0)

    // Validate emails and check for duplicates
    const validEmails = members.filter(member => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(member.email)
    })

    if (validEmails.length !== members.length) {
      return NextResponse.json({ 
        success: false, 
        error: `${members.length - validEmails.length} invalid emails found` 
      }, { status: 400 })
    }

    // Deduplicate emails within this batch to avoid "affect row a second time" error
    const emailMap = new Map()
    validEmails.forEach(member => {
      const emailKey = member.email.toLowerCase()
      if (!emailMap.has(emailKey)) {
        emailMap.set(emailKey, member)
      } else {
        // If duplicate found, keep the one with more complete data
        const existing = emailMap.get(emailKey)
        const existingCompleteness = (existing.firstName ? 1 : 0) + (existing.lastName ? 1 : 0)
        const newCompleteness = (member.firstName ? 1 : 0) + (member.lastName ? 1 : 0)
        
        if (newCompleteness > existingCompleteness) {
          emailMap.set(emailKey, member)
        }
      }
    })
    
    const deduplicatedEmails = Array.from(emailMap.values())
    
    if (deduplicatedEmails.length !== validEmails.length) {
      const duplicateCount = validEmails.length - deduplicatedEmails.length
      console.log(`Removed ${duplicateCount} duplicate emails within batch`)
    }

    // Check for existing manual members with same emails and filter them out
    const existingEmails = await supabase
      .from('manual_members')
      .select('email')
      .eq('whop_user_id', whopUserId)
      .in('email', deduplicatedEmails.map(m => m.email))

    const existingEmailSet = new Set(existingEmails.data?.map(e => e.email.toLowerCase()) || [])
    const newEmails = deduplicatedEmails.filter(member => !existingEmailSet.has(member.email.toLowerCase()))
    const duplicateEmails = deduplicatedEmails.filter(member => existingEmailSet.has(member.email.toLowerCase()))

    console.log(`Total valid emails: ${validEmails.length}`)
    console.log(`After deduplication: ${deduplicatedEmails.length}`)
    console.log(`Existing emails found: ${existingEmails.data?.length || 0}`)
    console.log(`New emails to add: ${newEmails.length}`)
    console.log(`Duplicate emails to skip: ${duplicateEmails.length}`)
    console.log(`Sample existing emails:`, existingEmails.data?.slice(0, 3).map(e => e.email))
    console.log(`Sample new emails:`, newEmails.slice(0, 3).map(e => e.email))

    if (newEmails.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `All ${validEmails.length} emails already exist in your list` 
      }, { status: 400 })
    }

    // Update contact limit check to only count new emails
    const newTotal = currentTotal + newEmails.length
    
    if (newTotal > contactLimit) {
      return NextResponse.json({ 
        success: false, 
        error: `Upload would exceed your plan limit. Current: ${currentTotal}, Adding: ${newEmails.length}, Limit: ${contactLimit}. Please upgrade your plan.` 
      }, { status: 403 })
    }

        // Insert only new manual members using upsert to handle any remaining duplicates
    const manualMembersData = newEmails.map(member => ({
      id: member.id,
      whop_user_id: whopUserId,
      email: member.email.toLowerCase(),
      first_name: member.firstName || null,
      last_name: member.lastName || null,
      status: member.status,
      source: member.source,
      uploaded_at: member.uploaded_at,
      metadata: member.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    console.log(`Attempting to upsert ${manualMembersData.length} members`)
    console.log(`Sample member:`, manualMembersData[0])

    const { error: insertError } = await supabase
      .from('manual_members')
      .upsert(manualMembersData, { 
        onConflict: 'whop_user_id,email',
        ignoreDuplicates: false 
      })

    if (insertError) {
      console.error('Error inserting manual members:', insertError)
      return NextResponse.json({ success: false, error: 'Failed to save members' }, { status: 500 })
    }

    // Get the user's email platform config
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .single()

    if (configError || !configData) {
      return NextResponse.json({ success: false, error: 'Email platform configuration not found' }, { status: 404 })
    }

    // Create email audience for these members
    const { data: audienceData, error: audienceError } = await supabase
      .from('email_audiences')
      .insert({
        config_id: configData.id,
        audience_id: `manual_${Date.now()}`,
        name: listName,
        description: listDescription,
        member_count: newEmails.length,
        platform_audience_data: {
          source: 'manual_upload',
          created_at: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (audienceError) {
      console.error('Error creating email audience:', audienceError)
      return NextResponse.json({ success: false, error: 'Failed to create email audience' }, { status: 500 })
    }

                   // Add members to the email audience as contacts
    const contactData = newEmails.map(member => ({
             audience_id: audienceData.id,
             email: member.email.toLowerCase(),
             whop_member_id: member.id,
             platform_contact_id: `manual_${member.id}`,
             first_name: member.firstName || null,
             last_name: member.lastName || null,
             full_name: member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : (member.firstName || member.lastName || null),
             is_subscribed: true,
             is_unsubscribed: false,
             platform_contact_data: {
               source: 'manual_upload',
               metadata: member.metadata || {}
             },
             custom_fields: member.metadata || {},
             member_type: 'manual',
             sync_status: 'pending',
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString()
           }))

    const { error: contactError } = await supabase
      .from('email_contacts')
      .insert(contactData)

    if (contactError) {
      console.error('Error adding contacts to audience:', contactError)
      return NextResponse.json({ success: false, error: 'Failed to add members to audience' }, { status: 500 })
    }

    // Automatically sync the audience to Resend
    console.log('🔄 Automatically syncing manual audience to Resend...')
    const { syncAudienceToResend } = await import('@/app/actions/emailsync')
    const syncResult = await syncAudienceToResend(audienceData.id)
    
    if (!syncResult.success) {
      console.error('Failed to sync audience to Resend:', syncResult.error)
      // Don't fail the upload, but warn the user
      console.warn('Manual members uploaded to database but failed to sync to Resend. User can manually sync later.')
    } else {
      console.log(`✅ Successfully synced ${syncResult.syncedCount} contacts to Resend`)
    }

    const totalDuplicates = (validEmails.length - deduplicatedEmails.length) + duplicateEmails.length
    const duplicateMessage = totalDuplicates > 0 ? ` (${totalDuplicates} duplicates removed)` : ''
    const syncMessage = syncResult.success ? ` and synced to Resend` : ` (Resend sync failed - sync manually)`
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${newEmails.length} members${duplicateMessage}${syncMessage}`,
      data: {
        processedCount: newEmails.length,
        skippedCount: duplicateEmails.length,
        batchDuplicates: validEmails.length - deduplicatedEmails.length,
        totalProcessed: validEmails.length,
        audienceId: audienceData.id,
        audienceName: audienceData.name,
        skippedEmails: duplicateEmails.map(e => e.email),
        resendSynced: syncResult.success,
        resendAudienceId: syncResult.resendAudienceId,
        resendSyncedCount: syncResult.syncedCount
      }
    })

  } catch (error) {
    console.error('Error in manual members upload:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
