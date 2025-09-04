import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEmailBuilder } from "@/hooks/use-email-builder";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  FolderOpen, 
  Plus, 
  Star, 
  Trash2, 
  Eye,
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TemplateManager() {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { elements, subject, loadFromTemplate } = useEmailBuilder();

  // Fetch templates
  const { data: templatesResponse, isLoading } = useQuery({
    queryKey: ['/api/templates'],
  });

  const templates = (templatesResponse as any)?.data || [];

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return apiRequest('POST', '/api/templates', templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setShowSaveDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      toast({
        title: "Template saved",
        description: "Your email template has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest('DELETE', `/api/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }

    saveTemplateMutation.mutate({
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      subject,
      elements,
      isPublic: 'false',
    });
  };

  const handleLoadTemplate = (template: any) => {
    loadFromTemplate(template);
    toast({
      title: "Template loaded",
      description: `${template.name} has been loaded into the editor.`,
    });
  };

  const categories = Array.from(new Set(templates.map((t: any) => t.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Email Templates</h2>
          <p className="text-sm text-muted-foreground">
            Save and reuse your email designs
          </p>
        </div>
        
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-save-template">
              <Plus className="h-4 w-4 mr-2" />
              Save Current
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Email Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="mb-2 block">Template Name</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Enter template name..."
                  data-testid="input-template-name"
                />
              </div>
              
              <div>
                <Label className="mb-2 block">Description (optional)</Label>
                <Textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe what this template is for..."
                  rows={3}
                  data-testid="textarea-template-description"
                />
              </div>
              
              <div>
                <Label className="mb-2 block">Category</Label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowSaveDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveTemplate}
                disabled={saveTemplateMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-save-template"
              >
                {saveTemplateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Filter */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="default" className="cursor-pointer">
          All Templates
        </Badge>
        {categories.map((category, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="cursor-pointer hover:bg-secondary/80"
          >
            {String(category)}
          </Badge>
        ))}
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-24 bg-muted rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-muted rounded flex-1"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: any) => (
            <Card 
              key={template.id} 
              className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {template.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    {template.isPublic === 'true' && (
                      <Star className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Template Preview */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg mb-4 min-h-24 flex items-center justify-center">
                  <div className="text-xs text-muted-foreground text-center">
                    <div className="text-lg mb-1">📧</div>
                    <div>{template.elements?.length || 0} elements</div>
                  </div>
                </div>
                
                {/* Template Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadTemplate(template)}
                    className="flex-1"
                    data-testid={`button-load-template-${template.id}`}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Load
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    data-testid={`button-preview-template-${template.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    data-testid={`button-duplicate-template-${template.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  {template.isPublic === 'false' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-destructive hover:text-destructive"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                      disabled={deleteTemplateMutation.isPending}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {templates.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Save className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-sm mb-4">
              Create your first template by designing an email and saving it
            </p>
            <Button 
              onClick={() => setShowSaveDialog(true)}
              data-testid="button-create-first-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              Save Current Design
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
