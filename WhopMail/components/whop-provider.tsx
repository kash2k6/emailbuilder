"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

interface WhopContextType {
  user: any | null
  company: any | null
  isLoading: boolean
}

const WhopContext = createContext<WhopContextType>({
  user: null,
  company: null,
  isLoading: true,
})

export function useWhop() {
  return useContext(WhopContext)
}

export function WhopProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize Whop SDK and get user/company data
    const initializeWhop = async () => {
      try {
        // This would typically use the Whop SDK to get current user/company
        // For now, we'll simulate loading
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Mock data - replace with actual Whop SDK calls
        setUser({
          id: "user_123",
          email: "user@example.com",
          username: "testuser",
        })

        setCompany({
          id: "company_123",
          name: "Test Company",
        })
      } catch (error) {
        console.error("Failed to initialize Whop:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeWhop()
  }, [])

  return (
    <WhopContext.Provider value={{ user, company, isLoading }}>
      {children}
    </WhopContext.Provider>
  )
}
