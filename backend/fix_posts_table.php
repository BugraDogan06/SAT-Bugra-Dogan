<?php
/**
 * Posts tablosundaki image_url sütununu NULL yapılabilir hale getirir
 */

require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $db = getDB();
    
    // Önce posts tablosunun var olup olmadığını kontrol et
    $tables = $db->query("SHOW TABLES LIKE 'posts'")->fetchAll();
    if (count($tables) == 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Posts tablosu bulunamadı.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // image_url sütununun mevcut durumunu kontrol et
    $columns = $db->query("SHOW COLUMNS FROM posts WHERE Field = 'image_url'")->fetch(PDO::FETCH_ASSOC);
    
    $messages = [];
    
    if ($columns) {
        // image_url sütununu NULL yapılabilir hale getir
        if ($columns['Null'] === 'NO') {
            try {
                $db->exec("ALTER TABLE posts MODIFY COLUMN image_url VARCHAR(255) DEFAULT NULL");
                $messages[] = "image_url sütunu NULL yapılabilir hale getirildi";
            } catch (PDOException $e) {
                $messages[] = "image_url güncelleme hatası: " . $e->getMessage();
            }
        } else {
            $messages[] = "image_url sütunu zaten NULL yapılabilir";
        }
        
        // video_url sütununu da kontrol et ve NULL yapılabilir hale getir
        $videoColumns = $db->query("SHOW COLUMNS FROM posts WHERE Field = 'video_url'")->fetch(PDO::FETCH_ASSOC);
        if ($videoColumns && $videoColumns['Null'] === 'NO') {
            try {
                $db->exec("ALTER TABLE posts MODIFY COLUMN video_url VARCHAR(255) DEFAULT NULL");
                $messages[] = "video_url sütunu NULL yapılabilir hale getirildi";
            } catch (PDOException $e) {
                $messages[] = "video_url güncelleme hatası: " . $e->getMessage();
            }
        } else if ($videoColumns) {
            $messages[] = "video_url sütunu zaten NULL yapılabilir";
        }
    } else {
        $messages[] = "image_url sütunu bulunamadı";
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Tablo güncellemesi tamamlandı',
        'details' => $messages
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Hata: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
    error_log('Fix posts table error: ' . $e->getMessage());
    error_log('Trace: ' . $e->getTraceAsString());
}

