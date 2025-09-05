"use client"

import { EmailBuilderProvider } from '../contexts/email-builder-context'
import { EmailBuilderLayout } from './email-builder/email-builder-layout'

interface AdvancedEmailDesignerProps {
  onSave?: (data: any) => void;
  initialData?: any;
  className?: string;
}

export function AdvancedEmailDesigner({ 
  onSave, 
  initialData, 
  className 
}: AdvancedEmailDesignerProps) {
  return (
    <EmailBuilderProvider>
      <div className={`w-full h-full ${className || ''}`}>
        <EmailBuilderLayout />
      </div>
    </EmailBuilderProvider>
  )
}

export default AdvancedEmailDesigner