import * as React from "react"
import { cn } from "@/lib/utils"

interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Steps({ children, className, ...props }: StepsProps) {
  const childrenArray = React.Children.toArray(children)
  const steps = childrenArray.map((step, index) => {
    if (React.isValidElement(step)) {
      return React.cloneElement(step, {
        stepNumber: index + 1,
        isLastStep: index === childrenArray.length - 1,
      })
    }
    return step
  })

  return (
    <div className={cn("space-y-8", className)} {...props}>
      {steps}
    </div>
  )
}

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  stepNumber?: number
  isLastStep?: boolean
}

export function Step({ title, stepNumber, isLastStep, children, className, ...props }: StepProps) {
  return (
    <div className={cn("relative", className)} {...props}>
      <div className="flex items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-orange-500 bg-background z-10">
          <span className="text-sm font-medium">{stepNumber}</span>
        </div>
        <h3 className="ml-3 text-lg font-medium">{title}</h3>
      </div>
      {children && <div className="ml-4 border-l-2 border-muted-foreground/20 pl-6 pt-2 pb-4">{children}</div>}
      {!isLastStep && <div className="absolute top-8 left-4 h-full w-0 -ml-px border-l-2 border-muted-foreground/20" />}
    </div>
  )
}
