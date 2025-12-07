// API Base URL
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

let currentConversationUserId = null;
let messagesInterval = null;

// Mesajlaşma sidebar'ını aç/kapat
function toggleMessages() {
    const sidebar = document.getElementById('messagesSidebar');
    if (!sidebar) {
        // messagesSidebar elementi yoksa (profile.html gibi sayfalarda), sadece modal aç
        return;
    }
    
    if (sidebar.classList.contains('translate-x-full')) {
        sidebar.classList.remove('translate-x-full');
        loadConversations();
        // Her 5 saniyede bir konuşmaları yenile
        if (messagesInterval) clearInterval(messagesInterval);
        messagesInterval = setInterval(loadConversations, 5000);
    } else {
        sidebar.classList.add('translate-x-full');
        if (messagesInterval) {
            clearInterval(messagesInterval);
            messagesInterval = null;
        }
    }
}

// Konuşmaları yükle
async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE}/messages.php?conversations=1`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.conversations) {
            displayConversations(data.conversations);
            updateMessagesBadge(data.conversations);
        }
    } catch (error) {
        console.error('Konuşmalar yüklenirken hata:', error);
    }
}

// Konuşmaları göster
function displayConversations(conversations) {
    const container = document.getElementById('conversationsList');
    
    if (!container) {
        // conversationsList elementi yoksa (profile.html gibi sayfalarda), hata verme
        return;
    }
    
    if (!conversations || conversations.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8"><p>Mesaj yok</p></div>';
        return;
    }
    
    container.innerHTML = conversations.map(conv => {
        const profilePic = conv.profile_picture 
            ? '../' + conv.profile_picture 
            : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'%3E%3Crect width=\'50\' height=\'50\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'18\'%3E%3F%3C/text%3E%3C/svg%3E';
        const unreadCount = conv.unread_count || 0;
        const isUnread = unreadCount > 0 || (conv.sender_id !== conv.user_id && !conv.is_read);
        const timeAgo = getTimeAgo(conv.last_message_time);
        
        return `
            <div onclick="openMessageModal(${conv.user_id}, '${escapeHtml(conv.username)}', '${profilePic}')" 
                 class="flex items-center space-x-3 p-3 rounded-lg hover:bg-red-600/10 cursor-pointer transition ${isUnread ? 'bg-red-600/5' : ''}">
                <img src="${profilePic}" alt="${escapeHtml(conv.username)}" class="w-12 h-12 rounded-full object-cover">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <h4 class="text-white font-semibold truncate">${escapeHtml(conv.username || conv.full_name || 'Kullanıcı')}</h4>
                        ${unreadCount > 0 ? `
                            <span class="bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ml-2">${unreadCount}</span>
                        ` : ''}
                    </div>
                    <p class="text-gray-400 text-sm truncate ${isUnread ? 'font-semibold text-white' : ''}">${escapeHtml(conv.last_message || '')}</p>
                    <p class="text-gray-500 text-xs">${timeAgo}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Mesaj modalını aç
async function openMessageModal(userId, username, profilePic) {
    currentConversationUserId = userId;
    const modal = document.getElementById('messageModal');
    
    if (!modal) {
        console.error('messageModal elementi bulunamadı!');
        alert('Mesajlaşma modal\'ı bulunamadı. Lütfen sayfayı yenileyin.');
        return;
    }
    
    const userNameEl = document.getElementById('messageUserName');
    const userPicEl = document.getElementById('messageUserPic');
    
    if (!userNameEl || !userPicEl) {
        console.error('Modal elementleri bulunamadı!');
        alert('Mesajlaşma modal elementleri bulunamadı. Lütfen sayfayı yenileyin.');
        return;
    }
    
    userNameEl.textContent = username;
    userPicEl.src = profilePic;
    userPicEl.alt = username;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    await loadMessages(userId);
    
    // Her 3 saniyede bir mesajları yenile
    if (messagesInterval) clearInterval(messagesInterval);
    messagesInterval = setInterval(() => {
        if (currentConversationUserId) {
            loadMessages(currentConversationUserId);
        }
    }, 3000);
    
    // Scroll'u en alta al
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
}

// Mesaj modalını kapat
function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentConversationUserId = null;
    
    if (messagesInterval) {
        clearInterval(messagesInterval);
        messagesInterval = null;
    }
    
    // Konuşmaları yenile
    loadConversations();
}

// Mesajları yükle
async function loadMessages(userId) {
    try {
        const response = await fetch(`${API_BASE}/messages.php?user_id=${userId}`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.messages) {
            displayMessages(data.messages);
            
            // Mesajları okundu olarak işaretle
            await fetch(`${API_BASE}/messages.php?user_id=${userId}`, {
                method: 'PUT',
                credentials: 'include'
            });
        }
    } catch (error) {
        console.error('Mesajlar yüklenirken hata:', error);
    }
}

// Mesajları göster
async function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    if (!container) {
        console.error('messagesContainer elementi bulunamadı!');
        return;
    }
    
    // Mevcut kullanıcı ID'sini al
    let currentUserId = null;
    try {
        const authResponse = await fetch(`${API_BASE}/auth.php`, { credentials: 'include' });
        const authData = await authResponse.json();
        if (authData.success && authData.user) {
            currentUserId = authData.user.id;
        }
    } catch (error) {
        console.error('Kullanıcı bilgisi alınamadı:', error);
    }
    
    container.innerHTML = messages.map(msg => {
        const isOwn = msg.sender_id == currentUserId;
        
        return `
            <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
                <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn ? 'bg-red-600 text-white' : 'bg-neutral-800 text-white'}">
                    <p class="text-sm">${escapeHtml(msg.content)}</p>
                    <p class="text-xs mt-1 ${isOwn ? 'text-red-200' : 'text-gray-400'}">${getTimeAgo(msg.created_at)}</p>
                </div>
            </div>
        `;
    }).join('');
    
    // Scroll'u en alta al
    setTimeout(() => {
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, 100);
}

// Mesaj gönder
async function sendMessage(event) {
    event.preventDefault();
    
    if (!currentConversationUserId) return;
    
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const formData = new FormData();
        formData.append('receiver_id', currentConversationUserId);
        formData.append('content', content);
        
        const response = await fetch(`${API_BASE}/messages.php`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            await loadMessages(currentConversationUserId);
            
            // Scroll'u en alta al
            const container = document.getElementById('messagesContainer');
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        } else {
            alert(data.message || 'Mesaj gönderilemedi');
        }
    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        alert('Mesaj gönderilirken bir hata oluştu');
    }
}

// Mesaj badge'ini güncelle
function updateMessagesBadge(conversations) {
    const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
    const badge = document.getElementById('messagesBadge');
    const badgeMobile = document.getElementById('messagesBadgeMobile');
    
    if (badge) {
        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    if (badgeMobile) {
        if (totalUnread > 0) {
            badgeMobile.textContent = totalUnread > 99 ? '99+' : totalUnread;
            badgeMobile.classList.remove('hidden');
        } else {
            badgeMobile.classList.add('hidden');
        }
    }
}

// Zaman formatı
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} sa önce`;
    if (days < 7) return `${days} gün önce`;
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// HTML escape
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global fonksiyonlar
window.toggleMessages = toggleMessages;
window.openMessageModal = openMessageModal;
window.closeMessageModal = closeMessageModal;
window.sendMessage = sendMessage;

// Sayfa yüklendiğinde konuşmaları yükle
document.addEventListener('DOMContentLoaded', function() {
    // İlk yükleme (sadece conversationsList elementi varsa)
    const container = document.getElementById('conversationsList');
    if (container) {
        loadConversations();
        
        // Her 10 saniyede bir konuşmaları yenile (sidebar açık değilse)
        setInterval(() => {
            const sidebar = document.getElementById('messagesSidebar');
            if (!sidebar || sidebar.classList.contains('translate-x-full')) {
                loadConversations();
            }
        }, 10000);
    }
});

