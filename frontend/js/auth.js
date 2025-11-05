// API Base URL
const API_BASE = '../backend/api';

// Form gönderimlerini handle et
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// Giriş işlemi
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    formData.append('action', 'login');
    
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/auth.php`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = 'index.html';
        } else {
            errorDiv.textContent = data.message || 'Giriş başarısız';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
        errorDiv.classList.remove('hidden');
        console.error('Giriş hatası:', error);
    }
}

// Kayıt işlemi
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    formData.append('action', 'register');
    
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/auth.php`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = 'index.html';
        } else {
            errorDiv.textContent = data.message || 'Kayıt başarısız';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
        errorDiv.classList.remove('hidden');
        console.error('Kayıt hatası:', error);
    }
}

