#!/bin/bash

# Batch update script for centralized navigation
# This updates the remaining pages to use nav.js

echo "Updating remaining pages to use centralized navigation..."

# Update post-detail.html - add nav.js script
sed -i '' 's/<script src="post-detail.js"><\/script>/<script src="nav.js"><\/script>\n    <script src="post-detail.js"><\/script>/g' post-detail.html

# Update guidelines.html - add nav.js script before inline script
sed -i '' 's/<script src="auth.js"><\/script>/<script src="auth.js"><\/script>\n    <script src="nav.js"><\/script>/g' guidelines.html

# Update updates.html - add nav.js script
sed -i '' 's/<script src="modal.js"><\/script>/<script src="modal.js"><\/script>\n    <script src="nav.js"><\/script>/g' updates.html

# Update admin.html - add nav.js script
sed -i '' 's/<script src="admin.js"><\/script>/<script src="nav.js"><\/script>\n    <script src="admin.js"><\/script>/g' admin.html

echo "Done! Scripts added to remaining HTML files."
echo "Now you need to manually update the JS init code and simplify HTML headers/sidebars."
