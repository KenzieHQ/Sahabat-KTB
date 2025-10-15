-- Create saved_posts table to track user bookmarks
CREATE TABLE IF NOT EXISTS saved_posts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saved posts
CREATE POLICY "Users can view own saved posts"
    ON saved_posts FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own saved posts
CREATE POLICY "Users can save posts"
    ON saved_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own saved posts
CREATE POLICY "Users can unsave posts"
    ON saved_posts FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON saved_posts(post_id);
