import type React from "react"
interface DashboardHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
}

export function DashboardHeader({ heading, text, children }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-2 mb-8 animate-slide-up">
      <div className="grid gap-2 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          {heading}
        </h1>
        {text && (
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {text}
          </p>
        )}
      </div>
      {children && (
        <div className="flex w-full sm:w-auto justify-center sm:justify-end">
          {children}
        </div>
      )}
    </div>
  )
}
