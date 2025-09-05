import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface ExportRequest {
  audienceId: string
  whopUserId: string
  format?: 'csv' | 'json'
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json()
    const { audienceId, whopUserId, format = 'csv' } = body

    if (!audienceId || !whopUserId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = createClient()

    // Verify user owns this audience
    const { data: audience, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('id', audienceId)
      .single()

    if (audienceError || !audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 })
    }

    // Get all contacts for this audience
    const { data: contacts, error: contactsError } = await supabase
      .from('email_contacts')
      .select('*')
      .eq('audience_id', audienceId)
      .eq('is_subscribed', true)

    if (contactsError) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts found in this audience' }, { status: 404 })
    }

    let exportData: string
    let contentType: string
    let filename: string

    if (format === 'csv') {
      exportData = generateCSV(contacts, audience.name)
      contentType = 'text/csv'
      filename = `${audience.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`
    } else {
      exportData = JSON.stringify(contacts, null, 2)
      contentType = 'application/json'
      filename = `${audience.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`
    }

    // Return the data as a downloadable response
    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(exportData).toString()
      }
    })

  } catch (error) {
    console.error('Error exporting audience:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateCSV(contacts: any[], audienceName: string): string {
  const headers = ['Email', 'First Name', 'Last Name', 'Username', 'Product', 'Status', 'Created At', 'Expires At']
  
  const rows = contacts.map(contact => {
    const platformData = contact.platform_contact_data || {}
    return [
      contact.email,
      contact.first_name || '',
      contact.last_name || '',
      platformData.username || '',
      platformData.product || '',
      platformData.status || '',
      platformData.created_at || '',
      platformData.expires_at || ''
    ].map(field => `"${field}"`).join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
