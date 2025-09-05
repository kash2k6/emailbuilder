import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateEmailHTML } from '../../../../lib/react-email-generator';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      toEmail, 
      elements, 
      emailWidth = 600,
      fromEmail = "test@resend.dev",
      fromName = "WhopMail Test"
    } = body;

    if (!toEmail || !elements) {
      return NextResponse.json(
        { success: false, error: 'Email and elements are required' },
        { status: 400 }
      );
    }

    // Generate HTML using our React.email compatible generator
    const html = generateEmailHTML(elements, emailWidth);

    // Send test email using Resend
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      subject: `Test Email - ${emailWidth}px Width`,
      html: html,
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        emailId: data?.id,
        message: 'Test email sent successfully',
        previewHtml: html
      }
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}