// API Base URL (global değişken, sadece bir kez tanımla)
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

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
            credentials: 'include', // Cookie'leri dahil et
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Giriş başarılı, keşfet sayfasına yönlendir
            window.location.replace('index.html');
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
            credentials: 'include', // Cookie'leri dahil et
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Kayıt başarılı, kısa bir bekleme sonrası keşfet sayfasına yönlendir (session'ın kaydedilmesi için)
            console.log('Kayıt başarılı, session:', data.session_id);
            setTimeout(() => {
                window.location.replace('index.html');
            }, 300);
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

