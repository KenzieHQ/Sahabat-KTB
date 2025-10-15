// Settings Page JavaScript
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initializeNavigation('settings');
    await loadUserSettings();
    
    // Character counter for bio
    document.getElementById('settings-bio').addEventListener('input', (e) => {
        document.getElementById('bio-count').textContent = e.target.value.length;
    });
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Load current user settings
async function loadUserSettings() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        
        // Get user profile
        const { data: profile, error } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        // Populate form
        document.getElementById('settings-email').value = user.email;
        document.getElementById('settings-name').value = profile?.name || user.user_metadata.name || '';
        document.getElementById('settings-class').value = profile?.class || user.user_metadata.class || '';
        document.getElementById('settings-bio').value = profile?.bio || '';
        document.getElementById('bio-count').textContent = (profile?.bio || '').length;
        
    } catch (error) {
        console.error('Error loading settings:', error);
        await customAlert('Failed to load your settings. Please try again.', 'Error');
    }
}

// Handle form submission
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    try {
        const name = document.getElementById('settings-name').value.trim();
        const classValue = document.getElementById('settings-class').value.trim();
        const bio = document.getElementById('settings-bio').value.trim();
        
        if (!name || !classValue) {
            await customAlert('Name and Class are required fields.', 'Validation Error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
            return;
        }
        
        // Update user_profiles table
        const { error: profileError } = await supabaseClient
            .from('user_profiles')
            .upsert({
                user_id: currentUser.id,
                email: currentUser.email,
                name: name,
                class: classValue,
                bio: bio,
                last_sign_in: new Date().toISOString()
            }, { onConflict: 'user_id' });
        
        if (profileError) throw profileError;
        
        // Update auth metadata
        const { error: metadataError } = await supabaseClient.auth.updateUser({
            data: {
                name: name,
                class: classValue
            }
        });
        
        if (metadataError) throw metadataError;
        
        await customAlert('Your profile has been updated successfully!', 'Success');
        
        // Redirect back or to profile
        setTimeout(() => {
            window.location.href = `profile.html?id=${currentUser.id}`;
        }, 1500);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        await customAlert('Failed to save your settings. Please try again.', 'Error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
});
