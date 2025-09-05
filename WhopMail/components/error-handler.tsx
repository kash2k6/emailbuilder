"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ErrorHandler() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      let errorMessage = "An error occurred during authentication."

      switch (errorParam) {
        case "missing_code":
          errorMessage = "Authentication code is missing."
          break
        case "token_exchange":
          errorMessage = "Failed to exchange authentication code for token."
          break
        case "user_info":
          errorMessage = "Failed to retrieve user information."
          break
        case "membership_check":
          errorMessage = "Failed to verify membership status."
          break
        case "no_access":
          errorMessage = "You don't have access to this product. Please subscribe."
          break
        case "auth_error":
          errorMessage = "Authentication failed. Please try again."
          break
        case "server_error":
          errorMessage = "Server error occurred. Please try again later."
          break
        case "invalid_credentials":
          errorMessage = "Invalid email or password. Please try again."
          break
      }

      setError(errorMessage)
    }
  }, [searchParams])

  if (!error) return null

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}
