// API Base URL
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

let currentConversationUserId = null;
let messagesInterval = null;

// Mesaj modalını aç
async function openMessagesModal() {
    try {
        const modal = document.getElementById('messagesModal');
        if (!modal) {
            console.error('Mesaj modal bulunamadı!');
            return;
        }
        
        // Modalı göster
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Konuşmaları yükle
        await loadConversationsForModal();
        
        // Her 5 saniyede bir konuşmaları yenile
        if (messagesInterval) clearInterval(messagesInterval);
        messagesInterval = setInterval(loadConversationsForModal, 5000);
    } catch (error) {
        console.error('Mesaj modal açılırken hata:', error);
    }
}

// Mesaj modalını kapat
function closeMessagesModal() {
    const modal = document.getElementById('messagesModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        if (messagesInterval) {
            clearInterval(messagesInterval);
            messagesInterval = null;
        }
    }
}

// Mesajlaşma sidebar'ını aç/kapat (eski fonksiyon - geriye uyumluluk için)
function toggleMessages() {
    // Önce modal'ı kontrol et
    const modal = document.getElementById('messagesModal');
    if (modal && !modal.classList.contains('hidden')) {
        closeMessagesModal();
        return;
    }
    
    // Modal yoksa sidebar'ı kullan
    try {
        const sidebar = document.getElementById('messagesSidebar');
        if (!sidebar) {
            // Sidebar yoksa modal aç
            openMessagesModal();
            return;
        }
        
        if (sidebar.classList.contains('translate-x-full')) {
            // Aç
            sidebar.classList.remove('translate-x-full');
            sidebar.style.transform = 'translateX(0)';
            loadConversations();
            // Her 5 saniyede bir konuşmaları yenile
            if (messagesInterval) clearInterval(messagesInterval);
            messagesInterval = setInterval(loadConversations, 5000);
        } else {
            // Kapat
            sidebar.classList.add('translate-x-full');
            sidebar.style.transform = 'translateX(100%)';
            if (messagesInterval) {
                clearInterval(messagesInterval);
                messagesInterval = null;
            }
        }
    } catch (error) {
        console.error('Mesaj sidebar açılırken hata:', error);
    }
}

// Konuşmaları modal için yükle
async function loadConversationsForModal() {
    try {
        const response = await fetch(`${API_BASE}/messages.php?conversations=1`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayConversationsForModal(data.conversations || []);
        } else {
            const container = document.getElementById('messagesModalList');
            if (container) {
                const errorMsg = data.message || 'Konuşma yüklenirken hata oluştu';
                container.innerHTML = `<div class="text-center text-gray-400 py-8">${escapeHtml(errorMsg)}</div>`;
            }
        }
    } catch (error) {
        console.error('Konuşmalar yüklenirken hata:', error);
        const container = document.getElementById('messagesModalList');
        if (container) {
            const errorMsg = error.message || 'Konuşma yüklenirken hata oluştu';
            container.innerHTML = `<div class="text-center text-gray-400 py-8">${escapeHtml(errorMsg)}</div>`;
        }
    }
}

// Konuşmaları modal için göster
function displayConversationsForModal(conversations) {
    const container = document.getElementById('messagesModalList');
    if (!container) return;
    
    if (!conversations || conversations.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8">Henüz mesaj yok</div>';
        return;
    }
    
    container.innerHTML = conversations.map(conv => {
        const profilePic = conv.profile_picture 
            ? `../${conv.profile_picture}` 
            : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'14\'%3E%3F%3C/text%3E%3C/svg%3E';
        
        const lastMessage = conv.last_message || 'Mesaj yok';
        const timeAgo = conv.last_message_time ? getTimeAgo(conv.last_message_time) : '';
        const unreadClass = conv.unread_count > 0 ? 'bg-red-600/10 border-red-600/30' : 'bg-neutral-800/50 border-gray-700/50';
        
        return `
            <div class="conversation-item p-3 rounded-lg border ${unreadClass} transition-all duration-200 hover:bg-red-600/5 cursor-pointer mb-2" 
                 onclick="closeMessagesModal(); openMessageModal(${conv.user_id}, '${escapeHtml(conv.username)}', '${profilePic}')">
                <div class="flex items-start space-x-3">
                    <img src="${profilePic}" 
                         alt="${conv.username}" 
                         class="w-12 h-12 rounded-full object-cover border-2 border-red-600/30"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'14\'%3E%3F%3C/text%3E%3C/svg%3E'">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <h4 class="text-white font-semibold ${conv.unread_count > 0 ? 'font-bold' : ''}">${escapeHtml(conv.username)}</h4>
                            ${conv.unread_count > 0 ? `
                                <span class="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-1">${conv.unread_count}</span>
                            ` : ''}
                        </div>
                        <p class="text-sm text-gray-400 truncate mt-1">${escapeHtml(lastMessage)}</p>
                        ${timeAgo ? `<p class="text-xs text-gray-500 mt-1">${timeAgo}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
    let modal = document.getElementById('messageModal');
    
    // Modal yoksa oluştur
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'messageModal';
        modal.className = 'fixed inset-0 z-50 bg-black/90 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-red-600/30 shadow-2xl">
                    <!-- Header -->
                    <div class="flex items-center justify-between p-4 border-b border-gray-700">
                        <div class="flex items-center gap-3">
                            <img id="messageUserPic" src="" alt="" class="w-10 h-10 rounded-full border-2 border-red-600">
                            <h3 id="messageUserName" class="text-lg font-bold text-white">Kullanıcı</h3>
                        </div>
                        <button onclick="closeMessageModal()" class="text-gray-400 hover:text-white transition">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Messages Container -->
                    <div id="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900/50">
                        <div class="text-center text-gray-500 py-8">Mesajlar yükleniyor...</div>
                    </div>
                    
                    <!-- Message Input -->
                    <div class="p-4 border-t border-gray-700">
                        <form id="messageForm" onsubmit="event.preventDefault(); sendMessage();" class="flex gap-2">
                            <input 
                                type="text" 
                                id="messageInput" 
                                placeholder="Mesajınızı yazın..." 
                                class="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                                required
                            />
                            <button 
                                type="submit" 
                                class="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition">
                                Gönder
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const userNameEl = document.getElementById('messageUserName');
    const userPicEl = document.getElementById('messageUserPic');
    
    if (userNameEl && userPicEl) {
        userNameEl.textContent = username;
        userPicEl.src = profilePic;
        userPicEl.alt = username;
    }
    
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
    if (modal) {
        modal.classList.add('hidden');
    }
    document.body.style.overflow = '';
    currentConversationUserId = null;
    
    if (messagesInterval) {
        clearInterval(messagesInterval);
        messagesInterval = null;
    }
    
    // Konuşmaları yenile (eğer loadConversations fonksiyonu varsa)
    if (typeof loadConversations === 'function') {
        loadConversations();
    }
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
window.openMessagesModal = openMessagesModal;
window.closeMessagesModal = closeMessagesModal;
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

