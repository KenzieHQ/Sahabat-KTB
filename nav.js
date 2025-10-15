// Shared Navigation Component
// This file handles both navbar and sidebar rendering across all pages

// Render the header content
function renderHeader(userName, userId) {
    return `
        <div class="container">
            <div class="header-content">
                <h1><a href="index.html" class="site-title">
                    <img src="logo.svg" alt="Thinkery" class="site-logo" style="height: 32px; width: auto; vertical-align: middle;">
                </a></h1>
                <div class="user-info">
                    <span id="user-name">${userName}</span>
                    <div class="user-menu-container">
                        <button class="btn-user-menu" id="user-menu-btn">
                            <i data-lucide="more-vertical" style="width: 20px; height: 20px;"></i>
                        </button>
                        <div class="user-menu-dropdown" id="user-menu-dropdown">
                            <a href="profile.html?id=${userId}" class="user-menu-item">
                                <i data-lucide="user" style="width: 16px; height: 16px;"></i>
                                <span>View Profile</span>
                            </a>
                            <a href="settings.html" class="user-menu-item">
                                <i data-lucide="settings" style="width: 16px; height: 16px;"></i>
                                <span>Account Settings</span>
                            </a>
                            <div class="user-menu-divider"></div>
                            <button class="user-menu-item" id="logout-btn">
                                <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
                                <span>Log Out</span>
                            </button>
                        </div>
                    </div>
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
        { href: 'saved.html', icon: 'bookmark', label: 'Saved', page: 'saved' },
        { href: 'guidelines.html', icon: 'book', label: 'Guidelines', page: 'guidelines' },
        { href: 'updates.html', icon: 'clock', label: 'Updates', page: 'updates' }
    ];

    // Add admin link if user is admin
    if (isAdmin) {
        navItems.push({ href: 'admin.html', icon: 'users', label: 'Admin Panel', page: 'admin' });
    }

    const icons = {
        home: `<i data-lucide="home" style="width: 20px; height: 20px;"></i>`,
        plus: `<i data-lucide="plus-circle" style="width: 20px; height: 20px;"></i>`,
        book: `<i data-lucide="book-open" style="width: 20px; height: 20px;"></i>`,
        clock: `<i data-lucide="clock" style="width: 20px; height: 20px;"></i>`,
        users: `<i data-lucide="users" style="width: 20px; height: 20px;"></i>`,
        bookmark: `<i data-lucide="bookmark" style="width: 20px; height: 20px;"></i>`
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
            <p>&copy; 2025 Thinkery.<br>All rights reserved.<br>Created by Pacifora Group.</p>
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
        const userId = session.user.id;

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
            header.innerHTML = renderHeader(userName, userId);
            
            // Add menu toggle handler
            const menuBtn = document.getElementById('user-menu-btn');
            const menuDropdown = document.getElementById('user-menu-dropdown');
            
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menuDropdown.classList.toggle('show');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
                    menuDropdown.classList.remove('show');
                }
            });
            
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

        // Initialize Lucide icons after DOM update
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        return { session, isAdmin, user: session.user };
    } catch (error) {
        console.error('Error initializing navigation:', error);
        return null;
    }
}
