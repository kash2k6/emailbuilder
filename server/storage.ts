import { type User, type InsertUser, type EmailTemplate, type InsertEmailTemplate, type EmailCampaign, type InsertEmailCampaign, type EmailElement } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Email Templates
  getEmailTemplates(userId?: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<boolean>;
  
  // Email Campaigns
  getEmailCampaigns(userId?: string): Promise<EmailCampaign[]>;
  getEmailCampaign(id: string): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign | undefined>;
  
  // Auto-save drafts
  saveDraft(userId: string, draftData: any): Promise<void>;
  getDraft(userId: string): Promise<any>;
  deleteDraft(userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private emailTemplates: Map<string, EmailTemplate>;
  private emailCampaigns: Map<string, EmailCampaign>;
  private drafts: Map<string, any>;

  constructor() {
    this.users = new Map();
    this.emailTemplates = new Map();
    this.emailCampaigns = new Map();
    this.drafts = new Map();
    
    // Initialize with some default templates
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'template-1',
        name: 'Newsletter Template',
        description: 'Clean newsletter template with header, content sections, and footer',
        category: 'newsletter',
        subject: 'Monthly Newsletter - {{month}} {{year}}',
        elements: [
          {
            id: 'header-1',
            type: 'header',
            content: 'Your Company Newsletter',
            styles: {
              backgroundColor: 'hsl(221.2 83.2% 53.3%)',
              color: 'hsl(210 40% 98%)',
              padding: '24px',
              textAlign: 'center',
              fontSize: '24px',
              fontWeight: 'bold'
            },
            properties: {},
            position: 0
          },
          {
            id: 'text-1',
            type: 'text',
            content: 'Welcome to our monthly newsletter! Here are the latest updates and insights.',
            styles: {
              fontSize: '16px',
              lineHeight: '1.6',
              color: 'hsl(222.2 84% 4.9%)',
              margin: '20px 0'
            },
            properties: {},
            position: 1
          },
          {
            id: 'button-1',
            type: 'button',
            content: 'Read More',
            styles: {
              backgroundColor: 'hsl(221.2 83.2% 53.3%)',
              color: 'hsl(210 40% 98%)',
              padding: '12px 24px',
              borderRadius: '8px',
              textAlign: 'center',
              margin: '20px 0'
            },
            properties: {
              url: '#',
              alignment: 'center'
            },
            position: 2
          }
        ],
        isPublic: 'true',
        userId: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'template-2',
        name: 'Promotional Template',
        description: 'Eye-catching promotional email with call-to-action',
        category: 'promotion',
        subject: 'Special Offer - Limited Time!',
        elements: [
          {
            id: 'header-2',
            type: 'header',
            content: 'Special Offer!',
            styles: {
              background: 'linear-gradient(135deg, hsl(159.7826 100% 36.0784%), hsl(221.2 83.2% 53.3%))',
              color: 'hsl(210 40% 98%)',
              padding: '32px',
              textAlign: 'center',
              fontSize: '28px',
              fontWeight: 'bold'
            },
            properties: {},
            position: 0
          },
          {
            id: 'text-2',
            type: 'text',
            content: 'Get **50% off** on all premium plans. Limited time offer - expires soon!',
            styles: {
              fontSize: '18px',
              lineHeight: '1.6',
              color: 'hsl(222.2 84% 4.9%)',
              margin: '24px 0',
              textAlign: 'center'
            },
            properties: {},
            position: 1
          },
          {
            id: 'button-2',
            type: 'button',
            content: 'Claim Offer Now',
            styles: {
              backgroundColor: 'hsl(0 84.2% 60.2%)',
              color: 'hsl(210 40% 98%)',
              padding: '16px 32px',
              borderRadius: '8px',
              textAlign: 'center',
              margin: '24px 0',
              fontSize: '18px',
              fontWeight: 'bold'
            },
            properties: {
              url: '#',
              alignment: 'center'
            },
            position: 2
          }
        ],
        isPublic: 'true',
        userId: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultTemplates.forEach(template => {
      this.emailTemplates.set(template.id, template);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getEmailTemplates(userId?: string): Promise<EmailTemplate[]> {
    const templates = Array.from(this.emailTemplates.values());
    if (userId) {
      return templates.filter(t => t.userId === userId || t.isPublic === 'true');
    }
    return templates.filter(t => t.isPublic === 'true');
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    return this.emailTemplates.get(id);
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = randomUUID();
    const now = new Date();
    const newTemplate: EmailTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.emailTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const template = this.emailTemplates.get(id);
    if (!template) return undefined;

    const updatedTemplate: EmailTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };
    this.emailTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteEmailTemplate(id: string): Promise<boolean> {
    return this.emailTemplates.delete(id);
  }

  async getEmailCampaigns(userId?: string): Promise<EmailCampaign[]> {
    const campaigns = Array.from(this.emailCampaigns.values());
    if (userId) {
      return campaigns.filter(c => c.userId === userId);
    }
    return campaigns;
  }

  async getEmailCampaign(id: string): Promise<EmailCampaign | undefined> {
    return this.emailCampaigns.get(id);
  }

  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const id = randomUUID();
    const now = new Date();
    const newCampaign: EmailCampaign = {
      ...campaign,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.emailCampaigns.set(id, newCampaign);
    return newCampaign;
  }

  async updateEmailCampaign(id: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign | undefined> {
    const campaign = this.emailCampaigns.get(id);
    if (!campaign) return undefined;

    const updatedCampaign: EmailCampaign = {
      ...campaign,
      ...updates,
      updatedAt: new Date(),
    };
    this.emailCampaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }

  async saveDraft(userId: string, draftData: any): Promise<void> {
    this.drafts.set(userId, {
      ...draftData,
      timestamp: new Date().toISOString(),
    });
  }

  async getDraft(userId: string): Promise<any> {
    return this.drafts.get(userId);
  }

  async deleteDraft(userId: string): Promise<void> {
    this.drafts.delete(userId);
  }
}

export const storage = new MemStorage();
