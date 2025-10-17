-- Drop table if it exists (to recreate with proper foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table with proper foreign key relationships
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'post_like', 'post_reply', 'reply_reply', 'admin_notification'
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    reply_id INTEGER REFERENCES replies(id) ON DELETE CASCADE,
    content TEXT, -- For admin notifications
    link TEXT, -- For admin notifications
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- System can insert notifications (triggers will handle this)
CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins WHERE user_id = auth.uid()
        )
    );

-- Function to create notification for post likes
CREATE OR REPLACE FUNCTION create_post_like_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification if someone else liked the post
    IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
        INSERT INTO notifications (user_id, actor_id, type, post_id)
        SELECT 
            p.user_id,
            NEW.user_id,
            'post_like',
            NEW.post_id
        FROM posts p
        WHERE p.id = NEW.post_id
        AND p.is_anonymous = FALSE; -- Don't notify for anonymous posts
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for post likes
DROP TRIGGER IF EXISTS post_like_notification_trigger ON post_likes;
CREATE TRIGGER post_like_notification_trigger
    AFTER INSERT ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION create_post_like_notification();

-- Function to create notification for post replies
CREATE OR REPLACE FUNCTION create_post_reply_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification if someone else replied to the post
    IF NEW.user_id != (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
        INSERT INTO notifications (user_id, actor_id, type, post_id, reply_id)
        SELECT 
            p.user_id,
            NEW.user_id,
            'post_reply',
            NEW.post_id,
            NEW.id
        FROM posts p
        WHERE p.id = NEW.post_id
        AND p.is_anonymous = FALSE -- Don't notify for anonymous posts
        AND NEW.is_anonymous = FALSE; -- Don't notify if reply is anonymous
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for post replies
DROP TRIGGER IF EXISTS post_reply_notification_trigger ON replies;
CREATE TRIGGER post_reply_notification_trigger
    AFTER INSERT ON replies
    FOR EACH ROW
    WHEN (NEW.parent_reply_id IS NULL)
    EXECUTE FUNCTION create_post_reply_notification();

-- Function to create notification for reply to reply
CREATE OR REPLACE FUNCTION create_reply_reply_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification if someone else replied to the reply
    IF NEW.user_id != (SELECT user_id FROM replies WHERE id = NEW.parent_reply_id) THEN
        INSERT INTO notifications (user_id, actor_id, type, post_id, reply_id)
        SELECT 
            r.user_id,
            NEW.user_id,
            'reply_reply',
            NEW.post_id,
            NEW.id
        FROM replies r
        WHERE r.id = NEW.parent_reply_id
        AND r.is_anonymous = FALSE -- Don't notify for anonymous replies
        AND NEW.is_anonymous = FALSE; -- Don't notify if new reply is anonymous
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for reply to reply
DROP TRIGGER IF EXISTS reply_reply_notification_trigger ON replies;
CREATE TRIGGER reply_reply_notification_trigger
    AFTER INSERT ON replies
    FOR EACH ROW
    WHEN (NEW.parent_reply_id IS NOT NULL)
    EXECUTE FUNCTION create_reply_reply_notification();
