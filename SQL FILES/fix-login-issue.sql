-- Fix login issue: "Database error granting user"
-- Run this in your Supabase SQL Editor

-- OPTION 1: Quick Fix - Disable the trigger
-- Uncomment these lines if you want to disable auto-sync temporarily
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
-- DROP FUNCTION IF EXISTS sync_user_profile();

-- OPTION 2: Better Fix - Recreate with error handling (RECOMMENDED)
-- Step 1: Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Step 2: Recreate the sync function with better error handling
CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert or update, but don't fail authentication if there's an error
    INSERT INTO user_profiles (
        user_id,
        email,
        name,
        class,
        last_sign_in
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'class',
        NEW.last_sign_in_at
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        class = EXCLUDED.class,
        last_sign_in = EXCLUDED.last_sign_in;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't prevent authentication
        RAISE WARNING 'Error syncing user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_profile();

-- Step 4: Grant necessary permissions to the function
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;

-- Step 5: Sync existing users
INSERT INTO user_profiles (user_id, email, name, class, last_sign_in)
SELECT 
    id,
    email,
    raw_user_meta_data->>'name',
    raw_user_meta_data->>'class',
    last_sign_in_at
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    class = EXCLUDED.class,
    last_sign_in = EXCLUDED.last_sign_in;

-- Success! Users should now be able to log in without errors.
