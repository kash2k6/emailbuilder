import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateEmailHTML } from '../../../../lib/react-email-generator';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      toEmail, 
      fromEmail, 
      subject, 
      elements, 
      emailWidth = 600,
      fromName = "WhopMail"
    } = body;

    if (!toEmail || !fromEmail || !subject || !elements) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate HTML using our React.email compatible generator
    const html = generateEmailHTML(elements, emailWidth);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        emailId: data?.id,
        message: 'Email sent successfully'
      }
    });

  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}