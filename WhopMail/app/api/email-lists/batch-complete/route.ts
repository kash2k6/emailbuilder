import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface BatchCompleteRequest {
  jobId: string
  whopUserId: string
  audienceId: string
  members: Array<{
    email: string
    whop_member_id: string
    name: string
    username?: string
    product?: string
    status?: string
    created_at?: string
    expires_at?: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { jobId, whopUserId, audienceId, members }: BatchCompleteRequest = await request.json()

    if (!jobId || !whopUserId || !audienceId || !members) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = createClient()

    // Verify the job exists and belongs to the user
    const { data: job, error: jobError } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('whop_user_id', whopUserId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Process members in batches to avoid overwhelming the database
    const batchSize = 100
    let totalProcessed = 0

    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize)
      
      // Create contact data and deduplicate by email
      const contactDataMap = new Map()
      
      batch.forEach(member => {
        if (member.email && member.email.includes('@')) {
          const email = member.email.toLowerCase()
          // Use email as key to deduplicate - keep the first occurrence
          if (!contactDataMap.has(email)) {
            contactDataMap.set(email, {
              audience_id: audienceId,
              email: email,
              whop_member_id: member.whop_member_id,
              first_name: member.name?.split(' ')[0] || '',
              last_name: member.name?.split(' ').slice(1).join(' ') || '',
              is_subscribed: true,
              platform_contact_data: {
                username: member.username || '',
                product: member.product || '',
                status: member.status || '',
                created_at: member.created_at,
                expires_at: member.expires_at || ''
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        }
      })
      
      const contactData = Array.from(contactDataMap.values())

      if (contactData.length > 0) {
        const { data: insertData, error: insertError } = await supabase
          .from('email_contacts')
          .upsert(contactData, { 
            onConflict: 'audience_id,email',
            ignoreDuplicates: false 
          })
          .select('id')

        if (insertError) {
          console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError)
        } else {
          const insertedCount = insertData ? insertData.length : 0
          totalProcessed += insertedCount
        }
      }
    }

    // Update job status and counts
    await supabase
      .from('batch_jobs')
      .update({
        status: 'completed',
        processed_count: totalProcessed,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Update audience member count
    await supabase
      .from('email_audiences')
      .update({
        member_count: totalProcessed,
        updated_at: new Date().toISOString()
      })
      .eq('id', audienceId)

    // Trigger Resend sync after batch processing is complete
    console.log(`🔄 Triggering Resend sync for job ${jobId} and audience ${audienceId}`)
    try {
      const resendSyncResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resend-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId: jobId,
          audienceId: audienceId
        })
      })

      if (resendSyncResponse.ok) {
        console.log('✅ Resend sync triggered successfully')
      } else {
        console.error('❌ Failed to trigger Resend sync:', await resendSyncResponse.text())
      }
    } catch (error) {
      console.error('❌ Error triggering Resend sync:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Batch processing completed and Resend sync triggered',
      totalProcessed
    })

  } catch (error) {
    console.error('Error in batch complete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
