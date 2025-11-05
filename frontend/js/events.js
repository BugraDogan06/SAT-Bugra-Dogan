// API Base URL
const API_BASE = '../backend/api';

// Sayfa yüklendiğinde etkinlikleri getir
document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
});

// Etkinlikleri yükle
async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE}/events.php`);
        const data = await response.json();
        
        if (data.success) {
            displayEvents(data.events);
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

// Etkinlikleri göster
function displayEvents(events) {
    const container = document.getElementById('eventsContainer');
    
    if (events.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-10 col-span-2">Henüz etkinlik yok</p>';
        return;
    }
    
    container.innerHTML = events.map(event => {
        const eventDate = new Date(event.event_date);
        const formattedDate = eventDate.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="event-card bg-neutral-900 rounded-2xl overflow-hidden border border-gray-700">
                ${event.image_url ? `
                    <img src="${event.image_url}" class="w-full h-48 object-cover" alt="${event.title}">
                ` : ''}
                <div class="p-6">
                    <h3 class="text-xl font-bold text-white mb-2">${event.title}</h3>
                    ${event.description ? `<p class="text-gray-400 mb-4">${event.description}</p>` : ''}
                    <div class="space-y-2 text-sm text-gray-400 mb-4">
                        <p>📅 ${formattedDate}</p>
                        ${event.location ? `<p>📍 ${event.location}</p>` : ''}
                    </div>
                    <button onclick="registerEvent(${event.id})" 
                            class="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium">
                        Katıl
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Etkinliğe kayıt ol
async function registerEvent(eventId) {
    // Login kontrolü yapılacak
    window.location.href = 'login.html';
}

