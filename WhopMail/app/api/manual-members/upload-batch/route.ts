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

interface BatchUploadRequest {
  whopUserId: string
  members: ManualMember[]
  listName: string
  listDescription: string
  batchNumber: number
  totalBatches: number
  audienceId?: string // For subsequent batches
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchUploadRequest = await request.json()
    const { whopUserId, members, listName, listDescription, batchNumber, totalBatches, audienceId } = body

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

    // Validate emails and filter out invalid ones
    const invalidEmails: string[] = []
    const validEmails = members.filter(member => {
      // More permissive email validation
      const email = member.email?.trim().toLowerCase()
      if (!email) {
        invalidEmails.push('empty or null email')
        return false
      }
      
      // Basic email validation - check for @ and domain
      if (!email.includes('@') || !email.includes('.') || email.length < 5) {
        invalidEmails.push(email)
        return false
      }
      
      // Check for common invalid patterns
      if (email.startsWith('@') || email.endsWith('@') || email.includes('@@')) {
        invalidEmails.push(email)
        return false
      }
      
      return true
    })

    // Log invalid emails but continue with valid ones
    if (invalidEmails.length > 0) {
      console.log(`Batch ${batchNumber}: Skipped ${invalidEmails.length} invalid emails: ${invalidEmails.slice(0, 10).join(', ')}${invalidEmails.length > 10 ? ` and ${invalidEmails.length - 10} more` : ''}`)
    }

    if (validEmails.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No valid emails found in batch ${batchNumber}`
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
    
    const emailsToUpsert = Array.from(emailMap.values())
    
    if (emailsToUpsert.length !== validEmails.length) {
      const duplicateCount = validEmails.length - emailsToUpsert.length
      console.log(`Batch ${batchNumber}: Removed ${duplicateCount} duplicate emails within batch`)
    }

    // Upsert manual members (insert or update on conflict)
    const manualMembersData = emailsToUpsert.map(member => ({
      id: member.id,
      whop_user_id: whopUserId,
      email: member.email.toLowerCase(),
      first_name: member.firstName || null,
      last_name: member.lastName || null,
      status: member.status || 'manual',
      source: member.source || 'manual_upload',
      uploaded_at: member.uploaded_at || new Date().toISOString(),
      metadata: member.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    console.log(`Batch ${batchNumber}: Attempting to upsert ${manualMembersData.length} members`)
    console.log(`Sample member data:`, JSON.stringify(manualMembersData[0], null, 2))

    const { error: upsertError } = await supabase
      .from('manual_members')
      .upsert(manualMembersData, { 
        onConflict: 'whop_user_id,email',
        ignoreDuplicates: false 
      })

    if (upsertError) {
      console.error('Error upserting manual members:', upsertError)
      console.error('Data being upserted:', JSON.stringify(manualMembersData.slice(0, 2), null, 2)) // Log first 2 items for debugging
      return NextResponse.json({ 
        success: false, 
        error: `Failed to save members: ${upsertError.message || upsertError.details || 'Unknown error'}` 
      }, { status: 500 })
    }

    let currentAudienceId = audienceId

    // Create email audience only for the first batch
    if (batchNumber === 1) {
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
          member_count: 0, // Will be updated after all batches
          platform_audience_data: {
            source: 'manual_upload',
            created_at: new Date().toISOString(),
            total_batches: totalBatches
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

      currentAudienceId = audienceData.id
    }

    // Add members to the email audience as contacts (deduplicate to avoid constraint errors)
    const contactMap = new Map()
    emailsToUpsert.forEach(member => {
      const emailKey = member.email.toLowerCase()
      if (!contactMap.has(emailKey)) {
        contactMap.set(emailKey, {
          audience_id: currentAudienceId,
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
            batch_number: batchNumber,
            metadata: member.metadata || {}
          },
          custom_fields: member.metadata || {},
          member_type: 'manual',
          sync_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    })
    
    const contactData = Array.from(contactMap.values())
    
    if (contactData.length !== emailsToUpsert.length) {
      const duplicateCount = emailsToUpsert.length - contactData.length
      console.log(`Batch ${batchNumber}: Removed ${duplicateCount} duplicate contacts`)
    }

    const { error: contactError } = await supabase
      .from('email_contacts')
      .upsert(contactData, { 
        onConflict: 'audience_id,email',
        ignoreDuplicates: false 
      })

    if (contactError) {
      console.error('Error adding contacts to audience:', contactError)
      return NextResponse.json({ success: false, error: 'Failed to add members to audience' }, { status: 500 })
    }

    // Update audience member count if this is the last batch
    if (batchNumber === totalBatches && currentAudienceId) {
      const { data: totalMembers, error: countError } = await supabase
        .from('email_contacts')
        .select('id', { count: 'exact' })
        .eq('audience_id', currentAudienceId)

      if (!countError && totalMembers !== null) {
        await supabase
          .from('email_audiences')
          .update({ 
            member_count: totalMembers.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentAudienceId)
      }

      // Automatically sync the audience to Resend after the last batch
      console.log('🔄 Automatically syncing batch upload audience to Resend...')
      const { syncAudienceToResend } = await import('@/app/actions/emailsync')
      const syncResult = await syncAudienceToResend(currentAudienceId)
      
      if (!syncResult.success) {
        console.error('Failed to sync batch audience to Resend:', syncResult.error)
        console.warn('Batch upload completed but failed to sync to Resend. User can manually sync later.')
      } else {
        console.log(`✅ Successfully synced ${syncResult.syncedCount} contacts to Resend`)
      }

      return NextResponse.json({
        success: true,
        message: `Successfully uploaded all ${totalBatches} batches with ${emailsToUpsert.length} members${syncResult.success ? ' and synced to Resend' : ' (Resend sync failed - sync manually)'}`,
        data: {
          uploadedCount: emailsToUpsert.length,
          batchNumber,
          totalBatches,
          audienceId: currentAudienceId,
          isComplete: true,
          resendSynced: syncResult.success,
          resendAudienceId: syncResult.resendAudienceId,
          resendSyncedCount: syncResult.syncedCount
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded batch ${batchNumber}/${totalBatches} with ${emailsToUpsert.length} members`,
      data: {
        uploadedCount: emailsToUpsert.length,
        batchNumber,
        totalBatches,
        audienceId: currentAudienceId,
        isComplete: false
      }
    })

  } catch (error) {
    console.error('Error in manual members batch upload:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
