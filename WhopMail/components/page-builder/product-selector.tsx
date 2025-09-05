"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { listWhopProducts } from "@/lib/whop-api"

interface Product {
  id: string
  title: string
}

interface ProductSelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ProductSelector({ value, onChange, placeholder = "Select a product" }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await listWhopProducts()

        if (!result || !result.data) {
          throw new Error("Failed to load products")
        }

        setProducts(
          result.data.map((product: any) => ({
            id: product.id,
            title: product.title || "Unnamed Product",
          })),
        )
      } catch (error) {
        console.error("Error fetching products:", error)
        setError("Failed to load products. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {products.length === 0 ? (
          <SelectItem value="no-products" disabled>
            No products available
          </SelectItem>
        ) : (
          products.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.title}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
