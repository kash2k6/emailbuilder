'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Upload, Image as ImageIcon, Trash2, Copy, ExternalLink, X } from 'lucide-react'

interface EmailImage {
  id: string
  fileName: string
  publicUrl: string
  fileSize: number
  mimeType: string
  width?: number
  height?: number
  altText: string
  createdAt: string
}

interface EmailImageUploadProps {
  onImageSelect?: (image: EmailImage) => void
  onImageRemove?: (imageId: string) => void
  selectedImages?: EmailImage[]
  multiple?: boolean
  whopUserId?: string
  autoInsert?: boolean
}

export function EmailImageUpload({ 
  onImageSelect, 
  onImageRemove, 
  selectedImages = [], 
  multiple = false,
  whopUserId,
  autoInsert = false
}: EmailImageUploadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [images, setImages] = useState<EmailImage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Fetch images on component mount and when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchImages()
    }
  }, [isOpen, page])

  const fetchImages = async (retryCount = 0) => {
    try {
      setLoading(true)
      if (!whopUserId) {
        console.error('No whopUserId provided to EmailImageUpload')
        return
      }
      
      const response = await fetch(`/api/email-images?page=${page}&limit=20&whopUserId=${whopUserId}`)
      const data = await response.json()

      if (data.success) {
        if (page === 1) {
          setImages(data.images)
        } else {
          setImages(prev => [...prev, ...data.images])
        }
        setHasMore(data.pagination.page < data.pagination.totalPages)
      } else {
        // Retry logic for bucket loading issues
        if (retryCount < 3 && (data.error?.includes('bucket') || data.error?.includes('storage'))) {
          console.log(`Retrying fetchImages, attempt ${retryCount + 1}`)
          setTimeout(() => fetchImages(retryCount + 1), 1000 * (retryCount + 1)) // Exponential backoff
          return
        }
        
        toast({
          title: "Error",
          description: data.error || "Failed to fetch images",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching images:', error)
      
      // Retry logic for network errors
      if (retryCount < 3) {
        console.log(`Retrying fetchImages due to network error, attempt ${retryCount + 1}`)
        setTimeout(() => fetchImages(retryCount + 1), 1000 * (retryCount + 1)) // Exponential backoff
        return
      }
      
      toast({
        title: "Error",
        description: "Failed to fetch images after multiple attempts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only images (JPEG, PNG, GIF, WebP, SVG) are allowed",
        variant: "destructive"
      })
      return
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      })
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)
      
      if (!whopUserId) {
        console.error('No whopUserId provided for upload')
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('altText', file.name)
      formData.append('whopUserId', whopUserId)

      const response = await fetch('/api/email-images/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Image uploaded successfully"
        })
        
        // Refresh images list
        setPage(1)
        await fetchImages()
        
        // Auto-select if single selection mode or auto-insert is enabled
        if ((!multiple && onImageSelect) || (autoInsert && onImageSelect)) {
          onImageSelect(data.image)
          setIsOpen(false)
        }
      } else {
        toast({
          title: "Upload failed",
          description: data.error || "Failed to upload image",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
      if (!whopUserId) {
        console.error('No whopUserId provided for delete')
        return
      }
      const response = await fetch('/api/email-images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageId, whopUserId })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Image deleted successfully"
        })
        
        // Remove from local state
        setImages(prev => prev.filter(img => img.id !== imageId))
        
        // Remove from selected images if present
        if (onImageRemove) {
          onImageRemove(imageId)
        }
      } else {
        toast({
          title: "Delete failed",
          description: data.error || "Failed to delete image",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Delete failed",
        description: "Failed to delete image",
        variant: "destructive"
      })
    }
  }

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({
      title: "Copied",
      description: "Image URL copied to clipboard"
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const isImageSelected = (imageId: string) => {
    return selectedImages.some(img => img.id === imageId)
  }

  return (
    <div className="space-y-4">
      {/* Selected Images Display */}
      {selectedImages.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Images ({selectedImages.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {selectedImages.map((image) => (
              <div key={image.id} className="relative group">
                                  <img
                    src={image.publicUrl}
                                          alt={image.altText || image.fileName}
                  className="w-full h-20 object-cover rounded border"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onImageRemove?.(image.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <ImageIcon className="h-4 w-4 mr-2" />
            {selectedImages.length > 0 ? 'Manage Images' : 'Upload Images'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Images</DialogTitle>
            <DialogDescription>
              Upload and manage images for your email campaigns
            </DialogDescription>
          </DialogHeader>

          {/* Upload Section */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <Label htmlFor="image-upload" className="cursor-pointer">
                <span className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </span>
                <br />
                <span className="text-xs text-gray-500">
                  PNG, JPG, GIF, WebP, SVG up to 5MB
                </span>
              </Label>
              <Input
                id="image-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </div>

          {/* Images Grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Your Images</h3>
              <Badge variant="secondary">
                {images.length} images
              </Badge>
            </div>

            {loading && page === 1 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading images...</p>
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No images uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image) => (
                  <Card 
                    key={image.id} 
                    className={`relative group ${
                      isImageSelected(image.id) ? 'ring-2 ring-orange-500' : ''
                    } ${autoInsert ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (autoInsert && onImageSelect) {
                        onImageSelect(image)
                        setIsOpen(false)
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="relative">
                        <img
                          src={image.publicUrl}
                          alt={image.altText || image.fileName}
                          className="w-full h-24 object-cover rounded"
                        />
                        
                        {/* Selection Overlay */}
                        {multiple && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              size="sm"
                              variant={isImageSelected(image.id) ? "destructive" : "default"}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isImageSelected(image.id)) {
                                  onImageRemove?.(image.id)
                                } else {
                                  onImageSelect?.(image)
                                }
                              }}
                            >
                              {isImageSelected(image.id) ? 'Remove' : 'Select'}
                            </Button>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyImageUrl(image.publicUrl)
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteImage(image.id)
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium truncate" title={image.fileName}>
                          {image.fileName}
                        </p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{formatFileSize(image.fileSize)}</span>
                          {image.width && image.height && (
                            <span>{image.width}×{image.height}</span>
                          )}
                        </div>
                        {onImageSelect && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              onImageSelect(image)
                              setIsOpen(false)
                            }}
                          >
                            Insert Image
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && !loading && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={loading}
                >
                  Load More Images
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
