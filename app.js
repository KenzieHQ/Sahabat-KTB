// Pagination variables
let currentPage = 0;
const POSTS_PER_PAGE = 8;
let allPosts = [];
let allLikedPostIds = [];
let allSavedPostIds = [];
let allReplyCountMap = {};
let currentUserId = null;
let isAdmin = false;

// Format timestamp to friendly format
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
        });
    }
}

// Toggle like on a post
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
        
        // Update global state
        const index = allLikedPostIds.indexOf(postId);
        if (index > -1) allLikedPostIds.splice(index, 1);
    } else {
        likeButton.classList.add('liked');
        currentCount++;
        likeCountSpan.textContent = currentCount;
        
        // Update global state
        if (!allLikedPostIds.includes(postId)) {
            allLikedPostIds.push(postId);
        }
    }
    
    // Reinitialize Lucide icons to update the fill state
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Update in background without blocking UI
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
            allLikedPostIds.push(postId);
        } else {
            likeButton.classList.remove('liked');
            likeCountSpan.textContent = Math.max(0, currentCount - 1);
            const index = allLikedPostIds.indexOf(postId);
            if (index > -1) allLikedPostIds.splice(index, 1);
        }
        // Reinitialize icons after revert
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Toggle save/bookmark on a post
async function toggleSave(postId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const saveButton = document.querySelector(`[data-post-id="${postId}"] .btn-save`);
    if (!saveButton) return;
    
    const isSaved = saveButton.classList.contains('saved');
    
    // Optimistically update UI immediately
    if (isSaved) {
        saveButton.classList.remove('saved');
        
        // Update global state
        const index = allSavedPostIds.indexOf(postId);
        if (index > -1) allSavedPostIds.splice(index, 1);
    } else {
        saveButton.classList.add('saved');
        
        // Update global state
        if (!allSavedPostIds.includes(postId)) {
            allSavedPostIds.push(postId);
        }
    }
    
    // Reinitialize Lucide icons to update the fill state
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Update in background without blocking UI
    try {
        if (isSaved) {
            await supabaseClient
                .from('saved_posts')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
        } else {
            await supabaseClient
                .from('saved_posts')
                .insert([{ post_id: postId, user_id: user.id }]);
        }
    } catch (error) {
        console.error('Error toggling save:', error);
        // Revert UI on error
        if (isSaved) {
            saveButton.classList.add('saved');
            allSavedPostIds.push(postId);
        } else {
            saveButton.classList.remove('saved');
            const index = allSavedPostIds.indexOf(postId);
            if (index > -1) allSavedPostIds.splice(index, 1);
        }
        // Reinitialize icons after revert
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Fetch all posts (without replies)
async function fetchPosts() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { posts: [], likedPostIds: [], replyCountMap: {} };
        
        // Fetch posts
        const { data: posts, error: postsError } = await supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        
        // Get unique user IDs from posts
        const userIds = [...new Set(posts.map(p => p.user_id))];
        
        // Fetch user profiles for these users
        const { data: profiles, error: profilesError } = await supabaseClient
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
        
        // Get user's saved posts
        const { data: userSaves, error: savesError } = await supabaseClient
            .from('saved_posts')
            .select('post_id')
            .eq('user_id', user.id);
        
        const savedPostIds = userSaves ? userSaves.map(save => save.post_id) : [];
        
        // Get reply counts for each post
        const { data: replyCounts, error: replyError } = await supabaseClient
            .from('replies')
            .select('post_id');
        
        const replyCountMap = {};
        if (replyCounts) {
            replyCounts.forEach(reply => {
                replyCountMap[reply.post_id] = (replyCountMap[reply.post_id] || 0) + 1;
            });
        }

        return { posts: postsWithProfiles, likedPostIds, savedPostIds, replyCountMap };
    } catch (error) {
        console.error('Error fetching data:', error);
        return { posts: [], likedPostIds: [], savedPostIds: [], replyCountMap: {} };
    }
}

// Create post HTML (without inline replies)
async function createPostHTML(post, likedPostIds, savedPostIds, replyCountMap, currentUserId) {
    const isLiked = likedPostIds.includes(post.id);
    const isSaved = savedPostIds.includes(post.id);
    const likesCount = post.likes || 0;
    const replyCount = replyCountMap[post.id] || 0;
    const isAuthor = currentUserId === post.user_id;
    const canModify = isAuthor || isAdmin; // Admin can modify any post
    const editedText = post.updated_at ? ' (edited)' : '';
    
    // Extract images from content for preview
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.content;
    const images = tempDiv.querySelectorAll('img');
    let firstImage = null;
    
    if (images.length > 0) {
        firstImage = images[0].cloneNode(true);
        firstImage.style.cssText = 'width: 100%; height: auto; display: block; margin-bottom: 1rem; border-radius: 8px; object-fit: cover;';
    }
    
    // Remove ALL images from content for display (they'll be shown separately at top)
    const contentWithoutImages = document.createElement('div');
    contentWithoutImages.innerHTML = post.content;
    contentWithoutImages.querySelectorAll('img').forEach(img => img.remove());
    const contentToDisplay = contentWithoutImages.innerHTML;
    
    // Check content height for truncation (without images)
    const textDiv = document.createElement('div');
    textDiv.innerHTML = contentToDisplay;
    textDiv.style.cssText = 'position: absolute; visibility: hidden; line-height: 1.6; font-size: 0.95rem; width: 100%;';
    document.body.appendChild(textDiv);
    
    // Calculate if content exceeds 4 lines (approximate)
    const lineHeight = 1.6 * 0.95 * 16; // line-height * font-size * base font
    const maxHeight = lineHeight * 4;
    const needsTruncation = textDiv.scrollHeight > maxHeight;
    
    document.body.removeChild(textDiv);
    
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
    
    // Build author info with clickable username
    const usernameHTML = post.is_anonymous 
        ? escapeHtml(post.name)
        : `<span class="username-link" data-user-id="${post.user_id}" data-user-name="${escapeHtml(post.name)}">${escapeHtml(post.name)}</span>`;
    
    const authorInfo = post.is_anonymous || !post.class || post.class.trim() === '' 
        ? usernameHTML
        : `${usernameHTML} • ${escapeHtml(post.class)}`;
    
    // Create image HTML for preview (always at top)
    const imageHTML = firstImage ? `<div class="post-image-preview">${firstImage.outerHTML}</div>` : '';
    
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
            ${imageHTML}
            <div class="post-content ${needsTruncation ? 'post-content-preview' : ''}">${contentToDisplay}</div>
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

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Navigate to post detail page
function navigateToPost(event, postId) {
    // Don't navigate if clicking on buttons or links
    if (event.target.closest('button') || event.target.closest('a') || event.target.closest('.post-actions')) {
        return;
    }
    window.location.href = `post-detail.html?id=${postId}`;
}

// Edit post
function editPost(postId) {
    event.stopPropagation();
    window.location.href = `edit-post.html?id=${postId}`;
}

// Delete post
async function deletePost(postId) {
    event.stopPropagation();
    const confirmed = await customConfirm(
        'Are you sure you want to delete this post? This action cannot be undone.',
        'Delete Post'
    );
    
    if (!confirmed) {
        return;
    }
    
    const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('id', postId);
    
    if (error) {
        console.error('Error deleting post:', error);
        await customAlert('Failed to delete post. Please try again.', 'Error');
        return;
    }
    
    await loadPosts();
}

// Edit post
function editPost(postId) {
    window.location.href = `edit-post.html?id=${postId}`;
}

// Load and display posts
async function loadPosts() {
    const container = document.getElementById('posts-container');
    container.innerHTML = '<div class="loading">Loading posts...</div>';
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    currentUserId = user.id;
    
    const { posts, likedPostIds, savedPostIds, replyCountMap } = await fetchPosts();
    
    // Store all data globally
    allPosts = posts;
    allLikedPostIds = likedPostIds;
    allSavedPostIds = savedPostIds;
    allReplyCountMap = replyCountMap;
    currentPage = 0;
    
    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No posts yet</h3>
                <p>Be the first to create a post!</p>
            </div>
        `;
        return;
    }
    
    // Display first page
    await displayPostsPage();
}

// Display posts for current page
async function displayPostsPage() {
    const container = document.getElementById('posts-container');
    const startIndex = 0;
    const endIndex = (currentPage + 1) * POSTS_PER_PAGE;
    const postsToDisplay = allPosts.slice(startIndex, endIndex);
    
    const postsHTML = await Promise.all(
        postsToDisplay.map(post => createPostHTML(post, allLikedPostIds, allSavedPostIds, allReplyCountMap, currentUserId))
    );
    
    container.innerHTML = postsHTML.join('');
    
    // Add "Load More" button if there are more posts
    if (endIndex < allPosts.length) {
        const loadMoreButton = document.createElement('div');
        loadMoreButton.className = 'load-more-container';
        loadMoreButton.innerHTML = `
            <button class="btn-load-more" onclick="loadMorePosts()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                Load More Posts
            </button>
        `;
        container.appendChild(loadMoreButton);
    }
    
    // Reinitialize Lucide icons after rendering
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Reinitialize hover cards
    if (typeof initializeUserHoverCards === 'function') {
        initializeUserHoverCards();
    }
}

// Load more posts
async function loadMorePosts() {
    currentPage++;
    await displayPostsPage();
}

// Load popular posts for right sidebar
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
            // Get title or truncated content
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
    } catch (error) {
        console.error('Error loading popular posts:', error);
        document.getElementById('popular-posts-list').innerHTML = '<p class="loading-small">Failed to load</p>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const navData = await initializeNavigation('index');
    if (navData) {
        currentUserId = navData.user.id;
        isAdmin = navData.isAdmin;
        await loadPosts();
        await loadPopularPosts();
        
        // Initialize Lucide icons after content loaded
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Initialize user hover cards
        if (typeof initializeUserHoverCards === 'function') {
            initializeUserHoverCards();
        }
    }
});
