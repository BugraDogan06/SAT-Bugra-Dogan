// API Base URL (global değişken, sadece bir kez tanımla)
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

// Takvim durumu
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let events = [];
let selectedEvent = null;
let isAdmin = false;

// Sayfa yüklendiğinde session kontrolü yap ve etkinlikleri getir
document.addEventListener('DOMContentLoaded', async function() {
    // Önce session kontrolü yap
    try {
        const authResponse = await fetch(`${API_BASE}/auth.php`, {
            credentials: 'include'
        });
        const authData = await authResponse.json();
        
        // Eğer giriş yapılmamışsa login sayfasına yönlendir
        if (!authData.success) {
            window.location.href = 'login.html';
            return;
        }
        
        // Admin kontrolü
        isAdmin = authData.user && authData.user.is_admin == 1;
        if (isAdmin) {
            const adminBtn = document.getElementById('adminPanelBtn');
            if (adminBtn) {
                adminBtn.classList.remove('hidden');
            }
        }
        
        // Giriş yapılmışsa etkinlikleri yükle
        await loadEvents();
        renderCalendar();
    } catch (error) {
        console.error('Session kontrolü hatası:', error);
        window.location.href = 'login.html';
    }
});

// Etkinlikleri yükle
async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE}/events.php`);
        const data = await response.json();
        
        if (data.success) {
            events = data.events || [];
            displayEvents(events);
            renderCalendar();
        } else {
            document.getElementById('eventsContainer').innerHTML = 
                '<p class="text-center text-gray-400 py-10">Henüz etkinlik yok</p>';
        }
    } catch (error) {
        console.error('Etkinlikler yüklenirken hata:', error);
        document.getElementById('eventsContainer').innerHTML = 
            '<p class="text-center text-gray-400 py-10">Etkinlikler yüklenirken bir hata oluştu</p>';
    }
}

// Takvimi render et
function renderCalendar() {
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    // Başlık güncelle
    const header = document.getElementById('calendarHeader');
    if (header) {
        header.querySelector('h3').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    // İlk günün haftanın hangi günü olduğunu bul
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDay.getDay();
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1; // Pazartesi = 0
    
    // Ayın kaç gün olduğunu bul
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Bugünün tarihi
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    
    // Takvim grid'ini oluştur
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Boş hücreler (ayın ilk gününden önce)
    for (let i = 0; i < adjustedStartingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'aspect-square';
        grid.appendChild(emptyCell);
    }
    
    // Günler
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        const cellDate = new Date(currentYear, currentMonth, day);
        const isToday = isCurrentMonth && day === today.getDate();
        
        // Bu günde etkinlik var mı?
        const dayEvents = getEventsForDate(cellDate);
        const hasEvents = dayEvents.length > 0;
        
        // İlk etkinliğin görselini al
        let eventImageUrl = '';
        if (hasEvents && dayEvents[0].image_url) {
            const imgUrl = dayEvents[0].image_url;
            if (imgUrl.startsWith('http')) {
                eventImageUrl = imgUrl;
            } else if (imgUrl.startsWith('images/')) {
                eventImageUrl = imgUrl;
            } else if (imgUrl.startsWith('../')) {
                eventImageUrl = imgUrl.substring(3);
            } else {
                eventImageUrl = 'images/events/' + imgUrl;
            }
        }
        
        cell.className = `calendar-day aspect-square p-1 rounded-xl border transition-all cursor-pointer overflow-hidden ${
            isToday 
                ? 'bg-gradient-to-br from-red-600/40 to-red-700/30 border-red-500/60 text-white font-bold shadow-lg shadow-red-600/30' 
                : hasEvents
                    ? 'bg-gradient-to-br from-red-600/20 to-red-700/10 border-red-600/40 hover:from-red-600/30 hover:to-red-700/20 text-white shadow-md shadow-red-600/20'
                    : 'bg-neutral-800/30 border-gray-700/50 hover:bg-neutral-700/40 text-gray-300 backdrop-blur-sm'
        }`;
        
        cell.innerHTML = `
            <div class="flex flex-col h-full relative">
                <div class="text-xs font-semibold ${isToday ? 'text-white' : 'text-gray-300'} z-10">${day}</div>
                ${hasEvents ? `
                    <div class="flex-1 flex items-center justify-center mt-0.5 relative overflow-hidden">
                        ${eventImageUrl ? `
                            <img src="${eventImageUrl}" 
                                 alt="${dayEvents[0].title}" 
                                 class="w-full h-full object-cover object-center rounded"
                                 style="object-position: center center;"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="hidden absolute inset-0 items-center justify-center">
                                <div class="w-2 h-2 rounded-full bg-red-500"></div>
                            </div>
                        ` : `
                            <div class="w-2 h-2 rounded-full bg-red-500"></div>
                        `}
                        ${dayEvents.length > 1 ? `
                            <span class="absolute top-0 right-0 bg-red-600 text-white text-[10px] px-1 rounded-full z-20">${dayEvents.length}</span>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        
        if (hasEvents) {
            cell.onclick = () => showEventsForDate(dayEvents, cellDate);
        }
        
        grid.appendChild(cell);
    }
}

// Belirli bir tarihteki etkinlikleri getir
function getEventsForDate(date) {
    return events.filter(event => {
        const eventDate = new Date(event.event_date);
        return eventDate.getDate() === date.getDate() &&
               eventDate.getMonth() === date.getMonth() &&
               eventDate.getFullYear() === date.getFullYear();
    });
}

// Tarihe göre etkinlikleri göster
function showEventsForDate(dayEvents, date) {
    if (dayEvents.length === 1) {
        openEventModal(dayEvents[0]);
    } else {
        // Birden fazla etkinlik varsa liste göster
        const modal = document.getElementById('eventDetailModal');
        const content = document.getElementById('eventDetailContent');
        
        const dateStr = date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        content.innerHTML = `
            <div class="p-6">
                <h3 class="text-2xl font-bold text-white mb-4">${dateStr} - Etkinlikler</h3>
                <div class="space-y-4">
                    ${dayEvents.map(event => `
                        <div onclick="openEventModal(${JSON.stringify(event).replace(/"/g, '&quot;')})" 
                             class="p-4 bg-neutral-800 rounded-lg border border-gray-700 hover:border-red-600 cursor-pointer transition">
                            <h4 class="text-lg font-semibold text-white mb-2">${event.title}</h4>
                            ${event.location ? `<p class="text-gray-400 text-sm">📍 ${event.location}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Etkinlik modalını aç
function openEventModal(event) {
    selectedEvent = event;
    const modal = document.getElementById('eventDetailModal');
    const content = document.getElementById('eventDetailContent');
    
        const eventDate = new Date(event.event_date);
        const formattedDate = eventDate.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
    // Görsel yolunu düzelt - events.html frontend/ klasöründe, görseller frontend/images/events/ klasöründe
    let imageUrl = '';
    if (event.image_url) {
        if (event.image_url.startsWith('http')) {
            imageUrl = event.image_url;
        } else if (event.image_url.startsWith('images/')) {
            // Zaten doğru yol (images/events/filename.jpg)
            imageUrl = event.image_url;
        } else if (event.image_url.startsWith('../')) {
            // Eski format (../images/events/filename.jpg) -> images/events/filename.jpg
            imageUrl = event.image_url.substring(3);
        } else {
            // Sadece dosya adı ise (filename.jpg) -> images/events/filename.jpg
            imageUrl = 'images/events/' + event.image_url;
        }
    }
    
    content.innerHTML = `
        ${imageUrl ? `
            <div class="w-full max-h-[70vh] overflow-hidden">
                <img src="${imageUrl}" alt="${event.title}" class="w-full h-auto object-contain rounded-t-2xl" onerror="this.onerror=null; this.style.display='none';">
            </div>
                ` : ''}
                <div class="p-6">
            <h2 class="text-3xl font-bold text-white mb-4">${event.title}</h2>
            ${event.description ? `<p class="text-gray-300 mb-6 leading-relaxed">${event.description}</p>` : ''}
            <div class="space-y-3 mb-6">
                <div class="flex items-center space-x-3 text-gray-300">
                    <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>${formattedDate}</span>
                </div>
                ${event.location ? `
                    <div class="flex items-center space-x-3 text-gray-300">
                        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span>${event.location}</span>
                    </div>
                ` : ''}
                ${event.username ? `
                    <div class="flex items-center space-x-3 text-gray-300">
                        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        <span>Organizatör: ${event.username}</span>
                    </div>
                ` : ''}
                ${event.participant_count !== undefined ? `
                    <div class="flex items-center space-x-3 text-gray-300">
                        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        <span>${event.participant_count || 0} katılımcı</span>
                    </div>
                ` : ''}
                    </div>
                    <button onclick="registerEvent(${event.id})" 
                    class="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition transform hover:scale-105">
                Etkinliğe Katıl
            </button>
        </div>
    `;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Modalı kapat
function closeEventModal() {
    const modal = document.getElementById('eventDetailModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    selectedEvent = null;
}

// Önceki ay
function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

// Sonraki ay
function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

// Bugüne git
function goToToday() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    renderCalendar();
}

// Etkinlikleri göster (liste görünümü)
function displayEvents(eventsList) {
    const container = document.getElementById('eventsContainer');
    
    if (!container) return;
    
    if (eventsList.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-10">Henüz etkinlik yok</p>';
        return;
    }
    
    // Tarihe göre sırala
    const sortedEvents = [...eventsList].sort((a, b) => {
        return new Date(a.event_date) - new Date(b.event_date);
    });
    
    // Sadece en yakın tarihli etkinliği göster
    const nextEvent = sortedEvents[0];
    
    if (!nextEvent) {
        container.innerHTML = '<p class="text-center text-gray-400 py-10">Henüz etkinlik yok</p>';
        return;
    }
    
    const eventDate = new Date(nextEvent.event_date);
    const formattedDate = eventDate.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Görsel yolunu düzelt
    let imageUrl = '';
    if (nextEvent.image_url) {
        if (nextEvent.image_url.startsWith('http')) {
            imageUrl = nextEvent.image_url;
        } else if (nextEvent.image_url.startsWith('images/')) {
            imageUrl = nextEvent.image_url;
        } else if (nextEvent.image_url.startsWith('../')) {
            imageUrl = nextEvent.image_url.substring(3);
        } else {
            imageUrl = 'images/events/' + nextEvent.image_url;
        }
    }
    
    container.innerHTML = `
        <div class="event-card rounded-xl overflow-hidden ${isAdmin ? '' : 'cursor-pointer'}" 
             ${!isAdmin ? `onclick="openEventModal(${JSON.stringify(nextEvent).replace(/"/g, '&quot;')})"` : ''}>
            <div class="p-5 bg-gradient-to-br from-neutral-900/90 to-black border border-gray-800/50">
                <div class="flex items-start gap-5">
                    ${imageUrl ? `
                        <div class="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden border-2 border-red-600/30 shadow-lg">
                            <img src="${imageUrl}" class="w-full h-full object-cover" alt="${nextEvent.title}" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTFhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkV0a2lubGlrIFBvc3RlcjwvdGV4dD48L3N2Zz4=';">
                        </div>
                    ` : `
                        <div class="w-28 h-28 flex-shrink-0 rounded-lg bg-gradient-to-br from-red-900/40 to-black border-2 border-red-600/30 flex items-center justify-center shadow-lg">
                            <svg class="w-12 h-12 text-red-600/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                    `}
                    <div class="flex-1 min-w-0 flex flex-col">
                        <h3 class="text-lg font-bold text-white mb-2 line-clamp-2">${nextEvent.title}</h3>
                        ${nextEvent.description ? `<p class="text-gray-400 text-sm mb-3 line-clamp-2 leading-relaxed">${nextEvent.description}</p>` : ''}
                        <div class="space-y-2 mb-4">
                            <p class="flex items-center gap-2.5 text-gray-300">
                                <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span class="text-sm">${formattedDate}</span>
                            </p>
                            ${nextEvent.location ? `
                                <p class="flex items-center gap-2.5 text-gray-300">
                                    <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                    <span class="text-sm">${nextEvent.location}</span>
                                </p>
                            ` : ''}
                        </div>
                        <div class="mt-auto">
                            ${isAdmin ? `
                                <div class="flex gap-2">
                                    <button onclick="event.stopPropagation(); openAdminPanel(${JSON.stringify(nextEvent).replace(/"/g, '&quot;')})" 
                                            class="px-4 py-2 bg-blue-600/90 hover:bg-blue-600 rounded-lg text-white text-xs font-bold transition-all hover:scale-105">
                                        Düzenle
                                    </button>
                                    <button onclick="event.stopPropagation(); deleteEvent(${nextEvent.id})" 
                                            class="px-4 py-2 bg-red-600/90 hover:bg-red-600 rounded-lg text-white text-xs font-bold transition-all hover:scale-105">
                                        Sil
                    </button>
                                </div>
                            ` : `
                                <button onclick="event.stopPropagation(); openEventModal(${JSON.stringify(nextEvent).replace(/"/g, '&quot;')})" 
                                        class="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-semibold transition-all hover:scale-105">
                                    Detaylar
                                </button>
                            `}
                        </div>
                    </div>
                </div>
                </div>
            </div>
        `;
}

// Etkinliğe kayıt ol
async function registerEvent(eventId) {
    // Login kontrolü yapılacak
    alert('Etkinliğe kayıt özelliği yakında eklenecek!');
}

// Admin Panel Fonksiyonları
function openAdminPanel(event = null) {
    const modal = document.getElementById('adminEventModal');
    const form = document.getElementById('adminEventForm');
    const title = document.getElementById('adminModalTitle');
    const eventId = document.getElementById('eventId');
    const eventTitle = document.getElementById('eventTitle');
    const eventDescription = document.getElementById('eventDescription');
    const eventDate = document.getElementById('eventDate');
    const eventTime = document.getElementById('eventTime');
    const eventLocation = document.getElementById('eventLocation');
    const eventPoster = document.getElementById('eventPoster');
    const eventImageUrl = document.getElementById('eventImageUrl');
    const posterPreview = document.getElementById('posterPreview');
    const posterPreviewImg = document.getElementById('posterPreviewImg');
    
    if (event) {
        // Düzenleme modu
        title.textContent = 'Etkinlik Düzenle';
        eventId.value = event.id;
        eventTitle.value = event.title;
        eventDescription.value = event.description || '';
        
        const eventDateObj = new Date(event.event_date);
        eventDate.value = eventDateObj.toISOString().split('T')[0];
        eventTime.value = eventDateObj.toTimeString().slice(0, 5);
        eventLocation.value = event.location || '';
        eventImageUrl.value = event.image_url || '';
        
        if (event.image_url) {
            // Görsel yolunu düzelt
            let previewUrl = event.image_url;
            if (!previewUrl.startsWith('http') && !previewUrl.startsWith('images/')) {
                previewUrl = previewUrl.startsWith('../') ? previewUrl.substring(3) : previewUrl;
            }
            posterPreviewImg.src = previewUrl.startsWith('images/') ? previewUrl : 'images/events/' + previewUrl;
            posterPreview.classList.remove('hidden');
        }
    } else {
        // Yeni etkinlik modu
        title.textContent = 'Yeni Etkinlik Ekle';
        form.reset();
        eventId.value = '';
        posterPreview.classList.add('hidden');
    }
    
    // Poster önizleme
    eventPoster.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                posterPreviewImg.src = e.target.result;
                posterPreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeAdminPanel() {
    const modal = document.getElementById('adminEventModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    const form = document.getElementById('adminEventForm');
    form.reset();
    document.getElementById('posterPreview').classList.add('hidden');
}

async function saveEvent(event) {
    event.preventDefault();
    
    if (!isAdmin) {
        alert('Bu işlem için yönetici yetkisi gereklidir!');
        return;
    }
    
    const form = document.getElementById('adminEventForm');
    const formData = new FormData(form);
    
    const eventId = formData.get('event_id');
    const eventDate = formData.get('event_date');
    const eventTime = formData.get('event_time') || '00:00';
    const eventDateTime = eventDate + ' ' + eventTime + ':00';
    
    formData.set('event_date', eventDateTime);
    
    try {
        const url = eventId 
            ? `${API_BASE}/events.php?id=${eventId}` 
            : `${API_BASE}/events.php`;
        
        const method = eventId ? 'PUT' : 'POST';
        
        // PUT için JSON gönder
        if (method === 'PUT') {
            const jsonData = {
                id: parseInt(eventId),
                title: formData.get('title'),
                description: formData.get('description'),
                event_date: eventDateTime,
                location: formData.get('location'),
                image_url: formData.get('image_url')
            };
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(jsonData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Etkinlik güncellendi!');
                closeAdminPanel();
                await loadEvents();
                renderCalendar();
            } else {
                alert(data.message || 'Etkinlik güncellenemedi');
            }
        } else {
            // POST için FormData gönder (dosya yükleme için)
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Etkinlik eklendi!');
                closeAdminPanel();
                await loadEvents();
                renderCalendar();
            } else {
                alert(data.message || 'Etkinlik eklenemedi');
            }
        }
    } catch (error) {
        console.error('Etkinlik kaydetme hatası:', error);
        alert('Etkinlik kaydedilirken bir hata oluştu');
    }
}

async function deleteEvent(eventId) {
    if (!isAdmin) {
        alert('Bu işlem için yönetici yetkisi gereklidir!');
        return;
    }
    
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/events.php?id=${eventId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Etkinlik silindi!');
            await loadEvents();
            renderCalendar();
        } else {
            alert(data.message || 'Etkinlik silinemedi');
        }
    } catch (error) {
        console.error('Etkinlik silme hatası:', error);
        alert('Etkinlik silinirken bir hata oluştu');
    }
}
