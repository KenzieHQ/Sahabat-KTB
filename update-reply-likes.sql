-- Update script to add reply likes WITHOUT deleting existing data
-- Run this to add reply like functionality to your existing database

-- Step 1: Add likes column to replies table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'replies' AND column_name = 'likes'
    ) THEN
        ALTER TABLE replies ADD COLUMN likes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 2: Create reply_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS reply_likes (
    id BIGSERIAL PRIMARY KEY,
    reply_id BIGINT NOT NULL REFERENCES replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reply_id, user_id)
);

-- Step 3: Enable Row Level Security on reply_likes
ALTER TABLE reply_likes ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (won't error if they don't)
DROP POLICY IF EXISTS "Allow authenticated users to read reply likes" ON reply_likes;
DROP POLICY IF EXISTS "Allow authenticated users to insert reply likes" ON reply_likes;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own reply likes" ON reply_likes;

-- Step 5: Create policies for reply_likes
CREATE POLICY "Allow authenticated users to read reply likes" ON reply_likes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert reply likes" ON reply_likes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own reply likes" ON reply_likes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Step 6: Add update policy for replies if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'replies' AND policyname = 'Allow authenticated users to update replies'
    ) THEN
        CREATE POLICY "Allow authenticated users to update replies" ON replies
            FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

-- Step 7: Create or replace functions for reply likes
CREATE OR REPLACE FUNCTION increment_reply_likes(reply_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE replies SET likes = likes + 1 WHERE id = reply_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_reply_likes(reply_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE replies SET likes = GREATEST(0, likes - 1) WHERE id = reply_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Your existing posts and replies are safe.
