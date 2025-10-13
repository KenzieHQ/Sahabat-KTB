// Pagination variables
let currentPage = 0;
const POSTS_PER_PAGE = 8;
let allPosts = [];
let allLikedPostIds = [];
let allReplyCountMap = {};
let currentUserId = null;

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

// Check authentication
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    
    // Display user info in header
    const userName = session.user.user_metadata.name || session.user.email;
    document.getElementById('user-name').textContent = `Hello, ${userName}`;
    
    return session.user;
}

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
});

// Toggle like on a post
async function toggleLike(postId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const likeButton = document.querySelector(`[data-post-id="${postId}"] .btn-like`);
    
    if (!likeButton) return;
    
    const isLiked = likeButton.classList.contains('liked');
    
    try {
        if (isLiked) {
            // Unlike: Remove from post_likes and decrement count
            const { error: deleteError } = await supabaseClient
                .from('post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
            
            if (deleteError) throw deleteError;
            
            const { error: updateError } = await supabaseClient.rpc('decrement_likes', { post_id: postId });
            
            if (updateError) throw updateError;
            
        } else {
            // Like: Add to post_likes and increment count
            const { error: insertError } = await supabaseClient
                .from('post_likes')
                .insert([{ post_id: postId, user_id: user.id }]);
            
            if (insertError) throw insertError;
            
            const { error: updateError } = await supabaseClient.rpc('increment_likes', { post_id: postId });
            
            if (updateError) throw updateError;
        }
        
        // Reload posts to reflect changes
        await loadPosts();
        
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Fetch all posts (without replies)
async function fetchPosts() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return { posts: [], likedPostIds: [], replyCountMap: {} };
        
        const { data: posts, error: postsError } = await supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        
        // Get user's liked posts
        const { data: userLikes, error: likesError } = await supabaseClient
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id);
        
        const likedPostIds = userLikes ? userLikes.map(like => like.post_id) : [];
        
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

        return { posts, likedPostIds, replyCountMap };
    } catch (error) {
        console.error('Error fetching data:', error);
        return { posts: [], likedPostIds: [], replyCountMap: {} };
    }
}

// Create post HTML (without inline replies)
async function createPostHTML(post, likedPostIds, replyCountMap, currentUserId) {
    const isLiked = likedPostIds.includes(post.id);
    const likesCount = post.likes || 0;
    const replyCount = replyCountMap[post.id] || 0;
    const isAuthor = currentUserId === post.user_id;
    const editedText = post.updated_at ? ' (edited)' : '';
    
    // Create a temporary div to check content height
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position: absolute; visibility: hidden; line-height: 1.6; font-size: 0.95rem; width: 100%;';
    tempDiv.innerHTML = post.content;
    document.body.appendChild(tempDiv);
    
    // Calculate if content exceeds 4 lines (approximate)
    const lineHeight = 1.6 * 0.95 * 16; // line-height * font-size * base font
    const maxHeight = lineHeight * 4;
    const needsTruncation = tempDiv.scrollHeight > maxHeight;
    
    document.body.removeChild(tempDiv);
    
    const showMoreLink = needsTruncation ? 
        `<a href="post-detail.html?id=${post.id}" class="show-more">Show more</a>` : '';
    
    const authorActionsHTML = isAuthor ? `
        <div class="post-header-actions">
            <button class="btn-edit" onclick="editPost(${post.id})" title="Edit post">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="btn-delete" onclick="deletePost(${post.id})" title="Delete post">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        </div>
    ` : '';
    
    const postTitle = post.title ? `<h2 class="post-title">${escapeHtml(post.title)}</h2>` : '';
    
    // Don't show class if post is anonymous or class is empty
    const classDisplay = (post.is_anonymous || !post.class || post.class.trim() === '') ? 
        '' : `<div class="post-author-class">${escapeHtml(post.class)}</div>`;
    
    return `
        <div class="post" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-author">
                    <div class="post-author-name">${escapeHtml(post.name)}</div>
                    ${classDisplay}
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="post-time">${formatTimestamp(post.created_at)}${editedText}</div>
                    ${authorActionsHTML}
                </div>
            </div>
            ${postTitle}
            <div class="post-content ${needsTruncation ? 'post-content-preview' : ''}" onclick="window.location.href='post-detail.html?id=${post.id}'">${post.content}</div>
            ${showMoreLink}
            <div class="post-actions">
                <button class="btn-like ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>${likesCount}</span>
                </button>
                <a href="post-detail.html?id=${post.id}" class="btn-reply">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <span>${replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}` : 'Reply'}</span>
                </a>
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

// Delete post
async function deletePost(postId) {
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
    
    const { posts, likedPostIds, replyCountMap } = await fetchPosts();
    
    // Store all data globally
    allPosts = posts;
    allLikedPostIds = likedPostIds;
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
        postsToDisplay.map(post => createPostHTML(post, allLikedPostIds, allReplyCountMap, currentUserId))
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
}

// Load more posts
async function loadMorePosts() {
    currentPage++;
    await displayPostsPage();
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadPosts();
});
