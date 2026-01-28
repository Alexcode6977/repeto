-- Migration: Add trial fields for free trial system
-- User trials: 14 days Solo Pro
-- Troupe trials: 30 days with tier selection

-- Add trial fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;

-- Add trial and inactivation fields to troupes table
ALTER TABLE troupes 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS inactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'troupe',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Add index for cron job performance (finding expired trials)
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiry 
ON profiles(subscription_status, trial_end_date) 
WHERE subscription_status = 'trialing';

CREATE INDEX IF NOT EXISTS idx_troupes_trial_expiry 
ON troupes(subscription_status, trial_end_date) 
WHERE subscription_status = 'trialing';

-- Add index for finding inactive troupes to delete
CREATE INDEX IF NOT EXISTS idx_troupes_inactive_deletion 
ON troupes(subscription_status, inactivated_at) 
WHERE subscription_status = 'inactive';
