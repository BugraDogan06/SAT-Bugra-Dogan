// API Base URL (global değişken, sadece bir kez tanımla)
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

// DOMContentLoaded'da otomatik çalışmasını engelle
// main.js'den manuel olarak çağrılacak (session kontrolü tamamlandıktan sonra)
// Böylece login butonu önce görünüp sonra kaybolmaz

async function initAuthUI() {
    const loginButtons = document.querySelectorAll('[data-auth-login]');
    const logoutButtons = document.querySelectorAll('[data-auth-logout]');

    // Always bind logout handlers if button exists (sadece bir kez)
    logoutButtons.forEach(button => {
        if (!button.hasAttribute('data-listener-bound')) {
            button.addEventListener('click', handleLogout);
            button.setAttribute('data-listener-bound', 'true');
        }
    });

    try {
        const response = await fetch(`${API_BASE}/auth.php`, {
            method: 'GET',
            credentials: 'include', // Cookie'leri dahil et
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-cache' // Cache'i bypass et
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Giriş yapılmış - login butonlarını gizle, logout butonlarını göster
            loginButtons.forEach(button => button.classList.add('hidden'));
            logoutButtons.forEach(button => button.classList.remove('hidden'));
        } else {
            // Giriş yapılmamış - login butonlarını göster, logout butonlarını gizle
            loginButtons.forEach(button => button.classList.remove('hidden'));
            logoutButtons.forEach(button => button.classList.add('hidden'));
        }
    } catch (error) {
        console.error('Oturum durumu kontrol edilirken hata oluştu:', error);
        // Hata durumunda varsayılan olarak login butonunu göster
        loginButtons.forEach(button => button.classList.remove('hidden'));
        logoutButtons.forEach(button => button.classList.add('hidden'));
    }
}

// Global olarak export et
window.initAuthUI = initAuthUI;

async function handleLogout(event) {
    event.preventDefault();

    try {
        const response = await fetch(`${API_BASE}/auth.php`, {
            method: 'DELETE',
            credentials: 'include', // Cookie'leri dahil et
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            // Çıkış başarılı, ana sayfaya (giriş sayfası) yönlendir
            window.location.href = '../index.html';
        } else {
            alert(data.message || 'Çıkış yapılırken bir hata oluştu');
        }
    } catch (error) {
        console.error('Çıkış yapılırken hata oluştu:', error);
        alert('Çıkış yapılırken bir hata oluştu');
    }
}


