# Automated Batch Processing System

This system automatically handles large batch processing jobs for thousands of users with 50k+ members each.

## How It Works

### 1. **User Creates Batch Job**
- User clicks "Create Batch List" in your app
- System creates job record and audience in Supabase
- Job is automatically added to processing queue

### 2. **Automated Processing**
- Background workers continuously monitor the queue
- Workers fetch all members from Whop API (handles pagination)
- Process data and deduplicate emails
- Insert all members into database efficiently

### 3. **Scalable Architecture**
- **Queue System**: Jobs are queued and processed in order
- **Multiple Workers**: Can run multiple workers simultaneously
- **Retry Logic**: Failed jobs are retried automatically
- **Priority System**: Important jobs can be prioritized

## Setup Instructions

### Step 1: Run Database Migration

```bash
# Apply the queue system migration
supabase db push
```

### Step 2: Start the Worker

```bash
# Set your Supabase service role key
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Start the automated worker
node scripts/start-worker.js start
```

### Step 3: Monitor Progress

```bash
# Check worker status
node scripts/start-worker.js status
```

## Features

### ✅ **Fully Automated**
- No manual setup required
- Jobs are processed automatically
- No timeout limits

### ✅ **Scalable**
- Handles 1000+ users with 50k+ members each
- Multiple workers can run simultaneously
- Queue system prevents overload

### ✅ **Reliable**
- Automatic retry logic
- Error handling and logging
- Worker health monitoring

### ✅ **Real-time Progress**
- Track job status in your app
- Monitor worker performance
- View processing statistics

## Usage

### For Users
1. **Create Batch List** → Job is automatically queued
2. **Monitor Progress** → Check status in your app
3. **Get Results** → All members are processed automatically

### For Developers
1. **Start Workers** → Run `node scripts/start-worker.js start`
2. **Monitor Queue** → Check status with `node scripts/start-worker.js status`
3. **Scale Up** → Run multiple workers for higher throughput

## Database Tables

### `batch_processing_queue`
- Stores all pending and processing jobs
- Tracks job status, retries, and errors
- Priority-based processing

### `batch_processing_workers`
- Tracks active workers
- Monitors worker health and performance
- Prevents duplicate processing

### `batch_processing_stats`
- Daily processing statistics
- Performance metrics
- Success/failure rates

## Monitoring

### Worker Status
```bash
node scripts/start-worker.js status
```

### Database Queries
```sql
-- Check pending jobs
SELECT COUNT(*) FROM batch_processing_queue WHERE status = 'pending';

-- Check active workers
SELECT * FROM batch_processing_workers WHERE status = 'active';

-- Check job statistics
SELECT * FROM batch_processing_stats ORDER BY date DESC LIMIT 7;
```

### Supabase Dashboard
- Edge Functions → `batch-worker` → Logs
- Database → Tables → `batch_processing_queue`
- Real-time monitoring of job progress

## Troubleshooting

### Common Issues

1. **Worker Not Starting**
   - Check `SUPABASE_SERVICE_ROLE_KEY` environment variable
   - Verify Supabase URL is correct
   - Check Edge Function logs

2. **Jobs Not Processing**
   - Ensure worker is running
   - Check queue for pending jobs
   - Verify Whop API keys are valid

3. **High Memory Usage**
   - Reduce batch sizes in worker
   - Add delays between API calls
   - Monitor worker performance

### Debug Steps

1. **Check Worker Status**
   ```bash
   node scripts/start-worker.js status
   ```

2. **Check Queue**
   ```sql
   SELECT * FROM batch_processing_queue ORDER BY created_at DESC LIMIT 10;
   ```

3. **Check Logs**
   - Supabase Dashboard → Edge Functions → `batch-worker` → Logs
   - Look for error messages and processing details

## Scaling

### For High Volume
1. **Run Multiple Workers**
   ```bash
   # Terminal 1
   node scripts/start-worker.js start
   
   # Terminal 2
   node scripts/start-worker.js start
   ```

2. **Adjust Priority**
   - Set higher priority for important jobs
   - Use priority queue for VIP users

3. **Monitor Performance**
   - Track processing times
   - Monitor API rate limits
   - Scale workers based on demand

## Security

- API keys stored securely in database
- Row-level security on all tables
- Service role access only for workers
- Input validation and sanitization

## Cost Optimization

- Workers only run when needed
- Efficient database queries
- Minimal API calls with batching
- Automatic cleanup of old data
