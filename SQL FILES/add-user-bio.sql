-- Add bio column to user_profiles table
-- Run this in your Supabase SQL Editor

-- Add bio column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment
COMMENT ON COLUMN user_profiles.bio IS 'User biography/about section (max 500 characters)';
