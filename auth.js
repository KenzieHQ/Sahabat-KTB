// Tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active form
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tabName}-form`).classList.add('active');
        
        // Clear messages
        document.querySelectorAll('.auth-message').forEach(msg => msg.textContent = '');
    });
});

// Handle Login
document.getElementById('login-form-element').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageEl = document.getElementById('login-message');
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    messageEl.textContent = '';
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (error) throw error;
        
        // Redirect to home page
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Login error:', error);
        messageEl.textContent = error.message || 'Failed to login. Please check your credentials.';
        messageEl.className = 'auth-message error';
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
    }
});

// Handle Sign Up
document.getElementById('signup-form-element').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const classValue = document.getElementById('signup-class').value;
    const password = document.getElementById('signup-password').value;
    const messageEl = document.getElementById('signup-message');
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = 'Creating account...';
    messageEl.textContent = '';
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    class: classValue,
                }
            }
        });
        
        if (error) throw error;
        
        messageEl.textContent = 'Account created successfully! Please check your email to verify your account.';
        messageEl.className = 'auth-message success';
        
        // Clear form
        e.target.reset();
        
        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Signup error:', error);
        messageEl.textContent = error.message || 'Failed to create account. Please try again.';
        messageEl.className = 'auth-message error';
        submitButton.disabled = false;
        submitButton.textContent = 'Sign Up';
    }
});
