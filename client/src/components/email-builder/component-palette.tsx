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
  Palette
} from "lucide-react";
import { cn } from "@/lib/utils";

const COMPONENT_TYPES = [
  {
    type: 'text' as const,
    name: 'Text Block',
    description: 'Rich text content',
    icon: Type,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
  },
  {
    type: 'button' as const,
    name: 'Button',
    description: 'Call-to-action button',
    icon: MousePointer2,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300'
  },
  {
    type: 'image' as const,
    name: 'Image',
    description: 'Upload or link images',
    icon: Image,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'
  },
  {
    type: 'divider' as const,
    name: 'Divider',
    description: 'Section separator',
    icon: Minus,
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-300'
  },
  {
    type: 'spacer' as const,
    name: 'Spacer',
    description: 'Add vertical space',
    icon: ArrowUpDown,
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300'
  },
  {
    type: 'columns' as const,
    name: 'Columns',
    description: 'Multi-column layout',
    icon: Columns,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
  },
  {
    type: 'social' as const,
    name: 'Social',
    description: 'Social media links',
    icon: Share2,
    color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300'
  },
  {
    type: 'footer' as const,
    name: 'Footer',
    description: 'Email footer with unsubscribe',
    icon: AlignCenter,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300'
  }
];

const TEMPLATE_PREVIEWS = [
  {
    id: 'newsletter',
    name: 'Newsletter',
    gradient: 'from-blue-400 to-purple-500'
  },
  {
    id: 'promotion',
    name: 'Promotion',
    gradient: 'from-green-400 to-blue-500'
  },
  {
    id: 'event',
    name: 'Event',
    gradient: 'from-orange-400 to-red-500'
  },
  {
    id: 'welcome',
    name: 'Welcome',
    gradient: 'from-purple-400 to-pink-500'
  }
];

export function ComponentPalette() {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const { addElement, loadTemplate } = useEmailBuilder();
  const { createDragSource } = useDragDropContext();

  const handleComponentClick = (type: string) => {
    addElement(type as any);
  };

  const handleTemplateClick = (templateId: string) => {
    loadTemplate(templateId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Component Palette Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-base mb-3">Components</h3>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'basic' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('basic')}
            data-testid="button-basic-components"
          >
            Basic
          </Button>
          <Button
            variant={activeTab === 'advanced' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('advanced')}
            data-testid="button-advanced-components"
          >
            Advanced
          </Button>
        </div>
      </div>

      {/* Component Grid */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {COMPONENT_TYPES.map((component) => {
          const Icon = component.icon;
          return (
            <Card
              key={component.type}
              className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              onClick={() => handleComponentClick(component.type)}
              data-testid={`component-${component.type}`}
              {...createDragSource(component.type, {
              })}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", component.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{component.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {component.description}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Templates Section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Templates</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATE_PREVIEWS.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              onClick={() => handleTemplateClick(template.id)}
              data-testid={`template-${template.id}`}
            >
              <CardContent className="p-2">
                <div className={cn(
                  "w-full h-12 bg-gradient-to-r rounded-sm mb-2",
                  template.gradient
                )} />
                <div className="text-xs font-medium text-center">{template.name}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
