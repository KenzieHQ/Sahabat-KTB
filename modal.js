// Custom Modal System for Sahabat KTB
// Replaces browser's alert(), confirm(), and prompt() with custom styled modals

// Create modal HTML structure
function createModalStructure() {
    if (document.getElementById('custom-modal')) return;
    
    const modalHTML = `
        <div id="custom-modal" class="modal-overlay" style="display: none;">
            <div class="modal-container">
                <div class="modal-header">
                    <h3 id="modal-title"></h3>
                </div>
                <div class="modal-body">
                    <p id="modal-message"></p>
                    <input type="text" id="modal-input" class="modal-input" style="display: none;" placeholder="">
                </div>
                <div class="modal-footer">
                    <button id="modal-cancel" class="btn btn-secondary" style="display: none;">Cancel</button>
                    <button id="modal-confirm" class="btn btn-primary">OK</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Custom Alert
function customAlert(message, title = 'Notice') {
    return new Promise((resolve) => {
        createModalStructure();
        
        const modal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalInput = document.getElementById('modal-input');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalInput.style.display = 'none';
        confirmBtn.textContent = 'OK';
        cancelBtn.style.display = 'none';
        
        modal.style.display = 'flex';
        confirmBtn.focus();
        
        const handleConfirm = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            resolve(true);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                document.removeEventListener('keydown', handleEscape);
                resolve(true);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

// Custom Confirm
function customConfirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
        createModalStructure();
        
        const modal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalInput = document.getElementById('modal-input');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalInput.style.display = 'none';
        confirmBtn.textContent = 'Yes';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.display = 'inline-block';
        
        modal.style.display = 'flex';
        cancelBtn.focus();
        
        const handleConfirm = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleEscape);
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleEscape);
            resolve(false);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        
        // Close on escape key (counts as cancel)
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
    });
}

// Custom Prompt
function customPrompt(message, title = 'Input', placeholder = '', defaultValue = '') {
    return new Promise((resolve) => {
        createModalStructure();
        
        const modal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalInput = document.getElementById('modal-input');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalInput.style.display = 'block';
        modalInput.value = defaultValue;
        modalInput.placeholder = placeholder;
        confirmBtn.textContent = 'OK';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.display = 'inline-block';
        
        modal.style.display = 'flex';
        
        // Focus input and select all text if there's a default value
        setTimeout(() => {
            modalInput.focus();
            if (defaultValue) {
                modalInput.select();
            }
        }, 100);
        
        const handleConfirm = () => {
            const value = modalInput.value.trim();
            modal.style.display = 'none';
            modalInput.value = '';
            modalInput.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleKeyPress);
            resolve(value || null);
        };
        
        const handleCancel = () => {
            modal.style.display = 'none';
            modalInput.value = '';
            modalInput.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleKeyPress);
            resolve(null);
        };
        
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        document.addEventListener('keydown', handleKeyPress);
        
        // Close on overlay click
        const handleOverlayClick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };
        modal.addEventListener('click', handleOverlayClick);
    });
}

// Initialize modal structure when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createModalStructure);
} else {
    createModalStructure();
}
