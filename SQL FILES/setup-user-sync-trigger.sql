-- Setup automatic user profile synchronization
-- Run this in your Supabase SQL Editor

-- Create function to sync user profiles
CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-sync when users sign up or update
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_profile();

-- Create RPC function for manual sync (callable from admin panel)
CREATE OR REPLACE FUNCTION sync_all_users()
RETURNS void AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sync all existing users to user_profiles (run once now)
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
