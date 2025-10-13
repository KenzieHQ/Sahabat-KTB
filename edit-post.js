// Check authentication
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    
    const userName = session.user.user_metadata.name || session.user.email;
    document.getElementById('user-name').textContent = `Hello, ${userName}`;
    
    return session.user;
}

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
});

// Rich text formatting functions
function formatText(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('message').focus();
}

function insertQuote() {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    if (selectedText) {
        document.execCommand('formatBlock', false, 'blockquote');
    } else {
        const blockquote = document.createElement('blockquote');
        blockquote.innerHTML = 'Quote text here';
        
        const range = selection.getRangeAt(0);
        range.insertNode(blockquote);
        
        // Move cursor to end of blockquote
        range.setStartAfter(blockquote);
        range.setEndAfter(blockquote);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    document.getElementById('message').focus();
}

async function insertLink() {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    const url = await customPrompt(
        selectedText ? `Enter URL for "${selectedText}":` : 'Enter the URL you want to link to:',
        'Insert Link',
        'https://example.com'
    );
    
    if (url) {
        const editor = document.getElementById('message');
        
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
    document.getElementById('message').focus();
}

async function insertImage() {
    const url = await customPrompt(
        'Enter the image URL:',
        'Insert Image',
        'https://example.com/image.jpg'
    );
    
    if (url) {
        // Create image element manually for better browser support
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.alt = 'Image';
        
        const editor = document.getElementById('message');
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
            
            // Move cursor after image
            range.setStartAfter(img);
            range.setEndAfter(img);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            editor.appendChild(img);
        }
    }
    document.getElementById('message').focus();
}

// Load post data
async function loadPost() {
    const user = await checkAuth();
    if (!user) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) {
        await customAlert('No post ID provided', 'Error');
        window.location.href = 'index.html';
        return;
    }
    
    const { data: post, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
    
    if (error) {
        console.error('Error fetching post:', error);
        await customAlert('Failed to load post', 'Error');
        window.location.href = 'index.html';
        return;
    }
    
    // Check if user is the author
    if (post.user_id !== user.id) {
        await customAlert('You can only edit your own posts', 'Permission Denied');
        window.location.href = 'index.html';
        return;
    }
    
    // Load content into editor
    document.getElementById('post-title').value = post.title || '';
    document.getElementById('message').innerHTML = post.content;
}

// Handle form submission
document.getElementById('edit-post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = await checkAuth();
    if (!user) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('message').innerHTML.trim();
    
    if (!content || content === '<br>') {
        await customAlert('Please enter some content', 'Empty Content');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('posts')
            .update({ 
                title: title || null,
                content: content,
                updated_at: new Date().toISOString()
            })
            .eq('id', postId)
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        window.location.href = `post-detail.html?id=${postId}`;
    } catch (error) {
        console.error('Error updating post:', error);
        await customAlert('Failed to update post. Please try again.', 'Error');
    }
});

// Initialize
loadPost();
