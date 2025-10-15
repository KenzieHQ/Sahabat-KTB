// Get post ID from URL
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// Store current user ID
let currentUserId = null;
let isAdmin = false;

// Strip formatting on paste (paste as plain text)
function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
}

// Check if current user is admin
async function checkIfAdmin() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return false;
           // Fetch and display replies
        const { data: replies, error: repliesError } = await supabaseClient
            .from('replies')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        
        if (repliesError) throw repliesError;
        
        // Get unique user IDs from replies
        const replyUserIds = [...new Set(replies.map(r => r.user_id))];
        
        // Fetch user profiles for reply authors
        const { data: replyProfiles } = await supabaseClient
            .from('user_profiles')
            .select('user_id, name, class')
            .in('user_id', replyUserIds);
        
        // Create a map of user profiles
        const replyProfileMap = {};
        if (replyProfiles) {
            replyProfiles.forEach(profile => {
                replyProfileMap[profile.user_id] = profile;
            });
        }
        
        // Merge current profile data into replies
        const repliesWithProfiles = replies.map(reply => {
            const profile = replyProfileMap[reply.user_id];
            return {
                ...reply,
                name: reply.is_anonymous ? 'Anonymous' : (profile?.name || reply.name),
                class: reply.is_anonymous ? '' : (profile?.class || '')
            };
        });      const { data: adminData, error } = await supabaseClient
            .from('admins')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        
        return !error && adminData;
    } catch (error) {
        return false;
    }
}

// Check authentication
// Show reply form
function showReplyForm() {
    document.getElementById('reply-trigger-input').style.display = 'none';
    document.getElementById('reply-form-container').style.display = 'block';
    // Focus on the editor
    setTimeout(() => {
        const replyContent = document.getElementById('reply-content');
        replyContent.focus();
        // Add paste handler if not already added
        if (!replyContent.dataset.pasteHandlerAdded) {
            replyContent.addEventListener('paste', handlePaste);
            replyContent.dataset.pasteHandlerAdded = 'true';
        }
    }, 100);
}

// Hide reply form
function hideReplyForm() {
    document.getElementById('reply-form-container').style.display = 'none';
    document.getElementById('reply-trigger-input').style.display = 'block';
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
    
    // Update in background without blocking UI
    try {
        if (isLiked) {
            await supabaseClient
                .from('reply_likes')
                .delete()
                .eq('reply_id', replyId)
                .eq('user_id', user.id);
            
            await supabaseClient.rpc('decrement_reply_likes', { reply_id: replyId });
        } else {
            await supabaseClient
                .from('reply_likes')
                .insert([{ reply_id: replyId, user_id: user.id }]);
            
            await supabaseClient.rpc('increment_reply_likes', { reply_id: replyId });
        }
    } catch (error) {
        console.error('Error toggling reply like:', error);
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
    const isAuthor = currentUserId === reply.user_id;
    const canDelete = isAuthor || isAdmin; // Admin can delete any reply
    
    // Build username with clickable link if not anonymous
    const displayName = reply.is_anonymous 
        ? 'Anonymous' 
        : `<span class="username-link" data-user-id="${reply.user_id}" data-user-name="${escapeHtml(reply.name)}">${escapeHtml(reply.name)}</span>`;
    
    return `
        <div class="reply" data-reply-id="${reply.id}">
            <div class="reply-header">
                <span class="reply-author">${displayName}</span>
                <span class="reply-time">${formatTimestamp(reply.created_at)}</span>
                ${canDelete ? `
                    <button class="btn-delete-reply" onclick="deleteReply(${reply.id})" title="Delete reply">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                ` : ''}
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
                                <i data-lucide="bold" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button type="button" class="editor-btn" onclick="formatNestedReplyText('italic', ${reply.id})" title="Italic">
                                <i data-lucide="italic" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button type="button" class="editor-btn" onclick="formatNestedReplyText('underline', ${reply.id})" title="Underline">
                                <i data-lucide="underline" style="width: 14px; height: 14px;"></i>
                            </button>
                            <span class="toolbar-divider"></span>
                            <button type="button" class="editor-btn" onclick="insertNestedReplyLink(${reply.id})" title="Link">
                                <i data-lucide="link" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
                        <div id="nested-reply-content-${reply.id}" class="editor-content editor-content-small" contenteditable="true" placeholder="Write your reply..."></div>
                    </div>
                    <div class="form-group">
                        <div class="toggle-container">
                            <label class="checkbox-label">
                                <input type="checkbox" id="nested-reply-anonymous-${reply.id}" name="anonymous">
                                <span>Reply anonymously</span>
                            </label>
                        </div>
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
                        const isNestedAuthor = currentUserId === nr.user_id;
                        const canDeleteNested = isNestedAuthor || isAdmin; // Admin can delete any nested reply
                        return `
                        <div class="nested-reply" data-reply-id="${nr.id}">
                            <div class="reply-header">
                                <span class="reply-author">${escapeHtml(nr.name)}</span>
                                <span class="reply-time">${formatTimestamp(nr.created_at)}</span>
                                ${canDeleteNested ? `
                                    <button class="btn-delete-reply" onclick="deleteReply(${nr.id})" title="Delete reply">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                ` : ''}
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
        // Add paste handler to nested reply editor
        const editor = document.getElementById(`nested-reply-content-${replyId}`);
        if (editor && !editor.dataset.pasteHandlerAdded) {
            editor.addEventListener('paste', handlePaste);
            editor.dataset.pasteHandlerAdded = 'true';
        }
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
    const isAnonymous = document.getElementById(`nested-reply-anonymous-${parentReplyId}`).checked;
    
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
                    name: isAnonymous ? 'Anonymous' : (user.user_metadata.name || user.email),
                    content: content,
                    is_anonymous: isAnonymous
                }
            ]);
        
        if (error) throw error;
        
        // Clear form and reload
        document.getElementById(`nested-reply-content-${parentReplyId}`).innerHTML = '';
        document.getElementById(`nested-reply-anonymous-${parentReplyId}`).checked = false;
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
    
    // Update in background without blocking UI
    try {
        if (isLiked) {
            await supabaseClient
                .from('post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
            
            await supabaseClient.rpc('decrement_likes', { post_id: parseInt(postId) });
        } else {
            await supabaseClient
                .from('post_likes')
                .insert([{ post_id: parseInt(postId), user_id: user.id }]);
            
            await supabaseClient.rpc('increment_likes', { post_id: parseInt(postId) });
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

// Toggle save/bookmark on the post
async function toggleSave() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const saveButton = document.querySelector('.btn-save');
    if (!saveButton) return;
    
    const isSaved = saveButton.classList.contains('saved');
    
    // Optimistically update UI immediately
    if (isSaved) {
        saveButton.classList.remove('saved');
    } else {
        saveButton.classList.add('saved');
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
                .insert([{ post_id: parseInt(postId), user_id: user.id }]);
        }
    } catch (error) {
        console.error('Error toggling save:', error);
        // Revert UI on error
        if (isSaved) {
            saveButton.classList.add('saved');
        } else {
            saveButton.classList.remove('saved');
        }
        // Reinitialize icons after revert
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
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
        
        // Fetch user profile for post author
        const { data: postProfile } = await supabaseClient
            .from('user_profiles')
            .select('name, class')
            .eq('user_id', post.user_id)
            .maybeSingle();
        
        // Use current profile data if available and not anonymous
        const currentName = post.is_anonymous ? 'Anonymous' : (postProfile?.name || post.name);
        const currentClass = post.is_anonymous ? '' : (postProfile?.class || post.class);
        
        // Check if user liked this post
        const { data: userLike } = await supabaseClient
            .from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle();
        
        // Check if user saved this post
        const { data: userSave } = await supabaseClient
            .from('saved_posts')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle();
        
        const isLiked = !!userLike;
        const isSaved = !!userSave;
        const likesCount = post.likes || 0;
        const isAuthor = user.id === post.user_id;
        const canModify = isAuthor || isAdmin; // Admin can modify any post
        const editedText = post.updated_at ? ' (edited)' : '';
        
        const authorActionsHTML = canModify ? `
            <div class="post-header-actions">
                ${isAuthor ? `
                    <button class="btn-edit" onclick="editPost()" title="Edit post">
                        <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                    </button>
                ` : ''}
                <button class="btn-delete" onclick="deletePost()" title="Delete post">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        ` : '';
        
        // Display post
        const postContainer = document.getElementById('post-detail-container');
        const postTitle = post.title ? `<h2 class="post-title">${escapeHtml(post.title)}</h2>` : '';
        
        // Build username with clickable link if not anonymous
        const usernameHTML = post.is_anonymous 
            ? currentName
            : `<span class="username-link" data-user-id="${post.user_id}" data-user-name="${escapeHtml(currentName)}">${escapeHtml(currentName)}</span>`;
        
        const authorInfo = post.is_anonymous || !currentClass || currentClass.trim() === '' 
            ? usernameHTML
            : `${usernameHTML} • ${escapeHtml(currentClass)}`;
        
        postContainer.innerHTML = `
            <div class="post post-detail">
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
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    <button class="btn-like ${isLiked ? 'liked' : ''}" onclick="toggleLike()">
                        <i data-lucide="heart" style="width: 18px; height: 18px; ${isLiked ? 'fill: currentColor;' : ''}"></i>
                        <span>${likesCount}</span>
                    </button>
                    <button class="btn-save ${isSaved ? 'saved' : ''}" onclick="toggleSave()" title="${isSaved ? 'Unsave' : 'Save'} post">
                        <i data-lucide="bookmark" style="width: 16px; height: 16px; ${isSaved ? 'fill: currentColor;' : ''}"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Fetch and display replies
        const { data: replies, error: repliesError } = await supabaseClient
            .from('replies')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        
        if (repliesError) throw repliesError;
        
        // Get unique user IDs from replies
        const replyUserIds = [...new Set(replies.map(r => r.user_id))];
        
        // Fetch user profiles for reply authors
        const { data: replyProfiles } = await supabaseClient
            .from('user_profiles')
            .select('user_id, name, class')
            .in('user_id', replyUserIds);
        
        // Create a map of user profiles
        const replyProfileMap = {};
        if (replyProfiles) {
            replyProfiles.forEach(profile => {
                replyProfileMap[profile.user_id] = profile;
            });
        }
        
        // Merge current profile data into replies
        const repliesWithProfiles = replies.map(reply => {
            const profile = replyProfileMap[reply.user_id];
            return {
                ...reply,
                name: reply.is_anonymous ? 'Anonymous' : (profile?.name || reply.name),
                class: reply.is_anonymous ? '' : (profile?.class || '')
            };
        });
        
        const repliesList = document.getElementById('replies-list');
        const replySection = document.getElementById('reply-section');
        
        if (!replySection || !repliesList) {
            console.error('Reply section or list not found');
            return;
        }
        
        // Always show the reply section
        replySection.style.display = 'block';
        
        if (repliesWithProfiles && repliesWithProfiles.length > 0) {
            // Update header with count
            const headerH3 = replySection.querySelector('.reply-section-header h3');
            if (headerH3) {
                headerH3.textContent = `Replies (${repliesWithProfiles.length})`;
            }
            
            // Get user's liked replies
            const { data: userReplyLikes } = await supabaseClient
                .from('reply_likes')
                .select('reply_id')
                .eq('user_id', user.id);
            
            const likedReplyIds = userReplyLikes ? userReplyLikes.map(like => like.reply_id) : [];
            
            // Organize replies into parent and nested structure
            const topLevelReplies = repliesWithProfiles.filter(r => !r.parent_reply_id);
            const nestedReplies = repliesWithProfiles.filter(r => r.parent_reply_id);
            
            repliesList.innerHTML = topLevelReplies.map(reply => {
                const children = nestedReplies.filter(nr => nr.parent_reply_id === reply.id);
                return createReplyHTML(reply, children, likedReplyIds);
            }).join('');
        } else {
            // Show default "Replies" header when no replies yet
            const headerH3 = replySection.querySelector('.reply-section-header h3');
            if (headerH3) {
                headerH3.textContent = 'Replies';
            }
            repliesList.innerHTML = '<p class="no-replies">No replies yet. Be the first to reply!</p>';
        }
        
        // Initialize Lucide icons and hover cards
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        if (typeof initializeUserHoverCards === 'function') {
            initializeUserHoverCards();
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
    const isAnonymous = document.getElementById('reply-anonymous').checked;
    
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
                    name: isAnonymous ? 'Anonymous' : (user.user_metadata.name || user.email),
                    content: content,
                    is_anonymous: isAnonymous
                }
            ]);
        
        if (error) throw error;
        
        // Clear form and reload
        document.getElementById('reply-content').innerHTML = '';
        document.getElementById('reply-anonymous').checked = false;
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

// Delete reply
async function deleteReply(replyId) {
    const confirmed = await customConfirm(
        'Are you sure you want to delete this reply? This action cannot be undone.',
        'Delete Reply'
    );
    
    if (!confirmed) {
        return;
    }
    
    const { error } = await supabaseClient
        .from('replies')
        .delete()
        .eq('id', replyId);
    
    if (error) {
        console.error('Error deleting reply:', error);
        await customAlert('Failed to delete reply. Please try again.', 'Error');
        return;
    }
    
    // Reload the post to reflect changes
    await loadPost();
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const navData = await initializeNavigation('post-detail');
    if (navData) {
        currentUserId = navData.user.id;
        isAdmin = navData.isAdmin;
        await loadPost();
    }
});
