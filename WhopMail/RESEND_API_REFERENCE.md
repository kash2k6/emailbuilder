# Resend API Reference for EmailSync Implementation

## Base Information
- **Base URL**: `https://api.resend.com`
- **Authentication**: `Authorization: Bearer re_xxxxxxxxx`
- **Rate Limit**: 2 requests per second (default, can be increased)
- **HTTPS Required**: Yes, no HTTP support

## Important Notes
- Using Resend's domain will incur costs
- Custom domains are recommended for better mail delivery
- All requests must use HTTPS

## API Endpoints by Category

### 1. Introduction & General
- [Introduction](https://resend.com/docs/api-reference/introduction)
- [Errors](https://resend.com/docs/api-reference/errors)
- [Rate Limit](https://resend.com/docs/api-reference/rate-limit)

### 2. Email Operations
- [Send Email](https://resend.com/docs/api-reference/emails/send-email)
- [Send Batch Emails](https://resend.com/docs/api-reference/emails/send-batch-emails)
- [Retrieve Email](https://resend.com/docs/api-reference/emails/retrieve-email)
- [Update Email](https://resend.com/docs/api-reference/emails/update-email)
- [Cancel Email](https://resend.com/docs/api-reference/emails/cancel-email)

### 3. Domain Management
- [Create Domain](https://resend.com/docs/api-reference/domains/create-domain)
- [Get Domain](https://resend.com/docs/api-reference/domains/get-domain)
- [Verify Domain](https://resend.com/docs/api-reference/domains/verify-domain)
- [Update Domain](https://resend.com/docs/api-reference/domains/update-domain)
- [List Domains](https://resend.com/docs/api-reference/domains/list-domains)
- [Delete Domain](https://resend.com/docs/api-reference/domains/delete-domain)

### 4. API Key Management
- [Create API Key](https://resend.com/docs/api-reference/api-keys/create-api-key)
- [List API Keys](https://resend.com/docs/api-reference/api-keys/list-api-keys)
- [Delete API Key](https://resend.com/docs/api-reference/api-keys/delete-api-key)

### 5. Broadcast Management
- [Create Broadcast](https://resend.com/docs/api-reference/broadcasts/create-broadcast)
- [Get Broadcast](https://resend.com/docs/api-reference/broadcasts/get-broadcast)
- [Update Broadcast](https://resend.com/docs/api-reference/broadcasts/update-broadcast)
- [Send Broadcast](https://resend.com/docs/api-reference/broadcasts/send-broadcast)
- [Delete Broadcast](https://resend.com/docs/api-reference/broadcasts/delete-broadcast)
- [List Broadcasts](https://resend.com/docs/api-reference/broadcasts/list-broadcasts)

### 6. Audience Management
- [Create Audience](https://resend.com/docs/api-reference/audiences/create-audience)
- [Get Audience](https://resend.com/docs/api-reference/audiences/get-audience)
- [Delete Audience](https://resend.com/docs/api-reference/audiences/delete-audience)
- [List Audiences](https://resend.com/docs/api-reference/audiences/list-audiences)

### 7. Contact Management
- [Create Contact](https://resend.com/docs/api-reference/contacts/create-contact)
- [Get Contact](https://resend.com/docs/api-reference/contacts/get-contact)
- [Update Contact](https://resend.com/docs/api-reference/contacts/update-contact)
- [Delete Contact](https://resend.com/docs/api-reference/contacts/delete-contact)
- [List Contacts](https://resend.com/docs/api-reference/contacts/list-contacts)

## Key Considerations for EmailSync Implementation

### Domain Strategy
- **Whopmail.com**: Use Resend's domain (costs apply)
- **Custom Domains**: Recommended for better delivery, requires domain verification
- **Domain Verification**: Required for custom domains before sending

### Rate Limiting
- Default: 2 requests/second
- Can request increase for trusted senders
- Implement queue mechanism for batch operations

### Error Handling
- Standard HTTP status codes (200, 400, 401, 403, 404, 429, 5xx)
- Comprehensive error messages for troubleshooting
- Idempotency support for email sending

### Authentication
- API keys with Bearer token format
- Full access vs sending-only access levels
- Key management through API

## Database Schema Considerations

Based on these endpoints, we'll need to store:

1. **User Email Configurations**
   - Email type (whopmail vs custom domain)
   - Username (for whopmail.com)
   - Custom domain (if applicable)
   - Domain verification status

2. **Email Lists/Audiences**
   - Audience IDs and names
   - Member counts
   - Creation dates

3. **Contact Data**
   - Member email addresses
   - Contact metadata
   - Subscription status

4. **Email Campaigns**
   - Broadcast information
   - Send history
   - Delivery status

5. **Domain Management**
   - Domain verification status
   - DNS records
   - Domain costs

Ready for the next API endpoint information! 