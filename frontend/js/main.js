// API Base URL (global değişken, sadece bir kez tanımla)
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

// Sayfa yüklendiğinde session kontrolü yap ve gönderileri getir
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM yüklendi, session kontrolü yapılıyor...');
    
    const pageLoadingOverlay = document.getElementById('pageLoadingOverlay');
    const loadingState = document.getElementById('loadingState');
    const container = document.getElementById('postsContainer');
    const navbar = document.querySelector('nav');
    
    // Önce session kontrolü yap (sayfa içeriği gizli)
    try {
        const authResponse = await fetch(`${API_BASE}/auth.php`, {
            credentials: 'include',
            cache: 'no-cache' // Cache'i bypass et
        });
        
        // Response'u kontrol et
        if (!authResponse.ok) {
            throw new Error('Auth response not ok');
        }
        
        const authData = await authResponse.json();
        
        // Eğer giriş yapılmamışsa login sayfasına yönlendir (replace ile, geri tuşu çalışmasın)
        if (!authData.success) {
            console.log('Giriş yapılmamış, login sayfasına yönlendiriliyor...', authData);
            // HTML'i görünür yap (yönlendirme öncesi)
            document.documentElement.style.visibility = 'visible';
            document.documentElement.style.opacity = '1';
            window.location.replace('../index.html');
            return;
        }
        
        // Session kontrolü başarılı - sayfa içeriğini göster
        // Önce HTML'i görünür yap
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        
        if (pageLoadingOverlay) {
            pageLoadingOverlay.style.display = 'none';
        }
        
        // Sol navbar'ı göster
        const leftSidebarNav = document.getElementById('leftSidebarNav');
        if (leftSidebarNav) {
            leftSidebarNav.style.display = 'flex';
        }
        
        // Üst navbar'ı göster (desktop)
        const topNavbar = document.querySelector('nav.sticky:not(#leftSidebarNav):not(.lg\\:hidden)');
        if (topNavbar) {
            topNavbar.style.display = 'flex';
        }
        
        // Mobil navbar'ı göster
        const mobileNavbar = document.querySelector('nav.lg\\:hidden');
        if (mobileNavbar && window.innerWidth < 1024) {
            mobileNavbar.style.display = 'flex';
        }
        
        // Body overflow'u düzelt
        document.body.style.overflow = '';
        
        // Loading state'i gizle ve içeriği göster
        if (loadingState) {
            loadingState.classList.add('hidden');
        }
        
        // Ana içeriği göster (desktop ve mobil)
        const mainContent = document.getElementById('mainContent');
        const mainContentMobile = document.getElementById('mainContentMobile');
        if (window.innerWidth >= 1024) {
            if (mainContent) {
                mainContent.classList.remove('hidden');
            }
        } else {
            if (mainContentMobile) {
                mainContentMobile.classList.remove('hidden');
            }
        }
        
        if (container) {
            container.classList.remove('hidden');
        }
        
        // Auth UI'ı direkt güncelle (ayrı API çağrısı yapmadan)
        updateAuthUI(true);
        
        // Navbar profil fotoğrafı kaldırıldı, artık gerek yok
        
        console.log('Giriş yapılmış, gönderiler yükleniyor...');
        if (container) {
            console.log('postsContainer bulundu');
            loadPosts();
        } else {
            console.error('postsContainer elementi bulunamadı!');
        }
        
        // Arama input'una event listener ekle
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // Enter tuşuna basıldığında veya input değiştiğinde arama yap
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                const query = this.value.trim();
                
                if (query.length >= 2) {
                    // 500ms bekle, sonra arama yap (debounce)
                    searchTimeout = setTimeout(() => {
                        if (typeof performSearch === 'function') {
                            performSearch();
                        }
                    }, 500);
                } else if (query.length === 0) {
                    // Arama temizlendiğinde dropdown'ı gizle ve normal gönderileri göster
                    const searchContainer = document.getElementById('searchResultsContainer');
                    if (searchContainer) {
                        searchContainer.classList.add('hidden');
                    }
                    if (typeof loadPosts === 'function') {
    loadPosts();
                    }
                }
            });
            
            // Enter tuşuna basıldığında hemen arama yap
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(searchTimeout);
                    if (typeof performSearch === 'function') {
                        performSearch();
                    }
                }
            });
            
            // Dışarı tıklandığında dropdown'ı kapat
            document.addEventListener('click', function(e) {
                const searchContainer = document.getElementById('searchResultsContainer');
                const searchInput = document.getElementById('searchInput');
                if (searchContainer && searchInput && 
                    !searchContainer.contains(e.target) && 
                    !searchInput.contains(e.target)) {
                    searchContainer.classList.add('hidden');
                }
            });
        }
    } catch (error) {
        console.error('Session kontrolü hatası:', error);
        // Hata durumunda da login sayfasına yönlendir
        window.location.replace('../index.html');
    }
});

// Auth UI'ı güncelle (ayrı API çağrısı yapmadan)
function updateAuthUI(isLoggedIn) {
    const loginButtons = document.querySelectorAll('[data-auth-login]');
    const logoutButtons = document.querySelectorAll('[data-auth-logout]');
    
    // Logout butonlarına event listener ekle (sadece bir kez)
    logoutButtons.forEach(button => {
        if (!button.hasAttribute('data-listener-bound')) {
            button.addEventListener('click', async function(e) {
                e.preventDefault();
                await handleLogout();
            });
            button.setAttribute('data-listener-bound', 'true');
        }
    });
    
    if (isLoggedIn) {
        // Giriş yapılmış - login butonlarını kesinlikle gizle, logout butonlarını göster
        loginButtons.forEach(button => {
            button.classList.add('hidden');
            button.style.display = 'none'; // CSS ile de kesinlikle gizle
        });
        logoutButtons.forEach(button => {
            button.classList.remove('hidden');
            button.style.display = ''; // CSS display'i temizle
        });
    } else {
        // Giriş yapılmamış - login butonlarını göster, logout butonlarını gizle
        loginButtons.forEach(button => {
            button.classList.remove('hidden');
            button.style.display = ''; // CSS display'i temizle
        });
        logoutButtons.forEach(button => {
            button.classList.add('hidden');
            button.style.display = 'none'; // CSS ile de gizle
        });
    }
}

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

// Gönderileri yükle
async function loadPosts() {
    try {
        console.log('Gönderiler yükleniyor...', `${API_BASE}/posts.php`);
        const response = await fetch(`${API_BASE}/posts.php`, {
            credentials: 'include'
        });
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            console.log('Gönderiler başarıyla yüklendi:', data.posts.length);
            // Hem desktop hem mobil container'a gönderileri göster
            displayPosts(data.posts);
            const mobileContainer = document.getElementById('postsContainerMobile');
            if (mobileContainer) {
                displayPosts(data.posts, mobileContainer);
            }
        } else {
            console.error('API hatası:', data.message);
            const container = document.getElementById('postsContainer');
            const mobileContainer = document.getElementById('postsContainerMobile');
            const errorMsg = `<p class="text-center text-red-500 py-10">Hata: ${data.message || 'Gönderiler yüklenemedi'}</p>`;
            if (container) container.innerHTML = errorMsg;
            if (mobileContainer) mobileContainer.innerHTML = errorMsg;
        }
    } catch (error) {
        console.error('Gönderiler yüklenirken hata:', error);
        const container = document.getElementById('postsContainer');
        const mobileContainer = document.getElementById('postsContainerMobile');
        const errorMsg = `<p class="text-center text-red-500 py-10">Gönderiler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>`;
        if (container) container.innerHTML = errorMsg;
        if (mobileContainer) mobileContainer.innerHTML = errorMsg;
    }
}

// Mevcut kullanıcı ID'sini sakla
let currentUserId = null;

// Gönderileri göster (Instagram benzeri)
async function displayPosts(posts, targetContainer = null) {
    const container = targetContainer || document.getElementById('postsContainer');
    
    if (!container) {
        console.error('postsContainer elementi bulunamadı!');
        return;
    }
    
    // Mevcut kullanıcı ID'sini al
    if (!currentUserId) {
        try {
            const authResponse = await fetch(`${API_BASE}/auth.php`, {
                credentials: 'include'
            });
            const authData = await authResponse.json();
            if (authData.success && authData.user) {
                currentUserId = authData.user.id;
            }
        } catch (error) {
            console.error('Kullanıcı bilgisi alınamadı:', error);
        }
    }
    
    console.log('Gösterilecek gönderi sayısı:', posts.length);
    
    if (!posts || posts.length === 0) {
        container.innerHTML = `
        <div class="text-center py-20">
            <div class="inline-block mb-6">
                <svg class="w-24 h-24 text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
            </div>
            <h3 class="text-2xl font-bold text-white mb-2">Henüz gönderi yok</h3>
            <p class="text-gray-400 mb-6">İlk gönderiyi sen paylaş ve topluluğa katıl!</p>
            <button onclick="openCreatePostModal()" class="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition transform hover:scale-105">
                + İlk Gönderiyi Paylaş
            </button>
        </div>
        `;
        return;
    }
    
    container.innerHTML = posts.map((post, index) => {
        const mediaType = post.media_type || (post.video_url ? 'video' : 'image');
        const mediaPath = mediaType === 'video' 
            ? (post.video_url && post.video_url.startsWith('http') ? post.video_url : (post.video_url ? '../' + post.video_url : ''))
            : (post.image_url && post.image_url.startsWith('http') ? post.image_url : (post.image_url ? '../' + post.image_url : ''));
        const profilePicPath = post.profile_picture ? '../' + post.profile_picture : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'14\'%3E%3F%3C/text%3E%3C/svg%3E';
        const isLiked = post.is_liked ? '❤️' : '🤍';
        return `
        <div class="post-card bg-neutral-900 rounded-xl overflow-hidden border border-gray-700 shadow-lg" style="animation-delay: ${index * 0.1}s;">
            <!-- Üst: Profil ve Kullanıcı Adı -->
            <div class="flex items-center px-4 py-3 border-b border-gray-700 bg-neutral-800/50">
                <div class="profile-link flex items-center flex-1" onclick="goToUserProfile(${post.user_id})">
                    <img src="${profilePicPath}" 
                         class="w-10 h-10 rounded-full mr-3 object-cover border-2 border-gray-600 hover:border-red-600 transition" 
                         alt="${post.username}">
                    <div>
                        <h3 class="font-semibold text-white hover:text-red-500 transition">${post.username}</h3>
                        ${post.car_brand || post.car_model ? `
                        <p class="text-xs text-gray-400">🚗 ${post.car_brand || ''} ${post.car_model || ''}</p>
                        ` : ''}
                    </div>
                </div>
                ${post.title ? `<h4 class="text-sm font-medium text-gray-300 ml-2">${escapeHtml(post.title)}</h4>` : ''}
                ${currentUserId && post.user_id === currentUserId ? `
                <div class="flex items-center space-x-2 ml-2">
                    <button onclick="openEditPostModal(${post.id})" class="text-gray-400 hover:text-blue-500 transition" title="Düzenle">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="deletePost(${post.id})" class="text-gray-400 hover:text-red-500 transition" title="Sil">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
                ` : ''}
            </div>
            
            <!-- Medya (Fotoğraf veya Video) -->
            <div class="aspect-square bg-neutral-800 overflow-hidden relative group cursor-pointer" onclick="${mediaType === 'video' ? `openVideoModal('${mediaPath}', '${escapeHtml(post.username)}', '${escapeHtml(post.title || '')}')` : `openImageModal('${mediaPath}', '${escapeHtml(post.username)}', '${escapeHtml(post.title || '')}')`}">
                ${mediaType === 'video' ? `
                <video 
                    src="${mediaPath}" 
                    class="post-video w-full h-full object-cover pointer-events-none" 
                    preload="metadata"
                    muted
                    style="max-height: 100%;"
                >
                    Tarayıcınız video oynatmayı desteklemiyor.
                </video>
                <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                    <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>
                ` : `
                <img src="${mediaPath}" 
                     class="post-image w-full h-full object-cover" 
                     alt="${escapeHtml(post.title || post.description || 'Gönderi')}" />
                `}
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"></div>
            </div>
            
            <!-- Alt: Beğeni ve Yorum Butonları -->
            <div class="px-4 py-3 border-b border-gray-700">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-4">
                        <button onclick="toggleLike(${post.id})" class="flex items-center space-x-2 hover:opacity-70 transition active:scale-95">
                            <span id="likeBtn-${post.id}" class="text-2xl transition">${isLiked}</span>
                            <span id="likeCount-${post.id}" class="text-white font-semibold">${post.like_count || 0}</span>
                    </button>
                        <button onclick="showComments(${post.id})" class="flex items-center space-x-2 hover:opacity-70 transition active:scale-95">
                            <span class="text-2xl">💬</span>
                            <span id="commentCount-${post.id}" class="text-white font-semibold">${post.comment_count || 0}</span>
                    </button>
                </div>
            </div>
        </div>
            
            <!-- Açıklama -->
            <div class="px-4 py-3 bg-neutral-800/30">
                <p class="text-white mb-2">
                    <span class="font-semibold hover:text-red-500 cursor-pointer" onclick="goToUserProfile(${post.user_id})">${escapeHtml(post.username)}</span>
                    ${post.description ? `<span class="text-gray-300 ml-2">${escapeHtml(post.description)}</span>` : ''}
                </p>
                ${post.created_at ? `
                <p class="text-gray-500 text-xs mt-2">${formatDate(post.created_at)}</p>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Beğeni toggle
async function toggleLike(postId) {
    try {
        const response = await fetch(`${API_BASE}/likes.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ post_id: postId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const likeBtn = document.getElementById(`likeBtn-${postId}`);
            const likeCount = document.getElementById(`likeCount-${postId}`);
            
            likeBtn.textContent = data.action === 'added' ? '❤️' : '🤍';
            likeCount.textContent = data.like_count;
            
            // Like animasyonu
            likeBtn.classList.add('like-animation');
            setTimeout(() => {
                likeBtn.classList.remove('like-animation');
            }, 500);
            
            if (data.action === 'added') {
                likeBtn.style.color = '#ef4444';
            } else {
                likeBtn.style.color = '';
            }
        } else {
            if (data.message.includes('Giriş')) {
                window.location.href = 'login.html';
            }
        }
    } catch (error) {
        console.error('Beğeni hatası:', error);
    }
}

// Yorumları göster
async function showComments(postId) {
    // Yorum modalını aç
    const modal = document.getElementById('commentsModal');
    const modalPostId = document.getElementById('modalPostId');
    modalPostId.value = postId;
    
    // Yorumları yükle
    await loadComments(postId);
    
    // Modalı göster
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Yorumları kapat
function closeComments() {
    const modal = document.getElementById('commentsModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Yorumları yükle
async function loadComments(postId) {
    try {
        const response = await fetch(`${API_BASE}/comments.php?post_id=${postId}`);
        const data = await response.json();
        
        if (data.success) {
            displayComments(data.comments);
        }
    } catch (error) {
        console.error('Yorumlar yüklenirken hata:', error);
    }
}

// Yorumları göster
function displayComments(comments) {
    const container = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">Henüz yorum yok</p>';
        return;
    }
    
    container.innerHTML = comments.map(comment => `
        <div class="flex space-x-3 mb-4">
            <img src="${comment.profile_picture || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'14\'%3E%3F%3C/text%3E%3C/svg%3E'}" 
                 class="w-10 h-10 rounded-full" alt="${comment.username}">
            <div class="flex-1">
                <div class="bg-neutral-800 rounded-lg p-3">
                    <p class="font-semibold text-white text-sm mb-1">${comment.username}</p>
                    <p class="text-gray-300 text-sm">${comment.content}</p>
                </div>
                <p class="text-gray-500 text-xs mt-1">${formatDate(comment.created_at)}</p>
            </div>
        </div>
    `).join('');
}

// Yorum ekle
async function addComment() {
    const postId = document.getElementById('modalPostId').value;
    const content = document.getElementById('commentInput').value.trim();
    
    if (!content) {
        alert('Yorum yazın!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/comments.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                post_id: postId,
                content: content
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('commentInput').value = '';
            await loadComments(postId);
            
            // Yorum sayısını güncelle
            const commentCount = document.getElementById(`commentCount-${postId}`);
            if (commentCount) {
                const current = parseInt(commentCount.textContent) || 0;
                commentCount.textContent = current + 1;
            }
        } else {
            if (data.message.includes('Giriş')) {
                window.location.href = 'login.html';
            } else {
                alert(data.message);
            }
        }
    } catch (error) {
        console.error('Yorum ekleme hatası:', error);
        alert('Yorum eklenirken bir hata oluştu');
    }
}

// Tarih formatla
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Az önce';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' dakika önce';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' saat önce';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' gün önce';
    
    return date.toLocaleDateString('tr-TR');
}

// Yeni gönderi modalını aç
function openCreatePostModal() {
    // Universal modal kullan
    if (typeof openUniversalModal === 'function') {
        openUniversalModal('post');
        // Formu temizle
        const form = document.getElementById('createPostForm');
        if (form) {
            form.reset();
            document.getElementById('postId').value = '';
            document.getElementById('imagePreviewContainer').classList.add('hidden');
            document.getElementById('postSubmitText').textContent = 'Paylaş';
        }
    } else {
        // Fallback: eski modal
        document.getElementById('createPostModal').classList.remove('hidden');
    }
    document.body.style.overflow = 'hidden';
    // Varsayılan olarak fotoğraf seçili olsun
    selectedMediaType = 'image';
    if (typeof selectMediaType === 'function') {
        selectMediaType('image');
    }
}

// Yeni gönderi modalını kapat
function closeCreatePostModal() {
    // Universal modal kullan
    if (typeof closeUniversalModal === 'function') {
        closeUniversalModal();
    } else {
        // Fallback: eski modal
        document.getElementById('createPostModal').classList.add('hidden');
    }
    document.body.style.overflow = '';
    document.getElementById('createPostForm').reset();
    // Önizlemeyi temizle
    const imagePreview = document.getElementById('imagePreview');
    const videoPreview = document.getElementById('videoPreview');
    const container = document.getElementById('mediaPreviewContainer');
    const oldContainer = document.getElementById('imagePreviewContainer');
    if (imagePreview) {
        imagePreview.classList.add('hidden');
        imagePreview.src = '';
    }
    if (videoPreview) {
        videoPreview.classList.add('hidden');
        const videoSource = document.getElementById('videoPreviewSource');
        if (videoSource) videoSource.src = '';
    }
    if (container) container.classList.add('hidden');
    if (oldContainer) oldContainer.classList.add('hidden');
    // Medya tipini sıfırla
    selectedMediaType = 'image';
    if (typeof selectMediaType === 'function') {
        selectMediaType('image');
    }
}

// Medya tipi seçimi
let selectedMediaType = 'image';

function selectMediaType(type) {
    selectedMediaType = type;
    const imageBtn = document.getElementById('selectImageBtn');
    const videoBtn = document.getElementById('selectVideoBtn');
    const imageInput = document.getElementById('postImageInput');
    const videoInput = document.getElementById('postVideoInput');
    const selectBtn = document.getElementById('selectMediaBtn');
    const mediaInfo = document.getElementById('mediaInfo');
    
    if (!imageBtn || !videoBtn || !selectBtn || !mediaInfo) return;
    
    // Buton stillerini güncelle
    if (type === 'image') {
        imageBtn.classList.remove('bg-neutral-800', 'hover:bg-neutral-700');
        imageBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        videoBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        videoBtn.classList.add('bg-neutral-800', 'hover:bg-neutral-700');
        selectBtn.onclick = () => imageInput?.click();
        selectBtn.textContent = 'Fotoğraf Seç';
        mediaInfo.textContent = 'JPEG, PNG, GIF veya WebP (Maks. 10MB)';
        if (imageInput) {
            imageInput.required = true;
            imageInput.removeAttribute('required'); // HTML5 validation için
            imageInput.setAttribute('data-required', 'true');
        }
        if (videoInput) {
            videoInput.required = false;
            videoInput.removeAttribute('required');
            videoInput.removeAttribute('data-required');
        }
    } else {
        videoBtn.classList.remove('bg-neutral-800', 'hover:bg-neutral-700');
        videoBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        imageBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        imageBtn.classList.add('bg-neutral-800', 'hover:bg-neutral-700');
        selectBtn.onclick = () => videoInput?.click();
        selectBtn.textContent = 'Video Seç';
        mediaInfo.textContent = 'MP4, WebM, OGG veya MOV (Maks. 100MB)';
        if (videoInput) {
            videoInput.required = true;
            videoInput.removeAttribute('required'); // HTML5 validation için
            videoInput.setAttribute('data-required', 'true');
        }
        if (imageInput) {
            imageInput.required = false;
            imageInput.removeAttribute('required');
            imageInput.removeAttribute('data-required');
        }
    }
    
    // Önizlemeyi temizle
    const imagePreview = document.getElementById('imagePreview');
    const videoPreview = document.getElementById('videoPreview');
    const container = document.getElementById('mediaPreviewContainer');
    if (imagePreview) imagePreview.classList.add('hidden');
    if (videoPreview) videoPreview.classList.add('hidden');
    if (container) container.classList.add('hidden');
}

function previewPostMedia(input, type) {
    if (input.files && input.files[0]) {
        const container = document.getElementById('mediaPreviewContainer');
        const imagePreview = document.getElementById('imagePreview');
        const videoPreview = document.getElementById('videoPreview');
        const videoSource = document.getElementById('videoPreviewSource');
        
        if (!container) return;
        
        if (type === 'image') {
            const reader = new FileReader();
            reader.onload = function(e) {
                if (imagePreview) {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove('hidden');
                    if (videoPreview) videoPreview.classList.add('hidden');
                    container.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(input.files[0]);
        } else if (type === 'video') {
            const file = input.files[0];
            const url = URL.createObjectURL(file);
            if (videoPreview && videoSource) {
                videoSource.src = url;
                videoPreview.load();
                videoPreview.classList.remove('hidden');
                if (imagePreview) imagePreview.classList.add('hidden');
                container.classList.remove('hidden');
            }
        }
    }
}

// Eski fonksiyon için geriye dönük uyumluluk
function previewPostImage(input) {
    previewPostMedia(input, 'image');
}

// Yeni gönderi oluştur
async function createPost() {
    const form = document.getElementById('createPostForm');
    const errorDiv = document.getElementById('createPostError');
    
    if (!form) {
        console.error('Form bulunamadı!');
        return;
    }
    
    // Form validation'ı manuel yap (HTML5 validation hidden input'larda çalışmıyor)
    const imageInput = document.getElementById('postImageInput');
    const videoInput = document.getElementById('postVideoInput');
    const titleInput = document.getElementById('postTitle');
    
    // Başlık kontrolü
    if (!titleInput || !titleInput.value.trim()) {
        if (errorDiv) {
            errorDiv.textContent = 'Lütfen bir başlık girin';
            errorDiv.classList.remove('hidden');
        }
        return;
    }
    
    // Medya tipine göre doğru input'u kontrol et
    if (selectedMediaType === 'video') {
        if (!videoInput || !videoInput.files || !videoInput.files[0]) {
            if (errorDiv) {
                errorDiv.textContent = 'Lütfen bir video seçin';
                errorDiv.classList.remove('hidden');
            }
            return;
        }
    } else {
        if (!imageInput || !imageInput.files || !imageInput.files[0]) {
            if (errorDiv) {
                errorDiv.textContent = 'Lütfen bir fotoğraf seçin';
                errorDiv.classList.remove('hidden');
            }
            return;
        }
    }
    
    // FormData oluştur
    const formData = new FormData();
    formData.append('title', titleInput.value.trim());
    
    const descriptionInput = document.getElementById('postDescription');
    if (descriptionInput && descriptionInput.value.trim()) {
        formData.append('description', descriptionInput.value.trim());
    }
    
    const carModelInput = document.getElementById('postCarModel');
    if (carModelInput && carModelInput.value.trim()) {
        formData.append('car_model', carModelInput.value.trim());
    }
    
    const carBrandInput = document.getElementById('postCarBrand');
    if (carBrandInput && carBrandInput.value.trim()) {
        formData.append('car_brand', carBrandInput.value.trim());
    }
    
    // Sadece seçilen medya tipini ekle
    if (selectedMediaType === 'video' && videoInput.files[0]) {
        formData.append('video', videoInput.files[0]);
    } else if (selectedMediaType === 'image' && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }
    
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts.php`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        // Response'u text olarak oku, sonra JSON'a çevir
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse hatası:', parseError);
            console.error('Response text:', responseText);
            if (errorDiv) {
                errorDiv.textContent = 'Sunucu hatası. Lütfen tekrar deneyin.';
                errorDiv.classList.remove('hidden');
            }
            return;
        }
        
        if (data.success) {
            closeCreatePostModal();
            
            // Profil sayfasındaysak kullanıcı gönderilerini yenile, değilse keşfet sayfasındaki gönderileri yenile
            if (typeof loadUserPosts === 'function' && window.location.pathname.includes('profile.html')) {
                const urlParams = new URLSearchParams(window.location.search);
                const userId = urlParams.get('user_id');
                if (userId) {
                    loadUserPosts(parseInt(userId));
                } else {
                    // Kendi profiliyse auth'dan al
                    const authResponse = await fetch(`${API_BASE}/auth.php`, { credentials: 'include' });
                    const authData = await authResponse.json();
                    if (authData.success && authData.user) {
                        loadUserPosts(authData.user.id);
                    }
                }
            } else if (typeof loadPosts === 'function') {
                await loadPosts();
            } else {
                window.location.reload();
            }
        } else {
            if (errorDiv) {
                errorDiv.textContent = data.message || 'Gönderi oluşturulurken bir hata oluştu';
                errorDiv.classList.remove('hidden');
            }
        }
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
            errorDiv.classList.remove('hidden');
        }
        console.error('Gönderi oluşturma hatası:', error);
    }
}

// Kullanıcı profil sayfasına git
async function goToUserProfile(userId) {
    // Eğer currentUserId henüz set edilmemişse, önce auth kontrolü yap
    if (!currentUserId) {
        try {
            const authResponse = await fetch(`${API_BASE}/auth.php`, {
                credentials: 'include'
            });
            const authData = await authResponse.json();
            if (authData.success && authData.user) {
                currentUserId = authData.user.id;
            }
        } catch (error) {
            console.error('Kullanıcı bilgisi alınamadı:', error);
        }
    }
    
    // Eğer kendi profiline gidiliyorsa, user_id parametresi olmadan yönlendir
    if (currentUserId && parseInt(userId) === currentUserId) {
        window.location.href = 'profile.html';
    } else {
        window.location.href = `profile.html?user_id=${userId}`;
    }
}

// Görsel modalını aç
function openImageModal(imagePath, username, title) {
    // Basit bir modal oluştur
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-[90vh] m-4">
            <button onclick="this.closest('.fixed').remove(); document.body.style.overflow = '';" 
                    class="absolute -top-12 right-0 text-white hover:text-red-500 transition text-2xl z-10">
                ✕
            </button>
            <img src="${imagePath}" class="max-w-full max-h-[90vh] object-contain rounded-lg" alt="${title}">
            ${title ? `<p class="text-white text-center mt-4 font-semibold">${title}</p>` : ''}
            <p class="text-gray-400 text-center mt-2">@${username}</p>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Modal dışına tıklandığında kapat
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
}

function openVideoModal(videoPath, username, title) {
    // Video modal oluştur
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
    
    // Modal dışına tıklandığında kapat
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            const video = modal.querySelector('video');
            if (video) {
                video.pause();
            }
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    // Video yüklendiğinde oynat
    const video = modal.querySelector('video');
    if (video) {
        video.addEventListener('loadeddata', function() {
            video.play().catch(err => {
                console.log('Video otomatik oynatma engellendi:', err);
            });
        });
    }
}

// HTML escape
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Tarih formatla
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Global fonksiyonlar
window.showComments = showComments;
window.closeComments = closeComments;
window.addComment = addComment;
window.toggleLike = toggleLike;
window.openCreatePostModal = openCreatePostModal;
window.closeCreatePostModal = closeCreatePostModal;
window.previewPostImage = previewPostImage;
window.previewPostMedia = previewPostMedia;
window.selectMediaType = selectMediaType;
window.createPost = createPost;
// Gönderi düzenleme modalını aç
async function openEditPostModal(postId) {
    try {
        // Önce mevcut kullanıcı ID'sini al
        if (!currentUserId) {
            const authResponse = await fetch(`${API_BASE}/auth.php`, {
                credentials: 'include'
            });
            const authData = await authResponse.json();
            if (authData.success && authData.user) {
                currentUserId = authData.user.id;
            }
        }
        
        // Gönderi bilgilerini getir
        const response = await fetch(`${API_BASE}/posts.php?user_id=${currentUserId}`, {
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
        
        // Modal formunu doldur
        const editPostId = document.getElementById('editPostId');
        const editPostTitle = document.getElementById('editPostTitle');
        const editPostDescription = document.getElementById('editPostDescription');
        const editPostCarBrand = document.getElementById('editPostCarBrand');
        const editPostCarModel = document.getElementById('editPostCarModel');
        
        if (!editPostId || !editPostTitle) {
            console.error('Edit modal elementleri bulunamadı!');
            alert('Modal elementleri bulunamadı');
            return;
        }
        
        editPostId.value = post.id;
        editPostTitle.value = post.title || '';
        if (editPostDescription) editPostDescription.value = post.description || '';
        if (editPostCarBrand) editPostCarBrand.value = post.car_brand || '';
        if (editPostCarModel) editPostCarModel.value = post.car_model || '';
        
        // Mevcut görseli göster
        const imagePreview = document.getElementById('editImagePreview');
        const imagePreviewContainer = document.getElementById('editImagePreviewContainer');
        if (imagePreview && imagePreviewContainer && post.image_url) {
            const imagePath = post.image_url.startsWith('http') ? post.image_url : '../' + post.image_url;
            imagePreview.src = imagePath;
            imagePreviewContainer.classList.remove('hidden');
        }
        
        // Universal modal kullan
        if (typeof openUniversalModal === 'function') {
            openUniversalModal('post');
            // Form ID'lerini universal modal'daki form'a göre güncelle
            const postId = document.getElementById('postId');
            const postTitle = document.getElementById('postTitle');
            const postDescription = document.getElementById('postDescription');
            const postCarBrand = document.getElementById('postCarBrand');
            const postCarModel = document.getElementById('postCarModel');
            const postSubmitText = document.getElementById('postSubmitText');
            
            if (postId) postId.value = post.id;
            if (postTitle) postTitle.value = post.title || '';
            if (postDescription) postDescription.value = post.description || '';
            if (postCarBrand) postCarBrand.value = post.car_brand || '';
            if (postCarModel) postCarModel.value = post.car_model || '';
            if (postSubmitText) postSubmitText.textContent = 'Güncelle';
            
            // Görsel önizleme
            const imagePreview = document.getElementById('imagePreview');
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            if (imagePreview && imagePreviewContainer && post.image_url) {
                const imagePath = post.image_url.startsWith('http') ? post.image_url : '../' + post.image_url;
                imagePreview.src = imagePath;
                imagePreviewContainer.classList.remove('hidden');
            }
        } else {
            // Fallback: eski modal
            const modal = document.getElementById('editPostModal');
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        }
    } catch (error) {
        console.error('Gönderi bilgisi alınırken hata:', error);
        alert('Gönderi bilgisi alınamadı');
    }
}

// Gönderi düzenleme modalını kapat
function closeEditPostModal() {
    // Universal modal kullan
    if (typeof closeUniversalModal === 'function') {
        closeUniversalModal();
    } else {
        // Fallback: eski modal
        const modal = document.getElementById('editPostModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    const form = document.getElementById('editPostForm');
    if (form) {
        form.reset();
    }
    const imagePreviewContainer = document.getElementById('editImagePreviewContainer');
    if (imagePreviewContainer) {
        imagePreviewContainer.classList.add('hidden');
    }
}

// Gönderi düzenle
async function updatePost() {
    // Universal modal veya eski modal'daki formu kullan
    const form = document.getElementById('createPostForm') || document.getElementById('editPostForm');
    const postId = document.getElementById('postId')?.value || document.getElementById('editPostId')?.value;
    
    if (!form) {
        alert('Form bulunamadı');
        return;
    }
    
    if (!postId) {
        alert('Gönderi ID bulunamadı');
        return;
    }
    
    const formData = new FormData(form);
    const errorDiv = document.getElementById('editPostError');
    
    if (!postId) {
        alert('Gönderi ID bulunamadı');
        return;
    }
    
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
    
    try {
        // POST ile güncelleme yap (FormData ile PUT sorunlu)
        formData.append('action', 'update');
        formData.append('post_id', postId);
        
        const response = await fetch(`${API_BASE}/posts.php`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (typeof closeUniversalModal === 'function') {
                closeUniversalModal();
            } else {
                closeEditPostModal();
            }
            // Gönderileri yeniden yükle
            if (typeof loadPosts === 'function' && window.location.pathname.includes('index.html')) {
                await loadPosts();
            } else if (typeof loadUserPosts === 'function' && window.location.pathname.includes('profile.html')) {
                const urlParams = new URLSearchParams(window.location.search);
                const userId = urlParams.get('user_id');
                if (userId) {
                    loadUserPosts(parseInt(userId));
                } else {
                    const authResponse = await fetch(`${API_BASE}/auth.php`, { credentials: 'include' });
                    const authData = await authResponse.json();
                    if (authData.success && authData.user) {
                        loadUserPosts(authData.user.id);
                    }
                }
            } else {
                window.location.reload();
            }
        } else {
            if (errorDiv) {
                errorDiv.textContent = data.message || 'Gönderi güncellenemedi';
                errorDiv.classList.remove('hidden');
            } else {
                alert(data.message || 'Gönderi güncellenemedi');
            }
        }
    } catch (error) {
        console.error('Gönderi güncelleme hatası:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
            errorDiv.classList.remove('hidden');
        } else {
            alert('Bir hata oluştu. Lütfen tekrar deneyin.');
        }
    }
}

// Gönderi sil
async function deletePost(postId) {
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
            if (typeof loadPosts === 'function' && window.location.pathname.includes('index.html')) {
                await loadPosts();
            } else if (typeof loadUserPosts === 'function' && window.location.pathname.includes('profile.html')) {
                const urlParams = new URLSearchParams(window.location.search);
                const userId = urlParams.get('user_id');
                if (userId) {
                    loadUserPosts(parseInt(userId));
                } else {
                    const authResponse = await fetch(`${API_BASE}/auth.php`, { credentials: 'include' });
                    const authData = await authResponse.json();
                    if (authData.success && authData.user) {
                        loadUserPosts(authData.user.id);
                    }
                }
            } else {
                window.location.reload();
            }
        } else {
            alert(data.message || 'Gönderi silinemedi');
        }
    } catch (error) {
        console.error('Gönderi silme hatası:', error);
        alert('Gönderi silinirken bir hata oluştu');
    }
}

// Düzenleme için görsel önizleme
function previewEditPostImage(input) {
    const preview = document.getElementById('editImagePreview');
    const container = document.getElementById('editImagePreviewContainer');
    if (input.files && input.files[0] && preview && container) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            container.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

window.goToUserProfile = goToUserProfile;
window.openImageModal = openImageModal;
window.openVideoModal = openVideoModal;
window.openEditPostModal = openEditPostModal;
window.closeEditPostModal = closeEditPostModal;
window.updatePost = updatePost;
window.deletePost = deletePost;
window.previewEditPostImage = previewEditPostImage;

// Navbar profil fotoğrafını yükle
function loadNavbarProfile(user) {
    const navProfilePic = document.getElementById('navProfilePic');
    const navUsername = document.getElementById('navUsername');
    
    if (user) {
        if (navProfilePic) {
            const profilePicPath = user.profile_picture ? '../' + user.profile_picture : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'48\' height=\'48\'%3E%3Crect width=\'48\' height=\'48\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'16\'%3E%3F%3C/text%3E%3C/svg%3E';
            navProfilePic.src = profilePicPath;
            navProfilePic.alt = user.username || 'Profil';
        }
        if (navUsername) {
            navUsername.textContent = user.username || 'Kullanıcı';
        }
    }
}

// Sidebar içeriğini yükle (artık kullanılmıyor, sidebar kaldırıldı)
async function loadSidebarContent(user) {
    // Sidebar kaldırıldı, bu fonksiyon artık kullanılmıyor
}

// Önerilen kullanıcıları yükle
async function loadSuggestedUsers() {
    try {
        const response = await fetch(`${API_BASE}/users.php?suggested=1`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        const suggestedContainer = document.getElementById('suggestedUsers');
        if (suggestedContainer) {
            if (data.success && data.users && data.users.length > 0) {
                suggestedContainer.innerHTML = data.users.slice(0, 5).map(user => `
                    <div class="group flex items-center justify-between p-2 rounded-lg bg-neutral-800/50 hover:bg-gradient-to-r hover:from-red-900/20 hover:to-transparent transition-all duration-300 border border-transparent hover:border-red-600/30">
                        <div class="flex items-center space-x-3 flex-1 min-w-0" onclick="goToUserProfile(${user.id})" style="cursor: pointer;">
                            <div class="relative">
                                <div class="absolute inset-0 rounded-full bg-red-600 opacity-0 group-hover:opacity-20 transition"></div>
                                <img src="${user.profile_picture ? '../' + user.profile_picture : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'14\'%3E%3F%3C/text%3E%3C/svg%3E'}" 
                                     class="relative w-10 h-10 rounded-full object-cover border-2 border-gray-600 group-hover:border-red-500 transition">
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-white text-sm font-semibold truncate group-hover:text-red-400 transition">${escapeHtml(user.username)}</p>
                                <p class="text-gray-400 text-xs truncate">Önerilen</p>
                            </div>
                        </div>
                        <button onclick="event.stopPropagation(); toggleFollow(${user.id}, ${user.is_following ? 'true' : 'false'})" 
                                class="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                                    user.is_following 
                                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                        : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:shadow-red-600/50'
                                }">
                            ${user.is_following ? '✓ Takiptesin' : '+ Takip Et'}
                        </button>
                    </div>
                `).join('');
            } else {
                suggestedContainer.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Henüz öneri yok</p>';
            }
        }
    } catch (error) {
        console.error('Önerilen kullanıcılar yüklenirken hata:', error);
        const suggestedContainer = document.getElementById('suggestedUsers');
        if (suggestedContainer) {
            suggestedContainer.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Yükleniyor...</p>';
        }
    }
}

// Topluluk istatistiklerini yükle
async function loadCommunityStats() {
    try {
        const response = await fetch(`${API_BASE}/posts.php?stats=1`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        const statsContainer = document.getElementById('communityStats');
        if (statsContainer) {
            if (data.success && data.stats) {
                statsContainer.innerHTML = `
                    <div class="stat-card rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <span class="text-2xl">📸</span>
                                <span class="text-gray-300 text-sm">Toplam Gönderi</span>
                            </div>
                            <span class="text-red-500 font-bold text-xl">${data.stats.total_posts || 0}</span>
                        </div>
                    </div>
                    <div class="stat-card rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <span class="text-2xl">👥</span>
                                <span class="text-gray-300 text-sm">Toplam Kullanıcı</span>
                            </div>
                            <span class="text-red-500 font-bold text-xl">${data.stats.total_users || 0}</span>
                        </div>
                    </div>
                    <div class="stat-card rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <span class="text-2xl pulse-red">❤️</span>
                                <span class="text-gray-300 text-sm">Toplam Beğeni</span>
                            </div>
                            <span class="text-red-500 font-bold text-xl">${data.stats.total_likes || 0}</span>
                        </div>
                    </div>
                `;
            } else {
                statsContainer.innerHTML = `
                    <div class="stat-card rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <span class="text-2xl">📸</span>
                                <span class="text-gray-300 text-sm">Toplam Gönderi</span>
                            </div>
                            <span class="text-red-500 font-bold text-xl">-</span>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
        const statsContainer = document.getElementById('communityStats');
        if (statsContainer) {
            statsContainer.innerHTML = '<p class="text-gray-400 text-sm">Yükleniyor...</p>';
        }
    }
}

