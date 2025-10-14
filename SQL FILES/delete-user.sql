-- Delete a user completely from the system
-- Replace 'USER_EMAIL_HERE' with the actual email of the user you want to delete

-- Step 1: Delete from auth.users (this will cascade to all other tables due to foreign keys)
DELETE FROM auth.users 
WHERE email = 'USER_EMAIL_HERE';

-- This will automatically delete:
-- - User's profile from user_profiles
-- - User's admin status from admins (if they were an admin)
-- - All their posts from posts
-- - All their replies from replies
-- - All their likes from post_likes and reply_likes
-- Due to ON DELETE CASCADE constraints

-- Verify deletion
SELECT 'User deleted successfully' as status;
SELECT COUNT(*) as remaining_users FROM auth.users;
