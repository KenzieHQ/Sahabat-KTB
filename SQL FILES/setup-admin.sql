-- Admin System Setup
-- Run this in your Supabase SQL Editor

-- Step 1: Add is_admin column to user metadata
-- Note: We'll store admin status in user metadata since we can't directly modify auth.users table structure
-- But we'll create a helper table to track admin users

-- Create admins table to track admin users
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to read admin table
CREATE POLICY "Allow admins to read admins table" ON admins
    FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR 
        auth.uid() IN (SELECT user_id FROM admins)
    );

-- Create policy to allow admins to manage admins
CREATE POLICY "Allow admins to manage admins" ON admins
    FOR ALL TO authenticated USING (
        auth.uid() IN (SELECT user_id FROM admins)
    );

-- Step 2: Create user_profiles table to store additional user info
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    class TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_sign_in TIMESTAMPTZ,
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Allow users to read own profile" ON user_profiles
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Allow admins to read all profiles
CREATE POLICY "Allow admins to read all profiles" ON user_profiles
    FOR SELECT TO authenticated USING (
        auth.uid() IN (SELECT user_id FROM admins)
    );

-- Allow admins to update profiles
CREATE POLICY "Allow admins to update profiles" ON user_profiles
    FOR UPDATE TO authenticated USING (
        auth.uid() IN (SELECT user_id FROM admins)
    );

-- Allow admins to delete profiles
CREATE POLICY "Allow admins to delete profiles" ON user_profiles
    FOR DELETE TO authenticated USING (
        auth.uid() IN (SELECT user_id FROM admins)
    );

-- Allow authenticated users to insert their own profile
CREATE POLICY "Allow users to insert own profile" ON user_profiles
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Step 3: Add the initial admin user (kenzie.siregar@sma-ktb.sch.id)
-- First, find the user_id for this email
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the user ID for the admin email
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'kenzie.siregar@sma-ktb.sch.id';
    
    -- Insert into admins table if user exists
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO admins (user_id)
        VALUES (admin_user_id)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Admin user added successfully: %', admin_user_id;
    ELSE
        RAISE NOTICE 'User with email kenzie.siregar@sma-ktb.sch.id not found. Please ensure the user has signed up first.';
    END IF;
END $$;

-- Step 4: Update DELETE policies for posts to allow admins
DROP POLICY IF EXISTS "Allow authenticated users to delete their own posts" ON posts;
CREATE POLICY "Allow users and admins to delete posts" ON posts
    FOR DELETE TO authenticated USING (
        auth.uid() = user_id OR 
        auth.uid() IN (SELECT user_id FROM admins)
    );

-- Step 5: Update DELETE policies for replies to allow admins
DROP POLICY IF EXISTS "Allow authenticated users to delete their own replies" ON replies;
CREATE POLICY "Allow users and admins to delete replies" ON replies
    FOR DELETE TO authenticated USING (
        auth.uid() = user_id OR 
        auth.uid() IN (SELECT user_id FROM admins)
    );

-- Step 6: Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admins WHERE user_id = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to sync user profile on sign in (COMMENTED OUT - causing login issues)
-- We'll manually populate user_profiles instead
/*
CREATE OR REPLACE FUNCTION sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, email, name, class, last_sign_in)
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

-- Create trigger to auto-sync user profiles
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_profile();
*/

-- Step 8: Populate existing users into user_profiles
INSERT INTO user_profiles (user_id, email, name, class, last_sign_in)
SELECT 
    id,
    email,
    raw_user_meta_data->>'name',
    raw_user_meta_data->>'class',
    last_sign_in_at
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Admin system setup complete!
