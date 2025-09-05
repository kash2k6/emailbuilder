# Storage System for Cross-Device Access

## How API Keys Are Stored

### Company-Based Storage
The app now uses **company-based storage** instead of user-based storage. This means:

- **API keys are stored per Whop company/organization**
- **All admins in the same company share the same API keys and settings**
- **Settings persist across devices and sessions**

### How It Works

1. **When an admin installs the app:**
   - The app gets the `x-whop-company-id` from Whop headers
   - API keys and email platform settings are stored using this company ID
   - All future admins from the same company will see the same settings

2. **Cross-device access:**
   - Any admin from the same Whop company can access the app
   - They'll see the same API keys and email platform configurations
   - No need to re-enter settings on different devices

3. **Data location:**
   - Data is stored in `data/storage.json` on the server
   - This file contains company profiles and email integrations
   - Each company has its own entry with API keys and settings

### Example Storage Structure

```json
{
  "companies": [
    {
      "company_id": "comp_123456",
      "whop_api_key": "whop_live_...",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "integrations": [
    {
      "company_id": "comp_123456",
      "platform": "mailchimp",
      "api_key": "mailchimp_...",
      "list_id": "audience_123",
      "dc": "us1",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Benefits

✅ **Cross-device access** - Settings work on any device  
✅ **Team collaboration** - Multiple admins can manage the same settings  
✅ **No re-entry** - Settings persist between sessions  
✅ **Whop integration** - Uses Whop's company structure  

### Security

- API keys are stored server-side only
- Access is controlled by Whop's authentication system
- Only admins from the same company can access the settings
- No user accounts or passwords needed

### Migration from User-Based Storage

If you had the old user-based storage:
- Old data will be automatically migrated
- New settings will use company-based storage
- Backward compatibility functions are provided

## Alternative Storage Options

If you need more advanced features, consider:

1. **Database Storage** (PostgreSQL, MySQL)
   - Better for large scale
   - More complex queries
   - Better backup options

2. **Cloud Storage** (AWS S3, Google Cloud Storage)
   - Better for distributed deployments
   - Automatic backups
   - Global access

3. **Whop API Storage** (if available)
   - Store settings in Whop's system
   - Automatic sync with Whop
   - Better integration

For now, the file-based company storage provides a good balance of simplicity and functionality. 