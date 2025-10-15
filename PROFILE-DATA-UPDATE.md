# Profile Data Updates and Hover Card Fix

## Summary
This update ensures that all user profile changes (name, class, bio) are reflected everywhere on the website, and that hover cards work on all pages with usernames.

## Changes Made

### 1. Database Schema (SQL)
**File:** `SQL FILES/update-posts-display.sql`
- Created views `posts_with_profile` and `replies_with_profile` that join with `user_profiles` table
- These views always show current user profile data instead of stale cached data
- **Note:** The frontend uses direct joins instead of views for better performance

### 2. Dynamic Profile Data Fetching

#### app.js (Homepage)
- Modified `fetchPosts()` to join with `user_profiles` table
- Query now includes: `user_profiles!posts_user_id_fkey(name, class)`
- Posts are mapped to use current profile data: `post.user_profiles?.name || post.name`
- Usernames are now clickable with `username-link` class and data attributes

#### post-detail.js (Post Detail Page)
- Modified post fetching to join with `user_profiles` table
- Modified replies fetching to join with `user_profiles` table
- Both post author and reply authors now show current profile data
- Updated `createReplyHTML()` to use clickable usernames with hover support
- Added hover card initialization after content loads

#### saved.js (Saved Posts Page)
- Modified `fetchSavedPosts()` to join with `user_profiles` table
- Posts now display current user profile data
- Usernames are clickable with hover card support
- Added hover card initialization after posts load

#### profile.js (User Profile Page)
- Already fetching posts/replies by user_id, so automatically shows user's current data
- Added hover card initialization after content loads (for consistency)

### 3. Hover Card Integration

#### HTML Files Updated
Added `<script src="user-hover.js"></script>` to:
- `post-detail.html` - Hover on post author and reply authors
- `saved.html` - Hover on saved post authors
- `profile.html` - Hover on usernames in profile context
- `index.html` - Already had it

#### JavaScript Files Updated
All files now call `initializeUserHoverCards()` after rendering content:
- `app.js` - After loading posts
- `post-detail.js` - After loading post and replies
- `saved.js` - After loading saved posts
- `profile.js` - After loading user posts/replies

### 4. Username Rendering Pattern

All usernames now use this consistent pattern:

```javascript
// For posts
const usernameHTML = post.is_anonymous 
    ? escapeHtml(post.name)
    : `<span class="username-link" data-user-id="${post.user_id}" data-user-name="${escapeHtml(post.name)}">${escapeHtml(post.name)}</span>`;

const authorInfo = post.is_anonymous || !post.class || post.class.trim() === '' 
    ? usernameHTML
    : `${usernameHTML} • ${escapeHtml(post.class)}`;
```

This ensures:
- Anonymous users show "Anonymous" without hover
- Regular users show clickable names with hover cards
- Class info is displayed when available

### 5. UI Consistency

All UI elements already use consistent styling:
- **Forms:** `font-size: 0.95rem` (inputs, textareas, selects)
- **Dropdowns:** `font-size: 0.9rem` for .sort-select
- **Tabs:** `font-size: 0.95rem` for .profile-tab
- **Buttons:** Consistent padding and border-radius
- **Cards:** All use `border-radius: 8px` and light shadows

## How It Works

### Profile Data Flow
1. User updates their profile in Settings
2. Data is saved to `user_profiles` table
3. All pages now fetch posts/replies with JOIN to `user_profiles`
4. Current name/class from `user_profiles` takes precedence over cached data
5. If `user_profiles` data exists, use it; otherwise fall back to cached data

### Hover Card Flow
1. Page loads content with `.username-link` elements
2. `initializeUserHoverCards()` is called after content renders
3. Function attaches hover listeners to all `.username-link` elements
4. On 500ms hover, `showHoverCard()` fetches current profile data
5. Hover card displays name, class, bio, and "View Profile" button
6. Click on username or button navigates to user's profile page

## Testing Checklist

- [ ] Run SQL migration: `SQL FILES/update-posts-display.sql` (optional, not actively used)
- [ ] Test profile settings: Update name/class/bio
- [ ] Check homepage: Old posts should show new name
- [ ] Check post detail page: Post author and replies show new name
- [ ] Check saved posts: Saved posts show new name
- [ ] Check user profile: Posts and replies show current data
- [ ] Test hover cards on homepage
- [ ] Test hover cards on post detail page
- [ ] Test hover cards on saved posts page
- [ ] Test hover cards on profile page
- [ ] Click username to navigate to profile
- [ ] Verify anonymous posts don't show hover cards

## Technical Notes

### Why Joins Instead of Views?
- Better query control and flexibility
- Can select specific fields needed per page
- Easier to add filters and sorting
- No need to grant permissions on views
- Supabase handles foreign key relationships automatically

### Performance Considerations
- Joins add minimal overhead since tables are properly indexed
- Foreign key relationships are cached by PostgreSQL
- Only fetches data when pages load (not real-time)
- Hover cards only fetch profile data on hover (lazy loading)

### Data Consistency
- Posts/replies tables still store original name/class (for history)
- Current display always uses `user_profiles` data
- If user deletes profile, falls back to cached data
- Anonymous posts never show profile data

## Future Enhancements

Consider implementing:
1. Real-time updates using Supabase subscriptions
2. Profile picture/avatar support
3. Badge system for verified users
4. User statistics in hover card (post count, join date)
5. Follow/unfollow functionality in hover card
