# Notification System Implementation

## Overview
Complete notification system with push notifications from admins, activity notifications, and real-time badge updates.

## Features Implemented

### 1. **Notification Bell Icon** 🔔
- **Location**: Navigation bar, next to the three-dot menu
- **Badge**: Shows unread notification count
- **Dropdown**: Click to see notifications list

### 2. **Notification Types**
- **Post Likes**: Get notified when someone likes your post
- **Post Replies**: Get notified when someone comments on your post
- **Reply to Reply**: Get notified when someone replies to your comment
- **Admin Push Notifications**: Moderators can send custom notifications to users

### 3. **Admin Capabilities** 👨‍💼

#### View Anonymous Users
- **Location**: All posts and replies throughout the website
- **Behavior**: Admins see "Anonymous (Real Name)" with clickable link
- **Privacy**: Regular users still see just "Anonymous"
- **Access**: Click to view the actual user's profile

#### Clickable User Names in Admin Panel
- **Location**: Admin Panel user table
- **Behavior**: All names are clickable links
- **Action**: Click to view user's profile page

#### Send Push Notifications
- **Location**: Admin Panel → "Send Notification" button
- **Options**:
  - Send to ALL users
  - Send to specific user
- **Fields**:
  - Message (max 500 characters)
  - Optional link (e.g., "updates.html", "post-detail.html?id=123")
- **Display**: Shows as "Website Moderator: [message]" to users

### 4. **Navigation Sidebar Divider** 📋
- **Purpose**: Visual separation of navigation items
- **Location**: Between "Saved" and "Guidelines"
- **Sections**:
  - **Top Section**: Home, New Post, Saved
  - **Bottom Section**: Guidelines, Updates, Admin Panel

## Database Schema

### notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    actor_id UUID REFERENCES auth.users(id),
    type TEXT, -- 'post_like', 'post_reply', 'reply_reply', 'admin_notification'
    post_id INTEGER REFERENCES posts(id),
    reply_id INTEGER REFERENCES replies(id),
    content TEXT, -- For admin notifications
    link TEXT, -- For admin notifications
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);
```

## Files Modified

### Core Files
1. **nav.js**
   - Added notification bell button and dropdown HTML
   - Added notification loading functions
   - Added mark as read functionality
   - Added badge update logic

2. **styles.css**
   - Notification bell styles
   - Notification badge styles
   - Notification dropdown styles
   - Navigation divider styles
   - Anonymous admin link styles
   - Admin user link styles

3. **admin.js**
   - Made user names clickable in admin table
   - Added push notification modal
   - Added send notification functions
   - Send to all users or specific user

4. **admin.html**
   - Added "Send Notification" button

5. **post-detail.js**
   - Anonymous users show real name to admins (clickable)
   - Regular users see "Anonymous"

6. **app.js**
   - Anonymous users show real name to admins on homepage (clickable)
   - Regular users see "Anonymous"

### SQL Files
7. **SQL FILES/setup-notifications.sql** (NEW)
   - Creates notifications table
   - Sets up RLS policies
   - Creates triggers for auto-notifications on:
     - Post likes
     - Post replies
     - Reply to replies
   - Respects anonymous flag (no notifications for anonymous posts/replies)

## Usage Instructions

### For Regular Users

#### Viewing Notifications
1. Click the bell icon in the navigation bar
2. See list of recent notifications
3. Click on a notification to go to the relevant post/reply
4. Click "Mark all as read" to clear all notifications

#### Notification Badge
- Red badge shows number of unread notifications
- Updates automatically
- Maximum shows "99+"

### For Admins

#### Viewing Anonymous Users
1. Browse any post or reply
2. Anonymous posts/replies show as "Anonymous (Real Name)"
3. Click the name to view the user's profile
4. Regular users cannot see this information

#### Sending Push Notifications
1. Go to Admin Panel
2. Click "Send Notification" button
3. Choose recipient:
   - **All Users**: Send to everyone
   - **Specific User**: Select from dropdown
4. Enter your message (max 500 characters)
5. Optionally add a link where users should go
6. Click "Send Notification"
7. Users will see it as "Website Moderator: [your message]"

#### Accessing User Profiles
- In Admin Panel table, click any user's name
- Takes you directly to their profile page

## Privacy & Security

### Anonymous Posts/Replies
- ✅ Anonymous flag is respected
- ✅ No notifications sent for anonymous posts/replies
- ✅ Regular users cannot see who posted anonymously
- ✅ Only admins can see real identities
- ✅ Admin access is clearly indicated with "(Real Name)" format

### Notifications
- ✅ Users only see their own notifications (RLS enforced)
- ✅ Admins need proper admin table entry to send notifications
- ✅ Notifications are deleted when posts/replies are deleted (CASCADE)
- ✅ No sensitive information in notification content

### Admin Permissions
- ✅ Admin status checked on every admin action
- ✅ Only admins can see anonymous user identities
- ✅ Only admins can send push notifications
- ✅ Only admins can access admin panel

## Setup Instructions

### Database Setup
```bash
# Run the notification setup SQL
psql -h [your-host] -U [your-user] -d [your-db] -f "SQL FILES/setup-notifications.sql"
```

### Testing

#### Test Notifications
1. Create a post as User A
2. Like the post as User B
3. User A should see notification
4. Reply to the post as User B
5. User A should see another notification

#### Test Anonymous
1. Create anonymous post as User A
2. Admin should see "Anonymous (User A's Name)"
3. Regular user should see "Anonymous"
4. Admin can click to view User A's profile

#### Test Push Notifications
1. Log in as admin
2. Go to Admin Panel
3. Click "Send Notification"
4. Send test message to yourself
5. Check bell icon for notification

## Future Enhancements

### Possible Additions
- [ ] Real-time notifications (WebSockets/Supabase Realtime)
- [ ] Email notifications
- [ ] Notification preferences (turn on/off certain types)
- [ ] Notification history page
- [ ] Desktop browser notifications
- [ ] Sound alerts for new notifications
- [ ] Notification grouping ("User A and 3 others liked your post")

## Troubleshooting

### Notifications Not Appearing
1. Check if user is logged in
2. Verify notifications table exists
3. Check RLS policies are enabled
4. Verify triggers are active

### Badge Not Updating
1. Refresh the page
2. Check browser console for errors
3. Verify user has notifications in database

### Admin Features Not Working
1. Verify user is in admins table
2. Check admin panel access
3. Clear browser cache
4. Check console for permission errors

## Support
For issues or questions, contact the development team.
