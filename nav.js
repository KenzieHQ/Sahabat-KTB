// Shared Navigation Component
// This file handles both navbar and sidebar rendering across all pages

// Render the header content
function renderHeader(userName) {
    return `
        <div class="container">
            <div class="header-content">
                <h1><a href="index.html" class="site-title">Sahabat KTB</a></h1>
                <div class="user-info">
                    <span id="user-name">${userName}</span>
                    <button class="btn-logout" id="logout-btn">Logout</button>
                </div>
            </div>
        </div>
    `;
}

// Render the sidebar
function renderSidebar(currentPage, isAdmin = false) {
    const navItems = [
        { href: 'index.html', icon: 'home', label: 'Home', page: 'index' },
        { href: 'new-post.html', icon: 'plus', label: 'New Post', page: 'new-post' },
        { href: 'guidelines.html', icon: 'book', label: 'Guidelines', page: 'guidelines' },
        { href: 'updates.html', icon: 'clock', label: 'Updates', page: 'updates' }
    ];

    // Add admin link if user is admin
    if (isAdmin) {
        navItems.push({ href: 'admin.html', icon: 'users', label: 'Admin Panel', page: 'admin' });
    }

    const icons = {
        home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>`,
        plus: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>`,
        book: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>`,
        clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>`,
        users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>`
    };

    let navHTML = '';
    navItems.forEach(item => {
        const isActive = currentPage === item.page ? 'active' : '';
        navHTML += `
            <a href="${item.href}" class="nav-item ${isActive}">
                ${icons[item.icon]}
                <span>${item.label}</span>
            </a>
        `;
    });

    return `
        <nav class="sidebar-nav">
            ${navHTML}
        </nav>
        <div class="sidebar-footer">
            <p>&copy; 2025 Sahabat KTB.<br>All rights reserved.<br>Created by Pacifora Group.</p>
        </div>
    `;
}

// Initialize navigation on page load
async function initializeNavigation(currentPage) {
    try {
        // Check authentication
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }

        // Get user name
        const userName = session.user.user_metadata.name || session.user.email;

        // Check if user is admin
        const { data: adminData } = await supabaseClient
            .from('admins')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        
        const isAdmin = !!adminData;

        // Render header
        const header = document.querySelector('header');
        if (header) {
            header.innerHTML = renderHeader(userName);
            
            // Add logout handler
            document.getElementById('logout-btn').addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });
        }

        // Render sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.innerHTML = renderSidebar(currentPage, isAdmin);
        }

        return { session, isAdmin, user: session.user };
    } catch (error) {
        console.error('Error initializing navigation:', error);
        return null;
    }
}
