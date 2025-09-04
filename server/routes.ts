import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmailTemplateSchema, insertEmailCampaignSchema, emailBuilderDataSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Email Templates Routes
  app.get("/api/templates", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const templates = await storage.getEmailTemplates(userId);
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ success: false, error: "Template not found" });
      }
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(validatedData);
      res.json({ success: true, data: template });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: "Invalid template data", details: error.errors });
      }
      res.status(500).json({ success: false, error: "Failed to create template" });
    }
  });

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const updates = req.body;
      const template = await storage.updateEmailTemplate(req.params.id, updates);
      if (!template) {
        return res.status(404).json({ success: false, error: "Template not found" });
      }
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const success = await storage.deleteEmailTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: "Template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete template" });
    }
  });

  // Email Campaigns Routes
  app.get("/api/campaigns", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const campaigns = await storage.getEmailCampaigns(userId);
      res.json({ success: true, data: campaigns });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const validatedData = insertEmailCampaignSchema.parse(req.body);
      const campaign = await storage.createEmailCampaign(validatedData);
      res.json({ success: true, data: campaign });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: "Invalid campaign data", details: error.errors });
      }
      res.status(500).json({ success: false, error: "Failed to create campaign" });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    try {
      const updates = req.body;
      const campaign = await storage.updateEmailCampaign(req.params.id, updates);
      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }
      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update campaign" });
    }
  });

  // Draft auto-save routes
  app.post("/api/drafts/save", async (req, res) => {
    try {
      const { userId, draftData } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: "User ID is required" });
      }
      
      const validatedData = emailBuilderDataSchema.parse(draftData);
      await storage.saveDraft(userId, validatedData);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: "Invalid draft data", details: error.errors });
      }
      res.status(500).json({ success: false, error: "Failed to save draft" });
    }
  });

  app.get("/api/drafts/:userId", async (req, res) => {
    try {
      const draft = await storage.getDraft(req.params.userId);
      res.json({ success: true, data: draft });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch draft" });
    }
  });

  app.delete("/api/drafts/:userId", async (req, res) => {
    try {
      await storage.deleteDraft(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete draft" });
    }
  });

  // Email HTML generation endpoint
  app.post("/api/generate-email-html", async (req, res) => {
    try {
      const { elements, subject, emailWidth = 600 } = req.body;
      
      if (!elements || !Array.isArray(elements)) {
        return res.status(400).json({ success: false, error: "Elements array is required" });
      }

      // Generate email-compatible HTML
      const htmlContent = generateEmailHTML(elements, subject, emailWidth);
      const textContent = generateTextContent(elements);
      
      res.json({ 
        success: true, 
        data: { 
          html: htmlContent, 
          text: textContent 
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to generate email HTML" });
    }
  });

  // Send email endpoint (for Resend integration)
  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, html, text, audienceId, scheduledAt } = req.body;
      
      // Create campaign record
      const campaign = await storage.createEmailCampaign({
        subject,
        htmlContent: html,
        textContent: text,
        status: scheduledAt ? 'scheduled' : 'sent',
        audienceId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        sentAt: scheduledAt ? undefined : new Date(),
        userId: req.body.userId,
      });

      // In a real implementation, this would integrate with Resend API
      // For now, we'll simulate the response
      const emailResult = {
        id: `email_${Date.now()}`,
        status: scheduledAt ? 'scheduled' : 'sent',
        scheduledAt,
        sentAt: scheduledAt ? undefined : new Date().toISOString(),
      };

      await storage.updateEmailCampaign(campaign.id, {
        status: emailResult.status as any,
        sentAt: emailResult.sentAt ? new Date(emailResult.sentAt) : undefined,
      });

      res.json({ 
        success: true, 
        data: emailResult,
        campaign: campaign
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to send email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate email-compatible HTML
function generateEmailHTML(elements: any[], subject: string, emailWidth: number): string {
  const elementsHTML = elements.map(element => generateElementHTML(element)).join('\n');
  
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    table, td { border-collapse: collapse; }
    .container { width: ${emailWidth}px !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="${emailWidth}" style="max-width: ${emailWidth}px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 0;">
              ${elementsHTML}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateElementHTML(element: any): string {
  const styles = element.styles || {};
  const properties = element.properties || {};
  
  switch (element.type) {
    case 'text':
    case 'header':
      const textAlign = styles.textAlign || 'left';
      const fontSize = styles.fontSize || '16px';
      const color = styles.color || '#000000';
      const lineHeight = styles.lineHeight || '1.6';
      const margin = styles.margin || '15px 0';
      const padding = styles.padding || '0 20px';
      
      // Convert markdown-like formatting to HTML
      let content = element.content || '';
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
      content = content.replace(/\n\n/g, '</p><p style="margin: 0 0 16px 0;">');
      content = content.replace(/\n/g, '<br>');
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: ${padding}; margin: ${margin}; text-align: ${textAlign}; font-size: ${fontSize}; color: ${color}; line-height: ${lineHeight};">
              <p style="margin: 0;">${content}</p>
            </td>
          </tr>
        </table>`;
    
    case 'button':
      const buttonText = properties.text || element.content || 'Click Here';
      const buttonUrl = properties.url || '#';
      const buttonBg = styles.backgroundColor || '#007bff';
      const buttonColor = styles.color || '#ffffff';
      const buttonPadding = styles.padding || '12px 24px';
      const buttonRadius = styles.borderRadius || '6px';
      const buttonAlign = properties.alignment || 'center';
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px; text-align: ${buttonAlign};">
              <a href="${buttonUrl}" style="display: inline-block; background-color: ${buttonBg}; color: ${buttonColor}; padding: ${buttonPadding}; border-radius: ${buttonRadius}; text-decoration: none; font-weight: bold;">${buttonText}</a>
            </td>
          </tr>
        </table>`;
    
    case 'image':
      const imageSrc = properties.src || element.content || '';
      const imageAlt = properties.alt || 'Image';
      const imageWidth = properties.width || 'auto';
      const imageHeight = properties.height || 'auto';
      const imageAlign = styles.textAlign || 'center';
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px; text-align: ${imageAlign};">
              <img src="${imageSrc}" alt="${imageAlt}" style="max-width: 100%; height: auto; width: ${imageWidth}; ${imageHeight !== 'auto' ? `height: ${imageHeight};` : ''}" />
            </td>
          </tr>
        </table>`;
    
    case 'divider':
      const dividerColor = styles.borderTop?.split(' ')[2] || styles.backgroundColor || '#e0e0e0';
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              <hr style="border: none; border-top: 1px solid ${dividerColor}; margin: 0;" />
            </td>
          </tr>
        </table>`;
    
    case 'spacer':
      const spacerHeight = element.content || styles.height || '20px';
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="height: ${spacerHeight}; line-height: ${spacerHeight};">&nbsp;</td>
          </tr>
        </table>`;
    
    case 'columns':
      const children = element.children || [];
      const leftChildren = children.filter((_: any, index: number) => index % 2 === 0);
      const rightChildren = children.filter((_: any, index: number) => index % 2 === 1);
      
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                    ${leftChildren.map(generateElementHTML).join('')}
                  </td>
                  <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                    ${rightChildren.map(generateElementHTML).join('')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
    
    case 'footer':
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px; text-align: center; font-size: 14px; color: #666666; border-top: 1px solid #e0e0e0;">
              ${element.content || 'Footer content'}
            </td>
          </tr>
        </table>`;
    
    default:
      return '';
  }
}

function generateTextContent(elements: any[]): string {
  return elements.map(element => {
    switch (element.type) {
      case 'text':
      case 'header':
        return element.content || '';
      case 'button':
        return `${element.properties?.text || element.content || 'Click Here'}: ${element.properties?.url || '#'}`;
      case 'image':
        return `[Image: ${element.properties?.alt || 'Image'}]`;
      case 'divider':
        return '---';
      case 'spacer':
        return '\n';
      case 'columns':
        const children = element.children || [];
        return children.map((child: any) => generateTextContent([child])).join('\n');
      case 'footer':
        return element.content || 'Footer content';
      default:
        return '';
    }
  }).filter(Boolean).join('\n\n');
}
