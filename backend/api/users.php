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

    if ($method !== 'GET') {
        jsonResponse(['success' => false, 'message' => 'Sadece GET metodu kullanılabilir'], 405);
    }

    // Önerilen kullanıcılar isteniyorsa
    if (isset($_GET['suggested']) && $_GET['suggested'] == '1') {
        $current_user_id = $_SESSION['user_id'] ?? null;
        
        if (!$current_user_id) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapmanız gerekiyor'], 401);
        }
        
        // Takip etmediğiniz kullanıcıları getir (rastgele 10 kullanıcı)
        $stmt = $db->prepare("
            SELECT 
                u.id, 
                u.username, 
                u.full_name, 
                u.profile_picture,
                CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_following
            FROM users u
            LEFT JOIN follows f ON f.follower_id = ? AND f.following_id = u.id
            WHERE u.id != ?
            ORDER BY RAND()
            LIMIT 10
        ");
        $stmt->execute([$current_user_id, $current_user_id]);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        jsonResponse([
            'success' => true,
            'users' => $users
        ]);
        exit;
    }

    // Kullanıcı ID'sini al
    $user_id = intval($_GET['user_id'] ?? $_GET['id'] ?? 0);
    
    if (!$user_id) {
        jsonResponse(['success' => false, 'message' => 'Kullanıcı ID gereklidir'], 400);
    }

    // Mevcut kullanıcı ID'sini al (takip durumunu kontrol etmek için)
    $current_user_id = $_SESSION['user_id'] ?? null;
    
    // Kullanıcı bilgilerini ve takip istatistiklerini getir
    // Eğer giriş yapılmışsa, takip durumunu da kontrol et
    if ($current_user_id) {
        $stmt = $db->prepare("
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.full_name, 
                u.profile_picture, 
                u.bio,
                u.created_at,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
                (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
                (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
                CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_following
            FROM users u
            LEFT JOIN follows f ON f.follower_id = ? AND f.following_id = u.id
            WHERE u.id = ?
        ");
        $stmt->execute([$current_user_id, $user_id]);
    } else {
        $stmt = $db->prepare("
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.full_name, 
                u.profile_picture, 
                u.bio,
                u.created_at,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
                (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
                (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
                0 as is_following
            FROM users u
            WHERE u.id = ?
        ");
        $stmt->execute([$user_id]);
    }
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Kullanıcı bulunamadı'], 404);
    }
    
    // E-posta bilgisini gizle (güvenlik için)
    unset($user['email']);
    
    // is_following'i boolean'a çevir
    $user['is_following'] = (bool)($user['is_following'] ?? false);
    
    jsonResponse([
        'success' => true,
        'user' => $user
    ]);
    
} catch (PDOException $e) {
    error_log("Users API PDO Error: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Veritabanı hatası oluştu'
    ], 500);
} catch (Exception $e) {
    error_log("Users API Error: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Bir hata oluştu: ' . $e->getMessage()
    ], 500);
}

