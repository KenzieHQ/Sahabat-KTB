# Anonymous Posting Feature

## Changes Made

### 1. Database Migration
- **File**: `add-anonymous-posts.sql`
- Added `is_anonymous` BOOLEAN column to the `posts` table
- Default value is `false` for existing posts
- **Action Required**: Run this SQL file in your Supabase SQL Editor

### 2. New Post Form
- **File**: `new-post.html`
- Added "Post anonymously" checkbox below the title input
- Made title input field wider by adding `class="title-input"`
- Added helpful hint text explaining what happens when posting anonymously

### 3. Post Creation Logic
- **File**: `new-post.js`
- Captures the anonymous checkbox state
- When anonymous is checked:
  - Sets `name` to "Anonymous"
  - Sets `class` to empty string
  - Saves `is_anonymous: true` in database
- When anonymous is unchecked:
  - Uses normal user name and class

### 4. Post Display (Home Page)
- **File**: `app.js`
- Updated to hide the class field when:
  - Post is anonymous (`is_anonymous` is true)
  - OR class is empty/whitespace
- Shows "Anonymous" as the name with no class displayed

### 5. Post Display (Detail Page)
- **File**: `post-detail.js`
- Same logic as home page
- Hides class when post is anonymous or class is empty

### 6. Styling
- **File**: `styles.css`
- Added `.title-input` class to make title input field 100% width
- Added `.checkbox-label` styling for the anonymous toggle:
  - Flexbox layout with gap
  - Custom accent color for checkbox
  - Cursor pointer for better UX
  - Prevents text selection on the label

## How It Works

1. **Creating Anonymous Posts**:
   - User checks the "Post anonymously" checkbox when creating a post
   - Post is saved with `is_anonymous: true` in the database
   - Name displays as "Anonymous" and class is hidden

2. **Display Behavior**:
   - Anonymous posts show "Anonymous" with no class badge
   - Regular posts show the user's name and class (if provided)
   - Edit/delete buttons still work for post authors (based on `user_id`)

3. **Privacy**:
   - The actual user identity (`user_id`, `email`) is still stored in the database for moderation purposes
   - Only the display name and class are affected
   - Authors can still edit/delete their anonymous posts

## Next Steps

1. Run `add-anonymous-posts.sql` in your Supabase SQL Editor
2. Test creating a new post with the anonymous toggle on
3. Verify that the post displays as "Anonymous" without a class
4. Test that you can still edit/delete your anonymous posts
