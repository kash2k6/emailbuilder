-- Create an RPC function that bypasses the trigger when updating from_name and from_email
-- This allows the updateFromName function to work properly without trigger interference
-- Run this script in your Supabase SQL editor

CREATE OR REPLACE FUNCTION update_from_name_direct(
  config_id uuid,
  new_from_name text,
  new_from_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Temporarily disable the trigger
  ALTER TABLE email_platform_configs DISABLE TRIGGER compute_from_email_trigger;
  
  -- Update the fields
  UPDATE email_platform_configs 
  SET 
    from_name = new_from_name,
    from_email = new_from_email,
    updated_at = NOW()
  WHERE id = config_id;
  
  -- Re-enable the trigger
  ALTER TABLE email_platform_configs ENABLE TRIGGER compute_from_email_trigger;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_from_name_direct(uuid, text, text) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION update_from_name_direct(uuid, text, text) IS 'Updates from_name and from_email while bypassing the compute_from_email trigger';
