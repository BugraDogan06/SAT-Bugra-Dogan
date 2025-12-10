# 🚗 Piyasa Garage

<div align="center">

![Piyasa Garage Logo](https://img.shields.io/badge/Piyasa-Garage-red?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4eiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==)

**Otomobil Tutkunlarının Sosyal Ağı**

[![PHP](https://img.shields.io/badge/PHP-8.0+-777BB4?style=flat-square&logo=php&logoColor=white)](https://www.php.net/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[Demo](#demo) • [Özellikler](#özellikler) • [Kurulum](#kurulum) • [Kullanım](#kullanım) • [Teknolojiler](#teknolojiler)

</div>

---

## 📖 Proje Hakkında

**Piyasa Garage**, otomobil tutkunlarının bir araya geldiği, araçlarını paylaştığı, etkinliklere katıldığı ve birbirleriyle etkileşime geçtiği modern bir sosyal ağ platformudur. Instagram tarzı kullanıcı arayüzü ve güçlü backend altyapısı ile tam özellikli bir sosyal medya deneyimi sunar.

### 🎯 Proje Vizyonu

Otomobil severlerin projelerini paylaşabileceği, yeni arkadaşlıklar kurabileceği, etkinliklere katılabileceği ve tutkularını diğer otomobil tutkunlarıyla paylaşabileceği bir platform oluşturmak.

---

## ✨ Özellikler

### 👤 Kullanıcı Yönetimi
- ✅ Güvenli kayıt ve giriş sistemi
- ✅ Profil düzenleme (fotoğraf, biyografi, ad soyad)
- ✅ Kullanıcı arama ve keşfet
- ✅ Takip/Takipten çık sistemi
- ✅ Kullanıcı istatistikleri (gönderi, takipçi, takip, araç sayısı)

### 🚗 Garaj Yönetimi
- ✅ Araç ekleme, düzenleme ve silme
- ✅ Araç detay sayfası
- ✅ Öne çıkan araç seçimi
- ✅ Araç galerisi 
- ✅ Araç özellikleri (marka, model, yıl, motor, beygir gücü, renk)

### 📱 Sosyal Özellikler
- ✅ Gönderi paylaşma (fotoğraf/video)
- ✅ Gönderi beğenme ve yorum yapma
- ✅ Gerçek zamanlı bildirimler
- ✅ Direkt mesajlaşma sistemi
- ✅ Konuşma listesi
- ✅ Okunmamış mesaj sayacı

### 🎉 Etkinlik Yönetimi
- ✅ Etkinlik oluşturma 
- ✅ Etkinlik listeleme ve detay sayfası
- ✅ Etkinliklere katılma/ayrılma
- ✅ Etkinlik katılımcı listesi
- ✅ Geçmiş etkinlikler

### 🔐 Admin Paneli
- ✅ Gönderi onaylama/reddetme sistemi
- ✅ Kullanıcı yönetimi
- ✅ Admin yetkisi verme
- ✅ İstatistik görüntüleme
- ✅ Son kayıtlar takibi

### 🎨 Kullanıcı Arayüzü
- ✅ Modern ve responsive tasarım
- ✅ Dark theme (kırmızı-siyah tema)
- ✅ Mobil uyumlu
- ✅ Touch events desteği
- ✅ Smooth animasyonlar

---

## 🛠️ Teknolojiler

### Backend
- **PHP 8.0+** - Server-side logic
- **MySQL 8.0+** - Veritabanı
- **PDO** - Veritabanı bağlantısı
- **RESTful API** - API mimarisi

### Frontend
- **HTML5** - Sayfa yapısı
- **CSS3** - Stil ve animasyonlar
- **JavaScript (ES6+)** - İnteraktif özellikler
- **TailwindCSS** - Utility-first CSS framework
- **Orbitron & Poppins** - Custom fontlar

### Özellikler
- **Session Management** - Güvenli oturum yönetimi
- **File Upload** - Çoklu dosya yükleme
- **Real-time Updates** - Gerçek zamanlı güncellemeler
- **Responsive Design** - Mobil uyumlu tasarım

---

## 📦 Kurulum

### Gereksinimler

- PHP 8.0 veya üzeri
- MySQL 8.0 veya üzeri
- Apache/Nginx web server
- XAMPP/WAMP/MAMP (önerilir)

### Adım Adım Kurulum

1. **Projeyi İndirin**
```bash
git clone https://github.com/yourusername/piyasa-garage.git
cd piyasa-garage
```

2. **Veritabanını Oluşturun**
```bash
# MySQL'e bağlanın
mysql -u root -p

# Veritabanını oluşturun
CREATE DATABASE piyasa_garage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. **Veritabanı Şemasını İçe Aktarın**
```bash
mysql -u root -p piyasa_garage < database/schema.sql
```

4. **Veritabanı Bağlantısını Yapılandırın**

`backend/config/config.php` dosyasını düzenleyin:
```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'piyasa_garage');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');
```

5. **Upload Klasörlerinin İzinlerini Ayarlayın**
```bash
chmod -R 755 uploads/
chmod -R 755 backend/uploads/
```

6. **Web Sunucusunu Başlatın**
```bash
# XAMPP kullanıyorsanız
# Projeyi htdocs klasörüne kopyalayın
# Apache'yi başlatın
```

7. **Tarayıcıda Açın**
```
http://localhost/piyasa-garage
```

---

## 🚀 Kullanım

### İlk Kayıt

1. Ana sayfada "Kayıt Ol" butonuna tıklayın
2. Kullanıcı bilgilerinizi girin
3. Giriş yapın

### Araç Ekleme

1. Profilinize gidin
2. "Araç Ekle" butonuna tıklayın
3. Araç bilgilerini doldurun
4. Fotoğraf yükleyin
5. Kaydedin

### Mesajlaşma

1. Başka bir kullanıcının profiline gidin
2. "Mesaj" butonuna tıklayın
3. Mesajınızı yazın ve gönderin

---

## 📂 Proje Yapısı

```
piyasa-garage/
├── 📁 backend/
│   ├── 📁 api/              # RESTful API endpoints
│   │   ├── auth.php         # Kimlik doğrulama
│   │   ├── cars.php         # Araç yönetimi
│   │   ├── posts.php        # Gönderi yönetimi
│   │   ├── comments.php     # Yorum yönetimi
│   │   ├── likes.php        # Beğeni yönetimi
│   │   ├── follow.php       # Takip sistemi
│   │   ├── messages.php     # Mesajlaşma
│   │   ├── events.php       # Etkinlikler
│   │   └── notifications.php # Bildirimler
│   ├── 📁 config/           # Yapılandırma
│   ├── 📁 includes/         # Yardımcı fonksiyonlar
│   ├── 📁 uploads/          # Yüklenen dosyalar
│   └── admin_panel.php      # Admin paneli
├── 📁 frontend/
│   ├── 📁 css/
│   │   ├── styles.css       # Ana stiller
│   │   └── responsive.css   # Responsive tasarım
│   ├── 📁 js/
│   │   ├── main.js          # Ana JavaScript
│   │   ├── auth.js          # Kimlik doğrulama
│   │   ├── profile.js       # Profil yönetimi
│   │   ├── cars.js          # Araç yönetimi
│   │   ├── events.js        # Etkinlik yönetimi
│   │   ├── messages.js      # Mesajlaşma
│   │   └── notifications.js # Bildirimler
│   ├── index.html           # Ana sayfa (keşfet)
│   ├── profile.html         # Profil sayfası
│   ├── events.html          # Etkinlikler sayfası
│   ├── login.html           # Giriş sayfası
│   └── register.html        # Kayıt sayfası
├── 📁 database/
│   └── schema.sql           # Veritabanı şeması
├── 📁 uploads/              # Kullanıcı yüklemeleri
│   ├── 📁 profiles/         # Profil fotoğrafları
│   ├── 📁 posts/            # Gönderi görselleri
│   └── 📁 covers/           # Kapak fotoğrafları
├── index.html               # Yönlendirme sayfası
└── README.md                # Bu dosya
```

---

## 🎯 API Endpoints

### Kimlik Doğrulama
- `POST /api/auth.php` - Kayıt/Giriş
- `GET /api/auth.php` - Oturum kontrolü
- `DELETE /api/auth.php` - Çıkış

### Kullanıcılar
- `GET /api/users.php?id={id}` - Kullanıcı profili
- `GET /api/search.php?q={query}` - Kullanıcı arama

### Araçlar
- `GET /api/cars.php?user_id={id}` - Kullanıcının araçları
- `POST /api/cars.php` - Araç ekle
- `PUT /api/cars.php` - Araç güncelle
- `DELETE /api/cars.php?car_id={id}` - Araç sil

### Gönderiler
- `GET /api/posts.php` - Tüm gönderiler
- `POST /api/posts.php` - Gönderi oluştur
- `DELETE /api/posts.php?id={id}` - Gönderi sil

### Mesajlar
- `GET /api/messages.php?user_id={id}` - Mesajları getir
- `POST /api/messages.php` - Mesaj gönder

### Etkinlikler
- `GET /api/events.php` - Tüm etkinlikler
- `POST /api/events.php` - Etkinlik oluştur (admin)
- `POST /api/events.php?action=join` - Etkinliğe katıl

---


### Ana Sayfa (Keşfet)
Instagram tarzı gönderi akışı, gerçek zamanlı beğeni ve yorum sistemi
<img width="1920" height="941" alt="Piyasa Garage - Google Chrome 10 12 2025 06_26_14" src="https://github.com/user-attachments/assets/d4a52456-26e9-4f75-b5ff-2e9c19e738d9" />


### Profil Sayfası
Kullanıcı bilgileri, gönderi ve araç galerisi, takip istatistikleri

### Garaj
Kullanıcının araçlarının grid görünümü, araç detay sayfası

### Etkinlikler
Yaklaşan ve geçmiş etkinlikler, katılım sistemi

### Mesajlaşma
Gerçek zamanlı direkt mesajlaşma, konuşma listesi

### Admin Paneli
Gönderi onaylama, kullanıcı yönetimi, istatistikler

---

## 🔒 Güvenlik

- ✅ SQL Injection koruması (PDO prepared statements)
- ✅ XSS koruması (HTML escape)
- ✅ CSRF koruması
- ✅ Güvenli dosya yükleme (tip ve boyut kontrolü)
- ✅ Şifre hashleme (password_hash)
- ✅ Session güvenliği
- ✅ Input validation

---

## 📱 Responsive Tasarım

- ✅ Desktop (1920px+)
- ✅ Laptop (1366px - 1920px)
- ✅ Tablet (768px - 1366px)
- ✅ Mobile (320px - 768px)

---

## 👨‍💻 Geliştirici

**BUĞRA DOĞAN**

- Website: [piyasagarage.com](https://piyasagarage.com)
- Email: info@piyasagarage.com
- Telefon: +90 (545) 835 37 67

---

## 📞 Destek

Sorularınız veya sorunlarınız için:

- 📧 Email: info@piyasagarage.com

---

<div align="center">

**⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!**

Made with ❤️ by BUĞRA DOĞAN

</div>


