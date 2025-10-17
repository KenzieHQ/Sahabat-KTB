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
                        <button class="btn-notifications" id="notifications-btn">
                            <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
                            <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
                        </button>
                        <button class="btn-user-menu" id="user-menu-btn">
                            <i data-lucide="more-vertical" style="width: 20px; height: 20px;"></i>
                        </button>
                        <div class="notifications-dropdown" id="notifications-dropdown">
                            <div class="notifications-header">
                                <h3>Notifications</h3>
                                <button class="btn-mark-read" id="mark-all-read">Mark all as read</button>
                            </div>
                            <div class="notifications-list" id="notifications-list">
                                <div class="no-notifications">No new notifications</div>
                            </div>
                        </div>
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
    const mainNavItems = [
        { href: 'index.html', icon: 'home', label: 'Home', page: 'index' },
        { href: 'new-post.html', icon: 'plus', label: 'New Post', page: 'new-post' },
        { href: 'saved.html', icon: 'bookmark', label: 'Saved', page: 'saved' }
    ];

    const secondaryNavItems = [
        { href: 'guidelines.html', icon: 'book', label: 'Guidelines', page: 'guidelines' },
        { href: 'updates.html', icon: 'clock', label: 'Updates', page: 'updates' }
    ];

    // Add admin link if user is admin
    if (isAdmin) {
        secondaryNavItems.push({ href: 'admin.html', icon: 'users', label: 'Admin Panel', page: 'admin' });
    }

    const icons = {
        home: `<i data-lucide="home" style="width: 20px; height: 20px;"></i>`,
        plus: `<i data-lucide="plus-circle" style="width: 20px; height: 20px;"></i>`,
        book: `<i data-lucide="book-open" style="width: 20px; height: 20px;"></i>`,
        clock: `<i data-lucide="clock" style="width: 20px; height: 20px;"></i>`,
        users: `<i data-lucide="users" style="width: 20px; height: 20px;"></i>`,
        bookmark: `<i data-lucide="bookmark" style="width: 20px; height: 20px;"></i>`
    };

    let mainNavHTML = '';
    mainNavItems.forEach(item => {
        const isActive = currentPage === item.page ? 'active' : '';
        mainNavHTML += `
            <a href="${item.href}" class="nav-item ${isActive}">
                ${icons[item.icon]}
                <span>${item.label}</span>
            </a>
        `;
    });

    let secondaryNavHTML = '';
    secondaryNavItems.forEach(item => {
        const isActive = currentPage === item.page ? 'active' : '';
        secondaryNavHTML += `
            <a href="${item.href}" class="nav-item ${isActive}">
                ${icons[item.icon]}
                <span>${item.label}</span>
            </a>
        `;
    });

    return `
        <nav class="sidebar-nav">
            ${mainNavHTML}
            <div class="nav-divider"></div>
            ${secondaryNavHTML}
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
            const notificationsBtn = document.getElementById('notifications-btn');
            const notificationsDropdown = document.getElementById('notifications-dropdown');
            
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationsDropdown.classList.remove('show');
                menuDropdown.classList.toggle('show');
            });

            notificationsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menuDropdown.classList.remove('show');
                notificationsDropdown.classList.toggle('show');
                if (notificationsDropdown.classList.contains('show')) {
                    loadNotifications(userId);
                }
            });
            
            // Close menus when clicking outside
            document.addEventListener('click', (e) => {
                if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
                    menuDropdown.classList.remove('show');
                }
                if (!notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
                    notificationsDropdown.classList.remove('show');
                }
            });
            
            // Add mark all as read handler
            document.getElementById('mark-all-read').addEventListener('click', () => {
                markAllNotificationsRead(userId);
            });
            
            // Add logout handler
            document.getElementById('logout-btn').addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });

            // Load initial notification count
            updateNotificationBadge(userId);
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

// Notification Functions
async function updateNotificationBadge(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;

        const badge = document.getElementById('notification-badge');
        if (data && data.length > 0) {
            badge.textContent = data.length > 99 ? '99+' : data.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating notification badge:', error);
    }
}

async function loadNotifications(userId) {
    try {
        // Fetch notifications
        const { data: notifications, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const notificationsList = document.getElementById('notifications-list');
        
        if (!notifications || notifications.length === 0) {
            notificationsList.innerHTML = '<div class="no-notifications">No notifications yet</div>';
            return;
        }

        // Fetch actor details for all notifications
        const actorIds = [...new Set(notifications.map(n => n.actor_id).filter(Boolean))];
        let actorMap = {};
        
        if (actorIds.length > 0) {
            const { data: actors } = await supabaseClient
                .from('user_profiles')
                .select('user_id, name, class')
                .in('user_id', actorIds);
            
            if (actors) {
                actorMap = Object.fromEntries(actors.map(a => [a.user_id, a]));
            }
        }

        notificationsList.innerHTML = notifications.map(notif => {
            const actor = actorMap[notif.actor_id];
            const actorName = actor?.name || 'Someone';
            const timeAgo = formatNotificationTime(notif.created_at);
            const unreadClass = notif.read ? '' : 'unread';
            
            let message = '';
            let link = '';
            
            if (notif.type === 'post_like') {
                message = `<strong>${actorName}</strong> liked your post`;
                link = `post-detail.html?id=${notif.post_id}`;
            } else if (notif.type === 'post_reply') {
                message = `<strong>${actorName}</strong> replied to your post`;
                link = `post-detail.html?id=${notif.post_id}`;
            } else if (notif.type === 'reply_reply') {
                message = `<strong>${actorName}</strong> replied to your comment`;
                link = `post-detail.html?id=${notif.post_id}`;
            } else if (notif.type === 'admin_notification') {
                message = `<strong>Website Moderator:</strong> ${notif.content}`;
                link = notif.link || '#';
            }

            return `
                <a href="${link}" class="notification-item ${unreadClass}" data-notification-id="${notif.id}">
                    <div class="notification-content">
                        <p>${message}</p>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    ${!notif.read ? '<div class="notification-dot"></div>' : ''}
                </a>
            `;
        }).join('');

        // Add click handlers to mark as read
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.addEventListener('click', async (e) => {
                const notifId = item.dataset.notificationId;
                await markNotificationRead(notifId, userId);
            });
        });

    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function markNotificationRead(notificationId, userId) {
    try {
        await supabaseClient
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
        
        updateNotificationBadge(userId);
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsRead(userId) {
    try {
        await supabaseClient
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);
        
        updateNotificationBadge(userId);
        loadNotifications(userId);
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
}
