# Environment Configuration

This document outlines the environment variables required for the EmailSync platform.

## Required Environment Variables

### Database Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Whop Configuration
```bash
WHOP_APP_ID=your_whop_app_id
WHOP_API_KEY=your_whop_api_key
```

### Email Service Configuration
```bash
RESEND_API_KEY=your_resend_api_key
```

### Domain Health API Configuration
```bash
ABSTRACT_API_KEY=your_domain_health_api_key
```

## Domain Health API Setup

The domain health feature uses our 3rd party partner's Email Reputation service to check domain deliverability and reputation.

### Getting Your Domain Health API Key

1. **Contact** our support team for API access
2. **Receive** your API key credentials
3. **Add** it to your environment variables as `ABSTRACT_API_KEY`

### API Key Usage

- **Rate Limits**: 1 request per week per domain (cached for 7 days)
- **Features**: Email deliverability, reputation scoring, breach detection

### Default API Key

If no `ABSTRACT_API_KEY` is provided, the system will use a default key: `10f36e0e9caa43bd91259adb4ea3ab85`

**Note**: For production use, it's recommended to use your own API key to avoid rate limiting and ensure reliable service.

## Vercel Deployment

When deploying to Vercel, add these environment variables in your Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable with the appropriate value
4. Redeploy your application

## Local Development

Create a `.env.local` file in your project root with the required variables:

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Whop
WHOP_APP_ID=your_whop_app_id
WHOP_API_KEY=your_whop_api_key

# Email Services
RESEND_API_KEY=your_resend_api_key

# Domain Health API
ABSTRACT_API_KEY=your_domain_health_api_key
```

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- Rotate API keys regularly
- Monitor API usage to avoid rate limits 