// URL Helper - Clean URLs without .html extension
// This handles URL rewriting on the client side

// On page load, clean the URL if it contains .html
document.addEventListener('DOMContentLoaded', () => {
    const currentUrl = window.location.href;
    const cleanUrl = currentUrl.replace(/\.html($|\?|#)/, '$1');
    
    if (currentUrl !== cleanUrl) {
        window.history.replaceState({}, '', cleanUrl);
    }
});

// Helper function to navigate without .html
function navigateTo(page, params = '') {
    const cleanPage = page.replace('.html', '');
    const url = params ? `${cleanPage}${params}` : cleanPage;
    window.location.href = url;
}

// Override link clicks to use clean URLs
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;
    
    // If it's an internal link with .html, clean it
    if (href.includes('.html')) {
        e.preventDefault();
        const cleanHref = href.replace(/\.html($|\?|#)/, '$1');
        
        // Check if it's navigating to the same page (with different query params)
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        const targetPage = cleanHref.split('?')[0];
        
        if (currentPage === targetPage && cleanHref.includes('?')) {
            // Just changing query params on same page
            window.location.href = cleanHref;
        } else {
            // Navigate to different page
            window.location.href = cleanHref;
        }
    }
});
