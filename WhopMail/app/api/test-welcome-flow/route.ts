import { NextRequest, NextResponse } from 'next/server'
import { addUserToFlow, sendFlowEmailStep } from '@/app/actions/emailsync'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing 5-email welcome flow system...')
    
    const { whopUserId, userEmail, userData } = await request.json()
    
    if (!whopUserId || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing whopUserId or userEmail' 
      }, { status: 400 })
    }
    
    console.log(`📧 Adding user ${userEmail} to welcome flow...`)
    
    // Step 1: Add user to flow (using real flow ID from database)
    const addResult = await addUserToFlow({
      whopUserId,
      flowId: 'bf7fdbee-2cc9-4c81-8e7a-b353bef2acfb', // Real flow ID
      userEmail,
      userData: userData || { firstName: 'Test', lastName: 'User' }
    })
    
    if (!addResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to add user to flow: ${addResult.error}` 
      }, { status: 500 })
    }
    
    console.log(`✅ User ${userEmail} added to welcome flow`)
    
    // Step 2: Send all 5 emails with 1-minute delays
    const emails = [
      {
        step: 1,
        subject: '🎉 Welcome to Our Platform!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to Our Platform!</h1>
            <p>Hi ${userData?.firstName || 'there'},</p>
            <p>Welcome to our platform! We're excited to have you on board.</p>
            <p>This is email 1 of 5 in your welcome series.</p>
            <p>Stay tuned for more helpful tips and guides!</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `
Welcome to Our Platform!

Hi ${userData?.firstName || 'there'},

Welcome to our platform! We're excited to have you on board.

This is email 1 of 5 in your welcome series.

Stay tuned for more helpful tips and guides!

Best regards,
The Team
        `
      },
      {
        step: 2,
        subject: '📚 Getting Started Guide',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Getting Started Guide</h1>
            <p>Hi ${userData?.firstName || 'there'},</p>
            <p>Ready to get started? Here's your comprehensive guide:</p>
            <ul>
              <li>Complete your profile setup</li>
              <li>Explore our main features</li>
              <li>Connect with other members</li>
            </ul>
            <p>This is email 2 of 5 in your welcome series.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `
Getting Started Guide

Hi ${userData?.firstName || 'there'},

Ready to get started? Here's your comprehensive guide:

- Complete your profile setup
- Explore our main features
- Connect with other members

This is email 2 of 5 in your welcome series.

Best regards,
The Team
        `
      },
      {
        step: 3,
        subject: '🚀 Advanced Features',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Advanced Features</h1>
            <p>Hi ${userData?.firstName || 'there'},</p>
            <p>Now that you're comfortable with the basics, let's explore some advanced features:</p>
            <ul>
              <li>Custom integrations</li>
              <li>Advanced analytics</li>
              <li>Team collaboration tools</li>
            </ul>
            <p>This is email 3 of 5 in your welcome series.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `
Advanced Features

Hi ${userData?.firstName || 'there'},

Now that you're comfortable with the basics, let's explore some advanced features:

- Custom integrations
- Advanced analytics
- Team collaboration tools

This is email 3 of 5 in your welcome series.

Best regards,
The Team
        `
      },
      {
        step: 4,
        subject: '💡 Pro Tips & Best Practices',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Pro Tips & Best Practices</h1>
            <p>Hi ${userData?.firstName || 'there'},</p>
            <p>Want to get the most out of our platform? Here are some pro tips:</p>
            <ul>
              <li>Set up automated workflows</li>
              <li>Use keyboard shortcuts</li>
              <li>Join our community forums</li>
            </ul>
            <p>This is email 4 of 5 in your welcome series.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `
Pro Tips & Best Practices

Hi ${userData?.firstName || 'there'},

Want to get the most out of our platform? Here are some pro tips:

- Set up automated workflows
- Use keyboard shortcuts
- Join our community forums

This is email 4 of 5 in your welcome series.

Best regards,
The Team
        `
      },
      {
        step: 5,
        subject: '🎯 You\'re All Set!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">You're All Set!</h1>
            <p>Hi ${userData?.firstName || 'there'},</p>
            <p>Congratulations! You've completed your welcome series.</p>
            <p>You now have access to all our features and are ready to succeed!</p>
            <p>If you need any help, our support team is always here for you.</p>
            <p>This was email 5 of 5 in your welcome series.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `
You're All Set!

Hi ${userData?.firstName || 'there'},

Congratulations! You've completed your welcome series.

You now have access to all our features and are ready to succeed!

If you need any help, our support team is always here for you.

This was email 5 of 5 in your welcome series.

Best regards,
The Team
        `
      }
    ]
    
    const results = []
    
    for (const email of emails) {
      console.log(`📤 Sending flow email step ${email.step} to ${userEmail}...`)
      
      const sendResult = await sendFlowEmailStep({
        whopUserId,
        flowId: 'bf7fdbee-2cc9-4c81-8e7a-b353bef2acfb', // Real flow ID
        emailStep: email.step,
        subject: email.subject,
        html: email.html,
        text: email.text,
        fromEmail: 'noreply@whopmail.com'
      })
      
      if (!sendResult.success) {
        return NextResponse.json({ 
          success: false, 
          error: `Failed to send flow email step ${email.step}: ${sendResult.error}` 
        }, { status: 500 })
      }
      
      results.push({
        step: email.step,
        success: true,
        sentCount: sendResult.sentCount
      })
      
      console.log(`✅ Flow email step ${email.step} sent successfully`)
      
      // Wait 1 minute before sending next email (except for the last one)
      if (email.step < 5) {
        console.log(`⏳ Waiting 1 minute before sending step ${email.step + 1}...`)
        await new Promise(resolve => setTimeout(resolve, 60000)) // 60 seconds
      }
    }
    
    console.log(`🎉 All 5 welcome flow emails sent successfully to ${userEmail}`)
    
    return NextResponse.json({
      success: true,
      message: `All 5 welcome flow emails sent to ${userEmail}`,
      results: results
    })
    
  } catch (error) {
    console.error('Error in test welcome flow:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 