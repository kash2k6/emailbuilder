# 🚀 Webhook Automation System Setup

## Overview
This system automatically adds new Whop members to your email list when they join your product. It uses webhooks to detect new members and processes them in real-time.

## 🔄 How It Works

### 1. Webhook Flow
```
New Member Joins → Whop Sends Webhook → Our System Processes → Member Added to Email List
```

### 2. Detailed Process
1. **Member joins your Whop product**
2. **Whop sends `membership.went_valid` webhook** to our main endpoint
3. **Our system extracts member details** using Whop API v5
4. **Finds the company owner** (who owns the email list)
5. **Adds member to "All Members" audience** in our database
6. **Optionally syncs to Resend** if configured
7. **Triggers welcome email** if enabled

## 🏗️ Architecture

### Webhook Flow
```
Whop → https://www.whopmail.com/api/webhook → Internal Processing → Supabase Edge Function
```

### Why This Design?
- **Single webhook URL** for users to configure
- **Centralized processing** of all webhook events
- **Automatic routing** to appropriate internal services
- **Scalable architecture** that can handle multiple event types

## 📋 Webhook Event Structure

### All Supported Event Types

Our webhook system handles **ALL** Whop events automatically. Here are the main categories:

#### 🎉 **Membership Events**
- **`membership.went_valid`** - New member joins your product
- **`membership.went_invalid`** - Member leaves or subscription expires
- **`membership.metadata_updated`** - Member profile or settings updated
- **`membership.cancel_at_period_end_changed`** - Cancellation status changes
- **`membership.experience_claimed`** - Member claims a perk or experience

#### 💰 **Payment Events**
- **`payment.succeeded`** - Payment completed successfully
- **`payment.failed`** - Payment failed or declined
- **`payment.pending`** - Payment is being processed
- **`payment.affiliate_reward_created`** - Affiliate commission earned

#### 💸 **Refund Events**
- **`refund.created`** - Refund initiated
- **`refund.updated`** - Refund status changed

#### ⚠️ **Dispute Events**
- **`dispute.created`** - Customer dispute filed
- **`dispute.updated`** - Dispute status changed
- **`dispute.alert_created`** - Dispute alert notification

#### ⚖️ **Resolution Events**
- **`resolution.created`** - Dispute resolution process started
- **`resolution.updated`** - Resolution status changed
- **`resolution.decided`** - Resolution finalized

### Example Event Payload

Here's a sample `membership.went_valid` event:

```json
{
  "action": "membership.went_valid",
  "api_version": "v5",
  "data": {
    "id": "mem_5l6nvhob7ALjRT",
    "product_id": "pass_m11FQfj0mJV3p",
    "user_id": "user_q61ixyl8cVGff",
    "plan_id": "plan_nJUM2MyD9lX0Q",
    "page_id": "biz_HXJbuEEjEr8YMv",  // This is your company ID
    "created_at": 1675816599,
    "status": "completed",
    "valid": true,
    "license_key": "U-A09280-647203B0-2C0A9EW"
  }
}
```

## 🎯 Automation Features

### ✅ What Happens Automatically
- **New members are added** to your "All Members" email list
- **Member details are extracted** (name, email, username)
- **Audience counts are updated** in real-time
- **Members are categorized** by status (active, trial, etc.)

### ⚙️ Configurable Options
- **Auto-add new members**: On/Off
- **Auto-send welcome email**: On/Off
- **Auto-sync to Resend**: On/Off
- **Auto-categorize members**: On/Off

## 📊 Database Tables Used

### 1. `email_platform_configs`
- Stores your email platform settings
- Links to your Whop user ID

### 2. `email_audiences`
- Contains your email lists/audiences
- "All Members" audience is created automatically

### 3. `email_contacts`
- Stores individual member information
- Links to Whop member IDs for tracking

## 🔍 Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Events
- Check webhook URL in Whop dashboard: `https://www.whopmail.com/api/webhook`
- Verify webhook is active
- Check that `membership.went_valid` event is selected

#### 2. Member Not Added to List
- Verify your email platform is configured
- Check if company owner lookup succeeds
- Verify email platform config exists

### Debug Logs
The system provides detailed logging for troubleshooting:
```
🔍 Looking up company owner for company: biz_HXJbuEEjEr8YMv
✅ Found company owner: user_owner123
🔍 Fetching member details for member: mem_5l6nvhob7ALjRT
✅ Member details fetched: jane@example.com
📧 Adding member jane@example.com to email list for user: user_owner123
✅ Member added to email list successfully
```

## 🚀 Getting Started

### 1. Configure Webhook in Whop
1. Go to your Whop dashboard
2. Navigate to **Settings** → **Webhooks**
3. Add new webhook with:
   - **URL**: `https://www.whopmail.com/api/webhook`
   - **Events**: Select `membership.went_valid`
   - **Status**: Active

### 2. Configure Automation Settings
1. Go to your EmailSync dashboard
2. Navigate to **Automation** → **Webhook Settings**
3. Configure your automation preferences
4. Save your settings

### 3. Test the System
1. Have someone join your Whop product
2. Check that they appear in your email list
3. Verify the member count updates
4. Check logs if issues occur

---

**Note**: This system is designed to work seamlessly with your existing email infrastructure. New members will automatically appear in your email lists and can be used in campaigns, automations, and other email marketing activities.
