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

// Manual sync all users (call SQL function)
async function manualSyncAllUsers() {
    try {
        const btn = event.target.closest('button');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"></i> Syncing...';
        
        // Call the SQL to sync all users from auth.users to user_profiles
        const { error } = await supabaseClient.rpc('sync_all_users');
        
        if (error) {
            console.error('Error syncing users:', error);
            await customAlert('Could not sync users. Make sure the database trigger is set up.', 'Sync Failed');
        } else {
            await customAlert('All users have been synced successfully!', 'Sync Complete');
        }
        
        // Reload the users table
        await loadUsers();
        
        // Reset button
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i> Refresh Users';
        lucide.createIcons();
    } catch (error) {
        console.error('Error in manualSyncAllUsers:', error);
        await customAlert('An error occurred while syncing users.', 'Error');
    }
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
        
        // Get all admins using RPC function
        const { data: admins, error: adminsError } = await supabaseClient
            .rpc('get_admin_user_ids');
        
        console.log('Admins fetched:', admins);
        
        if (adminsError) {
            console.error('Error fetching admins:', adminsError);
            throw adminsError;
        }
        
        const adminUserIds = new Set((admins || []).map(a => a.user_id));
        
        // Update stats
        document.getElementById('total-users').textContent = profiles.length;
        document.getElementById('total-admins').textContent = adminUserIds.size;
        
        // Build table
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        
        profiles.forEach(profile => {
            const isAdmin = adminUserIds.has(profile.user_id);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="user-name">
                    <a href="profile.html?id=${profile.user_id}" class="admin-user-link" title="View profile">
                        ${escapeHtml(profile.name || 'N/A')}
                    </a>
                </td>
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
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Show table, hide loading
        document.getElementById('loading-users').style.display = 'none';
        document.getElementById('users-table-container').style.display = 'block';
        
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
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
            // Call database function to promote user
            const { data, error } = await supabaseClient
                .rpc('promote_to_admin', { target_user_id: userId });
            
            console.log('Promote result:', { data, error });
            
            if (error) {
                console.error('Error promoting to admin:', error);
                throw new Error(error.message);
            }
            
            if (!data.success) {
                await customAlert(data.error || 'Failed to promote user', 'Error');
                return;
            }
            
            await customAlert(data.message || 'User promoted to admin successfully!', 'Success');
        } else {
            // Call database function to demote user
            const { data, error } = await supabaseClient
                .rpc('demote_from_admin', { target_user_id: userId });
            
            console.log('Demote result:', { data, error });
            
            if (error) {
                console.error('Error demoting from admin:', error);
                throw new Error(error.message);
            }
            
            if (!data.success) {
                await customAlert(data.error || 'Failed to demote user', 'Error');
                return;
            }
            
            await customAlert(data.message || 'User demoted to standard user.', 'Success');
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

// ============= Push Notification Functions =============

// Show/close modal
function showModal(title, content) {
    const modal = document.createElement('div');
    modal.id = 'admin-push-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-white); border-radius: 12px; padding: 2rem; max-width: 550px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <h2 style="margin: 0 0 1.5rem 0; color: var(--text-primary); font-size: 1.5rem; font-weight: 600;">${title}</h2>
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function closeModal() {
    const modal = document.getElementById('admin-push-modal');
    if (modal) modal.remove();
}

// Show push notification modal
async function showPushNotificationModal() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    // Get all users for selection
    const { data: profiles } = await supabaseClient
        .from('user_profiles')
        .select('user_id, name, email')
        .order('name');

    const userOptions = profiles ? profiles.map(p => 
        `<option value="${p.user_id}">${escapeHtml(p.name || p.email)}</option>`
    ).join('') : '';

    const content = `
        <form id="push-notification-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label for="notification-recipient" style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">Send to:</label>
                <select id="notification-recipient" style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-light); border-radius: 6px; font-size: 0.95rem; background: var(--bg-white); color: var(--text-primary); font-family: inherit; transition: border-color 0.2s ease;" required>
                    <option value="all">All Users</option>
                    <option value="specific">Specific User</option>
                </select>
            </div>
            <div id="user-select-group" style="display: none; flex-direction: column; gap: 0.5rem;">
                <label for="notification-user" style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">Select User:</label>
                <select id="notification-user" style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-light); border-radius: 6px; font-size: 0.95rem; background: var(--bg-white); color: var(--text-primary); font-family: inherit; transition: border-color 0.2s ease;">
                    ${userOptions}
                </select>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label for="notification-message" style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">Message:</label>
                <textarea id="notification-message" rows="4" maxlength="200" 
                    placeholder="Enter your notification message (max 200 characters)" 
                    style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-light); border-radius: 6px; font-size: 0.95rem; resize: vertical; font-family: inherit; transition: border-color 0.2s ease;" required></textarea>
                <small style="color: var(--text-secondary); font-size: 0.85rem;">Character count: <span id="char-count">0</span>/200</small>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label for="notification-link" style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">Link (optional):</label>
                <input type="text" id="notification-link" 
                    placeholder="e.g., guidelines.html or post-detail.html?id=123"
                    style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-light); border-radius: 6px; font-size: 0.95rem; font-family: inherit; transition: border-color 0.2s ease;">
            </div>
            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button type="button" onclick="closeModal()" style="padding: 0.65rem 1.25rem; border: 1px solid var(--border-medium); background: transparent; color: var(--text-secondary); border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 0.9rem; font-family: inherit; transition: all 0.2s;">Cancel</button>
                <button type="submit" style="padding: 0.65rem 1.25rem; border: none; background: var(--primary-blue); color: white; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 0.9rem; font-family: inherit; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s;">
                    <i data-lucide="send" style="width: 16px; height: 16px;"></i>
                    Send Notification
                </button>
            </div>
        </form>
    `;

    showModal('Send Push Notification', content);

    // Add event listeners
    document.getElementById('notification-recipient').addEventListener('change', (e) => {
        const userGroup = document.getElementById('user-select-group');
        userGroup.style.display = e.target.value === 'specific' ? 'block' : 'none';
    });

    document.getElementById('notification-message').addEventListener('input', (e) => {
        document.getElementById('char-count').textContent = e.target.value.length;
    });

    // Add focus effects to inputs
    const inputs = document.querySelectorAll('#push-notification-form select, #push-notification-form textarea, #push-notification-form input[type="text"]');
    inputs.forEach(input => {
        input.addEventListener('focus', (e) => {
            e.target.style.borderColor = 'var(--accent-blue)';
            e.target.style.outline = 'none';
        });
        input.addEventListener('blur', (e) => {
            e.target.style.borderColor = 'var(--border-light)';
        });
    });

    // Add hover effects to buttons
    const cancelBtn = document.querySelector('#push-notification-form button[type="button"]');
    const submitBtn = document.querySelector('#push-notification-form button[type="submit"]');
    
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = 'var(--bg-page)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = 'transparent';
    });
    
    submitBtn.addEventListener('mouseenter', () => {
        submitBtn.style.backgroundColor = 'var(--accent-blue)';
    });
    submitBtn.addEventListener('mouseleave', () => {
        submitBtn.style.backgroundColor = 'var(--primary-blue)';
    });

    document.getElementById('push-notification-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendPushNotification();
    });

    lucide.createIcons();
}

// Send push notification
async function sendPushNotification() {
    try {
        const recipient = document.getElementById('notification-recipient').value;
        const message = document.getElementById('notification-message').value.trim();
        const link = document.getElementById('notification-link').value.trim();

        if (!message) {
            await customAlert('Please enter a notification message.', 'Error');
            return;
        }

        let userIds = [];

        if (recipient === 'all') {
            // Get all user IDs
            const { data: profiles } = await supabaseClient
                .from('user_profiles')
                .select('user_id');
            
            userIds = profiles.map(p => p.user_id);
        } else {
            // Get specific user
            const userId = document.getElementById('notification-user').value;
            userIds = [userId];
        }

        // Create notifications for all selected users
        const notifications = userIds.map(userId => ({
            user_id: userId,
            type: 'admin_notification',
            content: message,
            link: link || null,
            read: false
        }));

        const { error } = await supabaseClient
            .from('notifications')
            .insert(notifications);

        if (error) throw error;

        closeModal();
        await customAlert(
            `Notification sent to ${userIds.length} user${userIds.length !== 1 ? 's' : ''}!`, 
            'Success'
        );

    } catch (error) {
        console.error('Error sending notification:', error);
        await customAlert('Failed to send notification. Please try again.', 'Error');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (isAdmin) {
        await loadUsers();
    }
});
