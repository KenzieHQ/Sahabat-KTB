// Saved Posts Page JavaScript

let currentUserId = null;
let isAdmin = false;

// Toggle save/bookmark on a post
async function toggleSave(postId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const saveButton = document.querySelector(`[data-post-id="${postId}"] .btn-save`);
    if (!saveButton) return;
    
    const isSaved = saveButton.classList.contains('saved');
    
    try {
        if (isSaved) {
            // Unsave
            const { error } = await supabaseClient
                .from('saved_posts')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
            
            if (error) throw error;
        } else {
            // Save
            const { error } = await supabaseClient
                .from('saved_posts')
                .insert([{ post_id: postId, user_id: user.id }]);
            
            if (error) throw error;
        }
        
        // Reload posts to reflect changes
        await loadSavedPosts();
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
    } catch (error) {
        console.error('Error toggling save:', error);
        await customAlert('Failed to update saved posts. Please try again.', 'Error');
    }
}

// Fetch saved posts
async function fetchSavedPosts() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { posts: [], savedPostIds: [], replyCountMap: {} };
        
        // Get user's saved posts
        const { data: savedPosts, error: savedError } = await supabaseClient
            .from('saved_posts')
            .select('post_id')
            .eq('user_id', user.id);
        
        if (savedError) throw savedError;
        
        if (!savedPosts || savedPosts.length === 0) {
            return { posts: [], savedPostIds: [], replyCountMap: {} };
        }
        
        const savedPostIds = savedPosts.map(sp => sp.post_id);
        
        // Fetch the actual posts
        const { data: posts, error: postsError } = await supabaseClient
            .from('posts')
            .select('*')
            .in('id', savedPostIds)
            .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        
        // Get unique user IDs from posts
        const userIds = [...new Set(posts.map(p => p.user_id))];
        
        // Fetch user profiles for these users
        const { data: profiles } = await supabaseClient
            .from('user_profiles')
            .select('user_id, name, class')
            .in('user_id', userIds);
        
        // Create a map of user profiles
        const profileMap = {};
        if (profiles) {
            profiles.forEach(profile => {
                profileMap[profile.user_id] = profile;
            });
        }
        
        // Merge user profile data into posts
        const postsWithProfiles = posts.map(post => {
            const profile = profileMap[post.user_id];
            return {
                ...post,
                name: post.is_anonymous ? 'Anonymous' : (profile?.name || post.name),
                class: post.is_anonymous ? '' : (profile?.class || post.class)
            };
        });
        
        // Get user's liked posts
        const { data: userLikes, error: likesError } = await supabaseClient
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id);
        
        const likedPostIds = userLikes ? userLikes.map(like => like.post_id) : [];
        
        // Get reply counts
        const { data: replyCounts, error: replyError } = await supabaseClient
            .from('replies')
            .select('post_id');
        
        const replyCountMap = {};
        if (replyCounts) {
            replyCounts.forEach(reply => {
                replyCountMap[reply.post_id] = (replyCountMap[reply.post_id] || 0) + 1;
            });
        }
        
        return { 
            posts: postsWithProfiles, 
            likedPostIds, 
            savedPostIds,
            replyCountMap 
        };
        
    } catch (error) {
        console.error('Error fetching saved posts:', error);
        return { posts: [], likedPostIds: [], savedPostIds: [], replyCountMap: {} };
    }
}

// Display saved posts
async function loadSavedPosts() {
    const container = document.getElementById('posts-container');
    
    try {
        const { posts, likedPostIds, savedPostIds, replyCountMap } = await fetchSavedPosts();
        
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="bookmark" style="width: 64px; height: 64px; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <h3>No saved posts yet</h3>
                    <p>Bookmark posts you want to revisit later by clicking the bookmark icon.</p>
                    <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">Browse Discussions</a>
                </div>
            `;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }
        
        container.innerHTML = posts.map(post => 
            createPostHTML(post, likedPostIds, savedPostIds, replyCountMap)
        ).join('');
        
        // Initialize Lucide icons and hover cards
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        if (typeof initializeUserHoverCards === 'function') {
            initializeUserHoverCards();
        }
        
    } catch (error) {
        console.error('Error loading saved posts:', error);
        container.innerHTML = `
            <div class="empty-state">
                <h3>Error loading saved posts</h3>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

// Create post HTML (similar to app.js but with bookmark button)
function createPostHTML(post, likedPostIds, savedPostIds, replyCountMap) {
    const isLiked = likedPostIds.includes(post.id);
    const isSaved = savedPostIds.includes(post.id);
    const likesCount = post.likes || 0;
    const replyCount = replyCountMap[post.id] || 0;
    
    const isAuthor = currentUserId === post.user_id;
    const canModify = isAuthor || isAdmin;
    
    const editedText = post.updated_at && post.updated_at !== post.created_at ? ' (edited)' : '';
    
    const MAX_PREVIEW_LENGTH = 4;
    const contentLines = post.content.split(/<br\s*\/?>/gi);
    const needsTruncation = contentLines.length > MAX_PREVIEW_LENGTH;
    const previewContent = needsTruncation 
        ? contentLines.slice(0, MAX_PREVIEW_LENGTH).join('<br>') + '...'
        : post.content;
    
    const showMoreLink = needsTruncation ? 
        `<a href="post-detail.html?id=${post.id}" class="show-more" onclick="event.stopPropagation()">Show more</a>` : '';
    
    const authorActionsHTML = canModify ? `
        <div class="post-header-actions" onclick="event.stopPropagation()">
            ${isAuthor ? `
                <button class="btn-edit" onclick="editPost(${post.id})" title="Edit post">
                    <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                </button>
            ` : ''}
            <button class="btn-delete" onclick="deletePost(${post.id})" title="Delete post">
                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
        </div>
    ` : '';
    
    const postTitle = post.title ? `<h2 class="post-title">${escapeHtml(post.title)}</h2>` : '';
    
    // Build username with clickable link if not anonymous
    const usernameHTML = post.is_anonymous 
        ? escapeHtml(post.name)
        : `<span class="username-link" data-user-id="${post.user_id}" data-user-name="${escapeHtml(post.name)}">${escapeHtml(post.name)}</span>`;
    
    const authorInfo = post.is_anonymous || !post.class || post.class.trim() === '' 
        ? usernameHTML
        : `${usernameHTML} • ${escapeHtml(post.class)}`;
    
    return `
        <div class="post post-clickable" data-post-id="${post.id}" onclick="navigateToPost(event, ${post.id})">
            <div class="post-header">
                <div class="post-meta">
                    <span class="post-author-name">${authorInfo}</span>
                    <span class="post-meta-separator">•</span>
                    <span class="post-time">${formatTimestamp(post.created_at)}${editedText}</span>
                </div>
                <div class="post-header-actions">
                    ${authorActionsHTML}
                </div>
            </div>
            ${postTitle}
            <div class="post-content ${needsTruncation ? 'post-content-preview' : ''}">${previewContent}</div>
            ${showMoreLink}
            <div class="post-actions" onclick="event.stopPropagation()">
                <button class="btn-like ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <i data-lucide="heart" style="width: 18px; height: 18px; ${isLiked ? 'fill: currentColor;' : ''}"></i>
                    <span>${likesCount}</span>
                </button>
                <a href="post-detail.html?id=${post.id}" class="btn-reply">
                    <i data-lucide="message-circle" style="width: 16px; height: 16px;"></i>
                    <span>${replyCount || 0}</span>
                </a>
                <button class="btn-save ${isSaved ? 'saved' : ''}" onclick="toggleSave(${post.id})" title="${isSaved ? 'Unsave' : 'Save'} post">
                    <i data-lucide="bookmark" style="width: 16px; height: 16px; ${isSaved ? 'fill: currentColor;' : ''}"></i>
                </button>
            </div>
        </div>
    `;
}

// Toggle like on post
async function toggleLike(postId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const likeButton = document.querySelector(`[data-post-id="${postId}"] .btn-like`);
    if (!likeButton) return;
    
    const isLiked = likeButton.classList.contains('liked');
    const likeCountSpan = likeButton.querySelector('span');
    let currentCount = parseInt(likeCountSpan.textContent) || 0;
    
    // Optimistically update UI immediately
    if (isLiked) {
        likeButton.classList.remove('liked');
        currentCount = Math.max(0, currentCount - 1);
        likeCountSpan.textContent = currentCount;
    } else {
        likeButton.classList.add('liked');
        currentCount++;
        likeCountSpan.textContent = currentCount;
    }
    
    // Reinitialize Lucide icons to update the fill state
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    try {
        if (isLiked) {
            await supabaseClient
                .from('post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
            
            await supabaseClient.rpc('decrement_likes', { post_id: postId });
        } else {
            await supabaseClient
                .from('post_likes')
                .insert([{ post_id: postId, user_id: user.id }]);
            
            await supabaseClient.rpc('increment_likes', { post_id: postId });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        // Revert UI on error
        if (isLiked) {
            likeButton.classList.add('liked');
            likeCountSpan.textContent = currentCount + 1;
        } else {
            likeButton.classList.remove('liked');
            likeCountSpan.textContent = Math.max(0, currentCount - 1);
        }
        // Reinitialize icons after revert
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Navigate to post detail
function navigateToPost(event, postId) {
    if (event.target.closest('button') || event.target.closest('a') || event.target.closest('.post-actions')) {
        return;
    }
    window.location.href = `post-detail.html?id=${postId}`;
}

// Edit post
function editPost(postId) {
    window.location.href = `edit-post.html?id=${postId}`;
}

// Delete post
async function deletePost(postId) {
    const confirmed = await customConfirm(
        'Are you sure you want to delete this post? This action cannot be undone.',
        'Delete Post'
    );
    
    if (!confirmed) return;
    
    try {
        const { error } = await supabaseClient
            .from('posts')
            .delete()
            .eq('id', postId);
        
        if (error) throw error;
        
        await customAlert('Post deleted successfully', 'Success');
        await loadSavedPosts();
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
    } catch (error) {
        console.error('Error deleting post:', error);
        await customAlert('Failed to delete post. Please try again.', 'Error');
    }
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load popular posts (same as app.js)
async function loadPopularPosts() {
    try {
        const { data: posts, error } = await supabaseClient
            .from('posts')
            .select('id, title, content, name, likes')
            .order('likes', { ascending: false })
            .limit(3);
        
        if (error) throw error;
        
        const popularPostsList = document.getElementById('popular-posts-list');
        
        if (!posts || posts.length === 0) {
            popularPostsList.innerHTML = '<p class="loading-small">No posts yet</p>';
            return;
        }
        
        popularPostsList.innerHTML = posts.map(post => {
            const displayTitle = post.title || post.content.replace(/<[^>]*>/g, '').substring(0, 60) + '...';
            
            return `
                <div class="popular-post-item" onclick="window.location.href='post-detail.html?id=${post.id}'">
                    <div class="popular-post-title">${escapeHtml(displayTitle)}</div>
                    <div class="popular-post-meta">
                        <span class="popular-post-author">${escapeHtml(post.name)}</span>
                        <span class="popular-post-likes">
                            <i data-lucide="heart" style="width: 14px; height: 14px; fill: currentColor;"></i>
                            ${post.likes || 0}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error loading popular posts:', error);
        document.getElementById('popular-posts-list').innerHTML = '<p class="loading-small">Failed to load</p>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const navData = await initializeNavigation('saved');
    if (navData) {
        currentUserId = navData.user.id;
        isAdmin = navData.isAdmin;
        await loadSavedPosts();
        await loadPopularPosts();
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
});
