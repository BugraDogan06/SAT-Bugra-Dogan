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

    $query = sanitize($_GET['q'] ?? '');

    if (empty($query)) {
        jsonResponse(['success' => false, 'message' => 'Arama terimi gereklidir'], 400);
    }

    $searchTerm = "%{$query}%";
    $current_user_id = $_SESSION['user_id'] ?? null;

    // Gönderilerde ara
    $stmt = $db->prepare("
        SELECT p.*, u.username, u.profile_picture,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.title LIKE ? 
           OR p.description LIKE ? 
           OR p.car_brand LIKE ? 
           OR p.car_model LIKE ?
        ORDER BY p.created_at DESC
        LIMIT 20
    ");
    $stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Kullanıcılarda ara ve takip durumunu kontrol et (case-insensitive)
    if ($current_user_id) {
        $stmt = $db->prepare("
            SELECT u.id, u.username, u.full_name, u.profile_picture, u.bio,
                   CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_following
            FROM users u
            LEFT JOIN follows f ON f.follower_id = ? AND f.following_id = u.id
            WHERE (LOWER(u.username) LIKE LOWER(?) OR LOWER(u.full_name) LIKE LOWER(?))
              AND u.id != ?
            ORDER BY 
                CASE 
                    WHEN LOWER(u.username) = LOWER(?) THEN 1
                    WHEN LOWER(u.username) LIKE LOWER(?) THEN 2
                    ELSE 3
                END,
                u.username ASC
            LIMIT 20
        ");
        $exactMatch = $query; // Tam eşleşme için
        $stmt->execute([$current_user_id, $searchTerm, $searchTerm, $current_user_id, $exactMatch, $searchTerm]);
    } else {
        $stmt = $db->prepare("
            SELECT id, username, full_name, profile_picture, bio, 0 as is_following
            FROM users
            WHERE LOWER(username) LIKE LOWER(?) OR LOWER(full_name) LIKE LOWER(?)
            ORDER BY 
                CASE 
                    WHEN LOWER(username) = LOWER(?) THEN 1
                    WHEN LOWER(username) LIKE LOWER(?) THEN 2
                    ELSE 3
                END,
                username ASC
            LIMIT 20
        ");
        $exactMatch = $query; // Tam eşleşme için
        $stmt->execute([$searchTerm, $searchTerm, $exactMatch, $searchTerm]);
    }
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse([
        'success' => true,
        'posts' => $posts ?: [],
        'users' => $users ?: []
    ]);
    
} catch (PDOException $e) {
    error_log("Search API PDO Error: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Veritabanı hatası oluştu'
    ], 500);
} catch (Exception $e) {
    error_log("Search API Error: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Bir hata oluştu: ' . $e->getMessage()
    ], 500);
}

