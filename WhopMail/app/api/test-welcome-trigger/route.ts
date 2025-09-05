import { NextRequest, NextResponse } from 'next/server'
import { addUserToTrigger, sendTriggerEmail } from '@/app/actions/emailsync'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing welcome email trigger system...')
    
    const { whopUserId, userEmail, userData } = await request.json()
    
    if (!whopUserId || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing whopUserId or userEmail' 
      }, { status: 400 })
    }
    
    console.log(`📧 Adding user ${userEmail} to welcome trigger...`)
    
    // Step 1: Add user to trigger (using real trigger ID from database)
    const addResult = await addUserToTrigger({
      whopUserId,
      triggerType: 'dd0aba8a-c42a-4ce5-8ba9-dbd5d39b5b7b', // Real trigger ID
      userEmail,
      userData: userData || { firstName: 'Test', lastName: 'User' }
    })
    
    if (!addResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to add user to trigger: ${addResult.error}` 
      }, { status: 500 })
    }
    
    console.log(`✅ User ${userEmail} added to welcome trigger`)
    
    // Step 2: Send welcome email
    console.log(`📤 Sending welcome email to ${userEmail}...`)
    
    const sendResult = await sendTriggerEmail({
      whopUserId,
      triggerType: 'dd0aba8a-c42a-4ce5-8ba9-dbd5d39b5b7b', // Real trigger ID
      subject: '🎉 Welcome to Our Platform!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Our Platform!</h1>
          <p>Hi ${userData?.firstName || 'there'},</p>
          <p>Thank you for joining our platform! We're excited to have you on board.</p>
          <p>Here are some things you can do to get started:</p>
          <ul>
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Join our community</li>
          </ul>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `,
      text: `
Welcome to Our Platform!

Hi ${userData?.firstName || 'there'},

Thank you for joining our platform! We're excited to have you on board.

Here are some things you can do to get started:
- Complete your profile
- Explore our features
- Join our community

If you have any questions, feel free to reach out to our support team.

Best regards,
The Team
      `,
      fromEmail: 'noreply@whopmail.com'
    })
    
    if (!sendResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to send welcome email: ${sendResult.error}` 
      }, { status: 500 })
    }
    
    console.log(`🎉 Welcome email sent successfully to ${userEmail}`)
    
    return NextResponse.json({
      success: true,
      message: `Welcome email sent to ${userEmail}`,
      sentCount: sendResult.sentCount
    })
    
  } catch (error) {
    console.error('Error in test welcome trigger:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 