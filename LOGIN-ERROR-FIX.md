# Login Error Fix: "Database error granting user"

## Problem
Users are getting a 500 Internal Server Error when trying to log in:
```
AuthApiError: Database error granting user
```

## Root Cause
This error happens when the database trigger (`sync_user_profile()`) that automatically creates user profiles fails during login. This can be caused by:

1. **Missing trigger setup** - The trigger function hasn't been created yet
2. **Permission issues** - The trigger doesn't have permission to insert into `user_profiles`
3. **Constraint violations** - Duplicate entries or missing required fields
4. **RLS policy blocks** - Row-level security preventing the insert

## Solution

### Immediate Fix (Choose One):

#### Option A: Disable Auto-Sync (Quick but manual)
Run this SQL to stop the trigger from interfering:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS sync_user_profile();
```
**Note:** Users won't automatically appear in admin panel. You'll need to click "Refresh Users" button manually.

#### Option B: Fix the Trigger (Recommended)
Run the file: `SQL FILES/fix-login-issue.sql` in Supabase SQL Editor

This will:
- ✅ Add error handling so login doesn't fail
- ✅ Grant proper permissions
- ✅ Sync existing users
- ✅ Allow automatic user profile creation

## Steps to Fix

1. **Go to Supabase Dashboard** → Your Project → SQL Editor
2. **Run:** `SQL FILES/fix-login-issue.sql`
3. **Test:** Try logging in again
4. **Verify:** Check if users appear in admin panel

## Prevention

The updated trigger now has `EXCEPTION` handling that:
- Logs warnings instead of failing
- Returns success even if profile sync fails
- Won't block authentication

## Testing

After running the fix:
1. Try to log in with an existing account
2. Create a new account
3. Check admin panel to see if users appear
4. Click "Refresh Users" if needed

## Alternative: Manual Sync Only

If you prefer to not use automatic triggers at all:
1. Run Option A (disable trigger)
2. Use the "Refresh Users" button in admin panel manually
3. Or let each user's first visit sync their profile automatically through the app

## Files Involved
- `SQL FILES/fix-login-issue.sql` - The fix
- `SQL FILES/setup-user-sync-trigger.sql` - Original trigger setup
- `auth.js` - Login handling
- `admin.js` - Manual sync function
