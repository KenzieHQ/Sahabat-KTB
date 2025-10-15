# Admin-Editable Guidelines System

## Overview
The guidelines page is now a fully editable content management system where admins can create and update community guidelines with rich text formatting.

## Features

### 🎨 Design
- **Pure White Background**: The guidelines page has a completely white background, different from all other pages
- **Clean Layout**: Centered content (900px max-width) with generous padding
- **Professional Typography**: Larger text (1rem) with relaxed line-height (1.8)

### ✏️ Rich Text Editor (Admin Only)
Admins have access to a full-featured editor with:
- **Text Formatting**: Bold, Italic, Underline
- **Headings**: H2 and H3 for section titles
- **Lists**: Bullet points and numbered lists
- **Blockquotes**: For emphasis or callouts
- **Links**: Insert hyperlinks
- **Images**: Add images via URL
- **Clean Paste**: Automatically strips unwanted formatting

### 📊 Features
- **Last Edited**: Shows timestamp of last update
- **Auto-save to Database**: Content stored in Supabase
- **Admin-Only Editing**: Only users with admin role can edit
- **Live Preview**: See changes immediately after saving

## Setup Instructions

### 1. Run SQL Migration
Execute this in your Supabase SQL Editor:
```sql
-- From: SQL FILES/setup-site-content.sql
```

This creates:
- `site_content` table to store guidelines
- RLS policies (everyone can read, only admins can edit)
- Initial empty guidelines entry

### 2. Database Schema
```sql
site_content (
    id            BIGSERIAL PRIMARY KEY,
    page          TEXT UNIQUE NOT NULL,
    content       TEXT NOT NULL,
    updated_by    UUID REFERENCES auth.users(id),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at    TIMESTAMPTZ DEFAULT NOW()
)
```

## How to Use

### For Admins
1. **Navigate** to the Guidelines page
2. **Click** "Edit Guidelines" button (only visible to admins)
3. **Use the toolbar** to format your content:
   - Bold/Italic/Underline text
   - Add headings for sections
   - Create bullet or numbered lists
   - Insert quotes, links, or images
4. **Click "Save Guidelines"** when done
5. Content is immediately visible to all users

### For Regular Users
- View the published guidelines
- See "Last edited" timestamp
- No edit button visible
- Clean, readable layout

## File Structure

### New Files Created
1. **guidelines-editor.js** - JavaScript for the editor functionality
2. **SQL FILES/setup-site-content.sql** - Database setup

### Modified Files
1. **guidelines.html** - Complete redesign with editor
2. **styles.css** - Added `.guidelines-page` styles

## Styling Details

### Special Guidelines Page Classes
- `.guidelines-page` - Body class for white background
- `.guidelines-main` - Main content area (900px centered)
- `.guidelines-container` - Content wrapper with padding
- `.guidelines-header-section` - Title and meta section
- `.btn-edit-guidelines` - Admin edit button
- `.guidelines-content-display` - Content display area
- `.editor-actions` - Save/Cancel buttons

### Typography
- H1 (Page Title): 2.5rem, bold, blue
- H2 (Sections): 1.75rem, semi-bold, blue
- H3 (Subsections): 1.375rem, semi-bold
- Body: 1rem, line-height 1.8
- Links: Blue with underline, hover darkens

## Technical Implementation

### Admin Check
```javascript
const { data } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

if (data.role === 'admin') {
    // Show edit button
}
```

### Content Save
```javascript
await supabaseClient
    .from('site_content')
    .upsert({
        page: 'guidelines',
        content: editorContent,
        updated_by: user.id,
        updated_at: new Date()
    }, { onConflict: 'page' });
```

### Content Load
```javascript
const { data } = await supabaseClient
    .from('site_content')
    .select('*')
    .eq('page', 'guidelines')
    .single();
```

## Future Enhancements (Optional)
- Version history/revisions
- Auto-save drafts
- Multiple admin editors with conflict resolution
- Export guidelines as PDF
- Image upload (not just URL)
- Markdown support
- Search within guidelines

## Security
- ✅ RLS policies ensure only admins can edit
- ✅ All users (authenticated) can read
- ✅ Content is sanitized on paste
- ✅ User ID tracked for audit trail

## Best Practices for Admins
1. **Structure Content**: Use headings to organize sections
2. **Keep it Clear**: Write in simple, understandable language
3. **Use Lists**: Make rules easy to scan
4. **Add Links**: Link to relevant resources if needed
5. **Review Before Saving**: Content goes live immediately
6. **Save Frequently**: Use the save button regularly

## Troubleshooting

### Edit Button Not Showing
- Verify user has `role = 'admin'` in users table
- Check browser console for errors
- Ensure user is logged in

### Content Not Saving
- Check Supabase connection in config.js
- Verify RLS policies are correctly set
- Check browser console for error messages

### Formatting Not Working
- Ensure content editor has focus
- Try refreshing the page
- Clear browser cache

## Support
For issues or questions about the guidelines editor, contact the development team.
