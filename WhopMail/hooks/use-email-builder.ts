import { useState, useCallback, useEffect } from 'react';
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
}

// Mock user ID for demo purposes - in real app this would come from auth
const MOCK_USER_ID = 'demo-user-123';

export function useEmailBuilder() {
  const [state, setState] = useState<EmailBuilderState>({
    elements: [],
    subject: '',
    selectedElement: null,
    emailWidth: 600,
    lastSaved: null,
    isSaving: false,
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
    if (draftData && 'success' in draftData && draftData.success && 'data' in draftData && draftData.data) {
      setState(prev => ({
        ...prev,
        elements: (draftData.data as any).elements || [],
        subject: (draftData.data as any).subject || '',
        emailWidth: (draftData.data as any).emailWidth || 600,
      }));
    }
  }, [draftData]);

  // Auto-save functionality
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (data: EmailBuilderData) => {
        setState(prev => ({ ...prev, isSaving: true }));
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          saveDraftMutation.mutate(data);
        }, 2000);
      };
    })(),
    [saveDraftMutation]
  );

  // Auto-save when state changes (disabled to prevent infinite loop)
  // useEffect(() => {
  //   if (state.elements.length > 0 || state.subject) {
  //     debouncedSave({
  //       elements: state.elements,
  //       subject: state.subject,
  //       emailWidth: state.emailWidth,
  //     });
  //   }
  // }, [state.elements, state.subject, state.emailWidth, debouncedSave]);

  // Generate unique ID for new elements
  const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add new element
  const addElement = useCallback((type: EmailElement['type'], parentId?: string) => {
    // Validate type is not empty
    if (!type || type === '') {
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
      setState(prev => {
        const newState = {
          ...prev,
          elements: [...prev.elements, newElement],
          selectedElement: newElement,
        };
        return newState;
      });
    }

    toast({
      title: "Element added",
      description: `${type} element has been added to your email.`,
    });
  }, [state.elements.length, toast]);

  // Update element
  const updateElement = useCallback((id: string, updates: Partial<EmailElement>) => {
    setState(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      ),
      selectedElement: prev.selectedElement?.id === id
        ? { ...prev.selectedElement, ...updates }
        : prev.selectedElement,
    }));
  }, []);

  // Delete element
  const deleteElement = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
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

  // Select element
  const selectElement = useCallback((id: string) => {
    console.log('Hook: selectElement called with id:', id);
    const element = state.elements.find(el => el.id === id);
    console.log('Hook: Found element:', element);
    setState(prev => {
      const newState = {
        ...prev,
        selectedElement: element || null,
      };
      console.log('Hook: Setting new state with selectedElement:', newState.selectedElement);
      return newState;
    });
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
        return prev; // No change needed
      }
      
      return {
        ...prev,
        elements,
      };
    });
  }, []);

  // Set subject
  const setSubject = useCallback((subject: string) => {
    setState(prev => ({ ...prev, subject }));
  }, []);

  // Set email width
  const setEmailWidth = useCallback((width: number) => {
    setState(prev => ({ ...prev, emailWidth: width }));
  }, []);

  // Generate HTML
  const generateHTML = useCallback(async () => {
    try {
      const response = await apiRequest('POST', '/api/generate-email-html', {
        elements: state.elements,
        subject: state.subject,
        emailWidth: state.emailWidth,
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
  }, [state.elements, state.subject, state.emailWidth, toast]);

  // Load template
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

  // Load from template
  const loadFromTemplate = useCallback((template: any) => {
    loadTemplate(template);
  }, [loadTemplate]);

  // Manual save
  const saveDraft = useCallback(() => {
    setState(prev => ({ ...prev, isSaving: true }));
    saveDraftMutation.mutate({
      elements: state.elements,
      subject: state.subject,
      emailWidth: state.emailWidth,
    });
  }, [state.elements, state.subject, state.emailWidth, saveDraftMutation]);

  return {
    // State
    elements: state.elements,
    subject: state.subject,
    selectedElement: state.selectedElement,
    emailWidth: state.emailWidth,
    lastSaved: state.lastSaved,
    isSaving: state.isSaving,

    // Actions
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    selectElement,
    moveElement,
    setSubject,
    setEmailWidth,
    generateHTML,
    loadTemplate,
    loadFromTemplate,
    saveDraft,
  };
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
function getDefaultStyles(type: EmailElement['type']): Record<string, string> {
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
        backgroundColor: 'hsl(221.2 83.2% 53.3%)',
        color: 'hsl(210 40% 98%)',
        padding: '12px 24px',
        borderRadius: '6px',
        textDecoration: 'none',
        display: 'inline-block',
        fontSize: '16px',
        fontWeight: '600',
        textAlign: 'center',
        border: 'none',
        cursor: 'pointer',
        margin: '20px 0',
      };
    case 'image':
      return {
        maxWidth: '100%',
        height: 'auto',
        display: 'block',
        margin: '20px auto',
        textAlign: 'center',
      };
    case 'divider':
      return {
        height: '1px',
        backgroundColor: 'hsl(214.3 31.8% 91.4%)',
        margin: '20px 0',
        border: 'none',
      };
    case 'spacer':
      return {
        height: '20px',
        backgroundColor: 'transparent',
      };
    case 'header':
      return {
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'hsl(210 40% 98%)',
        textAlign: 'center',
        margin: '0',
        padding: '24px',
        background: 'linear-gradient(135deg, hsl(221.2 83.2% 53.3%), hsl(221.2 83.2% 53.3%/0.8))',
        borderRadius: '8px',
      };
    case 'footer':
      return {
        fontSize: '14px',
        color: 'hsl(215.4 16.3% 46.9%)',
        textAlign: 'center',
        margin: '20px 0',
        padding: '20px 0',
        borderTop: '1px solid hsl(214.3 31.8% 91.4%)',
        backgroundColor: 'hsl(210 40% 96%/0.5)',
      };
    case 'columns':
      return {
        display: 'flex',
        gap: '20px',
        margin: '20px 0',
        backgroundColor: 'transparent',
      };
    case 'social':
      return {
        textAlign: 'center',
        margin: '20px 0',
      };
    default:
      return {};
  }
}

// Default properties for different element types
function getDefaultProperties(type: EmailElement['type']) {
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
        text: 'Click Here',
        url: '#',
        alignment: 'center',
        fontSize: '16px',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '12px 24px',
        width: 'auto',
        textColor: 'hsl(210 40% 98%)',
      };
    case 'image':
      return {
        src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
        alt: 'Professional team collaboration',
        width: 600,
        height: 300,
      };
    case 'header':
      return {
        fontSize: '24px',
        color: 'hsl(210 40% 98%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
        fontWeight: 'bold',
      };
    case 'footer':
      return {
        fontSize: '14px',
        color: 'hsl(215.4 16.3% 46.9%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
        fontWeight: 'normal',
      };
    default:
      return {};
  }
}
