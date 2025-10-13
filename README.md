# Sahabat KTB - Discussion Forum

A discussion forum website built with HTML, CSS, JavaScript, and Supabase.

## Features

- 🔐 User authentication (login/signup)
- 📝 Create posts with rich text formatting (bold, italic, links, images, etc.)
- ✏️ Edit and delete your own posts
- 💬 Reply to posts with nested threaded replies
- ❤️ Like posts and replies
- 👤 User profiles with name and class
- ⏰ Friendly timestamps with "(edited)" indicator
- 🎨 Clean, minimal design with dark blue color palette
- 📱 Responsive layout
- 🧭 Sidebar navigation (Home, Updates)
- 📰 Updates page showing website changelog
- 🦶 Footer with copyright information

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to be set up

### 2. Set Up Database

⚠️ **Important**: Only run `migrate.sql` once for initial setup!

In your Supabase project, go to the SQL Editor and run:

**For first-time setup:**
- Copy and paste the contents of `migrate.sql`
- Click "Run"
- ⚠️ This will create all necessary tables, policies, and functions

**For adding features later:**
- Use update scripts (`update-reply-likes.sql`, `update-posts-edit.sql`)
- Never run `migrate.sql` again as it deletes all data!

### 3. Enable Authentication

1. Go to Authentication → Providers in Supabase Dashboard
2. Enable "Email" provider
3. Save changes

### 4. Configure Your Project
CREATE POLICY "Enable read access for all users" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON posts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON replies
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON replies
    FOR INSERT WITH CHECK (true);
```

### 3. Configure Supabase Credentials

1. In your Supabase project, go to Settings → API
2. Copy your Project URL and anon/public key
3. Open `config.js` in this project
4. Replace `YOUR_SUPABASE_URL` with your Project URL
5. Replace `YOUR_SUPABASE_ANON_KEY` with your anon/public key

Example:
```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 5. Run the Website

Open `index.html` in your web browser, or use a local server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (with http-server)
npx http-server
```

Then visit `http://localhost:8000` in your browser.

## File Structure

### HTML Pages
- `index.html` - Home page with post feed
- `new-post.html` - Create new post form
- `edit-post.html` - Edit existing post form
- `post-detail.html` - Individual post view with replies
- `login.html` - Login/signup page
- `updates.html` - Website updates and changelog

### JavaScript Files
- `app.js` - Home page logic
- `new-post.js` - New post creation logic
- `edit-post.js` - Post editing logic
- `post-detail.js` - Post detail and reply logic
- `auth.js` - Authentication logic
- `config.js` - Supabase configuration

### CSS & SQL
- `styles.css` - All styling including sidebar, footer, and responsive design
- `migrate.sql` - Initial database setup (⚠️ destructive)
- `update-reply-likes.sql` - Safe update for reply likes
- `update-posts-edit.sql` - Safe update for post editing
- `setup.sql` - Alternative setup script
- `sample-data.sql` - Sample data for testing

### Documentation
- `README.md` - This file
- `DATABASE-SETUP.md` - Database setup warnings and instructions

## Technologies Used

- HTML5
- CSS3 with CSS Variables
- JavaScript (ES6+)
- Supabase (PostgreSQL database with Row Level Security)
- Supabase Auth (Email/Password authentication)
- Supabase JavaScript Client Library v2
- Google Fonts (Work Sans)

## Color Palette

- Primary Blue: #1a365d
- Accent Blue: #2c5282
- Text Primary: #1a202c
- Text Secondary: #718096
- Background Page: #f7fafc
- Background White: #ffffff
- Border Light: #e2e8f0
- Border Medium: #cbd5e0

## Browser Support

Modern browsers including:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
