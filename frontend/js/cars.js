// API Base URL
if (typeof API_BASE === 'undefined') {
    var API_BASE = '../backend/api';
}

// Değişkenler - main.js ile çakışmayı önlemek için farklı isimler kullan
var carsCurrentUserId = null;
var carsViewingUserId = null;
var carsIsOwnProfile = false;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // URL'den user_id al
    const urlParams = new URLSearchParams(window.location.search);
    carsViewingUserId = urlParams.get('user_id');
    
    // Mevcut kullanıcı bilgisini al
    fetch(`${API_BASE}/auth.php`, {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.user) {
            carsCurrentUserId = data.user.id;
            carsIsOwnProfile = !carsViewingUserId || carsViewingUserId == carsCurrentUserId;
            
            if (carsIsOwnProfile) {
                carsViewingUserId = carsCurrentUserId;
            }
            
            // Araba ekle butonunu göster/gizle
            updateAddCarButtonVisibility();
            
            loadCars();
        } else {
            carsIsOwnProfile = false;
            updateAddCarButtonVisibility();
            if (carsViewingUserId) {
                loadCars();
            }
        }
    })
    .catch(err => {
        console.error('Auth check error:', err);
        carsIsOwnProfile = false;
        updateAddCarButtonVisibility();
        if (carsViewingUserId) {
            loadCars();
        }
    });
});

// Araba ekle butonunun görünürlüğünü güncelle
function updateAddCarButtonVisibility() {
    const addCarBtn = document.getElementById('addCarBtn');
    const addCarBtnTop = document.getElementById('addCarBtnTop');
    const addFirstCarBtn = document.getElementById('addFirstCarBtn');
    
    if (addCarBtn) {
        if (carsIsOwnProfile) {
            addCarBtn.classList.remove('hidden');
        } else {
            addCarBtn.classList.add('hidden');
        }
    }
    
    if (addCarBtnTop) {
        if (carsIsOwnProfile) {
            addCarBtnTop.classList.remove('hidden');
            addCarBtnTop.classList.add('flex'); // Flex display için
        } else {
            addCarBtnTop.classList.add('hidden');
            addCarBtnTop.classList.remove('flex');
        }
    }
    
    if (addFirstCarBtn) {
        if (carsIsOwnProfile) {
            addFirstCarBtn.classList.remove('hidden');
        } else {
            addFirstCarBtn.classList.add('hidden');
        }
    }
}

// Profile.js'den çağrılacak - profil sahipliği durumunu güncelle
function updateCarOwnershipStatus(ownProfile) {
    carsIsOwnProfile = ownProfile;
    updateAddCarButtonVisibility();
}

// Arabaları yükle
async function loadCars() {
    const userId = carsViewingUserId || carsCurrentUserId;
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
        if (carsIsOwnProfile && addFirstCarBtn) {
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
    if (carsIsOwnProfile && addFirstCarBtn) {
        addFirstCarBtn.classList.add('hidden');
    } else if (addFirstCarBtn) {
        addFirstCarBtn.classList.add('hidden');
    }
    
    // Instagram Tarzı Grid
    container.innerHTML = cars.map(car => {
        const imagePath = car.image_url 
            ? (car.image_url.startsWith('http') ? car.image_url : '../' + car.image_url)
            : '';
        
        return `
        <div class="instagram-grid-item group cursor-pointer" onclick="openCarDetail(${car.id})">
            <!-- Araba Resmi -->
            <div class="relative w-full h-full">
                    ${imagePath ? `
                    <img src="${imagePath}" 
                         alt="${escapeHtml(car.brand)} ${escapeHtml(car.model)}" 
                         class="w-full h-full object-cover" />
                    ` : `
                <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-800">
                    <svg class="w-20 h-20 text-gray-600" fill="currentColor" viewBox="0 0 252.094 252.094">
                            <path d="M196.979,146.785c-1.091,0-2.214,0.157-3.338,0.467l-4.228,1.165l-6.229-15.173c-3.492-8.506-13.814-15.426-23.01-15.426H91.808c-9.195,0-19.518,6.921-23.009,15.427l-6.218,15.145l-4.127-1.137c-1.124-0.31-2.247-0.467-3.338-0.467c-5.485,0-9.467,3.935-9.467,9.356c0,5.352,3.906,9.858,9.2,11.211c-2.903,8.017-5.159,20.034-5.159,27.929v32.287c0,6.893,5.607,12.5,12.5,12.5h4.583c6.893,0,12.5-5.607,12.5-12.5v-6.04h93.435v6.04c0,6.893,5.607,12.5,12.5,12.5h4.585c6.893,0,12.5-5.607,12.5-12.5v-32.287c0-7.887-2.252-19.888-5.15-27.905c5.346-1.32,9.303-5.85,9.303-11.235C206.445,150.72,202.464,146.785,196.979,146.785z M70.352,159.384l10.161-24.754c2.089-5.088,8.298-9.251,13.798-9.251h63.363c5.5,0,11.709,4.163,13.798,9.251l10.161,24.754c2.089,5.088-0.702,9.251-6.202,9.251H76.554C71.054,168.635,68.263,164.472,70.352,159.384z M97.292,199.635c0,2.75-2.25,5-5,5H71.554c-2.75,0-5-2.25-5-5v-8.271c0-2.75,2.25-5,5-5h20.738c2.75,0,5,2.25,5,5V199.635z M185.203,199.635c0,2.75-2.25,5-5,5h-20.736c-2.75,0-5-2.25-5-5v-8.271c0-2.75,2.25-5,5-5h20.736c2.75,0,5,2.25,5,5V199.635z"/>
                            <path d="M246.545,71.538L131.625,4.175c-1.525-0.894-3.506-1.386-5.578-1.386c-2.072,0-4.053,0.492-5.578,1.386L5.549,71.538C2.386,73.392,0,77.556,0,81.223v160.582c0,4.135,3.364,7.5,7.5,7.5h12.912c4.136,0,7.5-3.365,7.5-7.5V105.917c0-1.378,1.121-2.5,2.5-2.5h191.268c1.379,0,2.5,1.122,2.5,2.5v135.888c0,4.135,3.364,7.5,7.5,7.5h12.913c4.136,0,7.5-3.365,7.5-7.5V81.223C252.094,77.556,249.708,73.392,246.545,71.538z"/>
                        </svg>
                    </div>
                    `}
                
                <!-- Öne Çıkan Badge -->
                    ${car.is_featured ? `
                <div class="absolute top-3 right-3 z-20">
                    <div class="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        ⭐ Öne Çıkan
                    </div>
                </div>
                ` : ''}
                
                <!-- Hover Overlay - Instagram Tarzı -->
                <div class="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center z-10 p-4">
                    <h3 class="text-white text-xl md:text-2xl font-bold text-center mb-2">
                        ${escapeHtml(car.brand)} ${escapeHtml(car.model)}
                    </h3>
                        ${car.year ? `
                    <p class="text-gray-300 text-sm mb-4">${car.year}</p>
                        ` : ''}
                    <div class="flex items-center gap-4 text-white">
                        ${car.horsepower ? `
                        <div class="flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            <span class="text-sm font-semibold">${car.horsepower} HP</span>
                        </div>
                        ` : ''}
                        ${car.engine ? `
                        <div class="flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                            </svg>
                            <span class="text-sm font-semibold">${escapeHtml(car.engine)}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${carsIsOwnProfile ? `
                    <div class="flex gap-2 mt-4" onclick="event.stopPropagation()">
                        <button onclick="editCar(${car.id}); event.stopPropagation();" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs font-semibold transition">
                            ✏️ Düzenle
                        </button>
                        <button onclick="deleteCar(${car.id}); event.stopPropagation();" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-xs font-semibold transition">
                            🗑️ Sil
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
            
            if (!modal) {
                console.error('carDetailModal element not found');
                return;
            }
            
            // Resim yolu
            const imagePath = car.image_url 
                ? (car.image_url.startsWith('http') ? car.image_url : '../' + car.image_url)
                : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\'%3E%3Crect width=\'400\' height=\'400\' fill=\'%23333\'/%3E%3C/svg%3E';
            
            // Aksiyon butonları
            const actionButtons = carsIsOwnProfile ? `
                <div class="flex gap-4 mt-6">
                    <button onclick="editCar(${car.id}); closeCarDetailModal();" class="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition">
                        ✏️ Düzenle
                    </button>
                    <button onclick="deleteCar(${car.id}); closeCarDetailModal();" class="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition">
                        🗑️ Sil
                    </button>
                </div>
            ` : '';
            
            // Modal içeriğini oluştur
            modal.innerHTML = `
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-red-600/30 shadow-2xl">
                        <!-- Header -->
                        <div class="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                            <div class="flex items-center gap-3">
                                <h2 class="text-2xl font-bold text-white">${escapeHtml(car.brand || '')} ${escapeHtml(car.model || '')}</h2>
                                ${car.is_featured == 1 ? '<span class="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">⭐ Öne Çıkan</span>' : ''}
                            </div>
                            <button onclick="closeCarDetailModal()" class="text-gray-400 hover:text-white transition">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Body -->
                        <div class="p-6">
                            <!-- Resim -->
                            <div class="mb-6">
                                <img src="${imagePath}" alt="${escapeHtml(car.brand || '')} ${escapeHtml(car.model || '')}" class="w-full h-96 object-cover rounded-xl border-2 border-gray-700">
                            </div>
                            
                            <!-- Detaylar -->
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                ${car.year ? `
                                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                    <p class="text-gray-400 text-xs mb-1">Yıl</p>
                                    <p class="text-white font-bold text-lg">${car.year}</p>
                                </div>
                                ` : ''}
                                ${car.color ? `
                                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                    <p class="text-gray-400 text-xs mb-1">Renk</p>
                                    <p class="text-white font-bold text-lg">${escapeHtml(car.color)}</p>
                                </div>
                                ` : ''}
                                ${car.engine ? `
                                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                    <p class="text-gray-400 text-xs mb-1">Motor</p>
                                    <p class="text-white font-bold text-lg">${escapeHtml(car.engine)}</p>
                                </div>
                                ` : ''}
                                ${car.horsepower ? `
                                <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                    <p class="text-gray-400 text-xs mb-1">Beygir Gücü</p>
                                    <p class="text-white font-bold text-lg">${car.horsepower} HP</p>
                                </div>
                                ` : ''}
                            </div>
                            
                            <!-- Açıklama -->
                            ${car.description ? `
                            <div class="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
                                <p class="text-gray-400 text-xs mb-2">Açıklama</p>
                                <p class="text-white whitespace-pre-line">${escapeHtml(car.description)}</p>
                            </div>
                            ` : ''}
                            
                            ${actionButtons}
                        </div>
                    </div>
                </div>
            `;
            
            // Modal'ı göster
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
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
    const carsCountMainEl = document.getElementById('carsCountMain');
    
    if (carsCountEl) {
        carsCountEl.textContent = count;
    }
    
    if (carsCountMainEl) {
        carsCountMainEl.textContent = count;
    }
}

// Araba ekleme modalını aç
function openAddCarModal() {
    const modal = document.getElementById('universalModal');
    if (!modal) {
        console.error('universalModal element not found');
        return;
    }
    
    // Modal içeriğini oluştur
    modal.innerHTML = `
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-red-600/30 shadow-2xl">
                <!-- Header -->
                <div class="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                    <h2 class="text-2xl font-bold text-white">Araç Ekle</h2>
                    <button onclick="closeCarModal()" class="text-gray-400 hover:text-white transition">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Body -->
                <div class="p-6">
                    <form id="carForm" onsubmit="event.preventDefault(); saveCar();" class="space-y-4">
                        <input type="hidden" id="carId" name="car_id" value="">
                        
                        <!-- Resim -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-300 mb-2">Araç Fotoğrafı</label>
                            <div class="flex flex-col items-center">
                                <img id="carImagePreview" class="hidden w-full h-64 object-cover rounded-lg mb-4 border-2 border-gray-700" />
                                <input type="file" id="carImage" name="image" accept="image/*" onchange="previewCarImage(this)" class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" />
                            </div>
                        </div>
                        
                        <!-- Marka ve Model -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2">Marka *</label>
                                <input type="text" id="carBrand" name="brand" required class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" placeholder="BMW, Mercedes, vb.">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2">Model *</label>
                                <input type="text" id="carModel" name="model" required class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" placeholder="M3, C63, vb.">
                            </div>
                        </div>
                        
                        <!-- Yıl ve Renk -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2">Yıl</label>
                                <input type="number" id="carYear" name="year" min="1900" max="2100" class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" placeholder="2020">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2">Renk</label>
                                <input type="text" id="carColor" name="color" class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" placeholder="Siyah, Beyaz, vb.">
                            </div>
                        </div>
                        
                        <!-- Motor ve Beygir Gücü -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2">Motor</label>
                                <input type="text" id="carEngine" name="engine" class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" placeholder="3.0L V6, 2.0L Turbo, vb.">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-300 mb-2">Beygir Gücü</label>
                                <input type="number" id="carHorsepower" name="horsepower" class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500" placeholder="450">
                            </div>
                        </div>
                        
                        <!-- Açıklama -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-300 mb-2">Açıklama</label>
                            <textarea id="carDescription" name="description" rows="4" class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500 resize-none" placeholder="Araç hakkında detaylar..."></textarea>
                        </div>
                        
                        <!-- Öne Çıkan -->
                        <div class="flex items-center gap-3">
                            <input type="checkbox" id="carFeatured" name="is_featured" value="1" class="w-5 h-5 text-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500">
                            <label for="carFeatured" class="text-sm font-semibold text-gray-300">Öne Çıkan Araç (Profil başında gösterilir)</label>
                        </div>
                        
                        <!-- Error Message -->
                        <div id="carError" class="hidden bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg"></div>
                        
                        <!-- Submit Button -->
                        <button type="submit" class="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition shadow-lg">
                            <span id="carSubmitText">Kaydet</span>
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

// Araba düzenleme modalını aç
async function editCar(carId) {
    try {
        const response = await fetch(`${API_BASE}/cars.php?car_id=${carId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.car) {
            const car = data.car;
            
            // Önce modal'ı aç
            openAddCarModal();
            
            // Sonra form alanlarını doldur
            setTimeout(() => {
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
                    const imagePath = car.image_url.startsWith('http') ? car.image_url : '../' + car.image_url;
                    preview.src = imagePath;
                    preview.classList.remove('hidden');
                } else {
                    document.getElementById('carImagePreview').classList.add('hidden');
                }
                
                if (submitText) submitText.textContent = 'Güncelle';
            }, 100);
        }
    } catch (error) {
        console.error('Araba bilgileri yüklenirken hata:', error);
        alert('Araba bilgileri yüklenirken hata oluştu');
    }
}

// Araba modalını kapat
function closeCarModal() {
    const modal = document.getElementById('universalModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.innerHTML = '';
        document.body.style.overflow = '';
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
            carsCurrentUserId = authData.user.id;
            carsViewingUserId = targetUserId ? parseInt(targetUserId) : carsCurrentUserId;
            carsIsOwnProfile = !targetUserId || carsViewingUserId == carsCurrentUserId;
            
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
window.updateCarOwnershipStatus = updateCarOwnershipStatus;

