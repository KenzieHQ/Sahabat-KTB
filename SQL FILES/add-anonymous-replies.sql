-- Add is_anonymous column to replies table
-- Run this in your Supabase SQL Editor

-- Add the is_anonymous column (default to false for existing replies)
ALTER TABLE replies 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Update existing replies to have is_anonymous = false if not already set
UPDATE replies 
SET is_anonymous = false 
WHERE is_anonymous IS NULL;
