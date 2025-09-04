import { useEmailBuilder } from "@/hooks/use-email-builder";
import { useDragDropContext } from "@/lib/drag-drop-context";
import { ElementComponents } from "./element-components";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hand, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmailCanvas() {
  const { elements, addElement, selectedElement, selectElement } = useEmailBuilder();
  const { createDropTarget, isDragActive } = useDragDropContext();

  const handleDrop = (componentType: string) => {
    addElement(componentType as any);
  };

  const dropTargetProps = createDropTarget({
    onDrop: handleDrop,
    onDragOver: () => console.log('Dragging over canvas'),
    onDragLeave: () => console.log('Drag left canvas')
  });

  return (
    <Card 
      className={cn(
        "bg-card border border-border rounded-lg shadow-lg min-h-96 relative overflow-hidden",
        "bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)]",
        "bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]",
        isDragActive && "ring-2 ring-primary ring-offset-2 bg-primary/5"
      )}
      {...dropTargetProps}
      data-testid="email-canvas"
    >
      {elements.length === 0 ? (
        /* Empty State */
        <div className="absolute inset-0 flex items-center justify-center text-center p-8">
          <div className="text-muted-foreground max-w-sm">
            <Hand className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Start building your email</h3>
            <p className="text-sm mb-4">
              Drag components from the left panel or click the button below to begin
            </p>
            <Button
              onClick={() => addElement('text')}
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
        <div className="p-6 space-y-4">
          {elements.map((element, index) => (
            <div
              key={element.id}
              className={cn(
                "group relative rounded-md transition-all duration-200",
                "hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                selectedElement?.id === element.id && "ring-2 ring-primary"
              )}
              onClick={(e) => {
                e.stopPropagation();
                selectElement(element.id);
              }}
              data-testid={`element-${element.type}-${element.id}`}
            >
              {/* Element Label */}
              <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium capitalize">
                  {element.type}
                </div>
              </div>

              {/* Element Actions */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement duplicate
                  }}
                  data-testid={`button-duplicate-${element.id}`}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement delete
                  }}
                  data-testid={`button-delete-${element.id}`}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
  );
}
