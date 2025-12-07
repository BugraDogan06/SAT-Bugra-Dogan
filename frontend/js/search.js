// Arama özelliği
// API Base URL (global değişken, sadece bir kez tanımla)
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

// Global fonksiyonlar
window.performSearch = performSearch;
window.toggleFollow = toggleFollow;

// Arama yap
async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const searchContainer = document.getElementById('searchResultsContainer');
    const searchList = document.getElementById('searchResultsList');
    
    if (!query) {
        // Arama boşsa dropdown'ı gizle
        if (searchContainer) {
            searchContainer.classList.add('hidden');
        }
        // Normal gönderileri göster
        if (typeof loadPosts === 'function') {
            loadPosts();
        }
        return;
    }
    
    if (!searchContainer || !searchList) {
        console.error('Arama container elementleri bulunamadı!');
        return;
    }
    
    // Dropdown'ı göster ve yükleniyor mesajı göster
    searchContainer.classList.remove('hidden');
    searchList.innerHTML = '<div class="flex items-center justify-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div><p class="text-gray-400 ml-3 text-sm">Aranıyor...</p></div>';
    
    try {
        console.log('Arama yapılıyor:', query);
        const response = await fetch(`${API_BASE}/search.php?q=${encodeURIComponent(query)}`, {
            credentials: 'include'
        });
        
        // Response'u text olarak oku, eğer JSON değilse hata var demektir
        const responseText = await response.text();
        console.log('Response text:', responseText.substring(0, 200));
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse hatası:', parseError);
            console.error('Response:', responseText);
            searchList.innerHTML = '<div class="text-center py-4"><p class="text-red-500 text-sm">Sunucu hatası</p></div>';
            return;
        }
        
        console.log('Arama sonuçları:', data);
        
        if (data.success) {
            displaySearchResults(data.posts || [], data.users || []);
        } else {
            searchList.innerHTML = `<div class="text-center py-4"><p class="text-red-500 text-sm">${data.message || 'Arama sırasında bir hata oluştu'}</p></div>`;
        }
    } catch (error) {
        console.error('Arama hatası:', error);
        searchList.innerHTML = '<div class="text-center py-4"><p class="text-red-500 text-sm">Arama yapılırken bir hata oluştu</p></div>';
    }
}

// Arama sonuçlarını göster (dropdown içinde)
function displaySearchResults(posts, users) {
    const searchList = document.getElementById('searchResultsList');
    
    if (!searchList) {
        console.error('searchResultsList elementi bulunamadı!');
        return;
    }
    
    // Sadece kullanıcıları dropdown'da göster (gönderileri gösterme)
    if (users && users.length > 0) {
        let html = '<div class="space-y-2">';
        html += users.map(user => `
            <div class="bg-neutral-900 rounded-lg p-3 border border-gray-700 hover:border-red-600 transition-all duration-300 cursor-pointer group" onclick="goToUserProfile(${user.id})">
                <div class="flex items-center space-x-3">
                    <img src="${user.profile_picture || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'%3E%3Crect width=\'50\' height=\'50\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'18\'%3E%3F%3C/text%3E%3C/svg%3E'}" 
                         class="w-10 h-10 rounded-full object-cover border-2 border-gray-600 flex-shrink-0 group-hover:border-red-600 transition" alt="${user.username}">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-white text-sm truncate">${user.username}</h4>
                        ${user.full_name ? `<p class="text-gray-400 text-xs truncate">${user.full_name}</p>` : ''}
                    </div>
                    <button 
                        onclick="event.stopPropagation(); toggleFollow(${user.id}, ${user.is_following ? 'true' : 'false'})" 
                        id="followBtn-${user.id}"
                        class="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            user.is_following 
                                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:shadow-red-600/50'
                        }"
                    >
                        ${user.is_following ? '✓ Takiptesin' : '+ Takip Et'}
                    </button>
                </div>
            </div>
        `).join('');
        html += '</div>';
        searchList.innerHTML = html;
    } else {
        searchList.innerHTML = '<div class="text-center py-6"><p class="text-gray-400 text-sm">Kullanıcı bulunamadı</p></div>';
    }
}

// Kullanıcı profil sayfasına git
function goToUserProfile(userId) {
    window.location.href = `profile.html?user_id=${userId}`;
}

// Global fonksiyon olarak export et
window.goToUserProfile = goToUserProfile;

// Takip et / Takipten çık
async function toggleFollow(userId, isFollowing) {
    const button = document.getElementById(`followBtn-${userId}`);
    
    if (!button) return;
    
    // Butonu devre dışı bırak
    button.disabled = true;
    button.textContent = isFollowing ? 'Takipten Çıkılıyor...' : 'Takip Ediliyor...';
    
    try {
        let response;
        
        if (isFollowing) {
            // Takipten çık
            response = await fetch(`${API_BASE}/follow.php?following_id=${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
        } else {
            // Takip et
            const formData = new FormData();
            formData.append('following_id', userId);
            
            response = await fetch(`${API_BASE}/follow.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
        }
        
        // Response'u text olarak oku, eğer JSON değilse hata var demektir
        const responseText = await response.text();
        console.log('Follow response:', responseText.substring(0, 200));
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse hatası:', parseError);
            console.error('Response:', responseText);
            alert('Sunucu hatası. Lütfen sayfayı yenileyin ve tekrar deneyin.');
            button.textContent = isFollowing ? 'Takiptesin' : 'Takip Et';
            button.disabled = false;
            return;
        }
        
        if (data.success) {
            // Butonu güncelle
            if (data.is_following) {
                button.textContent = '✓ Takiptesin';
                button.className = 'w-full px-4 py-2 rounded-lg text-sm font-medium transition bg-gray-700 hover:bg-gray-600 text-white';
            } else {
                button.textContent = '+ Takip Et';
                button.className = 'w-full px-4 py-2 rounded-lg text-sm font-medium transition bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:shadow-red-600/50';
            }
            
            // Eğer profil sayfasındaysak takip istatistiklerini güncelle
            if (typeof updateFollowStats === 'function') {
                updateFollowStats();
            }
        } else {
            alert(data.message || 'Bir hata oluştu');
            // Butonu eski haline getir
            button.textContent = isFollowing ? '✓ Takiptesin' : '+ Takip Et';
        }
    } catch (error) {
        console.error('Takip hatası:', error);
        alert('Bir hata oluştu. Lütfen tekrar deneyin.');
        // Butonu eski haline getir
        button.textContent = isFollowing ? '✓ Takiptesin' : '+ Takip Et';
    } finally {
        button.disabled = false;
    }
}

