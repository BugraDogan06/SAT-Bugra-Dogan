<?php
// Output buffering başlat
ob_start();

// Hata raporlamayı kapat
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

// Buffer'ı temizle
ob_clean();

header('Content-Type: application/json; charset=utf-8');

// Session başlat
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $db = getDB();
    
    // Giriş kontrolü
    if (!isLoggedIn()) {
        jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
    }
    
    $user_id = getCurrentUserId();
    
    switch ($method) {
        case 'GET':
            // Bildirimleri getir
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
            $unread_only = isset($_GET['unread_only']) && $_GET['unread_only'] == '1';
            
            $query = "
                SELECT n.*, 
                       u.username as actor_username,
                       u.profile_picture as actor_profile_picture,
                       p.title as post_title,
                       p.image_url as post_image
                FROM notifications n
                JOIN users u ON n.actor_id = u.id
                LEFT JOIN posts p ON n.post_id = p.id
                WHERE n.user_id = ?
            ";
            
            if ($unread_only) {
                $query .= " AND n.is_read = 0";
            }
            
            $query .= " ORDER BY n.created_at DESC LIMIT ?";
            
            $stmt = $db->prepare($query);
            $stmt->execute([$user_id, $limit]);
            $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Okunmamış bildirim sayısını al
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
            $stmt->execute([$user_id]);
            $unread_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            jsonResponse([
                'success' => true,
                'notifications' => $notifications,
                'unread_count' => intval($unread_count)
            ]);
            break;
            
        case 'POST':
            // Yeni bildirim oluştur
            $data = json_decode(file_get_contents('php://input'), true);
            
            $target_user_id = intval($data['user_id'] ?? 0);
            $type = $data['type'] ?? '';
            $post_id = isset($data['post_id']) ? intval($data['post_id']) : null;
            $comment_id = isset($data['comment_id']) ? intval($data['comment_id']) : null;
            
            if (!$target_user_id || !in_array($type, ['like', 'comment', 'follow', 'post_mention'])) {
                jsonResponse(['success' => false, 'message' => 'Geçersiz parametreler'], 400);
            }
            
            // Kendi bildirimini oluşturma
            if ($target_user_id == $user_id) {
                jsonResponse(['success' => false, 'message' => 'Kendi bildiriminizi oluşturamazsınız'], 400);
            }
            
            // Aynı bildirimin son 1 saat içinde oluşturulup oluşturulmadığını kontrol et (spam önleme)
            $stmt = $db->prepare("
                SELECT id FROM notifications 
                WHERE user_id = ? AND actor_id = ? AND type = ? 
                AND post_id " . ($post_id ? "= ?" : "IS NULL") . "
                AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                LIMIT 1
            ");
            
            if ($post_id) {
                $stmt->execute([$target_user_id, $user_id, $type, $post_id]);
            } else {
                $stmt->execute([$target_user_id, $user_id, $type]);
            }
            
            if ($stmt->fetch()) {
                jsonResponse(['success' => false, 'message' => 'Bildirim zaten oluşturulmuş'], 400);
            }
            
            // Bildirim oluştur
            $stmt = $db->prepare("
                INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            if ($stmt->execute([$target_user_id, $type, $user_id, $post_id, $comment_id])) {
                jsonResponse([
                    'success' => true,
                    'message' => 'Bildirim oluşturuldu',
                    'notification_id' => $db->lastInsertId()
                ]);
            } else {
                jsonResponse(['success' => false, 'message' => 'Bildirim oluşturulamadı'], 500);
            }
            break;
            
        case 'PUT':
        case 'PATCH':
            // Bildirimleri okundu olarak işaretle
            $data = json_decode(file_get_contents('php://input'), true);
            $notification_id = isset($data['notification_id']) ? intval($data['notification_id']) : null;
            $mark_all_read = isset($data['mark_all_read']) && $data['mark_all_read'] == true;
            
            if ($mark_all_read) {
                // Tüm bildirimleri okundu olarak işaretle
                $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
                $stmt->execute([$user_id]);
                
                jsonResponse([
                    'success' => true,
                    'message' => 'Tüm bildirimler okundu olarak işaretlendi'
                ]);
            } elseif ($notification_id) {
                // Tek bir bildirimi okundu olarak işaretle
                $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
                $stmt->execute([$notification_id, $user_id]);
                
                jsonResponse([
                    'success' => true,
                    'message' => 'Bildirim okundu olarak işaretlendi'
                ]);
            } else {
                jsonResponse(['success' => false, 'message' => 'Geçersiz parametreler'], 400);
            }
            break;
            
        case 'DELETE':
            // Bildirim sil
            $notification_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
            
            if (!$notification_id) {
                jsonResponse(['success' => false, 'message' => 'Bildirim ID gereklidir'], 400);
            }
            
            $stmt = $db->prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?");
            $stmt->execute([$notification_id, $user_id]);
            
            jsonResponse([
                'success' => true,
                'message' => 'Bildirim silindi'
            ]);
            break;
            
        default:
            jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
    }
    
} catch (PDOException $e) {
    error_log("Notifications API PDO Error: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Veritabanı hatası oluştu'
    ], 500);
} catch (Exception $e) {
    error_log("Notifications API Error: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Bir hata oluştu: ' . $e->getMessage()
    ], 500);
}

