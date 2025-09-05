-- Add batch processing queue system
-- This allows for automated processing of large datasets

-- 1. Batch Processing Queue
CREATE TABLE batch_processing_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  whop_user_id TEXT NOT NULL,
  audience_id UUID NOT NULL REFERENCES email_audiences(id) ON DELETE CASCADE,
  list_name TEXT NOT NULL,
  whop_api_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient queue processing
CREATE INDEX idx_batch_queue_status_priority ON batch_processing_queue(status, priority DESC, created_at);
CREATE INDEX idx_batch_queue_user_id ON batch_processing_queue(whop_user_id);

-- 2. Batch Processing Workers
CREATE TABLE batch_processing_workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id TEXT UNIQUE NOT NULL, -- Unique identifier for each worker
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  current_job_id UUID REFERENCES batch_processing_queue(id),
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  jobs_processed INTEGER DEFAULT 0,
  total_members_processed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Batch Processing Statistics
CREATE TABLE batch_processing_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_jobs INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  total_members_processed INTEGER DEFAULT 0,
  avg_processing_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- 4. Functions for queue management

-- Function to add job to queue
CREATE OR REPLACE FUNCTION add_batch_job_to_queue(
  p_job_id TEXT,
  p_whop_user_id TEXT,
  p_audience_id UUID,
  p_list_name TEXT,
  p_whop_api_key TEXT,
  p_priority INTEGER DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO batch_processing_queue (
    job_id,
    whop_user_id,
    audience_id,
    list_name,
    whop_api_key,
    priority
  ) VALUES (
    p_job_id,
    p_whop_user_id,
    p_audience_id,
    p_list_name,
    p_whop_api_key,
    p_priority
  ) RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next job from queue
CREATE OR REPLACE FUNCTION get_next_batch_job() RETURNS TABLE (
  queue_id UUID,
  job_id TEXT,
  whop_user_id TEXT,
  audience_id UUID,
  list_name TEXT,
  whop_api_key TEXT,
  retry_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE batch_processing_queue
  SET 
    status = 'processing',
    started_at = NOW(),
    updated_at = NOW()
  WHERE id = (
    SELECT id 
    FROM batch_processing_queue 
    WHERE status = 'pending' 
    ORDER BY priority DESC, created_at ASC 
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    id,
    job_id,
    whop_user_id,
    audience_id,
    list_name,
    whop_api_key,
    retry_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION mark_batch_job_completed(p_queue_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE batch_processing_queue
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as failed
CREATE OR REPLACE FUNCTION mark_batch_job_failed(
  p_queue_id UUID,
  p_error_message TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE batch_processing_queue
  SET 
    status = CASE 
      WHEN retry_count < max_retries THEN 'retry'
      ELSE 'failed'
    END,
    retry_count = retry_count + 1,
    error_message = p_error_message,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to register worker
CREATE OR REPLACE FUNCTION register_batch_worker(p_worker_id TEXT) RETURNS UUID AS $$
DECLARE
  worker_uuid UUID;
BEGIN
  INSERT INTO batch_processing_workers (worker_id)
  VALUES (p_worker_id)
  ON CONFLICT (worker_id) 
  DO UPDATE SET 
    status = 'active',
    last_heartbeat = NOW(),
    updated_at = NOW()
  RETURNING id INTO worker_uuid;
  
  RETURN worker_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update worker heartbeat
CREATE OR REPLACE FUNCTION update_worker_heartbeat(
  p_worker_id TEXT,
  p_current_job_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE batch_processing_workers
  SET 
    last_heartbeat = NOW(),
    current_job_id = p_current_job_id,
    updated_at = NOW()
  WHERE worker_id = p_worker_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up inactive workers
CREATE OR REPLACE FUNCTION cleanup_inactive_workers() RETURNS INTEGER AS $$
DECLARE
  inactive_count INTEGER;
BEGIN
  UPDATE batch_processing_workers
  SET status = 'inactive'
  WHERE last_heartbeat < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS inactive_count = ROW_COUNT;
  RETURN inactive_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Triggers for automatic cleanup

-- Trigger to update batch_jobs when queue job completes
CREATE OR REPLACE FUNCTION update_batch_job_on_queue_complete() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE batch_jobs
    SET 
      status = 'completed',
      updated_at = NOW()
    WHERE id = NEW.job_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE batch_jobs
    SET 
      status = 'failed',
      error = NEW.error_message,
      updated_at = NOW()
    WHERE id = NEW.job_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_job_on_queue_complete
  AFTER UPDATE ON batch_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_job_on_queue_complete();

-- 6. RLS Policies

-- Allow users to see their own queue jobs
ALTER TABLE batch_processing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queue jobs" ON batch_processing_queue
  FOR SELECT USING (whop_user_id = auth.jwt() ->> 'whop_user_id');

-- Allow service role full access
CREATE POLICY "Service role has full access to queue" ON batch_processing_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Workers table - service role only
ALTER TABLE batch_processing_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to workers" ON batch_processing_workers
  FOR ALL USING (auth.role() = 'service_role');

-- Stats table - service role only
ALTER TABLE batch_processing_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to stats" ON batch_processing_stats
  FOR ALL USING (auth.role() = 'service_role');
