// API Base URL
const API_BASE = '../backend/api';

// Sayfa yüklendiğinde profil bilgilerini getir
document.addEventListener('DOMContentLoaded', function() {
    loadProfile();
});

// Profil bilgilerini yükle
async function loadProfile() {
    try {
        // Önce login kontrolü yap
        const authResponse = await fetch(`${API_BASE}/auth.php`);
        const authData = await authResponse.json();
        
        if (!authData.success) {
            window.location.href = 'login.html';
            return;
        }
        
        // Profil bilgilerini ve gönderileri yükle
        loadUserProfile(authData.user.id);
        loadUserPosts(authData.user.id);
        
    } catch (error) {
        console.error('Profil yüklenirken hata:', error);
        window.location.href = 'login.html';
    }
}

// Kullanıcı profil bilgilerini yükle
async function loadUserProfile(userId) {
    // Profil bilgileri backend'den gelecek
    // Şimdilik placeholder
}

// Kullanıcı gönderilerini yükle
async function loadUserPosts(userId) {
    try {
        const response = await fetch(`${API_BASE}/posts.php?user_id=${userId}`);
        const data = await response.json();
        
        if (data.success) {
            displayUserPosts(data.posts);
        }
    } catch (error) {
        console.error('Gönderiler yüklenirken hata:', error);
    }
}

// Kullanıcı gönderilerini göster
function displayUserPosts(posts) {
    const container = document.getElementById('userPostsContainer');
    
    if (posts.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-10 col-span-3">Henüz gönderi yok</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="bg-neutral-900 rounded-xl overflow-hidden border border-gray-700">
            <img src="${post.image_url}" class="w-full h-64 object-cover" alt="${post.title}">
            <div class="p-4">
                <h4 class="font-semibold text-white mb-2">${post.title}</h4>
                <div class="flex items-center justify-between text-gray-400 text-sm">
                    <span>❤️ ${post.like_count}</span>
                    <span>💬 ${post.comment_count}</span>
                </div>
            </div>
        </div>
    `).join('');
}

