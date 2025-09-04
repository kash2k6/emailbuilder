import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const emailElements = pgTable("email_elements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull().$type<'text' | 'button' | 'image' | 'divider' | 'spacer' | 'footer' | 'header' | 'columns' | 'social'>(),
  content: text("content").notNull().default(''),
  styles: jsonb("styles").notNull().default({}),
  properties: jsonb("properties").notNull().default({}),
  parentId: varchar("parent_id").references(() => emailElements.id),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default('general'),
  subject: text("subject").notNull().default(''),
  elements: jsonb("elements").notNull().default([]),
  isPublic: text("is_public").notNull().default('false').$type<'true' | 'false'>(),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  status: text("status").notNull().default('draft').$type<'draft' | 'scheduled' | 'sent' | 'failed'>(),
  audienceId: varchar("audience_id"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const emailElementSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'button', 'image', 'divider', 'spacer', 'footer', 'header', 'columns', 'social']),
  content: z.string().default(''),
  styles: z.record(z.string()).default({}),
  properties: z.record(z.any()).default({}),
  children: z.array(z.lazy(() => emailElementSchema)).optional(),
  parentId: z.string().optional(),
  position: z.number().default(0),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const emailBuilderDataSchema = z.object({
  subject: z.string(),
  elements: z.array(emailElementSchema),
  emailWidth: z.number().default(600),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type EmailElement = z.infer<typeof emailElementSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailBuilderData = z.infer<typeof emailBuilderDataSchema>;
