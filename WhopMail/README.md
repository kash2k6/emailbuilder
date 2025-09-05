# Email Marketing - Email Marketing Integration for Whop

Connect your Whop members to popular email marketing platforms like Mailchimp, ConvertKit, Klaviyo, ActiveCampaign, and GoHighLevel.

## Features

- 🔐 **Whop Authentication** - Secure authentication using Whop's platform
- 📧 **Multi-Platform Support** - Connect to 5 major email marketing platforms
- 🔄 **Automatic Syncing** - Sync members automatically when API keys are entered
- 💳 **Subscription Management** - 3-day free trial with seamless upgrade flow
- 🎯 **Admin-Only Access** - Designed for Whop community administrators
- 📊 **Member Analytics** - View and manage your Whop members
- 🔗 **Cross-Device Access** - Persistent storage for API keys and settings

## Subscription System

Email Marketing includes a comprehensive subscription system with:

- **3-Day Free Trial** - Start using all features immediately
- **Automatic Trial Management** - Seamless transition from trial to paid
- **Subscription Status Tracking** - Real-time subscription status updates
- **Webhook Integration** - Automatic updates when subscription status changes

### Product Details
- **Product ID**: `prod_GrJaeMp2e3DBu`
- **Plan ID**: `plan_APhjlbCx21BOA`
- **Trial Period**: 3 days
- **Billing**: Automatic after trial expiration

## Supported Email Platforms

- **Email Marketing System** - Send emails to your Whop members using our email infrastructure - no setup required
- **Mailchimp** - Audience management and automation
- **ConvertKit** - Creator-focused email marketing
- **Klaviyo** - E-commerce email marketing
- **ActiveCampaign** - Marketing automation platform
- **GoHighLevel** - All-in-one marketing platform

## Quick Start

1. **Install the App** - Add Email Marketing to your Whop experience
2. **Start Free Trial** - Begin your 3-day free trial immediately
3. **Enter Whop API Key** - Connect your Whop account
4. **Choose Email Platform** - Select your preferred email marketing platform
5. **Sync Members** - Automatically sync your Whop members

## Development

### Prerequisites
- Node.js 18+
- Whop Developer Account
- Email Platform API Keys (for testing)

### Environment Variables
```env
WHOP_CLIENT_SECRET=your_whop_client_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Local Development
```bash
npm install
npm run dev
```

### Production Deployment
```bash
npm run build
npm start
```

## API Endpoints

- `/api/whop/install` - App installation handler
- `/api/whop/uninstall` - App uninstallation handler
- `/api/whop/subscription` - Subscription management
- `/api/webhook/subscription` - Subscription webhook handler
- `/api/sync` - Member synchronization

## Architecture

- **Frontend**: Next.js 14 with TypeScript
- **UI**: Shadcn/ui components with Tailwind CSS
- **Authentication**: Whop SDK integration
- **Storage**: Supabase with local fallback
- **Deployment**: Vercel

## License

This project is proprietary software for Whop platform integration.
