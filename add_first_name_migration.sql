-- Migration: Add first_name column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Optional: Add comment for documentation
COMMENT ON COLUMN profiles.first_name IS 'User first name displayed in the app';
