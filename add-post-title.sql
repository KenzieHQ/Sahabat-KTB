-- Add title column to posts table
-- Run this in Supabase SQL Editor

-- Add title column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE posts ADD COLUMN title TEXT;
    END IF;
END $$;
