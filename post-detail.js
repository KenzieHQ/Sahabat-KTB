// Get post ID from URL
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

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

// Show reply form
function showReplyForm() {
    document.getElementById('reply-trigger').style.display = 'none';
    document.getElementById('reply-section').style.display = 'block';
    // Focus on the editor
    setTimeout(() => {
        document.getElementById('reply-content').focus();
    }, 100);
}

// Hide reply form
function hideReplyForm() {
    document.getElementById('reply-section').style.display = 'none';
    document.getElementById('reply-trigger').style.display = 'block';
    // Clear the editor
    document.getElementById('reply-content').innerHTML = '';
}

// Toggle reply like
async function toggleReplyLike(replyId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const likeButton = document.querySelector(`[data-reply-id="${replyId}"] .btn-like-reply`);
    if (!likeButton) return;
    
    const isLiked = likeButton.classList.contains('liked');
    
    try {
        if (isLiked) {
            // Unlike
            const { error: deleteError } = await supabaseClient
                .from('reply_likes')
                .delete()
                .eq('reply_id', replyId)
                .eq('user_id', user.id);
            
            if (deleteError) throw deleteError;
            
            const { error: updateError } = await supabaseClient.rpc('decrement_reply_likes', { reply_id: replyId });
            if (updateError) throw updateError;
        } else {
            // Like
            const { error: insertError } = await supabaseClient
                .from('reply_likes')
                .insert([{ reply_id: replyId, user_id: user.id }]);
            
            if (insertError) throw insertError;
            
            const { error: updateError } = await supabaseClient.rpc('increment_reply_likes', { reply_id: replyId });
            if (updateError) throw updateError;
        }
        
        // Reload post to reflect changes
        await loadPost();
    } catch (error) {
        console.error('Error toggling reply like:', error);
    }
}

// Format timestamp
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

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Rich text editor functions for replies
function formatReplyText(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('reply-content').focus();
}

function formatNestedReplyText(command, replyId) {
    document.execCommand(command, false, null);
    document.getElementById(`nested-reply-content-${replyId}`).focus();
}

async function insertReplyLink() {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    const url = await customPrompt(
        selectedText ? `Enter URL for "${selectedText}":` : 'Enter the URL you want to link to:',
        'Insert Link',
        'https://example.com'
    );
    
    if (url) {
        const editor = document.getElementById('reply-content');
        
        if (selectedText) {
            // If text is selected, wrap it in a link
            const link = document.createElement('a');
            link.href = url;
            link.textContent = selectedText;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(link);
            
            // Move cursor after link
            range.setStartAfter(link);
            range.setEndAfter(link);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // If no text selected, insert URL as both text and link
            const link = document.createElement('a');
            link.href = url;
            link.textContent = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.insertNode(link);
                
                // Add a space after the link
                const space = document.createTextNode(' ');
                range.setStartAfter(link);
                range.insertNode(space);
                
                // Move cursor after space
                range.setStartAfter(space);
                range.setEndAfter(space);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                editor.appendChild(link);
                editor.appendChild(document.createTextNode(' '));
            }
        }
    }
    document.getElementById('reply-content').focus();
}

async function insertNestedReplyLink(replyId) {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    const url = await customPrompt(
        selectedText ? `Enter URL for "${selectedText}":` : 'Enter the URL you want to link to:',
        'Insert Link',
        'https://example.com'
    );
    
    if (url) {
        const editor = document.getElementById(`nested-reply-content-${replyId}`);
        
        if (selectedText) {
            // If text is selected, wrap it in a link
            const link = document.createElement('a');
            link.href = url;
            link.textContent = selectedText;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(link);
            
            // Move cursor after link
            range.setStartAfter(link);
            range.setEndAfter(link);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // If no text selected, insert URL as both text and link
            const link = document.createElement('a');
            link.href = url;
            link.textContent = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.insertNode(link);
                
                // Add a space after the link
                const space = document.createTextNode(' ');
                range.setStartAfter(link);
                range.insertNode(space);
                
                // Move cursor after space
                range.setStartAfter(space);
                range.setEndAfter(space);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                editor.appendChild(link);
                editor.appendChild(document.createTextNode(' '));
            }
        }
    }
    document.getElementById(`nested-reply-content-${replyId}`).focus();
}

// Create reply HTML with nested replies
function createReplyHTML(reply, nestedReplies = [], likedReplyIds = []) {
    const hasNested = nestedReplies.length > 0;
    const isLiked = likedReplyIds.includes(reply.id);
    const likesCount = reply.likes || 0;
    
    return `
        <div class="reply" data-reply-id="${reply.id}">
            <div class="reply-header">
                <span class="reply-author">${escapeHtml(reply.name)}</span>
                <span class="reply-time">${formatTimestamp(reply.created_at)}</span>
            </div>
            <div class="reply-content">${reply.content}</div>
            <div class="reply-actions">
                <button class="btn-like-reply ${isLiked ? 'liked' : ''}" onclick="toggleReplyLike(${reply.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>${likesCount}</span>
                </button>
                <button class="btn-reply-to-reply" onclick="toggleNestedReplyForm(${reply.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    Reply
                </button>
                ${hasNested ? `
                    <button class="btn-toggle-nested" onclick="toggleNestedReplies(${reply.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                        <span class="nested-count">${nestedReplies.length} ${nestedReplies.length === 1 ? 'reply' : 'replies'}</span>
                    </button>
                ` : ''}
            </div>
            
            <div class="nested-reply-form" id="nested-reply-form-${reply.id}" style="display: none;">
                <form onsubmit="submitNestedReply(event, ${reply.id})">
                    <div class="form-group">
                        <div class="editor-toolbar editor-toolbar-small">
                            <button type="button" class="editor-btn" onclick="formatNestedReplyText('bold', ${reply.id})" title="Bold">
                                <strong>B</strong>
                            </button>
                            <button type="button" class="editor-btn" onclick="formatNestedReplyText('italic', ${reply.id})" title="Italic">
                                <em>I</em>
                            </button>
                            <button type="button" class="editor-btn" onclick="formatNestedReplyText('underline', ${reply.id})" title="Underline">
                                <u>U</u>
                            </button>
                            <span class="toolbar-divider"></span>
                            <button type="button" class="editor-btn" onclick="insertNestedReplyLink(${reply.id})" title="Link">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M6.5 10.5L9.5 7.5M8 3.5L9.5 2C10.328 1.172 11.672 1.172 12.5 2C13.328 2.828 13.328 4.172 12.5 5L11 6.5M5 9.5L3.5 11C2.672 11.828 2.672 13.172 3.5 14C4.328 14.828 5.672 14.828 6.5 14L8 12.5"/>
                                </svg>
                            </button>
                        </div>
                        <div id="nested-reply-content-${reply.id}" class="editor-content editor-content-small" contenteditable="true" placeholder="Write your reply..."></div>
                    </div>
                    <div class="reply-form-actions">
                        <button type="button" class="btn btn-cancel" onclick="toggleNestedReplyForm(${reply.id})">Cancel</button>
                        <button type="submit" class="btn btn-primary">Reply</button>
                    </div>
                </form>
            </div>
            
            ${hasNested ? `
                <div class="nested-replies" id="nested-replies-${reply.id}" style="display: none;">
                    ${nestedReplies.map(nr => {
                        const isNestedLiked = likedReplyIds.includes(nr.id);
                        const nestedLikesCount = nr.likes || 0;
                        return `
                        <div class="nested-reply" data-reply-id="${nr.id}">
                            <div class="reply-header">
                                <span class="reply-author">${escapeHtml(nr.name)}</span>
                                <span class="reply-time">${formatTimestamp(nr.created_at)}</span>
                            </div>
                            <div class="reply-content">${nr.content}</div>
                            <div class="reply-actions">
                                <button class="btn-like-reply ${isNestedLiked ? 'liked' : ''}" onclick="toggleReplyLike(${nr.id})">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${isNestedLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                    <span>${nestedLikesCount}</span>
                                </button>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Toggle nested reply form
function toggleNestedReplyForm(replyId) {
    const form = document.getElementById(`nested-reply-form-${replyId}`);
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
        document.getElementById(`nested-reply-content-${replyId}`).innerHTML = '';
    }
}

// Toggle nested replies visibility
function toggleNestedReplies(replyId) {
    const nestedContainer = document.getElementById(`nested-replies-${replyId}`);
    const toggleButton = document.querySelector(`[data-reply-id="${replyId}"] .btn-toggle-nested`);
    
    if (nestedContainer.style.display === 'none') {
        nestedContainer.style.display = 'block';
        toggleButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
            <span class="nested-count">Hide replies</span>
        `;
    } else {
        nestedContainer.style.display = 'none';
        const count = nestedContainer.querySelectorAll('.nested-reply').length;
        toggleButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span class="nested-count">${count} ${count === 1 ? 'reply' : 'replies'}</span>
        `;
    }
}

// Submit nested reply
async function submitNestedReply(event, parentReplyId) {
    event.preventDefault();
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        await customAlert('You must be logged in to reply', 'Login Required');
        return;
    }
    
    const content = document.getElementById(`nested-reply-content-${parentReplyId}`).innerHTML;
    
    if (!content.trim() || content.trim() === '<br>') {
        await customAlert('Please enter some content for your reply', 'Empty Reply');
        return;
    }
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    
    try {
        const { error } = await supabaseClient
            .from('replies')
            .insert([
                {
                    post_id: parseInt(postId),
                    parent_reply_id: parentReplyId,
                    user_id: user.id,
                    name: user.user_metadata.name || user.email,
                    content: content
                }
            ]);
        
        if (error) throw error;
        
        // Clear form and reload
        document.getElementById(`nested-reply-content-${parentReplyId}`).innerHTML = '';
        toggleNestedReplyForm(parentReplyId);
        await loadPost();
        
        submitButton.disabled = false;
        submitButton.textContent = 'Reply';
        
    } catch (error) {
        console.error('Error submitting nested reply:', error);
        await customAlert('Failed to submit reply. Please try again.', 'Error');
        submitButton.disabled = false;
        submitButton.textContent = 'Reply';
    }
}

// Toggle like on the post
async function toggleLike() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const likeButton = document.querySelector('.btn-like');
    if (!likeButton) return;
    
    const isLiked = likeButton.classList.contains('liked');
    
    try {
        if (isLiked) {
            // Unlike
            const { error: deleteError } = await supabaseClient
                .from('post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
            
            if (deleteError) throw deleteError;
            
            const { error: updateError } = await supabaseClient.rpc('decrement_likes', { post_id: parseInt(postId) });
            if (updateError) throw updateError;
            
        } else {
            // Like
            const { error: insertError } = await supabaseClient
                .from('post_likes')
                .insert([{ post_id: parseInt(postId), user_id: user.id }]);
            
            if (insertError) throw insertError;
            
            const { error: updateError } = await supabaseClient.rpc('increment_likes', { post_id: parseInt(postId) });
            if (updateError) throw updateError;
        }
        
        // Reload post
        await loadPost();
        
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Fetch post and replies
async function loadPost() {
    if (!postId) {
        window.location.href = 'index.html';
        return;
    }
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    try {
        // Fetch post
        const { data: post, error: postError } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
        
        if (postError) throw postError;
        
        // Check if user liked this post
        const { data: userLike } = await supabaseClient
            .from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .single();
        
        const isLiked = !!userLike;
        const likesCount = post.likes || 0;
        const isAuthor = user.id === post.user_id;
        const editedText = post.updated_at ? ' (edited)' : '';
        
        const authorActionsHTML = isAuthor ? `
            <div class="post-header-actions">
                <button class="btn-edit" onclick="editPost()" title="Edit post">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-delete" onclick="deletePost()" title="Delete post">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        ` : '';
        
        // Display post
        const postContainer = document.getElementById('post-detail-container');
        const postTitle = post.title ? `<h2 class="post-title">${escapeHtml(post.title)}</h2>` : '';
        
        // Don't show class if post is anonymous or class is empty
        const classDisplay = (post.is_anonymous || !post.class || post.class.trim() === '') ? 
            '' : `<div class="post-author-class">${escapeHtml(post.class)}</div>`;
        
        postContainer.innerHTML = `
            <div class="post post-detail">
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
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    <button class="btn-like ${isLiked ? 'liked' : ''}" onclick="toggleLike()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span>${likesCount}</span>
                    </button>
                </div>
            </div>
        `;
        
        // Show reply trigger
        document.getElementById('reply-trigger').style.display = 'block';
        
        // Fetch and display replies
        const { data: replies, error: repliesError } = await supabaseClient
            .from('replies')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        
        if (repliesError) throw repliesError;
        
        const repliesList = document.getElementById('replies-list');
        const repliesHeading = document.getElementById('replies-heading');
        
        if (replies && replies.length > 0) {
            repliesHeading.style.display = 'block';
            repliesHeading.textContent = `Replies (${replies.length})`;
            
            // Get user's liked replies
            const { data: userReplyLikes } = await supabaseClient
                .from('reply_likes')
                .select('reply_id')
                .eq('user_id', user.id);
            
            const likedReplyIds = userReplyLikes ? userReplyLikes.map(like => like.reply_id) : [];
            
            // Organize replies into parent and nested structure
            const topLevelReplies = replies.filter(r => !r.parent_reply_id);
            const nestedReplies = replies.filter(r => r.parent_reply_id);
            
            repliesList.innerHTML = topLevelReplies.map(reply => {
                const children = nestedReplies.filter(nr => nr.parent_reply_id === reply.id);
                return createReplyHTML(reply, children, likedReplyIds);
            }).join('');
        } else {
            repliesHeading.style.display = 'none';
            repliesList.innerHTML = '<p class="no-replies">No replies yet. Be the first to reply!</p>';
        }
        
    } catch (error) {
        console.error('Error loading post:', error);
        document.getElementById('post-detail-container').innerHTML = `
            <div class="empty-state">
                <h3>Post not found</h3>
                <p>The post you're looking for doesn't exist or has been removed.</p>
            </div>
        `;
    }
}

// Submit reply
document.getElementById('reply-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        await customAlert('You must be logged in to reply', 'Login Required');
        return;
    }
    
    const content = document.getElementById('reply-content').innerHTML;
    
    if (!content.trim() || content.trim() === '<br>') {
        await customAlert('Please enter some content for your reply', 'Empty Reply');
        return;
    }
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    
    try {
        const { error } = await supabaseClient
            .from('replies')
            .insert([
                {
                    post_id: parseInt(postId),
                    parent_reply_id: null,
                    user_id: user.id,
                    name: user.user_metadata.name || user.email,
                    content: content
                }
            ]);
        
        if (error) throw error;
        
        // Clear form and reload
        document.getElementById('reply-content').innerHTML = '';
        hideReplyForm();
        await loadPost();
        
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Reply';
        
    } catch (error) {
        console.error('Error submitting reply:', error);
        await customAlert('Failed to submit reply. Please try again.', 'Error');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Reply';
    }
});

// Edit post function
function editPost() {
    window.location.href = `edit-post.html?id=${postId}`;
}

// Delete post function
async function deletePost() {
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
    
    window.location.href = 'index.html';
}

// Initialize
loadPost();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadPost();
});
