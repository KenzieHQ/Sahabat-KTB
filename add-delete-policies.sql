-- Safe update script to add DELETE policies for posts and replies
-- This script allows users to delete their own posts and replies
-- Run this in Supabase SQL Editor

-- Add DELETE policy for posts (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'posts' 
        AND policyname = 'Allow authenticated users to delete their own posts'
    ) THEN
        CREATE POLICY "Allow authenticated users to delete their own posts" ON posts
            FOR DELETE TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add DELETE policy for replies (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'replies' 
        AND policyname = 'Allow authenticated users to delete their own replies'
    ) THEN
        CREATE POLICY "Allow authenticated users to delete their own replies" ON replies
            FOR DELETE TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- Also fix the UPDATE policies to only allow users to update their own posts/replies
DO $$
BEGIN
    -- Drop and recreate update policy for posts
    DROP POLICY IF EXISTS "Allow authenticated users to update posts" ON posts;
    CREATE POLICY "Allow authenticated users to update posts" ON posts
        FOR UPDATE TO authenticated USING (auth.uid() = user_id);
    
    -- Drop and recreate update policy for replies
    DROP POLICY IF EXISTS "Allow authenticated users to update replies" ON replies;
    CREATE POLICY "Allow authenticated users to update replies" ON replies
        FOR UPDATE TO authenticated USING (auth.uid() = user_id);
END $$;
