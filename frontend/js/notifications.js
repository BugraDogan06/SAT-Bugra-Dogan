// API Base URL
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

let notificationCheckInterval = null;

// Bildirim modalını aç
async function openNotificationsModal() {
    try {
        const modal = document.getElementById('notificationsModal');
        if (!modal) {
            console.error('Bildirim modal bulunamadı!');
            return;
        }
        
        // Modalı göster
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Bildirimleri yükle
        await loadNotificationsForModal();
        
        // Her 30 saniyede bir kontrol et
        if (notificationCheckInterval) {
            clearInterval(notificationCheckInterval);
        }
        notificationCheckInterval = setInterval(loadNotificationsForModal, 30000);
    } catch (error) {
        console.error('Bildirim modal açılırken hata:', error);
    }
}

// Bildirim modalını kapat
function closeNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        if (notificationCheckInterval) {
            clearInterval(notificationCheckInterval);
            notificationCheckInterval = null;
        }
    }
}

// Bildirim sidebar'ını aç/kapat (eski fonksiyon - geriye uyumluluk için)
function toggleNotifications() {
    // Önce modal'ı kontrol et
    const modal = document.getElementById('notificationsModal');
    if (modal && !modal.classList.contains('hidden')) {
        closeNotificationsModal();
        return;
    }
    
    // Modal yoksa sidebar'ı kullan
    try {
        const sidebar = document.getElementById('notificationSidebar');
        if (!sidebar) {
            // Sidebar yoksa modal aç
            openNotificationsModal();
            return;
        }
        
        if (sidebar.classList.contains('translate-x-full')) {
            // Aç
            sidebar.classList.remove('translate-x-full');
            sidebar.style.transform = 'translateX(0)';
            loadNotifications();
            // Her 30 saniyede bir kontrol et
            if (notificationCheckInterval) {
                clearInterval(notificationCheckInterval);
            }
            notificationCheckInterval = setInterval(loadNotifications, 30000);
        } else {
            // Kapat
            sidebar.classList.add('translate-x-full');
            sidebar.style.transform = 'translateX(100%)';
            if (notificationCheckInterval) {
                clearInterval(notificationCheckInterval);
                notificationCheckInterval = null;
            }
        }
    } catch (error) {
        console.error('Bildirim sidebar açılırken hata:', error);
    }
}

// Bildirimleri modal için yükle
async function loadNotificationsForModal() {
    try {
        const response = await fetch(`${API_BASE}/notifications.php`);
        const data = await response.json();
        
        if (data.success) {
            displayNotificationsForModal(data.notifications);
            updateNotificationBadge(data.unread_count || 0);
        } else {
            const container = document.getElementById('notificationsModalList');
            if (container) {
                container.innerHTML = '<div class="text-center text-gray-400 py-8">Bildirim yüklenirken hata oluştu</div>';
            }
        }
    } catch (error) {
        console.error('Bildirimler yüklenirken hata:', error);
        const container = document.getElementById('notificationsModalList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-400 py-8">Bildirim yüklenirken hata oluştu</div>';
        }
    }
}

// Bildirimleri modal için göster
function displayNotificationsForModal(notifications) {
    const container = document.getElementById('notificationsModalList');
    if (!container) return;
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8">Henüz bildirim yok</div>';
        return;
    }
    
    container.innerHTML = notifications.map(notification => {
        const profilePic = notification.actor_profile_picture
            ? `../${notification.actor_profile_picture}`
            : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'14\'%3E%3F%3C/text%3E%3C/svg%3E';
        
        let icon = '🔔';
        let message = '';
        
        if (notification.type === 'like') {
            icon = '❤️';
            message = `<strong>${escapeHtml(notification.actor_username)}</strong> gönderinizi beğendi`;
        } else if (notification.type === 'comment') {
            icon = '💬';
            message = `<strong>${escapeHtml(notification.actor_username)}</strong> gönderinize yorum yaptı`;
        } else if (notification.type === 'follow') {
            icon = '👤';
            message = `<strong>${escapeHtml(notification.actor_username)}</strong> sizi takip etmeye başladı`;
        }
        
        const timeAgo = getTimeAgo(notification.created_at);
        const unreadClass = notification.is_read == 0 ? 'bg-red-600/10 border-red-600/30' : 'bg-neutral-800/50 border-gray-700/50';
        
        return `
            <div class="notification-item p-3 rounded-lg border ${unreadClass} transition-all duration-200 hover:bg-red-600/5 cursor-pointer mb-2" 
                 onclick="handleNotificationClick(${notification.id}, ${notification.post_id || 'null'}, ${notification.is_read})">
                <div class="flex items-start space-x-3">
                    <img src="${profilePic}" 
                         alt="${notification.actor_username}" 
                         class="w-10 h-10 rounded-full object-cover border-2 border-red-600/30"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'14\'%3E%3F%3C/text%3E%3C/svg%3E'">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                            <span class="text-lg">${icon}</span>
                            <p class="text-sm text-white ${notification.is_read == 0 ? 'font-semibold' : 'font-normal'}">${message}</p>
                        </div>
                        <p class="text-xs text-gray-400 mt-1">${timeAgo}</p>
                        ${notification.post_image ? `
                            <img src="../${notification.post_image}" 
                                 alt="Post" 
                                 class="w-16 h-16 rounded-lg mt-2 object-cover border border-gray-700"
                                 onerror="this.style.display='none'">
                        ` : ''}
                    </div>
                    ${notification.is_read == 0 ? `
                        <div class="w-2 h-2 bg-red-600 rounded-full flex-shrink-0 mt-2"></div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Bildirimleri yükle
async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE}/notifications.php`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Bildirimler yüklenemedi');
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayNotifications(data.notifications);
            updateNotificationBadge(data.unread_count);
        }
    } catch (error) {
        console.error('Bildirim yükleme hatası:', error);
    }
}

// Bildirimleri göster
function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                <p>Henüz bildirim yok</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => {
        const profilePic = notification.actor_profile_picture 
            ? `../${notification.actor_profile_picture}` 
            : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'14\'%3E%3F%3C/text%3E%3C/svg%3E';
        
        const timeAgo = getTimeAgo(notification.created_at);
        
        let message = '';
        let icon = '';
        
        switch (notification.type) {
            case 'like':
                message = `${notification.actor_username} gönderinizi beğendi`;
                icon = '❤️';
                break;
            case 'comment':
                message = `${notification.actor_username} gönderinize yorum yaptı`;
                icon = '💬';
                break;
            case 'follow':
                message = `${notification.actor_username} sizi takip etmeye başladı`;
                icon = '👤';
                break;
            default:
                message = `${notification.actor_username} bir işlem yaptı`;
                icon = '🔔';
        }
        
        const unreadClass = notification.is_read == 0 ? 'bg-red-600/10 border-red-600/30' : 'bg-neutral-800/50 border-gray-700/50';
        
        return `
            <div class="notification-item p-3 rounded-lg border ${unreadClass} transition-all duration-200 hover:bg-red-600/5 cursor-pointer" 
                 onclick="handleNotificationClick(${notification.id}, ${notification.post_id || 'null'}, ${notification.is_read})">
                <div class="flex items-start space-x-3">
                    <img src="${profilePic}" 
                         alt="${notification.actor_username}" 
                         class="w-10 h-10 rounded-full object-cover border-2 border-red-600/30"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'14\'%3E%3F%3C/text%3E%3C/svg%3E'">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                            <span class="text-lg">${icon}</span>
                            <p class="text-sm text-white ${notification.is_read == 0 ? 'font-semibold' : 'font-normal'}">${escapeHtml(message)}</p>
                        </div>
                        <p class="text-xs text-gray-400 mt-1">${timeAgo}</p>
                        ${notification.post_image ? `
                            <img src="../${notification.post_image}" 
                                 alt="Post" 
                                 class="w-16 h-16 rounded-lg mt-2 object-cover border border-gray-700"
                                 onerror="this.style.display='none'">
                        ` : ''}
                    </div>
                    ${notification.is_read == 0 ? `
                        <div class="w-2 h-2 bg-red-600 rounded-full flex-shrink-0 mt-2"></div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Bildirim badge'ini güncelle
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    const badgeMobile = document.getElementById('notificationBadgeMobile');
    const badgeSidebar = document.getElementById('notificationBadgeSidebar');
    
    const badges = [badge, badgeMobile, badgeSidebar].filter(Boolean);
    
    badges.forEach(b => {
        if (count > 0) {
            b.textContent = count > 99 ? '99+' : count;
            b.classList.remove('hidden');
        } else {
            b.classList.add('hidden');
        }
    });
}

// Bildirime tıklandığında
async function handleNotificationClick(notificationId, postId, isRead) {
    // Bildirimi okundu olarak işaretle
    if (isRead == 0) {
        await markNotificationRead(notificationId);
    }
    
    // Eğer post varsa, posta git
    if (postId) {
        // Post sayfasına yönlendir (şimdilik ana sayfaya)
        window.location.href = 'index.html';
    }
}

// Bildirimi okundu olarak işaretle
async function markNotificationRead(notificationId) {
    try {
        const response = await fetch(`${API_BASE}/notifications.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notification_id: notificationId })
        });
        
        if (response.ok) {
            // Badge'i güncelle
            loadNotifications();
        }
    } catch (error) {
        console.error('Bildirim okundu işaretleme hatası:', error);
    }
}

// Tüm bildirimleri okundu olarak işaretle
async function markAllNotificationsRead() {
    try {
        const response = await fetch(`${API_BASE}/notifications.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mark_all_read: true })
        });
        
        if (response.ok) {
            loadNotifications();
        }
    } catch (error) {
        console.error('Tüm bildirimleri okundu işaretleme hatası:', error);
    }
}

// Zaman farkını hesapla
function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Az önce';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} dakika önce`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} saat önce`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} gün önce`;
    } else {
        return date.toLocaleDateString('tr-TR');
    }
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sayfa yüklendiğinde bildirimleri kontrol et
document.addEventListener('DOMContentLoaded', function() {
    // İlk yüklemede bildirim sayısını kontrol et
    loadNotifications();
    
    // Her 60 saniyede bir kontrol et (sidebar açık değilse)
    setInterval(() => {
        const sidebar = document.getElementById('notificationSidebar');
        if (sidebar && sidebar.classList.contains('translate-x-full')) {
            loadNotifications();
        }
    }, 60000);
    
    // Sidebar dışına tıklandığında kapat
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('notificationSidebar');
        const btn = document.getElementById('notificationBtn');
        const btnMobile = document.getElementById('notificationBtnMobile');
        
        if (sidebar && !sidebar.classList.contains('translate-x-full')) {
            if (!sidebar.contains(e.target) && 
                !btn?.contains(e.target) && 
                !btnMobile?.contains(e.target)) {
                toggleNotifications();
            }
        }
    });
});

// Global fonksiyonlar
window.toggleNotifications = toggleNotifications;
window.openNotificationsModal = openNotificationsModal;
window.closeNotificationsModal = closeNotificationsModal;
window.handleNotificationClick = handleNotificationClick;
window.markAllNotificationsRead = markAllNotificationsRead;

