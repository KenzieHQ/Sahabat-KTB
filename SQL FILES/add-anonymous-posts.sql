-- Add is_anonymous column to posts table
-- Run this in your Supabase SQL Editor

-- Add the is_anonymous column (default to false for existing posts)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Update existing posts to have is_anonymous = false if not already set
UPDATE posts 
SET is_anonymous = false 
WHERE is_anonymous IS NULL;
