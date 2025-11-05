<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

if (!isLoggedIn()) {
    jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();
$user_id = getCurrentUserId();

switch ($method) {
    case 'POST':
        // Beğeni ekle/çıkar
        $data = json_decode(file_get_contents('php://input'), true);
        $post_id = intval($data['post_id'] ?? 0);
        
        if (!$post_id) {
            jsonResponse(['success' => false, 'message' => 'Geçersiz gönderi ID'], 400);
        }
        
        // Beğeni var mı kontrol et
        $stmt = $db->prepare("SELECT id FROM likes WHERE user_id = ? AND post_id = ?");
        $stmt->execute([$user_id, $post_id]);
        $like = $stmt->fetch();
        
        if ($like) {
            // Beğeniyi kaldır
            $stmt = $db->prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?");
            $stmt->execute([$user_id, $post_id]);
            $action = 'removed';
        } else {
            // Beğeni ekle
            $stmt = $db->prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)");
            $stmt->execute([$user_id, $post_id]);
            $action = 'added';
        }
        
        // Beğeni sayısını al
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM likes WHERE post_id = ?");
        $stmt->execute([$post_id]);
        $count = $stmt->fetch()['count'];
        
        jsonResponse([
            'success' => true,
            'action' => $action,
            'like_count' => intval($count)
        ]);
        break;
        
    default:
        jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
}

