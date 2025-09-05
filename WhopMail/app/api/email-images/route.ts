import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Use service role key for admin access
    const supabase = createClient()
    
    // Get whop_user_id from query parameters
    const { searchParams } = new URL(request.url)
    const whopUserId = searchParams.get('whopUserId')
    
    if (!whopUserId) {
      return NextResponse.json({ error: 'Missing whop_user_id parameter' }, { status: 400 })
    }

    // Get URL parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Fetch user's images
    const { data: images, error: fetchError, count } = await supabase
      .from('email_images')
      .select('*', { count: 'exact' })
      .eq('whop_user_id', whopUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
    }

    // Get public URLs for all images and transform to camelCase
    const imagesWithUrls = images?.map(image => {
      const { data: { publicUrl } } = supabase.storage
        .from('email-images')
        .getPublicUrl(image.file_path)

      return {
        id: image.id,
        fileName: image.file_name,
        publicUrl,
        fileSize: image.file_size,
        mimeType: image.mime_type,
        width: image.width,
        height: image.height,
        altText: image.alt_text,
        createdAt: image.created_at
      }
    }) || []

    return NextResponse.json({
      success: true,
      images: imagesWithUrls,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Fetch images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Use service role key for admin access
    const supabase = createClient()
    
    const { imageId, whopUserId } = await request.json()

    if (!imageId || !whopUserId) {
      return NextResponse.json({ error: 'Missing imageId or whopUserId' }, { status: 400 })
    }

    // Get image details first
    const { data: image, error: fetchError } = await supabase
      .from('email_images')
      .select('*')
      .eq('id', imageId)
      .eq('whop_user_id', whopUserId)
      .single()

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('email-images')
      .remove([image.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      return NextResponse.json({ error: 'Failed to delete image from storage' }, { status: 500 })
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('email_images')
      .delete()
      .eq('id', imageId)
      .eq('whop_user_id', whopUserId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return NextResponse.json({ error: 'Failed to delete image metadata' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Delete image error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
