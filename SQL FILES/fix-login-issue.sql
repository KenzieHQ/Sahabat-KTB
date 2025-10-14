-- Fix login issues caused by trigger
-- Run this in Supabase SQL Editor if you're experiencing login errors

-- Drop the trigger that's causing issues
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS sync_user_profile();

-- Success! Users should now be able to log in normally.
-- User profiles will be populated manually when they visit the admin panel.
