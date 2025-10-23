-- Admin Role Management Functions
-- These functions allow admins to promote/demote users with proper security

-- Function to promote a user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if the caller is an admin
    IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only admins can promote users'
        );
    END IF;

    -- Check if user is already an admin
    IF EXISTS (SELECT 1 FROM admins WHERE user_id = target_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User is already an admin'
        );
    END IF;

    -- Add user to admins table
    INSERT INTO admins (user_id)
    VALUES (target_user_id);

    RETURN json_build_object(
        'success', true,
        'message', 'User promoted to admin successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to demote an admin to standard user
CREATE OR REPLACE FUNCTION demote_from_admin(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    admin_count INTEGER;
BEGIN
    -- Check if the caller is an admin
    IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only admins can demote users'
        );
    END IF;

    -- Check if user is an admin
    IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = target_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User is not an admin'
        );
    END IF;

    -- Count remaining admins
    SELECT COUNT(*) INTO admin_count FROM admins;

    -- Prevent demoting the last admin
    IF admin_count <= 1 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot demote the last admin'
        );
    END IF;

    -- Remove user from admins table
    DELETE FROM admins WHERE user_id = target_user_id;

    RETURN json_build_object(
        'success', true,
        'message', 'User demoted to standard user'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to get all admin user IDs (for admin panel display)
CREATE OR REPLACE FUNCTION get_admin_user_ids()
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the caller is an admin
    IF NOT EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can view admin list';
    END IF;

    -- Return all admin user IDs
    RETURN QUERY
    SELECT admins.user_id FROM admins;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION promote_to_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION demote_from_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_user_ids() TO authenticated;
