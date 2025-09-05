import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Use service role key for admin access
    const supabase = createClient()
    
    // Get whop_user_id from request body or headers
    const formData = await request.formData()
    const file = formData.get('file') as File
    const altText = formData.get('altText') as string
    const whopUserId = formData.get('whopUserId') as string

    if (!whopUserId) {
      return NextResponse.json({ error: 'Missing whop_user_id' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${whopUserId}/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('email-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get image dimensions if possible
    let width = null
    let height = null
    
    if (file.type !== 'image/svg+xml') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Simple dimension detection for common formats
        if (file.type === 'image/jpeg' || file.type === 'image/png') {
          const view = new DataView(uint8Array.buffer)
          
          if (file.type === 'image/jpeg') {
            // JPEG dimension detection
            let i = 2
            while (i < uint8Array.length - 2) {
              if (uint8Array[i] === 0xFF && uint8Array[i + 1] === 0xC0) {
                height = view.getUint16(i + 5, false)
                width = view.getUint16(i + 7, false)
                break
              }
              i++
            }
          } else if (file.type === 'image/png') {
            // PNG dimension detection
            if (uint8Array.length >= 24) {
              width = view.getUint32(16, false)
              height = view.getUint32(20, false)
            }
          }
        }
      } catch (error) {
        console.warn('Could not detect image dimensions:', error)
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('email-images')
      .getPublicUrl(fileName)

    // Save image metadata to database
    const { data: imageData, error: dbError } = await supabase
      .from('email_images')
      .insert({
        whop_user_id: whopUserId,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        width,
        height,
        alt_text: altText || ''
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('email-images').remove([fileName])
      return NextResponse.json({ error: 'Failed to save image metadata' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      image: {
        id: imageData.id,
        fileName: file.name,
        publicUrl,
        fileSize: file.size,
        mimeType: file.type,
        width,
        height,
        altText: altText || ''
      }
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
