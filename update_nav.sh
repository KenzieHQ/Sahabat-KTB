#!/bin/bash

# This script will show what needs to be updated
echo "=== Pages that need nav.js update ==="
echo ""
echo "Files to modify:"
grep -l "class=\"sidebar\"" *.html | grep -v login.html | grep -v index.html
echo ""
echo "To apply changes, each page needs:"
echo "1. Simplify <header> to just <header></header>"
echo "2. Simplify <aside class=\"sidebar\"> to <aside class=\"sidebar\"></aside>"
echo "3. Add <script src=\"nav.js\"></script> before the page's main JS"
