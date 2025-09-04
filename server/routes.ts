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
      const { elements, subject, emailWidth = 600, emailBackground } = req.body;
      
      if (!elements || !Array.isArray(elements)) {
        return res.status(400).json({ success: false, error: "Elements array is required" });
      }

      // Generate email-compatible HTML using the imported function
      const { generateEmailHTML } = await import('../client/src/lib/email-html-generator.js');
      const { html: htmlContent, text: textContent } = generateEmailHTML(elements, subject, { 
        emailWidth, 
        emailBackground 
      });
      
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
