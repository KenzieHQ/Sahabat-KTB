-- Complete Admin Setup and Fix
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Ensure admins table exists
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Step 2: DISABLE RLS completely on admins table to avoid circular dependencies
-- Access control will be handled at the application level (admin.js checks)
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;

-- Step 3: Clear any existing policies (just to be clean)
DROP POLICY IF EXISTS "Allow admins to read admins table" ON admins;
DROP POLICY IF EXISTS "Allow admins to manage admins" ON admins;
DROP POLICY IF EXISTS "Allow users to check their own admin status" ON admins;
DROP POLICY IF EXISTS "Allow authenticated users to read their admin status" ON admins;
DROP POLICY IF EXISTS "Service role can manage admins" ON admins;
DROP POLICY IF EXISTS "Allow admins to manage admins table" ON admins;

-- Step 4: Find your user ID and add you as admin
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'kenzie.siregar@sma-ktb.sch.id';
BEGIN
    -- Find the user ID
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found! Please make sure you are logged in at least once.', admin_email;
    END IF;
    
    -- Delete any existing admin record first (in case of corruption)
    DELETE FROM admins WHERE user_id = admin_user_id;
    
    -- Insert as admin
    INSERT INTO admins (user_id) VALUES (admin_user_id);
    
    RAISE NOTICE 'SUCCESS! User % (%) is now an admin!', admin_email, admin_user_id;
END $$;

-- Step 5: Verify it worked
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM admins a
    JOIN auth.users u ON a.user_id = u.id
    WHERE u.email = 'kenzie.siregar@sma-ktb.sch.id';
    
    IF admin_count > 0 THEN
        RAISE NOTICE 'VERIFICATION PASSED! You are now an admin. Please refresh your browser.';
    ELSE
        RAISE EXCEPTION 'VERIFICATION FAILED! Admin was not added properly.';
    END IF;
END $$;
