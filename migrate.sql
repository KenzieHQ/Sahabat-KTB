-- Migration script to update existing database to support authentication
-- Run this if you already have posts and replies tables

-- Step 1: Drop existing tables (WARNING: This will delete all data)
-- This will automatically drop all associated policies
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS replies CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Step 2: Drop functions if they exist
DROP FUNCTION IF EXISTS increment_likes(BIGINT);
DROP FUNCTION IF EXISTS decrement_likes(BIGINT);

-- Step 3: Create new tables with authentication
-- Create posts table
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    class TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Create replies table
CREATE TABLE replies (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_reply_id BIGINT REFERENCES replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create likes tracking table
CREATE TABLE post_likes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Create reply likes tracking table
CREATE TABLE reply_likes (
    id BIGSERIAL PRIMARY KEY,
    reply_id BIGINT NOT NULL REFERENCES replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reply_id, user_id)
);

-- Step 4: Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_likes ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies for posts
CREATE POLICY "Allow authenticated users to read posts" ON posts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert posts" ON posts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update posts" ON posts
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own posts" ON posts
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Step 6: Create policies for replies
CREATE POLICY "Allow authenticated users to read replies" ON replies
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert replies" ON replies
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update replies" ON replies
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own replies" ON replies
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Step 7: Create policies for post_likes
CREATE POLICY "Allow authenticated users to read likes" ON post_likes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert likes" ON post_likes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own likes" ON post_likes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Step 8: Create policies for reply_likes
CREATE POLICY "Allow authenticated users to read reply likes" ON reply_likes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert reply likes" ON reply_likes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own reply likes" ON reply_likes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Step 9: Create functions for atomic like operations
CREATE OR REPLACE FUNCTION increment_likes(post_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE posts SET likes = likes + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_likes(post_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
