import { useState } from "react";
import { useEmailBuilder } from "@/contexts/email-builder-context";
import { ElementComponents } from "./element-components";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Monitor, Smartphone, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmailPreview() {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [darkMode, setDarkMode] = useState(false);
  const { elements, subject, emailWidth } = useEmailBuilder();

  return (
    <div className="flex flex-col h-full">
      {/* Preview Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Email Preview</h3>
          <div className="flex bg-secondary rounded-lg p-1">
            <Button
              variant={previewMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('desktop')}
              className="h-8"
              data-testid="button-preview-desktop"
            >
              <Monitor className="h-4 w-4 mr-1" />
              Desktop
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('mobile')}
              className="h-8"
              data-testid="button-preview-mobile"
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Mobile
            </Button>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDarkMode(!darkMode)}
          data-testid="button-toggle-dark-mode"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-6 overflow-auto bg-muted/30">
        <div className="flex justify-center">
          <div
            className={cn(
              "transition-all duration-300 bg-card shadow-lg rounded-lg overflow-hidden",
              previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl',
              darkMode && 'dark'
            )}
            style={{ 
              width: previewMode === 'mobile' ? '375px' : `${emailWidth}px` 
            }}
            data-testid="email-preview-container"
          >
            {/* Email Header (Subject Preview) */}
            <div className="p-4 bg-muted/50 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-semibold">
                    YC
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Your Company</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {subject || 'Email Subject'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Now
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="bg-background">
              {elements.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="text-4xl mb-4">📧</div>
                  <h3 className="text-lg font-medium mb-2">No content yet</h3>
                  <p className="text-sm">
                    Add some elements to see your email preview
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {elements.map((element) => (
                    <div key={element.id} data-testid={`preview-element-${element.id}`}>
                      <ElementComponents element={element} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Footer */}
      <div className="p-4 border-t border-border bg-muted/50">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Preview Mode: {previewMode} ({previewMode === 'mobile' ? '375px' : `${emailWidth}px`})
          </div>
          <div>
            {elements.length} element{elements.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
