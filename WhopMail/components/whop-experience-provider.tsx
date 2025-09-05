"use client"

import { createContext, useContext, ReactNode } from "react"

interface WhopContextType {
  experienceId: string | null
  whopToken: string
  whopUserId: string
  whopCompanyId: string | null
  isWhopContext: boolean
}

const WhopContext = createContext<WhopContextType | null>(null)

interface WhopExperienceProviderProps {
  experienceId: string | null
  whopToken: string
  whopUserId: string
  whopCompanyId: string | null
  children: ReactNode
}

export function WhopExperienceProvider({
  experienceId,
  whopToken,
  whopUserId,
  whopCompanyId,
  children,
}: WhopExperienceProviderProps) {
  const contextValue: WhopContextType = {
    experienceId,
    whopToken,
    whopUserId,
    whopCompanyId,
    isWhopContext: true,
  }

  return (
    <WhopContext.Provider value={contextValue}>
      {children}
    </WhopContext.Provider>
  )
}

export function useWhopContext() {
  const context = useContext(WhopContext)
  if (!context) {
    throw new Error("useWhopContext must be used within a WhopExperienceProvider")
  }
  return context
} 