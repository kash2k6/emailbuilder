# Deployment Checklist for Whop App

Use this checklist to ensure your Email Bridge Whop app is properly configured and deployed.

## Pre-Deployment Checklist

### ✅ Environment Variables
- [ ] `WHOP_API_KEY` - Your Whop API key from developer dashboard (required for production)
- [ ] `WHOP_WEBHOOK_SECRET` - Webhook secret for signature verification (optional for development)
- [ ] Email platform API keys (optional - users provide their own in the app)

### ✅ Whop Developer Dashboard Setup
- [ ] Created a new app in Whop developer dashboard
- [ ] Set app name: "Email Bridge"
- [ ] Set app description
- [ ] Uploaded app icon (512x512 PNG)
- [ ] Configured permissions: `memberships:read`, `products:read`, `users:read`, `companies:read`

### ✅ Webhook Configuration
- [ ] Set webhook URL: `https://your-domain.vercel.app/api/webhook`
- [ ] Added webhook events:
  - [ ] `membership.went_valid`
  - [ ] `membership.went_invalid`
  - [ ] `membership.created`
  - [ ] `membership.updated`
- [ ] Copied webhook secret to environment variables

### ✅ App URLs Configuration
- [ ] Install URL: `https://your-domain.vercel.app/api/whop/install`
- [ ] Uninstall URL: `https://your-domain.vercel.app/api/whop/uninstall`
- [ ] Experience URL: `https://your-domain.vercel.app/experiences/[experienceId]`

## Deployment Steps

### 1. Deploy to Vercel
- [ ] Fork/clone this repository
- [ ] Connect to Vercel
- [ ] Add environment variables in Vercel dashboard (optional for development)
- [ ] Deploy the app
- [ ] Verify deployment is successful

### 2. Test the Deployment
- [ ] Visit your deployed app URL
- [ ] Check that the homepage loads
- [ ] Test the experience page with a dev token
- [ ] Run the test script: `npm run test:whop`

### 3. Test Whop Integration
- [ ] Install your app in Whop (test mode)
- [ ] Verify install webhook is received
- [ ] Check that the experience loads correctly
- [ ] Test with a real membership event

### 4. Email Platform Setup
- [ ] Users will provide their own email platform API keys
- [ ] Test the email platform integration in the dashboard
- [ ] Verify member sync works correctly

## Post-Deployment Verification

### ✅ Functionality Tests
- [ ] App installs correctly in Whop
- [ ] Experience page loads with Whop context
- [ ] Email platform configuration works
- [ ] Webhook events are processed
- [ ] Member sync works correctly

### ✅ Security Tests
- [ ] Webhook signature verification works
- [ ] API keys are properly secured
- [ ] Authentication flow works correctly

### ✅ Error Handling
- [ ] Invalid API keys show proper errors
- [ ] Network failures are handled gracefully
- [ ] Webhook failures are logged

## Troubleshooting Common Issues

### Webhook Not Receiving Events
1. Check webhook URL is correct and accessible
2. Verify webhook secret matches
3. Check Vercel function logs for errors
4. Ensure webhook events are properly configured

### Authentication Issues
1. Verify `WHOP_API_KEY` is correct (if using production mode)
2. Check API key has required permissions
3. Ensure app is properly installed in Whop

### Email Sync Not Working
1. Verify email platform API key (provided by user)
2. Check email platform API configuration
3. Test email platform connection
4. Check dashboard for sync status

### Experience Page Not Loading
1. Check Whop authentication headers
2. Verify environment variables are set (for production)
3. Check browser console for errors
4. Ensure proper CORS configuration

## Development vs Production

### Development Mode
- Works without environment variables
- Uses file-based storage
- Mock data for testing
- Dev tokens for authentication

### Production Mode
- Requires `WHOP_API_KEY`
- Requires `WHOP_WEBHOOK_SECRET`
- Real Whop API calls
- Production authentication

## Monitoring

### Logs to Monitor
- [ ] Vercel function logs
- [ ] Webhook event logs
- [ ] Email sync logs
- [ ] Error logs

### Metrics to Track
- [ ] Webhook event volume
- [ ] Sync success rate
- [ ] Dashboard usage
- [ ] Error rates

## Support Resources

- [Whop Developer Documentation](https://dev.whop.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## Final Checklist

Before going live:
- [ ] All tests pass
- [ ] Error handling is robust
- [ ] Logging is comprehensive
- [ ] Documentation is complete
- [ ] Support channels are ready
- [ ] Monitoring is set up

🎉 **Your Whop app is ready to go live!** 