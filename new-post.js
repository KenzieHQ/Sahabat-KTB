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

// Rich text editor functions
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
        const editor = document.getElementById('message');
        editor.appendChild(blockquote);
        
        // Place cursor in blockquote
        const range = document.createRange();
        range.selectNodeContents(blockquote);
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

// Handle form submission
document.getElementById('new-post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        await customAlert('You must be logged in to post', 'Login Required');
        window.location.href = 'login.html';
        return;
    }
    
    const titleContent = document.getElementById('post-title').value.trim();
    const messageContent = document.getElementById('message').innerHTML;
    const isAnonymous = document.getElementById('post-anonymous').checked;
    
    if (!messageContent.trim() || messageContent.trim() === '<br>') {
        await customAlert('Please enter some content for your post', 'Empty Content');
        return;
    }
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .insert([
                {
                    user_id: user.id,
                    name: isAnonymous ? 'Anonymous' : (user.user_metadata.name || user.email),
                    email: user.email,
                    class: isAnonymous ? '' : (user.user_metadata.class || 'Unknown'),
                    title: titleContent || null,
                    content: messageContent,
                    is_anonymous: isAnonymous
                }
            ])
            .select();
        
        if (error) throw error;
        
        // Redirect to home page
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error creating post:', error);
        await customAlert('Failed to create post. Please try again.', 'Error');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Post';
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', checkAuth);
