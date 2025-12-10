// API Base URL (global değişken, sadece bir kez tanımla)
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

// HTML escape fonksiyonu
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sayfa yüklendiğinde profil bilgilerini getir
document.addEventListener('DOMContentLoaded', function() {
    loadProfile();
    
    // Logout butonlarına event listener ekle
    const logoutButtons = document.querySelectorAll('[data-auth-logout]');
    logoutButtons.forEach(button => {
        if (!button.hasAttribute('data-listener-bound')) {
            button.addEventListener('click', async function(e) {
                e.preventDefault();
                await handleLogout();
            });
            button.setAttribute('data-listener-bound', 'true');
        }
    });
});

// Logout işlemi
async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE}/auth.php`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            // Çıkış başarılı, ana sayfaya (giriş sayfası) yönlendir
            window.location.replace('../index.html');
        } else {
            alert(data.message || 'Çıkış yapılırken bir hata oluştu');
        }
    } catch (error) {
        console.error('Çıkış yapılırken hata oluştu:', error);
        alert('Çıkış yapılırken bir hata oluştu');
    }
}

// Gönderi düzenleme fonksiyonu
async function editPostFromProfile(postId) {
    try {
        // Gönderi bilgilerini getir
        const response = await fetch(`${API_BASE}/posts.php?user_id=${currentProfileUserId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success || !data.posts) {
            alert('Gönderi bulunamadı');
            return;
        }
        
        const post = data.posts.find(p => p.id === postId);
        if (!post) {
            alert('Gönderi bulunamadı');
            return;
        }
        
        // Universal modal'ı aç ve formu doldur
        if (typeof openUniversalModal === 'function') {
            openUniversalModal('post');
            
            // Form alanlarını doldur
            const postIdInput = document.getElementById('postId');
            const postTitle = document.getElementById('postTitle');
            const postDescription = document.getElementById('postDescription');
            const postCarBrand = document.getElementById('postCarBrand');
            const postCarModel = document.getElementById('postCarModel');
            const postSubmitText = document.getElementById('postSubmitText');
            const imagePreview = document.getElementById('imagePreview');
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            const fileSelectButton = document.getElementById('fileSelectButton');
            
            if (postIdInput) postIdInput.value = post.id;
            if (postTitle) postTitle.value = post.title || '';
            if (postDescription) postDescription.value = post.description || '';
            if (postCarBrand) postCarBrand.value = post.car_brand || '';
            if (postCarModel) postCarModel.value = post.car_model || '';
            if (postSubmitText) postSubmitText.textContent = '💾 Güncelle';
            
            // Mevcut görseli göster
            if (imagePreview && imagePreviewContainer && post.image_url) {
                const imagePath = post.image_url.startsWith('http') ? post.image_url : '../' + post.image_url;
                imagePreview.src = imagePath;
                imagePreviewContainer.classList.remove('hidden');
                if (fileSelectButton) fileSelectButton.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Gönderi bilgisi alınırken hata:', error);
        alert('Gönderi bilgisi alınamadı');
    }
}

// Gönderi silme fonksiyonu
async function deletePostFromProfile(postId) {
    if (!confirm('Bu gönderiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts.php?id=${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Gönderileri yeniden yükle
            if (currentProfileUserId) {
                loadUserPosts(currentProfileUserId);
            } else {
                // Auth kontrolü yap ve profili yeniden yükle
                const authResponse = await fetch(`${API_BASE}/auth.php`, { credentials: 'include' });
                const authData = await authResponse.json();
                if (authData.success && authData.user) {
                    loadUserPosts(authData.user.id);
                }
            }
            
            // Bildirim göster
            alert('✅ Gönderi başarıyla silindi');
        } else {
            alert('❌ ' + (data.message || 'Gönderi silinemedi'));
        }
    } catch (error) {
        console.error('Gönderi silme hatası:', error);
        alert('❌ Gönderi silinirken bir hata oluştu');
    }
}

// Global fonksiyonlar
window.editPostFromProfile = editPostFromProfile;
window.deletePostFromProfile = deletePostFromProfile;
window.handleLogout = handleLogout;

// Profil bilgilerini yükle
async function loadProfile() {
    try {
        // Önce login kontrolü yap
        const authResponse = await fetch(`${API_BASE}/auth.php`, {
            credentials: 'include'
        });
        const authData = await authResponse.json();
        
        console.log('Auth response:', authData); // Debug
        
        if (!authData.success) {
            window.location.href = 'login.html';
            return;
        }
        
        // URL'den user_id parametresini al
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('user_id');
        
        let userId = authData.user.id;
        let isOwnProfile = true;
        
        // Eğer farklı bir kullanıcının profili görüntüleniyorsa
        if (targetUserId && targetUserId !== authData.user.id) {
            userId = parseInt(targetUserId);
            isOwnProfile = false;
        }
        
        // Kullanıcı bilgilerini getir
        if (isOwnProfile) {
            // Kendi profili - authData'dan al
            console.log('User data:', authData.user); // Debug
            displayUserProfile(authData.user, isOwnProfile);
        loadUserPosts(authData.user.id);
        } else {
            // Başka kullanıcının profili - API'den getir
            const userResponse = await fetch(`${API_BASE}/users.php?id=${userId}`, {
                credentials: 'include'
            });
            const userData = await userResponse.json();
            
            if (userData.success && userData.user) {
                displayUserProfile(userData.user, isOwnProfile);
                loadUserPosts(userData.user.id);
            } else {
                alert('Kullanıcı bulunamadı');
                window.location.href = 'profile.html';
            }
        }
        
    } catch (error) {
        console.error('Profil yüklenirken hata:', error);
        window.location.href = 'login.html';
    }
}

// Kullanıcı profil bilgilerini göster
function displayUserProfile(user, isOwnProfile = true) {
    console.log('displayUserProfile called with:', user, 'isOwnProfile:', isOwnProfile); // Debug
    
    const profilePicture = document.getElementById('profilePicture');
    const profileName = document.getElementById('profileName');
    const profileFullName = document.getElementById('profileFullName');
    const profileBio = document.getElementById('profileBio');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const createPostBtn = document.getElementById('createPostBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const followButtonContainer = document.getElementById('followButtonContainer');
    const followButton = document.getElementById('followButton');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const postsCount = document.getElementById('postsCount');
    const followersCount = document.getElementById('followersCount');
    const followingCount = document.getElementById('followingCount');
    
    if (!profilePicture || !profileName || !profileBio) {
        console.error('Profil elementleri bulunamadı!');
        return;
    }
    
    // Profil fotoğrafı
    if (user.profile_picture) {
        // Backend'den gelen yol zaten 'uploads/profiles/...' formatında
        const imagePath = '../' + user.profile_picture;
        console.log('Profil fotoğrafı yolu:', imagePath); // Debug
        profilePicture.src = imagePath;
    } else {
        profilePicture.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'150\' height=\'150\'%3E%3Crect width=\'150\' height=\'150\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'20\'%3E%3F%3C/text%3E%3C/svg%3E';
    }
    
    // Kullanıcı adı
    profileName.textContent = user.username || 'Kullanıcı Adı';
    console.log('Kullanıcı adı ayarlandı:', user.username); // Debug
    
    // Tam ad
    if (profileFullName) {
        if (user.full_name) {
            profileFullName.textContent = user.full_name;
            profileFullName.classList.remove('hidden');
        } else {
            profileFullName.classList.add('hidden');
        }
    }
    
    // Biyografi
    if (user.bio) {
        profileBio.textContent = user.bio;
    } else {
        profileBio.textContent = '';
    }
    
    // Takip istatistikleri
    if (postsCount) {
        postsCount.textContent = user.posts_count || 0;
    }
    if (followersCount) {
        followersCount.textContent = user.followers_count || 0;
    }
    if (followingCount) {
        followingCount.textContent = user.following_count || 0;
    }
    
    // Buton görünürlüğünü ayarla
    if (isOwnProfile) {
        // Kendi profili - Profil Düzenle, Araç Ekle ve Çıkış Yap butonlarını göster
        if (createPostBtn) {
            createPostBtn.classList.remove('hidden');
        }
        if (editProfileBtn) {
            editProfileBtn.classList.remove('hidden');
        }
        
        // Çıkış Yap butonu - önemli olduğu için ID ile al
        const logoutButton = document.getElementById('logoutBtn');
        if (logoutButton) {
            logoutButton.classList.remove('hidden');
        }
        
        // Araba ekle butonunu göster
        const addCarBtn = document.getElementById('addCarBtn');
        const addFirstCarBtn = document.getElementById('addFirstCarBtn');
        if (addCarBtn) addCarBtn.classList.remove('hidden');
        if (addFirstCarBtn) addFirstCarBtn.classList.remove('hidden');
        
        // Takip butonunu ve Mesaj Gönder butonunu gizle
        if (followButtonContainer) {
            followButtonContainer.classList.add('hidden');
        }
        if (sendMessageBtn) {
            sendMessageBtn.classList.add('hidden');
        }
        
        // cars.js'e isOwnProfile bilgisini aktar
        if (typeof window.updateCarOwnershipStatus === 'function') {
            window.updateCarOwnershipStatus(true);
        }
    } else {
        // Diğer kullanıcının profili - Takip ve Mesaj butonlarını göster
        if (createPostBtn) {
            createPostBtn.classList.add('hidden');
        }
        if (editProfileBtn) {
            editProfileBtn.classList.add('hidden');
        }
        
        // Çıkış Yap butonunu gizle
        const logoutButton = document.getElementById('logoutBtn');
        if (logoutButton) {
            logoutButton.classList.add('hidden');
        }
        
        // Araba ekle butonunu gizle
        const addCarBtn = document.getElementById('addCarBtn');
        const addFirstCarBtn = document.getElementById('addFirstCarBtn');
        if (addCarBtn) addCarBtn.classList.add('hidden');
        if (addFirstCarBtn) addFirstCarBtn.classList.add('hidden');
        
        // Takip butonunu ve Mesaj Gönder butonunu göster
        if (followButtonContainer && followButton) {
            followButtonContainer.classList.remove('hidden');
            // Takip durumunu kontrol et ve buton metnini güncelle
            // is_following değeri boolean veya 1/0 olabilir
            const isFollowing = user.is_following === true || user.is_following === 1 || user.is_following === '1';
            if (isFollowing) {
                followButton.textContent = 'Takibi Bırak';
                followButton.className = 'px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-gray-700 rounded-lg text-white text-sm font-semibold transition';
            } else {
                followButton.textContent = 'Takip Et';
                followButton.className = 'px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-semibold transition';
            }
        }
        // Mesaj Gönder butonunu göster
        if (sendMessageBtn) {
            sendMessageBtn.classList.remove('hidden');
        }
        
        // cars.js'e isOwnProfile bilgisini aktar
        if (typeof window.updateCarOwnershipStatus === 'function') {
            window.updateCarOwnershipStatus(false);
        }
    }
}

// Kullanıcı gönderilerini yükle
async function loadUserPosts(userId) {
    try {
        const response = await fetch(`${API_BASE}/posts.php?user_id=${userId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            displayUserPosts(data.posts);
            // Gönderi sayısı zaten displayUserProfile'da güncelleniyor
        }
    } catch (error) {
        console.error('Gönderiler yüklenirken hata:', error);
    }
}

// Takip/Takibi Bırak işlemi
async function toggleFollow() {
    try {
        // URL'den user_id parametresini al
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('user_id');
        
        if (!targetUserId) {
            alert('Kullanıcı ID bulunamadı');
            return;
        }
        
        const followButton = document.getElementById('followButton');
        if (!followButton) {
            console.error('Takip butonu bulunamadı');
            return;
        }
        
        // Buton metninden durumu kontrol et
        const buttonText = followButton.textContent.trim();
        const isFollowing = buttonText === 'Takibi Bırak' || buttonText.includes('Takibi Bırak');
        
        let response;
        if (isFollowing) {
            // Takibi bırak
            response = await fetch(`${API_BASE}/follow.php?user_id=${targetUserId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
        } else {
            // Takip et
            response = await fetch(`${API_BASE}/follow.php`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: parseInt(targetUserId) })
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Buton metnini ve stilini güncelle
            if (isFollowing) {
                followButton.textContent = 'Takip Et';
                followButton.className = 'px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-semibold transition';
            } else {
                followButton.textContent = 'Takibi Bırak';
                followButton.className = 'px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-gray-700 rounded-lg text-white text-sm font-semibold transition';
            }
            
            // Takip istatistiklerini güncelle
            await updateFollowStats();
        } else {
            alert(data.message || 'İşlem başarısız oldu');
        }
    } catch (error) {
        console.error('Takip işlemi sırasında hata:', error);
        alert('Takip işlemi sırasında bir hata oluştu');
    }
}

// Global fonksiyon olarak export et
window.toggleFollow = toggleFollow;

// Takip istatistiklerini güncelle (takip işlemlerinden sonra çağrılacak)
async function updateFollowStats() {
    try {
        // URL'den user_id parametresini al
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('user_id');
        
        let response;
        if (targetUserId) {
            // Diğer kullanıcının profili - o kullanıcının bilgilerini getir
            response = await fetch(`${API_BASE}/users.php?id=${targetUserId}`, {
                credentials: 'include'
            });
        } else {
            // Kendi profili - auth'dan al
            response = await fetch(`${API_BASE}/auth.php`, {
                credentials: 'include'
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            const user = targetUserId ? data.user : data.user;
            const followersCount = document.getElementById('followersCount');
            const followingCount = document.getElementById('followingCount');
            const postsCount = document.getElementById('postsCount');
            
            if (followersCount) {
                followersCount.textContent = user.followers_count || 0;
            }
            if (followingCount) {
                followingCount.textContent = user.following_count || 0;
            }
            if (postsCount) {
                postsCount.textContent = user.posts_count || 0;
            }
            
            // Eğer diğer kullanıcının profiliyse, takip durumunu da güncelle
            if (targetUserId && user.is_following !== undefined) {
                const followButton = document.getElementById('followButton');
                if (followButton) {
                    // is_following değeri boolean veya 1/0 olabilir
                    const isFollowing = user.is_following === true || user.is_following === 1 || user.is_following === '1';
                    if (isFollowing) {
                        followButton.textContent = 'Takibi Bırak';
                        followButton.className = 'px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-gray-700 rounded-lg text-white text-sm font-semibold transition';
                    } else {
                        followButton.textContent = 'Takip Et';
                        followButton.className = 'px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-semibold transition';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Takip istatistikleri güncellenirken hata:', error);
    }
}

// Global fonksiyon olarak export et
window.updateFollowStats = updateFollowStats;

// Mevcut kullanıcı ID'sini sakla
let currentProfileUserId = null;

// Video ve resim tıklama handler'ları
function handleVideoClick(videoPath, username, title) {
    if (typeof window.openVideoModal === 'function') {
        window.openVideoModal(videoPath, username, title);
    } else if (typeof openVideoModal === 'function') {
        openVideoModal(videoPath, username, title);
    } else {
        console.error('openVideoModal fonksiyonu bulunamadı');
        // Fallback: Basit video modal
        showSimpleVideoModal(videoPath, username, title);
    }
}

function handleImageClick(imagePath, username, title) {
    if (typeof window.openImageModal === 'function') {
        window.openImageModal(imagePath, username, title);
    } else if (typeof openImageModal === 'function') {
        openImageModal(imagePath, username, title);
    } else {
        console.error('openImageModal fonksiyonu bulunamadı');
        // Fallback: Basit resim modal
        showSimpleImageModal(imagePath, username, title);
    }
}

// Basit video modal (fallback)
function showSimpleVideoModal(videoPath, username, title) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-[90vh] m-4 w-full">
            <button onclick="this.closest('.fixed').remove(); document.body.style.overflow = ''; const video = this.closest('.fixed').querySelector('video'); if(video) video.pause();" 
                    class="absolute -top-12 right-0 text-white hover:text-red-500 transition text-2xl z-10">
                ✕
            </button>
            <video 
                src="${videoPath}" 
                class="max-w-full max-h-[90vh] rounded-lg" 
                controls
                autoplay
                style="width: 100%; height: auto;"
            >
                Tarayıcınız video oynatmayı desteklemiyor.
            </video>
            ${title ? `<p class="text-white text-center mt-4 font-semibold">${title}</p>` : ''}
            <p class="text-gray-400 text-center mt-2">@${username}</p>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            const video = modal.querySelector('video');
            if (video) video.pause();
            modal.remove();
            document.body.style.overflow = '';
        }
    });
}

// Basit resim modal (fallback)
function showSimpleImageModal(imagePath, username, title) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-[90vh] m-4 w-full">
            <button onclick="this.closest('.fixed').remove(); document.body.style.overflow = '';" 
                    class="absolute -top-12 right-0 text-white hover:text-red-500 transition text-2xl z-10">
                ✕
            </button>
            <img src="${imagePath}" class="max-w-full max-h-[90vh] rounded-lg mx-auto" alt="${title || 'Gönderi'}">
            ${title ? `<p class="text-white text-center mt-4 font-semibold">${title}</p>` : ''}
            <p class="text-gray-400 text-center mt-2">@${username}</p>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
}

// Global olarak export et
window.handleVideoClick = handleVideoClick;
window.handleImageClick = handleImageClick;

// Kullanıcı gönderilerini göster - Instagram Tarzı Grid
async function displayUserPosts(posts) {
    const container = document.getElementById('userPostsContainer');
    const noPostsMessage = document.getElementById('noPostsMessage');
    
    if (!container) return;
    
    if (posts.length === 0) {
        container.innerHTML = '';
        if (noPostsMessage) noPostsMessage.classList.remove('hidden');
        return;
    }
    
    if (noPostsMessage) noPostsMessage.classList.add('hidden');
    
    // Mevcut kullanıcı ID'sini al
    if (!currentProfileUserId) {
        try {
            const authResponse = await fetch(`${API_BASE}/auth.php`, {
                credentials: 'include'
            });
            const authData = await authResponse.json();
            if (authData.success && authData.user) {
                currentProfileUserId = authData.user.id;
            }
        } catch (error) {
            console.error('Kullanıcı bilgisi alınamadı:', error);
        }
    }
    
    // URL'den görüntülenen kullanıcı ID'sini al
    const urlParams = new URLSearchParams(window.location.search);
    const viewedUserId = urlParams.get('user_id') ? parseInt(urlParams.get('user_id')) : currentProfileUserId;
    const isOwnPosts = currentProfileUserId && viewedUserId === currentProfileUserId;
    
    container.innerHTML = posts.map((post) => {
        // Medya tipini belirle
        const mediaType = post.media_type || (post.video_url ? 'video' : 'image');
        const mediaPath = mediaType === 'video' 
            ? (post.video_url && post.video_url.startsWith('http') ? post.video_url : '../' + post.video_url)
            : (post.image_url && post.image_url.startsWith('http') ? post.image_url : '../' + post.image_url);
        
        // Eğer medya yoksa atla
        if (!mediaPath || mediaPath === '../' || (!post.image_url && !post.video_url)) {
            return '';
        }
        
        // Instagram tarzı grid item
        const onClickHandler = mediaType === 'video' 
            ? `handleVideoClick('${mediaPath}', '${escapeHtml(post.username || '')}', '${escapeHtml(post.title || '')}')`
            : `handleImageClick('${mediaPath}', '${escapeHtml(post.username || '')}', '${escapeHtml(post.title || '')}')`;
        
        return `
        <div class="instagram-grid-item relative group">
            <!-- Medya (Tıklanabilir) -->
            <div class="w-full h-full cursor-pointer" onclick="${onClickHandler}">
            ${mediaType === 'video' ? `
            <video 
                src="${mediaPath}" 
                class="w-full h-full object-cover video-thumbnail" 
                preload="metadata"
                muted
                loop
                playsinline
                onmouseenter="this.play(); this.muted = false;"
                onmouseleave="this.pause(); this.muted = true; this.currentTime = 0;"
                onclick="event.stopPropagation(); this.muted = false; this.play();"
            ></video>
            <div class="grid-item-badge">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>
            ` : `
            <img src="${mediaPath}" 
                 class="w-full h-full object-cover" 
                 alt="${escapeHtml(post.title || 'Gönderi')}" />
            `}
                
                <!-- İstatistikler Overlay -->
                <div class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition bg-black/50">
                <div class="flex items-center gap-6 text-white font-semibold">
                    <span class="flex items-center gap-1">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        ${post.like_count || 0}
                    </span>
                    <span class="flex items-center gap-1">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                        </svg>
                        ${post.comment_count || 0}
                    </span>
                </div>
            </div>
            </div>
            
            <!-- Düzenle/Sil Butonları (Sadece kendi gönderileri için) -->
            ${isOwnPosts ? `
            <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                <button 
                    onclick="event.stopPropagation(); editPostFromProfile(${post.id})"
                    class="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition transform hover:scale-110"
                    title="Düzenle"
                >
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button 
                    onclick="event.stopPropagation(); deletePostFromProfile(${post.id})"
                    class="p-2 bg-red-600 hover:bg-red-700 rounded-lg shadow-lg transition transform hover:scale-110"
                    title="Sil"
                >
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
            ` : ''}
        </div>
        `;
    }).filter(html => html !== '').join('');
}

// Profil düzenleme modalını aç
async function openEditProfileModal() {
    const modal = document.getElementById('universalModal');
    if (!modal) {
        console.error('universalModal element not found');
        return;
    }
    
    // Kullanıcı bilgilerini al
    try {
        const response = await fetch(`${API_BASE}/auth.php`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            const profilePicPath = user.profile_picture ? '../' + user.profile_picture : '';
            
            // Modal içeriğini oluştur
            modal.innerHTML = `
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-red-600/30 shadow-2xl">
                        <!-- Header -->
                        <div class="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                            <h2 class="text-2xl font-bold text-white">Profili Düzenle</h2>
                            <button onclick="closeEditProfileModal()" class="text-gray-400 hover:text-white transition">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Body -->
                        <div class="p-6">
                            <form id="editProfileForm" onsubmit="event.preventDefault(); updateProfile();" class="space-y-6">
                                <!-- Profil Fotoğrafı -->
                                <div class="flex flex-col items-center">
                                    <img id="profilePicturePreview" 
                                         src="${profilePicPath || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'150\' height=\'150\'%3E%3Crect width=\'150\' height=\'150\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'60\'%3E%3F%3C/text%3E%3C/svg%3E'}" 
                                         alt="Profil" 
                                         class="w-32 h-32 rounded-full object-cover mb-4 border-4 border-red-600">
                                    <label class="cursor-pointer px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm font-semibold transition">
                                        Fotoğraf Değiştir
                                        <input type="file" name="profile_picture" accept="image/*" onchange="previewProfilePicture(this)" class="hidden">
                                    </label>
                                </div>
                                
                                <!-- Ad Soyad -->
                                <div>
                                    <label class="block text-sm font-semibold text-gray-300 mb-2">Ad Soyad</label>
                                    <input 
                                        type="text" 
                                        id="editFullName" 
                                        name="full_name" 
                                        value="${escapeHtml(user.full_name || '')}"
                                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" 
                                        placeholder="Ad Soyad">
                                </div>
                                
                                <!-- Biyografi -->
                                <div>
                                    <label class="block text-sm font-semibold text-gray-300 mb-2">Biyografi</label>
                                    <textarea 
                                        id="editBio" 
                                        name="bio" 
                                        rows="4" 
                                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500 resize-none" 
                                        placeholder="Kendiniz hakkında birkaç şey yazın...">${escapeHtml(user.bio || '')}</textarea>
                                </div>
                                
                                <!-- Hata Mesajı -->
                                <div id="editProfileError" class="hidden bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg"></div>
                                
                                <!-- Kaydet Butonu -->
                                <button 
                                    type="submit" 
                                    class="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition shadow-lg">
                                    💾 Değişiklikleri Kaydet
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            // Modal'ı göster
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error);
        alert('Profil bilgileri yüklenirken bir hata oluştu');
    }
}

// Profil düzenleme formunu yükle
async function loadEditProfileForm() {
    try {
        const response = await fetch(`${API_BASE}/auth.php`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            const editBio = document.getElementById('editBio');
            const editFullName = document.getElementById('editFullName');
            
            if (editBio) editBio.value = user.bio || '';
            if (editFullName) editFullName.value = user.full_name || '';
            
            // Profil fotoğrafı önizlemesi
            const profilePicPreview = document.getElementById('profilePicturePreview');
            if (profilePicPreview && user.profile_picture) {
                profilePicPreview.src = '../' + user.profile_picture;
                profilePicPreview.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
}

// Profil düzenleme modalını kapat
function closeEditProfileModal() {
    const modal = document.getElementById('universalModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.innerHTML = '';
        document.body.style.overflow = '';
    }
}

// Profil fotoğrafı önizleme
function previewProfilePicture(input) {
    const preview = document.getElementById('profilePicturePreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Profil güncelle
async function updateProfile() {
    const form = document.getElementById('editProfileForm');
    const formData = new FormData(form);
    formData.append('action', 'update_profile');
    
    const errorDiv = document.getElementById('editProfileError');
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/auth.php`, {
            credentials: 'include',
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Profil bilgilerini yeniden yükle
            await loadProfile();
            closeEditProfileModal();
        } else {
            errorDiv.textContent = data.message || 'Profil güncellenirken bir hata oluştu';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
        errorDiv.classList.remove('hidden');
        console.error('Profil güncelleme hatası:', error);
    }
}

// Profil sayfasından mesaj gönder
async function openMessageFromProfile() {
    // URL'den user_id parametresini al
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('user_id');
    
    if (!targetUserId) {
        alert('Kullanıcı ID bulunamadı');
        return;
    }
    
    // Kullanıcı bilgilerini getir
    try {
        const response = await fetch(`${API_BASE}/users.php?id=${targetUserId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            const profilePic = user.profile_picture 
                ? '../' + user.profile_picture 
                : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'%3E%3Crect width=\'50\' height=\'50\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'18\'%3E%3F%3C/text%3E%3C/svg%3E';
            
            // messages.js'deki openMessageModal fonksiyonunu çağır
            if (typeof window.openMessageModal === 'function') {
                window.openMessageModal(parseInt(targetUserId), user.username || user.full_name || 'Kullanıcı', profilePic);
            } else {
                // Eğer messages.js henüz yüklenmemişse, yükle
                console.error('Mesajlaşma sistemi henüz yüklenmedi');
                alert('Mesajlaşma sistemi yükleniyor, lütfen tekrar deneyin');
            }
        } else {
            alert('Kullanıcı bilgileri alınamadı');
        }
    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        alert('Mesaj gönderilirken bir hata oluştu');
    }
}

// Manuel araba yükleme fonksiyonu
async function loadCarsManually() {
    try {
        // URL'den user_id al
        const urlParams = new URLSearchParams(window.location.search);
        const targetUserId = urlParams.get('user_id');
        
        // Mevcut kullanıcı bilgisini al
        const authResponse = await fetch(`${API_BASE}/auth.php`, {
            credentials: 'include'
        });
        const authData = await authResponse.json();
        
        if (authData.success && authData.user) {
            const userId = targetUserId ? parseInt(targetUserId) : authData.user.id;
            
            const response = await fetch(`${API_BASE}/cars.php?user_id=${userId}`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                // displayCars fonksiyonunu çağır
                if (typeof window.displayCars === 'function') {
                    window.displayCars(data.cars || []);
                } else {
                    // Eğer displayCars yoksa, basit bir grid oluştur
                    const container = document.getElementById('carsContainer');
                    const noCarsMessage = document.getElementById('noCarsMessage');
                    if (container) {
                        if ((data.cars || []).length === 0) {
                            container.innerHTML = '';
                            if (noCarsMessage) noCarsMessage.classList.remove('hidden');
                        } else {
                            if (noCarsMessage) noCarsMessage.classList.add('hidden');
                            // displayCars fonksiyonunu kullan
                            if (typeof window.displayCars === 'function') {
                                window.displayCars(data.cars || []);
                            } else {
                                // Fallback: Basit kart görünümü
                                container.innerHTML = (data.cars || []).map(car => {
                                    const imagePath = car.image_url 
                                        ? (car.image_url.startsWith('http') ? car.image_url : '../' + car.image_url)
                                        : '';
                                    return `
                                    <div class="bg-neutral-900 rounded-2xl border border-gray-700 overflow-hidden hover:border-red-600 transition-all duration-300">
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
                                            <div class="aspect-square md:aspect-auto md:h-full bg-neutral-800 overflow-hidden relative">
                                                ${imagePath ? `
                                                <img src="${imagePath}" alt="${escapeHtml(car.brand || '')} ${escapeHtml(car.model || '')}" class="w-full h-full object-cover" />
                                                ` : `
                                                <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                                    <svg class="w-24 h-24 text-gray-600" fill="currentColor" viewBox="0 0 252.094 252.094">
                                                        <path d="M196.979,146.785c-1.091,0-2.214,0.157-3.338,0.467l-4.228,1.165l-6.229-15.173c-3.492-8.506-13.814-15.426-23.01-15.426H91.808c-9.195,0-19.518,6.921-23.009,15.427l-6.218,15.145l-4.127-1.137c-1.124-0.31-2.247-0.467-3.338-0.467c-5.485,0-9.467,3.935-9.467,9.356c0,5.352,3.906,9.858,9.2,11.211c-2.903,8.017-5.159,20.034-5.159,27.929v32.287c0,6.893,5.607,12.5,12.5,12.5h4.583c6.893,0,12.5-5.607,12.5-12.5v-6.04h93.435v6.04c0,6.893,5.607,12.5,12.5,12.5h4.585c6.893,0,12.5-5.607,12.5-12.5v-32.287c0-7.887-2.252-19.888-5.15-27.905c5.346-1.32,9.303-5.85,9.303-11.235C206.445,150.72,202.464,146.785,196.979,146.785z M70.352,159.384l10.161-24.754c2.089-5.088,8.298-9.251,13.798-9.251h63.363c5.5,0,11.709,4.163,13.798,9.251l10.161,24.754c2.089,5.088-0.702,9.251-6.202,9.251H76.554C71.054,168.635,68.263,164.472,70.352,159.384z M97.292,199.635c0,2.75-2.25,5-5,5H71.554c-2.75,0-5-2.25-5-5v-8.271c0-2.75,2.25-5,5-5h20.738c2.75,0,5,2.25,5,5V199.635z M185.203,199.635c0,2.75-2.25,5-5,5h-20.736c-2.75,0-5-2.25-5-5v-8.271c0-2.75,2.25-5,5-5h20.736c2.75,0,5,2.25,5,5V199.635z"/>
                                                        <path d="M246.545,71.538L131.625,4.175c-1.525-0.894-3.506-1.386-5.578-1.386c-2.072,0-4.053,0.492-5.578,1.386L5.549,71.538C2.386,73.392,0,77.556,0,81.223v160.582c0,4.135,3.364,7.5,7.5,7.5h12.912c4.136,0,7.5-3.365,7.5-7.5V105.917c0-1.378,1.121-2.5,2.5-2.5h191.268c1.379,0,2.5,1.122,2.5,2.5v135.888c0,4.135,3.364,7.5,7.5,7.5h12.913c4.136,0,7.5-3.365,7.5-7.5V81.223C252.094,77.556,249.708,73.392,246.545,71.538z"/>
                                                    </svg>
                                                </div>
                                                `}
                                                ${car.is_featured ? `
                                                <div class="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">⭐ Öne Çıkan</div>
                                                ` : ''}
                                            </div>
                                            <div class="p-6 space-y-4">
                                                <div>
                                                    <h4 class="text-2xl font-bold text-white mb-1">${escapeHtml(car.brand || '')} ${escapeHtml(car.model || '')}</h4>
                                                    ${car.year ? `<p class="text-gray-400 text-sm">${car.year}</p>` : ''}
                                                </div>
                                                <div class="grid grid-cols-2 gap-3">
                                                    ${car.color ? `
                                                    <div class="bg-neutral-800 rounded-lg p-3 border border-gray-700">
                                                        <p class="text-gray-400 text-xs mb-1">Renk</p>
                                                        <p class="text-white font-semibold text-sm">${escapeHtml(car.color)}</p>
                                                    </div>
                                                    ` : ''}
                                                    ${car.engine ? `
                                                    <div class="bg-neutral-800 rounded-lg p-3 border border-gray-700">
                                                        <p class="text-gray-400 text-xs mb-1">Motor</p>
                                                        <p class="text-white font-semibold text-sm">${escapeHtml(car.engine)}</p>
                                                    </div>
                                                    ` : ''}
                                                    ${car.horsepower ? `
                                                    <div class="bg-neutral-800 rounded-lg p-3 border border-gray-700">
                                                        <p class="text-gray-400 text-xs mb-1">Beygir Gücü</p>
                                                        <p class="text-white font-semibold text-sm">${car.horsepower} HP</p>
                                                    </div>
                                                    ` : ''}
                                                </div>
                                                ${car.description ? `
                                                <div class="bg-neutral-800 rounded-lg p-4 border border-gray-700">
                                                    <p class="text-gray-400 text-xs mb-2">Açıklama</p>
                                                    <p class="text-white text-sm whitespace-pre-line">${escapeHtml(car.description)}</p>
                                                </div>
                                                ` : ''}
                </div>
            </div>
        </div>
                                    `;
                                }).join('');
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Arabalar yüklenirken hata:', error);
    }
}

// Profil Tab Geçişi
function switchProfileTab(tabName) {
    const postsTab = document.getElementById('tab-posts-btn');
    const carsTab = document.getElementById('tab-cars-btn');
    const postsContent = document.getElementById('tab-posts-content');
    const carsContent = document.getElementById('tab-cars-content');
    
    // Tüm tabları ve içerikleri sıfırla
    if (postsTab) {
        postsTab.classList.remove('active', 'text-white', 'border-white');
        postsTab.classList.add('text-gray-400', 'border-transparent');
    }
    if (carsTab) {
        carsTab.classList.remove('active', 'text-white', 'border-white');
        carsTab.classList.add('text-gray-400', 'border-transparent');
    }
    if (postsContent) {
        postsContent.classList.add('hidden');
    }
    if (carsContent) {
        carsContent.classList.add('hidden');
    }
    
    // Seçilen tabı aktif yap
    if (tabName === 'posts') {
        if (postsTab) {
            postsTab.classList.add('active', 'text-white', 'border-white');
            postsTab.classList.remove('text-gray-400', 'border-transparent');
        }
        if (postsContent) {
            postsContent.classList.remove('hidden');
        }
    } else if (tabName === 'cars') {
        if (carsTab) {
            carsTab.classList.add('active', 'text-white', 'border-white');
            carsTab.classList.remove('text-gray-400', 'border-transparent');
        }
        if (carsContent) {
            carsContent.classList.remove('hidden');
        } else {
            console.error('carsContent element not found!');
            return;
        }
        
        // Arabaları yükle - önce loadUserCars'ı dene, yoksa manuel yükle
        // setTimeout ile biraz bekle ki cars.js yüklenmiş olsun
        setTimeout(() => {
            if (typeof window.loadUserCars === 'function') {
                window.loadUserCars();
            } else if (typeof window.loadCars === 'function') {
                window.loadCars();
            } else {
                // Manuel olarak arabaları yükle
                loadCarsManually();
            }
        }, 50);
    } else {
        console.warn('Unknown tab name:', tabName);
    }
}

// Global fonksiyonlar
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.loadEditProfileForm = loadEditProfileForm;
window.previewProfilePicture = previewProfilePicture;
window.updateProfile = updateProfile;
window.openMessageFromProfile = openMessageFromProfile;
window.switchProfileTab = switchProfileTab;


