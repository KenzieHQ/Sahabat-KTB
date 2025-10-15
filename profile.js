// Profile Page JavaScript
let currentUser = null;
let profileUserId = null;
let isOwnProfile = false;
let currentTab = 'posts';
let currentSort = 'recent';

document.addEventListener('DOMContentLoaded', async () => {
    await initializeNavigation('profile');
    await loadProfile();
    
    // Tab switching
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
    
    // Sort change
    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadContent();
    });
    
    // Edit profile button
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        window.location.href = 'settings.html';
    });
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Load user profile
async function loadProfile() {
    try {
        // Get current logged-in user
        const { data: { user } } = await supabaseClient.auth.getUser();
        currentUser = user;
        
        // Get profile user ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        profileUserId = urlParams.get('id');
        
        if (!profileUserId) {
            // No ID provided, show own profile
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            profileUserId = user.id;
        }
        
        isOwnProfile = user && user.id === profileUserId;
        
        // Show edit button if own profile
        if (isOwnProfile) {
            document.getElementById('edit-profile-btn').style.display = 'inline-flex';
        }
        
        // Get profile data
        const { data: profile, error } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('user_id', profileUserId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                await customAlert('User profile not found.', 'Not Found');
                window.location.href = 'index.html';
                return;
            }
            throw error;
        }
        
        // Display profile info
        document.getElementById('profile-name').textContent = profile.name || 'Anonymous User';
        document.getElementById('profile-class').textContent = profile.class || 'No class';
        document.getElementById('profile-bio').textContent = profile.bio || 'No bio added yet.';
        
        // Load content
        await loadContent();
        
        // Initialize icons again
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
    } catch (error) {
        console.error('Error loading profile:', error);
        await customAlert('Failed to load profile. Please try again.', 'Error');
    }
}

// Switch tabs
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Update sections
    document.querySelectorAll('.profile-content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${tab}-section`).classList.add('active');
    
    // Load content
    loadContent();
}

// Load content based on current tab and sort
async function loadContent() {
    if (currentTab === 'posts') {
        await loadUserPosts();
    } else {
        await loadUserReplies();
    }
}

// Load user's posts
async function loadUserPosts() {
    const container = document.getElementById('user-posts-container');
    container.innerHTML = '<div class="loading">Loading posts...</div>';
    
    try {
        let query = supabaseClient
            .from('posts')
            .select('*')
            .eq('user_id', profileUserId)
            .eq('is_anonymous', false); // Only show non-anonymous posts
        
        // Apply sorting
        if (currentSort === 'recent') {
            query = query.order('created_at', { ascending: false });
        } else {
            query = query.order('likes', { ascending: false });
        }
        
        const { data: posts, error } = await query;
        
        if (error) throw error;
        
        // Update count
        document.getElementById('profile-posts-count').textContent = `${posts.length} posts`;
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No posts yet.</p></div>';
            return;
        }
        
        // Display posts
        container.innerHTML = posts.map(post => createPostCard(post)).join('');
        
        // Initialize icons and hover cards
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        if (typeof initializeUserHoverCards === 'function') {
            initializeUserHoverCards();
        }
        
    } catch (error) {
        console.error('Error loading posts:', error);
        container.innerHTML = '<div class="empty-state"><p>Failed to load posts.</p></div>';
    }
}

// Load user's replies
async function loadUserReplies() {
    const container = document.getElementById('user-replies-container');
    container.innerHTML = '<div class="loading">Loading replies...</div>';
    
    try {
        let query = supabaseClient
            .from('replies')
            .select(`
                *,
                post:posts(id, content)
            `)
            .eq('user_id', profileUserId)
            .eq('is_anonymous', false) // Only show non-anonymous replies
            .not('parent_reply_id', 'is', null); // Only top-level replies
        
        // Apply sorting
        if (currentSort === 'recent') {
            query = query.order('created_at', { ascending: false });
        } else {
            query = query.order('likes', { ascending: false });
        }
        
        const { data: replies, error } = await query;
        
        if (error) throw error;
        
        // Update count
        document.getElementById('profile-replies-count').textContent = `${replies.length} replies`;
        
        if (replies.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No replies yet.</p></div>';
            return;
        }
        
        // Display replies
        container.innerHTML = replies.map(reply => createReplyCard(reply)).join('');
        
        // Initialize icons and hover cards
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        if (typeof initializeUserHoverCards === 'function') {
            initializeUserHoverCards();
        }
        
    } catch (error) {
        console.error('Error loading replies:', error);
        container.innerHTML = '<div class="empty-state"><p>Failed to load replies.</p></div>';
    }
}

// Create post card HTML
function createPostCard(post) {
    // Create temporary div to extract text from HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const excerpt = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '');
    
    const date = new Date(post.created_at).toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric' 
    });
    
    return `
        <div class="profile-post-card" onclick="window.location.href='post-detail.html?id=${post.id}'">
            ${post.title ? `<h3 class="post-card-title">${escapeHtml(post.title)}</h3>` : ''}
            <p class="post-card-content">${escapeHtml(excerpt)}</p>
            <div class="post-card-meta">
                <span><i data-lucide="calendar" style="width: 14px; height: 14px;"></i> ${date}</span>
                <span><i data-lucide="heart" style="width: 14px; height: 14px;"></i> ${post.likes || 0}</span>
            </div>
        </div>
    `;
}

// Create reply card HTML
function createReplyCard(reply) {
    const date = new Date(reply.created_at).toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric' 
    });
    
    // Extract text from HTML for post excerpt
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reply.post?.content || '';
    const postText = tempDiv.textContent || tempDiv.innerText || '';
    const postExcerpt = postText.substring(0, 100) + (postText.length > 100 ? '...' : '');
    
    // Extract text from HTML for reply content
    tempDiv.innerHTML = reply.content;
    const replyText = tempDiv.textContent || tempDiv.innerText || '';
    
    return `
        <div class="profile-reply-card" onclick="window.location.href='post-detail.html?id=${reply.post_id}#reply-${reply.id}'">
            <div class="reply-card-context">Replied to: "${escapeHtml(postExcerpt)}"</div>
            <p class="reply-card-content">${escapeHtml(replyText)}</p>
            <div class="post-card-meta">
                <span><i data-lucide="calendar" style="width: 14px; height: 14px;"></i> ${date}</span>
                <span><i data-lucide="heart" style="width: 14px; height: 14px;"></i> ${reply.likes || 0}</span>
            </div>
        </div>
    `;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
