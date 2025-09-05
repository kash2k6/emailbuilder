'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}
import { revalidatePath } from 'next/cache'

export interface FormField {
  id: string
  type: 'email' | 'text' | 'textarea' | 'select' | 'checkbox'
  label: string
  placeholder?: string
  required: boolean
  options?: string[] // For select fields
  defaultValue?: string
}

export interface EmbeddableForm {
  id: string
  whop_user_id: string
  name: string
  description?: string
  title: string
  subtitle?: string
  logo_url?: string
  background_color: string
  text_color: string
  button_color: string
  button_text: string
  fields: FormField[]
  audience_id?: string
  email_flow_id?: string
  is_active: boolean
  show_powered_by: boolean
  redirect_url?: string
  success_message: string
  total_submissions: number
  conversion_rate: number
  created_at: string
  updated_at: string
}

export interface FormSubmission {
  id: string
  form_id: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  form_data: Record<string, any>
  is_processed: boolean
  processing_error?: string
  created_at: string
  processed_at?: string
}

// Create a new form
export async function createForm(data: {
  whop_user_id: string
  name: string
  description?: string
  title?: string
  subtitle?: string
  logo_url?: string
  background_color?: string
  text_color?: string
  button_color?: string
  button_text?: string
  fields?: FormField[]
  audience_id?: string
  email_flow_id?: string
  show_powered_by?: boolean
  redirect_url?: string
  success_message?: string
}) {
  const supabase = createClient()
  
  try {
    const { data: form, error } = await supabase
      .from('embeddable_forms')
      .insert({
        whop_user_id: data.whop_user_id,
        name: data.name,
        description: data.description,
        title: data.title || 'Join Our Mailing List',
        subtitle: data.subtitle,
        logo_url: data.logo_url,
        background_color: data.background_color || '#ffffff',
        text_color: data.text_color || '#000000',
        button_color: data.button_color || '#f97316',
        button_text: data.button_text || 'Subscribe',
        fields: data.fields || [
          {
            id: 'first_name',
            type: 'text',
            label: 'First Name',
            placeholder: 'Enter your first name',
            required: true
          },
          {
            id: 'last_name',
            type: 'text',
            label: 'Last Name',
            placeholder: 'Enter your last name',
            required: true
          },
          {
            id: 'email',
            type: 'email',
            label: 'Email Address',
            placeholder: 'Enter your email address',
            required: true
          }
        ],
        audience_id: data.audience_id || null,
        email_flow_id: data.email_flow_id || null,
        show_powered_by: data.show_powered_by !== false,
        redirect_url: data.redirect_url,
        success_message: data.success_message || 'Thank you for subscribing!'
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/emailsync')
    return { success: true, form }
  } catch (error) {
    console.error('Error creating form:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create form' }
  }
}

// Get all forms for a user
export async function getUserForms(whop_user_id: string) {
  const supabase = createClient()
  
  try {
    const { data: forms, error } = await supabase
      .from('embeddable_forms')
      .select(`
        *,
        email_audiences (
          id,
          name,
          member_count
        )
      `)
      .eq('whop_user_id', whop_user_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return forms || []
  } catch (error) {
    console.error('Error fetching forms:', error)
    return []
  }
}

// Get a single form by ID
export async function getForm(formId: string) {
  const supabase = createClient()
  
  try {
    const { data: form, error } = await supabase
      .from('embeddable_forms')
      .select(`
        *,
        email_audiences (
          id,
          name,
          member_count
        )
      `)
      .eq('id', formId)
      .single()

    if (error) throw error

    return form
  } catch (error) {
    console.error('Error fetching form:', error)
    return null
  }
}

// Update a form
export async function updateForm(formId: string, data: Partial<EmbeddableForm>) {
  const supabase = createClient()
  
  try {
    const { data: form, error } = await supabase
      .from('embeddable_forms')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/emailsync')
    return { success: true, form }
  } catch (error) {
    console.error('Error updating form:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update form' }
  }
}

// Delete a form
export async function deleteForm(formId: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('embeddable_forms')
      .delete()
      .eq('id', formId)

    if (error) throw error

    revalidatePath('/emailsync')
    return { success: true }
  } catch (error) {
    console.error('Error deleting form:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete form' }
  }
}

// Submit a form
export async function submitForm(formId: string, submissionData: {
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  form_data: Record<string, any>
}) {
  const supabase = createClient()
  
  try {
    console.log('=== SUBMIT FORM DEBUG ===')
    console.log('Form ID:', formId)
    console.log('Submission data:', submissionData)
    
    // First, get the form to check if it's active - use direct query instead of getForm
    const { data: form, error: formError } = await supabase
      .from('embeddable_forms')
      .select(`
        *,
        email_audiences (
          id,
          name,
          member_count
        )
      `)
      .eq('id', formId)
      .single()
    
    console.log('Form lookup result:', form)
    console.log('Form lookup error:', formError)
    
    if (formError || !form) {
      console.log('Form not found:', formError)
      return { success: false, error: 'Form not found or inactive' }
    }
    
    if (!form.is_active) {
      console.log('Form is inactive')
      return { success: false, error: 'Form not found or inactive' }
    }

    console.log('Form data:', {
      id: form.id,
      name: form.name,
      audience_id: form.audience_id,
      email_flow_id: form.email_flow_id,
      is_active: form.is_active
    })

    // Create the submission
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        email: submissionData.email,
        first_name: submissionData.first_name,
        last_name: submissionData.last_name,
        full_name: submissionData.full_name,
        form_data: submissionData.form_data
      })
      .select()
      .single()

    if (submissionError) throw submissionError

    // Update form submission count
    await supabase
      .from('embeddable_forms')
      .update({
        total_submissions: (form.total_submissions || 0) + 1
      })
      .eq('id', formId)

    // If form has an audience, add the contact to the audience (with duplicate check)
    if (form.audience_id) {
      try {
        console.log('Adding contact to audience:', form.audience_id, submissionData)
        
        // Check if contact already exists in the audience
        const { data: existingContact } = await supabase
          .from('email_contacts')
          .select('id')
          .eq('audience_id', form.audience_id)
          .eq('email', submissionData.email)
          .single()

        if (existingContact) {
          console.log('Contact already exists in audience, skipping addition')
          // Mark submission as processed
          await supabase
            .from('form_submissions')
            .update({
              is_processed: true,
              processed_at: new Date().toISOString()
            })
            .eq('id', submission.id)
        } else {
          // Import and use the addMemberToList function directly
          const { addMemberToList } = await import('@/app/actions/emailsync')
          const result = await addMemberToList(form.audience_id, {
            email: submissionData.email,
            firstName: submissionData.first_name,
            lastName: submissionData.last_name,
            fullName: submissionData.full_name
          })

          if (!result.success) {
            console.error('Failed to add contact to audience:', result.error)
            // Mark submission as failed
            await supabase
              .from('form_submissions')
              .update({
                is_processed: true,
                processing_error: result.error,
                processed_at: new Date().toISOString()
              })
              .eq('id', submission.id)
          } else {
            console.log('Successfully added contact to audience')
            // Mark submission as processed
            await supabase
              .from('form_submissions')
              .update({
                is_processed: true,
                processed_at: new Date().toISOString()
              })
              .eq('id', submission.id)
          }
        }
      } catch (error) {
        console.error('Error adding contact to audience:', error)
        // Mark submission as failed
        await supabase
          .from('form_submissions')
          .update({
            is_processed: true,
            processing_error: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString()
          })
          .eq('id', submission.id)
      }
    } else {
      console.log('No audience_id found for form, skipping audience addition')
      // Mark submission as processed even if no audience
      await supabase
        .from('form_submissions')
        .update({
          is_processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', submission.id)
    }

    // If form has an email flow, queue it for later processing to avoid rate limits
    if (form.email_flow_id) {
      try {
        console.log('Queueing email flow for later processing:', form.email_flow_id)
        
        // Get the workflow details to create proper job
        const { data: workflow, error: workflowError } = await supabase
          .from('automation_workflows')
          .select('*, automation_workflow_steps(*)')
          .eq('id', form.email_flow_id)
          .single()

        if (workflowError || !workflow) {
          console.error('Failed to get workflow details:', workflowError)
          console.error('Workflow ID:', form.email_flow_id)
          console.error('Workflow data:', workflow)
          return
        }

        console.log('Found workflow:', {
          id: workflow.id,
          name: workflow.name,
          steps_count: workflow.automation_workflow_steps?.length || 0
        })

        const steps = workflow.automation_workflow_steps || []
        if (steps.length === 0) {
          console.log('No steps found in workflow, skipping queue')
          return
        }

        // Get the first step for immediate processing
        const firstStep = steps[0]
        if (!firstStep.is_active) {
          console.log('First step is not active, skipping queue')
          return
        }

        // Get email platform config
        const { data: config } = await supabase
          .from('email_platform_configs')
          .select('*')
          .eq('id', workflow.config_id)
          .single()

        if (!config) {
          console.error('Email platform config not found')
          return
        }

        // Create automation job for the first step
        const { data: jobEntry, error: jobError } = await supabase
          .from('automation_jobs')
          .insert({
            job_type: 'flow_step',
            whop_user_id: form.whop_user_id,
            trigger_type: 'form_submission',
            flow_id: form.email_flow_id,
            email_step: 1,
            user_email: submissionData.email,
            user_data: {
              form_id: formId,
              submission_id: submission.id,
              email: submissionData.email,
              first_name: submissionData.first_name,
              last_name: submissionData.last_name,
              full_name: submissionData.full_name,
              form_data: submissionData.form_data,
              form_name: form.name,
              company_name: config.company_name || 'Email Marketing by Whop'
            },
            subject: firstStep.subject,
            html_content: firstStep.html_content,
            text_content: firstStep.text_content,
            from_email: config.from_email,
            priority: 2, // normal priority
            status: 'pending',
            scheduled_for: new Date().toISOString() // Process immediately
          })
          .select()
          .single()

        if (jobError) {
          console.error('Failed to queue email flow job:', jobError)
        } else {
          console.log('Successfully queued email flow job:', jobEntry.id)
        }

        // Queue subsequent steps with delays
        for (let i = 1; i < steps.length; i++) {
          const step = steps[i]
          if (step.is_active && step.delay_minutes > 0) {
            const scheduledTime = new Date()
            scheduledTime.setMinutes(scheduledTime.getMinutes() + step.delay_minutes)

            const { error: delayedJobError } = await supabase
              .from('automation_jobs')
              .insert({
                job_type: 'flow_step',
                whop_user_id: form.whop_user_id,
                trigger_type: 'form_submission',
                flow_id: form.email_flow_id,
                email_step: i + 1,
                user_email: submissionData.email,
                user_data: {
                  form_id: formId,
                  submission_id: submission.id,
                  email: submissionData.email,
                  first_name: submissionData.first_name,
                  last_name: submissionData.last_name,
                  full_name: submissionData.full_name,
                  form_data: submissionData.form_data,
                  form_name: form.name,
                  company_name: config.company_name || 'Email Marketing by Whop'
                },
                subject: step.subject,
                html_content: step.html_content,
                text_content: step.text_content,
                from_email: config.from_email,
                priority: 2, // normal priority
                status: 'pending',
                scheduled_for: scheduledTime.toISOString()
              })

            if (delayedJobError) {
              console.error(`Failed to queue delayed step ${i + 1}:`, delayedJobError)
            } else {
              console.log(`Successfully queued delayed step ${i + 1} for ${scheduledTime.toISOString()}`)
            }
          }
        }
      } catch (error) {
        console.error('Error queueing email flow:', error)
        // Don't fail the submission if queueing fails
      }
    }

    console.log('Form submission successful:', submission.id)
    return { success: true, submission }
  } catch (error) {
    console.error('Error submitting form:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit form' }
  }
}

// Get form submissions
export async function getFormSubmissions(formId: string) {
  const supabase = createClient()
  
  try {
    const { data: submissions, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('form_id', formId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return submissions || []
  } catch (error) {
    console.error('Error fetching form submissions:', error)
    return []
  }
}

// Get form analytics
export async function getFormAnalytics(formId: string) {
  const supabase = createClient()
  
  try {
    // Get form details
    const form = await getForm(formId)
    if (!form) return null

    // Get recent submissions
    const submissions = await getFormSubmissions(formId)
    
    // Calculate conversion rate (if we had more data)
    const conversionRate = form.total_submissions > 0 ? 100 : 0

    return {
      form,
      submissions,
      total_submissions: form.total_submissions,
      conversion_rate: conversionRate,
      recent_submissions: submissions.slice(0, 10)
    }
  } catch (error) {
    console.error('Error fetching form analytics:', error)
    return null
  }
}
