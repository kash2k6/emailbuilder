import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      action, // 'sync_members', 'send_welcome', 'send_reengagement', 'send_renewal'
      apiKey, // Whop API key for fetching members
      targetUserId, // Optional: specific user ID, if not provided, process all users
      audienceType,
      customSubject,
      customContent
    } = body

    if (!action || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'action and apiKey are required' },
        { status: 400 }
      )
    }

    console.log(`🤖 Starting automation: ${action}`)

    // Get all active users from the database
    let usersToProcess: any[] = []
    
    if (targetUserId) {
      // Process specific user
      const { data: user, error } = await supabase
        .from('email_platform_configs')
        .select('whop_user_id')
        .eq('whop_user_id', targetUserId)
        .eq('is_active', true)
        .single()
      
      if (user) {
        usersToProcess = [user]
      }
    } else {
      // Process all active users
      const { data: users, error } = await supabase
        .from('email_platform_configs')
        .select('whop_user_id')
        .eq('is_active', true)
      
      if (users) {
        usersToProcess = users
      }
    }

    if (usersToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active users found to process',
        processedCount: 0
      })
    }

    console.log(`📊 Processing ${usersToProcess.length} users for action: ${action}`)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      details: [] as any[]
    }

    // Process each user
    for (const user of usersToProcess) {
      try {
        console.log(`🔄 Processing user: ${user.whop_user_id}`)
        
        let result
        switch (action) {
          case 'sync_members':
            result = await handleMemberSync(user.whop_user_id, apiKey)
            break
          
          case 'send_welcome':
            result = await handleEmailCampaign(user.whop_user_id, apiKey, 'active', 'welcome', customSubject, customContent)
            break
          
          case 'send_reengagement':
            result = await handleEmailCampaign(user.whop_user_id, apiKey, 'canceled', 'reengagement', customSubject, customContent)
            break
          
          case 'send_renewal':
            result = await handleEmailCampaign(user.whop_user_id, apiKey, 'expired', 'renewal', customSubject, customContent)
            break
          
          case 'send_trial_ending':
            result = await handleEmailCampaign(user.whop_user_id, apiKey, 'trial', 'trial_ending', customSubject, customContent)
            break
          
          default:
            result = { success: false, error: 'Invalid action' }
        }

        if (result.success) {
          results.success++
          results.details.push({
            userId: user.whop_user_id,
            success: true,
            ...result
          })
        } else {
          results.failed++
          results.errors.push(`${user.whop_user_id}: ${result.error}`)
          results.details.push({
            userId: user.whop_user_id,
            success: false,
            error: result.error
          })
        }

        // Add delay between users to respect rate limits
        if (usersToProcess.indexOf(user) < usersToProcess.length - 1) {
          console.log('⏳ Waiting 5 seconds between users...')
          await new Promise(resolve => setTimeout(resolve, 5000))
        }

      } catch (error) {
        results.failed++
        const errorMsg = `Error processing user ${user.whop_user_id}: ${error}`
        results.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    console.log(`✅ Automation completed: ${results.success} successful, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: 'Automation completed',
      action,
      processedCount: usersToProcess.length,
      successCount: results.success,
      failedCount: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
      details: results.details,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in automation webhook:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle member synchronization
async function handleMemberSync(whopUserId: string, apiKey: string) {
  try {
    // Fetch fresh members from Whop
    const { fetchAllWhopMembers } = await import('@/app/actions')
    const membersResult = await fetchAllWhopMembers(apiKey)
    
    if (!membersResult.success || !membersResult.members) {
      console.error('Failed to fetch Whop members:', membersResult.error)
      return { success: false, error: 'Failed to fetch Whop members' }
    }

    const members = membersResult.members
    console.log(`📊 Found ${members.length} total members from Whop for user ${whopUserId}`)

    // Get user's email configuration
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .single()

    if (configError || !configData) {
      console.error('Failed to get email config:', configError)
      return { success: false, error: 'Email configuration not found' }
    }

    // Get or create status-based audiences
    const audiences = await getOrCreateStatusAudiences(configData.id, whopUserId)
    
    // Categorize and sync members
    const syncResults = await categorizeAndSyncMembers(members, audiences, configData.id)

    console.log(`✅ Member sync completed for user ${whopUserId}:`, syncResults)

    return {
      success: true,
      message: 'Member sync completed successfully',
      results: syncResults
    }

  } catch (error) {
    console.error('Error in member sync:', error)
    return { success: false, error: 'Member sync failed' }
  }
}

// Handle email campaigns
async function handleEmailCampaign(
  whopUserId: string, 
  apiKey: string, 
  audienceType: string, 
  template: string, 
  customSubject?: string, 
  customContent?: string
) {
  try {
    // Get user's email configuration
    const { data: configData, error: configError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .single()

    if (configError || !configData) {
      console.error('Failed to get email config:', configError)
      return { success: false, error: 'Email configuration not found' }
    }

    // Get the target audience - use existing "Active" audience for testing
    const { data: audience, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('config_id', configData.id)
      .eq('name', 'Active')
      .single()

    if (audienceError || !audience) {
      console.error('Failed to get audience:', audienceError)
      return { success: false, error: 'Target audience not found' }
    }

    // Get members from the audience - FOR TESTING: only send to kashiefhenry@gmail.com
    const { data: allContacts, error: contactsError } = await supabase
      .from('email_contacts')
      .select('*')
      .eq('audience_id', audience.id)
      .eq('is_subscribed', true)

    if (contactsError) {
      console.error('Failed to get contacts:', contactsError)
      return { success: false, error: 'Failed to get audience contacts' }
    }

    // Filter to only send to kashiefhenry@gmail.com for testing
    let contacts = allContacts?.filter(contact => contact.email === 'kashiefhenry@gmail.com') || []

    // If no contacts found, create a test contact for kashiefhenry@gmail.com
    if (!contacts || contacts.length === 0) {
      console.log('No contacts found for kashiefhenry@gmail.com, creating test contact...')
      
      const { error: insertError } = await supabase
        .from('email_contacts')
        .upsert({
          audience_id: audience.id,
          email: 'kashiefhenry@gmail.com',
          first_name: 'Kashief',
          last_name: 'Henry',
          full_name: 'Kashief Henry',
          is_subscribed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (!insertError) {
        contacts = [{
          id: 'test-contact',
          audience_id: audience.id,
          email: 'kashiefhenry@gmail.com',
          first_name: 'Kashief',
          last_name: 'Henry',
          full_name: 'Kashief Henry',
          is_subscribed: true
        }]
        console.log('✅ Test contact created for kashiefhenry@gmail.com')
      }
    }

    if (!contacts || contacts.length === 0) {
      return {
        success: true,
        message: 'No contacts to email',
        sentCount: 0
      }
    }

    // Generate email content based on template
    const emailContent = generateEmailContent(template, audienceType, customSubject, customContent)

    // Create a new Resend audience for this automation campaign
    console.log('🎯 Creating new Resend audience for automation campaign...')
    const { createResendAudience } = await import('@/app/actions/resend')
    const audienceResult = await createResendAudience(`Automation - ${template} - ${new Date().toISOString().split('T')[0]}`)
    
    if (!audienceResult.success) {
      console.error('Failed to create Resend audience:', audienceResult.error)
      return { success: false, error: `Failed to create audience: ${audienceResult.error}` }
    }
    
    const resendAudienceId = audienceResult.audienceId!
    console.log(`✅ Created Resend audience: ${resendAudienceId}`)

    // Add delay before adding contacts
    console.log('⏳ Waiting 10 seconds before adding contacts...')
    await new Promise(resolve => setTimeout(resolve, 10000))

    // Add contacts to the new audience
    console.log(`📧 Adding ${contacts.length} contacts to Resend audience...`)
    const { createResendContactsBatch } = await import('@/app/actions/resend')
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      return { success: false, error: 'Resend API key not configured' }
    }

    const resendContacts = contacts.map(contact => ({
      email: contact.email,
      firstName: contact.first_name || '',
      lastName: contact.last_name || ''
    }))

    const contactResult = await createResendContactsBatch(resendApiKey, resendContacts, resendAudienceId)
    
    if (!contactResult.success) {
      console.warn(`Contact creation had errors: ${contactResult.errors.length} failures`)
    }
    
    console.log(`📧 Added ${contactResult.createdCount} contacts to Resend audience`)

    // Add delay before creating broadcast
    console.log('⏳ Waiting 10 seconds before creating broadcast...')
    await new Promise(resolve => setTimeout(resolve, 10000))

    // Create broadcast using the Resend API
    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)
    
    const broadcastResult = await resend.broadcasts.create({
      audienceId: resendAudienceId,
      from: configData.from_email || 'noreply@whopmail.com',
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      name: `Webhook Automation: ${whopUserId} (${configData.from_email || 'noreply@whopmail.com'}) - ${emailContent.subject}`
    })

    if (broadcastResult.error) {
      console.error('Failed to create broadcast:', broadcastResult.error)
      return { success: false, error: `Failed to create broadcast: ${broadcastResult.error.message}` }
    }

    const broadcastId = broadcastResult.data?.id
    if (!broadcastId) {
      return { success: false, error: 'Failed to get broadcast ID' }
    }

    console.log(`✅ Created broadcast: ${broadcastId}`)

    // Add delay before sending broadcast
    console.log('⏳ Waiting 10 seconds before sending broadcast...')
    await new Promise(resolve => setTimeout(resolve, 10000))

    // Send the broadcast
    const sendResult = await resend.broadcasts.send(broadcastId)

    if (sendResult.error) {
      console.error('Failed to send broadcast:', sendResult.error)
      return { success: false, error: `Failed to send broadcast: ${sendResult.error.message}` }
    }

    console.log(`✅ Broadcast sent successfully to ${contactResult.createdCount} recipients`)

    return {
      success: true,
      message: 'Email campaign sent successfully',
      sentCount: contactResult.createdCount,
      audienceType,
      template,
      recipients: contacts.map(c => c.email),
      resendAudienceId,
      broadcastId
    }

  } catch (error) {
    console.error('Error in email campaign:', error)
    return { success: false, error: 'Email campaign failed' }
  }
}

// Get or create status-based audiences
async function getOrCreateStatusAudiences(configId: string, whopUserId: string) {
  const statusAudiences = {
    active: { name: 'Active Members', description: 'Automatically synced active members' },
    canceled: { name: 'Canceled Members', description: 'Automatically synced canceled members' },
    expired: { name: 'Expired Members', description: 'Automatically synced expired members' },
    trial: { name: 'Trial Members', description: 'Automatically synced trial members' },
    past_due: { name: 'Past Due Members', description: 'Automatically synced past due members' }
  }

  const audiences: any = {}

  for (const [status, details] of Object.entries(statusAudiences)) {
    // Check if audience exists
    let { data: existingAudience } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('config_id', configId)
      .eq('name', details.name)
      .single()

    if (!existingAudience) {
      // Create new audience
      const { data: newAudience, error } = await supabase
        .from('email_audiences')
        .insert({
          config_id: configId,
          audience_id: `auto-${status}-${Date.now()}`,
          name: details.name,
          description: details.description,
          member_count: 0,
          unsubscribed_count: 0,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to create ${status} audience:`, error)
        continue
      }

      existingAudience = newAudience
      console.log(`✅ Created new audience: ${details.name}`)
    }

    audiences[status] = existingAudience
  }

  return audiences
}

// Categorize and sync members to appropriate audiences
async function categorizeAndSyncMembers(members: any[], audiences: any, configId: string) {
  const results = {
    active: { count: 0, members: [] },
    canceled: { count: 0, members: [] },
    expired: { count: 0, members: [] },
    trial: { count: 0, members: [] },
    past_due: { count: 0, members: [] }
  }

  for (const member of members) {
    if (!member.email) continue

    let targetStatus = 'expired' // default

    // Determine member status
    if (member.status === 'active' && member.valid) {
      targetStatus = 'active'
    } else if (member.status === 'canceled' || member.status === 'cancelled') {
      targetStatus = 'canceled'
    } else if (member.status === 'trial') {
      targetStatus = 'trial'
    } else if (member.status === 'past_due') {
      targetStatus = 'past_due'
    }

    const targetAudience = audiences[targetStatus]
    if (!targetAudience) continue

    // Add member to database
    const { error: dbError } = await supabase
      .from('email_contacts')
      .upsert({
        audience_id: targetAudience.id,
        email: member.email,
        first_name: member.name?.split(' ')[0] || '',
        last_name: member.name?.split(' ').slice(1).join(' ') || '',
        full_name: member.name || member.username || member.email,
        is_subscribed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (!dbError) {
      results[targetStatus as keyof typeof results].count++
      results[targetStatus as keyof typeof results].members.push(member.email)
    }
  }

  // Update audience member counts
  for (const [status, result] of Object.entries(results)) {
    const audience = audiences[status]
    if (audience && result.count > 0) {
      await supabase
        .from('email_audiences')
        .update({
          member_count: (audience.member_count || 0) + result.count,
          updated_at: new Date().toISOString()
        })
        .eq('id', audience.id)
    }
  }

  return results
}

function generateEmailContent(template: string, audienceType: string, customSubject?: string, customContent?: string) {
  const templates = {
    welcome: {
      subject: 'Welcome to our community! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome to our community! 🎉</h1>
          <p>Hi {{{FIRST_NAME|there}}}!</p>
          <p>We're excited to have you on board. You now have access to all our premium features and exclusive content.</p>
          <p>Here's what you can expect:</p>
          <ul>
            <li>Exclusive content and resources</li>
            <li>Priority support</li>
            <li>Early access to new features</li>
          </ul>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `,
      text: `Welcome to our community! 🎉\n\nHi there!\n\nWe're excited to have you on board. You now have access to all our premium features and exclusive content.\n\nIf you have any questions, feel free to reach out to our support team.\n\nBest regards,\nThe Team`
    },
    reengagement: {
      subject: 'We miss you! Come back and save 50% 💝',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>We miss you! 💝</h1>
          <p>Hi {{{FIRST_NAME|there}}}!</p>
          <p>We noticed you haven't been around lately, and we wanted to check in.</p>
          <p>As a special offer, we're giving you <strong>50% off</strong> your next month if you reactivate your subscription today!</p>
          <p>Use code: <strong>COMEBACK50</strong></p>
          <p>We'd love to have you back in our community!</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `,
      text: `We miss you! 💝\n\nHi there!\n\nWe noticed you haven't been around lately, and we wanted to check in.\n\nAs a special offer, we're giving you 50% off your next month if you reactivate your subscription today!\n\nUse code: COMEBACK50\n\nWe'd love to have you back in our community!\n\nBest regards,\nThe Team`
    },
    renewal: {
      subject: 'Your subscription is expiring soon ⏰',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Your subscription is expiring soon ⏰</h1>
          <p>Hi {{{FIRST_NAME|there}}}!</p>
          <p>This is a friendly reminder that your subscription will expire soon.</p>
          <p>Don't lose access to all the great features and content you've been enjoying!</p>
          <p>Renew now to continue your membership without interruption.</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `,
      text: `Your subscription is expiring soon ⏰\n\nHi there!\n\nThis is a friendly reminder that your subscription will expire soon.\n\nDon't lose access to all the great features and content you've been enjoying!\n\nRenew now to continue your membership without interruption.\n\nBest regards,\nThe Team`
    },
    trial_ending: {
      subject: 'Your trial is ending soon - Upgrade now! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Your trial is ending soon! 🚀</h1>
          <p>Hi {{{FIRST_NAME|there}}}!</p>
          <p>Your free trial is coming to an end, but the journey doesn't have to stop here!</p>
          <p>Upgrade now to continue enjoying all our premium features and exclusive content.</p>
          <p>As a trial user, you get a special discount on your first month!</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `,
      text: `Your trial is ending soon! 🚀\n\nHi there!\n\nYour free trial is coming to an end, but the journey doesn't have to stop here!\n\nUpgrade now to continue enjoying all our premium features and exclusive content.\n\nAs a trial user, you get a special discount on your first month!\n\nBest regards,\nThe Team`
    }
  }

  // Use custom content if provided, otherwise use template
  if (customSubject && customContent) {
    return {
      subject: customSubject,
      html: customContent,
      text: customContent.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
    }
  }

  const selectedTemplate = templates[template as keyof typeof templates] || templates.welcome
  return selectedTemplate
}
