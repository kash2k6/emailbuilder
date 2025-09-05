"use client"

import { AdvancedEmailDesigner } from './advanced-email-designer'

interface EmailDesignerProps {
  onSave?: (data: any) => void;
  initialData?: any;
  className?: string;
}

export default function EmailDesigner({ 
  onSave, 
  initialData, 
  className 
}: EmailDesignerProps) {
  return (
    <div className={`w-full h-screen ${className || ''}`}>
      <AdvancedEmailDesigner 
        onSave={onSave}
        initialData={initialData}
        className="w-full h-full"
      />
    </div>
  )
}