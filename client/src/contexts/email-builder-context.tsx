import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmailElement, EmailBuilderData } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { generateEmailHTML } from '@/lib/email-html-generator';
import { useToast } from '@/hooks/use-toast';

interface EmailBuilderState {
  elements: EmailElement[];
  subject: string;
  selectedElement: EmailElement | null;
  emailWidth: number;
  lastSaved: string | null;
  isSaving: boolean;
  emailBackground: {
    type: 'color' | 'gradient' | 'image';
    backgroundColor?: string;
    gradientColors?: [string, string];
    gradientDirection?: 'to-right' | 'to-left' | 'to-top' | 'to-bottom' | 'to-top-right' | 'to-bottom-right' | 'to-top-left' | 'to-bottom-left';
    imageUrl?: string;
    borderRadius?: string;
  };
}

interface EmailBuilderContextType extends EmailBuilderState {
  addElement: (type: EmailElement['type'], parentId?: string) => void;
  updateElement: (id: string, updates: Partial<EmailElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  selectElement: (id: string) => void;
  moveElement: (id: string, direction: 'up' | 'down') => void;
  setSubject: (subject: string) => void;
  setEmailWidth: (width: number) => void;
  setEmailBackground: (background: Partial<EmailBuilderState['emailBackground']>) => void;
  generateHTML: () => Promise<string>;
  loadTemplate: (template: any) => void;
  loadFromTemplate: (template: any) => void;
  saveDraft: () => void;
}

const EmailBuilderContext = createContext<EmailBuilderContextType | null>(null);

// Mock user ID for demo purposes - in real app this would come from auth
const MOCK_USER_ID = 'demo-user-123';

// Generate unique ID for new elements
const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function EmailBuilderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EmailBuilderState>({
    elements: [],
    subject: '',
    selectedElement: null,
    emailWidth: 600,
    lastSaved: null,
    isSaving: false,
    emailBackground: {
      type: 'color',
      backgroundColor: '#ffffff',
      borderRadius: '0px',
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load saved draft on mount
  const { data: draftData } = useQuery({
    queryKey: ['/api/drafts', MOCK_USER_ID],
    retry: false,
  });

  // Auto-save mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: EmailBuilderData) => {
      return apiRequest('POST', '/api/drafts/save', {
        userId: MOCK_USER_ID,
        draftData: data,
      });
    },
    onSuccess: () => {
      setState(prev => ({
        ...prev,
        lastSaved: new Date().toLocaleTimeString(),
        isSaving: false,
      }));
    },
    onError: () => {
      setState(prev => ({ ...prev, isSaving: false }));
    },
  });

  // Load draft data when available
  useEffect(() => {
    if (draftData && typeof draftData === 'object' && 'success' in draftData && draftData.success && 'data' in draftData && draftData.data) {
      setState(prev => ({
        ...prev,
        elements: (draftData.data as any).elements || [],
        subject: (draftData.data as any).subject || '',
        emailWidth: (draftData.data as any).emailWidth || 600,
        emailBackground: (draftData.data as any).emailBackground || {
          type: 'color',
          backgroundColor: '#ffffff',
          borderRadius: '0px',
        },
      }));
    }
  }, [draftData]);

  // Add new element
  const addElement = useCallback((type: EmailElement['type'], parentId?: string) => {
    if (!type) {
      return;
    }
    
    const newElement: EmailElement = {
      id: generateId(),
      type,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
      properties: getDefaultProperties(type),
      position: state.elements.length,
    };

    if (parentId) {
      // Add to column
      setState(prev => ({
        ...prev,
        elements: prev.elements.map(el =>
          el.id === parentId && el.type === 'columns'
            ? { ...el, children: [...(el.children || []), newElement] }
            : el
        ),
        selectedElement: newElement,
      }));
    } else {
      // Add to main elements
      setState(prev => ({
        ...prev,
        elements: [...prev.elements, newElement],
        selectedElement: newElement,
      }));
    }

    toast({
      title: "Element added",
      description: `${type} element has been added to your email.`,
    });
  }, [state.elements.length, toast]);

  // Helper function to recursively update elements in nested structures
  const updateElementRecursive = (elements: EmailElement[], id: string, updates: Partial<EmailElement>): EmailElement[] => {
    return elements.map(el => {
      if (el.id === id) {
        return { ...el, ...updates };
      }
      if (el.children) {
        return { ...el, children: updateElementRecursive(el.children, id, updates) };
      }
      return el;
    });
  };

  // Update element
  const updateElement = useCallback((id: string, updates: Partial<EmailElement>) => {
    setState(prev => ({
      ...prev,
      elements: updateElementRecursive(prev.elements, id, updates),
      selectedElement: prev.selectedElement?.id === id
        ? { ...prev.selectedElement, ...updates }
        : prev.selectedElement,
    }));
  }, []);

  // Helper function to recursively delete elements
  const deleteElementRecursive = (elements: EmailElement[], id: string): EmailElement[] => {
    return elements.filter(el => el.id !== id).map(el => {
      if (el.children) {
        return { ...el, children: deleteElementRecursive(el.children, id) };
      }
      return el;
    });
  };

  // Delete element
  const deleteElement = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      elements: deleteElementRecursive(prev.elements, id),
      selectedElement: prev.selectedElement?.id === id ? null : prev.selectedElement,
    }));

    toast({
      title: "Element deleted",
      description: "The element has been removed from your email.",
    });
  }, [toast]);

  // Duplicate element
  const duplicateElement = useCallback((id: string) => {
    const element = state.elements.find(el => el.id === id);
    if (element) {
      const duplicatedElement: EmailElement = {
        ...element,
        id: generateId(),
        position: state.elements.length,
      };

      setState(prev => ({
        ...prev,
        elements: [...prev.elements, duplicatedElement],
        selectedElement: duplicatedElement,
      }));

      toast({
        title: "Element duplicated",
        description: "The element has been duplicated successfully.",
      });
    }
  }, [state.elements, toast]);

  // Helper function to find element recursively
  const findElementRecursive = (elements: EmailElement[], id: string): EmailElement | null => {
    for (const el of elements) {
      if (el.id === id) {
        return el;
      }
      if (el.children) {
        const found = findElementRecursive(el.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Select element
  const selectElement = useCallback((id: string) => {
    const element = findElementRecursive(state.elements, id);
    setState(prev => ({
      ...prev,
      selectedElement: element || null,
    }));
  }, [state.elements]);

  // Move element
  const moveElement = useCallback((id: string, direction: 'up' | 'down') => {
    setState(prev => {
      const elements = [...prev.elements];
      const currentIndex = elements.findIndex(el => el.id === id);
      
      if (currentIndex === -1) return prev;
      
      if (direction === 'up' && currentIndex > 0) {
        [elements[currentIndex], elements[currentIndex - 1]] = [elements[currentIndex - 1], elements[currentIndex]];
      } else if (direction === 'down' && currentIndex < elements.length - 1) {
        [elements[currentIndex], elements[currentIndex + 1]] = [elements[currentIndex + 1], elements[currentIndex]];
      } else {
        return prev;
      }
      
      return {
        ...prev,
        elements,
      };
    });
  }, []);

  // Other methods...
  const setSubject = useCallback((subject: string) => {
    setState(prev => ({ ...prev, subject }));
  }, []);

  const setEmailWidth = useCallback((width: number) => {
    setState(prev => ({ ...prev, emailWidth: width }));
  }, []);

  const setEmailBackground = useCallback((background: Partial<EmailBuilderState['emailBackground']>) => {
    setState(prev => ({ 
      ...prev, 
      emailBackground: { ...prev.emailBackground, ...background }
    }));
  }, []);

  const generateHTML = useCallback(async () => {
    try {
      const response = await apiRequest('POST', '/api/generate-email-html', {
        elements: state.elements,
        subject: state.subject,
        emailWidth: state.emailWidth,
        emailBackground: state.emailBackground,
      });

      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
      throw new Error('Failed to generate HTML');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate email HTML. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [state.elements, state.subject, state.emailWidth, state.emailBackground, toast]);

  const loadTemplate = useCallback((template: any) => {
    setState(prev => ({
      ...prev,
      elements: template.elements || [],
      subject: template.subject || '',
      selectedElement: null,
    }));

    toast({
      title: "Template loaded",
      description: `${template.name} has been loaded successfully.`,
    });
  }, [toast]);

  const loadFromTemplate = useCallback((template: any) => {
    loadTemplate(template);
  }, [loadTemplate]);

  const saveDraft = useCallback(() => {
    setState(prev => ({ ...prev, isSaving: true }));
    saveDraftMutation.mutate({
      elements: state.elements,
      subject: state.subject,
      emailWidth: state.emailWidth,
      emailBackground: state.emailBackground,
    });
  }, [state.elements, state.subject, state.emailWidth, state.emailBackground, saveDraftMutation]);

  const value: EmailBuilderContextType = {
    ...state,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    selectElement,
    moveElement,
    setSubject,
    setEmailWidth,
    setEmailBackground,
    generateHTML,
    loadTemplate,
    loadFromTemplate,
    saveDraft,
  };

  return (
    <EmailBuilderContext.Provider value={value}>
      {children}
    </EmailBuilderContext.Provider>
  );
}

export function useEmailBuilder() {
  const context = useContext(EmailBuilderContext);
  if (!context) {
    throw new Error('useEmailBuilder must be used within EmailBuilderProvider');
  }
  return context;
}

// Default content for different element types
function getDefaultContent(type: EmailElement['type']): string {
  switch (type) {
    case 'text':
      return 'Welcome to our newsletter!\n\nThis is a **bold text** example and this is *italic text*.\n\nHere\'s a list:\n- First item\n- Second item\n- Third item\n\nUse the toolbar above to format your text easily!';
    case 'button':
      return 'Click Here';
    case 'image':
      return 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400';
    case 'header':
      return 'Header Text';
    case 'footer':
      return 'Footer content will be generated automatically';
    case 'divider':
    case 'spacer':
      return '';
    case 'columns':
      return '';
    case 'social':
      return '';
    default:
      return '';
  }
}

// Default styles for different element types
function getDefaultStyles(type: EmailElement['type']): Record<string, any> {
  switch (type) {
    case 'text':
      return {
        fontSize: '16px',
        color: 'hsl(222.2 84% 4.9%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        lineHeight: '1.6',
        margin: '15px 0',
        backgroundColor: 'transparent',
      };
    case 'button':
      return {
        backgroundColor: 'hsl(222.2 47.4% 11.2%)',
        color: 'hsl(210 40% 98%)',
        borderRadius: '6px',
        paddingX: '24px',
        paddingY: '12px',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: '500',
        margin: '20px 0',
      };
    case 'image':
      return {
        width: '100%',
        maxWidth: '100%',
        height: 'auto',
        borderRadius: '8px',
        margin: '20px 0',
        objectFit: 'cover',
      };
    case 'divider':
      return {
        borderTop: '1px solid hsl(214.3 31.8% 91.4%)',
        margin: '20px 0',
        height: '1px',
        width: '100%',
      };
    case 'spacer':
      return {
        height: '20px',
      };
    case 'header':
      return {
        background: 'linear-gradient(135deg, hsl(222.2 47.4% 11.2%), hsl(222.2 47.4% 11.2%)/0.8)',
        color: 'hsl(210 40% 98%)',
        padding: '24px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        borderRadius: '8px',
        margin: '0',
      };
    case 'columns':
      return {
        gap: '16px',
        margin: '20px 0',
      };
    case 'social':
      return {
        textAlign: 'center',
        margin: '20px 0',
      };
    case 'footer':
      return {
        fontSize: '14px',
        color: 'hsl(215.4 16.3% 46.9%)',
        textAlign: 'center',
        margin: '20px 0',
        padding: '20px 0',
        borderTop: '1px solid hsl(214.3 31.8% 91.4%)',
        backgroundColor: 'hsl(210 40% 96.1%)/0.5',
      };
    default:
      return {};
  }
}

// Default properties for different element types
function getDefaultProperties(type: EmailElement['type']): Record<string, any> {
  switch (type) {
    case 'text':
      return {
        fontSize: '16px',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: 'hsl(222.2 84% 4.9%)',
        textAlign: 'left',
        fontWeight: 'normal',
      };
    case 'button':
      return {
        url: 'https://example.com',
        target: '_blank',
      };
    case 'image':
      return {
        alt: 'Image description',
        url: '',
        width: '100%',
        height: 'auto',
      };
    case 'columns':
      return {
        columnCount: 2,
      };
    case 'social':
      return {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        tiktok: '',
        iconColor: '',
      };
    case 'footer':
      return {
        unsubscribeUrl: '#',
      };
    default:
      return {};
  }
}