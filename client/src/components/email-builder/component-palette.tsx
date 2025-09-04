import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEmailBuilder } from "@/contexts/email-builder-context";
import { useDragDropContext } from "@/lib/drag-drop-context";
import { 
  Type, 
  MousePointer2, 
  Image, 
  Minus, 
  ArrowUpDown, 
  Columns, 
  Share2, 
  AlignCenter,
  Palette,
  Square
} from "lucide-react";
import { cn } from "@/lib/utils";

const COMPONENT_TYPES = [
  {
    type: 'text' as const,
    name: 'Text',
    icon: Type,
  },
  {
    type: 'button' as const,
    name: 'Button',
    icon: MousePointer2,
  },
  {
    type: 'image' as const,
    name: 'Image',
    icon: Image,
  },
  {
    type: 'divider' as const,
    name: 'Divider',
    icon: Minus,
  },
  {
    type: 'spacer' as const,
    name: 'Spacer',
    icon: ArrowUpDown,
  },
  {
    type: 'columns' as const,
    name: 'Two Columns',
    icon: Columns,
  },
  {
    type: 'social' as const,
    name: 'Social',
    icon: Share2,
  },
  {
    type: 'section' as const,
    name: 'Section',
    icon: Square,
  },
  {
    type: 'footer' as const,
    name: 'Footer',
    icon: AlignCenter,
  }
];


export function ComponentPalette() {
  const { addElement } = useEmailBuilder();
  const { createDragSource } = useDragDropContext();

  const handleComponentClick = (type: string) => {
    addElement(type as any);
  };


  return (
    <div className="h-full flex flex-col">
      {/* Component Palette Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-base">Components</h3>
      </div>

      {/* Component List */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Add Elements</div>
        {COMPONENT_TYPES.map((component) => {
          const Icon = component.icon;
          return (
            <div
              key={component.type}
              className="flex items-center gap-3 p-2 rounded border border-transparent hover:border-border hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-all duration-200"
              onClick={() => handleComponentClick(component.type)}
              data-testid={`component-${component.type}`}
              {...createDragSource(component.type, {
              })}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="font-medium text-sm">{component.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
