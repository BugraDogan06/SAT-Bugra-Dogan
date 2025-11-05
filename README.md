# Piyasa Garage

Otomobil tutkunlarını bir araya getiren sosyal platform.

## Teknolojiler

- **Frontend**: HTML, CSS, JavaScript, Tailwind CSS
- **Backend**: PHP
- **Veritabanı**: MySQL

## Özellikler

- 🚗 Araç paylaşımı ve profil oluşturma
- ❤️ Beğeni ve yorum sistemi
- 📅 Etkinlik yönetimi ve duyuruları
- 🔍 Arama ve keşfet özelliği
- 👥 Kullanıcı etkileşimi ve takip sistemi

## Proje Yapısı

```
piyasaaa/
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── events.html
│   ├── css/
│   └── js/
├── backend/
│   ├── config/
│   ├── api/
│   └── includes/
├── database/
│   └── schema.sql
└── README.md
```

## Kurulum

1. **Veritabanı Oluşturma:**
   ```sql
   -- MySQL'de database/schema.sql dosyasını import edin
   mysql -u root -p < database/schema.sql
   ```

2. **Yapılandırma:**
   - `backend/config/config.php` dosyasında veritabanı bilgilerini güncelle:
     ```php
     define('DB_HOST', 'localhost');
     define('DB_USER', 'root');
     define('DB_PASS', '');
     define('DB_NAME', 'piyasa_garage');
     ```

3. **PHP Sunucusu:**
   ```bash
   # Proje dizininde
   php -S localhost:8000
   ```

4. **Tarayıcı:**
   - `http://localhost:8000/frontend/index.html` adresini açın

## API Endpoints

- `POST /backend/api/auth.php` - Giriş/Kayıt
- `GET /backend/api/posts.php` - Gönderileri getir
- `POST /backend/api/posts.php` - Yeni gönderi oluştur
- `POST /backend/api/likes.php` - Beğeni ekle/çıkar
- `GET /backend/api/events.php` - Etkinlikleri getir
- `POST /backend/api/events.php` - Yeni etkinlik oluştur

## Özellikler

✅ Kullanıcı kayıt ve giriş sistemi  
✅ Gönderi paylaşımı  
✅ Beğeni ve yorum sistemi  
✅ Etkinlik yönetimi  
✅ Profil sayfası  
✅ Responsive tasarım

