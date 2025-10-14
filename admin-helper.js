// Admin helper functions to be included in all pages

// Check if current user is admin
async function isCurrentUserAdmin() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return false;
        
        const { data: adminData, error } = await supabaseClient
            .from('admins')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        
        return !error && adminData;
    } catch (error) {
        return false;
    }
}

// Show admin link in sidebar if user is admin
async function showAdminLinkIfAdmin() {
    const isAdmin = await isCurrentUserAdmin();
    if (isAdmin) {
        const sidebar = document.querySelector('.sidebar-nav');
        if (sidebar && !document.querySelector('.nav-item[href="admin.html"]')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.className = 'nav-item';
            adminLink.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Admin Panel</span>
            `;
            sidebar.appendChild(adminLink);
        }
    }
}
