<?php
// Veritabanı Yapılandırması

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'piyasa_garage');

// Site Ayarları
define('SITE_URL', 'http://localhost/piyasaaa');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');

// Hata Raporlama (Geliştirme için)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Timezone
date_default_timezone_set('Europe/Istanbul');

// Session Başlat
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

