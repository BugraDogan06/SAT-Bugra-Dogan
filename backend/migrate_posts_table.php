<?php
/**
 * Posts tablosuna video_url ve media_type sütunlarını ekler
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
            'message' => 'Posts tablosu bulunamadı. Önce tabloları oluşturun.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Sütunların var olup olmadığını kontrol et
    $columns = $db->query("SHOW COLUMNS FROM posts")->fetchAll(PDO::FETCH_COLUMN);
    $hasVideoUrl = in_array('video_url', $columns);
    $hasMediaType = in_array('media_type', $columns);
    
    $messages = [];
    
    // video_url sütununu ekle
    if (!$hasVideoUrl) {
        try {
            $db->exec("ALTER TABLE posts ADD COLUMN video_url VARCHAR(255) DEFAULT NULL AFTER image_url");
            $messages[] = "video_url sütunu eklendi";
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
                $messages[] = "video_url sütunu zaten mevcut";
            } else {
                throw $e;
            }
        }
    } else {
        $messages[] = "video_url sütunu zaten mevcut";
    }
    
    // media_type sütununu ekle
    if (!$hasMediaType) {
        try {
            $db->exec("ALTER TABLE posts ADD COLUMN media_type ENUM('image', 'video') DEFAULT 'image' AFTER video_url");
            $messages[] = "media_type sütunu eklendi";
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
                $messages[] = "media_type sütunu zaten mevcut";
            } else {
                throw $e;
            }
        }
    } else {
        $messages[] = "media_type sütunu zaten mevcut";
    }
    
    // Mevcut kayıtlar için media_type'ı güncelle
    try {
        $db->exec("UPDATE posts SET media_type = 'image' WHERE (image_url IS NOT NULL AND image_url != '') AND (media_type IS NULL OR media_type = '')");
        $db->exec("UPDATE posts SET media_type = 'video' WHERE video_url IS NOT NULL AND video_url != ''");
        $messages[] = "Mevcut kayıtlar güncellendi";
    } catch (PDOException $e) {
        $messages[] = "Kayıt güncelleme hatası: " . $e->getMessage();
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Migration başarılı',
        'details' => $messages
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Migration hatası: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
    error_log('Migration error: ' . $e->getMessage());
    error_log('Trace: ' . $e->getTraceAsString());
}

