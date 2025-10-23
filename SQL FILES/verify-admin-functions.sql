-- Quick verification script to test admin role functions
-- Run this after setting up the admin role functions

-- 1. Check if the functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('promote_to_admin', 'demote_from_admin', 'get_admin_user_ids')
ORDER BY routine_name;

-- 2. Check current admins
SELECT * FROM admins ORDER BY created_at;

-- 3. Test get_admin_user_ids function (only works if you're an admin)
-- SELECT * FROM get_admin_user_ids();

-- 4. Check user_profiles table
SELECT 
    user_id,
    email,
    name,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- If you need to manually make yourself an admin for testing:
-- (Replace 'your-user-id-here' with your actual user ID)
-- INSERT INTO admins (user_id) VALUES ('your-user-id-here')
-- ON CONFLICT (user_id) DO NOTHING;
