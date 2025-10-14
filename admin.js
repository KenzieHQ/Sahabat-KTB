// Check if user is admin
async function checkAdmin() {
    const navData = await initializeNavigation('admin');
    
    if (!navData.isAdmin) {
        await customAlert('Access denied. You must be an admin to view this page.', 'Unauthorized');
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// Format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Sync user profiles from auth.users (manual sync since trigger was removed)
async function syncUserProfiles() {
    try {
        // This requires querying auth.users which we can't do directly from client
        // So we'll just ensure current users exist in user_profiles
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;
        
        // Insert current user if not exists
        const { error } = await supabaseClient
            .from('user_profiles')
            .upsert([{
                user_id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata.name || null,
                class: session.user.user_metadata.class || null,
                last_sign_in: session.user.last_sign_in_at
            }], { onConflict: 'user_id' });
        
        if (error && error.code !== '23505') { // Ignore duplicate errors
            console.error('Error syncing user profile:', error);
        }
    } catch (error) {
        console.error('Error in syncUserProfiles:', error);
    }
}

// Load all users
async function loadUsers() {
    try {
        // First, sync all users from auth.users to user_profiles
        await syncUserProfiles();
        
        // Get all user profiles
        const { data: profiles, error: profilesError } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (profilesError) throw profilesError;
        
        // Get all admins
        const { data: admins, error: adminsError } = await supabaseClient
            .from('admins')
            .select('user_id');
        
        if (adminsError) throw adminsError;
        
        const adminUserIds = new Set(admins.map(a => a.user_id));
        
        // Update stats
        document.getElementById('total-users').textContent = profiles.length;
        document.getElementById('total-admins').textContent = admins.length;
        
        // Build table
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        
        profiles.forEach(profile => {
            const isAdmin = adminUserIds.has(profile.user_id);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="user-name">${escapeHtml(profile.name || 'N/A')}</td>
                <td class="user-email">${escapeHtml(profile.email)}</td>
                <td class="user-class">${escapeHtml(profile.class || 'N/A')}</td>
                <td class="user-signin">${formatTimestamp(profile.last_sign_in)}</td>
                <td>
                    <select class="role-select" data-user-id="${profile.user_id}" onchange="updateUserRole('${profile.user_id}', this.value)">
                        <option value="standard" ${!isAdmin ? 'selected' : ''}>Standard</option>
                        <option value="admin" ${isAdmin ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <button class="btn-delete-user" onclick="deleteUser('${profile.user_id}', '${escapeHtml(profile.email)}')" title="Delete user">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Show table, hide loading
        document.getElementById('loading-users').style.display = 'none';
        document.getElementById('users-table-container').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading users:', error);
        await customAlert('Failed to load users. Please try again.', 'Error');
    }
}

// Update user role (promote to admin or demote to standard)
async function updateUserRole(userId, newRole) {
    try {
        console.log('Updating user role:', userId, 'to', newRole);
        
        if (newRole === 'admin') {
            // Add to admins table
            const { data, error } = await supabaseClient
                .from('admins')
                .insert([{ user_id: userId }])
                .select();
            
            console.log('Insert result:', { data, error });
            
            if (error) {
                // Check if already admin
                if (error.code === '23505') {
                    await customAlert('User is already an admin.', 'Info');
                    return;
                }
                console.error('Error promoting to admin:', error);
                throw error;
            }
            
            await customAlert('User promoted to admin successfully!', 'Success');
        } else {
            // Remove from admins table
            const { data, error } = await supabaseClient
                .from('admins')
                .delete()
                .eq('user_id', userId)
                .select();
            
            console.log('Delete result:', { data, error });
            
            if (error) {
                console.error('Error demoting from admin:', error);
                throw error;
            }
            
            await customAlert('User demoted to standard user.', 'Success');
        }
        
        // Reload users
        await loadUsers();
        
    } catch (error) {
        console.error('Error updating user role:', error);
        await customAlert('Failed to update user role: ' + error.message, 'Error');
        // Reload to reset the dropdown
        await loadUsers();
    }
}

// Delete user
async function deleteUser(userId, userEmail) {
    const confirmed = await customConfirm(
        `Are you sure you want to delete the user "${userEmail}"? This will permanently delete their account and all their posts and replies. This action cannot be undone.`,
        'Delete User'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        // Delete user from auth.users using admin API
        // Note: This requires service role key, so we need to use a Supabase RPC function
        
        console.log('Attempting to delete user:', userId);
        
        // Try to delete via RPC function (if it exists)
        const { data: rpcData, error: rpcError } = await supabaseClient
            .rpc('delete_user_as_admin', { user_id_to_delete: userId });
        
        if (rpcError) {
            console.error('RPC delete failed:', rpcError);
            
            // Fallback: Just remove from admin panel view
            const { error: profileError } = await supabaseClient
                .from('user_profiles')
                .delete()
                .eq('user_id', userId);
            
            if (profileError) throw profileError;
            
            await customAlert(
                'User removed from admin panel. However, they can still log in. ' +
                'To permanently delete, go to Supabase Dashboard > Authentication > Users, ' +
                'find the user and click the delete icon, or use the SQL script in delete-user.sql.',
                'Partially Deleted'
            );
        } else {
            await customAlert('User account deleted successfully!', 'Success');
        }
        
        // Reload users
        await loadUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        await customAlert('Failed to delete user. Please try again.', 'Error');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (isAdmin) {
        await loadUsers();
    }
});
