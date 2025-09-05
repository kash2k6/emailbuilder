import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all CSV exports
    const { data: csvExports, error } = await supabase
      .from('csv_exports')
      .select(`
        *,
        batch_jobs!inner(whop_user_id, list_name),
        email_audiences!inner(name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching CSV exports:', error)
      return NextResponse.json({ error: 'Failed to fetch CSV exports' }, { status: 500 })
    }

    return NextResponse.json({ csvExports })
  } catch (error) {
    console.error('Error in CSV exports API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { csvExportId } = await request.json()

    if (!csvExportId) {
      return NextResponse.json({ error: 'Missing CSV export ID' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the specific CSV export
    const { data: csvExport, error } = await supabase
      .from('csv_exports')
      .select('*')
      .eq('id', csvExportId)
      .single()

    if (error || !csvExport) {
      return NextResponse.json({ error: 'CSV export not found' }, { status: 404 })
    }

    // Mark as downloaded
    await supabase
      .from('csv_exports')
      .update({ status: 'downloaded' })
      .eq('id', csvExportId)

    // Return the CSV content
    return NextResponse.json({
      csvContent: csvExport.csv_content,
      audienceName: csvExport.audience_name,
      contactCount: csvExport.contact_count,
      jobId: csvExport.job_id
    })

  } catch (error) {
    console.error('Error downloading CSV export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
