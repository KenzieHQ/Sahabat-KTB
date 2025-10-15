# User Profile System

## Overview
A complete user profile and account settings system allowing users to manage their information and view other users' profiles.

## Features

### 1. **Account Settings** (`settings.html`)
Users can edit their profile information:
- ✅ **Name** (required) - Displayed on all posts and comments
- ✅ **Class** (required) - e.g., "12 IPA 1"
- ✅ **Bio** (optional, 500 char max) - Personal description
- ✅ **Email** (read-only) - Cannot be changed

### 2. **User Profile Page** (`profile.html`)
View any user's complete profile:
- **Profile Header** - Name, class, post/reply counts
- **Bio Section** - User's about/bio text
- **Posts Tab** - All posts by the user
- **Replies Tab** - All comments/replies by the user
- **Sorting** - Sort by "Most Recent" or "Most Liked"
- **Edit Button** - Only visible on own profile

### 3. **Hover Cards**
Hover over any username to see:
- Name and class
- Bio (if available)
- "View Profile" button
- Click username to go to full profile

### 4. **Clickable Usernames**
- All usernames throughout the site are now clickable
- Hover to see quick info card
- Click to view full profile
- Anonymous posts/replies remain non-clickable

## Implementation

### Database Changes

#### SQL Migration
Run `SQL FILES/add-user-bio.sql`:
```sql
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;
```

### New Files Created

1. **settings.html** - Account settings page
2. **settings.js** - Settings page logic
3. **profile.html** - User profile page
4. **profile.js** - Profile page logic
5. **user-hover.js** - Hover card functionality
6. **SQL FILES/add-user-bio.sql** - Database migration

### Modified Files

1. **index.html** - Added user-hover.js script
2. **app.js** - Made usernames clickable
3. **styles.css** - Added profile, settings, and hover card styles

### CSS Classes Added

**Profile Styles:**
- `.profile-header` - Profile header container
- `.profile-avatar` - User avatar circle
- `.profile-bio-section` - Bio display area
- `.profile-tabs` - Tab navigation
- `.profile-tab` - Individual tab button
- `.profile-content-section` - Content area
- `.profile-post-card` - Post display card
- `.profile-reply-card` - Reply display card

**Settings Styles:**
- `.settings-container` - Settings form container
- `.settings-form` - Form styling
- `.settings-actions` - Button container

**Hover Card Styles:**
- `.user-hover-card` - Hover card container
- `.username-link` - Clickable username
- `.user-hover-avatar` - Small avatar in hover
- `.user-hover-bio` - Bio text in hover

## Usage

### For Users

**Edit Profile:**
1. Click your name in navigation (once logged in)
2. Click "Account Settings" or "Edit Profile"
3. Update name, class, and bio
4. Click "Save Changes"

**View Profiles:**
1. Hover over any username to see quick info
2. Click username to view full profile
3. Browse their posts and replies
4. Sort by recent or most liked

### For Developers

**Make Username Clickable:**
```javascript
// In any template where username appears
const usernameHTML = post.is_anonymous 
    ? escapeHtml(post.name)
    : `<span class="username-link" data-user-id="${post.user_id}" data-user-name="${escapeHtml(post.name)}">${escapeHtml(post.name)}</span>`;
```

**Initialize Hover Cards:**
```javascript
// After loading content with usernames
if (typeof initializeUserHoverCards === 'function') {
    initializeUserHoverCards();
}
```

**Navigate to Profile:**
```javascript
window.location.href = `profile.html?id=${userId}`;
```

## Navigation Integration

Add to navigation menu (in nav.js):
- "Account Settings" link → `settings.html`
- "View Profile" link → `profile.html` (redirects to own profile)

## Data Flow

1. **User Updates Settings**:
   - Updates `user_profiles` table (name, class, bio)
   - Updates `auth.users` metadata (name, class)

2. **View Profile**:
   - Fetches from `user_profiles` by `user_id`
   - Queries `posts` table for user's posts
   - Queries `replies` table for user's comments

3. **Hover Card**:
   - Fetches profile data on hover
   - Caches for better performance
   - Shows after 500ms hover delay

## Security

- Users can only edit their own profile
- All profiles are viewable by authenticated users
- Anonymous posts/replies don't show user info
- Email addresses are not displayed publicly

## Future Enhancements

- Avatar uploads
- User statistics (total likes received, etc.)
- Follow/friend system
- Private profiles option
- Profile badges/achievements

## Troubleshooting

**Usernames not clickable?**
- Ensure `user-hover.js` is loaded
- Call `initializeUserHoverCards()` after content loads
- Check console for JavaScript errors

**Hover card not showing?**
- Check if `user_id` data attribute is set
- Verify user exists in `user_profiles` table
- Ensure CSS is loaded properly

**Profile page blank?**
- Run the SQL migration to add `bio` column
- Check if `user_id` parameter is in URL
- Verify user exists in database

## Files Structure
```
/
├── profile.html          # User profile page
├── settings.html         # Account settings
├── profile.js            # Profile page logic
├── settings.js           # Settings page logic  
├── user-hover.js         # Hover card utility
├── SQL FILES/
│   └── add-user-bio.sql  # Database migration
└── styles.css            # Updated with profile styles
```
