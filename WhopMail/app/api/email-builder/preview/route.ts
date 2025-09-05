import { NextRequest, NextResponse } from 'next/server';
import { generateEmailHTML } from '../../../../lib/react-email-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { elements, emailWidth = 600 } = body;

    if (!elements) {
      return NextResponse.json(
        { success: false, error: 'Elements are required' },
        { status: 400 }
      );
    }

    // Generate HTML preview using our React.email compatible generator
    const html = generateEmailHTML(elements, emailWidth);

    return NextResponse.json({
      success: true,
      data: { html }
    });

  } catch (error) {
    console.error('Preview generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}