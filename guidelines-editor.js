// Guidelines Editor for Admin
let isAdmin = false;
let currentGuidelines = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await initializeNavigation('guidelines');
    await checkAdminStatus();
    await loadGuidelines();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Check if user is admin
async function checkAdminStatus() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabaseClient
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
    
    if (data) {
        isAdmin = true;
        document.getElementById('edit-guidelines-btn').style.display = 'inline-flex';
    }
}

// Load guidelines from database
async function loadGuidelines() {
    try {
        const { data, error } = await supabaseClient
            .from('site_content')
            .select('*')
            .eq('page', 'guidelines')
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        const displayDiv = document.getElementById('guidelines-display');
        const lastEditedSpan = document.getElementById('last-edited');
        
        if (data && data.content) {
            currentGuidelines = data;
            displayDiv.innerHTML = data.content;
            
            if (data.updated_at) {
                const date = new Date(data.updated_at);
                lastEditedSpan.textContent = `Last edited: ${formatDate(date)}`;
            }
        } else {
            displayDiv.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="file-text" style="width: 64px; height: 64px;"></i>
                    <h3>No Guidelines Yet</h3>
                    <p>Community guidelines have not been created yet.</p>
                    ${isAdmin ? '<p>Click "Edit Guidelines" to create them.</p>' : ''}
                </div>
            `;
        }
        
        // Reinitialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error loading guidelines:', error);
        document.getElementById('guidelines-display').innerHTML = `
            <div class="empty-state">
                <p>Error loading guidelines. Please try again later.</p>
            </div>
        `;
    }
}

// Show editor
document.getElementById('edit-guidelines-btn')?.addEventListener('click', () => {
    if (!isAdmin) return;
    
    const editor = document.getElementById('guidelines-editor');
    const display = document.getElementById('guidelines-display');
    const contentEditor = document.getElementById('guidelines-content-editor');
    
    // Pre-fill with current content
    if (currentGuidelines && currentGuidelines.content) {
        contentEditor.innerHTML = currentGuidelines.content;
    }
    
    display.style.display = 'none';
    editor.style.display = 'block';
    
    // Reinitialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Cancel editing
function cancelEditGuidelines() {
    document.getElementById('guidelines-editor').style.display = 'none';
    document.getElementById('guidelines-display').style.display = 'block';
    document.getElementById('guidelines-content-editor').innerHTML = '';
}

// Format text
function formatGuidelinesText(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('guidelines-content-editor').focus();
}

// Insert link
async function insertGuidelinesLink() {
    const url = await customPrompt('Enter URL:', 'Insert Link', 'https://');
    if (url) {
        document.execCommand('createLink', false, url);
    }
}

// Insert image
async function insertGuidelinesImage() {
    const url = await customPrompt('Enter image URL:', 'Insert Image', 'https://');
    if (url) {
        document.execCommand('insertImage', false, url);
    }
}

// Save guidelines
async function saveGuidelines() {
    const content = document.getElementById('guidelines-content-editor').innerHTML;
    
    if (!content.trim() || content.trim() === '<br>') {
        await customAlert('Please enter some content for the guidelines', 'Empty Content');
        return;
    }
    
    const saveButton = document.querySelector('.editor-actions .btn-primary');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        const guidelinesData = {
            page: 'guidelines',
            content: content,
            updated_by: user.id,
            updated_at: new Date().toISOString()
        };
        
        // Upsert (insert or update)
        const { error } = await supabaseClient
            .from('site_content')
            .upsert(guidelinesData, { onConflict: 'page' });
        
        if (error) throw error;
        
        await customAlert('Guidelines saved successfully!', 'Success');
        
        // Reload and switch back to display mode
        await loadGuidelines();
        cancelEditGuidelines();
        
    } catch (error) {
        console.error('Error saving guidelines:', error);
        await customAlert('Failed to save guidelines. Please try again.', 'Error');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Guidelines';
    }
}

// Format date
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Handle paste events to clean up formatting
document.getElementById('guidelines-content-editor')?.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
});
