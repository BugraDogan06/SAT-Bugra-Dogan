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

// Session Ayarları
ini_set('session.cookie_lifetime', 86400 * 30); // 30 gün
ini_set('session.gc_maxlifetime', 86400 * 30); // 30 gün
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_path', '/');

// Session Başlat
if (session_status() === PHP_SESSION_NONE) {
    session_start();
    
    // Session ID'yi yenile (güvenlik için)
    if (!isset($_SESSION['created'])) {
        $_SESSION['created'] = time();
    } else if (time() - $_SESSION['created'] > 1800) {
        // 30 dakikada bir session ID'yi yenile
        session_regenerate_id(true);
        $_SESSION['created'] = time();
    }
}

