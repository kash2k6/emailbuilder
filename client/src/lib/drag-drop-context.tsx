import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DragDropState {
  isDragActive: boolean;
  draggedItem: any;
  draggedType: string | null;
}

interface DragDropContextValue {
  // State
  isDragActive: boolean;
  draggedItem: any;
  draggedType: string | null;
  
  // Actions
  startDrag: (type: string, item?: any) => void;
  endDrag: () => void;
  
  // Utilities
  createDragSource: (type: string, options?: DragSourceOptions) => Record<string, any>;
  createDropTarget: (options: DropTargetOptions) => Record<string, any>;
}

interface DragSourceOptions {
  onDragStart?: () => void;
  onDragEnd?: () => void;
  data?: any;
}

interface DropTargetOptions {
  onDrop: (type: string, data?: any) => void;
  onDragOver?: () => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  accepts?: string[];
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

export function DragDropProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DragDropState>({
    isDragActive: false,
    draggedItem: null,
    draggedType: null,
  });

  const startDrag = useCallback((type: string, item?: any) => {
    setState({
      isDragActive: true,
      draggedItem: item,
      draggedType: type,
    });
  }, []);

  const endDrag = useCallback(() => {
    setState({
      isDragActive: false,
      draggedItem: null,
      draggedType: null,
    });
  }, []);

  const createDragSource = useCallback((type: string, options: DragSourceOptions = {}) => {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'copy';
        // Ensure type is properly set
        if (type) {
          e.dataTransfer.setData('text/plain', type);
          e.dataTransfer.setData('componentType', type); // Add additional data format
          e.dataTransfer.setData('application/json', JSON.stringify({ type, data: options.data }));
        }
        
        startDrag(type, options.data);
        options.onDragStart?.();
        
        // Add drag image effect
        if (e.currentTarget instanceof HTMLElement) {
          const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
          dragImage.style.transform = 'rotate(-5deg)';
          dragImage.style.opacity = '0.8';
          document.body.appendChild(dragImage);
          e.dataTransfer.setDragImage(dragImage, 25, 15);
          setTimeout(() => document.body.removeChild(dragImage), 0);
        }
      },
      onDragEnd: (e: React.DragEvent) => {
        endDrag();
        options.onDragEnd?.();
      },
      className: 'cursor-grab active:cursor-grabbing select-none',
    };
  }, [startDrag, endDrag]);

  const createDropTarget = useCallback((options: DropTargetOptions) => {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        options.onDragOver?.();
      },
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        options.onDragEnter?.();
      },
      onDragLeave: (e: React.DragEvent) => {
        // Only trigger if actually leaving the element (not just moving to child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          options.onDragLeave?.();
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        
        // Try multiple ways to get the type
        let type = e.dataTransfer.getData('text/plain');
        if (!type) {
          type = e.dataTransfer.getData('componentType');
        }
        
        let data = null;
        
        try {
          const jsonData = e.dataTransfer.getData('application/json');
          if (jsonData) {
            const parsed = JSON.parse(jsonData);
            if (parsed.type && !type) {
              type = parsed.type;
            }
            data = parsed.data;
          }
        } catch (error) {
          // Fallback to plain text
        }
        
        // Don't process if no valid type
        if (!type || type === '') {
          endDrag();
          return;
        }
        
        // Check if this drop target accepts the dragged type
        if (options.accepts && !options.accepts.includes(type)) {
          return;
        }
        
        options.onDrop(type, data);
        endDrag();
      },
    };
  }, [endDrag]);

  const value: DragDropContextValue = {
    // State
    isDragActive: state.isDragActive,
    draggedItem: state.draggedItem,
    draggedType: state.draggedType,
    
    // Actions
    startDrag,
    endDrag,
    
    // Utilities
    createDragSource,
    createDropTarget,
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
}

export function useDragDropContext() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDropContext must be used within a DragDropProvider');
  }
  return context;
}

// Custom hooks for common drag and drop patterns
export function useDragSource(type: string, options: DragSourceOptions = {}) {
  const { createDragSource } = useDragDropContext();
  return createDragSource(type, options);
}

export function useDropTarget(options: DropTargetOptions) {
  const { createDropTarget } = useDragDropContext();
  return createDropTarget(options);
}

// Utility hook for drag and drop state
export function useDragDropState() {
  const { isDragActive, draggedItem, draggedType } = useDragDropContext();
  return { isDragActive, draggedItem, draggedType };
}
