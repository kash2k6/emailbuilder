# Cron-job.org Setup Guide for Batch Processing

This guide explains how to set up cron-job.org to handle large batch processing jobs for Whop members.

## Why We Need Cron-job.org

Supabase Edge Functions have timeout limits (30 seconds), so they can't handle processing 13,000+ members. Cron-job.org can run for hours without timeouts.

## How It Works

1. **User creates batch job** → Creates job record in Supabase
2. **Cron-job.org runs script** → Fetches all 13,000+ members from Whop API
3. **Script sends data to Supabase** → Calls our batch-complete endpoint
4. **Supabase inserts data** → All members added to database

## Step-by-Step Setup

### Step 1: Create a Batch Job

1. Go to your app and create a new batch list
2. Look at the server console output - it will show you the job details
3. Copy the job details (Job ID, User ID, Audience ID, etc.)

### Step 2: Set Up Cron-job.org

1. **Go to [cron-job.org](https://cron-job.org)**
2. **Sign up for a free account**
3. **Click "Create cronjob"**

### Step 3: Configure the Cron Job

1. **Title:** `Whop Batch Processing - [Your Job ID]`

2. **Script:** Upload the file `scripts/cron-batch-processor.js`

3. **Environment Variables:** Add these (replace with your actual values):
   ```
   WHOP_API_KEY=your_whop_api_key
   SUPABASE_URL=https://fziluyzxsuqjypiyjplr.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JOB_ID=your_job_id
   WHOP_USER_ID=your_whop_user_id
   AUDIENCE_ID=your_audience_id
   LIST_NAME=your_list_name
   ```

4. **Schedule:** Set to run once immediately

5. **Save the cronjob**

### Step 4: Monitor Progress

1. **Cron-job.org logs:** Check the execution logs
2. **Your app:** Monitor the job status
3. **Supabase logs:** Check the batch-complete function logs

## Example Setup

When you create a batch job, you'll see output like this:

```
=== CRON-JOB.ORG SETUP DETAILS ===
Job ID: batch_1755625275512_ctis9tz2i
User ID: user_ojPhs9dIhFQ9C
Audience ID: c94d1e05-bb34-4385-b7b8-97c006e04b26
List Name: My Test List
Whop API Key: whop_sk_...

=== ENVIRONMENT VARIABLES FOR CRON-JOB.ORG ===
WHOP_API_KEY=whop_sk_...
SUPABASE_URL=https://fziluyzxsuqjypiyjplr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JOB_ID=batch_1755625275512_ctis9tz2i
WHOP_USER_ID=user_ojPhs9dIhFQ9C
AUDIENCE_ID=c94d1e05-bb34-4385-b7b8-97c006e04b26
LIST_NAME=My Test List
```

## Benefits

- ✅ **No timeout limits** - Can process 13,000+ members
- ✅ **Reliable** - Built-in retry logic
- ✅ **Cost-effective** - Free tier available
- ✅ **Scalable** - Can handle multiple jobs

## Troubleshooting

### Common Issues:

1. **Missing environment variables** - Check all required variables are set
2. **API key errors** - Verify Whop API key is valid
3. **Network timeouts** - Script includes delays between requests
4. **Rate limiting** - Script respects API rate limits

### Debug Steps:

1. Check cron-job.org execution logs
2. Verify environment variables are correct
3. Test the script locally first
4. Check Supabase batch-complete function logs

## Security Notes

- Store API keys securely in cron-job.org environment variables
- Use service role key only for server-to-server communication
- Validate all incoming data in the batch-complete endpoint
