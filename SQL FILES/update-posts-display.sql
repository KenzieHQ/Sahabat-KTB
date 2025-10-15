-- Update Posts and Replies to Always Show Current User Profile Data
-- This creates views that join with user_profiles to show current names/classes
-- Run this in your Supabase SQL Editor

-- Create a view for posts with current user profile data
CREATE OR REPLACE VIEW posts_with_profile AS
SELECT 
    p.*,
    COALESCE(up.name, p.name) as current_name,
    COALESCE(up.class, p.class) as current_class
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id;

-- Create a view for replies with current user profile data
CREATE OR REPLACE VIEW replies_with_profile AS
SELECT 
    r.*,
    COALESCE(up.name, r.name) as current_name,
    COALESCE(up.class, 'No class') as current_class
FROM replies r
LEFT JOIN user_profiles up ON r.user_id = up.user_id;

-- Grant permissions to authenticated users
GRANT SELECT ON posts_with_profile TO authenticated;
GRANT SELECT ON replies_with_profile TO authenticated;

-- Note: The frontend code needs to be updated to use these views
-- or to join with user_profiles when fetching posts and replies
