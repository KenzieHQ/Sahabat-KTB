-- Student Forum Database Setup
-- Run this in your Supabase SQL Editor

-- Create posts table
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    class TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create replies table
CREATE TABLE replies (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- Create policies to allow authenticated users to read all posts
CREATE POLICY "Allow authenticated users to read posts" ON posts
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert their own posts
CREATE POLICY "Allow authenticated users to insert posts" ON posts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read all replies
CREATE POLICY "Allow authenticated users to read replies" ON replies
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert their own replies
CREATE POLICY "Allow authenticated users to insert replies" ON replies
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create likes tracking table to prevent multiple likes from same user
CREATE TABLE post_likes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Enable RLS for post_likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for post_likes
CREATE POLICY "Allow authenticated users to read likes" ON post_likes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert likes" ON post_likes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own likes" ON post_likes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create policy to allow authenticated users to update likes count
CREATE POLICY "Allow authenticated users to update posts" ON posts
    FOR UPDATE TO authenticated USING (true);

-- Create functions for atomic like increment/decrement
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
