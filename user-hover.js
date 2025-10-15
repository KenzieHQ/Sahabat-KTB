// User Profile Hover Card Utility
// Include this in pages where usernames appear

let hoverCard = null;
let hoverTimeout = null;
let currentHoverUserId = null;

// Initialize hover cards
function initializeUserHoverCards() {
    // Create hover card element if it doesn't exist
    if (!hoverCard) {
        hoverCard = document.createElement('div');
        hoverCard.className = 'user-hover-card';
        hoverCard.innerHTML = `
            <div class="user-hover-header">
                <div class="user-hover-avatar">
                    <i data-lucide="user" style="width: 20px; height: 20px;"></i>
                </div>
                <div class="user-hover-info">
                    <h4 id="hover-name">Loading...</h4>
                    <p id="hover-class">...</p>
                </div>
            </div>
            <div class="user-hover-bio" id="hover-bio"></div>
            <div class="user-hover-actions">
                <button class="btn btn-primary" onclick="viewFullProfile()">View Profile</button>
            </div>
        `;
        document.body.appendChild(hoverCard);
        
        // Initialize Lucide icons for the hover card
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    // Add event listeners to all username links
    attachHoverListeners();
}

// Attach hover listeners to username elements
function attachHoverListeners() {
    const usernameLinks = document.querySelectorAll('.username-link');
    
    usernameLinks.forEach(element => {
        if (element.dataset.hoverAttached) {
            return; // Already attached
        }
        
        element.dataset.hoverAttached = 'true';
        
        element.addEventListener('mouseenter', (e) => {
            const userId = e.currentTarget.dataset.userId;
            const userName = e.currentTarget.dataset.userName;
            const targetElement = e.currentTarget; // Store element reference before async
            
            if (!userId || userName === 'Anonymous') return;
            
            currentHoverUserId = userId;
            hoverTimeout = setTimeout(() => {
                showHoverCard(targetElement, userId);
            }, 500); // Show after 500ms hover
        });
        
        element.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            hideHoverCard();
        });
        
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const userId = e.currentTarget.dataset.userId;
            if (userId) {
                window.location.href = `profile.html?id=${userId}`;
            }
        });
    });
    
    // Keep hover card visible when mouse is over it
    if (hoverCard) {
        hoverCard.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
        });
        
        hoverCard.addEventListener('mouseleave', () => {
            hideHoverCard();
        });
    }
}

// Show hover card
async function showHoverCard(element, userId) {
    try {
        // Get element position BEFORE async operations (element might not exist after)
        const rect = element.getBoundingClientRect();
        
        // Get user profile
        const { data: profile, error } = await supabaseClient
            .from('user_profiles')
            .select('name, class, bio')
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        
        if (!profile) return;
        
        // Update hover card content
        hoverCard.querySelector('#hover-name').textContent = profile.name || 'Unknown User';
        hoverCard.querySelector('#hover-class').textContent = profile.class || '';
        hoverCard.querySelector('#hover-bio').textContent = profile.bio || 'No bio yet';
        
        // Position the card using the rect we got earlier
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Position to the right of the username
        let left = rect.right + scrollLeft + 10;
        let top = rect.top + scrollTop;
        
        // Make sure it doesn't go off-screen
        const cardWidth = 300;
        if (left + cardWidth > window.innerWidth) {
            left = rect.left + scrollLeft - cardWidth - 10;
        }
        
        hoverCard.style.left = left + 'px';
        hoverCard.style.top = top + 'px';
        
        currentHoverUserId = userId;
        hoverCard.classList.add('show');
    } catch (err) {
        console.error('Error showing hover card:', err);
    }
}

// Hide hover card
function hideHoverCard() {
    hoverTimeout = setTimeout(() => {
        if (hoverCard) {
            hoverCard.classList.remove('show');
        }
    }, 200);
}

// View full profile (called from hover card button)
function viewFullProfile() {
    if (currentHoverUserId) {
        window.location.href = `profile.html?id=${currentHoverUserId}`;
    }
}

// Make username clickable
function makeUsernameClickable(name, userId, isAnonymous = false) {
    if (isAnonymous || !userId) {
        return `<span class="user-name">${escapeHtml(name)}</span>`;
    }
    return `<span class="username-link" data-user-id="${userId}" data-user-name="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
}

// Helper function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
