-- Add cancel_at_period_end column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
