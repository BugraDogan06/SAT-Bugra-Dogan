<?php
/**
 * Topluluk İstatistikleri API
 * Ad blocker'ların stats kelimesini engellemesini önlemek için
 */

require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    $db = getDB();
    
    // Topluluk istatistikleri
    $totalPosts = $db->query("SELECT COUNT(*) as count FROM posts WHERE is_approved = 1")->fetch(PDO::FETCH_ASSOC)['count'];
    $totalUsers = $db->query("SELECT COUNT(*) as count FROM users")->fetch(PDO::FETCH_ASSOC)['count'];
    $totalLikes = $db->query("SELECT COUNT(*) as count FROM likes")->fetch(PDO::FETCH_ASSOC)['count'];
    $totalEvents = $db->query("SELECT COUNT(*) as count FROM events WHERE event_date >= NOW()")->fetch(PDO::FETCH_ASSOC)['count'];
    $todayPosts = $db->query("SELECT COUNT(*) as count FROM posts WHERE DATE(created_at) = CURDATE() AND is_approved = 1")->fetch(PDO::FETCH_ASSOC)['count'];
    
    // En aktif kullanıcılar (en çok gönderi paylaşan)
    $topUsers = $db->query("
        SELECT u.username, u.profile_picture, COUNT(p.id) as post_count
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id AND p.is_approved = 1
        GROUP BY u.id
        ORDER BY post_count DESC
        LIMIT 5
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'success' => true,
        'data' => [
            'total_posts' => intval($totalPosts),
            'total_users' => intval($totalUsers),
            'total_likes' => intval($totalLikes),
            'total_events' => intval($totalEvents),
            'today_posts' => intval($todayPosts),
            'top_users' => $topUsers
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Community stats error: ' . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'İstatistikler alınamadı: ' . $e->getMessage()
    ], 500);
}

