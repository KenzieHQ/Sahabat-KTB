# Quick Setup Guide for Notification System

## Step 1: Run SQL Setup
Run this file in your Supabase SQL editor:
```
SQL FILES/setup-notifications.sql
```

This will:
- Create the `notifications` table
- Set up Row Level Security (RLS) policies
- Create automatic triggers for likes and replies
- Configure admin notification permissions

## Step 2: Verify Setup
Check that everything is created:

```sql
-- Check table exists
SELECT * FROM notifications LIMIT 1;

-- Check triggers exist
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%notification%';

-- Should see:
-- post_like_notification_trigger
-- post_reply_notification_trigger
-- reply_reply_notification_trigger
```

## Step 3: Test Notifications

### Test 1: Post Like Notification
1. User A creates a post
2. User B likes the post
3. User A should see a notification

### Test 2: Post Reply Notification
1. User A has a post
2. User B replies to it
3. User A should see a notification

### Test 3: Reply to Reply Notification
1. User A comments on a post
2. User B replies to User A's comment
3. User A should see a notification

### Test 4: Admin Push Notification
1. Log in as admin
2. Go to Admin Panel
3. Click "Send Notification"
4. Send a test message
5. Check that user receives it

## Features

✅ **Automatic Notifications** for:
- Post likes
- Post replies  
- Reply to replies

✅ **Manual Push Notifications** from admins:
- Send to all users
- Send to specific user
- Custom message + optional link

✅ **Privacy Respected**:
- No notifications for anonymous posts/replies
- Users only see their own notifications

✅ **Admin Powers**:
- See who anonymous users really are
- Click anonymous names to view profiles
- Send notifications to users

✅ **Navigation Improvements**:
- Divider between main and secondary nav items
- Notification bell with badge count
- Dropdown notification list

## That's it!
The notification system is now fully functional. Users will automatically receive notifications for interactions, and admins can send custom messages to users.
