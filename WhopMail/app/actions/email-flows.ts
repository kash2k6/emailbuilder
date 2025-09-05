"use server"

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { sendIndividualEmail } from './emailsync'

// Helper functions for generating HTML content
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

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface EmailFlow {
  id: string
  config_id: string
  name: string
  description?: string
  trigger_type: string
  is_active: boolean
  max_steps: number
  total_triggered: number
  total_completed: number
  total_failed: number
  created_at: string
  updated_at: string
}

export interface FlowStep {
  id: string
  workflow_id: string
  step_order: number
  name: string
  description?: string
  email_template_id?: string
  subject: string
  html_content?: string
  text_content?: string
  delay_minutes: number // Backend still uses minutes for compatibility
  delay_type: 'after_previous' | 'after_trigger'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FlowExecution {
  id: string
  workflow_id: string
  config_id: string
  whop_event_id?: string
  whop_membership_id?: string
  whop_user_id?: string
  member_email: string
  status: 'active' | 'completed' | 'failed' | 'paused'
  current_step: number
  total_steps: number
  started_at: string
  completed_at?: string
  next_step_at?: string
  metadata?: any
}

export interface StepExecution {
  id: string
  workflow_execution_id: string
  workflow_step_id: string
  step_order: number
  email_id?: string
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  error_message?: string
  scheduled_at?: string
  sent_at?: string
  metadata?: any
}

/**
 * Get all email flows for a user
 */
export async function getEmailFlows(whopUserId: string): Promise<{ success: boolean; flows?: EmailFlow[]; error?: string }> {
  try {
    // Get user's email platform config
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (configError || !config) {
      return { success: false, error: 'Email platform not configured' }
    }

    // Get email flows
    const { data: flows, error } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('config_id', config.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching email flows:', error)
      return { success: false, error: error.message }
    }

    // Calculate statistics for each flow from executions
    const flowsWithStats = await Promise.all((flows || []).map(async (flow) => {
      // Get execution statistics for this flow
      const { data: executions } = await supabase
        .from('automation_workflow_executions')
        .select('status')
        .eq('workflow_id', flow.id)

      const totalTriggered = executions?.length || 0
      const totalActive = executions?.filter(e => e.status === 'active').length || 0
      const totalCompleted = executions?.filter(e => e.status === 'completed').length || 0
      const totalFailed = executions?.filter(e => e.status === 'failed').length || 0

      return {
        ...flow,
        total_triggered: totalTriggered,
        total_completed: totalCompleted,
        total_failed: totalFailed
      }
    }))

    return { success: true, flows: flowsWithStats }
  } catch (error) {
    console.error('Error in getEmailFlows:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Create a new email flow
 */
export async function createEmailFlow(
  whopUserId: string,
  flowData: {
    name: string
    description?: string
    trigger_type: string
    is_active: boolean
    steps: Array<{
      step_order: number
      name: string
      description?: string
      email_template_id?: string
      subject: string
      html_content?: string
      text_content?: string
      delay_minutes: number // Converted from days/hours in frontend
      delay_type: 'after_previous' | 'after_trigger'
      is_active: boolean
    }>
  }
): Promise<{ success: boolean; flow?: EmailFlow; error?: string }> {
  try {
    // Get user's email platform config
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (configError || !config) {
      return { success: false, error: 'Email platform not configured' }
    }

    // Create the email flow
    const { data: flow, error: flowError } = await supabase
      .from('automation_workflows')
      .insert({
        config_id: config.id,
        name: flowData.name,
        description: flowData.description,
        trigger_type: flowData.trigger_type,
        is_active: flowData.is_active,
        max_steps: flowData.steps.length
      })
      .select()
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (flowError) {
      console.error('Error creating email flow:', flowError)
      return { success: false, error: flowError.message }
    }

    // Create the flow steps
    const stepsData = flowData.steps.map(step => ({
      workflow_id: flow.id,
      step_order: step.step_order,
      name: step.name,
      description: step.description,
      email_template_id: step.email_template_id,
      subject: step.subject,
      html_content: step.html_content,
      text_content: step.text_content,
      delay_minutes: step.delay_minutes,
      delay_type: step.delay_type,
      is_active: step.is_active
    }))

    const { error: stepsError } = await supabase
      .from('automation_workflow_steps')
      .insert(stepsData)

    if (stepsError) {
      console.error('Error creating flow steps:', stepsError)
      // Clean up the flow if steps creation fails
      await supabase.from('automation_workflows').delete().eq('id', flow.id)
      return { success: false, error: stepsError.message }
    }

    return { success: true, flow }
  } catch (error) {
    console.error('Error in createEmailFlow:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Update an email flow
 */
export async function updateEmailFlow(
  flowId: string,
  updates: any
): Promise<{ success: boolean; flow?: EmailFlow; error?: string }> {
  try {
    console.log('Updating email flow:', { flowId, updates })
    
    // Extract steps and whopUserId from updates if present
    const { steps, whopUserId, ...allUpdates } = updates
    
    // Only allow valid fields for automation_workflows table
    const validFields = ['name', 'description', 'trigger_type', 'is_active', 'max_steps']
    const workflowUpdates = Object.keys(allUpdates)
      .filter(key => validFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = allUpdates[key]
        return obj
      }, {} as any)
    
    console.log('Filtered workflow updates:', workflowUpdates)
    
    // Update the main workflow
    const { data: flow, error } = await supabase
      .from('automation_workflows')
      .update(workflowUpdates)
      .eq('id', flowId)
      .select()
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (error) {
      console.error('Error updating email flow:', error)
      return { success: false, error: error.message }
    }

    // If steps are provided, update them
    if (steps && Array.isArray(steps)) {
      console.log('Updating steps:', steps)
      
      // First, delete existing steps
      const { error: deleteError } = await supabase
        .from('automation_workflow_steps')
        .delete()
        .eq('workflow_id', flowId)

      if (deleteError) {
        console.error('Error deleting existing steps:', deleteError)
        return { success: false, error: deleteError.message }
      }

      // Then insert new steps
      const stepsToInsert = steps.map((step: any, index: number) => ({
        workflow_id: flowId,
        step_order: index + 1,
        name: step.name,
        description: step.description,
        email_template_id: step.email_template_id,
        subject: step.subject,
        html_content: step.html_content,
        text_content: step.text_content,
        delay_minutes: step.delay_minutes || 0,
        delay_type: step.delay_type || 'after_trigger',
        is_active: step.is_active !== false
      }))

      const { error: insertError } = await supabase
        .from('automation_workflow_steps')
        .insert(stepsToInsert)

      if (insertError) {
        console.error('Error inserting new steps:', insertError)
        return { success: false, error: insertError.message }
      }

      console.log('Successfully updated steps')
    }

    return { success: true, flow }
  } catch (error) {
    console.error('Error in updateEmailFlow:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Delete an email flow
 */
export async function deleteEmailFlow(flowId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('automation_workflows')
      .delete()
      .eq('id', flowId)

    if (error) {
      console.error('Error deleting email flow:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteEmailFlow:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Test an email flow
 */
export async function testEmailFlow(
  flowId: string,
  testEmail: string,
  testData?: any
): Promise<{ success: boolean; error?: string; executionId?: string }> {
  try {
    // Get the flow and its steps
    const { data: flow, error: flowError } = await supabase
      .from('automation_workflows')
      .select(`
        *,
        automation_workflow_steps(*)
      `)
      .eq('id', flowId)
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (flowError || !flow) {
      return { success: false, error: 'Email flow not found' }
    }

    const steps = flow.automation_workflow_steps || []
    if (steps.length === 0) {
      return { success: false, error: 'No steps found in email flow' }
    }

    // Create flow execution
    const { data: execution, error: executionError } = await supabase
      .from('automation_workflow_executions')
      .insert({
        workflow_id: flowId,
        config_id: flow.config_id,
        member_email: testEmail,
        status: 'active',
        current_step: 1,
        total_steps: steps.length,
        metadata: testData
      })
      .select()
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (executionError) {
      console.error('Error creating flow execution:', executionError)
      return { success: false, error: executionError.message }
    }

    // Process the first step
    const firstStep = steps[0]
    if (firstStep.is_active) {
      if (firstStep.delay_minutes > 0) {
        console.log(`⏰ Scheduling step 1 in ${firstStep.delay_minutes} minutes`)
        setTimeout(async () => {
          await processFlowStep(execution.id, firstStep, testEmail, testData)
        }, firstStep.delay_minutes * 60 * 1000)
      } else {
        console.log(`⚡ Processing step 1 immediately`)
        await processFlowStep(execution.id, firstStep, testEmail, testData)
      }
    }

    // Update the flow's total_subscribers count
    await supabase
      .from('automation_workflows')
      .update({ 
        total_triggered: (flow.total_triggered || 0) + 1 
      })
      .eq('id', flowId)

    return { success: true, executionId: execution.id }
  } catch (error) {
    console.error('Error in testEmailFlow:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Process a single flow step
 */
async function processFlowStep(
  executionId: string,
  step: FlowStep,
  memberEmail: string,
  eventData: any
): Promise<void> {
  try {
    // Create step execution record
    const { data: stepExecution, error: stepError } = await supabase
      .from('automation_workflow_step_executions')
      .insert({
        workflow_execution_id: executionId,
        workflow_step_id: step.id,
        step_order: step.step_order,
        status: 'pending'
      })
      .select()
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (stepError) {
      console.error('Error creating step execution:', stepError)
      return
    }

    // Get email platform config - we need to get the workflow first to get the config_id
    const { data: workflow } = await supabase
      .from('automation_workflows')
      .select('config_id')
      .eq('id', step.workflow_id)
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (!workflow) {
      await updateStepExecution(stepExecution.id, 'failed', 'Workflow not found')
      return
    }

    const { data: config } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('id', workflow.config_id)
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (!config) {
      await updateStepExecution(stepExecution.id, 'failed', 'Email platform not configured')
      return
    }

    // Prepare email content
    let subject = step.subject
    let html = step.html_content
    let text = step.text_content

    // If using a template, get template content
    if (step.email_template_id) {
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', step.email_template_id)
        .maybeSingle() // Use maybeSingle() to handle no rows gracefully

      if (template) {
        subject = template.subject
        // Generate fresh HTML from template elements instead of using stored html_content
        html = generateHTMLFromElements(template.elements || [])
        text = generateTextFromElements(template.elements || [])
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

    // Calculate delay
    let scheduledAt: string | undefined
    if (step.delay_minutes > 0) {
      const delayMs = step.delay_minutes * 60 * 1000
      scheduledAt = `in ${step.delay_minutes} minutes`
    }

    // Send email
    console.log(`📧 Sending email for step ${step.step_order}:`, {
      to: memberEmail,
      subject,
      scheduledAt,
      hasHtml: !!html,
      hasText: !!text,
      configId: config.id,
      fromEmail: config.from_email
    })

    const emailResult = await sendIndividualEmail({
      toEmail: memberEmail,
      subject,
      html,
      text,
      fromEmail: config.from_email,
      whopUserId: config.whop_user_id,
      scheduledAt
    })

    if (emailResult.success) {
      await updateStepExecution(stepExecution.id, 'sent', undefined, emailResult.emailId)
      console.log(`✅ Email sent successfully for step ${step.step_order} to ${memberEmail}`)
      
      // Schedule the next step based on this step's delay
      if (step.delay_minutes > 0) {
        console.log(`⏰ Scheduling step ${step.step_order + 1} in ${step.delay_minutes} minutes`)
        setTimeout(async () => {
          await processNextStep(executionId, step.step_order + 1, memberEmail, eventData)
        }, step.delay_minutes * 60 * 1000)
      } else {
        console.log(`⚡ Processing step ${step.step_order + 1} immediately`)
        await processNextStep(executionId, step.step_order + 1, memberEmail, eventData)
      }
    } else {
      await updateStepExecution(stepExecution.id, 'failed', emailResult.error)
      console.log(`❌ Email failed for step ${step.step_order}:`, emailResult.error)
    }
  } catch (error) {
    console.error('Error processing flow step:', error)
  }
}

/**
 * Process the next step in a flow
 */
async function processNextStep(
  executionId: string,
  nextStepOrder: number,
  memberEmail: string,
  eventData: any
): Promise<void> {
  try {
    // First get the execution to find the workflow_id
    const { data: execution } = await supabase
      .from('automation_workflow_executions')
      .select('workflow_id')
      .eq('id', executionId)
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (!execution) {
      console.error('Execution not found:', executionId)
      return
    }

    // Get the next step using the correct workflow_id
    const { data: nextStep } = await supabase
      .from('automation_workflow_steps')
      .select('*')
      .eq('workflow_id', execution.workflow_id)
      .eq('step_order', nextStepOrder)
      .eq('is_active', true)
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (nextStep) {
      console.log(`🔄 Processing next step ${nextStepOrder} for execution ${executionId}`)
      await processFlowStep(executionId, nextStep, memberEmail, eventData)
      
      // Schedule the next step after this one (recursive)
      if (nextStep.delay_minutes > 0) {
        console.log(`⏰ Scheduling step ${nextStepOrder + 1} in ${nextStep.delay_minutes} minutes`)
        setTimeout(async () => {
          await processNextStep(executionId, nextStepOrder + 1, memberEmail, eventData)
        }, nextStep.delay_minutes * 60 * 1000)
      } else {
        // If no delay, process immediately
        console.log(`⚡ Processing step ${nextStepOrder + 1} immediately`)
        await processNextStep(executionId, nextStepOrder + 1, memberEmail, eventData)
      }
    } else {
      console.log(`✅ No more steps, marking execution ${executionId} as completed`)
      // Mark execution as completed
      await supabase
        .from('automation_workflow_executions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId)

      // Update the flow's total_completed count
      await supabase
        .from('automation_workflows')
        .update({ 
          total_completed: (await getCurrentCompletedCount(execution.workflow_id)) + 1 
        })
        .eq('id', execution.workflow_id)
    }
  } catch (error) {
    console.error('Error processing next step:', error)
  }
}

/**
 * Get current completed count for a workflow
 */
async function getCurrentCompletedCount(workflowId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('automation_workflow_executions')
      .select('*', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)
      .eq('status', 'completed')
    
    return count || 0
  } catch (error) {
    console.error('Error getting completed count:', error)
    return 0
  }
}

/**
 * Update step execution status
 */
async function updateStepExecution(
  stepExecutionId: string,
  status: 'sent' | 'failed' | 'skipped',
  errorMessage?: string,
  emailId?: string
): Promise<void> {
  try {
    await supabase
      .from('automation_workflow_step_executions')
      .update({
        status,
        error_message: errorMessage,
        email_id: emailId,
        sent_at: status === 'sent' ? new Date().toISOString() : undefined
      })
      .eq('id', stepExecutionId)
  } catch (error) {
    console.error('Error updating step execution:', error)
  }
}

/**
 * Extract template variables from event data
 */
function extractTemplateVariables(eventData: any, config: any): Record<string, string> {
  const variables: Record<string, string> = {
    company_name: config.company_name || 'Your Company',
    current_year: new Date().getFullYear().toString(),
    product_name: eventData?.data?.product?.title || 'Product',
    member_name: eventData?.data?.user?.username || eventData?.data?.user?.email?.split('@')[0] || 'Member',
    membership_status: eventData?.data?.status || 'Unknown',
    expires_at: eventData?.data?.expires_at ? new Date(eventData.data.expires_at * 1000).toLocaleDateString() : 'N/A',
    payment_amount: eventData?.data?.amount ? `$${(eventData.data.amount / 100).toFixed(2)}` : 'N/A',
    payment_date: new Date().toLocaleDateString(),
    transaction_id: eventData?.data?.id || 'N/A'
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
 * Process email flows for webhook events
 */
export async function processEmailFlow(
  eventType: string,
  eventData: any,
  companyId?: string
): Promise<{ success: boolean; triggeredCount?: number; error?: string }> {
  try {
    console.log(`Processing email flows for event: ${eventType}`)

    // Get all active email flows for this event type
    const { data: flows, error } = await supabase
      .from('automation_workflows')
      .select(`
        *,
        automation_workflow_steps(*)
      `)
      .eq('trigger_type', eventType)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching email flows:', error)
      return { success: false, error: error.message }
    }

    if (!flows || flows.length === 0) {
      console.log(`No active email flows found for event: ${eventType}`)
      return { success: true, triggeredCount: 0 }
    }

    let triggeredCount = 0

    // Process each flow
    for (const flow of flows) {
      try {
        // Get member email from event data
        const memberEmail = eventData?.data?.user?.email
        if (!memberEmail) {
          console.log('No member email found in event data')
          continue
        }

        // Create flow execution
        const { data: execution, error: executionError } = await supabase
          .from('automation_workflow_executions')
          .insert({
            workflow_id: flow.id,
            config_id: flow.config_id,
            whop_event_id: eventData?.data?.id,
            whop_membership_id: eventData?.data?.membership_id,
            whop_user_id: eventData?.data?.user_id,
            member_email: memberEmail,
            status: 'active',
            current_step: 1,
            total_steps: flow.automation_workflow_steps?.length || 0,
            metadata: eventData
          })
          .select()
          .maybeSingle() // Use maybeSingle() to handle no rows gracefully

        if (executionError) {
          console.error('Error creating flow execution:', executionError)
          continue
        }

        // Process the first step
        const steps = flow.automation_workflow_steps || []
        if (steps.length > 0) {
          const firstStep = steps[0]
          if (firstStep.is_active) {
            await processFlowStep(execution.id, firstStep, memberEmail, eventData)
            triggeredCount++
          }
        }

        // Update flow statistics
        await supabase
          .from('automation_workflows')
          .update({ 
            total_triggered: (flow.total_triggered || 0) + 1
          })
          .eq('id', flow.id)

      } catch (flowError) {
        console.error(`Error processing flow ${flow.id}:`, flowError)
      }
    }

    console.log(`Successfully processed ${triggeredCount} email flows`)
    return { success: true, triggeredCount }
  } catch (error) {
    console.error('Error in processEmailFlow:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
} 

/**
 * Manually add a user to an email flow
 */
export async function manuallyAddUserToFlow(
  flowId: string,
  userEmail: string,
  testData?: any
): Promise<{ success: boolean; error?: string; executionId?: string }> {
  try {
    console.log(`=== MANUALLY ADDING USER TO FLOW ===`)
    console.log(`Flow ID: ${flowId}`)
    console.log(`User Email: ${userEmail}`)

    // Get the flow and its steps
    const { data: flow, error: flowError } = await supabase
      .from('automation_workflows')
      .select(`
        *,
        automation_workflow_steps(*)
      `)
      .eq('id', flowId)
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (flowError || !flow) {
      return { success: false, error: 'Flow not found' }
    }

    // Get the config
    const { data: config, error: configError } = await supabase
      .from('email_platform_configs')
      .select('*')
      .eq('id', flow.config_id)
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

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

    // Create flow execution
    const { data: execution, error: executionError } = await supabase
      .from('automation_workflow_executions')
      .insert({
        workflow_id: flow.id,
        config_id: flow.config_id,
        whop_event_id: mockEventData.id,
        whop_membership_id: mockEventData.data.id,
        whop_user_id: `manual_user_${Date.now()}`,
        member_email: userEmail,
        status: 'active',
        current_step: 1,
        total_steps: flow.automation_workflow_steps?.length || 0,
        metadata: mockEventData
      })
      .select()
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (executionError) {
      console.error('Error creating flow execution:', executionError)
      return { success: false, error: executionError.message }
    }

    // Process the first step
    const steps = flow.automation_workflow_steps || []
    if (steps.length > 0) {
      const firstStep = steps[0]
      if (firstStep.is_active) {
        await processFlowStep(execution.id, firstStep, userEmail, mockEventData)
      }
    }

    // Update flow statistics
    await supabase
      .from('automation_workflows')
      .update({ 
        total_triggered: (flow.total_triggered || 0) + 1
      })
      .eq('id', flow.id)

    console.log(`✅ Successfully added user ${userEmail} to flow ${flow.name}`)
    return { success: true, executionId: execution.id }
  } catch (error) {
    console.error('Error in manuallyAddUserToFlow:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Get flow executions for a specific flow
 */
export async function getFlowExecutions(
  flowId: string,
  limit: number = 50
): Promise<{ success: boolean; executions?: FlowExecution[]; error?: string }> {
  try {
    const { data: executions, error } = await supabase
      .from('automation_workflow_executions')
      .select('*')
      .eq('workflow_id', flowId)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching flow executions:', error)
      return { success: false, error: error.message }
    }

    return { success: true, executions: executions || [] }
  } catch (error) {
    console.error('Error in getFlowExecutions:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

/**
 * Get step executions for a specific flow execution
 */
export async function getStepExecutions(
  executionId: string
): Promise<{ success: boolean; stepExecutions?: StepExecution[]; error?: string }> {
  try {
    const { data: stepExecutions, error } = await supabase
      .from('automation_workflow_step_executions')
      .select('*')
      .eq('workflow_execution_id', executionId)
      .order('step_order', { ascending: true })

    if (error) {
      console.error('Error fetching step executions:', error)
      return { success: false, error: error.message }
    }

    return { success: true, stepExecutions: stepExecutions || [] }
  } catch (error) {
    console.error('Error in getStepExecutions:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
} 