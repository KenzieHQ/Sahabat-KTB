# Mobile View Notice

## Overview
A full-screen overlay that displays on mobile devices (screens ≤768px) informing users that the mobile version is still in development.

## Features
- **Full-screen white overlay** - Covers the entire page
- **Computer icon** - Visual indicator using Lucide's "monitor" icon
- **Clear messaging** - Informs users to use desktop/laptop
- **Highest z-index** - Ensures it appears above all content
- **Responsive trigger** - Only shows on screens 768px and below

## Implementation

### HTML Structure (Added to all pages)
```html
<div class="mobile-notice-overlay">
    <div class="mobile-notice-content">
        <i data-lucide="monitor" style="width: 80px; height: 80px; stroke-width: 1.5;"></i>
        <h2>Desktop Only</h2>
        <p>Mobile view is still in progress.</p>
        <p>Please use a computer or laptop to access Thinkery for now.</p>
    </div>
</div>
```

### CSS Styles
- `.mobile-notice-overlay` - Fixed position overlay, hidden by default
- `.mobile-notice-content` - Centered content with padding
- `@media (max-width: 768px)` - Shows overlay on mobile devices

### Files Modified
1. **index.html** - Home page
2. **login.html** - Login/signup page
3. **new-post.html** - Create post page
4. **edit-post.html** - Edit post page
5. **post-detail.html** - Post detail page
6. **saved.html** - Saved posts page
7. **admin.html** - Admin panel
8. **updates.html** - Updates page
9. **guidelines.html** - Guidelines page
10. **styles.css** - Added mobile notice styles

## User Experience
- **Desktop users (>768px)**: Normal website experience
- **Mobile users (≤768px)**: See only the mobile notice overlay
- **Icon**: Clean monitor/computer icon in primary blue color
- **Typography**: Clear, readable heading and body text

## Future Improvements
When mobile view is ready:
1. Remove the `.mobile-notice-overlay` div from all HTML files
2. Remove the mobile notice CSS from styles.css
3. Test all responsive styles work correctly
