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
            
            // Gönderi sahibine bildirim oluştur
            try {
                $stmt = $db->prepare("SELECT user_id FROM posts WHERE id = ?");
                $stmt->execute([$post_id]);
                $post_owner = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($post_owner && isset($post_owner['user_id']) && $post_owner['user_id'] != $user_id) {
                    // Aynı bildirimin son 1 saat içinde oluşturulup oluşturulmadığını kontrol et (spam önleme)
                    $stmt = $db->prepare("
                        SELECT id FROM notifications 
                        WHERE user_id = ? AND actor_id = ? AND type = 'like' AND post_id = ?
                        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                        LIMIT 1
                    ");
                    $stmt->execute([$post_owner['user_id'], $user_id, $post_id]);
                    
                    if (!$stmt->fetch()) {
                        // Bildirim oluştur
                        $stmt = $db->prepare("
                            INSERT INTO notifications (user_id, type, actor_id, post_id)
                            VALUES (?, 'like', ?, ?)
                        ");
                        $stmt->execute([$post_owner['user_id'], $user_id, $post_id]);
                    }
                }
            } catch (PDOException $e) {
                // Bildirim oluşturma hatası kritik değil, devam et
                error_log("Bildirim oluşturma hatası (like): " . $e->getMessage());
            }
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

