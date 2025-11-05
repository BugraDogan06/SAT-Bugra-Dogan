// API Base URL
const API_BASE = '../backend/api';

// Sayfa yüklendiğinde gönderileri getir
document.addEventListener('DOMContentLoaded', function() {
    loadPosts();
});

// Gönderileri yükle
async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE}/posts.php`);
        const data = await response.json();
        
        if (data.success) {
            displayPosts(data.posts);
        }
    } catch (error) {
        console.error('Gönderiler yüklenirken hata:', error);
    }
}

// Gönderileri göster
function displayPosts(posts) {
    const container = document.getElementById('postsContainer');
    
    if (posts.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-10">Henüz gönderi yok</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post-card bg-neutral-900 rounded-2xl overflow-hidden border border-gray-700">
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
                ${post.car_brand || post.car_model ? `
                    <p class="text-gray-500 text-sm mb-3">
                        ${post.car_brand ? post.car_brand : ''} ${post.car_model ? post.car_model : ''}
                    </p>
                ` : ''}
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
            
            likeCount.textContent = data.like_count;
            
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
            <img src="${comment.profile_picture || 'https://via.placeholder.com/40'}" 
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

// Global fonksiyonlar (index.html için)
window.showComments = showComments;
window.closeComments = closeComments;
window.addComment = addComment;
window.toggleLike = toggleLike;

