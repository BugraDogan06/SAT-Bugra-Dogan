// Arama özelliği
const API_BASE = '../backend/api';

// Global fonksiyonlar
window.performSearch = performSearch;

// Arama yap
async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/search.php?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
            displaySearchResults(data.posts, data.users);
        }
    } catch (error) {
        console.error('Arama hatası:', error);
    }
}

// Arama sonuçlarını göster
function displaySearchResults(posts, users) {
    const container = document.getElementById('postsContainer');
    
    let html = '<div class="mb-8"><h2 class="text-2xl font-bold text-white mb-4">Arama Sonuçları</h2></div>';
    
    if (posts.length > 0) {
        html += '<div class="mb-8"><h3 class="text-xl font-semibold text-white mb-4">Gönderiler</h3>';
        html += posts.map(post => `
            <div class="post-card bg-neutral-900 rounded-2xl overflow-hidden border border-gray-700 mb-4">
                <img src="${post.image_url}" class="w-full h-80 object-cover" alt="${post.title}" />
                <div class="p-4">
                    <div class="flex items-center mb-2">
                        <img src="${post.profile_picture || 'https://via.placeholder.com/40'}" 
                             class="w-10 h-10 rounded-full mr-3" alt="${post.username}">
                        <div>
                            <h3 class="font-semibold text-white">${post.username}</h3>
                            <h2 class="font-semibold text-lg text-white">${post.title}</h2>
                        </div>
                    </div>
                    ${post.description ? `<p class="text-gray-400 mb-3">${post.description}</p>` : ''}
                    <div class="flex items-center justify-between text-gray-400">
                        <button onclick="toggleLike(${post.id})" class="flex items-center space-x-2 hover:text-red-500">
                            <span id="likeBtn-${post.id}">❤️</span>
                            <span id="likeCount-${post.id}">${post.like_count}</span>
                        </button>
                        <button onclick="showComments(${post.id})" class="flex items-center space-x-2 hover:text-red-500">
                            <span>💬</span>
                            <span id="commentCount-${post.id}">${post.comment_count}</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        html += '</div>';
    }
    
    if (users.length > 0) {
        html += '<div><h3 class="text-xl font-semibold text-white mb-4">Kullanıcılar</h3>';
        html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
        html += users.map(user => `
            <div class="bg-neutral-900 rounded-xl p-4 border border-gray-700 flex items-center space-x-3">
                <img src="${user.profile_picture || 'https://via.placeholder.com/50'}" 
                     class="w-12 h-12 rounded-full" alt="${user.username}">
                <div>
                    <h4 class="font-semibold text-white">${user.username}</h4>
                    ${user.full_name ? `<p class="text-gray-400 text-sm">${user.full_name}</p>` : ''}
                </div>
            </div>
        `).join('');
        html += '</div></div>';
    }
    
    if (posts.length === 0 && users.length === 0) {
        html += '<p class="text-center text-gray-400 py-10">Sonuç bulunamadı</p>';
    }
    
    container.innerHTML = html;
}

