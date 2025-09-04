"use client"

import React, { useState, useEffect, useCallback } from 'react'

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Add CSS to override button text color
const buttonStyles = `
  .email-button {
    color: inherit !important;
  }
  .email-button span {
    color: inherit !important;
  }
  .email-button * {
    color: inherit !important;
  }
  .email-preview .email-button {
    color: inherit !important;
  }
  .email-preview .email-button * {
    color: inherit !important;
  }
  .button-text {
    color: inherit !important;
  }
  .email-preview .button-text {
    color: inherit !important;
  }
  .email-preview.dark .button-text {
    color: inherit !important;
  }
  .email-preview.light .button-text {
    color: inherit !important;
  }
  .email-button[data-text-color] {
    color: var(--button-text-color) !important;
  }
  .email-button[data-text-color] * {
    color: var(--button-text-color) !important;
  }
`
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Type, 
  Image as ImageIcon, 
  Square, 
  Minus, 
  Plus,
  Move, 
  Trash2, 
  Copy,
  Send,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
  FolderOpen,
  Star,
  MoreHorizontal,
  RefreshCw,
  Bold,
  Italic,
  List,
  ListOrdered,
  Columns,
  Quote,
  Link,
  Unlink,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { EmailWidthSelector } from '@/components/email-width-selector'
import { EmailImageUpload } from '@/components/email-image-upload'

interface EmailElement {
  id: string
  type: 'text' | 'button' | 'image' | 'divider' | 'spacer' | 'footer' | 'header' | 'columns' | 'embed' | 'list'
  content: string
  styles: Record<string, string>
  properties: Record<string, any>
  children?: EmailElement[] // For columns to contain other elements
}

const FONT_OPTIONS = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: 'Comic Sans MS, cursive', label: 'Comic Sans MS' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Lucida Console, monospace', label: 'Lucida Console' },
  { value: 'Palatino, serif', label: 'Palatino' },
  { value: 'Garamond, serif', label: 'Garamond' },
  { value: 'Bookman, serif', label: 'Bookman' },
  { value: 'Avant Garde, sans-serif', label: 'Avant Garde' },
  { value: 'Arial Black, sans-serif', label: 'Arial Black' },
  { value: 'Arial Narrow, sans-serif', label: 'Arial Narrow' },
  { value: 'Century Gothic, sans-serif', label: 'Century Gothic' },
  { value: 'Franklin Gothic Medium, sans-serif', label: 'Franklin Gothic' },
  { value: 'Gill Sans, sans-serif', label: 'Gill Sans' }
]

interface RichTextToolbarProps {
  onFormat: (format: string) => void
  onAlign: (alignment: string) => void
  currentAlignment?: string
}

function RichTextToolbar({ onFormat, onAlign, currentAlignment = 'left' }: RichTextToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50 dark:bg-muted/30">
        {/* Text Formatting */}
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('🔧 Bold button clicked!')
                  onFormat('bold')
                }}
                className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bold (Ctrl+B)</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat('italic')}
                className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Italic (Ctrl+I)</p>
            </TooltipContent>
          </Tooltip>
        </div>



        {/* Alignment */}
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentAlignment === 'left' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onAlign('left')}
                className="h-8 w-8 p-0"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Align Left</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentAlignment === 'center' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onAlign('center')}
                className="h-8 w-8 p-0"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Align Center</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentAlignment === 'right' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onAlign('right')}
                className="h-8 w-8 p-0"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Align Right</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Special Formatting */}
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat('quote')}
                className="h-8 w-8 p-0"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Quote Block</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFormat('columns')}
                className="h-8 w-8 p-0"
              >
                <Columns className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Two Columns</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Debug Button */}
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('🔧 Debug button clicked!')
                  if (typeof window !== 'undefined' && (window as any).debugTextFormatting) {
                    (window as any).debugTextFormatting()
                  }
                }}
                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Debug Text Selection</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Test Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('🔧 Test button clicked!')
                  const testText = `This is **bold text** and this is *italic text*.

Here's a bullet list:
- First item
- Second item
- Third item

Here's a numbered list:
1. First step
2. Second step
3. Third step

Here's a quote:
> This is a quoted text block

This should all render properly in the preview!`
                  
                  // Find the current textarea and update it
                  const textarea = document.querySelector('textarea') as HTMLTextAreaElement
                  if (textarea) {
                    textarea.value = testText
                    // Trigger the onChange event
                    const event = new Event('input', { bubbles: true })
                    textarea.dispatchEvent(event)
                    console.log('🔧 Test text inserted!')
                  }
                }}
                className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Insert Test Text</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}

interface EmailDesignerProps {
  onSend: (emailData: { 
    subject: string; 
    html: string; 
    text: string; 
    error?: string; 
    selectedAudienceId?: string;
    scheduledAt?: string;
    emailWidth?: number;
  }) => void
  initialSubject?: string
  selectedAudienceId?: string
  whopUserId?: string
  isSending?: boolean
  availableAudiences?: Array<{ id: string; name: string; member_count: number }>
}

export function EmailDesigner({ onSend, initialSubject = '', selectedAudienceId = '', whopUserId, isSending = false, availableAudiences = [] }: EmailDesignerProps) {
  // Debug logging
  console.log('EmailDesigner render - whopUserId:', whopUserId)
  
  // Auto-save functionality
  const AUTO_SAVE_KEY = `email-designer-draft-${whopUserId || 'anonymous'}`
  const AUTO_SAVE_INTERVAL = 5000 // 5 seconds
  
  // State to track if there's a saved draft
  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  
  // Load initial state from saved draft or use defaults
  const [elements, setElements] = useState<EmailElement[]>([
    {
      id: '1',
      type: 'text',
      content: 'Welcome to our newsletter!',
      styles: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'var(--foreground)',
        textAlign: 'center',
        margin: '20px 0',
        backgroundColor: 'transparent'
      },
      properties: {}
    },
    {
      id: '2',
      type: 'text',
      content: 'This is a **bold text** example and this is *italic text*.\n\nHere\'s a list:\n- First item\n- Second item\n- Third item\n\nUse double line breaks for new paragraphs.',
      styles: {
        fontSize: '16px',
        color: 'var(--foreground)',
        lineHeight: '1.6',
        margin: '15px 0',
        backgroundColor: 'transparent'
      },
      properties: {}
    },
    {
      id: '3',
      type: 'footer',
      content: 'Footer content will be generated automatically',
      styles: {
        fontSize: '14px',
        color: 'var(--muted-foreground)',
        textAlign: 'center',
        margin: '20px 0',
        padding: '20px 0',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'transparent'
      },
      properties: {}
    }
  ])
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [selectedNestedElement, setSelectedNestedElement] = useState<{parentId: string, childId: string} | null>(null)
  const [subject, setSubject] = useState(initialSubject)
  const [previewMode, setPreviewMode] = useState(false)
  
  // Sync subject with initialSubject prop
  useEffect(() => {
    setSubject(initialSubject)
  }, [initialSubject])
  const [emailPreviewTheme, setEmailPreviewTheme] = useState<'light' | 'dark'>('dark')
  
  // Template state
  const [templates, setTemplates] = useState<any[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [processedHtmlContent, setProcessedHtmlContent] = useState<string | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editingTemplateName, setEditingTemplateName] = useState('')
  const [editingTemplateDescription, setEditingTemplateDescription] = useState('')
  const [editingTemplateCategory, setEditingTemplateCategory] = useState('general')
  
  // Import HTML state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importHtmlContent, setImportHtmlContent] = useState('')
  const [importSubject, setImportSubject] = useState('')
  const [importTemplateName, setImportTemplateName] = useState('')
  const [importTemplateDescription, setImportTemplateDescription] = useState('')
  const [importTemplateCategory, setImportTemplateCategory] = useState('general')
  const [importMethod, setImportMethod] = useState<'paste' | 'file'>('paste')
  
  // Audience selection state
  const [internalSelectedAudienceId, setInternalSelectedAudienceId] = useState<string>(selectedAudienceId || '')
  
  // Sync internalSelectedAudienceId with prop
  useEffect(() => {
    setInternalSelectedAudienceId(selectedAudienceId || '')
  }, [selectedAudienceId])

  // Email width state
  const [emailWidth, setEmailWidth] = useState<number>(600)
  const [showTemplateVariables, setShowTemplateVariables] = useState(false)
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  // Scheduling state
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [scheduleType, setScheduleType] = useState<"immediate" | "custom" | "preset">("immediate")
  const [presetSchedule, setPresetSchedule] = useState<string>("")

  // Set default date and time for scheduling
  useEffect(() => {
    if (scheduleType === "custom" && !scheduledDate) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setScheduledDate(tomorrow.toISOString().split('T')[0])
      setScheduledTime("09:00")
    }
  }, [scheduleType, scheduledDate])

  // Helper function to sync audience count from Resend
  const syncAudienceCount = async (audienceId: string) => {
    try {
      const response = await fetch('/api/admin/sync-audience-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audienceId }),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh the available audiences to show updated count
        window.location.reload()
      } else {
        console.error('Failed to sync count:', data.error)
      }
    } catch (error) {
      console.error('Error syncing count:', error)
    }
  }

  // Helper function to format scheduled time for Resend
  const formatScheduledTime = (): string | undefined => {
    // Check if scheduling is enabled (not immediate)
    if (scheduleType === "immediate") return undefined
    
    if (scheduleType === "preset" && presetSchedule) {
      // Convert preset values to proper ISO date strings
      const now = new Date()
      let scheduledDate: Date
      
      switch (presetSchedule) {
        case "in 1 hour":
          scheduledDate = new Date(now.getTime() + 60 * 60 * 1000)
          break
        case "in 2 hours":
          scheduledDate = new Date(now.getTime() + 2 * 60 * 60 * 1000)
          break
        case "in 4 hours":
          scheduledDate = new Date(now.getTime() + 4 * 60 * 60 * 1000)
          break
        case "in 6 hours":
          scheduledDate = new Date(now.getTime() + 6 * 60 * 60 * 1000)
          break
        case "in 12 hours":
          scheduledDate = new Date(now.getTime() + 12 * 60 * 60 * 1000)
          break
        case "tomorrow at 9am":
          scheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          scheduledDate.setHours(9, 0, 0, 0)
          break
        case "tomorrow at 2pm":
          scheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          scheduledDate.setHours(14, 0, 0, 0)
          break
        case "next monday at 9am":
          scheduledDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          // Find next Monday
          while (scheduledDate.getDay() !== 1) { // 1 = Monday
            scheduledDate.setDate(scheduledDate.getDate() + 1)
          }
          scheduledDate.setHours(9, 0, 0, 0)
          break
        default:
          return undefined
      }
      
      return scheduledDate.toISOString()
    }
    
    if (scheduleType === "custom" && scheduledDate && scheduledTime) {
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      return dateTime.toISOString()
    }
    
    return undefined
  }

  // Auto-save functionality
  const saveDraft = useCallback((currentElements: EmailElement[], currentSubject: string) => {
    try {
      const draft = {
        elements: currentElements,
        subject: currentSubject,
        timestamp: new Date().toISOString(),
        whopUserId
      }
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft))
      console.log('Auto-saved draft at:', new Date().toISOString())
    } catch (error) {
      console.warn('Failed to save draft:', error)
    }
  }, [whopUserId, AUTO_SAVE_KEY])

  // Load saved draft on component mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(AUTO_SAVE_KEY)
        if (saved) {
          const draft = JSON.parse(saved)
          if (draft.elements && draft.elements.length > 0) {
            setElements(draft.elements)
            setSubject(draft.subject || initialSubject)
            setHasSavedDraft(true)
          }
        }
      } catch (error) {
        console.warn('Failed to load saved draft:', error)
      }
    }
  }, [AUTO_SAVE_KEY, initialSubject])

  // Debounced auto-save to prevent too frequent saves
  const debouncedSave = useCallback(
    debounce((currentElements: EmailElement[], currentSubject: string) => {
      if (currentElements.length > 0) {
        saveDraft(currentElements, currentSubject)
      }
    }, 2000), // 2 second debounce
    [saveDraft]
  )

  // Auto-save effect - triggers every 5 seconds when elements or subject change
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const interval = setInterval(() => {
      if (elements.length > 0) {
        saveDraft(elements, subject)
      }
    }, AUTO_SAVE_INTERVAL)
    
    return () => clearInterval(interval)
  }, [elements, subject, saveDraft, AUTO_SAVE_INTERVAL])

  // Debounced auto-save on changes
  useEffect(() => {
    if (elements.length > 0) {
      debouncedSave(elements, subject)
    }
  }, [elements, subject, debouncedSave])

  const addElement = (type: EmailElement['type'], parentId?: string) => {
    const newElement: EmailElement = {
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: '',
      styles: {},
      properties: {}
    }

    switch (type) {
      case 'text':
        newElement.content = 'Enter your text here...'
        newElement.properties = {
          fontSize: '16px',
          color: '#333333',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'left',
          fontWeight: 'normal'
        }
        newElement.styles = {
          lineHeight: '1.6',
          margin: '15px 0',
          backgroundColor: 'transparent'
        }
        break
      case 'button':
        newElement.content = 'Click Here'
        newElement.properties = {
          text: 'Click Here',
          url: '#',
          color: '#007bff',
          textColor: '#ffffff',
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          padding: '12px 24px',
          width: 'auto'
        }
        newElement.styles = {
          margin: '20px 0',
          backgroundColor: 'transparent'
        }
        break
      case 'image':
        newElement.content = ''
        newElement.properties = {
          src: '',
          alt: '',
          width: 600,
          height: 300
        }
        newElement.styles = {
          textAlign: 'center',
          margin: '20px 0',
          backgroundColor: 'transparent'
        }
        break
      case 'header':
        newElement.content = 'Header Text'
        newElement.properties = {
          fontSize: '24px',
          color: '#333333',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          fontWeight: 'bold'
        }
        newElement.styles = {
          margin: '20px 0',
          backgroundColor: 'transparent'
        }
        break
      case 'divider':
        newElement.content = ''
        newElement.styles = {
          borderTop: '1px solid #e0e0e0',
          margin: '20px 0',
          backgroundColor: 'transparent'
        }
        break
      case 'spacer':
        newElement.content = '20px'
        newElement.styles = {
          height: '20px',
          backgroundColor: 'transparent'
        }
        break
          case 'embed':
      newElement.content = ''
      newElement.properties = {
        type: 'html', // html, script, iframe, video, social
        html: '',
        script: '',
        url: '',
        width: 600,
        height: 400,
        fallbackText: 'Content not available'
      }
        newElement.styles = {
          textAlign: 'center',
          margin: '20px 0',
          backgroundColor: 'transparent'
        }
        break

      case 'columns':
        newElement.content = ''
        newElement.children = []
        newElement.styles = {
          display: 'flex',
          gap: '20px',
          margin: '20px 0',
          backgroundColor: 'transparent'
        }
        break
    }

    if (parentId) {
      // Add to a specific column
      setElements(prev => prev.map(el => {
        if (el.id === parentId && el.type === 'columns') {
          return {
            ...el,
            children: [...(el.children || []), newElement]
          }
        }
        return el
      }))
    } else {
      // Add to main elements list
      setElements(prev => [...prev, newElement])
    }
    setSelectedElement(newElement.id)
  }

  const addElementToColumn = (columnId: string, type: EmailElement['type'], column: 'left' | 'right' = 'left') => {
    const newElement: EmailElement = {
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
      properties: getDefaultProperties(type)
    }

    setElements(prev => prev.map(el => {
      if (el.id === columnId && el.type === 'columns') {
        const currentChildren = el.children || []
        let insertIndex: number
        
        if (column === 'left') {
          // Insert at the end of left column (even indices)
          const leftColumnElements = currentChildren.filter((_, index) => index % 2 === 0)
          insertIndex = leftColumnElements.length * 2
        } else {
          // Insert at the end of right column (odd indices)
          const rightColumnElements = currentChildren.filter((_, index) => index % 2 === 1)
          insertIndex = rightColumnElements.length * 2 + 1
        }
        
        const newChildren = [...currentChildren]
        newChildren.splice(insertIndex, 0, newElement)
        
        return {
          ...el,
          children: newChildren
        }
      }
      return el
    }))
    
    setSelectedElement(newElement.id)
  }

  const getDefaultStyles = (type: EmailElement['type']): Record<string, string> => {
    switch (type) {
      case 'text':
        return {
          fontSize: '16px',
          color: 'var(--foreground)',
          lineHeight: '1.6',
          margin: '15px 0',
          backgroundColor: 'transparent'
        }
      case 'button':
        return {
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-foreground)',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
          display: 'inline-block',
          fontSize: '16px',
          fontWeight: '600',
          textAlign: 'center',
          border: 'none',
          cursor: 'pointer'
        }
      case 'image':
        return {
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          margin: '20px auto'
        }
      case 'divider':
        return {
          height: '1px',
          backgroundColor: 'var(--border)',
          margin: '20px 0',
          border: 'none'
        }
      case 'spacer':
        return {
          height: '20px',
          backgroundColor: 'transparent'
        }
      case 'header':
        return {
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'var(--foreground)',
          textAlign: 'center',
          margin: '20px 0',
          padding: '20px 0',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'transparent'
        }
      case 'footer':
        return {
          fontSize: '14px',
          color: 'var(--muted-foreground)',
          textAlign: 'center',
          margin: '20px 0',
          padding: '20px 0',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'transparent'
        }
      default:
        return {}
    }
  }

  const getDefaultContent = (type: EmailElement['type']): string => {
    switch (type) {
      case 'text':
        return 'Welcome to our newsletter!\n\nThis is a **bold text** example and this is *italic text*.\n\nHere\'s a bullet list:\n- First item\n- Second item\n- Third item\n\nHere\'s a numbered list:\n1. First step\n2. Second step\n3. Third step\n\nHere\'s a quote:\n> This is an important quote that stands out from the rest of the content.\n\nUse the toolbar buttons above to format your text easily!'
      case 'button':
        return 'Click Here'
      case 'image':
        return 'https://via.placeholder.com/600x300'
      case 'divider':
        return ''
      case 'spacer':
        return ''
      case 'header':
        return ''
      case 'footer':
        return ''
      case 'columns':
        return '' // Columns will be containers for other elements
      default:
        return ''
    }
  }

  const getDefaultProperties = (type: EmailElement['type']) => {
    switch (type) {
      case 'text':
        return {
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          color: '#333333',
          textAlign: 'left',
          fontWeight: 'normal'
        }
      case 'button':
        return {
          text: 'Click Here',
          url: '#',
          alignment: 'center',
          verticalPosition: 'middle',
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          padding: '12px 24px',
          width: 'auto',
          textColor: '#ffffff'
        }
      case 'image':
        return {
          src: 'https://via.placeholder.com/600x300',
          alt: 'Image',
          width: 600,
          height: 300
        }
      case 'divider':
        return {}
      case 'spacer':
        return {}
      case 'header':
        return {
          fontSize: '24px',
          color: '#333333',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          fontWeight: 'bold'
        }
      case 'footer':
        return {
          fontSize: '14px',
          color: '#666666',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          fontWeight: 'normal'
        }
      default:
        return {}
    }
  }

  const updateElement = (id: string, updates: Partial<EmailElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el))
  }

  const updateNestedElement = (parentId: string, childId: string, updates: Partial<EmailElement>) => {
    setElements(prev => prev.map(el => {
      if (el.id === parentId && el.type === 'columns') {
        return {
          ...el,
          children: el.children?.map(child => 
            child.id === childId ? { ...child, ...updates } : child
          ) || []
        }
      }
      return el
    }))
  }

  const findNestedElement = (parentId: string, childId: string): EmailElement | null => {
    const parent = elements.find(el => el.id === parentId)
    if (parent?.type === 'columns') {
      return parent.children?.find(child => child.id === childId) || null
    }
    return null
  }

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id))
  }

  const moveElement = (id: string, direction: 'up' | 'down') => {
    setElements(prev => {
      const index = prev.findIndex(el => el.id === id)
      if (index === -1) return prev
      
      const newElements = [...prev]
      if (direction === 'up' && index > 0) {
        [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]]
      } else if (direction === 'down' && index < newElements.length - 1) {
        [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]]
      }
      
      return newElements
    })
  }

  const moveNestedElement = (parentId: string, childId: string, direction: 'up' | 'down') => {
    setElements(prev => {
      return prev.map(el => {
        if (el.id === parentId && el.type === 'columns' && el.children) {
          const childIndex = el.children.findIndex(child => child.id === childId)
          if (childIndex === -1) return el
          
          // Determine which column this element belongs to
          const isLeftColumn = childIndex % 2 === 0
          const columnElements = el.children.filter((_, index) => 
            isLeftColumn ? index % 2 === 0 : index % 2 === 1
          )
          const columnElementIndex = Math.floor(childIndex / 2)
          
          // Check if movement is possible within the column
          if (direction === 'up' && columnElementIndex === 0) return el
          if (direction === 'down' && columnElementIndex === columnElements.length - 1) return el
          
          const newChildren = [...el.children]
          
          if (direction === 'up') {
            // Move up within the same column
            const targetIndex = childIndex - 2
            if (targetIndex >= 0) {
              [newChildren[childIndex], newChildren[targetIndex]] = [newChildren[targetIndex], newChildren[childIndex]]
            }
          } else if (direction === 'down') {
            // Move down within the same column
            const targetIndex = childIndex + 2
            if (targetIndex < newChildren.length) {
              [newChildren[childIndex], newChildren[targetIndex]] = [newChildren[targetIndex], newChildren[childIndex]]
            }
          }
          
          return { ...el, children: newChildren }
        }
        return el
      })
    })
  }

  // Rich text formatting functions
  const handleFormat = (elementId: string, format: string) => {
    console.log('🔧 handleFormat called with:', elementId, format)
    const element = elements.find(el => el.id === elementId)
    if (!element || element.type !== 'text') {
      console.log('🔧 Element not found or not text type:', elementId)
      return
    }

    const textarea = document.getElementById(`textarea-${elementId}`) as HTMLTextAreaElement
    if (!textarea) {
      console.log('🔧 Textarea not found:', `textarea-${elementId}`)
      return
    }

    // Ensure textarea has focus
    textarea.focus()

    let start = textarea.selectionStart
    let end = textarea.selectionEnd
    let selectedText = textarea.value.substring(start, end)
    
    console.log('🔧 handleFormat debug:')
    console.log('🔧 Format type:', format)
    console.log('🔧 Element ID:', elementId)
    console.log('🔧 Textarea ID:', textarea.id)
    console.log('🔧 Selection start:', start)
    console.log('🔧 Selection end:', end)
    console.log('🔧 Selected text:', `"${selectedText}"`)
    console.log('🔧 Selected text length:', selectedText.length)
    console.log('🔧 Textarea value length:', textarea.value.length)
    console.log('🔧 Textarea has focus:', document.activeElement === textarea)
    
    // If no text is selected, format the entire textarea content
    if (!selectedText || selectedText.length === 0) {
      console.log('🔧 No text selected, formatting entire content')
      selectedText = textarea.value
      start = 0
      end = textarea.value.length
    }
    
    let newText = ''

    switch (format) {
      case 'bold':
        newText = `**${selectedText}**`
        break
      case 'italic':
        newText = `*${selectedText}*`
        break

      case 'quote':
        newText = selectedText.split('\n').map(line => line.trim() ? `> ${line.trim()}` : line).join('\n')
        break
      case 'columns':
        newText = `[COLUMN_START]\n${selectedText}\n[COLUMN_END]`
        break
      default:
        console.log('🔧 Unknown format type:', format)
        return
    }

    // Update the textarea value directly first
    const updatedTextareaValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end)
    console.log('🔧 Updated textarea value:', updatedTextareaValue)
    textarea.value = updatedTextareaValue
    
    // Then update the element state
    updateElement(elementId, { content: updatedTextareaValue })
    
    console.log('🔧 Formatting applied successfully!')

    // Set cursor position after formatting
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + newText.length)
      // Add a visual feedback
      textarea.style.backgroundColor = '#f0f9ff'
      setTimeout(() => {
        textarea.style.backgroundColor = ''
      }, 200)
    }, 0)
  }

  const handleAlign = (elementId: string, alignment: string) => {
    const element = elements.find(el => el.id === elementId)
    if (element?.type === 'text') {
      // For text elements, update properties
      updateElement(elementId, {
        properties: { ...element.properties, textAlign: alignment }
      })
    } else {
      // For other elements, update styles
      updateElement(elementId, {
        styles: { ...element?.styles, textAlign: alignment }
      })
    }
  }

  // Debug function - can be called from browser console
  const debugTextFormatting = () => {
    const activeElement = document.activeElement as HTMLTextAreaElement
    console.log('🔧 Debug Text Formatting:')
    console.log('🔧 Active element:', activeElement)
    console.log('🔧 Active element ID:', activeElement?.id)
    console.log('🔧 Active element type:', activeElement?.type)
    console.log('🔧 Selection start:', activeElement?.selectionStart)
    console.log('🔧 Selection end:', activeElement?.selectionEnd)
    console.log('🔧 Selected text:', activeElement?.value.substring(activeElement?.selectionStart || 0, activeElement?.selectionEnd || 0))
    console.log('🔧 All textareas:', document.querySelectorAll('textarea'))
  }

  // Make debug function available globally
  if (typeof window !== 'undefined') {
    (window as any).debugTextFormatting = debugTextFormatting
  }



  // Helper function to convert basic markdown-like formatting to HTML
  const processTextContent = (content: string): string => {
    if (!content) return ''
    
    console.log('🔧 processTextContent called with:', content)
    console.log('🔧 Content length:', content.length)
    console.log('🔧 Contains bold markers:', content.includes('**'))
    console.log('🔧 Contains italic markers:', content.includes('*'))
    console.log('🔧 Contains list markers:', content.includes('- '))
    console.log('🔧 Contains quote markers:', content.includes('> '))
    
    let processed = content
    
    // Convert **bold** text first
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Convert *italic* text (but not if it's part of a list)
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Convert _italic_ text
    processed = processed.replace(/_(.*?)_/g, '<em>$1</em>')
    
    // Handle columns first
    const columnRegex = /\[COLUMN_START\]\n([\s\S]*?)\n\[COLUMN_END\]/g
    processed = processed.replace(columnRegex, (match, columnContent) => {
      const processedColumnContent = processTextContent(columnContent)
      return `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">${processedColumnContent}</div>`
    })
    
    // Split into lines to process lists and paragraphs
    const lines = processed.split('\n')
    const result: string[] = []
    let inList = false
    let inNumberedList = false
    let inQuote = false
    
    console.log('🔧 Processing lines:', lines)
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line === '') {
        // Empty line - end current list or quote if we're in one
        if (inList) {
          result.push('</ul>')
          inList = false
        }
        if (inNumberedList) {
          result.push('</ol>')
          inNumberedList = false
        }
        if (inQuote) {
          result.push('</blockquote>')
          inQuote = false
        }
        continue
      }
      
      // Check if this line is a numbered list item (more flexible regex)
      if (/^\d+\./.test(line)) {
        const listContent = line.replace(/^\d+\.\s*/, '')
        console.log('🔧 Found numbered list item:', line, '->', listContent)
        
        if (!inNumberedList) {
          result.push('<ol style="margin: 16px 0; padding-left: 20px;">')
          inNumberedList = true
        }
        
        result.push(`<li style="margin: 8px 0;">${listContent}</li>`)
      }
      // Check if this line is a bullet list item
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const listContent = line.substring(2) // Remove the - or *
        console.log('🔧 Found bullet list item:', line, '->', listContent)
        
        if (!inList) {
          result.push('<ul style="margin: 16px 0; padding-left: 20px;">')
          inList = true
        }
        
        result.push(`<li style="margin: 8px 0;">${listContent}</li>`)
      }
      // Check if this line is a quote
      else if (line.startsWith('> ')) {
        const quoteContent = line.substring(2)
        
        if (!inQuote) {
          result.push('<blockquote style="border-left: 4px solid #007bff; padding-left: 16px; margin: 16px 0; font-style: italic; color: #666;">')
          inQuote = true
        }
        
        result.push(`<p style="margin: 8px 0;">${quoteContent}</p>`)
      }
      else {
        // Regular text line
        if (inList) {
          result.push('</ul>')
          inList = false
        }
        if (inNumberedList) {
          result.push('</ol>')
          inNumberedList = false
        }
        if (inQuote) {
          result.push('</blockquote>')
          inQuote = false
        }
        
        // Convert single line breaks to <br> tags within paragraphs
        const lineWithBreaks = line.replace(/\n/g, '<br>')
        result.push(`<p style="margin: 8px 0;">${lineWithBreaks}</p>`)
      }
    }
    
    // Close any open lists or quotes
    if (inList) {
      result.push('</ul>')
    }
    if (inNumberedList) {
      result.push('</ol>')
    }
    if (inQuote) {
      result.push('</blockquote>')
    }
    
    const finalResult = result.join('')
    
    // Debug logging
    console.log('🔧 Text Processing Debug:')
    console.log('Original:', content)
    console.log('Processed:', finalResult)
    
    return finalResult
  }

  const generateHTML = async () => {
    // If we have processed HTML content from a loaded template, use it
    if (processedHtmlContent) {
      return processedHtmlContent
    }
    
    // Get company settings for custom footer
    let companySettings = null
    if (whopUserId) {
      try {
        const response = await fetch(`/api/company-settings?whopUserId=${whopUserId}`)
        const data = await response.json()
        if (data.success) {
          companySettings = data.settings
        }
      } catch (error) {
        console.error('Error fetching company settings:', error)
      }
    }

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Campaign</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
        }
        .email-container {
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .email-content {
            padding: 30px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
        }
        .image {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
        }
        .divider {
            border-top: 1px solid #e0e0e0;
            margin: 20px 0;
        }
        .spacer {
            height: 20px;
        }
        p {
            margin: 0 0 16px 0;
        }
        ul {
            margin: 0 0 16px 0;
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        strong {
            font-weight: bold;
        }
        em {
            font-style: italic;
        }
        ol {
            margin: 0 0 16px 0;
            padding-left: 20px;
        }
        blockquote {
            border-left: 4px solid #007bff;
            padding-left: 16px;
            margin: 16px 0;
            font-style: italic;
            color: #666;
        }
        @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .email-content { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-content">
            ${elements.map(element => {
              const styles = Object.entries(element.styles)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ')
              
              switch (element.type) {
                        case 'text':
          const processedContent = processTextContent(element.content)
          const textFontSize = element.properties?.fontSize || '16px'
          const textFontFamily = element.properties?.fontFamily || 'Arial, sans-serif'
          const textColor = element.properties?.color || '#333333'
          const textAlign = element.properties?.textAlign || 'left'
          const textFontWeight = element.properties?.fontWeight || 'normal'
          
          const textStyles = `${styles}; font-size: ${textFontSize}; font-family: ${textFontFamily}; color: ${textColor}; text-align: ${textAlign}; font-weight: ${textFontWeight};`
          return `<div style="${textStyles}">${processedContent}</div>`
                case 'button':
                  const buttonColor = element.properties?.color || '#007bff'
                  const buttonText = element.properties?.text || element.content
                  const buttonUrl = element.properties?.url || '#'
                  const buttonAlignment = element.properties?.alignment || 'center'
                  const buttonFontSize = element.properties?.fontSize || '16px'
                  const buttonFontFamily = element.properties?.fontFamily || 'Arial, sans-serif'
                  const buttonPadding = element.properties?.padding || '12px 24px'
                  const buttonWidth = element.properties?.width || 'auto'
                  const buttonTextColor = element.properties?.textColor || '#ffffff'
                  return `<div style="text-align: ${buttonAlignment}; margin: 20px 0;">
                    <a href="${buttonUrl}" class="button" style="display: inline-block; background-color: ${buttonColor}; color: ${buttonTextColor}; padding: ${buttonPadding}; border: none; border-radius: 4px; cursor: pointer; font-size: ${buttonFontSize}; font-family: ${buttonFontFamily}; text-decoration: none; text-align: center; font-weight: bold; width: ${buttonWidth};">
                      ${buttonText}
                    </a>
                  </div>`
                case 'image':
                  const imageWidth = element.properties.width ? `${element.properties.width}px` : 'auto'
                  const imageHeight = element.properties.height ? `${element.properties.height}px` : 'auto'
                  return `<div style="text-align: center;">
                    <img src="${element.properties.src || 'https://via.placeholder.com/600x300'}" 
                         alt="${element.properties.alt || 'Image'}" 
                         style="${styles}; width: ${imageWidth}; height: ${imageHeight}; max-width: 100%;"
                         width="${element.properties.width || '600'}"
                         height="${element.properties.height || '300'}">
                  </div>`
                case 'divider':
                  return `<div class="divider" style="${styles}"></div>`
                case 'spacer':
                  return `<div class="spacer" style="${styles}"></div>`
                case 'header':
                  const headerFontSize = element.properties?.fontSize || '24px'
                  const headerFontFamily = element.properties?.fontFamily || 'Arial, sans-serif'
                  const headerColor = element.properties?.color || '#333333'
                  const headerAlign = element.properties?.textAlign || 'center'
                  const headerFontWeight = element.properties?.fontWeight || 'bold'
                  
                  const headerStyles = `${styles}; font-size: ${headerFontSize}; font-family: ${headerFontFamily}; color: ${headerColor}; text-align: ${headerAlign}; font-weight: ${headerFontWeight};`
                  return `<div style="${headerStyles}">${element.content || ''}</div>`
                case 'footer':
                  // Don't generate footer content here - it will be added by the wrapper
                  return ''
                        case 'embed':
          const embedType = element.properties?.type || 'html'
          const embedWidth = element.properties?.width || 600
          const embedHeight = element.properties?.height || 400
          const fallbackText = element.properties?.fallbackText || 'Content not available'
          
          if (embedType === 'html') {
            const html = element.properties?.html || ''
            return html ? `<div style="text-align: center; margin: 20px 0;">${html}</div>` : `<div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div>`
          } else if (embedType === 'script') {
            const script = element.properties?.script || ''
            return script ? `<div style="text-align: center; margin: 20px 0;"><script>${script}</script></div>` : `<div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div>`
          } else if (embedType === 'iframe') {
            const embedUrl = element.properties?.url || ''
            return embedUrl ? `<div style="text-align: center; margin: 20px 0;">
              <iframe 
                src="${embedUrl}" 
                width="${embedWidth}" 
                height="${embedHeight}" 
                frameborder="0" 
                allowfullscreen
                style="max-width: 100%; border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
              ></iframe>
              <p style="font-size: 12px; color: #666; margin-top: 8px;">${fallbackText}</p>
            </div>` : `<div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div>`
          } else if (embedType === 'video') {
            const embedUrl = element.properties?.url || ''
            return embedUrl ? `<div style="text-align: center; margin: 20px 0;">
              <video 
                width="${embedWidth}" 
                height="${embedHeight}" 
                controls
                style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
              >
                <source src="${embedUrl}" type="video/mp4">
                <source src="${embedUrl}" type="video/webm">
                ${fallbackText}
              </video>
            </div>` : `<div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div>`
          } else if (embedType === 'social') {
            const embedUrl = element.properties?.url || ''
            return embedUrl ? `<div style="text-align: center; margin: 20px 0;">
              <a href="${embedUrl}" target="_blank" style="text-decoration: none; color: inherit;">
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; max-width: ${embedWidth}px; margin: 0 auto; background: #f9f9f9;">
                  <div style="font-size: 14px; color: #666; margin-bottom: 8px;">🔗 Embedded Content</div>
                  <div style="font-size: 16px; color: #333; margin-bottom: 8px;">${fallbackText}</div>
                  <div style="font-size: 12px; color: #999;">Click to view →</div>
                </div>
              </a>
            </div>` : `<div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div>`
          }
          return `<div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div>`
                case 'columns':
                  return generateColumnsHTML(element)
                default:
                  return ''
              }
            }).join('')}
        </div>
    </div>
</body>
</html>`
    
    return emailHTML
  }

  const generatePreviewHTML = (): string => {
    const elementsHTML = elements.map(element => {
      const styles = Object.entries(element.styles)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ')
      
      switch (element.type) {
        case 'text':
          const processedContent = processTextContent(element.content)
          const textFontFamily = element.styles?.fontFamily || 'Arial, sans-serif'
          return `<div style="${styles}; font-family: ${textFontFamily};">${processedContent}</div>`
        case 'button':
          const buttonColor = element.properties?.color || '#007bff'
          const buttonText = element.properties?.text || element.content
          const buttonUrl = element.properties?.url || '#'
          const buttonAlignment = element.properties?.alignment || 'center'
          const buttonFontSize = element.properties?.fontSize || '16px'
          const buttonFontFamily = element.properties?.fontFamily || 'Arial, sans-serif'
          const buttonPadding = element.properties?.padding || '12px 24px'
          const buttonWidth = element.properties?.width || 'auto'
          const buttonTextColor = element.properties?.textColor || '#ffffff'
          return `<div style="${styles}; text-align: ${buttonAlignment};"><a href="${buttonUrl}" style="display: inline-block; background-color: ${buttonColor}; color: ${buttonTextColor}; padding: ${buttonPadding}; border: none; border-radius: 4px; cursor: pointer; font-size: ${buttonFontSize}; font-family: ${buttonFontFamily}; text-decoration: none; text-align: center; width: ${buttonWidth};">${buttonText}</a></div>`
        case 'image':
          return `<div style="${styles}"><img src="${element.properties.src || element.content}" alt="${element.properties.alt || 'Email image'}" style="max-width: 100%; height: auto;" width="${element.properties.width || 'auto'}" height="${element.properties.height || 'auto'}" /></div>`
        case 'divider':
          return `<div style="${styles}"><hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" /></div>`
        case 'spacer':
          return `<div style="${styles}"><div style="height: ${element.content || '20px'};"></div></div>`
        case 'header':
          return `<div style="${styles}"><h1 style="margin: 0; padding: 20px 0; text-align: center; font-size: 24px; font-weight: bold;">${element.content}</h1></div>`
        case 'footer':
          return `<div style="${styles}"><div style="text-align: center; padding: 20px 0; color: #666; font-size: 14px;">Footer content will be generated automatically</div></div>`
        case 'embed':
          const embedType = element.properties?.type || 'html'
          const embedWidth = element.properties?.width || 600
          const embedHeight = element.properties?.height || 400
          const fallbackText = element.properties?.fallbackText || 'Content not available'
          
          if (embedType === 'html') {
            const html = element.properties?.html || ''
            return html ? `<div style="${styles}"><div style="text-align: center; margin: 20px 0;">${html}</div></div>` : `<div style="${styles}"><div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div></div>`
          } else if (embedType === 'script') {
            const script = element.properties?.script || ''
            return script ? `<div style="${styles}"><div style="text-align: center; margin: 20px 0;"><script>${script}</script></div></div>` : `<div style="${styles}"><div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div></div>`
          } else if (embedType === 'iframe') {
            const embedUrl = element.properties?.url || ''
            return embedUrl ? `<div style="${styles}">
              <div style="text-align: center; margin: 20px 0;">
                <iframe 
                  src="${embedUrl}" 
                  width="${embedWidth}" 
                  height="${embedHeight}" 
                  frameborder="0" 
                  allowfullscreen
                  style="max-width: 100%; border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                ></iframe>
                <p style="font-size: 12px; color: #666; margin-top: 8px;">${fallbackText}</p>
              </div>
            </div>` : `<div style="${styles}"><div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div></div>`
          } else if (embedType === 'video') {
            const embedUrl = element.properties?.url || ''
            return embedUrl ? `<div style="${styles}">
              <div style="text-align: center; margin: 20px 0;">
                <video 
                  width="${embedWidth}" 
                  height="${embedHeight}" 
                  controls
                  style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                >
                  <source src="${embedUrl}" type="video/mp4">
                  <source src="${embedUrl}" type="video/webm">
                  ${fallbackText}
                </video>
              </div>
            </div>` : `<div style="${styles}"><div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div></div>`
          } else if (embedType === 'social') {
            const embedUrl = element.properties?.url || ''
            return embedUrl ? `<div style="${styles}">
              <div style="text-align: center; margin: 20px 0;">
                <a href="${embedUrl}" target="_blank" style="text-decoration: none; color: inherit;">
                  <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; max-width: ${embedWidth}px; margin: 0 auto; background: #f9f9f9;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 8px;">🔗 Embedded Content</div>
                    <div style="font-size: 16px; color: #333; margin-bottom: 8px;">${fallbackText}</div>
                    <div style="font-size: 12px; color: #999;">Click to view →</div>
                  </div>
                </a>
              </div>
            </div>` : `<div style="${styles}"><div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div></div>`
          }
          return `<div style="${styles}"><div style="text-align: center; margin: 20px 0; color: #666;">${fallbackText}</div></div>`
        case 'columns':
          return generateColumnsHTML(element)
        default:
          return `<div style="${styles}">${element.content}</div>`
      }
    }).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Preview</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .email-container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          p {
            margin: 0 0 16px 0;
          }
          ul {
            margin: 0 0 16px 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 8px;
          }
          strong {
            font-weight: bold;
          }
          em {
            font-style: italic;
          }
          ol {
            margin: 0 0 16px 0;
            padding-left: 20px;
          }
          blockquote {
            border-left: 4px solid #007bff;
            padding-left: 16px;
            margin: 16px 0;
            font-style: italic;
            color: #666;
          }
          @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .email-container { padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${elementsHTML}
        </div>
      </body>
      </html>
    `
  }

  const generateCustomHeader = (companySettings: any) => {
    const headerStyle = companySettings?.header_customization?.header_style || {}
    const headerContent = companySettings?.header_customization?.header_content || {}
    
    const backgroundColor = headerStyle.backgroundColor || '#f8f9fa'
    const textColor = headerStyle.textColor || '#333'
    const showLogo = headerContent.showLogo ?? true
    const showCompanyName = headerContent.showCompanyName ?? true
    const customText = headerContent.customText || ''

    let headerHTML = `<div class="email-header" style="background: ${backgroundColor}; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;">`

    // Company logo
    if (showLogo && companySettings?.company_logo_url) {
      headerHTML += `<img src="${companySettings.company_logo_url}" alt="${companySettings.company_name || 'Company Logo'}" style="max-height: 60px; margin-bottom: 10px;">`
    }

    // Company name
    if (showCompanyName && companySettings?.company_name) {
      headerHTML += `<h1 style="margin: 0; color: ${textColor}; font-size: 24px; font-weight: bold;">${companySettings.company_name}</h1>`
    }

    // Custom text
    if (customText) {
      headerHTML += `<p style="margin: 10px 0 0 0; color: ${textColor}; font-size: 16px;">${customText}</p>`
    }

    headerHTML += `</div>`
    return headerHTML
  }

  const generateCustomFooter = (companySettings: any) => {
    const linkColor = companySettings?.footer_customization?.footer_style?.linkColor || '#007bff'
    const showCompanyInfo = companySettings?.footer_customization?.footer_content?.showCompanyInfo ?? true
    const showUnsubscribeLink = companySettings?.footer_customization?.footer_content?.showUnsubscribeLink ?? true
    const showViewInBrowser = companySettings?.footer_customization?.footer_content?.showViewInBrowser ?? true
    const showPoweredBy = companySettings?.footer_customization?.footer_content?.showPoweredBy ?? false
    const customText = companySettings?.footer_customization?.footer_content?.customText || ''

    let footerContent = ''

    // Company information section
    if (showCompanyInfo && companySettings?.company_name) {
      footerContent += `
        <div style="margin-bottom: 15px;">
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #333;">${companySettings.company_name}</p>`
      
      if (companySettings.company_address) {
        footerContent += `<p style="margin: 5px 0; font-size: 12px; color: #666;">${companySettings.company_address}</p>`
      }
      
      if (companySettings.company_website || companySettings.company_email || companySettings.company_phone) {
        footerContent += `<p style="margin: 5px 0; font-size: 12px; color: #666;">`
        if (companySettings.company_website) {
          footerContent += `<a href="${companySettings.company_website}" style="color: ${linkColor}; text-decoration: none;">${companySettings.company_website}</a>`
        }
        if (companySettings.company_email) {
          if (companySettings.company_website) footerContent += ' | '
          footerContent += `<a href="mailto:${companySettings.company_email}" style="color: ${linkColor}; text-decoration: none;">${companySettings.company_email}</a>`
        }
        if (companySettings.company_phone) {
          if (companySettings.company_website || companySettings.company_email) footerContent += ' | '
          footerContent += `<a href="tel:${companySettings.company_phone}" style="color: ${linkColor}; text-decoration: none;">${companySettings.company_phone}</a>`
        }
        footerContent += `</p>`
      }
      
      footerContent += `</div>`
    }

    // Copyright and custom text
    footerContent += `
      <div style="margin-bottom: 15px; font-size: 12px; color: #666;">
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${companySettings?.company_name || 'Email Marketing by Whop'}. All rights reserved.</p>
        <p style="margin: 5px 0;">You received this email because you're a member of our community.</p>`
    
    if (customText) {
      footerContent += `<p style="margin: 5px 0;">${customText}</p>`
    }
    
    footerContent += `</div>`

    // Links section
    const links = []
    if (showUnsubscribeLink) links.push(`<a href="#" style="color: ${linkColor}; text-decoration: none;">Unsubscribe</a>`)
    if (showViewInBrowser) links.push(`<a href="#" style="color: ${linkColor}; text-decoration: none;">View in browser</a>`)
    if (showPoweredBy) links.push(`<a href="https://whop.com" style="color: ${linkColor}; text-decoration: none;">Powered by Email Marketing</a>`)

    if (links.length > 0) {
      footerContent += `
        <div style="border-top: 1px solid ${companySettings?.footer_customization?.footer_style?.borderColor || '#e0e0e0'}; padding-top: 15px; font-size: 11px; color: #999;">
          <p style="margin: 5px 0;">${links.join(' | ')}</p>
        </div>`
    }

    return `<div class="email-footer">${footerContent}</div>`
  }

  const generateText = () => {
    const content = elements
      .map(element => {
        switch (element.type) {
          case 'text':
            // Process text content for plain text formatting
            let textContent = element.content
            
            // Convert **bold** to plain text (keep as is for plain text)
            textContent = textContent.replace(/\*\*(.*?)\*\*/g, '$1')
            
            // Convert *italic* to plain text (keep as is for plain text)
            textContent = textContent.replace(/\*(.*?)\*/g, '$1')
            
            // Convert _italic_ to plain text (keep as is for plain text)
            textContent = textContent.replace(/_(.*?)_/g, '$1')
            
            // Convert lists to plain text format
            textContent = textContent
              .split('\n')
              .map(line => {
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                  return `• ${line.trim().substring(2)}`
                }
                return line
              })
              .join('\n')
            
            return textContent
          case 'button':
            return `${element.properties.text || 'Click Here'}: ${element.properties.url || '#'}`
          case 'image':
            return `[Image: ${element.properties.alt || 'Image'}]`
          case 'divider':
            return '---'
          case 'spacer':
            return ''
          case 'header':
            // Don't include header content in text - it will be added by wrapper
            return ''
          case 'footer':
            // Don't include footer content in text - it will be added by wrapper
            return ''
          case 'columns':
            return generateColumnsText(element)
          default:
            return ''
        }
      })
      .filter(text => text.trim())
      .join('\n\n')
    
    // Don't add footer to plain text version - it will be added by wrapper
    return content
  }

  const handleSend = async () => {
    if (!whopUserId) return
    
    // Validate audience selection
    if (!internalSelectedAudienceId && availableAudiences.length > 0) {
      onSend({
        subject: '',
        html: '',
        text: '',
        error: 'Please select an audience to send to'
      })
      return
    }
    
    // Check plan limits before sending
    try {
      const { checkEmailPlanLimit } = await import('@/app/actions/emailsync')
      
      // Get the number of contacts from the selected audience
      const selectedAudience = availableAudiences.find(aud => aud.id === internalSelectedAudienceId)
      const contactCount = selectedAudience?.member_count || 1000 // Default fallback
      
      const planCheck = await checkEmailPlanLimit(whopUserId, contactCount)
      
      if (!planCheck.canSend) {
        // Show error in parent component
        onSend({
          subject: '',
          html: '',
          text: '',
          error: planCheck.error
        })
        return
      }
    } catch (error) {
      console.error('Error checking plan limits:', error)
    }
    
    const html = await generateHTML()
    const text = generateText()
    
    // Debug logging to verify content
    console.log('📧 Email Content Generated:')
    console.log('HTML Length:', html.length)
    console.log('Text Length:', text.length)
    console.log('HTML Preview:', html.substring(0, 200) + '...')
    console.log('Text Preview:', text.substring(0, 200) + '...')
    
    const scheduledAt = formatScheduledTime()
    console.log('📅 Scheduling info:', {
      scheduleType,
      presetSchedule,
      scheduledDate,
      scheduledTime,
      scheduledAt
    })
    
    onSend({ 
      subject, 
      html, 
      text, 
              selectedAudienceId: internalSelectedAudienceId,
      scheduledAt,
      emailWidth
    })
    
    // Clear the saved draft after successful send
    try {
      localStorage.removeItem(AUTO_SAVE_KEY)
      console.log('Draft cleared after successful send')
    } catch (error) {
      console.warn('Failed to clear draft:', error)
    }
  }

  const copyHTML = async () => {
    const html = await generatePreviewHTML()
    navigator.clipboard.writeText(html)
  }

  // Template functions
  useEffect(() => {
    if (whopUserId) {
      loadTemplates()
    }
  }, [whopUserId])

  const loadTemplates = async () => {
    if (!whopUserId) return
    
    try {
      setLoading(true)
      const { getUserEmailTemplates } = await import('@/app/actions/emailsync')
      const result = await getUserEmailTemplates(whopUserId)
      
      if (result.success && result.templates) {
        setTemplates(result.templates)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveTemplate = async () => {
    if (!whopUserId || !templateName.trim()) return
    
    try {
      setLoading(true)
      const { saveEmailTemplate } = await import('@/app/actions/emailsync')
      
      // Filter out header and footer elements when saving template (these are generated dynamically)
      const templateElements = elements.filter(element => element.type !== 'footer' && element.type !== 'header')
      
      console.log('🔍 Saving template elements:', templateElements)
      
      const result = await saveEmailTemplate(whopUserId, {
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        subject: subject,
        elements: templateElements,
        tags: []
      })
      
      if (result.success) {
        setShowSaveDialog(false)
        setTemplateName('')
        setTemplateDescription('')
        await loadTemplates() // Refresh templates list
      }
    } catch (error) {
      console.error('Error saving template:', error)
    } finally {
      setLoading(false)
    }
  }

  const editTemplate = async () => {
    if (!editingTemplateId || !editingTemplateName.trim()) return
    
    try {
      setLoading(true)
      const { updateEmailTemplate } = await import('@/app/actions/emailsync')
      
      // Filter out header and footer elements when updating template (these are generated dynamically)
      const templateElements = elements.filter(element => element.type !== 'footer' && element.type !== 'header')
      
      const result = await updateEmailTemplate(editingTemplateId, {
        name: editingTemplateName,
        description: editingTemplateDescription,
        category: editingTemplateCategory,
        subject: subject,
        elements: templateElements
      })
      
      if (result.success) {
        setShowEditDialog(false)
        setEditingTemplateId(null)
        setEditingTemplateName('')
        setEditingTemplateDescription('')
        await loadTemplates() // Refresh templates list
      }
    } catch (error) {
      console.error('Error updating template:', error)
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (template: any) => {
    setEditingTemplateId(template.id)
    setEditingTemplateName(template.name)
    setEditingTemplateDescription(template.description || '')
    setEditingTemplateCategory(template.category || 'general')
    setShowEditDialog(true)
  }

  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true)
      const { loadEmailTemplate } = await import('@/app/actions/emailsync')
      const result = await loadEmailTemplate(templateId, whopUserId)
      
      if (result.success && result.template) {
        const template = result.template
        setSubject(template.subject)
        
        console.log('🔍 Loading template elements:', template.elements)
        
        // Use the processed HTML content if available, otherwise fall back to elements
        if (template.html_content) {
          // If we have processed HTML content, we need to extract elements from it
          // For now, let's use the elements array but ensure the HTML generation uses the processed content
          setElements(template.elements || [])
          // Store the processed HTML content for use in generateHTML
          setProcessedHtmlContent(template.html_content)
        } else {
          setElements(template.elements || [])
          setProcessedHtmlContent(null)
        }
        
        // Automatically add header and footer elements if they don't exist
        const hasHeader = (template.elements || []).some((element: EmailElement) => element.type === 'header')
        const hasFooter = (template.elements || []).some((element: EmailElement) => element.type === 'footer')
        
        if (!hasHeader) {
          const headerElement: EmailElement = {
            id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'header',
            content: 'Header content will be generated automatically',
            styles: getDefaultStyles('header'),
            properties: {
              fontSize: '24px',
              color: '#333333',
              fontFamily: 'Arial, sans-serif',
              textAlign: 'center',
              fontWeight: 'bold'
            }
          }
          setElements(prev => [headerElement, ...prev])
        }
        
        if (!hasFooter) {
          const footerElement: EmailElement = {
            id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'footer',
            content: 'Footer content will be generated automatically',
            styles: getDefaultStyles('footer'),
            properties: {
              fontSize: '14px',
              color: '#666666',
              fontFamily: 'Arial, sans-serif',
              textAlign: 'center',
              fontWeight: 'normal'
            }
          }
          setElements(prev => [...prev, footerElement])
        }
        
        setShowLoadDialog(false)
      }
    } catch (error) {
      console.error('Error loading template:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    try {
      const { deleteEmailTemplate } = await import('@/app/actions/emailsync')
      const result = await deleteEmailTemplate(templateId)
      
      if (result.success) {
        await loadTemplates() // Refresh templates list
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const duplicateTemplate = async (templateId: string) => {
    if (!whopUserId) return
    
    try {
      const { duplicateEmailTemplate } = await import('@/app/actions/emailsync')
      const result = await duplicateEmailTemplate(whopUserId, templateId)
      
      if (result.success) {
        await loadTemplates() // Refresh templates list
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  // HTML Import Functions
  const parseHtmlToElements = (html: string): EmailElement[] => {
    console.log('Parsing HTML:', html.substring(0, 200) + '...')
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const elements: EmailElement[] = []
    let elementId = 1

    // Extract subject from title or meta tags
    const title = doc.querySelector('title')?.textContent || ''
    const metaSubject = doc.querySelector('meta[name="subject"]')?.getAttribute('content') || ''
    const extractedSubject = metaSubject || title || 'Imported Email'
    setImportSubject(extractedSubject)
    console.log('Extracted subject:', extractedSubject)

    // Find the main container
    const container = doc.querySelector('.container') || doc.body
    console.log('Using container:', container.tagName, container.className)

    // Process elements in order they appear
    const walkDOM = (element: Element): void => {
      for (const child of Array.from(element.children)) {
        const tagName = child.tagName.toLowerCase()
        const className = child.className || ''
        
        console.log('Processing element:', tagName, className)

        // Handle different element types
        switch (tagName) {
          case 'div':
            if (className.includes('header')) {
              // Process header content
              const headerText = child.textContent?.trim()
              if (headerText) {
                elements.push({
                  id: (elementId++).toString(),
                  type: 'text',
                  content: headerText,
                  styles: {
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#c2185b',
                    textAlign: 'center',
                    margin: '20px 0',
                    backgroundColor: '#ffe6f2',
                    padding: '20px',
                    borderRadius: '8px'
                  },
                  properties: {}
                })
              }
            } else if (className.includes('section')) {
              // Process section content as regular content
              walkDOM(child)
            } else if (className.includes('product-grid')) {
              // Handle product grid - create a two-column layout
              const productItems = child.querySelectorAll('.product-item')
              
              if (productItems.length >= 2) {
                // Create a two-column layout for products
                const leftColumnElements: EmailElement[] = []
                const rightColumnElements: EmailElement[] = []
                
                productItems.forEach((item, index) => {
                  const columnElements: EmailElement[] = []
                  
                  // Product title
                  const title = item.querySelector('h3')?.textContent
                  if (title) {
                    columnElements.push({
                      id: (elementId++).toString(),
                      type: 'text',
                      content: title,
                      styles: {
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#c2185b',
                        margin: '10px 0 5px 0',
                        textAlign: 'center'
                      },
                      properties: {}
                    })
                  }
                  
                  // Product image
                  const img = item.querySelector('img')
                  if (img) {
                    columnElements.push({
                      id: (elementId++).toString(),
                      type: 'image',
                      content: '',
                      styles: {
                        maxWidth: '150px',
                        height: 'auto',
                        margin: '10px auto',
                        borderRadius: '5px',
                        display: 'block'
                      },
                      properties: {
                        src: img.getAttribute('src') || '',
                        alt: img.getAttribute('alt') || '',
                        width: '150',
                        height: '150'
                      }
                    })
                  }
                  
                  // Product description
                  const desc = item.querySelector('p')?.textContent
                  if (desc) {
                    columnElements.push({
                      id: (elementId++).toString(),
                      type: 'text',
                      content: desc,
                      styles: {
                        fontSize: '12px',
                        color: '#777',
                        textAlign: 'center',
                        margin: '8px 0'
                      },
                      properties: {}
                    })
                  }
                  
                  // Product button
                  const button = item.querySelector('a.button')
                  if (button) {
                    columnElements.push({
                      id: (elementId++).toString(),
                      type: 'button',
                      content: '',
                      styles: {
                        backgroundColor: '#c2185b',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '5px',
                        textDecoration: 'none',
                        display: 'inline-block',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        margin: '8px auto',
                        width: 'fit-content'
                      },
                      properties: {
                        text: button.textContent || '',
                        url: button.getAttribute('href') || '',
                        color: '#c2185b'
                      }
                    })
                  }
                  
                  // Add to appropriate column
                  if (index % 2 === 0) {
                    leftColumnElements.push(...columnElements)
                  } else {
                    rightColumnElements.push(...columnElements)
                  }
                })
                
                // Create two-column element
                elements.push({
                  id: (elementId++).toString(),
                  type: 'columns',
                  content: `Left Column Content\n\n${leftColumnElements.map(el => `- ${el.content}`).join('\n')}\n\n---\n\nRight Column Content\n\n${rightColumnElements.map(el => `- ${el.content}`).join('\n')}`,
                  styles: {
                    display: 'flex',
                    gap: '20px',
                    margin: '20px 0'
                  },
                  properties: {},
                  children: [...leftColumnElements, ...rightColumnElements]
                })
              } else {
                // Single product - add as regular elements
                productItems.forEach((item) => {
                  // Product title
                  const title = item.querySelector('h3')?.textContent
                  if (title) {
                    elements.push({
                      id: (elementId++).toString(),
                      type: 'text',
                      content: title,
                      styles: {
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#c2185b',
                        margin: '15px 0 5px 0',
                        textAlign: 'center'
                      },
                      properties: {}
                    })
                  }
                  
                  // Product image
                  const img = item.querySelector('img')
                  if (img) {
                    elements.push({
                      id: (elementId++).toString(),
                      type: 'image',
                      content: '',
                      styles: {
                        maxWidth: '200px',
                        height: 'auto',
                        margin: '10px auto',
                        borderRadius: '5px',
                        display: 'block'
                      },
                      properties: {
                        src: img.getAttribute('src') || '',
                        alt: img.getAttribute('alt') || '',
                        width: '200',
                        height: '200'
                      }
                    })
                  }
                  
                  // Product description
                  const desc = item.querySelector('p')?.textContent
                  if (desc) {
                    elements.push({
                      id: (elementId++).toString(),
                      type: 'text',
                      content: desc,
                      styles: {
                        fontSize: '14px',
                        color: '#777',
                        textAlign: 'center',
                        margin: '10px 0'
                      },
                      properties: {}
                    })
                  }
                  
                  // Product button
                  const button = item.querySelector('a.button')
                  if (button) {
                    elements.push({
                      id: (elementId++).toString(),
                      type: 'button',
                      content: '',
                      styles: {
                        backgroundColor: '#c2185b',
                        color: '#ffffff',
                        padding: '8px 15px',
                        borderRadius: '5px',
                        textDecoration: 'none',
                        display: 'inline-block',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        margin: '10px auto',
                        width: 'fit-content'
                      },
                      properties: {
                        text: button.textContent || '',
                        url: button.getAttribute('href') || '',
                        color: '#c2185b'
                      }
                    })
                  }
                })
              }
            } else if (className.includes('button-container')) {
              // Process buttons in container
              const buttons = child.querySelectorAll('a.button')
              buttons.forEach((button) => {
                elements.push({
                  id: (elementId++).toString(),
                  type: 'button',
                  content: '',
                  styles: {
                    backgroundColor: '#c2185b',
                    color: '#ffffff',
                    padding: '12px 25px',
                    borderRadius: '5px',
                    textDecoration: 'none',
                    display: 'inline-block',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    margin: '15px auto',
                    width: 'fit-content'
                  },
                  properties: {
                    text: button.textContent || '',
                    url: button.getAttribute('href') || '',
                    color: '#c2185b'
                  }
                })
              })
            } else if (className.includes('footer')) {
              // Process footer content
              const footerText = child.textContent?.trim()
              if (footerText) {
                elements.push({
                  id: (elementId++).toString(),
                  type: 'text',
                  content: footerText,
                  styles: {
                    fontSize: '12px',
                    color: '#888',
                    textAlign: 'center',
                    margin: '20px 0',
                    backgroundColor: '#ffe6f2',
                    padding: '20px',
                    borderRadius: '8px'
                  },
                  properties: {}
                })
              }
            } else {
              // Recursively process other divs
              walkDOM(child)
            }
            break
            
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            const level = parseInt(tagName.charAt(1))
            const headingText = child.textContent?.trim()
            if (headingText) {
              elements.push({
                id: (elementId++).toString(),
                type: 'text',
                content: headingText,
                styles: {
                  fontSize: level === 1 ? '32px' : level === 2 ? '28px' : level === 3 ? '24px' : '20px',
                  fontWeight: 'bold',
                  color: '#c2185b',
                  margin: '20px 0 10px 0',
                  textAlign: 'center'
                },
                properties: {}
              })
            }
            break
            
          case 'p':
            const paragraphText = child.textContent?.trim()
            if (paragraphText && !child.closest('.product-item')) {
              elements.push({
                id: (elementId++).toString(),
                type: 'text',
                content: paragraphText,
                styles: {
                  fontSize: '16px',
                  color: '#555',
                  lineHeight: '1.6',
                  margin: '15px 0',
                  textAlign: 'center'
                },
                properties: {}
              })
            }
            break
            
          case 'img':
            if (!child.closest('.product-item')) {
              elements.push({
                id: (elementId++).toString(),
                type: 'image',
                content: '',
                styles: {
                  maxWidth: '100%',
                  height: 'auto',
                  margin: '15px auto',
                  borderRadius: '5px',
                  display: 'block'
                },
                properties: {
                  src: child.getAttribute('src') || '',
                  alt: child.getAttribute('alt') || '',
                  width: child.getAttribute('width') || '600',
                  height: child.getAttribute('height') || 'auto'
                }
              })
            }
            break
            
          case 'hr':
            elements.push({
              id: (elementId++).toString(),
              type: 'divider',
              content: '',
              styles: {
                borderTop: '1px solid #eee',
                margin: '20px 0'
              },
              properties: {}
            })
            break
            
          default:
            // Recursively process other elements
            walkDOM(child)
            break
        }
      }
    }

    // Start processing from the container
    walkDOM(container)

    console.log('Extracted elements:', elements.length, elements)
    return elements
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, file.size, 'bytes')
      
      if (file.size > 1024 * 1024) { // 1MB limit
        alert('File is too large. Please select a file smaller than 1MB.')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        console.log('File content loaded:', content.substring(0, 200) + '...')
        setImportHtmlContent(content)
      }
      reader.onerror = () => {
        console.error('Error reading file')
        alert('Error reading file. Please try again.')
      }
      reader.readAsText(file)
    }
  }

  const importHtmlTemplate = async () => {
    if (!importHtmlContent.trim() || !importTemplateName.trim() || !whopUserId) {
      console.error('Missing required fields:', { 
        hasHtml: !!importHtmlContent.trim(), 
        hasName: !!importTemplateName.trim(), 
        hasUserId: !!whopUserId 
      })
      return
    }

    try {
      setLoading(true)
      console.log('Starting HTML import process...')
      
      // Parse HTML to elements
      const parsedElements = parseHtmlToElements(importHtmlContent)
      console.log('Parsed elements:', parsedElements.length, parsedElements)
      
      if (parsedElements.length === 0) {
        console.error('No elements found in HTML')
        alert('No content could be extracted from the HTML. Please check your HTML structure.')
        return
      }

      // Extract subject from HTML if not provided
      let extractedSubject = importSubject
      if (!extractedSubject) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(importHtmlContent, 'text/html')
        const title = doc.querySelector('title')?.textContent || ''
        const metaSubject = doc.querySelector('meta[name="subject"]')?.getAttribute('content') || ''
        extractedSubject = metaSubject || title || 'Imported Email'
        console.log('Extracted subject:', extractedSubject)
      }

      // Save as template
      const { saveEmailTemplate } = await import('@/app/actions/emailsync')
      console.log('Saving template with data:', {
        name: importTemplateName,
        description: importTemplateDescription,
        category: importTemplateCategory,
        subject: extractedSubject,
        elementsCount: parsedElements.length
      })
      
      const result = await saveEmailTemplate(whopUserId, {
        name: importTemplateName,
        description: importTemplateDescription,
        category: importTemplateCategory,
        subject: extractedSubject,
        elements: parsedElements,
        tags: ['imported', 'html']
      })

      console.log('Save result:', result)

      if (result.success) {
        // Load the template into the designer
        setSubject(extractedSubject)
        setElements(parsedElements)
        setShowImportDialog(false)
        
        // Reset import form
        setImportHtmlContent('')
        setImportSubject('')
        setImportTemplateName('')
        setImportTemplateDescription('')
        setImportTemplateCategory('general')
        
        // Refresh templates list
        await loadTemplates()
        
        console.log('Template imported successfully!')
        alert('HTML template imported successfully!')
      } else {
        console.error('Failed to save template:', result.error)
        alert(`Failed to import template: ${result.error}`)
      }
    } catch (error) {
      console.error('Error importing HTML template:', error)
      alert(`Error importing template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Drag and Drop Functions
  const handleDragStart = (e: React.DragEvent, elementId: string) => {
    setDraggedElementId(elementId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', elementId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    const targetElement = e.currentTarget as HTMLElement
    const targetElementId = targetElement.getAttribute('data-element-id')
    
    if (draggedElementId && targetElementId && draggedElementId !== targetElementId) {
      setDropTargetId(targetElementId)
    }
  }

  const handleDrop = (e: React.DragEvent, targetElementId: string) => {
    e.preventDefault()
    
    if (!draggedElementId || draggedElementId === targetElementId) {
      setDraggedElementId(null)
      setDropTargetId(null)
      return
    }

    const draggedIndex = elements.findIndex(el => el.id === draggedElementId)
    const targetIndex = elements.findIndex(el => el.id === targetElementId)
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedElementId(null)
      setDropTargetId(null)
      return
    }

    const newElements = [...elements]
    const [draggedElement] = newElements.splice(draggedIndex, 1)
    newElements.splice(targetIndex, 0, draggedElement)
    
    setElements(newElements)
    setDraggedElementId(null)
    setDropTargetId(null)
  }

  const handleDragEnd = () => {
    setDraggedElementId(null)
    setDropTargetId(null)
  }

  const selectedElementData = elements.find(el => el.id === selectedElement)
  
  // Debug logging
  console.log('🔍 Selected element ID:', selectedElement)
  console.log('🔍 Selected element data:', selectedElementData)
  console.log('🔍 Element type:', selectedElementData?.type)
  console.log('🔍 Is list?', selectedElementData?.type === 'list')
  

  

  

  


  const availableElements = [
    { type: 'text' as const, label: 'Text', icon: Type },
    { type: 'button' as const, label: 'Button', icon: Square },
    { type: 'image' as const, label: 'Image', icon: ImageIcon },
    { type: 'divider' as const, label: 'Divider', icon: Minus },
    { type: 'spacer' as const, label: 'Spacer', icon: Move },

    { type: 'columns' as const, label: 'Two Columns', icon: Columns },

    { type: 'header' as const, label: 'Header', icon: Star },
    { type: 'footer' as const, label: 'Footer', icon: Star },
    { type: 'embed' as const, label: 'Embed', icon: ExternalLink }
  ]

  const generateColumnsText = (element: EmailElement): string => {
    const content = element.content || ''
    const parts = content.split('\n\n---\n\n')
    
    if (parts.length >= 2) {
      const leftContent = parts[0].replace(/^Left Column Content\n\n/, '').replace(/\n- /g, '\n• ')
      const rightContent = parts[1].replace(/^Right Column Content\n\n/, '').replace(/\n\d+\. /g, '\n• ')
      return `LEFT COLUMN:\n${leftContent}\n\nRIGHT COLUMN:\n${rightContent}`
    }
    
    return content
  }

  const generateColumnsHTML = (element: EmailElement): string => {
    const leftColumnElements = element.children?.filter((_, index) => index % 2 === 0) || []
    const rightColumnElements = element.children?.filter((_, index) => index % 2 === 1) || []
    
    const renderElementHTML = (el: EmailElement): string => {
      const styles = Object.entries(el.styles)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ')
      
      switch (el.type) {
        case 'text':
          const processedContent = processTextContent(el.content)
          const textFontSize = el.properties?.fontSize || '16px'
          const textFontFamily = el.properties?.fontFamily || 'Arial, sans-serif'
          const textColor = el.properties?.color || '#333333'
          const textAlign = el.properties?.textAlign || 'left'
          const textFontWeight = el.properties?.fontWeight || 'normal'
          
          const textStyles = `${styles}; font-size: ${textFontSize}; font-family: ${textFontFamily}; color: ${textColor}; text-align: ${textAlign}; font-weight: ${textFontWeight};`
          return `<div style="${textStyles}">${processedContent}</div>`
        case 'button':
          const buttonColor = el.properties?.color || '#007bff'
          const buttonUrl = el.properties?.url || '#'
          const buttonAlignment = el.properties?.alignment || 'center'
          const buttonFontSize = el.properties?.fontSize || '16px'
          const buttonFontFamily = el.properties?.fontFamily || 'Arial, sans-serif'
          const buttonPadding = el.properties?.padding || '12px 24px'
          const buttonWidth = el.properties?.width || 'auto'
          const buttonTextColor = el.properties?.textColor || '#ffffff'
          return `<div style="text-align: ${buttonAlignment}; margin: 10px 0;">
            <a href="${buttonUrl}" style="text-decoration: none;">
              <button style="background-color: ${buttonColor}; color: ${buttonTextColor}; padding: ${buttonPadding}; border: none; border-radius: 4px; cursor: pointer; font-size: ${buttonFontSize}; font-family: ${buttonFontFamily}; font-weight: bold; width: ${buttonWidth};">
                ${el.properties?.text || el.content}
              </button>
            </a>
          </div>`
        case 'image':
          return `<div style="text-align: center; margin: 10px 0;">
            <img src="${el.content}" alt="Email image" style="max-width: 100%; height: auto; border-radius: 4px;" />
          </div>`
        case 'divider':
          return `<div style="border-top: 1px solid #e0e0e0; margin: 10px 0;"></div>`
        case 'spacer':
          return `<div style="height: ${el.content || '10px'};"></div>`
        case 'header':
          const headerFontSize = el.properties?.fontSize || '20px'
          const headerFontFamily = el.properties?.fontFamily || 'Arial, sans-serif'
          const headerColor = el.properties?.color || '#333333'
          const headerAlign = el.properties?.textAlign || 'center'
          const headerFontWeight = el.properties?.fontWeight || 'bold'
          
          const headerStyles = `${styles}; font-size: ${headerFontSize}; font-family: ${headerFontFamily}; color: ${headerColor}; text-align: ${headerAlign}; font-weight: ${headerFontWeight};`
          return `<div style="${headerStyles}">${el.content}</div>`
        case 'embed':
          const colEmbedType = el.properties?.type || 'html'
          const colEmbedWidth = el.properties?.width || 300
          const colEmbedHeight = el.properties?.height || 200
          const colFallbackText = el.properties?.fallbackText || 'Content not available'
          
          if (colEmbedType === 'html') {
            const html = el.properties?.html || ''
            return html ? `<div style="text-align: center; margin: 10px 0;">${html}</div>` : `<div style="text-align: center; margin: 10px 0; color: #666; font-size: 12px;">${colFallbackText}</div>`
          } else if (colEmbedType === 'script') {
            const script = el.properties?.script || ''
            return script ? `<div style="text-align: center; margin: 10px 0;"><script>${script}</script></div>` : `<div style="text-align: center; margin: 10px 0; color: #666; font-size: 12px;">${colFallbackText}</div>`
          } else if (colEmbedType === 'iframe') {
            const colEmbedUrl = el.properties?.url || ''
            return colEmbedUrl ? `<div style="text-align: center; margin: 10px 0;">
              <iframe 
                src="${colEmbedUrl}" 
                width="${colEmbedWidth}" 
                height="${colEmbedHeight}" 
                frameborder="0" 
                allowfullscreen
                style="max-width: 100%; border: none; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);"
              ></iframe>
              <p style="font-size: 10px; color: #666; margin-top: 6px;">${colFallbackText}</p>
            </div>` : `<div style="text-align: center; margin: 10px 0; color: #666; font-size: 12px;">${colFallbackText}</div>`
          } else if (colEmbedType === 'video') {
            const colEmbedUrl = el.properties?.url || ''
            return colEmbedUrl ? `<div style="text-align: center; margin: 10px 0;">
              <video 
                width="${colEmbedWidth}" 
                height="${colEmbedHeight}" 
                controls
                style="max-width: 100%; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);"
              >
                <source src="${colEmbedUrl}" type="video/mp4">
                <source src="${colEmbedUrl}" type="video/webm">
                ${colFallbackText}
              </video>
            </div>` : `<div style="text-align: center; margin: 10px 0; color: #666; font-size: 12px;">${colFallbackText}</div>`
          } else if (colEmbedType === 'social') {
            const colEmbedUrl = el.properties?.url || ''
            return colEmbedUrl ? `<div style="text-align: center; margin: 10px 0;">
              <a href="${colEmbedUrl}" target="_blank" style="text-decoration: none; color: inherit;">
                <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; max-width: ${colEmbedWidth}px; margin: 0 auto; background: #f9f9f9;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 6px;">🔗 Embedded Content</div>
                  <div style="font-size: 14px; color: #333; margin-bottom: 6px;">${colFallbackText}</div>
                  <div style="font-size: 10px; color: #999;">Click to view →</div>
                </div>
              </a>
            </div>` : `<div style="text-align: center; margin: 10px 0; color: #666; font-size: 12px;">${colFallbackText}</div>`
          }
          return `<div style="text-align: center; margin: 10px 0; color: #666; font-size: 12px;">${colFallbackText}</div>`
        default:
          return `<div style="${styles}">${el.content}</div>`
      }
    }
    
    const leftColumnHTML = leftColumnElements.map(renderElementHTML).join('')
    const rightColumnHTML = rightColumnElements.map(renderElementHTML).join('')
    
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; max-width: 100%;">
        <div style="padding: 0;">
          ${leftColumnHTML || '<div style="padding: 20px; text-align: center; color: #666; border: 2px dashed #ddd; border-radius: 4px;">Left Column<br/>Add elements here</div>'}
        </div>
        <div style="padding: 0;">
          ${rightColumnHTML || '<div style="padding: 20px; text-align: center; color: #666; border: 2px dashed #ddd; border-radius: 4px;">Right Column<br/>Add elements here</div>'}
        </div>
      </div>
    `
  }

  return (
    <div className="flex flex-col lg:flex-row h-full bg-background max-h-screen">
      {/* Left Panel - Design Tools */}
      <div className="w-full lg:w-80 xl:w-80 bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col max-h-[50vh] lg:max-h-full overflow-hidden">
        {/* Header */}
        <div className="p-3 lg:p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div></div>
            <div className="flex items-center gap-1 lg:gap-2">
              {whopUserId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLoadDialog(true)}
                    disabled={loading}
                    className="h-8 px-2 lg:px-3"
                  >
                    <FolderOpen className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-1" />
                    <span className="hidden lg:inline">Templates</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveDialog(true)}
                    disabled={loading || elements.length === 0}
                    className="h-8 px-2 lg:px-3"
                  >
                    <Save className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-1" />
                    <span className="hidden lg:inline">Save</span>
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                className="h-8 px-2 lg:px-3"
              >
                <Eye className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-1" />
                <span className="hidden lg:inline">{previewMode ? 'Design' : 'Preview'}</span>
              </Button>
            </div>
          </div>
        </div>

        {!previewMode && (
          <div className="flex-1 overflow-y-auto min-h-0">







            {/* Add Elements */}
            <div className="p-3 lg:p-4 border-b border-border">
              <h3 className="text-sm font-medium mb-3">Add Elements</h3>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {availableElements.map((element) => {
                  const IconComponent = element.icon
                  return (
                    <Button
                      key={element.type}
                      variant="outline"
                      onClick={() => addElement(element.type)}
                      className="flex flex-col items-center justify-center gap-2 h-20 lg:h-24 p-3 border-2 border-dashed border-border hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all duration-200 rounded-lg"
                    >
                      <div className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 bg-muted dark:bg-muted/50 rounded-lg">
                        <IconComponent className="h-5 w-5 lg:h-6 lg:w-6 text-muted-foreground" />
                      </div>
                      <span className="text-xs lg:text-sm font-medium text-foreground">{element.label}</span>
                    </Button>
                  )
                })}
              </div>
              
              {/* Quick Image Upload */}
              <div className="mt-3 pt-3 border-t border-border">
                <h4 className="text-xs font-medium mb-2 text-muted-foreground">Quick Upload</h4>
                <EmailImageUpload
                  whopUserId={whopUserId}
                  autoInsert={true}
                  onImageSelect={(image) => {
                    const newElementId = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    const newElement: EmailElement = {
                      id: newElementId,
                      type: 'image',
                      content: image.publicUrl,
                      styles: getDefaultStyles('image'),
                      properties: {
                        src: image.publicUrl,
                        alt: image.altText || image.fileName,
                        width: image.width || 600,
                        height: image.height || 300
                      }
                    }
                    setElements(prev => [...prev, newElement])
                    setSelectedElement(newElementId)
                  }}
                />
              </div>
            </div>



            {/* Elements List */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Elements ({elements.length})</h3>
                {elements.length === 0 && (
                  <span className="text-xs text-muted-foreground">No elements yet</span>
                )}
              </div>
              
              {elements.length === 0 ? (
                              <div className="text-center py-12 text-muted-foreground">
                <Type className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1 text-foreground">No elements added yet</p>
                <p className="text-xs text-muted-foreground">Click the buttons above to add elements</p>
              </div>
              ) : (
                <div className="space-y-3">
                  {elements.map((element, index) => (
                    <div
                      key={element.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedElement === element.id
                                                      ? 'border-orange-500 bg-orange-500/10 dark:bg-orange-500/20'
                          : 'border-border hover:border-border/80'
                      }`}
                      onClick={() => setSelectedElement(element.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {element.type === 'text' && <Type className="h-4 w-4" />}
                          {element.type === 'button' && <Square className="h-4 w-4" />}
                          {element.type === 'image' && <ImageIcon className="h-4 w-4" />}
                          {element.type === 'divider' && <Minus className="h-4 w-4" />}
                          {element.type === 'spacer' && <Move className="h-4 w-4" />}

                          {element.type === 'footer' && <Type className="h-4 w-4" />}
                          {element.type === 'header' && <AlignCenter className="h-4 w-4" />}
                          {element.type === 'columns' && <Columns className="h-4 w-4" />}
                          {element.type === 'embed' && <ExternalLink className="h-4 w-4" />}
                          <span className="text-sm font-medium">
                            {element.type.charAt(0).toUpperCase() + element.type.slice(1)} {index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveElement(element.id, 'up')
                            }}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveElement(element.id, 'down')
                            }}
                            disabled={index === elements.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteElement(element.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {element.type === 'text' && (
                        <p className="text-xs text-muted-foreground mt-2 truncate">
                          {element.content || 'Empty text'}
                        </p>
                      )}
                      {element.type === 'button' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {element.properties?.text || 'Click Here'} → {element.properties?.url || '#'}
                        </p>
                      )}
                      {element.type === 'image' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {element.properties?.alt || 'Image'} ({element.properties?.width || 600}x{element.properties?.height || 300})
                        </p>
                      )}
                      {element.type === 'divider' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Horizontal line
                        </p>
                      )}
                      {element.type === 'spacer' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {element.styles?.height || '20px'} spacing
                        </p>
                      )}
                      {element.type === 'footer' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Footer content
                        </p>
                      )}
                      {element.type === 'header' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Header content
                        </p>
                      )}
                      {element.type === 'embed' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {element.properties?.type || 'HTML'} embed
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Properties Panel */}
            {selectedElementData && (
              <div className="p-3 lg:p-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">
                    Properties - {selectedElementData.type.charAt(0).toUpperCase() + selectedElementData.type.slice(1)}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {elements.findIndex(el => el.id === selectedElementData.id) + 1} of {elements.length}
                  </Badge>
                </div>

                {selectedElementData.type === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <Label>Content</Label>
                      <div className="mt-2 border rounded-md">
                        <RichTextToolbar
                          onFormat={(format) => handleFormat(selectedElementData.id, format)}
                          onAlign={(alignment) => handleAlign(selectedElementData.id, alignment)}
                          currentAlignment={selectedElementData.properties?.textAlign || selectedElementData.styles.textAlign}
                        />
                        <Textarea
                          id={`textarea-${selectedElementData.id}`}
                          value={selectedElementData.content}
                          onChange={(e) => updateElement(selectedElementData.id, { content: e.target.value })}
                          rows={4}
                          className="border-0 focus:ring-0 resize-none"
                          placeholder="Enter your text here... Use the toolbar buttons above for easy formatting!"
                        />
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p className="font-medium mb-1">💡 Select text and use toolbar buttons for Bold/Italic formatting</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Font Size</Label>
                        <Select
                          value={selectedElementData.properties?.fontSize || '16px'}
                          onValueChange={(value) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, fontSize: value }
                          })}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="12px">12px</SelectItem>
                            <SelectItem value="14px">14px</SelectItem>
                            <SelectItem value="16px">16px</SelectItem>
                            <SelectItem value="18px">18px</SelectItem>
                            <SelectItem value="20px">20px</SelectItem>
                            <SelectItem value="24px">24px</SelectItem>
                            <SelectItem value="28px">28px</SelectItem>
                            <SelectItem value="32px">32px</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Color</Label>
                        <Input
                          type="color"
                          value={selectedElementData.properties?.color || '#333333'}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, color: e.target.value }
                          })}
                          className="mt-2 h-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Font Family</Label>
                      <Select
                        value={selectedElementData.properties?.fontFamily || 'Arial, sans-serif'}
                        onValueChange={(value) => updateElement(selectedElementData.id, {
                          properties: { ...selectedElementData.properties, fontFamily: value }
                        })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Alignment</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant={selectedElementData.properties?.textAlign === 'left' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleAlign(selectedElementData.id, 'left')}
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selectedElementData.properties?.textAlign === 'center' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleAlign(selectedElementData.id, 'center')}
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selectedElementData.properties?.textAlign === 'right' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleAlign(selectedElementData.id, 'right')}
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedElementData.type === 'button' && (
                  <div className="space-y-3">
                    <div>
                      <Label>Button Text</Label>
                      <Input
                        value={selectedElementData.properties.text || selectedElementData.content || ''}
                        onChange={(e) => updateElement(selectedElementData.id, {
                          content: e.target.value,
                          properties: { ...selectedElementData.properties, text: e.target.value }
                        })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={selectedElementData.properties.url || ''}
                        onChange={(e) => updateElement(selectedElementData.id, {
                          properties: { ...selectedElementData.properties, url: e.target.value }
                        })}
                        className="mt-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Background Color</Label>
                        <Input
                          type="color"
                          value={selectedElementData.properties.color || '#007bff'}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, color: e.target.value },
                            styles: { ...selectedElementData.styles, backgroundColor: e.target.value }
                          })}
                          className="mt-2 h-10"
                        />
                      </div>
                      <div>
                        <Label>Text Color</Label>
                        <Input
                          type="color"
                          value={selectedElementData.properties.textColor || '#ffffff'}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, textColor: e.target.value }
                          })}
                          className="mt-2 h-10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Font Size</Label>
                        <Select
                          value={selectedElementData.properties.fontSize || '16px'}
                          onValueChange={(value) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, fontSize: value }
                          })}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="12px">12px</SelectItem>
                            <SelectItem value="14px">14px</SelectItem>
                            <SelectItem value="16px">16px</SelectItem>
                            <SelectItem value="18px">18px</SelectItem>
                            <SelectItem value="20px">20px</SelectItem>
                            <SelectItem value="24px">24px</SelectItem>
                            <SelectItem value="28px">28px</SelectItem>
                            <SelectItem value="32px">32px</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Padding</Label>
                        <Select
                          value={selectedElementData.properties.padding || '12px 24px'}
                          onValueChange={(value) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, padding: value }
                          })}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8px 16px">Small</SelectItem>
                            <SelectItem value="12px 24px">Medium</SelectItem>
                            <SelectItem value="16px 32px">Large</SelectItem>
                            <SelectItem value="20px 40px">Extra Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Font Family</Label>
                      <Select
                        value={selectedElementData.properties.fontFamily || 'Arial, sans-serif'}
                        onValueChange={(value) => updateElement(selectedElementData.id, {
                          properties: { ...selectedElementData.properties, fontFamily: value }
                        })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Button Width</Label>
                      <Select
                        value={selectedElementData.properties.width || 'auto'}
                        onValueChange={(value) => updateElement(selectedElementData.id, {
                          properties: { ...selectedElementData.properties, width: value }
                        })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (Fit Content)</SelectItem>
                          <SelectItem value="100px">100px</SelectItem>
                          <SelectItem value="150px">150px</SelectItem>
                          <SelectItem value="200px">200px</SelectItem>
                          <SelectItem value="250px">250px</SelectItem>
                          <SelectItem value="300px">300px</SelectItem>
                          <SelectItem value="100%">Full Width</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Horizontal Alignment</Label>
                      <div className="flex gap-1 mt-2">
                        <Button
                          variant={selectedElementData.properties?.textAlign === 'left' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, textAlign: 'left' }
                          })}
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selectedElementData.properties?.textAlign === 'center' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, textAlign: 'center' }
                          })}
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selectedElementData.properties?.textAlign === 'right' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, textAlign: 'right' }
                          })}
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Vertical Position</Label>
                      <Select
                        value={selectedElementData.properties?.verticalPosition || 'middle'}
                        onValueChange={(value) => updateElement(selectedElementData.id, {
                          properties: { ...selectedElementData.properties, verticalPosition: value }
                        })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="middle">Middle</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}



                {selectedElementData.type === 'image' && (
                  <div className="space-y-4">
                    <div>
                      <Label>Upload or Select Image</Label>
                      <EmailImageUpload
                        whopUserId={whopUserId}
                        autoInsert={true}
                        onImageSelect={(image) => {
                          updateElement(selectedElementData.id, {
                            properties: { 
                              ...selectedElementData.properties, 
                              src: image.publicUrl,
                              alt: image.altText || image.fileName,
                              width: image.width || 600,
                              height: image.height || 300
                            }
                          })
                        }}
                      />
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input
                        value={selectedElementData.properties.src || ''}
                        onChange={(e) => updateElement(selectedElementData.id, {
                          properties: { ...selectedElementData.properties, src: e.target.value }
                        })}
                        className="mt-2"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    <div>
                      <Label>Alt Text</Label>
                      <Input
                        value={selectedElementData.properties.alt || ''}
                        onChange={(e) => updateElement(selectedElementData.id, {
                          properties: { ...selectedElementData.properties, alt: e.target.value }
                        })}
                        className="mt-2"
                      />
                    </div>
                    {/* Image Preview */}
                    {selectedElementData.properties.src && (
                      <div>
                        <Label>Preview</Label>
                        <div className="mt-2 border rounded-lg p-2 bg-muted/30">
                          <img
                            src={selectedElementData.properties.src}
                            alt={selectedElementData.properties.alt || 'Preview'}
                            className="w-full h-32 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/600x300?text=Image+Not+Found'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Width</Label>
                        <Input
                          type="number"
                          value={selectedElementData.properties.width || 600}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, width: e.target.value }
                          })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Height</Label>
                        <Input
                          type="number"
                          value={selectedElementData.properties.height || 300}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, height: e.target.value }
                          })}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                )}



                {selectedElementData.type === 'columns' && (
                  <div>
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Two Columns Layout</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Add elements to each column. Elements will be distributed alternately between left and right columns.
                      </p>
                    </div>
                    
                    {/* Left Column */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Left Column</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Type className="h-3 w-3 mr-1" />
                              Add Element
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'text')}>
                              <Type className="h-4 w-4 mr-2" />
                              Text
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'button')}>
                              <Square className="h-4 w-4 mr-2" />
                              Button
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'image')}>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Image
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'header')}>
                              <Star className="h-4 w-4 mr-2" />
                              Header
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'divider')}>
                              <Minus className="h-4 w-4 mr-2" />
                              Divider
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'spacer')}>
                              <Move className="h-4 w-4 mr-2" />
                              Spacer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="border rounded-lg p-3 bg-muted/30 min-h-[100px]">
                        {selectedElementData.children?.filter((_, index) => index % 2 === 0).length === 0 ? (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No elements in left column</p>
                            <p className="text-xs">Click "Add Element" to get started</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedElementData.children?.filter((_, index) => index % 2 === 0).map((child, index) => (
                              <div 
                                key={child.id} 
                                className="flex items-center gap-2 p-2 bg-background rounded border cursor-pointer hover:bg-accent" 
                                onClick={() => setSelectedNestedElement({parentId: selectedElementData.id, childId: child.id})}
                              >
                                {child.type === 'text' && <Type className="h-3 w-3" />}
                                {child.type === 'button' && <Square className="h-3 w-3" />}
                                {child.type === 'image' && <ImageIcon className="h-3 w-3" />}
                                {child.type === 'header' && <Star className="h-3 w-3" />}
                                {child.type === 'divider' && <Minus className="h-3 w-3" />}
                                {child.type === 'spacer' && <Move className="h-3 w-3" />}
                                <span className="text-xs flex-1 truncate">
                                  {child.type.charAt(0).toUpperCase() + child.type.slice(1)} {index + 1}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Remove element from column
                                    setElements(prev => prev.map(el => {
                                      if (el.id === selectedElementData.id) {
                                        return {
                                          ...el,
                                          children: el.children?.filter(c => c.id !== child.id) || []
                                        }
                                      }
                                      return el
                                    }))
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Right Column */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Right Column</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Type className="h-3 w-3 mr-1" />
                              Add Element
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'text')}>
                              <Type className="h-4 w-4 mr-2" />
                              Text
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'button')}>
                              <Square className="h-4 w-4 mr-2" />
                              Button
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'image')}>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Image
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'header')}>
                              <Star className="h-4 w-4 mr-2" />
                              Header
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'divider')}>
                              <Minus className="h-4 w-4 mr-2" />
                              Divider
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'spacer')}>
                              <Move className="h-4 w-4 mr-2" />
                              Spacer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="border rounded-lg p-3 bg-muted/30 min-h-[100px]">
                        {selectedElementData.children?.filter((_, index) => index % 2 === 1).length === 0 ? (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No elements in right column</p>
                            <p className="text-xs">Click "Add Element" to get started</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedElementData.children?.filter((_, index) => index % 2 === 1).map((child, index) => (
                              <div 
                                key={child.id} 
                                className="flex items-center gap-2 p-2 bg-background rounded border cursor-pointer hover:bg-accent" 
                                onClick={() => setSelectedNestedElement({parentId: selectedElementData.id, childId: child.id})}
                              >
                                {child.type === 'text' && <Type className="h-3 w-3" />}
                                {child.type === 'button' && <Square className="h-3 w-3" />}
                                {child.type === 'image' && <ImageIcon className="h-3 w-3" />}
                                {child.type === 'header' && <Star className="h-3 w-3" />}
                                {child.type === 'divider' && <Minus className="h-3 w-3" />}
                                {child.type === 'spacer' && <Move className="h-3 w-3" />}
                                <span className="text-xs flex-1 truncate">
                                  {child.type.charAt(0).toUpperCase() + child.type.slice(1)} {index + 1}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Remove element from column
                                    setElements(prev => prev.map(el => {
                                      if (el.id === selectedElementData.id) {
                                        return {
                                          ...el,
                                          children: el.children?.filter(c => c.id !== child.id) || []
                                        }
                                      }
                                      return el
                                    }))
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                                    <div className="mt-2 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Column Tips:</p>
                  <ul className="space-y-1">
                    <li>• Elements are distributed alternately between columns</li>
                    <li>• Add text, buttons, images, headers, dividers, or spacers</li>
                    <li>• Use ↑↓ arrows to reorder elements within each column</li>
                    <li>• Click the trash icon to remove elements</li>
                    <li>• Preview shows the final layout</li>
                  </ul>
                </div>
                  </div>
                )}

                {selectedElementData.type === 'embed' && (
                  <div className="space-y-3">
                    <div>
                      <Label>Embed Type</Label>
                      <Select
                        value={selectedElementData.properties?.type || 'html'}
                        onValueChange={(value) => updateElement(selectedElementData.id, {
                          properties: { ...selectedElementData.properties, type: value }
                        })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select embed type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="html">Custom HTML</SelectItem>
                          <SelectItem value="iframe">iFrame URL</SelectItem>
                          <SelectItem value="script">JavaScript</SelectItem>
                          <SelectItem value="video">Video URL</SelectItem>
                          <SelectItem value="social">Social Media</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(selectedElementData.properties?.type === 'html' || !selectedElementData.properties?.type) && (
                      <div>
                        <Label>Custom HTML Code</Label>
                        <Textarea
                          value={selectedElementData.properties?.html || ''}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, html: e.target.value }
                          })}
                          placeholder="<div>Your custom HTML here...</div>"
                          className="mt-2 font-mono text-sm"
                          rows={8}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter any HTML code. Scripts will be automatically wrapped in a safe container.
                        </p>
                      </div>
                    )}
                    
                    {selectedElementData.properties?.type === 'script' && (
                      <div>
                        <Label>JavaScript Code</Label>
                        <Textarea
                          value={selectedElementData.properties?.script || ''}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, script: e.target.value }
                          })}
                          placeholder="document.write('Hello World!');"
                          className="mt-2 font-mono text-sm"
                          rows={6}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          JavaScript will be wrapped in a script tag. Note: Many email clients block scripts.
                        </p>
                      </div>
                    )}
                    
                    {(selectedElementData.properties?.type === 'iframe' || selectedElementData.properties?.type === 'video') && (
                      <div>
                        <Label>URL</Label>
                        <Input
                          value={selectedElementData.properties?.url || ''}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, url: e.target.value }
                          })}
                          placeholder={selectedElementData.properties?.type === 'iframe' ? "https://example.com/embed" : "https://example.com/video.mp4"}
                          className="mt-2"
                        />
                      </div>
                    )}
                    
                    {selectedElementData.properties?.type === 'social' && (
                      <div>
                        <Label>Social Media URL</Label>
                        <Input
                          value={selectedElementData.properties?.url || ''}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, url: e.target.value }
                          })}
                          placeholder="https://twitter.com/username/status/123456"
                          className="mt-2"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label>Fallback Text</Label>
                      <Input
                        value={selectedElementData.properties?.fallbackText || 'Content not available'}
                        onChange={(e) => updateElement(selectedElementData.id, {
                          properties: { ...selectedElementData.properties, fallbackText: e.target.value }
                        })}
                        placeholder="Text shown when embed fails to load"
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Width</Label>
                        <Input
                          type="number"
                          value={selectedElementData.properties?.width || 600}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, width: parseInt(e.target.value) || 600 }
                          })}
                          className="mt-2"
                          placeholder="600"
                        />
                      </div>
                      <div>
                        <Label>Height</Label>
                        <Input
                          type="number"
                          value={selectedElementData.properties?.height || 400}
                          onChange={(e) => updateElement(selectedElementData.id, {
                            properties: { ...selectedElementData.properties, height: parseInt(e.target.value) || 400 }
                          })}
                          className="mt-2"
                          placeholder="400"
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Embed Tips:</p>
                      <ul className="space-y-1">
                        <li>• Custom HTML: Insert any HTML code directly</li>
                        <li>• JavaScript: Add interactive functionality (limited support)</li>
                        <li>• iFrame: Embed external web content</li>
                        <li>• Video: Direct video file URLs</li>
                        <li>• Social: Social media post links</li>
                        <li>• Many email clients block scripts and iframes</li>
                        <li>• Always provide fallback text for accessibility</li>
                      </ul>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      {/* Center Panel - Preview */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Preview Header */}
        <div className="p-3 lg:p-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm lg:text-base font-medium text-card-foreground">Email Preview</h2>
            </div>
            <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEmailPreviewTheme(theme => theme === 'dark' ? 'light' : 'dark')}
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground h-8 px-2 lg:px-3"
              >
                {emailPreviewTheme === 'dark' ? '🌙' : '☀️'} <span className="hidden sm:inline">{emailPreviewTheme === 'dark' ? 'Dark' : 'Light'}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyHTML}
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground h-8 px-2 lg:px-3"
              >
                <Copy className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-1" />
                <span className="hidden sm:inline">Copy HTML</span>
              </Button>
              
              {/* Scheduling Section */}
              <div className="flex items-center gap-1 lg:gap-2 border rounded-lg px-2 lg:px-3 py-1">
                <div className="flex items-center gap-1 lg:gap-2">
                  <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
                  <span className="text-xs lg:text-sm font-medium">Schedule</span>
                </div>
                <Select
                  value={scheduleType}
                  onValueChange={(value: "immediate" | "custom" | "preset") => setScheduleType(value)}
                  disabled={isSending}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Now</SelectItem>
                    <SelectItem value="preset">Preset</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>

                {scheduleType === "preset" && (
                  <Select
                    value={presetSchedule}
                    onValueChange={setPresetSchedule}
                    disabled={isSending}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in 1 hour">In 1 hour</SelectItem>
                      <SelectItem value="in 2 hours">In 2 hours</SelectItem>
                      <SelectItem value="in 4 hours">In 4 hours</SelectItem>
                      <SelectItem value="in 6 hours">In 6 hours</SelectItem>
                      <SelectItem value="in 12 hours">In 12 hours</SelectItem>
                      <SelectItem value="tomorrow at 9am">Tomorrow 9am</SelectItem>
                      <SelectItem value="tomorrow at 2pm">Tomorrow 2pm</SelectItem>
                      <SelectItem value="next monday at 9am">Next Monday 9am</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {scheduleType === "custom" && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      disabled={isSending}
                      className="w-28 h-8 text-xs"
                    />
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      disabled={isSending}
                      className="w-20 h-8 text-xs"
                    />
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handleSend} 
                disabled={!subject.trim() || isSending}
                className="bg-primary text-orange-600-foreground hover:bg-primary/90 h-8 px-3 lg:px-4"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {scheduleType !== "immediate" ? "Scheduling..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {scheduleType !== "immediate" ? "Schedule Email" : "Send Email"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-background p-3 lg:p-6 min-h-0">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg bg-card border-border">
              <CardHeader className="bg-card border-b border-border">
                <CardTitle className="text-lg text-card-foreground">Subject: {subject || 'No subject'}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div 
                  className={`email-preview ${emailPreviewTheme === 'dark' ? 'dark' : 'light'}`}
                  style={{ 
                    fontFamily: 'Arial, sans-serif',
                    lineHeight: '1.6',
                    color: emailPreviewTheme === 'dark' ? '#ffffff' : '#000000',
                    backgroundColor: emailPreviewTheme === 'dark' ? '#1f2937' : '#ffffff',
                    maxWidth: '600px',
                    margin: '0 auto',
                    padding: '20px',
                    border: `1px solid ${emailPreviewTheme === 'dark' ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px'
                  }}
                >
                  {elements.map(element => {
                    const styles = element.styles
                    const isSelected = selectedElement === element.id
                    const isDragging = draggedElementId === element.id
                    
                    switch (element.type) {
                      case 'text':
                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            style={{
                              ...styles,
                              fontSize: element.properties?.fontSize || '16px',
                              fontFamily: element.properties?.fontFamily || 'Arial, sans-serif',
                              color: element.properties?.color || (emailPreviewTheme === 'dark' ? '#ffffff' : '#000000'),
                              textAlign: element.properties?.textAlign || 'left',
                              fontWeight: element.properties?.fontWeight || 'normal',
                              backgroundColor: 'transparent',
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`text-element ${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50' : ''} cursor-move hover:ring-1 hover:ring-gray-300 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: processTextContent(element.content) }} />
                          </div>
                        )
                      case 'button':
                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            data-element-id={element.id}
                            style={{ 
                              textAlign: element.properties?.textAlign || 'center', 
                              margin: '20px 0',
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50 p-2' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50' : ''} cursor-move hover:ring-1 hover:ring-gray-300 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div 
                              style={{
                                backgroundColor: element.properties?.color || '#007bff',
                                color: element.properties?.textColor || '#ffffff',
                                padding: element.properties?.padding || '12px 24px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: element.properties?.fontSize || '16px',
                                fontWeight: 'bold',
                                fontFamily: element.properties?.fontFamily || 'Arial, sans-serif',
                                width: element.properties?.width || 'auto',
                                display: 'inline-block',
                                minHeight: '44px',
                                lineHeight: '1.2',
                                position: 'relative',
                                zIndex: 1,
                                textDecoration: 'none',
                                outline: 'none',
                                textAlign: 'center',
                                '--button-text-color': element.properties?.textColor || '#ffffff'
                              } as React.CSSProperties}
                              className="email-button"
                              data-text-color={element.properties?.textColor || '#ffffff'}
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Button clicked:', {
                                  text: element.properties?.text || element.content,
                                  textColor: element.properties?.textColor,
                                  backgroundColor: element.properties?.color
                                });
                              }}
                            >
                              <span 
                                style={{
                                  color: element.properties?.textColor || '#ffffff',
                                  backgroundColor: 'transparent',
                                  fontSize: element.properties?.fontSize || '16px',
                                  fontWeight: 'bold',
                                  fontFamily: element.properties?.fontFamily || 'Arial, sans-serif',
                                  display: 'inline',
                                  lineHeight: '1.2'
                                }}
                                className="button-text"
                              >
                                {element.properties?.text || element.content || 'Click Here'}
                              </span>
                            </div>
                          </div>
                        )
                      case 'image':
                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            style={{ 
                              textAlign: 'center', 
                              margin: '20px 0',
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50 p-2' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50' : ''} cursor-move hover:ring-1 hover:ring-gray-300 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >

                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <img 
                              src={element.properties.src || element.content} 
                              alt={element.properties.alt || "Email image"} 
                              style={{ 
                                maxWidth: '100%', 
                                borderRadius: '4px',
                                width: element.properties.width ? `${element.properties.width}px` : 'auto',
                                height: element.properties.height ? `${element.properties.height}px` : 'auto'
                              }} 
                              onError={(e) => {
                                console.error('Image failed to load:', element.properties.src || element.content)
                                // Use a data URI for a simple placeholder instead of external service
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4='
                              }}
                            />
                          </div>
                        )
                      case 'divider':
                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            style={{ 
                              borderTop: '1px solid #e0e0e0', 
                              margin: '20px 0',
                              ...styles,
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50 p-2' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50' : ''} cursor-move hover:ring-1 hover:ring-gray-300 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      case 'spacer':
                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            style={{ 
                              height: element.content || '20px',
                              ...styles,
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50' : ''} cursor-move hover:ring-1 hover:ring-gray-300 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )

                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            style={{
                              ...styles,
                              color: element.styles?.color || (emailPreviewTheme === 'dark' ? '#ffffff' : '#000000'),
                              backgroundColor: 'transparent',
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`list-element ${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50' : ''} cursor-move hover:ring-1 hover:ring-gray-300 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                          </div>
                        )
                      case 'header':
                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            style={{
                              fontSize: element.properties?.fontSize || '24px',
                              fontFamily: element.properties?.fontFamily || 'Arial, sans-serif',
                              color: element.properties?.color || (emailPreviewTheme === 'dark' ? '#ffffff' : '#000000'),
                              textAlign: element.properties?.textAlign || 'center',
                              fontWeight: element.properties?.fontWeight || 'bold',
                              padding: '20px 0',
                              backgroundColor: 'transparent',
                              ...styles,
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50 p-2' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50' : ''} cursor-move hover:ring-1 hover:ring-gray-300 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            {element.content}
                          </div>
                        )
                      case 'footer':
                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            style={{
                              textAlign: 'center',
                              padding: '20px 0',
                              color: '#666',
                              fontSize: '14px',
                              backgroundColor: 'transparent',
                              ...styles,
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50 p-2' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50' : ''} cursor-move hover:ring-1 hover:ring-gray-300 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            Footer content will be generated automatically
                          </div>
                        )
                      case 'embed':
                        const previewEmbedType = element.properties?.type || 'html'
                        const previewEmbedWidth = element.properties?.width || 600
                        const previewEmbedHeight = element.properties?.height || 400
                        const previewFallbackText = element.properties?.fallbackText || 'Content not available'
                        
                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            style={{
                              textAlign: 'center',
                              margin: '20px 0',
                              ...styles,
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50 p-2' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50' : ''} cursor-move hover:ring-1 hover:ring-gray-300 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            {previewEmbedType === 'html' ? (
                              element.properties?.html ? (
                                <div 
                                  dangerouslySetInnerHTML={{ __html: element.properties.html }}
                                  style={{ maxWidth: '100%' }}
                                />
                              ) : (
                                <div style={{ padding: '40px', border: '2px dashed #e0e0e0', borderRadius: '8px', color: '#666' }}>
                                  <ExternalLink className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                  <p>No HTML code provided</p>
                                  <p className="text-sm">Add HTML code in the properties panel</p>
                                </div>
                              )
                            ) : previewEmbedType === 'script' ? (
                              element.properties?.script ? (
                                <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
                                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>🔧 JavaScript Code</div>
                                  <pre style={{ fontSize: '10px', color: '#333', textAlign: 'left', overflow: 'auto' }}>
                                    {element.properties.script}
                                  </pre>
                                  <div style={{ fontSize: '10px', color: '#999', marginTop: '8px' }}>
                                    Note: Scripts may be blocked by email clients
                                  </div>
                                </div>
                              ) : (
                                <div style={{ padding: '40px', border: '2px dashed #e0e0e0', borderRadius: '8px', color: '#666' }}>
                                  <ExternalLink className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                  <p>No JavaScript code provided</p>
                                  <p className="text-sm">Add JavaScript code in the properties panel</p>
                                </div>
                              )
                            ) : element.properties?.url ? (
                              previewEmbedType === 'iframe' ? (
                                <iframe 
                                  src={element.properties.url} 
                                  width={previewEmbedWidth} 
                                  height={previewEmbedHeight} 
                                  frameBorder="0" 
                                  allowFullScreen
                                  style={{ maxWidth: '100%', border: 'none', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                  onError={(e) => {
                                    console.error('Embed failed to load:', element.properties.url)
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : previewEmbedType === 'video' ? (
                                <video 
                                  width={previewEmbedWidth} 
                                  height={previewEmbedHeight} 
                                  controls
                                  style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                >
                                  <source src={element.properties.url} type="video/mp4" />
                                  <source src={element.properties.url} type="video/webm" />
                                  {previewFallbackText}
                                </video>
                              ) : (
                                <a href={element.properties.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                  <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', maxWidth: previewEmbedWidth, margin: '0 auto', background: '#f9f9f9' }}>
                                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>🔗 Embedded Content</div>
                                    <div style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>{previewFallbackText}</div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>Click to view →</div>
                                  </div>
                                </a>
                              )
                            ) : (
                              <div style={{ padding: '40px', border: '2px dashed #e0e0e0', borderRadius: '8px', color: '#666' }}>
                                <ExternalLink className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p>No content provided</p>
                                <p className="text-sm">Add content in the properties panel</p>
                              </div>
                            )}
                          </div>
                        )
                      case 'columns':
                        return (
                          <div 
                            key={element.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, element.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, element.id)}
                            onDragEnd={handleDragEnd}
                            style={{
                              opacity: isDragging ? 0.5 : 1,
                              transform: isDragging ? 'rotate(5deg)' : 'none'
                            }}
                            className={`${isSelected ? 'ring-2 ring-orange-500 ring-opacity-50 p-2' : ''} ${dropTargetId === element.id ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-50 dark:bg-blue-950/30' : ''} cursor-move hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all relative group`}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {dropTargetId === element.id && (
                              <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-950/30 bg-opacity-50 rounded-lg pointer-events-none z-5">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                                  Drop here
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                              <div className="bg-orange-500 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-orange-600 font-medium">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
                                  </svg>
                                  Drag to reorder
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setElements(prev => prev.filter(el => el.id !== element.id));
                                  setSelectedElement(null);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg shadow-lg border border-red-600 font-medium transition-colors"
                                title="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
                              <div style={{ flex: 1 }}>
                                {element.children?.filter((_, index) => index % 2 === 0).map((child) => (
                                  <div key={child.id} style={{ marginBottom: '15px' }}>
                                    {child.type === 'text' && (
                                      <div style={child.styles}>{child.content}</div>
                                    )}
                                    {child.type === 'image' && (
                                      <div style={{ textAlign: 'center' }}>
                                        <img 
                                          src={child.properties?.src || ''} 
                                          alt={child.properties?.alt || ''} 
                                          style={child.styles}
                                          width={child.properties?.width || 'auto'}
                                          height={child.properties?.height || 'auto'}
                                        />
                                      </div>
                                    )}
                                    {child.type === 'button' && (
                                      <div style={{ textAlign: 'center' }}>
                                        <button style={child.styles}>
                                          {child.properties?.text || child.content}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div style={{ flex: 1 }}>
                                {element.children?.filter((_, index) => index % 2 === 1).map((child) => (
                                  <div key={child.id} style={{ marginBottom: '15px' }}>
                                    {child.type === 'text' && (
                                      <div style={child.styles}>{child.content}</div>
                                    )}
                                    {child.type === 'image' && (
                                      <div style={{ textAlign: 'center' }}>
                                        <img 
                                          src={child.properties?.src || ''} 
                                          alt={child.properties?.alt || ''} 
                                          style={child.styles}
                                          width={child.properties?.width || 'auto'}
                                          height={child.properties?.height || 'auto'}
                                        />
                                      </div>
                                    )}
                                    {child.type === 'button' && (
                                      <div style={{ textAlign: 'center' }}>
                                        <button style={child.styles}>
                                          {child.properties?.text || child.content}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      default:
                        return null
                    }
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Email Template</DialogTitle>
            <DialogDescription>
              Save your current email design as a reusable template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="template-category">Category</Label>
              <Select value={templateCategory} onValueChange={setTemplateCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={!templateName.trim() || loading}>
              {loading ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Email Template</DialogTitle>
            <DialogDescription>
              Choose a template to load into the designer.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <p>Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No templates found</p>
                <p className="text-sm">Create your first template by saving your current design</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border rounded-lg hover:border-border/80 transition-colors border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{template.name}</h3>
                          {template.is_favorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                          {template.whop_user_id === 'default' && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Subject: {template.subject}
                        </p>
                        {template.usage_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Used {template.usage_count} times
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadTemplate(template.id)}
                          disabled={loading}
                        >
                          Load
                        </Button>
                        {template.whop_user_id !== 'default' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => duplicateTemplate(template.id)}>
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteTemplate(template.id)}
                                className="text-red-600"
                              >
                                Delete
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowImportDialog(true)}
              className="mr-auto"
            >
              Import HTML <Badge variant="secondary" className="ml-2 text-xs">BETA</Badge>
            </Button>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Edit the properties of your saved template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                value={editingTemplateName}
                onChange={(e) => setEditingTemplateName(e.target.value)}
                placeholder="Enter template name..."
              />
            </div>
            <div>
              <Label htmlFor="edit-template-description">Description (Optional)</Label>
              <Textarea
                id="edit-template-description"
                value={editingTemplateDescription}
                onChange={(e) => setEditingTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="edit-template-category">Category</Label>
              <Select value={editingTemplateCategory} onValueChange={setEditingTemplateCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editTemplate} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import HTML Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import HTML Template</DialogTitle>
            <DialogDescription>
              Import a custom HTML email template. You can paste HTML code or upload an HTML file.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Import Method Selection */}
            <div>
              <Label className="text-sm font-medium">Import Method</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={importMethod === 'paste' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMethod('paste')}
                >
                  Paste HTML
                </Button>
                <Button
                  variant={importMethod === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMethod('file')}
                >
                  Upload File
                </Button>
              </div>
            </div>

            {/* HTML Input */}
            {importMethod === 'paste' ? (
              <div>
                <Label className="text-sm font-medium">HTML Code</Label>
                <Textarea
                  value={importHtmlContent}
                  onChange={(e) => setImportHtmlContent(e.target.value)}
                  placeholder="Paste your HTML email code here..."
                  rows={15}
                  className="mt-2 font-mono text-sm"
                />
              </div>
            ) : (
              <div>
                <Label className="text-sm font-medium">HTML File</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload an HTML file (max 1MB)
                  </p>
                </div>
              </div>
            )}

            {/* Template Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Template Name</Label>
                <Input
                  value={importTemplateName}
                  onChange={(e) => setImportTemplateName(e.target.value)}
                  placeholder="Enter template name..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Subject Line</Label>
                <Input
                  value={importSubject}
                  onChange={(e) => setImportSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Input
                  value={importTemplateDescription}
                  onChange={(e) => setImportTemplateDescription(e.target.value)}
                  placeholder="Enter template description..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <Select value={importTemplateCategory} onValueChange={setImportTemplateCategory}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            {importHtmlContent && (
              <div>
                <Label className="text-sm font-medium">Preview</Label>
                <div className="mt-2 border rounded-lg p-4 bg-muted/50 dark:bg-muted/30 max-h-64 overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ __html: importHtmlContent }}
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const elements = parseHtmlToElements(importHtmlContent)
                    console.log('Debug - Parsed elements:', elements)
                    alert(`Parsed ${elements.length} elements. Check console for details.`)
                  }}
                  className="mt-2"
                >
                  Debug Parse
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={importHtmlTemplate} 
              disabled={loading || !importHtmlContent.trim() || !importTemplateName.trim()}
            >
              {loading ? 'Importing...' : 'Import Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Element Properties */}
      {selectedNestedElement && (() => {
        const nestedElement = findNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId)
        if (!nestedElement) return null
        
        return (
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">
                Properties - {nestedElement.type.charAt(0).toUpperCase() + nestedElement.type.slice(1)} (Nested)
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNestedElement(null)}
              >
                ×
              </Button>
            </div>
            
            {nestedElement.type === 'text' && (
              <div>
                <Label>Content</Label>
                <Textarea
                  value={nestedElement.content}
                  onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, { content: e.target.value })}
                  rows={3}
                  className="mt-2"
                  placeholder="Enter your text here... Use the toolbar buttons above for easy formatting!"
                />
                <RichTextToolbar
                  onFormat={(format) => {
                    // Handle formatting for nested text elements
                    const textarea = document.getElementById(`nested-textarea-${nestedElement.id}`) as HTMLTextAreaElement
                    if (!textarea) return

                    const start = textarea.selectionStart
                    const end = textarea.selectionEnd
                    const selectedText = nestedElement.content.substring(start, end)
                    let newText = ''

                    switch (format) {
                      case 'bold':
                        newText = `**${selectedText}**`
                        break
                      case 'italic':
                        newText = `*${selectedText}*`
                        break
                      case 'bullet-list':
                        newText = selectedText.split('\n').map(line => `- ${line}`).join('\n')
                        break
                      case 'numbered-list':
                        newText = selectedText.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n')
                        break
                      case 'quote':
                        newText = selectedText.split('\n').map(line => `> ${line}`).join('\n')
                        break
                      default:
                        return
                    }

                    const updatedContent = nestedElement.content.substring(0, start) + newText + nestedElement.content.substring(end)
                    updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, { content: updatedContent })
                  }}
                  onAlign={(alignment) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, {
                    styles: { ...nestedElement.styles, textAlign: alignment }
                  })}
                  currentAlignment={nestedElement.styles.textAlign}
                />
              </div>
            )}
            
            {nestedElement.type === 'button' && (
              <div className="space-y-3">
                <div>
                  <Label>Button Text</Label>
                  <Input
                    value={nestedElement.content}
                    onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, { content: e.target.value })}
                    className="mt-2"
                    placeholder="Enter button text..."
                  />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={nestedElement.properties?.url || ''}
                    onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, {
                      properties: { ...nestedElement.properties, url: e.target.value }
                    })}
                    placeholder="https://example.com"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Button Color</Label>
                  <Input
                    type="color"
                    value={nestedElement.properties?.color || '#007bff'}
                    onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, {
                      properties: { ...nestedElement.properties, color: e.target.value },
                      styles: { ...nestedElement.styles, backgroundColor: e.target.value }
                    })}
                    className="mt-2 h-10"
                  />
                </div>
              </div>
            )}
            
            {nestedElement.type === 'image' && (
              <div className="space-y-3">
                <div>
                  <Label>Image Upload</Label>
                  {whopUserId ? (
                    <EmailImageUpload
                      whopUserId={whopUserId}
                      autoInsert={true}
                      onImageSelect={(image) => {
                        updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, {
                          content: image.publicUrl,
                          properties: { 
                            ...nestedElement.properties, 
                            src: image.publicUrl,
                            alt: image.altText || image.fileName,
                            width: image.width || 600,
                            height: image.height || 300
                          }
                        })
                      }}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground p-2 border rounded">
                      Loading user data...
                    </div>
                  )}
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={nestedElement.properties?.src || nestedElement.content || ''}
                    onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, {
                      content: e.target.value,
                      properties: { ...nestedElement.properties, src: e.target.value }
                    })}
                    className="mt-2"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <Label>Alt Text</Label>
                  <Input
                    value={nestedElement.properties?.alt || ''}
                    onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, {
                      properties: { ...nestedElement.properties, alt: e.target.value }
                    })}
                    className="mt-2"
                    placeholder="Description of the image"
                  />
                </div>
                {nestedElement.properties?.src && (
                  <div>
                    <Label>Preview</Label>
                    <div className="mt-2 border rounded-lg p-2">
                      <img
                        src={nestedElement.properties.src}
                        alt={nestedElement.properties.alt || 'Preview'}
                        className="max-w-full h-auto rounded"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={nestedElement.properties?.width || 600}
                      onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, {
                        properties: { ...nestedElement.properties, width: e.target.value }
                      })}
                      className="mt-2"
                      placeholder="600"
                    />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={nestedElement.properties?.height || 300}
                      onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, {
                        properties: { ...nestedElement.properties, height: e.target.value }
                      })}
                      className="mt-2"
                      placeholder="300"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {nestedElement.type === 'header' && (
              <div>
                <Label>Header Text</Label>
                <Input
                  value={nestedElement.content}
                  onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, { content: e.target.value })}
                  className="mt-2"
                  placeholder="Enter header text..."
                />
              </div>
            )}
            
            {nestedElement.type === 'spacer' && (
              <div>
                <Label>Height (px)</Label>
                <Input
                  value={nestedElement.content}
                  onChange={(e) => updateNestedElement(selectedNestedElement.parentId, selectedNestedElement.childId, { content: e.target.value })}
                  className="mt-2"
                  placeholder="Enter height in pixels..."
                />
              </div>
            )}
          </div>
        )
      })()}

      {/* Right Panel - Element Properties */}
      {selectedElementData && (
        <div className="w-full lg:w-80 xl:w-80 bg-card border-l border-border flex flex-col max-h-[50vh] lg:max-h-full overflow-hidden">
          {/* Properties Header */}
          <div className="p-3 lg:p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Properties - {selectedElementData.type.charAt(0).toUpperCase() + selectedElementData.type.slice(1)}
              </h3>
              <Badge variant="outline" className="text-xs">
                {elements.findIndex(el => el.id === selectedElementData.id) + 1} of {elements.length}
              </Badge>
            </div>
          </div>

          {/* Properties Content */}
          <div className="flex-1 overflow-y-auto p-3 lg:p-4">
            {selectedElementData.type === 'text' && (
              <div className="space-y-3">
                <div>
                  <Label>Content</Label>
                  <Textarea
                    id={`textarea-${selectedElementData.id}`}
                    value={selectedElementData.content}
                    onChange={(e) => updateElement(selectedElementData.id, { content: e.target.value })}
                    rows={3}
                    className="mt-2"
                    placeholder="Enter your text here... Use the toolbar buttons above for easy formatting!"
                  />
                  <RichTextToolbar
                    onFormat={(format) => handleFormat(selectedElementData.id, format)}
                    onAlign={(alignment) => handleAlign(selectedElementData.id, alignment)}
                    currentAlignment={selectedElementData.properties?.textAlign || selectedElementData.styles.textAlign}
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">💡 Use toolbar for formatting, select text for Bold/Italic</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Font Size</Label>
                    <Select
                      value={selectedElementData.properties?.fontSize || '16px'}
                      onValueChange={(value) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, fontSize: value }
                      })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="14px">14px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="18px">18px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="28px">28px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input
                      type="color"
                      value={selectedElementData.properties?.color || '#333333'}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, color: e.target.value }
                      })}
                      className="mt-2 h-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Font Family</Label>
                  <Select
                    value={selectedElementData.properties?.fontFamily || 'Arial, sans-serif'}
                    onValueChange={(value) => updateElement(selectedElementData.id, {
                      properties: { ...selectedElementData.properties, fontFamily: value }
                    })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Alignment</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={selectedElementData.properties?.textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAlign(selectedElementData.id, 'left')}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedElementData.properties?.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAlign(selectedElementData.id, 'center')}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedElementData.properties?.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAlign(selectedElementData.id, 'right')}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedElementData.type === 'header' && (
              <div className="space-y-3">
                <div>
                  <Label>Header Text</Label>
                  <Input
                    value={selectedElementData.content}
                    onChange={(e) => updateElement(selectedElementData.id, { content: e.target.value })}
                    className="mt-2"
                    placeholder="Enter header text..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Font Size</Label>
                    <Select
                      value={selectedElementData.styles.fontSize}
                      onValueChange={(value) => updateElement(selectedElementData.id, {
                        styles: { ...selectedElementData.styles, fontSize: value }
                      })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="14px">14px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="18px">18px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="28px">28px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="36px">36px</SelectItem>
                        <SelectItem value="48px">48px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input
                      type="color"
                      value={selectedElementData.styles.color}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        styles: { ...selectedElementData.styles, color: e.target.value }
                      })}
                      className="mt-2 h-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Alignment</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={selectedElementData.styles.textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAlign(selectedElementData.id, 'left')}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedElementData.styles.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAlign(selectedElementData.id, 'center')}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedElementData.styles.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAlign(selectedElementData.id, 'right')}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedElementData.type === 'button' && (
              <div className="space-y-3">
                <div>
                  <Label>Button Text</Label>
                  <Input
                    value={selectedElementData.properties.text || selectedElementData.content || ''}
                    onChange={(e) => updateElement(selectedElementData.id, {
                      content: e.target.value,
                      properties: { ...selectedElementData.properties, text: e.target.value }
                    })}
                    placeholder="Enter button text..."
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={selectedElementData.properties.url || ''}
                    onChange={(e) => updateElement(selectedElementData.id, {
                      properties: { ...selectedElementData.properties, url: e.target.value }
                    })}
                    placeholder="https://example.com"
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Background Color</Label>
                    <Input
                      type="color"
                      value={selectedElementData.properties.color || '#007bff'}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, color: e.target.value },
                        styles: { ...selectedElementData.styles, backgroundColor: e.target.value }
                      })}
                      className="mt-2 h-10"
                    />
                  </div>
                  <div>
                    <Label>Text Color</Label>
                    <Input
                      type="color"
                      value={selectedElementData.properties.textColor || '#ffffff'}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, textColor: e.target.value }
                      })}
                      className="mt-2 h-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Font Size</Label>
                    <Select
                      value={selectedElementData.properties.fontSize || '16px'}
                      onValueChange={(value) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, fontSize: value }
                      })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="14px">14px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="18px">18px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="28px">28px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Padding</Label>
                    <Select
                      value={selectedElementData.properties.padding || '12px 24px'}
                      onValueChange={(value) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, padding: value }
                      })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8px 16px">Small</SelectItem>
                        <SelectItem value="12px 24px">Medium</SelectItem>
                        <SelectItem value="16px 32px">Large</SelectItem>
                        <SelectItem value="20px 40px">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Font Family</Label>
                  <Select
                    value={selectedElementData.properties.fontFamily || 'Arial, sans-serif'}
                    onValueChange={(value) => updateElement(selectedElementData.id, {
                      properties: { ...selectedElementData.properties, fontFamily: value }
                    })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Button Width</Label>
                  <Select
                    value={selectedElementData.properties.width || 'auto'}
                    onValueChange={(value) => updateElement(selectedElementData.id, {
                      properties: { ...selectedElementData.properties, width: value }
                    })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Fit Content)</SelectItem>
                      <SelectItem value="100px">100px</SelectItem>
                      <SelectItem value="150px">150px</SelectItem>
                      <SelectItem value="200px">200px</SelectItem>
                      <SelectItem value="250px">250px</SelectItem>
                      <SelectItem value="300px">300px</SelectItem>
                      <SelectItem value="100%">Full Width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horizontal Alignment</Label>
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant={selectedElementData.properties?.alignment === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, alignment: 'left' }
                      })}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedElementData.properties?.alignment === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, alignment: 'center' }
                      })}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedElementData.properties?.alignment === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, alignment: 'right' }
                      })}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Vertical Position</Label>
                  <Select
                    value={selectedElementData.properties?.verticalPosition || 'middle'}
                    onValueChange={(value) => updateElement(selectedElementData.id, {
                      properties: { ...selectedElementData.properties, verticalPosition: value }
                    })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedElementData.type === 'image' && (
              <div className="space-y-3">
                <div>
                  <Label>Image Upload</Label>
                  {whopUserId ? (
                    <EmailImageUpload
                      whopUserId={whopUserId}
                      onImageSelect={(imageData) => {
                        updateElement(selectedElementData.id, {
                          properties: {
                            ...selectedElementData.properties,
                            src: imageData.publicUrl,
                            alt: imageData.altText || 'Email image'
                          }
                        })
                      }}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground p-2 border rounded">
                      Loading user data...
                    </div>
                  )}
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={selectedElementData.properties.src || ''}
                    onChange={(e) => updateElement(selectedElementData.id, {
                      properties: { ...selectedElementData.properties, src: e.target.value }
                    })}
                    placeholder="https://example.com/image.jpg"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Alt Text</Label>
                  <Input
                    value={selectedElementData.properties.alt || ''}
                    onChange={(e) => updateElement(selectedElementData.id, {
                      properties: { ...selectedElementData.properties, alt: e.target.value }
                    })}
                    placeholder="Description of the image"
                    className="mt-2"
                  />
                </div>
                {selectedElementData.properties.src && (
                  <div>
                    <Label>Preview</Label>
                    <div className="mt-2 border rounded-lg p-2">
                      <img
                        src={selectedElementData.properties.src}
                        alt={selectedElementData.properties.alt || 'Preview'}
                        className="max-w-full h-auto rounded"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={selectedElementData.properties.width || 600}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, width: e.target.value }
                      })}
                      className="mt-2"
                      placeholder="600"
                    />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={selectedElementData.properties.height || 300}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, height: e.target.value }
                      })}
                      className="mt-2"
                      placeholder="300"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedElementData.type === 'columns' && (
              <div className="space-y-3">
                <div>
                  <Label>Column Layout</Label>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>Two-column layout with alternating elements</p>
                  </div>
                </div>
                
                <div>
                  <Label>Left Column</Label>
                  <div className="mt-2 space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Element
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'text', 'left')}>
                          <Type className="h-4 w-4 mr-2" />
                          Text
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'button')}>
                          <Square className="h-4 w-4 mr-2" />
                          Button
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'image')}>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Image
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'header')}>
                          <Type className="h-4 w-4 mr-2" />
                          Header
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'divider')}>
                          <Minus className="h-4 w-4 mr-2" />
                          Divider
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'spacer')}>
                          <Square className="h-4 w-4 mr-2" />
                          Spacer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'embed')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Embed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {selectedElementData.children?.filter((_, index) => index % 2 === 0).length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed border-muted-foreground/30 rounded-lg">
                        No elements in left column
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedElementData.children?.filter((_, index) => index % 2 === 0).map((child, index) => (
                          <div
                            key={child.id}
                            onClick={() => setSelectedNestedElement({parentId: selectedElementData.id, childId: child.id})}
                            className={`flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-accent ${
                              selectedNestedElement?.parentId === selectedElementData.id && selectedNestedElement?.childId === child.id
                                ? 'bg-accent border-primary'
                                : 'bg-background'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {child.type === 'text' && <Type className="h-4 w-4" />}
                              {child.type === 'button' && <Square className="h-4 w-4" />}
                              {child.type === 'image' && <ImageIcon className="h-4 w-4" />}
                              {child.type === 'header' && <Type className="h-4 w-4" />}
                              {child.type === 'divider' && <Minus className="h-4 w-4" />}
                              {child.type === 'spacer' && <Square className="h-4 w-4" />}
                              <span className="text-sm capitalize">{child.type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveNestedElement(selectedElementData.id, child.id, 'up')
                                }}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveNestedElement(selectedElementData.id, child.id, 'down')
                                }}
                                disabled={index === (selectedElementData.children?.filter((_, i) => i % 2 === 0).length || 0) - 1}
                                className="h-6 w-6 p-0"
                              >
                                ↓
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Remove element from column
                                  setElements(prev => prev.map(el => {
                                    if (el.id === selectedElementData.id) {
                                      return {
                                        ...el,
                                        children: el.children?.filter(c => c.id !== child.id) || []
                                      }
                                    }
                                    return el
                                  }))
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Right Column</Label>
                  <div className="mt-2 space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Element
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'text', 'right')}>
                          <Type className="h-4 w-4 mr-2" />
                          Text
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'button')}>
                          <Square className="h-4 w-4 mr-2" />
                          Button
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'image')}>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Image
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'header')}>
                          <Type className="h-4 w-4 mr-2" />
                          Header
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'divider')}>
                          <Minus className="h-4 w-4 mr-2" />
                          Divider
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'spacer')}>
                          <Square className="h-4 w-4 mr-2" />
                          Spacer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addElementToColumn(selectedElementData.id, 'embed')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Embed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {selectedElementData.children?.filter((_, index) => index % 2 === 1).length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed border-muted-foreground/30 rounded-lg">
                        No elements in right column
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedElementData.children?.filter((_, index) => index % 2 === 1).map((child, index) => (
                          <div
                            key={child.id}
                            onClick={() => setSelectedNestedElement({parentId: selectedElementData.id, childId: child.id})}
                            className={`flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-accent ${
                              selectedNestedElement?.parentId === selectedElementData.id && selectedNestedElement?.childId === child.id
                                ? 'bg-accent border-primary'
                                : 'bg-background'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {child.type === 'text' && <Type className="h-4 w-4" />}
                              {child.type === 'button' && <Square className="h-4 w-4" />}
                              {child.type === 'image' && <ImageIcon className="h-4 w-4" />}
                              {child.type === 'header' && <Type className="h-4 w-4" />}
                              {child.type === 'divider' && <Minus className="h-4 w-4" />}
                              {child.type === 'spacer' && <Square className="h-4 w-4" />}
                              <span className="text-sm capitalize">{child.type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveNestedElement(selectedElementData.id, child.id, 'up')
                                }}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveNestedElement(selectedElementData.id, child.id, 'down')
                                }}
                                disabled={index === (selectedElementData.children?.filter((_, i) => i % 2 === 1).length || 0) - 1}
                                className="h-6 w-6 p-0"
                              >
                                ↓
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Remove element from column
                                  setElements(prev => prev.map(el => {
                                    if (el.id === selectedElementData.id) {
                                      return {
                                        ...el,
                                        children: el.children?.filter(c => c.id !== child.id) || []
                                      }
                                    }
                                    return el
                                  }))
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Column Tips:</p>
                  <ul className="space-y-1">
                    <li>• Elements are distributed alternately between columns</li>
                    <li>• Add text, buttons, images, headers, dividers, or spacers</li>
                    <li>• Click the trash icon to remove elements</li>
                    <li>• Preview shows the final layout</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedElementData.type === 'embed' && (
              <div className="space-y-3">
                <div>
                  <Label>Embed Type</Label>
                  <Select
                    value={selectedElementData.properties?.type || 'html'}
                    onValueChange={(value) => updateElement(selectedElementData.id, {
                      properties: { ...selectedElementData.properties, type: value }
                    })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select embed type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="html">Custom HTML</SelectItem>
                      <SelectItem value="iframe">iFrame URL</SelectItem>
                      <SelectItem value="script">JavaScript</SelectItem>
                      <SelectItem value="video">Video URL</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(selectedElementData.properties?.type === 'html' || !selectedElementData.properties?.type) && (
                  <div>
                    <Label>Custom HTML Code</Label>
                    <Textarea
                      value={selectedElementData.properties?.html || ''}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, html: e.target.value }
                      })}
                      placeholder="<div>Your custom HTML here...</div>"
                      className="mt-2 font-mono text-sm"
                      rows={8}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter any HTML code. Scripts will be automatically wrapped in a safe container.
                    </p>
                  </div>
                )}
                
                {selectedElementData.properties?.type === 'script' && (
                  <div>
                    <Label>JavaScript Code</Label>
                    <Textarea
                      value={selectedElementData.properties?.script || ''}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, script: e.target.value }
                      })}
                      placeholder="document.write('Hello World!');"
                      className="mt-2 font-mono text-sm"
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      JavaScript will be wrapped in a script tag. Note: Many email clients block scripts.
                    </p>
                  </div>
                )}
                
                {(selectedElementData.properties?.type === 'iframe' || selectedElementData.properties?.type === 'video') && (
                  <div>
                    <Label>URL</Label>
                    <Input
                      value={selectedElementData.properties?.url || ''}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, url: e.target.value }
                      })}
                      placeholder={selectedElementData.properties?.type === 'iframe' ? "https://example.com/embed" : "https://example.com/video.mp4"}
                      className="mt-2"
                    />
                  </div>
                )}
                
                {selectedElementData.properties?.type === 'social' && (
                  <div>
                    <Label>Social Media URL</Label>
                    <Input
                      value={selectedElementData.properties?.url || ''}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, url: e.target.value }
                      })}
                      placeholder="https://twitter.com/username/status/123456"
                      className="mt-2"
                    />
                  </div>
                )}
                
                <div>
                  <Label>Fallback Text</Label>
                  <Input
                    value={selectedElementData.properties?.fallbackText || 'Content not available'}
                    onChange={(e) => updateElement(selectedElementData.id, {
                      properties: { ...selectedElementData.properties, fallbackText: e.target.value }
                    })}
                    placeholder="Text shown when embed fails to load"
                    className="mt-2"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={selectedElementData.properties?.width || 600}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, width: parseInt(e.target.value) || 600 }
                      })}
                      className="mt-2"
                      placeholder="600"
                    />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={selectedElementData.properties?.height || 400}
                      onChange={(e) => updateElement(selectedElementData.id, {
                        properties: { ...selectedElementData.properties, height: parseInt(e.target.value) || 400 }
                      })}
                      className="mt-2"
                      placeholder="400"
                    />
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Embed Tips:</p>
                  <ul className="space-y-1">
                    <li>• Custom HTML: Insert any HTML code directly</li>
                    <li>• JavaScript: Add interactive functionality (limited support)</li>
                    <li>• iFrame: Embed external web content</li>
                    <li>• Video: Direct video file URLs</li>
                    <li>• Social: Social media post links</li>
                    <li>• Many email clients block scripts and iframes</li>
                    <li>• Always provide fallback text for accessibility</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Add CSS styles for button text color override */}
      <style dangerouslySetInnerHTML={{ __html: buttonStyles }} />
    </div>
  )
} 