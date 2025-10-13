# Database Setup Guide

## ⚠️ IMPORTANT: Avoid Data Loss!

### Files in this project:

1. **`migrate.sql`** - ❌ **DANGER: DELETES ALL DATA!**
   - Only use this for brand new/empty databases
   - Contains `DROP TABLE` commands that delete everything
   - **DO NOT run this if you have existing posts/replies**

2. **`update-reply-likes.sql`** - ✅ **Safe to use**
   - Adds reply likes feature without deleting data
   - Checks if things exist before creating them
   - Safe to run multiple times

## Initial Setup (First Time Only)

If you're setting up the database for the first time:

1. Go to Supabase Dashboard → SQL Editor
2. Run `migrate.sql` 
3. Enable Email authentication in Authentication → Providers
4. Done!

## Adding Features to Existing Database

If you already have posts and want to add new features:

1. Go to Supabase Dashboard → SQL Editor
2. **Use the update files (like `update-reply-likes.sql`)**
3. Never run `migrate.sql` again!

## Quick Reference

### What you need in your database:
- ✅ Tables: `posts`, `replies`, `post_likes`, `reply_likes`
- ✅ RLS policies enabled on all tables
- ✅ Functions: `increment_likes`, `decrement_likes`, `increment_reply_likes`, `decrement_reply_likes`

### If you accidentally deleted data:
Unfortunately, you'll need to recreate your posts. In the future:
- Always use update scripts instead of migrate scripts
- Consider backing up your database before running SQL
- Test on a development/staging database first

## Pro Tips
- Supabase has built-in backups - check "Database" → "Backups" in your dashboard
- You can also use Supabase's "Table Editor" for manual backups by exporting to CSV
