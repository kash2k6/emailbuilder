"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import type { PageElement } from "@/types/page-builder"
import { initDataLayer, trackPurchase } from "@/lib/gtm"

interface PagePreviewProps {
  elements: PageElement[]
  className?: string
  isEditing?: boolean
  onElementClick?: (element: PageElement) => void
}

export function PagePreview({ elements, className, isEditing = false, onElementClick }: PagePreviewProps) {
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false)

  // Initialize the data layer when the component mounts
  React.useEffect(() => {
    initDataLayer()
  }, [])

  const handleButtonClick = async (element: PageElement) => {
    if (isEditing && onElementClick) {
      onElementClick(element)
      return
    }

    if (element.type === "button" && element.properties.action === "whop_checkout" && element.properties.productId) {
      try {
        setIsCreatingCheckout(true)

        const response = await fetch("/api/whop/create-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: element.properties.productId,
            successUrl: element.properties.successUrl,
            cancelUrl: element.properties.cancelUrl,
            upsellProductId: element.properties.upsellProductId,
            downsellProductId: element.properties.downsellProductId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to create checkout")
        }

        // Track the purchase event in GTM before redirecting
        trackPurchase({
          transactionId: data.sessionId || `checkout-${Date.now()}`,
          value: element.properties.price || 0,
          productId: element.properties.productId,
          productName: element.properties.productName || "Product",
        })

        // Redirect to the checkout URL
        window.location.href = data.checkoutUrl
      } catch (error) {
        console.error("Error creating checkout:", error)
        alert("Failed to create checkout. Please try again.")
      } finally {
        setIsCreatingCheckout(false)
      }
    } else if (element.type === "button" && element.properties.action === "link" && element.properties.link) {
      window.open(element.properties.link, "_blank")
    }
  }

  const renderElement = (element: PageElement) => {
    switch (element.type) {
      case "heading":
        return (
          <h2 className={cn("text-3xl font-bold", element.properties.className)} style={element.properties.style}>
            {element.properties.text || "Heading"}
          </h2>
        )
      case "paragraph":
        return (
          <p className={cn("text-base", element.properties.className)} style={element.properties.style}>
            {element.properties.text || "Paragraph text"}
          </p>
        )
      case "image":
        return (
          <img
            src={element.properties.src || "/placeholder.svg?height=200&width=400"}
            alt={element.properties.alt || "Image"}
            className={cn("max-w-full h-auto", element.properties.className)}
            style={element.properties.style}
          />
        )
      case "button":
        return (
          <button
            className={cn(
              "px-4 py-2 bg-orange-500 text-white rounded hover:bg-blue-600",
              isCreatingCheckout && "opacity-50 cursor-not-allowed",
              element.properties.className,
            )}
            style={element.properties.style}
            onClick={() => handleButtonClick(element)}
            disabled={isCreatingCheckout}
          >
            {isCreatingCheckout ? "Loading..." : element.properties.text || "Button"}
          </button>
        )
      case "divider":
        return (
          <hr
            className={cn("my-4 border-t border-gray-300", element.properties.className)}
            style={element.properties.style}
          />
        )
      case "spacer":
        return (
          <div
            className={cn("h-8", element.properties.className)}
            style={{
              height: `${element.properties.height || 32}px`,
              ...element.properties.style,
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {elements.map((element) => (
        <div
          key={element.id}
          className={cn("relative", isEditing && "hover:outline hover:outline-blue-500 cursor-pointer")}
          onClick={isEditing ? () => onElementClick && onElementClick(element) : undefined}
        >
          {renderElement(element)}
        </div>
      ))}
    </div>
  )
}
