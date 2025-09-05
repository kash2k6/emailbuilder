"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getWhopProduct } from "@/lib/whop-api"

interface ProductPreviewProps {
  productId: string
}

export function ProductPreview({ productId }: ProductPreviewProps) {
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const productData = await getWhopProduct(productId)

        if (!productData || !productData.data) {
          throw new Error("Invalid product data received")
        }

        setProduct(productData.data)
      } catch (error) {
        console.error("Error fetching product:", error)
        setError("Failed to load product details. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  if (!productId) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!product) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">No product information available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {product.image && (
            <img
              src={product.image || "/placeholder.svg?height=64&width=64"}
              alt={product.title}
              className="w-16 h-16 object-cover rounded-md"
            />
          )}
          <div>
            <h3 className="font-medium">{product.title}</h3>
            <p className="text-sm text-muted-foreground">{product.description}</p>
            <div className="mt-2 font-medium">
              {product.price?.amount} {product.price?.currency}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
