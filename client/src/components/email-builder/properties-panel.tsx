import { useState, useEffect } from "react";
import { useEmailBuilder } from "@/contexts/email-builder-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  MousePointer, 
  Copy, 
  Trash2, 
  X,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered
} from "lucide-react";

const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
];

export function PropertiesPanel() {
  const { selectedElement, updateElement, deleteElement, duplicateElement, emailBackground, setEmailBackground } = useEmailBuilder();
  const [localStyles, setLocalStyles] = useState(selectedElement?.styles || {});
  const [localProperties, setLocalProperties] = useState(selectedElement?.properties || {});

  // Update local state when selectedElement changes
  useEffect(() => {
    if (selectedElement) {
      setLocalStyles(selectedElement.styles || {});
      setLocalProperties(selectedElement.properties || {});
    } else {
      setLocalStyles({});
      setLocalProperties({});
    }
  }, [selectedElement]);

  const handleStyleChange = (key: string, value: string) => {
    const newStyles = { ...localStyles, [key]: value };
    setLocalStyles(newStyles);
    if (selectedElement) {
      updateElement(selectedElement.id, { styles: newStyles });
    }
  };

  const handlePropertyChange = (key: string, value: any) => {
    const newProperties = { ...localProperties, [key]: value };
    setLocalProperties(newProperties);
    if (selectedElement) {
      updateElement(selectedElement.id, { properties: newProperties });
    }
  };

  const handleContentChange = (content: string) => {
    if (selectedElement) {
      updateElement(selectedElement.id, { content });
    }
  };

  if (!selectedElement) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-base">Email Background</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Customize the overall email appearance
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Background Type Selector */}
          <div className="space-y-3">
            <Label>Background Type</Label>
            <Select
              value={emailBackground.type}
              onValueChange={(value: 'color' | 'gradient' | 'image') => setEmailBackground({ type: value })}
            >
              <SelectTrigger data-testid="select-background-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="color">Solid Color</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color Background */}
          {emailBackground.type === 'color' && (
            <div className="space-y-3">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={emailBackground.backgroundColor || '#ffffff'}
                  onChange={(e) => setEmailBackground({ backgroundColor: e.target.value })}
                  className="w-12 h-10 p-1 border rounded cursor-pointer"
                  data-testid="input-email-background-color"
                />
                <Input
                  type="text"
                  value={emailBackground.backgroundColor || '#ffffff'}
                  onChange={(e) => setEmailBackground({ backgroundColor: e.target.value })}
                  className="flex-1"
                  placeholder="#ffffff"
                  data-testid="input-email-background-color-hex"
                />
              </div>
            </div>
          )}

          {/* Gradient Background */}
          {emailBackground.type === 'gradient' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Gradient Colors</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={emailBackground.gradientColors?.[0] || '#ffffff'}
                      onChange={(e) => setEmailBackground({ 
                        gradientColors: [e.target.value, emailBackground.gradientColors?.[1] || '#000000'] 
                      })}
                      className="w-12 h-10 p-1 border rounded cursor-pointer"
                      data-testid="input-gradient-color-1"
                    />
                    <Input
                      type="text"
                      value={emailBackground.gradientColors?.[0] || '#ffffff'}
                      onChange={(e) => setEmailBackground({ 
                        gradientColors: [e.target.value, emailBackground.gradientColors?.[1] || '#000000'] 
                      })}
                      className="flex-1"
                      placeholder="#ffffff"
                      data-testid="input-gradient-color-1-hex"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={emailBackground.gradientColors?.[1] || '#000000'}
                      onChange={(e) => setEmailBackground({ 
                        gradientColors: [emailBackground.gradientColors?.[0] || '#ffffff', e.target.value] 
                      })}
                      className="w-12 h-10 p-1 border rounded cursor-pointer"
                      data-testid="input-gradient-color-2"
                    />
                    <Input
                      type="text"
                      value={emailBackground.gradientColors?.[1] || '#000000'}
                      onChange={(e) => setEmailBackground({ 
                        gradientColors: [emailBackground.gradientColors?.[0] || '#ffffff', e.target.value] 
                      })}
                      className="flex-1"
                      placeholder="#000000"
                      data-testid="input-gradient-color-2-hex"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Label>Gradient Direction</Label>
                <Select
                  value={emailBackground.gradientDirection || 'to-bottom'}
                  onValueChange={(value) => setEmailBackground({ gradientDirection: value as any })}
                >
                  <SelectTrigger data-testid="select-gradient-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to-top">Top</SelectItem>
                    <SelectItem value="to-bottom">Bottom</SelectItem>
                    <SelectItem value="to-left">Left</SelectItem>
                    <SelectItem value="to-right">Right</SelectItem>
                    <SelectItem value="to-top-left">Top Left</SelectItem>
                    <SelectItem value="to-top-right">Top Right</SelectItem>
                    <SelectItem value="to-bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="to-bottom-right">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Image Background */}
          {emailBackground.type === 'image' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Background Image</Label>
                <Input
                  type="url"
                  value={emailBackground.imageUrl || ''}
                  onChange={(e) => setEmailBackground({ imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-background-image-url"
                />
              </div>
              <div className="space-y-3">
                <Label>Fallback Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={emailBackground.backgroundColor || '#ffffff'}
                    onChange={(e) => setEmailBackground({ backgroundColor: e.target.value })}
                    className="w-12 h-10 p-1 border rounded cursor-pointer"
                    data-testid="input-fallback-background-color"
                  />
                  <Input
                    type="text"
                    value={emailBackground.backgroundColor || '#ffffff'}
                    onChange={(e) => setEmailBackground({ backgroundColor: e.target.value })}
                    className="flex-1"
                    placeholder="#ffffff"
                    data-testid="input-fallback-background-color-hex"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Shows if the image fails to load
                </p>
              </div>
            </div>
          )}

          {/* Border Radius */}
          <div className="space-y-3">
            <Label>Rounded Corners</Label>
            <Select
              value={emailBackground.borderRadius || '0px'}
              onValueChange={(value) => setEmailBackground({ borderRadius: value })}
            >
              <SelectTrigger data-testid="select-email-border-radius">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0px">None</SelectItem>
                <SelectItem value="4px">Small (4px)</SelectItem>
                <SelectItem value="8px">Medium (8px)</SelectItem>
                <SelectItem value="12px">Large (12px)</SelectItem>
                <SelectItem value="16px">Extra Large (16px)</SelectItem>
                <SelectItem value="24px">XXL (24px)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Properties Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Properties</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {/* Close panel on mobile */}}
            data-testid="button-close-properties"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 capitalize">
          {selectedElement.type} Properties
        </p>
      </div>

      {/* Properties Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Element-specific properties */}
        {selectedElement.type === 'text' && (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label>Content</Label>
              <Textarea
                id="text-content"
                value={selectedElement.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Enter your text content..."
                rows={4}
                className="resize-none"
                data-testid="textarea-content"
              />
            </div>

            {/* Rich Text Toolbar */}
            <div className="space-y-3">
              <Label>Formatting</Label>
              <Card>
                <CardContent className="p-2">
                  <div className="flex flex-wrap gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const textarea = document.getElementById('text-content') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = selectedElement.content || '';
                          const selectedText = text.substring(start, end);
                          if (selectedText) {
                            const newText = text.substring(0, start) + '**' + selectedText + '**' + text.substring(end);
                            handleContentChange(newText);
                            // Reset selection after the inserted markers
                            setTimeout(() => {
                              textarea.setSelectionRange(start + 2, end + 2);
                              textarea.focus();
                            }, 0);
                          } else {
                            // Insert markers at cursor position
                            const newText = text.substring(0, start) + '****' + text.substring(end);
                            handleContentChange(newText);
                            // Place cursor between the markers
                            setTimeout(() => {
                              textarea.setSelectionRange(start + 2, start + 2);
                              textarea.focus();
                            }, 0);
                          }
                        }
                      }}
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const textarea = document.getElementById('text-content') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = selectedElement.content || '';
                          const selectedText = text.substring(start, end);
                          if (selectedText) {
                            const newText = text.substring(0, start) + '*' + selectedText + '*' + text.substring(end);
                            handleContentChange(newText);
                            // Reset selection after the inserted markers
                            setTimeout(() => {
                              textarea.setSelectionRange(start + 1, end + 1);
                              textarea.focus();
                            }, 0);
                          } else {
                            // Insert markers at cursor position
                            const newText = text.substring(0, start) + '**' + text.substring(end);
                            handleContentChange(newText);
                            // Place cursor between the markers
                            setTimeout(() => {
                              textarea.setSelectionRange(start + 1, start + 1);
                              textarea.focus();
                            }, 0);
                          }
                        }
                      }}
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button 
                      variant={localStyles.textAlign === 'left' || !localStyles.textAlign ? "secondary" : "ghost"}
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleStyleChange('textAlign', 'left')}
                      title="Align Left"
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={localStyles.textAlign === 'center' ? "secondary" : "ghost"}
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleStyleChange('textAlign', 'center')}
                      title="Align Center"
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={localStyles.textAlign === 'right' ? "secondary" : "ghost"}
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleStyleChange('textAlign', 'right')}
                      title="Align Right"
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const textarea = document.getElementById('text-content') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const text = selectedElement.content || '';
                          const lines = text.split('\n');
                          let currentLine = 0;
                          let charCount = 0;
                          for (let i = 0; i < lines.length; i++) {
                            if (charCount + lines[i].length >= start) {
                              currentLine = i;
                              break;
                            }
                            charCount += lines[i].length + 1;
                          }
                          if (!lines[currentLine].startsWith('- ')) {
                            lines[currentLine] = '- ' + lines[currentLine];
                            handleContentChange(lines.join('\n'));
                          }
                        }
                      }}
                      title="Bullet List"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const textarea = document.getElementById('text-content') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const text = selectedElement.content || '';
                          const lines = text.split('\n');
                          let currentLine = 0;
                          let charCount = 0;
                          for (let i = 0; i < lines.length; i++) {
                            if (charCount + lines[i].length >= start) {
                              currentLine = i;
                              break;
                            }
                            charCount += lines[i].length + 1;
                          }
                          if (!lines[currentLine].match(/^\d+\. /)) {
                            lines[currentLine] = '1. ' + lines[currentLine];
                            handleContentChange(lines.join('\n'));
                          }
                        }
                      }}
                      title="Numbered List"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block">Font Family</Label>
                <Select
                  value={localStyles.fontFamily || 'Inter, system-ui, sans-serif'}
                  onValueChange={(value) => handleStyleChange('fontFamily', value)}
                >
                  <SelectTrigger data-testid="select-font-family">
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
                <Label className="mb-2 block">Font Size</Label>
                <Select
                  value={localStyles.fontSize || '16px'}
                  onValueChange={(value) => handleStyleChange('fontSize', value)}
                >
                  <SelectTrigger data-testid="select-font-size">
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
            </div>

            <div>
              <Label className="mb-2 block">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localStyles.color || '#000000'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded cursor-pointer"
                  data-testid="input-text-color"
                />
                <Input
                  type="text"
                  value={localStyles.color || '#000000'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="flex-1"
                  data-testid="input-text-color-hex"
                />
              </div>
            </div>
            
            {/* Spacing Controls */}
            <div className="space-y-4">
              <Separator />
              <div>
                <Label className="text-sm font-semibold">Spacing</Label>
                <p className="text-xs text-muted-foreground mb-3">Control space around this element</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block text-sm">Top Margin</Label>
                    <Select
                      value={localStyles.marginTop || '16px'}
                      onValueChange={(value) => handleStyleChange('marginTop', value)}
                    >
                      <SelectTrigger data-testid="select-text-margin-top">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Bottom Margin</Label>
                    <Select
                      value={localStyles.marginBottom || '16px'}
                      onValueChange={(value) => handleStyleChange('marginBottom', value)}
                    >
                      <SelectTrigger data-testid="select-text-margin-bottom">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="mb-2 block text-sm">Left/Right Padding</Label>
                    <Select
                      value={localStyles.paddingX || '20px'}
                      onValueChange={(value) => handleStyleChange('paddingX', value)}
                    >
                      <SelectTrigger data-testid="select-text-padding-x">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Top/Bottom Padding</Label>
                    <Select
                      value={localStyles.paddingY || '0px'}
                      onValueChange={(value) => handleStyleChange('paddingY', value)}
                    >
                      <SelectTrigger data-testid="select-text-padding-y">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'button' && (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label>Button Text</Label>
              <Input
                value={localProperties.text || selectedElement.content}
                onChange={(e) => {
                  handlePropertyChange('text', e.target.value);
                  handleContentChange(e.target.value);
                }}
                placeholder="Enter button text..."
                data-testid="input-button-text"
              />
            </div>

            <div className="space-y-3">
              <Label>Link URL</Label>
              <Input
                type="url"
                value={localProperties.url || ''}
                onChange={(e) => handlePropertyChange('url', e.target.value)}
                placeholder="https://example.com"
                data-testid="input-button-url"
              />
            </div>

            <div className="space-y-4">
              {/* Full Width Toggle */}
              <div className="flex items-center space-x-3">
                <Label htmlFor="full-width" className="text-sm font-medium">Full Width</Label>
                <input
                  id="full-width"
                  type="checkbox"
                  checked={localProperties.fullWidth || false}
                  onChange={(e) => handlePropertyChange('fullWidth', e.target.checked)}
                  className="rounded"
                  data-testid="checkbox-button-full-width"
                />
              </div>
              
              {/* Button Size */}
              <div>
                <Label className="mb-2 block">Button Size</Label>
                <Select
                  value={localProperties.size || 'medium'}
                  onValueChange={(value) => handlePropertyChange('size', value)}
                >
                  <SelectTrigger data-testid="select-button-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Button Alignment */}
              <div>
                <Label className="mb-2 block">Alignment</Label>
                <Select
                  value={localProperties.alignment || 'center'}
                  onValueChange={(value) => handlePropertyChange('alignment', value)}
                >
                  <SelectTrigger data-testid="select-button-alignment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-2 block">Background</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={localStyles.backgroundColor || '#2563eb'}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="w-12 h-10 p-1 border rounded cursor-pointer"
                      data-testid="input-button-bg-color"
                    />
                    <Input
                      type="text"
                      value={localStyles.backgroundColor || '#2563eb'}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="flex-1"
                      data-testid="input-button-bg-color-hex"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={localStyles.color || '#ffffff'}
                      onChange={(e) => handleStyleChange('color', e.target.value)}
                      className="w-12 h-10 p-1 border rounded cursor-pointer"
                      data-testid="input-button-text-color"
                    />
                    <Input
                      type="text"
                      value={localStyles.color || '#ffffff'}
                      onChange={(e) => handleStyleChange('color', e.target.value)}
                      className="flex-1"
                      data-testid="input-button-text-color-hex"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-2 block">Border Radius</Label>
                <Select
                  value={localStyles.borderRadius || '6px'}
                  onValueChange={(value) => handleStyleChange('borderRadius', value)}
                >
                  <SelectTrigger data-testid="select-button-radius">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0px">0px</SelectItem>
                    <SelectItem value="4px">4px</SelectItem>
                    <SelectItem value="6px">6px</SelectItem>
                    <SelectItem value="8px">8px</SelectItem>
                    <SelectItem value="12px">12px</SelectItem>
                    <SelectItem value="16px">16px</SelectItem>
                    <SelectItem value="24px">24px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Padding X</Label>
                <Select
                  value={localStyles.paddingX || '24px'}
                  onValueChange={(value) => handleStyleChange('paddingX', value)}
                >
                  <SelectTrigger data-testid="select-button-padding-x">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16px">16px</SelectItem>
                    <SelectItem value="20px">20px</SelectItem>
                    <SelectItem value="24px">24px</SelectItem>
                    <SelectItem value="32px">32px</SelectItem>
                    <SelectItem value="40px">40px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Padding Y</Label>
                <Select
                  value={localStyles.paddingY || '12px'}
                  onValueChange={(value) => handleStyleChange('paddingY', value)}
                >
                  <SelectTrigger data-testid="select-button-padding-y">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8px">8px</SelectItem>
                    <SelectItem value="12px">12px</SelectItem>
                    <SelectItem value="16px">16px</SelectItem>
                    <SelectItem value="20px">20px</SelectItem>
                    <SelectItem value="24px">24px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Spacing Controls */}
            <div className="space-y-4">
              <Separator />
              <div>
                <Label className="text-sm font-semibold">Spacing</Label>
                <p className="text-xs text-muted-foreground mb-3">Control space around this button</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block text-sm">Top Margin</Label>
                    <Select
                      value={localStyles.marginTop || '20px'}
                      onValueChange={(value) => handleStyleChange('marginTop', value)}
                    >
                      <SelectTrigger data-testid="select-button-margin-top">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Bottom Margin</Label>
                    <Select
                      value={localStyles.marginBottom || '20px'}
                      onValueChange={(value) => handleStyleChange('marginBottom', value)}
                    >
                      <SelectTrigger data-testid="select-button-margin-bottom">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'image' && (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label>Image Source</Label>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="border-2 border-dashed border-border rounded-lg p-6">
                    <svg className="h-8 w-8 mx-auto mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-muted-foreground mb-3">
                      Click to upload or drag image here
                    </p>
                    <Button variant="outline" size="sm" data-testid="button-upload-image">
                      Choose File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <Label>Alt Text</Label>
              <Input
                value={localProperties.alt || ''}
                onChange={(e) => handlePropertyChange('alt', e.target.value)}
                placeholder="Describe the image..."
                data-testid="input-image-alt"
              />
            </div>

            <div className="space-y-3">
              <Label>Link URL (optional)</Label>
              <Input
                type="url"
                value={localProperties.url || ''}
                onChange={(e) => handlePropertyChange('url', e.target.value)}
                placeholder="https://example.com"
                data-testid="input-image-url"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block">Width</Label>
                <Select
                  value={localStyles.maxWidth || '100%'}
                  onValueChange={(value) => handleStyleChange('maxWidth', value)}
                >
                  <SelectTrigger data-testid="select-image-width">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100%">Full Width</SelectItem>
                    <SelectItem value="75%">75%</SelectItem>
                    <SelectItem value="50%">50%</SelectItem>
                    <SelectItem value="300px">300px</SelectItem>
                    <SelectItem value="400px">400px</SelectItem>
                    <SelectItem value="500px">500px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Height</Label>
                <Select
                  value={localStyles.height || 'auto'}
                  onValueChange={(value) => handleStyleChange('height', value)}
                >
                  <SelectTrigger data-testid="select-image-height">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (maintain aspect ratio)</SelectItem>
                    <SelectItem value="150px">150px</SelectItem>
                    <SelectItem value="200px">200px</SelectItem>
                    <SelectItem value="250px">250px</SelectItem>
                    <SelectItem value="300px">300px</SelectItem>
                    <SelectItem value="400px">400px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Image Fit</Label>
                <Select
                  value={localStyles.objectFit || 'cover'}
                  onValueChange={(value) => handleStyleChange('objectFit', value)}
                >
                  <SelectTrigger data-testid="select-image-fit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover (fills area)</SelectItem>
                    <SelectItem value="contain">Contain (fits inside)</SelectItem>
                    <SelectItem value="fill">Fill (stretches)</SelectItem>
                    <SelectItem value="none">None (original size)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Spacing Controls */}
            <div className="space-y-4">
              <Separator />
              <div>
                <Label className="text-sm font-semibold">Spacing</Label>
                <p className="text-xs text-muted-foreground mb-3">Control space around this image</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block text-sm">Top Margin</Label>
                    <Select
                      value={localStyles.marginTop || '20px'}
                      onValueChange={(value) => handleStyleChange('marginTop', value)}
                    >
                      <SelectTrigger data-testid="select-image-margin-top">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Bottom Margin</Label>
                    <Select
                      value={localStyles.marginBottom || '20px'}
                      onValueChange={(value) => handleStyleChange('marginBottom', value)}
                    >
                      <SelectTrigger data-testid="select-image-margin-bottom">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="mb-2 block text-sm">Left/Right Padding</Label>
                    <Select
                      value={localStyles.paddingX || '20px'}
                      onValueChange={(value) => handleStyleChange('paddingX', value)}
                    >
                      <SelectTrigger data-testid="select-image-padding-x">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Top/Bottom Padding</Label>
                    <Select
                      value={localStyles.paddingY || '0px'}
                      onValueChange={(value) => handleStyleChange('paddingY', value)}
                    >
                      <SelectTrigger data-testid="select-image-padding-y">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'social' && (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label>Social Media Links</Label>
              <div className="space-y-3">
                <div>
                  <Label className="mb-2 block text-sm">Facebook URL</Label>
                  <Input
                    type="url"
                    value={localProperties.facebook || ''}
                    onChange={(e) => handlePropertyChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                    data-testid="input-facebook-url"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm">Twitter URL</Label>
                  <Input
                    type="url"
                    value={localProperties.twitter || ''}
                    onChange={(e) => handlePropertyChange('twitter', e.target.value)}
                    placeholder="https://twitter.com/youraccount"
                    data-testid="input-twitter-url"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm">Instagram URL</Label>
                  <Input
                    type="url"
                    value={localProperties.instagram || ''}
                    onChange={(e) => handlePropertyChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/youraccount"
                    data-testid="input-instagram-url"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm">LinkedIn URL</Label>
                  <Input
                    type="url"
                    value={localProperties.linkedin || ''}
                    onChange={(e) => handlePropertyChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/yourcompany"
                    data-testid="input-linkedin-url"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm">TikTok URL</Label>
                  <Input
                    type="url"
                    value={localProperties.tiktok || ''}
                    onChange={(e) => handlePropertyChange('tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@youraccount"
                    data-testid="input-tiktok-url"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Icon Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localProperties.iconColor || '#000000'}
                  onChange={(e) => handlePropertyChange('iconColor', e.target.value)}
                  className="w-12 h-10 p-1 border rounded cursor-pointer"
                  data-testid="input-icon-color"
                />
                <Input
                  type="text"
                  value={localProperties.iconColor || '#000000'}
                  onChange={(e) => handlePropertyChange('iconColor', e.target.value)}
                  className="flex-1"
                  placeholder="#000000"
                  data-testid="input-icon-color-hex"
                />
              </div>
            </div>
            
            {/* Spacing Controls */}
            <div className="space-y-4">
              <Separator />
              <div>
                <Label className="text-sm font-semibold">Spacing</Label>
                <p className="text-xs text-muted-foreground mb-3">Control space around social icons</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block text-sm">Top Margin</Label>
                    <Select
                      value={localStyles.marginTop || '20px'}
                      onValueChange={(value) => handleStyleChange('marginTop', value)}
                    >
                      <SelectTrigger data-testid="select-social-margin-top">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Bottom Margin</Label>
                    <Select
                      value={localStyles.marginBottom || '20px'}
                      onValueChange={(value) => handleStyleChange('marginBottom', value)}
                    >
                      <SelectTrigger data-testid="select-social-margin-bottom">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="mb-2 block text-sm">Left/Right Padding</Label>
                    <Select
                      value={localStyles.paddingX || '20px'}
                      onValueChange={(value) => handleStyleChange('paddingX', value)}
                    >
                      <SelectTrigger data-testid="select-social-padding-x">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Top/Bottom Padding</Label>
                    <Select
                      value={localStyles.paddingY || '0px'}
                      onValueChange={(value) => handleStyleChange('paddingY', value)}
                    >
                      <SelectTrigger data-testid="select-social-padding-y">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'divider' && (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label>Divider Style</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-2 block text-sm">Height</Label>
                  <Select
                    value={localStyles.height || '1px'}
                    onValueChange={(value) => handleStyleChange('height', value)}
                  >
                    <SelectTrigger data-testid="select-divider-height">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1px">1px</SelectItem>
                      <SelectItem value="2px">2px</SelectItem>
                      <SelectItem value="3px">3px</SelectItem>
                      <SelectItem value="4px">4px</SelectItem>
                      <SelectItem value="5px">5px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-sm">Width</Label>
                  <Select
                    value={localStyles.width || '100%'}
                    onValueChange={(value) => handleStyleChange('width', value)}
                  >
                    <SelectTrigger data-testid="select-divider-width">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100%">100%</SelectItem>
                      <SelectItem value="75%">75%</SelectItem>
                      <SelectItem value="50%">50%</SelectItem>
                      <SelectItem value="25%">25%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="mb-2 block text-sm">Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localStyles.borderColor || '#e5e7eb'}
                    onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                    className="w-12 h-10 p-1 border rounded cursor-pointer"
                    data-testid="input-divider-color"
                  />
                  <Input
                    type="text"
                    value={localStyles.borderColor || '#e5e7eb'}
                    onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                    className="flex-1"
                    data-testid="input-divider-color-hex"
                  />
                </div>
              </div>
            </div>
            
            {/* Spacing Controls */}
            <div className="space-y-4">
              <Separator />
              <div>
                <Label className="text-sm font-semibold">Spacing</Label>
                <p className="text-xs text-muted-foreground mb-3">Control space around this divider</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block text-sm">Top Margin</Label>
                    <Select
                      value={localStyles.marginTop || '20px'}
                      onValueChange={(value) => handleStyleChange('marginTop', value)}
                    >
                      <SelectTrigger data-testid="select-divider-margin-top">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Bottom Margin</Label>
                    <Select
                      value={localStyles.marginBottom || '20px'}
                      onValueChange={(value) => handleStyleChange('marginBottom', value)}
                    >
                      <SelectTrigger data-testid="select-divider-margin-bottom">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">0px</SelectItem>
                        <SelectItem value="8px">8px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                        <SelectItem value="24px">24px</SelectItem>
                        <SelectItem value="32px">32px</SelectItem>
                        <SelectItem value="40px">40px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'spacer' && (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label>Spacer Height</Label>
              <Select
                value={localStyles.height || '20px'}
                onValueChange={(value) => handleStyleChange('height', value)}
              >
                <SelectTrigger data-testid="select-spacer-height">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10px">10px</SelectItem>
                  <SelectItem value="20px">20px</SelectItem>
                  <SelectItem value="30px">30px</SelectItem>
                  <SelectItem value="40px">40px</SelectItem>
                  <SelectItem value="50px">50px</SelectItem>
                  <SelectItem value="60px">60px</SelectItem>
                  <SelectItem value="80px">80px</SelectItem>
                  <SelectItem value="100px">100px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {selectedElement.type === 'columns' && (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label>Column Layout</Label>
              <Select
                value={localProperties.columnCount || '2'}
                onValueChange={(value) => handlePropertyChange('columnCount', value)}
              >
                <SelectTrigger data-testid="select-column-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Column Gap</Label>
              <Select
                value={localStyles.gap || '16px'}
                onValueChange={(value) => handleStyleChange('gap', value)}
              >
                <SelectTrigger data-testid="select-column-gap">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8px">8px</SelectItem>
                  <SelectItem value="16px">16px</SelectItem>
                  <SelectItem value="24px">24px</SelectItem>
                  <SelectItem value="32px">32px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {selectedElement.type === 'footer' && (
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label>Footer Content</Label>
              <Textarea
                value={selectedElement.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Enter footer content..."
                rows={3}
                className="resize-none"
                data-testid="textarea-footer-content"
              />
            </div>
            <div className="space-y-3">
              <Label>Unsubscribe Link</Label>
              <Input
                type="url"
                value={localProperties.unsubscribeUrl || ''}
                onChange={(e) => handlePropertyChange('unsubscribeUrl', e.target.value)}
                placeholder="https://example.com/unsubscribe"
                data-testid="input-unsubscribe-url"
              />
            </div>
            <div>
              <Label className="mb-2 block">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localStyles.color || '#6b7280'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="w-12 h-10 p-1 border rounded cursor-pointer"
                  data-testid="input-footer-text-color"
                />
                <Input
                  type="text"
                  value={localStyles.color || '#6b7280'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="flex-1"
                  data-testid="input-footer-text-color-hex"
                />
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'section' && (
          <div className="p-4 space-y-6">
            {/* Background Type Selector */}
            <div className="space-y-3">
              <Label>Background Type</Label>
              <Select
                value={localProperties.backgroundType || 'color'}
                onValueChange={(value: 'color' | 'gradient' | 'image') => handlePropertyChange('backgroundType', value)}
              >
                <SelectTrigger data-testid="select-section-background-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">Solid Color</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color Background */}
            {(localProperties.backgroundType === 'color' || !localProperties.backgroundType) && (
              <div className="space-y-3">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localStyles.backgroundColor || '#ffffff'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="w-12 h-10 p-1 border rounded cursor-pointer"
                    data-testid="input-section-background-color"
                  />
                  <Input
                    type="text"
                    value={localStyles.backgroundColor || '#ffffff'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="flex-1"
                    placeholder="#ffffff"
                    data-testid="input-section-background-color-hex"
                  />
                </div>
              </div>
            )}

            {/* Gradient Background */}
            {localProperties.backgroundType === 'gradient' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Gradient Colors</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={localProperties.gradientColors?.[0] || '#ffffff'}
                        onChange={(e) => handlePropertyChange('gradientColors', [e.target.value, localProperties.gradientColors?.[1] || '#000000'])}
                        className="w-12 h-10 p-1 border rounded cursor-pointer"
                        data-testid="input-section-gradient-color-1"
                      />
                      <Input
                        type="text"
                        value={localProperties.gradientColors?.[0] || '#ffffff'}
                        onChange={(e) => handlePropertyChange('gradientColors', [e.target.value, localProperties.gradientColors?.[1] || '#000000'])}
                        className="flex-1"
                        placeholder="#ffffff"
                        data-testid="input-section-gradient-color-1-hex"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={localProperties.gradientColors?.[1] || '#000000'}
                        onChange={(e) => handlePropertyChange('gradientColors', [localProperties.gradientColors?.[0] || '#ffffff', e.target.value])}
                        className="w-12 h-10 p-1 border rounded cursor-pointer"
                        data-testid="input-section-gradient-color-2"
                      />
                      <Input
                        type="text"
                        value={localProperties.gradientColors?.[1] || '#000000'}
                        onChange={(e) => handlePropertyChange('gradientColors', [localProperties.gradientColors?.[0] || '#ffffff', e.target.value])}
                        className="flex-1"
                        placeholder="#000000"
                        data-testid="input-section-gradient-color-2-hex"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Gradient Direction</Label>
                  <Select
                    value={localProperties.gradientDirection || 'to bottom'}
                    onValueChange={(value) => handlePropertyChange('gradientDirection', value)}
                  >
                    <SelectTrigger data-testid="select-section-gradient-direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to top">To Top</SelectItem>
                      <SelectItem value="to bottom">To Bottom</SelectItem>
                      <SelectItem value="to left">To Left</SelectItem>
                      <SelectItem value="to right">To Right</SelectItem>
                      <SelectItem value="to top right">To Top Right</SelectItem>
                      <SelectItem value="to bottom right">To Bottom Right</SelectItem>
                      <SelectItem value="to bottom left">To Bottom Left</SelectItem>
                      <SelectItem value="to top left">To Top Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Image Background */}
            {localProperties.backgroundType === 'image' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Background Image URL</Label>
                  <Input
                    type="url"
                    value={localProperties.imageUrl || ''}
                    onChange={(e) => handlePropertyChange('imageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    data-testid="input-section-image-url"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Fallback Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={localStyles.backgroundColor || '#ffffff'}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="w-12 h-10 p-1 border rounded cursor-pointer"
                      data-testid="input-section-fallback-color"
                    />
                    <Input
                      type="text"
                      value={localStyles.backgroundColor || '#ffffff'}
                      onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                      className="flex-1"
                      placeholder="#ffffff"
                      data-testid="input-section-fallback-color-hex"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Border Radius */}
            <div className="space-y-3">
              <Label>Border Radius</Label>
              <Select
                value={localStyles.borderRadius || '0px'}
                onValueChange={(value) => handleStyleChange('borderRadius', value)}
              >
                <SelectTrigger data-testid="select-section-border-radius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0px">No Radius</SelectItem>
                  <SelectItem value="4px">Small (4px)</SelectItem>
                  <SelectItem value="8px">Medium (8px)</SelectItem>
                  <SelectItem value="12px">Large (12px)</SelectItem>
                  <SelectItem value="16px">Extra Large (16px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Padding */}
            <div className="space-y-3">
              <Label>Padding</Label>
              <Select
                value={localStyles.padding || '20px'}
                onValueChange={(value) => handleStyleChange('padding', value)}
              >
                <SelectTrigger data-testid="select-section-padding">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8px">Small (8px)</SelectItem>
                  <SelectItem value="16px">Medium (16px)</SelectItem>
                  <SelectItem value="20px">Default (20px)</SelectItem>
                  <SelectItem value="24px">Large (24px)</SelectItem>
                  <SelectItem value="32px">Extra Large (32px)</SelectItem>
                  <SelectItem value="40px">Huge (40px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* General Spacing & Styling */}
        <div className="p-4 border-t border-border space-y-6">
          <h4 className="font-medium text-sm">Spacing & Layout</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2 block">Margin Top</Label>
              <Select
                value={localStyles.marginTop || '16px'}
                onValueChange={(value) => handleStyleChange('marginTop', value)}
              >
                <SelectTrigger data-testid="select-margin-top">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0px">0px</SelectItem>
                  <SelectItem value="8px">8px</SelectItem>
                  <SelectItem value="16px">16px</SelectItem>
                  <SelectItem value="24px">24px</SelectItem>
                  <SelectItem value="32px">32px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Margin Bottom</Label>
              <Select
                value={localStyles.marginBottom || '16px'}
                onValueChange={(value) => handleStyleChange('marginBottom', value)}
              >
                <SelectTrigger data-testid="select-margin-bottom">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0px">0px</SelectItem>
                  <SelectItem value="8px">8px</SelectItem>
                  <SelectItem value="16px">16px</SelectItem>
                  <SelectItem value="24px">24px</SelectItem>
                  <SelectItem value="32px">32px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Background Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={localStyles.backgroundColor || '#ffffff'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-12 h-10 p-1 border rounded cursor-pointer"
                data-testid="input-background-color"
              />
              <Input
                type="text"
                value={localStyles.backgroundColor || '#ffffff'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="flex-1"
                data-testid="input-background-color-hex"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Properties Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => duplicateElement && duplicateElement(selectedElement.id)}
            data-testid="button-duplicate-element"
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteElement && deleteElement(selectedElement.id)}
            data-testid="button-delete-element"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
