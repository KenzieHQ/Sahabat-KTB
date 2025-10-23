# Admin Role Management Fix

## Problem
The admin panel was experiencing two issues:

1. **403 errors when promoting/demoting users** because:
   - Row Level Security (RLS) policies on the `admins` table only allow existing admins to insert/delete
   - Direct client-side access to the table was blocked by these policies

2. **UI not reflecting admin status correctly** because:
   - The `loadUsers()` function couldn't read from the `admins` table due to RLS circular dependency
   - The UI would show incorrect role (defaulting to "Standard") even though the database had the correct value
   - Refreshing would reset the dropdown to "Standard" visually, but the database status was correct

## Solution
Created three database functions with `SECURITY DEFINER` that:
1. Bypass RLS while maintaining security checks
2. Validate that the caller is an admin
3. Handle edge cases (already admin, last admin, etc.)
4. Return clear success/error messages
5. Allow admins to fetch the list of all admin user IDs

## Setup Instructions

### Step 1: Run the SQL Setup
Go to your Supabase dashboard → SQL Editor and run the contents of:
```
SQL FILES/setup-admin-role-functions.sql
```

This creates three functions:
- `promote_to_admin(target_user_id UUID)` - Adds a user to admins table
- `demote_from_admin(target_user_id UUID)` - Removes a user from admins table
- `get_admin_user_ids()` - Returns all admin user IDs for display in admin panel

### Step 2: Verify the Changes
The `admin.js` file has been updated to:
- Use `supabaseClient.rpc('promote_to_admin', ...)` instead of direct INSERT
- Use `supabaseClient.rpc('demote_from_admin', ...)` instead of direct DELETE
- Use `supabaseClient.rpc('get_admin_user_ids')` instead of direct SELECT
- Handle the JSON responses from the functions
- Display appropriate success/error messages
- Correctly populate the role dropdown based on actual admin status

### Step 3: Test
1. Open your admin panel
2. Try promoting a user to admin - dropdown should immediately show "Admin"
3. Refresh the page - dropdown should still show "Admin"
4. Try demoting an admin to standard user - dropdown should immediately show "Standard"
5. The 403 errors should be resolved and the UI should stay in sync

## Security Features
- ✅ Only existing admins can promote/demote users
- ✅ Only existing admins can view the admin list
- ✅ Prevents demoting the last admin (keeps at least one admin)
- ✅ Prevents duplicate admin entries
- ✅ Functions run with elevated privileges but have security checks
- ✅ Returns clear error messages for all failure cases

## Files Changed
1. **NEW**: `SQL FILES/setup-admin-role-functions.sql` - Database functions
2. **MODIFIED**: `admin.js` - Updated `updateUserRole()` and `loadUsers()` functions to use RPC calls
