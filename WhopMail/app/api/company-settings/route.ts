import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')

    if (!whopUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Whop user ID is required' 
      }, { status: 400 })
    }

    const supabase = createClient()

    // Get company settings from email_platform_configs
    const { data, error } = await supabase
      .from('email_platform_configs')
      .select(`
        company_name,
        company_address,
        company_website,
        company_phone,
        company_email,
        company_logo_url,
        footer_customization
      `)
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No config found, return default settings
        return NextResponse.json({
          success: true,
          settings: {
            company_name: '',
            company_address: '',
            company_website: '',
            company_phone: '',
            company_email: '',
            company_logo_url: '',
            footer_customization: {
              footer_style: {
                backgroundColor: '#f8f9fa',
                textColor: '#6c757d',
                linkColor: '#007bff',
                borderColor: '#e9ecef'
              },
              footer_content: {
                showCompanyInfo: true,
                showUnsubscribeLink: true,
                showViewInBrowser: true,
                showPoweredBy: false,
                customText: ''
              }
            }
          }
        })
      }
      
      console.error('Error fetching company settings:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch company settings' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: data
    })

  } catch (error) {
    console.error('Error in company settings GET:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { whopUserId, settings } = body

    if (!whopUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Whop user ID is required' 
      }, { status: 400 })
    }

    if (!settings.company_name?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Company name is required' 
      }, { status: 400 })
    }

    const supabase = createClient()

    // Check if config exists
    const { data: existingConfig, error: checkError } = await supabase
      .from('email_platform_configs')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .eq('platform_type', 'resend')
      .single()

    const updateData = {
      company_name: settings.company_name?.trim(),
      company_address: settings.company_address?.trim() || null,
      company_website: settings.company_website?.trim() || null,
      company_phone: settings.company_phone?.trim() || null,
      company_email: settings.company_email?.trim() || null,
      company_logo_url: settings.company_logo_url?.trim() || null,
      footer_customization: settings.footer_customization || {},
      updated_at: new Date().toISOString()
    }

    let result

    if (checkError && checkError.code === 'PGRST116') {
      // No config exists, create new one
      result = await supabase
        .from('email_platform_configs')
        .insert({
          whop_user_id: whopUserId,
          platform_type: 'resend',
          email_type: 'custom',
          from_email: 'noreply@example.com', // Will be updated when domain is set
          ...updateData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
    } else if (checkError) {
      console.error('Error checking existing config:', checkError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check existing configuration' 
      }, { status: 500 })
    } else {
      // Config exists, update it
      result = await supabase
        .from('email_platform_configs')
        .update(updateData)
        .eq('id', existingConfig.id)
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error saving company settings:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save company settings' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: result.data
    })

  } catch (error) {
    console.error('Error in company settings POST:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 