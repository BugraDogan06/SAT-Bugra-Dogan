// API Base URL
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

let currentUserId = null;
let viewingUserId = null;
let isOwnProfile = false;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // URL'den user_id al
    const urlParams = new URLSearchParams(window.location.search);
    viewingUserId = urlParams.get('user_id');
    
    // Mevcut kullanıcı bilgisini al
    fetch(`${API_BASE}/auth.php`, {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.user) {
            currentUserId = data.user.id;
            isOwnProfile = !viewingUserId || viewingUserId == currentUserId;
            
            if (isOwnProfile) {
                viewingUserId = currentUserId;
            }
            
            // Araba ekle butonunu göster/gizle
            updateAddCarButtonVisibility();
            
            loadCars();
        } else {
            isOwnProfile = false;
            updateAddCarButtonVisibility();
            if (viewingUserId) {
                loadCars();
            }
        }
    })
    .catch(err => {
        console.error('Auth check error:', err);
        isOwnProfile = false;
        updateAddCarButtonVisibility();
        if (viewingUserId) {
            loadCars();
        }
    });
});

// Araba ekle butonunun görünürlüğünü güncelle
function updateAddCarButtonVisibility() {
    const addCarBtn = document.getElementById('addCarBtn');
    if (addCarBtn) {
        if (isOwnProfile) {
            addCarBtn.classList.remove('hidden');
        } else {
            addCarBtn.classList.add('hidden');
        }
    }
}

// Arabaları yükle
async function loadCars() {
    const userId = viewingUserId || currentUserId;
    if (!userId) return;
    
    try {
        const response = await fetch(`${API_BASE}/cars.php?user_id=${userId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            displayCars(data.cars || []);
            updateCarsCount(data.cars?.length || 0);
        }
    } catch (error) {
        console.error('Arabalar yüklenirken hata:', error);
    }
}

// Arabaları göster - Instagram Tarzı Grid
function displayCars(cars) {
    const container = document.getElementById('carsContainer');
    const noCarsMessage = document.getElementById('noCarsMessage');
    const addFirstCarBtn = document.getElementById('addFirstCarBtn');
    
    if (!container) return;
    
    if (cars.length === 0) {
        container.innerHTML = '';
        if (noCarsMessage) {
            noCarsMessage.classList.remove('hidden');
        }
        // Sadece kendi profiliyse "İlk Aracını Ekle" butonunu göster
        if (isOwnProfile && addFirstCarBtn) {
            addFirstCarBtn.classList.remove('hidden');
        } else if (addFirstCarBtn) {
            addFirstCarBtn.classList.add('hidden');
        }
        return;
    }
    
    if (noCarsMessage) {
        noCarsMessage.classList.add('hidden');
    }
    // Sadece kendi profiliyse "İlk Aracını Ekle" butonunu göster
    if (isOwnProfile && addFirstCarBtn) {
        addFirstCarBtn.classList.add('hidden');
    } else if (addFirstCarBtn) {
        addFirstCarBtn.classList.add('hidden');
    }
    
    // Detaylı kart görünümü
    container.innerHTML = cars.map(car => {
        const imagePath = car.image_url 
            ? (car.image_url.startsWith('http') ? car.image_url : '../' + car.image_url)
            : '';
        
        return `
        <div class="bg-neutral-900 rounded-2xl border border-gray-700 overflow-hidden hover:border-red-600 transition-all duration-300">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
                <!-- Sol Taraf - Resim -->
                <div class="aspect-square md:aspect-auto md:h-full bg-neutral-800 overflow-hidden relative">
                    ${imagePath ? `
                    <img src="${imagePath}" 
                         alt="${escapeHtml(car.brand)} ${escapeHtml(car.model)}" 
                         class="w-full h-full object-cover" />
                    ` : `
                    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <svg class="w-24 h-24 text-gray-600" fill="currentColor" viewBox="0 0 252.094 252.094">
                            <path d="M196.979,146.785c-1.091,0-2.214,0.157-3.338,0.467l-4.228,1.165l-6.229-15.173c-3.492-8.506-13.814-15.426-23.01-15.426H91.808c-9.195,0-19.518,6.921-23.009,15.427l-6.218,15.145l-4.127-1.137c-1.124-0.31-2.247-0.467-3.338-0.467c-5.485,0-9.467,3.935-9.467,9.356c0,5.352,3.906,9.858,9.2,11.211c-2.903,8.017-5.159,20.034-5.159,27.929v32.287c0,6.893,5.607,12.5,12.5,12.5h4.583c6.893,0,12.5-5.607,12.5-12.5v-6.04h93.435v6.04c0,6.893,5.607,12.5,12.5,12.5h4.585c6.893,0,12.5-5.607,12.5-12.5v-32.287c0-7.887-2.252-19.888-5.15-27.905c5.346-1.32,9.303-5.85,9.303-11.235C206.445,150.72,202.464,146.785,196.979,146.785z M70.352,159.384l10.161-24.754c2.089-5.088,8.298-9.251,13.798-9.251h63.363c5.5,0,11.709,4.163,13.798,9.251l10.161,24.754c2.089,5.088-0.702,9.251-6.202,9.251H76.554C71.054,168.635,68.263,164.472,70.352,159.384z M97.292,199.635c0,2.75-2.25,5-5,5H71.554c-2.75,0-5-2.25-5-5v-8.271c0-2.75,2.25-5,5-5h20.738c2.75,0,5,2.25,5,5V199.635z M185.203,199.635c0,2.75-2.25,5-5,5h-20.736c-2.75,0-5-2.25-5-5v-8.271c0-2.75,2.25-5,5-5h20.736c2.75,0,5,2.25,5,5V199.635z"/>
                            <path d="M246.545,71.538L131.625,4.175c-1.525-0.894-3.506-1.386-5.578-1.386c-2.072,0-4.053,0.492-5.578,1.386L5.549,71.538C2.386,73.392,0,77.556,0,81.223v160.582c0,4.135,3.364,7.5,7.5,7.5h12.912c4.136,0,7.5-3.365,7.5-7.5V105.917c0-1.378,1.121-2.5,2.5-2.5h191.268c1.379,0,2.5,1.122,2.5,2.5v135.888c0,4.135,3.364,7.5,7.5,7.5h12.913c4.136,0,7.5-3.365,7.5-7.5V81.223C252.094,77.556,249.708,73.392,246.545,71.538z"/>
                        </svg>
                    </div>
                    `}
                    ${car.is_featured ? `
                    <div class="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                        ⭐ Öne Çıkan
                    </div>
                    ` : ''}
                </div>
                
                <!-- Sağ Taraf - Bilgiler -->
                <div class="p-6 space-y-4">
                    <div>
                        <h4 class="text-2xl font-bold text-white mb-1">${escapeHtml(car.brand)} ${escapeHtml(car.model)}</h4>
                        ${car.year ? `<p class="text-gray-400 text-sm">${car.year}</p>` : ''}
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-neutral-800 rounded-lg p-3 border border-gray-700">
                            <p class="text-gray-400 text-xs mb-1">Marka</p>
                            <p class="text-white font-semibold text-sm">${escapeHtml(car.brand || '-')}</p>
                        </div>
                        <div class="bg-neutral-800 rounded-lg p-3 border border-gray-700">
                            <p class="text-gray-400 text-xs mb-1">Model</p>
                            <p class="text-white font-semibold text-sm">${escapeHtml(car.model || '-')}</p>
                        </div>
                        ${car.year ? `
                        <div class="bg-neutral-800 rounded-lg p-3 border border-gray-700">
                            <p class="text-gray-400 text-xs mb-1">Yıl</p>
                            <p class="text-white font-semibold text-sm">${car.year}</p>
                        </div>
                        ` : ''}
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
                    
                    ${isOwnProfile ? `
                    <div class="flex gap-3 pt-2">
                        <button onclick="editCar(${car.id})" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition text-sm">
                            Düzenle
                        </button>
                        <button onclick="deleteCar(${car.id})" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition text-sm">
                            Sil
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Araba detayını aç
async function openCarDetail(carId) {
    try {
        const response = await fetch(`${API_BASE}/cars.php?car_id=${carId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.car) {
            const car = data.car;
            const modal = document.getElementById('carDetailModal');
            const actionsContainer = document.getElementById('carDetailActions');
            
            // Modal içeriğini doldur
            document.getElementById('carDetailTitle').textContent = `${car.brand || ''} ${car.model || ''}`;
            document.getElementById('carDetailName').textContent = `${car.brand || ''} ${car.model || ''}`;
            document.getElementById('carDetailBrand').textContent = car.brand || '-';
            document.getElementById('carDetailModel').textContent = car.model || '-';
            document.getElementById('carDetailYear').textContent = car.year || '';
            document.getElementById('carDetailYearInfo').textContent = car.year || '-';
            document.getElementById('carDetailColor').textContent = car.color || '-';
            document.getElementById('carDetailEngine').textContent = car.engine || '-';
            document.getElementById('carDetailHorsepower').textContent = car.horsepower ? `${car.horsepower} HP` : '-';
            document.getElementById('carDetailDescription').textContent = car.description || 'Açıklama eklenmemiş';
            
            // Resim
            const carImage = document.getElementById('carDetailImage');
            if (car.image_url) {
                const imagePath = car.image_url.startsWith('http') ? car.image_url : '../' + car.image_url;
                carImage.src = imagePath;
                carImage.alt = `${car.brand} ${car.model}`;
            } else {
                carImage.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\'%3E%3Crect width=\'400\' height=\'400\' fill=\'%23333\'/%3E%3C/svg%3E';
            }
            
            // Öne çıkan badge
            const featuredBadge = document.getElementById('carDetailFeatured');
            if (car.is_featured == 1) {
                featuredBadge.classList.remove('hidden');
            } else {
                featuredBadge.classList.add('hidden');
            }
            
            // Butonlar (sadece kendi profiliyse)
            if (actionsContainer) {
                if (isOwnProfile) {
                    actionsContainer.innerHTML = `
                        <button onclick="editCar(${car.id}); closeCarDetailModal();" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition">
                            Düzenle
                        </button>
                        <button onclick="deleteCar(${car.id}); closeCarDetailModal();" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition">
                            Sil
                        </button>
                    `;
                } else {
                    actionsContainer.innerHTML = '';
                }
            }
            
            // Modal'ı göster
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        } else {
            alert('Araç bilgileri yüklenemedi');
        }
    } catch (error) {
        console.error('Araç detayı yüklenirken hata:', error);
        alert('Araç detayı yüklenirken bir hata oluştu');
    }
}

// Araç detay modalını kapat
function closeCarDetailModal() {
    const modal = document.getElementById('carDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Araba sayısını güncelle
function updateCarsCount(count) {
    const carsCountEl = document.getElementById('carsCount');
    if (carsCountEl) {
        carsCountEl.textContent = count;
    }
}

// Araba ekleme modalını aç
function openAddCarModal() {
    if (typeof openUniversalModal === 'function') {
        openUniversalModal('car');
        const form = document.getElementById('carForm');
        const submitText = document.getElementById('carSubmitText');
        if (form && submitText) {
            submitText.textContent = 'Kaydet';
            form.reset();
            document.getElementById('carId').value = '';
            document.getElementById('carImagePreview').classList.add('hidden');
            document.getElementById('carError').classList.add('hidden');
        }
    }
}

// Araba düzenleme modalını aç
async function editCar(carId) {
    try {
        const response = await fetch(`${API_BASE}/cars.php?car_id=${carId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.car) {
            const car = data.car;
            
            // Universal modal'ı aç
            if (typeof openUniversalModal === 'function') {
                openUniversalModal('car');
            }
            
            const submitText = document.getElementById('carSubmitText');
            
            document.getElementById('carId').value = car.id;
            document.getElementById('carBrand').value = car.brand || '';
            document.getElementById('carModel').value = car.model || '';
            document.getElementById('carYear').value = car.year || '';
            document.getElementById('carColor').value = car.color || '';
            document.getElementById('carEngine').value = car.engine || '';
            document.getElementById('carHorsepower').value = car.horsepower || '';
            document.getElementById('carDescription').value = car.description || '';
            document.getElementById('carFeatured').checked = car.is_featured == 1;
            
            if (car.image_url) {
                const preview = document.getElementById('carImagePreview');
                preview.src = car.image_url;
                preview.classList.remove('hidden');
            } else {
                document.getElementById('carImagePreview').classList.add('hidden');
            }
            
            if (submitText) submitText.textContent = 'Güncelle';
        }
    } catch (error) {
        console.error('Araba bilgileri yüklenirken hata:', error);
        showCarError('Araba bilgileri yüklenirken hata oluştu');
    }
}

// Araba modalını kapat
function closeCarModal() {
    if (typeof closeUniversalModal === 'function') {
        closeUniversalModal();
    }
}

// Araba kaydet
async function saveCar() {
    const carId = document.getElementById('carId').value;
    const form = document.getElementById('carForm');
    const formData = new FormData(form);
    
    const errorEl = document.getElementById('carError');
    errorEl.classList.add('hidden');
    
    try {
        let url = `${API_BASE}/cars.php`;
        let method = 'POST';
        
        if (carId) {
            // Düzenleme için action parametresi ekle
            formData.append('action', 'update');
            formData.append('car_id', carId);
        }
        
        const response = await fetch(url, {
            method: method,
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeCarModal();
            loadCars();
        } else {
            showCarError(data.message || 'Bir hata oluştu');
        }
    } catch (error) {
        console.error('Araba kaydedilirken hata:', error);
        showCarError('Araba kaydedilirken hata oluştu');
    }
}

// Araba sil
async function deleteCar(carId) {
    if (!confirm('Bu arabayı silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/cars.php?car_id=${carId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadCars();
        } else {
            alert(data.message || 'Araba silinirken hata oluştu');
        }
    } catch (error) {
        console.error('Araba silinirken hata:', error);
        alert('Araba silinirken hata oluştu');
    }
}

// Resim önizleme
function previewCarImage(input) {
    const preview = document.getElementById('carImagePreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Hata göster
function showCarError(message) {
    const errorEl = document.getElementById('carError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

// HTML escape
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Kullanıcı arabalarını yükle (profile.js'den çağrılabilir)
async function loadUserCars() {
    // URL'den user_id al
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('user_id');
    
    // Mevcut kullanıcı bilgisini al
    try {
        const authResponse = await fetch(`${API_BASE}/auth.php`, {
            credentials: 'include'
        });
        const authData = await authResponse.json();
        
        if (authData.success && authData.user) {
            currentUserId = authData.user.id;
            viewingUserId = targetUserId ? parseInt(targetUserId) : currentUserId;
            isOwnProfile = !targetUserId || viewingUserId == currentUserId;
            
            updateAddCarButtonVisibility();
            await loadCars();
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// Global fonksiyonlar
window.openAddCarModal = openAddCarModal;
window.editCar = editCar;
window.deleteCar = deleteCar;
window.closeCarModal = closeCarModal;
window.saveCar = saveCar;
window.previewCarImage = previewCarImage;
window.loadUserCars = loadUserCars;
window.openCarDetail = openCarDetail;
window.closeCarDetailModal = closeCarDetailModal;
window.displayCars = displayCars;
window.loadCars = loadCars;

