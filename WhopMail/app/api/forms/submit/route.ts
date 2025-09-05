import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formId, email, first_name, last_name, full_name, form_data } = body

    if (!formId || !email) {
      return NextResponse.json(
        { error: 'Form ID and email are required' },
        { status: 400 }
      )
    }

    console.log('=== FORM SUBMISSION API ===')
    console.log('Form ID:', formId)
    console.log('Email:', email)

    // Get the form directly
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
      return NextResponse.json(
        { error: 'Form not found or inactive' },
        { status: 400 }
      )
    }

    if (!form.is_active) {
      console.log('Form is inactive')
      return NextResponse.json(
        { error: 'Form not found or inactive' },
        { status: 400 }
      )
    }

    // Create the submission
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        email: email,
        first_name: first_name,
        last_name: last_name,
        full_name: full_name,
        form_data: form_data || {}
      })
      .select()
      .single()

    if (submissionError) {
      console.error('Submission error:', submissionError)
      return NextResponse.json(
        { error: 'Failed to submit form' },
        { status: 500 }
      )
    }

    console.log('Form submission successful:', submission.id)

    // If form has an audience, add the contact to the audience (with duplicate check)
    if (form.audience_id) {
      try {
        console.log('Adding contact to audience:', form.audience_id)
        
        // Check if contact already exists in the audience
        const { data: existingContact } = await supabase
          .from('email_contacts')
          .select('id')
          .eq('audience_id', form.audience_id)
          .eq('email', email)
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
          // Import and use the addMemberToList function
          const { addMemberToList } = await import('@/app/actions/emailsync')
          const result = await addMemberToList(form.audience_id, {
            email: email,
            firstName: first_name,
            lastName: last_name,
            fullName: full_name
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
        } else {
          console.log('Found workflow:', {
            id: workflow.id,
            name: workflow.name,
            steps_count: workflow.automation_workflow_steps?.length || 0
          })

          const steps = workflow.automation_workflow_steps || []
          if (steps.length === 0) {
            console.log('No steps found in workflow, skipping queue')
          } else {
            // Get the first step for immediate processing
            const firstStep = steps[0]
            if (!firstStep.is_active) {
              console.log('First step is not active, skipping queue')
            } else {
              // Get email platform config
              const { data: config } = await supabase
                .from('email_platform_configs')
                .select('*')
                .eq('id', workflow.config_id)
                .single()

              if (!config) {
                console.error('Email platform config not found')
              } else {
                // Create automation job for the first step
                const { data: jobEntry, error: jobError } = await supabase
                  .from('automation_jobs')
                  .insert({
                    job_type: 'flow_step',
                    whop_user_id: form.whop_user_id,
                    trigger_type: 'form_submission',
                    flow_id: form.email_flow_id,
                    email_step: 1,
                    user_email: email,
                    user_data: {
                      form_id: formId,
                      submission_id: submission.id,
                      email: email,
                      first_name: first_name,
                      last_name: last_name,
                      full_name: full_name,
                      form_data: form_data || {},
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
                  
                  // Create or update email flow progress entry for this user
                  // Allow users to re-enter flows by updating existing entries
                  const { error: progressError } = await supabase
                    .from('email_flow_progress')
                    .upsert({
                      whop_user_id: form.whop_user_id,
                      flow_id: form.email_flow_id,
                      user_email: email,
                      user_first_name: first_name,
                      user_last_name: last_name,
                      current_step: 1,
                      total_steps: steps.length,
                      status: 'active',
                      started_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }, {
                      onConflict: 'whop_user_id,flow_id,user_email'
                    })
                  
                  if (progressError) {
                    console.error('Failed to create/update flow progress entry:', progressError)
                  } else {
                    console.log('Created/updated flow progress entry for user')
                    
                    // Create workflow execution for this user
                    const { error: executionError } = await supabase
                      .from('automation_workflow_executions')
                      .insert({
                        workflow_id: form.email_flow_id,
                        config_id: workflow.config_id,
                        whop_event_id: submission.id,
                        whop_membership_id: null,
                        whop_user_id: form.whop_user_id,
                        member_email: email,
                        status: 'active',
                        current_step: 1,
                        total_steps: steps.length,
                        metadata: {
                          form_id: formId,
                          submission_id: submission.id,
                          email: email,
                          first_name: first_name,
                          last_name: last_name,
                          full_name: full_name,
                          form_data: form_data || {},
                          form_name: form.name,
                          company_name: config.company_name || 'Email Marketing by Whop'
                        }
                      })
                    
                    if (executionError) {
                      console.error('Failed to create workflow execution:', executionError)
                    } else {
                      console.log('Created workflow execution for user')
                      
                      // Update flow statistics - increment total_triggered
                      await supabase
                        .rpc('increment_flow_triggered', { flow_id: form.email_flow_id })
                    }
                  }
                }

                // Queue subsequent steps with delays
                for (let i = 1; i < steps.length; i++) {
                  const step = steps[i]
                  if (step.is_active) {
                    // Calculate delay based on flow position:
                    // Step 2: 1 hour after form submission
                    // Step 3: 2 hours after previous step (3 hours total)
                    let delayHours = 0
                    if (i === 1) { // Step 2
                      delayHours = 1
                    } else if (i === 2) { // Step 3
                      delayHours = 3 // 1 hour + 2 hours = 3 hours total
                    } else {
                      delayHours = i // For additional steps, add 1 hour each
                    }
                    
                    const scheduledTime = new Date()
                    scheduledTime.setHours(scheduledTime.getHours() + delayHours)

                    const { error: delayedJobError } = await supabase
                      .from('automation_jobs')
                      .insert({
                        job_type: 'flow_step',
                        whop_user_id: form.whop_user_id,
                        trigger_type: 'form_submission',
                        flow_id: form.email_flow_id,
                        email_step: i + 1,
                        user_email: email,
                        user_data: {
                          form_id: formId,
                          submission_id: submission.id,
                          email: email,
                          first_name: first_name,
                          last_name: last_name,
                          full_name: full_name,
                          form_data: form_data || {},
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
              }
            }
          }
        }
      } catch (error) {
        console.error('Error queueing email flow:', error)
        // Don't fail the submission if queueing fails
      }
    }

    return NextResponse.json({ success: true, submission })
  } catch (error) {
    console.error('Error submitting form:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
