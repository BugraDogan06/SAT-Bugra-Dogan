<?php
// Output buffering başlat (hata mesajlarını yakalamak için)
ob_start();

// Hata raporlamayı kapat (production için)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

// Buffer'ı temizle (eğer bir hata mesajı varsa)
ob_clean();

header('Content-Type: application/json; charset=utf-8');

// Session başlat (eğer başlatılmamışsa)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $db = getDB();

    // Session kontrolü
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['success' => false, 'message' => 'Giriş yapmanız gerekiyor'], 401);
    }

    $user_id = $_SESSION['user_id'];

if ($method === 'POST') {
    // Takip et
    $following_id = intval($_POST['following_id'] ?? 0);
    
    if (!$following_id) {
        jsonResponse(['success' => false, 'message' => 'Kullanıcı ID gereklidir'], 400);
    }
    
    if ($user_id === $following_id) {
        jsonResponse(['success' => false, 'message' => 'Kendinizi takip edemezsiniz'], 400);
    }
    
    try {
        // Kullanıcı var mı kontrol et
        $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->execute([$following_id]);
        if (!$stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Kullanıcı bulunamadı'], 404);
        }
        
        // Zaten takip ediliyor mu kontrol et
        $stmt = $db->prepare("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?");
        $stmt->execute([$user_id, $following_id]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Bu kullanıcıyı zaten takip ediyorsunuz'], 400);
        }
        
        // Takip et
        $stmt = $db->prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)");
        $stmt->execute([$user_id, $following_id]);
        
        // Takip edilen kullanıcıya bildirim oluştur
        try {
            // Aynı bildirimin son 1 saat içinde oluşturulup oluşturulmadığını kontrol et
            $stmt = $db->prepare("
                SELECT id FROM notifications 
                WHERE user_id = ? AND actor_id = ? AND type = 'follow'
                AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                LIMIT 1
            ");
            $stmt->execute([$following_id, $user_id]);
            
            if (!$stmt->fetch()) {
                $stmt = $db->prepare("
                    INSERT INTO notifications (user_id, type, actor_id)
                    VALUES (?, 'follow', ?)
                ");
                $stmt->execute([$following_id, $user_id]);
            }
        } catch (PDOException $e) {
            // Bildirim oluşturma hatası kritik değil, devam et
            error_log("Bildirim oluşturma hatası (follow): " . $e->getMessage());
        }
        
        jsonResponse([
            'success' => true,
            'message' => 'Kullanıcı takip edildi',
            'is_following' => true
        ]);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
    }
    
} else if ($method === 'DELETE') {
    // Takipten çık
    $following_id = intval($_GET['following_id'] ?? 0);
    
    if (!$following_id) {
        jsonResponse(['success' => false, 'message' => 'Kullanıcı ID gereklidir'], 400);
    }
    
    try {
        $stmt = $db->prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?");
        $stmt->execute([$user_id, $following_id]);
        
        if ($stmt->rowCount() > 0) {
            jsonResponse([
                'success' => true,
                'message' => 'Takipten çıkıldı',
                'is_following' => false
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Bu kullanıcıyı takip etmiyorsunuz'], 400);
        }
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
    }
    
} else if ($method === 'GET') {
    // Takip durumunu kontrol et
    $following_id = intval($_GET['following_id'] ?? 0);
    
    if (!$following_id) {
        jsonResponse(['success' => false, 'message' => 'Kullanıcı ID gereklidir'], 400);
    }
    
    try {
        $stmt = $db->prepare("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?");
        $stmt->execute([$user_id, $following_id]);
        $is_following = $stmt->fetch() !== false;
        
        jsonResponse([
            'success' => true,
            'is_following' => $is_following
        ]);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
    }
    
} else {
    jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
}
    
} catch (PDOException $e) {
    error_log("Follow API PDO Error: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Veritabanı hatası oluştu'
    ], 500);
} catch (Exception $e) {
    error_log("Follow API Error: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Bir hata oluştu: ' . $e->getMessage()
    ], 500);
}

