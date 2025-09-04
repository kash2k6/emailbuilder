import { useEmailBuilder } from "@/contexts/email-builder-context";
import { useDragDropContext } from "@/lib/drag-drop-context";
import { ElementComponents } from "./element-components";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hand, Plus, Copy, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function EmailCanvas() {
  const { elements, addElement, selectedElement, selectElement, deleteElement, duplicateElement, moveElement, reorderElements, emailBackground } = useEmailBuilder();
  const { createDropTarget, isDragActive } = useDragDropContext();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDrop = (componentType: string) => {
    // Don't handle reorder events here - they're handled by individual elements
    if (componentType === 'reorder') return;
    addElement(componentType as any);
  };

  const dropTargetProps = createDropTarget({
    onDrop: handleDrop,
    accepts: ['text', 'button', 'image', 'divider', 'spacer', 'columns', 'social', 'section', 'footer', 'header'], // Only accept component types, not reorder
  });

  // Generate background style based on emailBackground
  const getBackgroundStyle = () => {
    const { type, backgroundColor, gradientColors, gradientDirection, imageUrl, borderRadius } = emailBackground;
    
    let style: React.CSSProperties = {
      borderRadius: borderRadius || '0px',
    };
    
    if (type === 'color') {
      style.backgroundColor = backgroundColor || '#ffffff';
    } else if (type === 'gradient' && gradientColors) {
      const direction = gradientDirection || 'to-bottom';
      style.background = `linear-gradient(${direction}, ${gradientColors[0]}, ${gradientColors[1]})`;
    } else if (type === 'image' && imageUrl) {
      style.backgroundImage = `url(${imageUrl})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
      if (backgroundColor) {
        style.backgroundColor = backgroundColor; // Fallback color
      }
    }
    
    return style;
  };

  return (
    <div className="relative">
      {/* Background grid pattern for empty areas only */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none",
          "bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)]",
          "bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]"
        )}
      />
      <Card 
        className={cn(
          "border border-border shadow-lg min-h-96 relative overflow-hidden",
          isDragActive && "ring-2 ring-primary ring-offset-2"
        )}
        style={getBackgroundStyle()}
        data-testid="email-canvas"
      >
      {elements.length === 0 ? (
        /* Empty State */
        <div 
          className="absolute inset-0 flex items-center justify-center text-center p-8"
          {...dropTargetProps}
        >
          <div className="text-muted-foreground max-w-sm">
            <Hand className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Start building your email</h3>
            <p className="text-sm mb-4">
              Drag components from the left panel or click the button below to begin
            </p>
            <Button
              onClick={() => {
                addElement('text');
              }}
              variant="outline"
              className="gap-2"
              data-testid="button-add-first-element"
            >
              <Plus className="h-4 w-4" />
              Add Text Block
            </Button>
          </div>
        </div>
      ) : (
        /* Email Elements */
        <div 
          className="p-6 space-y-4"
          {...dropTargetProps}
        >
          {elements.map((element, index) => (
            <div
              key={element.id}
              className={cn(
                "group relative rounded-md transition-all duration-200",
                "hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                selectedElement?.id === element.id && "ring-2 ring-primary",
                draggedIndex === index && "opacity-50",
                dragOverIndex === index && "border-t-4 border-primary"
              )}
              onClick={(e) => {
                e.stopPropagation();
                selectElement(element.id);
              }}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(index);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', 'reorder');
                e.dataTransfer.setData('elementIndex', index.toString());
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedIndex !== null && draggedIndex !== index) {
                  setDragOverIndex(index);
                  e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDragLeave={(e) => {
                // Only clear if actually leaving the element
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverIndex(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Check if this is a reorder operation
                const dragType = e.dataTransfer.getData('text/plain');
                if (dragType === 'reorder' && draggedIndex !== null && draggedIndex !== index) {
                  console.log('Reordering from', draggedIndex, 'to', index);
                  reorderElements(draggedIndex, index);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              data-testid={`element-${element.type}-${element.id}`}
            >
              {/* Drag Handle */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-move">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Element Label */}
              <div className="absolute -top-2 left-8 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium capitalize">
                  {element.type}
                </div>
              </div>

              {/* Element Actions */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                {/* Move Up */}
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveElement(element.id, 'up');
                  }}
                  disabled={index === 0}
                  data-testid={`button-move-up-${element.id}`}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                {/* Move Down */}
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveElement(element.id, 'down');
                  }}
                  disabled={index === elements.length - 1}
                  data-testid={`button-move-down-${element.id}`}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateElement(element.id);
                  }}
                  data-testid={`button-duplicate-${element.id}`}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteElement(element.id);
                  }}
                  data-testid={`button-delete-${element.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Element Content */}
              <div className="p-3">
                <ElementComponents element={element} />
              </div>
            </div>
          ))}
        </div>
      )}
      </Card>
    </div>
  );
}
