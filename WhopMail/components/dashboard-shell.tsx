import type React from "react"
import { Footer } from "./footer"

interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DashboardShell({ children }: React.PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col gradient-bg">
      <main className="flex-1 animate-fade-in">
        <div className="w-full py-8 md:py-12 px-4 md:px-6 space-y-modern">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
