# EmailSync Supabase Database Schema Design

## Overview
This schema supports a multi-tenant email marketing SaaS platform within Whop, allowing users to send emails to their Whop members using either whopmail.com or custom domains.

## Core Tables

### 1. `email_platform_configs` - Main Configuration Table
```sql
CREATE TABLE email_platform_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whop_user_id TEXT NOT NULL UNIQUE, -- Whop user identifier
  platform_type TEXT NOT NULL CHECK (platform_type IN ('resend', 'mailchimp', 'klaviyo', 'convertkit', 'activecampaign', 'gohighlevel')),
  
  -- Email Configuration
  email_type TEXT NOT NULL CHECK (email_type IN ('whopmail', 'custom')),
  username TEXT, -- For whopmail.com addresses
  custom_domain TEXT, -- For custom domain addresses
  from_email TEXT NOT NULL, -- Computed email address
  
  -- Platform-specific data
  api_key TEXT, -- Encrypted API key
  list_id TEXT, -- Audience/list identifier
  dc TEXT, -- Data center (for some platforms)
  api_url TEXT, -- Custom API URL
  
  -- Domain Management (for Resend)
  domain_id TEXT, -- Resend domain ID
  domain_status TEXT DEFAULT 'pending' CHECK (domain_status IN ('pending', 'verified', 'failed')),
  domain_verification_dns JSONB, -- DNS records for verification
  
  -- Metadata
  custom_fields JSONB, -- Platform-specific custom fields
  tags TEXT[], -- Tags for organization
  segments TEXT[], -- Audience segments
  automation_triggers TEXT[], -- Automation triggers
  
  -- Status and tracking
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'completed', 'failed')),
  sync_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_email_platform_configs_whop_user_id ON email_platform_configs(whop_user_id);
CREATE INDEX idx_email_platform_configs_platform_type ON email_platform_configs(platform_type);
CREATE INDEX idx_email_platform_configs_is_active ON email_platform_configs(is_active);
```

### 2. `email_audiences` - Email Lists/Audiences
```sql
CREATE TABLE email_audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES email_platform_configs(id) ON DELETE CASCADE,
  
  -- Audience details
  audience_id TEXT NOT NULL, -- Platform-specific audience ID
  name TEXT NOT NULL,
  description TEXT,
  
  -- Member tracking
  member_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  
  -- Platform metadata
  platform_audience_data JSONB, -- Raw platform response data
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_audiences_config_id ON email_audiences(config_id);
CREATE INDEX idx_email_audiences_audience_id ON email_audiences(audience_id);
```

### 3. `email_contacts` - Contact/Member Data
```sql
CREATE TABLE email_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audience_id UUID REFERENCES email_audiences(id) ON DELETE CASCADE,
  
  -- Contact identification
  email TEXT NOT NULL,
  whop_member_id TEXT, -- Whop membership ID
  platform_contact_id TEXT, -- Platform-specific contact ID
  
  -- Contact details
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  
  -- Status
  is_subscribed BOOLEAN DEFAULT true,
  is_unsubscribed BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  
  -- Platform data
  platform_contact_data JSONB, -- Raw platform response data
  custom_fields JSONB, -- Custom fields from platform
  
  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  sync_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_contacts_audience_id ON email_contacts(audience_id);
CREATE INDEX idx_email_contacts_email ON email_contacts(email);
CREATE INDEX idx_email_contacts_whop_member_id ON email_contacts(whop_member_id);
CREATE INDEX idx_email_contacts_is_subscribed ON email_contacts(is_subscribed);
CREATE UNIQUE INDEX idx_email_contacts_audience_email ON email_contacts(audience_id, email);
```

### 4. `email_campaigns` - Email Campaigns/Broadcasts
```sql
CREATE TABLE email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES email_platform_configs(id) ON DELETE CASCADE,
  audience_id UUID REFERENCES email_audiences(id) ON DELETE CASCADE,
  
  -- Campaign details
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML content
  text_content TEXT, -- Plain text version
  
  -- Platform data
  platform_campaign_id TEXT, -- Platform-specific campaign ID
  platform_broadcast_id TEXT, -- For Resend broadcasts
  
  -- Status and tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Analytics
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  
  -- Platform metadata
  platform_campaign_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_campaigns_config_id ON email_campaigns(config_id);
CREATE INDEX idx_email_campaigns_audience_id ON email_campaigns(audience_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled_at ON email_campaigns(scheduled_at);
```

### 5. `email_sends` - Individual Email Sends
```sql
CREATE TABLE email_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES email_contacts(id) ON DELETE CASCADE,
  
  -- Send details
  platform_send_id TEXT, -- Platform-specific send ID
  message_id TEXT, -- Platform message ID
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error_message TEXT,
  bounce_reason TEXT,
  
  -- Platform data
  platform_send_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_sends_campaign_id ON email_sends(campaign_id);
CREATE INDEX idx_email_sends_contact_id ON email_sends(contact_id);
CREATE INDEX idx_email_sends_status ON email_sends(status);
CREATE INDEX idx_email_sends_sent_at ON email_sends(sent_at);
```

### 6. `email_domains` - Domain Management
```sql
CREATE TABLE email_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES email_platform_configs(id) ON DELETE CASCADE,
  
  -- Domain details
  domain TEXT NOT NULL,
  platform_domain_id TEXT, -- Platform-specific domain ID
  
  -- Verification
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  verification_dns JSONB, -- DNS records for verification
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Costs and limits
  monthly_cost DECIMAL(10,2) DEFAULT 0,
  daily_send_limit INTEGER,
  
  -- Platform data
  platform_domain_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_domains_config_id ON email_domains(config_id);
CREATE INDEX idx_email_domains_domain ON email_domains(domain);
CREATE INDEX idx_email_domains_status ON email_domains(status);
```

### 7. `email_sync_logs` - Sync History
```sql
CREATE TABLE email_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES email_platform_configs(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('contacts', 'audiences', 'campaigns', 'domains')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  
  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Performance
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_sync_logs_config_id ON email_sync_logs(config_id);
CREATE INDEX idx_email_sync_logs_sync_type ON email_sync_logs(sync_type);
CREATE INDEX idx_email_sync_logs_status ON email_sync_logs(status);
CREATE INDEX idx_email_sync_logs_started_at ON email_sync_logs(started_at);
```

## Row Level Security (RLS) Policies

### Enable RLS on all tables
```sql
ALTER TABLE email_platform_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_logs ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
-- Users can only access their own data
CREATE POLICY "Users can view own configs" ON email_platform_configs
  FOR SELECT USING (whop_user_id = current_setting('app.whop_user_id')::text);

CREATE POLICY "Users can insert own configs" ON email_platform_configs
  FOR INSERT WITH CHECK (whop_user_id = current_setting('app.whop_user_id')::text);

CREATE POLICY "Users can update own configs" ON email_platform_configs
  FOR UPDATE USING (whop_user_id = current_setting('app.whop_user_id')::text);

-- Similar policies for other tables...
```

## Functions and Triggers

### Update timestamp trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_email_platform_configs_updated_at 
  BEFORE UPDATE ON email_platform_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repeat for other tables...
```

### Compute from_email function
```sql
CREATE OR REPLACE FUNCTION compute_from_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_type = 'whopmail' AND NEW.username IS NOT NULL THEN
    NEW.from_email := NEW.username || '@whopmail.com';
  ELSIF NEW.email_type = 'custom' AND NEW.custom_domain IS NOT NULL THEN
    NEW.from_email := 'noreply@' || NEW.custom_domain;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER compute_from_email_trigger
  BEFORE INSERT OR UPDATE ON email_platform_configs
  FOR EACH ROW EXECUTE FUNCTION compute_from_email();
```

## Best Practices Implemented

### 1. **Multi-tenancy**
- `whop_user_id` as the primary tenant identifier
- Row Level Security (RLS) policies for data isolation
- Indexes on tenant-specific columns

### 2. **Data Integrity**
- Foreign key constraints with CASCADE deletes
- CHECK constraints for enum values
- Unique constraints where appropriate
- NOT NULL constraints on required fields

### 3. **Performance**
- Strategic indexes on frequently queried columns
- Composite indexes for common query patterns
- JSONB for flexible platform-specific data

### 4. **Audit Trail**
- `created_at` and `updated_at` timestamps on all tables
- Sync logs for tracking operations
- Error tracking and status fields

### 5. **Scalability**
- UUID primary keys for distributed systems
- JSONB for flexible schema evolution
- Separate tables for different concerns

### 6. **Security**
- Encrypted API keys (implement encryption in application layer)
- RLS policies for data isolation
- No sensitive data in logs

## Usage Examples

### Create a new email configuration
```sql
INSERT INTO email_platform_configs (
  whop_user_id,
  platform_type,
  email_type,
  username,
  api_key,
  list_id
) VALUES (
  'user_123',
  'resend',
  'whopmail',
  'mybusiness',
  'encrypted_api_key_here',
  'whop-mybusiness-main-list'
);
```

### Get user's email campaigns with analytics
```sql
SELECT 
  ec.name,
  ec.subject,
  ec.status,
  ec.total_recipients,
  ec.delivered_count,
  ec.opened_count,
  ec.clicked_count,
  ea.name as audience_name
FROM email_campaigns ec
JOIN email_audiences ea ON ec.audience_id = ea.id
JOIN email_platform_configs epc ON ec.config_id = epc.id
WHERE epc.whop_user_id = 'user_123'
ORDER BY ec.created_at DESC;
```

This schema provides a solid foundation for the EmailSync SaaS platform with proper multi-tenancy, performance, and scalability considerations. 