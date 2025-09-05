import { createClient } from '@/lib/supabase-server'
import { getEmailSyncConfig } from './emailsync'
import { sendEmailAsBroadcast } from './emailsync'

// Import helper functions for generating HTML content
function generateHTMLFromElements(elements: any[]): string {
  return elements.map(element => {
    switch (element.type) {
      case 'text':
        const textFontSize = element.properties?.fontSize || '16px'
        const textFontFamily = element.properties?.fontFamily || 'Arial, sans-serif'
        const textColor = element.properties?.color || '#333333'
        const textAlign = element.properties?.textAlign || 'left'
        const textFontWeight = element.properties?.fontWeight || 'normal'
        
        // Convert all properties to inline CSS
        const textStyles = `font-size: ${textFontSize}; font-family: ${textFontFamily}; color: ${textColor}; text-align: ${textAlign}; font-weight: ${textFontWeight}; line-height: 1.6; margin: 15px 0;`
        
        // Process markdown formatting in content
        let processedContent = element.content || ''
        if (processedContent) {
          // Convert **bold** text
          processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // Convert *italic* text
          processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>')
          // Convert _italic_ text
          processedContent = processedContent.replace(/_(.*?)_/g, '<em>$1</em>')
        }
        
        return `<div style="${textStyles}">${processedContent}</div>`
      case 'button':
        const buttonColor = element.properties?.color || '#007bff'
        const buttonTextColor = element.properties?.textColor || '#ffffff'
        const buttonFontSize = element.properties?.fontSize || '16px'
        const buttonFontFamily = element.properties?.fontFamily || 'Arial, sans-serif'
        const buttonPadding = element.properties?.padding || '12px 24px'
        const buttonTextAlign = element.properties?.textAlign || 'center'
        const fullWidth = element.properties?.fullWidth || false
        
        // Use email-safe CSS for buttons
        // For full width buttons, use table-based layout to ensure proper rendering
        if (fullWidth) {
          return `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 20px 0;">
              <tr>
                <td style="text-align: ${buttonTextAlign};">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                    <tr>
                      <td style="background-color: ${buttonColor}; border-radius: 4px; text-align: center;">
                        <a href="${element.properties?.url || '#'}" 
                           style="display: inline-block; padding: ${buttonPadding}; color: ${buttonTextColor}; text-decoration: none; font-size: ${buttonFontSize}; font-family: ${buttonFontFamily}; font-weight: bold; line-height: 1.2; min-height: 44px;">
                          ${element.properties?.text || 'Click Here'}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `
        } else {
          // For auto width buttons, use inline-block with max-width
          const buttonStyles = `display: inline-block; max-width: 100%; background-color: ${buttonColor}; color: ${buttonTextColor}; padding: ${buttonPadding}; border: none; border-radius: 4px; cursor: pointer; font-size: ${buttonFontSize}; font-family: ${buttonFontFamily}; text-decoration: none; text-align: center; font-weight: bold; line-height: 1.2; min-height: 44px;`
          return `<div style="text-align: ${buttonTextAlign}; margin: 20px 0;">
            <a href="${element.properties?.url || '#'}" style="${buttonStyles}">
              ${element.properties?.text || 'Click Here'}
            </a>
          </div>`
        }
      case 'image':
        const imageWidth = element.properties?.width || 600
        const imageHeight = element.properties?.height || 300
        return `<div style="text-align: center; margin: 20px 0;">
          <img src="${element.properties?.src || 'https://via.placeholder.com/600x300'}" 
               alt="${element.properties?.alt || 'Image'}" 
               style="max-width: 100%; height: auto; border-radius: 4px;"
               width="${imageWidth}"
               height="${imageHeight}">
        </div>`
      case 'divider':
        return `<div style="border-top: 1px solid #e0e0e0; margin: 20px 0;"></div>`
      case 'spacer':
        return `<div style="height: 20px;"></div>`
      default:
        return ''
    }
  }).join('')
}

function generateTextFromElements(elements: any[]): string {
  return elements
    .map(element => {
      switch (element.type) {
        case 'text':
          return element.content || ''
        case 'button':
          return `${element.properties?.text || 'Click Here'}: ${element.properties?.url || '#'}`
        case 'image':
          return `[Image: ${element.properties?.alt || 'Image'}]`
        case 'divider':
          return '---'
        case 'spacer':
          return ''
        default:
          return ''
      }
    })
    .filter(text => text.trim())
    .join('\n\n')
}

export interface AutomationTrigger {
  id: string
  config_id: string
  name: string
  description?: string
  trigger_type: string
  email_template_id?: string
  subject?: string
  html_content?: string
  text_content?: string
  audience_id?: string
  send_to_new_members: boolean
  send_to_existing_members: boolean
  delay_minutes: number
  send_immediately: boolean
  conditions?: any
  is_active: boolean
  is_test_mode: boolean
  total_triggered: number
  total_sent: number
  total_failed: number
  last_triggered_at?: string
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  whop_user_id?: string
  name: string
  description?: string
  subject: string
  html_content?: string
  text_content?: string
  template_type: string
  variables?: any
  is_active: boolean
  is_default: boolean
  usage_count: number
  last_used_at?: string
  created_at: string
  updated_at: string
}

export interface AutomationTriggerLog {
  id: string
  trigger_id: string
  config_id: string
  whop_event_id?: string
  whop_membership_id?: string
  whop_user_id?: string
  event_type: string
  event_data?: any
  recipient_email?: string
  email_subject?: string
  email_id?: string
  status: 'triggered' | 'sent' | 'failed' | 'skipped'
  error_message?: string
  triggered_at: string
  sent_at?: string
  metadata?: any
}

/**
 * Get all automation triggers for a user
 */
export async function getAutomationTriggers(whopUserId: string): Promise<{ success: boolean; triggers?: AutomationTrigger[]; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get user's config ID
    const configResult = await getEmailSyncConfig(whopUserId)
    if (!configResult.success || !configResult.config) {
      return { success: false, error: 'EmailSync configuration not found' }
    }

    const { data: triggers, error } = await supabase
      .from('automation_triggers')
      .select('*')
      .eq('config_id', configResult.config.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching automation triggers:', error)
      return { success: false, error: error.message }
    }

    return { success: true, triggers: triggers || [] }
  } catch (error) {
    console.error('Error in getAutomationTriggers:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Create a new automation trigger
 */
export async function createAutomationTrigger(
  whopUserId: string,
  triggerData: any
): Promise<{ success: boolean; trigger?: AutomationTrigger; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get user's config ID
    let configResult = await getEmailSyncConfig(whopUserId)
    
    // If no config exists, create a minimal one for automation triggers
    if (!configResult.success || !configResult.config) {
      console.log('No EmailSync config found, creating minimal config for automation triggers')
      
      const { data: newConfig, error: configError } = await supabase
        .from('email_platform_configs')
        .insert({
          whop_user_id: whopUserId,
          platform_type: 'resend',
          email_type: 'custom',
          from_email: `noreply@${whopUserId}.example.com`,
          domain_status: 'pending',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (configError) {
        console.error('Error creating minimal config:', configError)
        return { success: false, error: 'Failed to create email configuration' }
      }
      
      configResult = { success: true, config: newConfig }
    }

    // Convert delay_days and delay_hours to delay_minutes if they exist
    let processedData = { ...triggerData }
    if (triggerData.delay_days !== undefined || triggerData.delay_hours !== undefined) {
      const delayDays = triggerData.delay_days || 0
      const delayHours = triggerData.delay_hours || 0
      processedData.delay_minutes = (delayDays * 24 * 60) + (delayHours * 60)
      
      // Remove the frontend-specific fields
      delete processedData.delay_days
      delete processedData.delay_hours
    }

    const { data: trigger, error } = await supabase
      .from('automation_triggers')
      .insert({
        ...processedData,
        config_id: configResult.config.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating automation trigger:', error)
      return { success: false, error: error.message }
    }

    return { success: true, trigger }
  } catch (error) {
    console.error('Error in createAutomationTrigger:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Update an automation trigger
 */
export async function updateAutomationTrigger(
  triggerId: string,
  updates: any
): Promise<{ success: boolean; trigger?: AutomationTrigger; error?: string }> {
  try {
    const supabase = createClient()

    // Convert delay_days and delay_hours to delay_minutes if they exist
    let processedUpdates = { ...updates }
    if (updates.delay_days !== undefined || updates.delay_hours !== undefined) {
      const delayDays = updates.delay_days || 0
      const delayHours = updates.delay_hours || 0
      processedUpdates.delay_minutes = (delayDays * 24 * 60) + (delayHours * 60)
      
      // Remove the frontend-specific fields
      delete processedUpdates.delay_days
      delete processedUpdates.delay_hours
    }

    // Remove any fields that shouldn't be updated
    delete processedUpdates.whopUserId
    delete processedUpdates.triggerId

    const { data: trigger, error } = await supabase
      .from('automation_triggers')
      .update(processedUpdates)
      .eq('id', triggerId)
      .select()
      .single()

    if (error) {
      console.error('Error updating automation trigger:', error)
      return { success: false, error: error.message }
    }

    return { success: true, trigger }
  } catch (error) {
    console.error('Error in updateAutomationTrigger:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Delete an automation trigger
 */
export async function deleteAutomationTrigger(triggerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('automation_triggers')
      .delete()
      .eq('id', triggerId)

    if (error) {
      console.error('Error deleting automation trigger:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteAutomationTrigger:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Get email templates for a user
 */
export async function getEmailTemplates(whopUserId: string): Promise<{ success: boolean; templates?: EmailTemplate[]; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get user's own templates
    const { data: userTemplates, error: userError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('whop_user_id', whopUserId)
      .eq('is_active', true)
      .order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false })
    
    if (userError) {
      console.error('Error fetching user templates:', userError)
      return { success: false, error: userError.message }
    }
    
    // Get default templates (shared templates)
    const { data: defaultTemplates, error: defaultError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('whop_user_id', 'default')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    
    if (defaultError) {
      console.error('Error fetching default templates:', defaultError)
      // Don't fail completely, just log the error
    }
    
    const allTemplates = [
      ...(userTemplates || []),
      ...(defaultTemplates || [])
    ]
    
    console.log('Found templates for automation triggers:', allTemplates.length)
    return { success: true, templates: allTemplates }
  } catch (error) {
    console.error('Error in getEmailTemplates:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  whopUserId: string,
  templateData: Omit<EmailTemplate, 'id' | 'whop_user_id' | 'usage_count' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; template?: EmailTemplate; error?: string }> {
  try {
    const supabase = createClient()

    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        ...templateData,
        whop_user_id: whopUserId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating email template:', error)
      return { success: false, error: error.message }
    }

    return { success: true, template }
  } catch (error) {
    console.error('Error in createEmailTemplate:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Process a webhook event and trigger automations
 */
export async function processWebhookEvent(
  eventType: string,
  eventData: any,
  companyId: string
): Promise<{ success: boolean; triggeredCount?: number; error?: string }> {
  try {
    console.log(`=== PROCESSING WEBHOOK EVENT FOR AUTOMATION ===`)
    console.log(`Event Type: ${eventType}`)
    console.log(`Company ID: ${companyId}`)

    const supabase = createClient()
    
    // Get company's config
    const { data: config } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('whop_user_id', companyId)
      .single()

    if (!config) {
      console.log(`No EmailSync config found for company: ${companyId}`)
      return { success: true, triggeredCount: 0 }
    }

    // Map app_ prefixed events to standard events
    const mappedEventType = eventType.startsWith('app_') ? eventType.substring(4) : eventType
    console.log(`Mapped event type: ${eventType} -> ${mappedEventType}`)

    // Get active triggers for this event type (try both original and mapped)
    const { data: triggers, error: triggersError } = await supabase
      .from('automation_triggers')
      .select('*')
      .eq('config_id', config.id)
      .eq('is_active', true)
      .in('trigger_type', [eventType, mappedEventType])

    if (triggersError) {
      console.error('Error fetching triggers:', triggersError)
      return { success: false, error: triggersError.message }
    }

    if (!triggers || triggers.length === 0) {
      console.log(`No active triggers found for event type: ${eventType}`)
      return { success: true, triggeredCount: 0 }
    }

    console.log(`Found ${triggers.length} active triggers for event type: ${eventType}`)

    let triggeredCount = 0

    // Process each trigger
    for (const trigger of triggers) {
      try {
        const result = await processTrigger(trigger, eventData, config)
        if (result.success) {
          triggeredCount++
        }
      } catch (error) {
        console.error(`Error processing trigger ${trigger.id}:`, error)
      }
    }

    return { success: true, triggeredCount }
  } catch (error) {
    console.error('Error in processWebhookEvent:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Process a single automation trigger
 */
async function processTrigger(
  trigger: AutomationTrigger,
  eventData: any,
  config: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Processing trigger: ${trigger.name}`)

    // Create trigger log entry
    const supabase = createClient()
    const { data: log, error: logError } = await supabase
      .from('automation_trigger_logs')
      .insert({
        trigger_id: trigger.id,
        config_id: config.id,
        whop_event_id: eventData.id,
        whop_membership_id: eventData.data?.id,
        whop_user_id: eventData.data?.user,
        event_type: trigger.trigger_type,
        event_data: eventData,
        status: 'triggered'
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating trigger log:', logError)
      return { success: false, error: logError.message }
    }

    // Get member email from event data
    const memberEmail = eventData.data?.user?.email || eventData.user?.email
    if (!memberEmail) {
      console.log('No member email found in event data')
      await updateTriggerLog(log.id, 'skipped', 'No member email found')
      return { success: false, error: 'No member email found' }
    }

    // Prepare email content
    const emailContent = await prepareEmailContent(trigger, eventData, config)
    if (!emailContent) {
      await updateTriggerLog(log.id, 'failed', 'Failed to prepare email content')
      return { success: false, error: 'Failed to prepare email content' }
    }

    // Queue the trigger for processing instead of sending immediately
    const scheduledTime = trigger.delay_minutes > 0 
      ? new Date(Date.now() + trigger.delay_minutes * 60 * 1000)
      : new Date()

    const { data: jobEntry, error: jobError } = await supabase
      .from('automation_jobs')
      .insert({
        job_type: 'trigger',
        whop_user_id: config.whop_user_id,
        trigger_type: trigger.trigger_type,
        user_email: memberEmail,
        user_data: {
          trigger_id: trigger.id,
          trigger_name: trigger.name,
          event_data: eventData,
          log_id: log.id
        },
        subject: emailContent.subject,
        html_content: emailContent.html,
        text_content: emailContent.text,
        from_email: config.from_email,
        priority: 2, // normal priority
        status: 'pending',
        scheduled_for: scheduledTime.toISOString()
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to queue trigger job:', jobError)
      await updateTriggerLog(log.id, 'failed', 'Failed to queue trigger job')
      await updateTriggerStats(trigger.id, false)
      return { success: false, error: 'Failed to queue trigger job' }
    }

    console.log(`Successfully queued trigger job: ${jobEntry.id} for ${scheduledTime.toISOString()}`)
    
    // Update trigger log to indicate it's queued
    await updateTriggerLog(log.id, 'triggered', 'Trigger queued for processing')
    
    // Update trigger statistics
    await updateTriggerStats(trigger.id, true)
    
    return { success: true }
  } catch (error) {
    console.error(`Error processing trigger ${trigger.id}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Prepare email content for a trigger
 */
async function prepareEmailContent(
  trigger: AutomationTrigger,
  eventData: any,
  config: any
): Promise<{ subject: string; html?: string; text?: string } | null> {
  try {
    let subject = trigger.subject || 'Automated Email'
    let html = trigger.html_content
    let text = trigger.text_content

    // If using a template, get template content
    if (trigger.email_template_id) {
      const supabase = createClient()
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', trigger.email_template_id)
        .single()

      if (template) {
        subject = template.subject
        // Generate fresh HTML from template elements instead of using stored html_content
        html = generateHTMLFromElements(template.elements || [])
        text = generateTextFromElements(template.elements || [])
        
        // Update template usage count
        await supabase
          .from('email_templates')
          .update({ 
            usage_count: (template.usage_count || 0) + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', template.id)
      }
    }

    // Replace template variables
    const variables = extractTemplateVariables(eventData, config)
    
    subject = replaceTemplateVariables(subject, variables)
    if (html) html = replaceTemplateVariables(html, variables)
    if (text) text = replaceTemplateVariables(text, variables)

    // Add header and footer to HTML content if it exists
    if (html) {
      html = addEmailHeaderAndFooter(html, config)
    }

    return { subject, html, text }
  } catch (error) {
    console.error('Error preparing email content:', error)
    return null
  }
}

// Function to add header and footer to email HTML using the same design system as normal campaigns
function addEmailHeaderAndFooter(htmlContent: string, config: any): string {
  // Check if the content already has the email-wrapper structure
  if (htmlContent.includes('<div class="email-wrapper">')) {
    return htmlContent // Already properly formatted
  }

  // If it's just raw HTML content, wrap it with the full email design system
  const headerContent = config.company_logo_url 
    ? `<img src="${config.company_logo_url}" alt="${config.company_name || 'Company'}" class="company-logo">`
    : `<h2 style="margin: 0; color: #333;">${config.company_name || 'Company'}</h2>`

  const footerContent = `
    <div class="company-info">
      ${config.company_name ? `<div>${config.company_name}</div>` : ''}
      ${config.company_website ? `<div><a href="https://${config.company_website}" style="color: #6c757d; text-decoration: none;">${config.company_website}</a></div>` : ''}
      ${config.company_email ? `<div>${config.company_email}</div>` : ''}
    </div>
    <div style="margin-top: 15px;">
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" class="unsubscribe-link">Unsubscribe</a>
      <span style="margin: 0 10px;">|</span>
      <a href="{{{RESEND_VIEW_IN_BROWSER_URL}}}" class="view-browser-link">View in browser</a>
    </div>
    ${config.footer_customization?.footer_content?.showPoweredBy ? 
      '<div class="powered-by">Powered by EmailSync</div>' : ''
    }
  `

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
        }
        .email-wrapper {
          width: 100%;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 20px 0;
        }
        .email-container {
          max-width: 600px;
          width: 100%;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          overflow: hidden;
        }
        .email-content {
          padding: 40px 30px;
          background-color: #ffffff;
        }
        .email-header {
          background-color: #f8f9fa;
          padding: 20px 30px;
          border-bottom: 1px solid #e9ecef;
          text-align: center;
        }
        .email-footer {
          background-color: #f8f9fa;
          padding: 20px 30px;
          border-top: 1px solid #e9ecef;
          font-size: 12px;
          color: #6c757d;
          text-align: center;
        }
        .company-logo {
          max-height: 40px;
          max-width: 200px;
        }
        .company-info {
          margin-top: 10px;
          font-size: 14px;
        }
        .unsubscribe-link {
          color: #6c757d;
          text-decoration: none;
        }
        .unsubscribe-link:hover {
          text-decoration: underline;
        }
        .view-browser-link {
          color: #6c757d;
          text-decoration: none;
        }
        .view-browser-link:hover {
          text-decoration: underline;
        }
        .powered-by {
          margin-top: 10px;
          font-size: 11px;
          color: #adb5bd;
        }
        /* Ensure images don't exceed container width */
        img {
          max-width: 100%;
          height: auto;
        }
        /* Ensure tables are responsive */
        table {
          max-width: 100%;
          border-collapse: collapse;
        }
        /* Ensure buttons are properly sized */
        .btn, button {
          max-width: 100%;
          word-wrap: break-word;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 10px;
          }
          .email-container {
            max-width: 100%;
            margin: 0;
            border-radius: 0;
          }
          .email-content {
            padding: 20px 15px;
          }
          .email-header {
            padding: 15px;
          }
          .email-footer {
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          <div class="email-header">
            ${headerContent}
          </div>
          <div class="email-content">
            ${htmlContent}
          </div>
          <div class="email-footer">
            ${footerContent}
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Extract template variables from event data
 */
function extractTemplateVariables(eventData: any, config: any): Record<string, string> {
  const variables: Record<string, string> = {
    company_name: config.company_name || 'Your Company',
    current_year: new Date().getFullYear().toString(),
    product_name: eventData.data?.product?.title || 'Product',
    member_name: eventData.data?.user?.username || eventData.data?.user?.email?.split('@')[0] || 'Member',
    membership_status: eventData.data?.status || 'Unknown',
    expires_at: eventData.data?.expires_at ? new Date(eventData.data.expires_at * 1000).toLocaleDateString() : 'N/A',
    payment_amount: eventData.data?.amount ? `$${(eventData.data.amount / 100).toFixed(2)}` : 'N/A',
    payment_date: new Date().toLocaleDateString(),
    transaction_id: eventData.data?.id || 'N/A'
  }

  return variables
}

/**
 * Replace template variables in content
 */
function replaceTemplateVariables(content: string, variables: Record<string, string>): string {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}

/**
 * Update trigger log status
 */
async function updateTriggerLog(
  logId: string,
  status: 'sent' | 'failed' | 'skipped',
  errorMessage?: string,
  emailId?: string
): Promise<void> {
  try {
    const supabase = createClient()
    await supabase
      .from('automation_trigger_logs')
      .update({
        status,
        error_message: errorMessage,
        email_id: emailId,
        sent_at: status === 'sent' ? new Date().toISOString() : undefined
      })
      .eq('id', logId)
  } catch (error) {
    console.error('Error updating trigger log:', error)
  }
}

/**
 * Update trigger statistics
 */
async function updateTriggerStats(triggerId: string, success: boolean): Promise<void> {
  try {
    const supabase = createClient()
    
    // First get current values
    const { data: currentTrigger } = await supabase
      .from('automation_triggers')
      .select('total_triggered, total_sent, total_failed')
      .eq('id', triggerId)
      .single()

    if (!currentTrigger) return

    // Calculate new values
    const updateData: any = {
      total_triggered: (currentTrigger.total_triggered || 0) + 1,
      last_triggered_at: new Date().toISOString()
    }

    if (success) {
      updateData.total_sent = (currentTrigger.total_sent || 0) + 1
    } else {
      updateData.total_failed = (currentTrigger.total_failed || 0) + 1
    }

    await supabase
      .from('automation_triggers')
      .update(updateData)
      .eq('id', triggerId)
  } catch (error) {
    console.error('Error updating trigger stats:', error)
  }
}

/**
 * Test an automation trigger
 */
export async function testAutomationTrigger(
  triggerId: string,
  testEmail: string,
  testData?: any
): Promise<{ success: boolean; error?: string; logId?: string }> {
  try {
    const supabase = createClient()

    // Get trigger details
    const { data: trigger, error: triggerError } = await supabase
      .from('automation_triggers')
      .select('*, email_platform_configs(*)')
      .eq('id', triggerId)
      .single()

    if (triggerError || !trigger) {
      return { success: false, error: 'Trigger not found' }
    }

    // Create test event data
    const eventData = testData || {
      id: `test-${Date.now()}`,
      data: {
        id: `test-membership-${Date.now()}`,
        user: {
          email: testEmail,
          username: testEmail.split('@')[0]
        },
        product: {
          title: 'Test Product'
        },
        status: 'active',
        expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days from now
      }
    }

    // Process the test trigger
    const result = await processTrigger(trigger, eventData, trigger.email_platform_configs)
    
    return { 
      success: result.success, 
      error: result.error,
      logId: result.success ? 'test-log-id' : undefined
    }
  } catch (error) {
    console.error('Error testing automation trigger:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Manually trigger an automation trigger for a specific user
 */
export async function manuallyTriggerAutomation(
  triggerId: string,
  userEmail: string,
  testData?: any
): Promise<{ success: boolean; error?: string; logId?: string }> {
  try {
    console.log(`=== MANUALLY TRIGGERING AUTOMATION ===`)
    console.log(`Trigger ID: ${triggerId}`)
    console.log(`User Email: ${userEmail}`)

    const supabase = createClient()
    
    // Get the trigger
    const { data: trigger, error: triggerError } = await supabase
      .from('automation_triggers')
      .select('*')
      .eq('id', triggerId)
      .single()

    if (triggerError || !trigger) {
      return { success: false, error: 'Trigger not found' }
    }

    // Get the config
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('id', trigger.config_id)
      .single()

    if (configError || !config) {
      return { success: false, error: 'Email platform not configured' }
    }

    // Create mock event data for manual trigger
    const mockEventData = {
      id: `manual_${Date.now()}`,
      data: {
        id: `manual_membership_${Date.now()}`,
        user: {
          email: userEmail
        },
        ...testData
      },
      company_id: config.whop_user_id
    }

    // Process the trigger
    const result = await processTrigger(trigger, mockEventData, config)
    
    if (result.success) {
      // Get the log entry that was created
      const { data: logs } = await supabase
        .from('automation_trigger_logs')
        .select('id')
        .eq('trigger_id', triggerId)
        .eq('recipient_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(1)

      return { 
        success: true, 
        logId: logs?.[0]?.id 
      }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error('Error in manuallyTriggerAutomation:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Get automation trigger logs for a specific trigger
 */
export async function getTriggerLogs(
  triggerId: string,
  limit: number = 50
): Promise<{ success: boolean; logs?: AutomationTriggerLog[]; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data: logs, error } = await supabase
      .from('automation_trigger_logs')
      .select('*')
      .eq('trigger_id', triggerId)
      .order('triggered_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching trigger logs:', error)
      return { success: false, error: error.message }
    }

    return { success: true, logs: logs || [] }
  } catch (error) {
    console.error('Error in getTriggerLogs:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Get automation trigger logs
 */
export async function getAutomationTriggerLogs(
  whopUserId: string,
  limit: number = 50
): Promise<{ success: boolean; logs?: AutomationTriggerLog[]; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get user's config ID
    const configResult = await getEmailSyncConfig(whopUserId)
    if (!configResult.success || !configResult.config) {
      return { success: false, error: 'EmailSync configuration not found' }
    }

    const { data: logs, error } = await supabase
      .from('automation_trigger_logs')
      .select(`
        *,
        automation_triggers(name)
      `)
      .eq('config_id', configResult.config.id)
      .order('triggered_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching automation trigger logs:', error)
      return { success: false, error: error.message }
    }

    return { success: true, logs: logs || [] }
  } catch (error) {
    console.error('Error in getAutomationTriggerLogs:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
} 