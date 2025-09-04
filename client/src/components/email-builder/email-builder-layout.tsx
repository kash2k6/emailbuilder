import { useState } from "react";
import { ComponentPalette } from "./component-palette";
import { EmailCanvas } from "./email-canvas";
import { PropertiesPanel } from "./properties-panel";
import { EmailPreview } from "./email-preview";
import { TemplateManager } from "./template-manager";
import { useEmailBuilder } from "@/contexts/email-builder-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Mail, 
  Save, 
  Eye, 
  Send, 
  Menu,
  Settings,
  Smartphone,
  Monitor,
  FolderOpen
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function EmailBuilderLayout() {
  const isMobile = useIsMobile();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(!isMobile);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(!isMobile);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const {
    elements,
    subject,
    setSubject,
    selectedElement,
    emailWidth,
    setEmailWidth,
    generateHTML,
    saveDraft,
    isSaving,
    lastSaved
  } = useEmailBuilder();

  const handleSend = async () => {
    try {
      const { html, text } = await generateHTML();
      // Here you would integrate with your email sending service (Resend)
      console.log('Sending email:', { subject, html, text });
      setShowSendDialog(false);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Email Builder</h1>
          </div>
          
          {/* Mobile Sidebar Toggles */}
          {isMobile && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                data-testid="button-toggle-components"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                data-testid="button-toggle-properties"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Email Subject */}
          {!isMobile && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Subject:</label>
              <Input
                type="text"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="min-w-64"
                data-testid="input-subject"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Load/Save Template Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              data-testid="button-save-template"
            >
              <Save className="h-4 w-4 mr-2" />
              {!isMobile && "Save"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLoadDialog(true)}
              data-testid="button-load-template"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              {!isMobile && "Load"}
            </Button>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-preview">
                  <Eye className="h-4 w-4 mr-2" />
                  {!isMobile && "Preview"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Email Preview</DialogTitle>
                </DialogHeader>
                <EmailPreview />
              </DialogContent>
            </Dialog>

            <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-send">
                  <Send className="h-4 w-4 mr-2" />
                  {!isMobile && "Send"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Email Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Audience</label>
                    <Select>
                      <SelectTrigger data-testid="select-audience">
                        <SelectValue placeholder="Choose your audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newsletter">Newsletter Subscribers (2,847)</SelectItem>
                        <SelectItem value="premium">Premium Users (456)</SelectItem>
                        <SelectItem value="new">New Signups (189)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="font-medium">Ready to send</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your email will be optimized for all email clients.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowSendDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSend} className="flex-1" data-testid="button-confirm-send">
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Component Palette */}
        <div className={`
          ${isMobile ? 'absolute inset-y-0 left-0 z-50' : 'relative'}
          ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isMobile ? 'w-80' : 'w-72'}
          bg-card border-r border-border transition-transform duration-300 ease-in-out
        `}>
          <ComponentPalette />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Width:</label>
                <Select value={emailWidth.toString()} onValueChange={(value) => setEmailWidth(parseInt(value))}>
                  <SelectTrigger className="w-32" data-testid="select-email-width">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="600">600px</SelectItem>
                    <SelectItem value="480">480px</SelectItem>
                    <SelectItem value="320">320px</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview Toggle */}
              <div className="flex bg-secondary rounded-lg p-1">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                  className="h-8"
                  data-testid="button-desktop-preview"
                >
                  <Monitor className="h-4 w-4 mr-1" />
                  Desktop
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                  className="h-8"
                  data-testid="button-mobile-preview"
                >
                  <Smartphone className="h-4 w-4 mr-1" />
                  Mobile
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isSaving && <span>Saving...</span>}
              {lastSaved && <span>Saved {lastSaved}</span>}
            </div>
          </div>

          {/* Canvas Container */}
          <div className="flex-1 p-6 overflow-auto flex justify-center">
            <div
              className={`transition-all duration-300 ${
                previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
              }`}
              style={{ width: previewMode === 'mobile' ? '375px' : `${emailWidth}px` }}
            >
              <EmailCanvas />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties Panel */}
        <div className={`
          ${isMobile ? 'absolute inset-y-0 right-0 z-50' : 'relative'}
          ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          ${isMobile ? 'w-80' : 'w-80'}
          bg-card border-l border-border transition-transform duration-300 ease-in-out
        `}>
          <PropertiesPanel />
        </div>
      </div>

      {/* Mobile Subject Input */}
      {isMobile && (
        <div className="bg-card border-t border-border px-4 py-3">
          <label className="text-sm font-medium mb-2 block">Email Subject</label>
          <Input
            type="text"
            placeholder="Enter email subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            data-testid="input-subject-mobile"
          />
        </div>
      )}

      {/* Mobile backdrop */}
      {isMobile && (leftSidebarOpen || rightSidebarOpen) && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => {
            setLeftSidebarOpen(false);
            setRightSidebarOpen(false);
          }}
        />
      )}

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Email Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe your template..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (templateName.trim()) {
                  const templateData = {
                    id: Date.now().toString(),
                    name: templateName,
                    description: templateDescription,
                    elements: elements,
                    subject: subject,
                    createdAt: new Date().toISOString()
                  };
                  const savedTemplates = JSON.parse(localStorage.getItem('email-templates') || '[]');
                  savedTemplates.push(templateData);
                  localStorage.setItem('email-templates', JSON.stringify(savedTemplates));
                  setTemplateName('');
                  setTemplateDescription('');
                  setShowSaveDialog(false);
                }
              }}
              disabled={!templateName.trim()}
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Email Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {JSON.parse(localStorage.getItem('email-templates') || '[]').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No saved templates found</p>
                <p className="text-sm">Save your current design to create your first template</p>
              </div>
            ) : (
              JSON.parse(localStorage.getItem('email-templates') || '[]').map((template: any) => (
                <div key={template.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Saved: {new Date(template.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Load template functionality will be improved later
                          alert(`Loading template: ${template.name}. This will replace your current design.`);
                          setShowLoadDialog(false);
                        }}
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const savedTemplates = JSON.parse(localStorage.getItem('email-templates') || '[]');
                          const filteredTemplates = savedTemplates.filter((t: any) => t.id !== template.id);
                          localStorage.setItem('email-templates', JSON.stringify(filteredTemplates));
                          // Force re-render
                          setShowLoadDialog(false);
                          setTimeout(() => setShowLoadDialog(true), 100);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
