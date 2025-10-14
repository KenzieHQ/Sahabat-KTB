-- Create function to delete users from admin panel
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_user_as_admin(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with elevated privileges
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if the caller is an admin
    SELECT EXISTS (
        SELECT 1 FROM admins WHERE user_id = auth.uid()
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only admins can delete users';
    END IF;
    
    -- Prevent self-deletion
    IF user_id_to_delete = auth.uid() THEN
        RAISE EXCEPTION 'You cannot delete your own account';
    END IF;
    
    -- Delete the user from auth.users (this will cascade to all related tables)
    DELETE FROM auth.users WHERE id = user_id_to_delete;
    
    -- Log the deletion
    RAISE NOTICE 'User % deleted by admin %', user_id_to_delete, auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_as_admin(UUID) TO authenticated;
