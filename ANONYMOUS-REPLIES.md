# Anonymous Replies Feature

## Overview
Users can now reply to posts and other replies anonymously, similar to the anonymous posting feature. When replying anonymously, the user's name and class information are hidden and replaced with "Anonymous".

## Database Changes

### SQL Migration Required
Run the following SQL file in your Supabase SQL Editor:
- `SQL FILES/add-anonymous-replies.sql`

This adds an `is_anonymous` boolean column to the `replies` table.

## Features

### Main Reply Form
- Added checkbox option "Reply anonymously" in the main reply form on post detail pages
- Checkbox is located below the reply text editor
- Hint text: "Your name and class will be hidden if you reply anonymously"

### Nested Reply Forms
- Each nested reply form also includes the anonymous checkbox
- Same functionality as main reply form
- Allows users to choose anonymity on a per-reply basis

### Display
- Anonymous replies show "Anonymous" instead of the user's name
- Format: "Anonymous • [time]"
- Authors can still delete their own anonymous replies (they are the only ones who know they wrote it)
- Admins can delete any reply, anonymous or not

## Implementation Details

### Files Modified
1. **SQL FILES/add-anonymous-replies.sql** (new)
   - Adds `is_anonymous` column to replies table
   - Defaults to `false` for existing replies

2. **post-detail.html**
   - Added anonymous checkbox to main reply form
   - Positioned between content editor and form actions

3. **post-detail.js**
   - Updated reply form submission to include `is_anonymous` field
   - Updated `createReplyHTML()` to show "Anonymous" for anonymous replies
   - Added anonymous checkbox to nested reply forms (dynamically generated)
   - Updated `submitNestedReply()` to include `is_anonymous` field
   - Anonymous status affects display name in both main and nested replies

### User Experience
- Users can freely choose whether to post anonymously for each reply
- Anonymous replies are indicated by "Anonymous" as the author name
- The reply checkbox state is independent for each form
- Forms are cleared after successful submission (including checkbox state)

## Privacy Considerations
- User ID is still stored in the database (for moderation purposes)
- Only the display name is affected by anonymous status
- Authors can still delete their own anonymous replies
- Admins can see all replies in the database regardless of anonymous status
