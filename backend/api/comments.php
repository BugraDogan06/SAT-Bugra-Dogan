<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        // Gönderi yorumlarını getir
        $post_id = intval($_GET['post_id'] ?? 0);
        
        if (!$post_id) {
            jsonResponse(['success' => false, 'message' => 'Geçersiz gönderi ID'], 400);
        }
        
        $stmt = $db->prepare("
            SELECT c.*, u.username, u.profile_picture
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        ");
        $stmt->execute([$post_id]);
        $comments = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'comments' => $comments
        ]);
        break;
        
    case 'POST':
        // Yeni yorum ekle
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $post_id = intval($data['post_id'] ?? 0);
        $content = sanitize($data['content'] ?? '');
        
        if (!$post_id || empty($content)) {
            jsonResponse(['success' => false, 'message' => 'Gönderi ID ve içerik gereklidir'], 400);
        }
        
        $stmt = $db->prepare("
            INSERT INTO comments (user_id, post_id, content)
            VALUES (?, ?, ?)
        ");
        
        if ($stmt->execute([getCurrentUserId(), $post_id, $content])) {
            // Yorumu tekrar getir (kullanıcı bilgisiyle)
            $comment_id = $db->lastInsertId();
            $stmt = $db->prepare("
                SELECT c.*, u.username, u.profile_picture
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.id = ?
            ");
            $stmt->execute([$comment_id]);
            $comment = $stmt->fetch();
            
            // Gönderi sahibine bildirim oluştur
            try {
                $stmt = $db->prepare("SELECT user_id FROM posts WHERE id = ?");
                $stmt->execute([$post_id]);
                $post_owner = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($post_owner && isset($post_owner['user_id']) && $post_owner['user_id'] != getCurrentUserId()) {
                    // Bildirim oluştur (yorumlar için spam kontrolü yok, her yorum bildirimi gönderilir)
                    $stmt = $db->prepare("
                        INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id)
                        VALUES (?, 'comment', ?, ?, ?)
                    ");
                    $stmt->execute([$post_owner['user_id'], getCurrentUserId(), $post_id, $comment_id]);
                }
            } catch (PDOException $e) {
                // Bildirim oluşturma hatası kritik değil, devam et
                error_log("Bildirim oluşturma hatası (comment): " . $e->getMessage());
            }
            
            jsonResponse([
                'success' => true,
                'message' => 'Yorum eklendi',
                'comment' => $comment
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Yorum eklenemedi'], 500);
        }
        break;
        
    case 'DELETE':
        // Yorum sil
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        $comment_id = intval($_GET['id'] ?? 0);
        
        if (!$comment_id) {
            jsonResponse(['success' => false, 'message' => 'Geçersiz yorum ID'], 400);
        }
        
        // Yorum sahibi kontrolü
        $stmt = $db->prepare("SELECT user_id FROM comments WHERE id = ?");
        $stmt->execute([$comment_id]);
        $comment = $stmt->fetch();
        
        if (!$comment || $comment['user_id'] != getCurrentUserId()) {
            jsonResponse(['success' => false, 'message' => 'Bu yorumu silme yetkiniz yok'], 403);
        }
        
        $stmt = $db->prepare("DELETE FROM comments WHERE id = ?");
        if ($stmt->execute([$comment_id])) {
            jsonResponse(['success' => true, 'message' => 'Yorum silindi']);
        } else {
            jsonResponse(['success' => false, 'message' => 'Yorum silinemedi'], 500);
        }
        break;
        
    default:
        jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
}

