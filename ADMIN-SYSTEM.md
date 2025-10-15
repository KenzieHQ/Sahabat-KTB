# Admin System Documentation

## ⚠️ IMPORTANT: Login Issue Fix

If you're experiencing a "Database error granting user" error when trying to log in:

### Quick Fix (Run This First!)
1. Open Supabase SQL Editor
2. Run this SQL:
```sql
-- File: fix-login-issue.sql
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS sync_user_profile();
```
3. Try logging in again - it should work now!

**Why this happened:** The initial setup included a database trigger that caused permission conflicts during login. This fix removes that trigger, and user profiles are now synced manually instead.

---

## Overview
A comprehensive admin system has been created for the Thinkery forum. The admin account `kenzie.siregar@sma-ktb.sch.id` has full administrative privileges.

## Features

### 1. Admin Panel
- **URL**: `admin.html`
- **Access**: Only visible and accessible to admin users
- **Features**:
  - View all registered users
  - See user details (name, email, class, last sign-in)
  - Promote/demote users to admin role
  - Delete user accounts
  - Statistics dashboard showing total users and admins

### 2. Admin Privileges

#### Post Management
- **Delete any post**: Admins can delete any post, not just their own
- **Edit button**: Only shows for post authors, not admins (to preserve author intent)
- **Delete button**: Shows for all posts when viewing as admin

#### Reply Management
- **Delete any reply**: Admins can delete any reply or nested reply
- **No edit capability**: Replies cannot be edited by anyone (preserves original content)

#### User Management
- **View all users**: See complete list with details
- **Promote to admin**: Change user role from Standard to Admin
- **Demote from admin**: Change user role from Admin to Standard
- **Delete users**: Remove user accounts (requires additional setup for full auth deletion)

### 3. Admin Navigation
- Admin link automatically appears in sidebar for admin users
- Settings gear icon for easy recognition
- Active state highlighting when on admin page

## Setup Instructions

### Step 1: Fix Login Issues (If Experiencing Errors)
Execute `fix-login-issue.sql` in Supabase SQL Editor first!

### Step 2: Run Database Setup
Execute the SQL file in your Supabase SQL Editor:
```sql
-- File: setup-admin.sql
```

This script will:
1. Create `admins` table to track admin users
2. Create `user_profiles` table to store user information
3. Set up Row Level Security policies
4. Grant admin privileges to `kenzie.siregar@sma-ktb.sch.id`
5. Enable admins to delete any posts and replies
6. Create helper functions and triggers

### Step 2: Verify Admin Account
After running the setup SQL:
1. Log in with `kenzie.siregar@sma-ktb.sch.id`
2. Check that "Admin Panel" link appears in the sidebar
3. Navigate to Admin Panel to view users
4. Test promoting/demoting a user
5. Verify delete buttons appear on all posts and replies

### Step 3: Important Notes
The SQL script adds the initial admin based on email. If the account doesn't exist yet:
1. Sign up with `kenzie.siregar@sma-ktb.sch.id`
2. Then run the SQL script
3. Log out and log back in to see admin features

## Files Created/Modified

### New Files:
1. **setup-admin.sql** - Database setup for admin system
2. **admin.html** - Admin panel page
3. **admin.js** - Admin panel functionality
4. **admin-helper.js** - Helper functions for admin checks (optional utility)

### Modified Files:
1. **app.js** - Added admin checks, show delete buttons for admins
2. **post-detail.js** - Added admin checks, show delete buttons for admins
3. **styles.css** - Added admin panel styling

## Database Schema

### admins Table
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: UUID (references auth.users)
- created_at: TIMESTAMPTZ
```

### user_profiles Table
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: UUID (references auth.users)
- email: TEXT
- name: TEXT
- class: TEXT
- created_at: TIMESTAMPTZ
- last_sign_in: TIMESTAMPTZ
```

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies:
- Users can read their own profile
- Admins can read all profiles
- Admins can manage admins table
- Admins can delete any posts/replies

### Admin Check Function
```sql
is_admin(check_user_id UUID) RETURNS BOOLEAN
```
Helper function to check if a user is an admin.

### Automatic Profile Sync
A trigger automatically syncs user data from `auth.users` to `user_profiles` on sign-in.

## Usage Guide

### For Admins:

#### Accessing Admin Panel
1. Log in with your admin account
2. Click "Admin Panel" in the sidebar
3. View the dashboard with user statistics

#### Managing Users
1. Find the user in the table
2. Use the dropdown to change role (Standard ↔ Admin)
3. Click "Delete" button to remove user
4. Confirm the action in the modal

#### Moderating Content
1. Browse posts and replies normally
2. Delete button appears on ALL content (not just your own)
3. Click delete button and confirm to remove content
4. Page refreshes automatically after deletion

### For Regular Users:
- No changes to regular user experience
- Cannot see or access admin panel
- Can only delete their own posts/replies

## Troubleshooting

### Admin Panel Not Showing
1. Check that you're logged in as `kenzie.siregar@sma-ktb.sch.id`
2. Verify the SQL script ran successfully
3. Check Supabase table `admins` - should have entry for your user_id
4. Log out and log back in

### Cannot Delete User
- Full user deletion requires Supabase Admin API (service role key)
- Current implementation removes from user_profiles
- To fully delete: Use Supabase Dashboard → Authentication → Users

### Delete Buttons Not Showing
1. Verify you're an admin in the `admins` table
2. Clear browser cache and reload
3. Check browser console for errors

## Future Enhancements

Potential additions:
- Ban/suspend users temporarily
- View user's all posts and comments
- Bulk actions (delete multiple users)
- Admin activity log
- Email notifications for moderation actions
- Content reporting system
- Analytics dashboard

## Support

For issues or questions:
1. Check Supabase logs for errors
2. Verify all SQL policies are created
3. Ensure user_profiles table is populated
4. Check browser console for JavaScript errors
