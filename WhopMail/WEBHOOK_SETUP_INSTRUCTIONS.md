# Webhook Setup Instructions

## Overview
This system allows users to receive email engagement events (opens, clicks, deliveries, bounces) from their email campaigns via webhooks. Users can configure their own webhook URLs to receive these events in real-time.

## How It Works

1. **Resend Webhook** → Receives email events from Resend
2. **Event Processing** → Maps events to users based on email campaigns
3. **User Webhook Forwarding** → Sends filtered events to each user's webhook URL
4. **User Configuration** → Users set their own webhook URL for receiving events

## Setup Steps

### 1. Configure Resend Webhook
In your Resend dashboard, set the webhook URL to:
```
https://www.whopmail.com/api/webhooks/resend
```

This endpoint will receive all email engagement events from Resend.

### 2. User Webhook Configuration
Users can configure their webhook settings in the "Webhook Settings" tab:

- **Webhook URL**: Their endpoint to receive events
- **Event Types**: Which events they want to receive (opens, clicks, deliveries, etc.)
- **Secret Key**: Optional HMAC signature for webhook verification

### 3. Event Flow
1. User sends email campaign via Resend
2. Resend sends engagement events to our webhook endpoint
3. We process events and find which user they belong to
4. We forward events to that user's configured webhook URL

## Event Types Available

- `email.opened` - When a recipient opens an email
- `email.clicked` - When a recipient clicks a link in an email
- `email.delivered` - When an email is successfully delivered
- `email.bounced` - When an email bounces back
- `email.complained` - When a recipient marks email as spam
- `email.unsubscribed` - When a recipient unsubscribes

## Event Data Structure

Each webhook event sent to users includes:

```json
{
  "event_type": "email.opened",
  "timestamp": "2024-01-03T10:30:00Z",
  "email": "user@example.com",
  "email_id": "resend_email_id",
  "data": {
    // Full Resend event data
  },
  "source": "resend",
  "webhook_id": "user_webhook_id"
}
```

## Security Features

- **HMAC Signatures**: Optional secret key for webhook verification
- **User Isolation**: Users only receive events for their own campaigns
- **Rate Limiting**: Built-in protection against abuse
- **Retry Logic**: Failed webhook deliveries are retried

## Database Schema

### `user_webhooks` Table
Stores user webhook configurations:
- `whop_user_id` - Links to user
- `webhook_url` - User's webhook endpoint
- `events` - Array of event types to receive
- `secret_key` - Optional HMAC secret
- `is_active` - Whether webhook is active

### `webhook_events` Table
Tracks all webhook deliveries:
- `user_webhook_id` - Links to user webhook
- `event_type` - Type of event
- `status` - Delivery status (pending, sent, failed)
- `retry_count` - Number of retry attempts

## Testing

1. **Create a test webhook** in the user interface
2. **Send a test email** campaign
3. **Check your webhook endpoint** for incoming events
4. **Verify event data** matches expected format

## Troubleshooting

### Common Issues:
- **Webhook not receiving events**: Check if webhook is active and URL is correct
- **Events not matching**: Verify event types are selected correctly
- **Authentication errors**: Check secret key configuration
- **Delivery failures**: Check webhook endpoint availability and response codes

### Monitoring:
- Check webhook status badges in the UI
- Review last success/failure timestamps
- Monitor retry counts for failed deliveries

## API Endpoints

- `POST /api/webhooks/resend` - Receives Resend webhooks
- `GET /api/user-webhooks` - Get user's webhook configurations
- `POST /api/user-webhooks` - Create new webhook configuration

## Future Enhancements

- **Webhook Analytics**: Success rates, delivery times, etc.
- **Event Filtering**: More granular control over which events to receive
- **Webhook Templates**: Pre-configured webhook setups for common use cases
- **Real-time Monitoring**: Live webhook delivery status
