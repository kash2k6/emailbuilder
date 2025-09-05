# Resend Webhook Setup Guide

## Overview
This guide explains how to set up Resend webhooks to track email delivery events in real-time for your EmailSync SaaS platform.

## Webhook URL
Your webhook endpoint is: `https://v0-whop-em-ail-with-make-dimeqb5lv-kash2k6s-projects.vercel.app/api/webhook/resend`

## Webhook Secret
Your webhook secret is: `whsec_w7DUCTDPrCyD6+dx3PJLlX8zfIzFJWR2`

**Important**: This secret is used to verify that webhook requests are actually coming from Resend. Keep this secret secure and never expose it in client-side code.

## Events Tracked
The webhook system tracks the following email events:
- `delivered` - Email successfully delivered
- `opened` - Email opened by recipient
- `clicked` - Link clicked in email
- `bounced` - Email bounced back
- `complained` - Recipient marked as spam
- `failed` - Email failed to send

## Setting Up in Resend Dashboard

### 1. Access Resend Dashboard
1. Log in to your Resend account
2. Go to Settings → Webhooks

### 2. Create Webhook
1. Click "Add Webhook"
2. Enter the webhook URL: `https://your-domain.com/api/webhook/resend`
3. Select the following events:
   - ✅ Email Events
   - ✅ Broadcast Events
4. Click "Create Webhook"

### 3. Test Webhook
1. Send a test email
2. Check your webhook logs in Resend dashboard
3. Verify events are being received in your application logs

## Database Schema
The webhook system updates the following fields in the `broadcast_jobs` table:
- `success_count` - Number of delivered emails
- `error_count` - Number of bounced emails
- `opened_count` - Number of opened emails
- `clicked_count` - Number of clicked emails
- `complained_count` - Number of spam complaints
- `failed_count` - Number of failed emails
- `last_event` - Most recent event type
- `last_event_at` - Timestamp of most recent event

## Real-Time Analytics
Once webhooks are set up, your analytics will show:
- Real-time delivery statistics
- Accurate open and click rates
- Bounce and complaint tracking
- No need to redirect users to Resend dashboard

## Troubleshooting

### Webhook Not Receiving Events
1. Check webhook URL is correct
2. Verify webhook is active in Resend dashboard
3. Check application logs for errors
4. Ensure your domain is accessible

### Events Not Updating Database
1. Check database connection
2. Verify broadcast exists in database
3. Check webhook handler logs
4. Ensure database migration has been applied

### Missing Statistics
1. Verify webhook events are being sent
2. Check if broadcast has `resend_broadcast_id` set
3. Review webhook payload structure
4. Check database triggers are working

## Environment Variables
Add this to your environment variables:
```bash
RESEND_WEBHOOK_SECRET=whsec_w7DUCTDPrCyD6+dx3PJLlX8zfIzFJWR2
```

## Security
- Webhook endpoint validates Resend signature using HMAC SHA256
- Only processes events from verified Resend account
- Rate limiting prevents abuse
- Error handling prevents data corruption
- Signature verification prevents webhook spoofing
