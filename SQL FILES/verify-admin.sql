-- Verify and Fix Admin Access
-- Run this in Supabase SQL Editor

-- Check if admins table exists and show current admins
SELECT 'Current Admins:' as info;
SELECT a.*, u.email 
FROM admins a
JOIN auth.users u ON a.user_id = u.id;

-- If the table exists but is empty, or your account is missing, add it:
INSERT INTO admins (user_id)
SELECT id FROM auth.users 
WHERE email = 'kenzie.siregar@sma-ktb.sch.id'
ON CONFLICT (user_id) DO NOTHING;

-- Verify it was added
SELECT 'Verification - Your account should appear below:' as info;
SELECT a.*, u.email 
FROM admins a
JOIN auth.users u ON a.user_id = u.id
WHERE u.email = 'kenzie.siregar@sma-ktb.sch.id';
