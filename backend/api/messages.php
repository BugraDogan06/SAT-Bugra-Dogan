<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

// Output buffering başlat
ob_start();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDB();
} catch (Exception $e) {
    ob_clean();
    error_log("Database connection error in messages.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()], 500);
}

switch ($method) {
    case 'GET':
        // Session kontrolü
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isLoggedIn()) {
            ob_clean();
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        $current_user_id = getCurrentUserId();
        $other_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
        $conversations = isset($_GET['conversations']) && $_GET['conversations'] == '1';
        
        try {
            if ($conversations) {
                // Tüm konuşmaları getir (son mesajla birlikte)
                $stmt = $db->prepare("
                    SELECT 
                        u.id as user_id,
                        u.username,
                        u.profile_picture,
                        u.full_name,
                        m.content as last_message,
                        m.created_at as last_message_time,
                        m.is_read,
                        m.sender_id,
                        COUNT(CASE WHEN m2.is_read = 0 AND m2.receiver_id = ? THEN 1 END) as unread_count
                    FROM (
                        SELECT 
                            CASE 
                                WHEN sender_id = ? THEN receiver_id 
                                ELSE sender_id 
                            END as other_user_id,
                            MAX(id) as max_id
                        FROM messages
                        WHERE sender_id = ? OR receiver_id = ?
                        GROUP BY other_user_id
                    ) as conv
                    INNER JOIN messages m ON m.id = conv.max_id
                    INNER JOIN users u ON u.id = conv.other_user_id
                    LEFT JOIN messages m2 ON (m2.sender_id = u.id AND m2.receiver_id = ? AND m2.is_read = 0)
                    GROUP BY u.id, u.username, u.profile_picture, u.full_name, m.content, m.created_at, m.is_read, m.sender_id
                    ORDER BY m.created_at DESC
                ");
                $stmt->execute([$current_user_id, $current_user_id, $current_user_id, $current_user_id, $current_user_id]);
                $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                ob_clean();
                jsonResponse([
                    'success' => true,
                    'conversations' => $conversations
                ]);
            } else if ($other_user_id) {
                // Belirli bir kullanıcıyla olan mesajları getir
                $stmt = $db->prepare("
                    SELECT 
                        m.*,
                        u1.username as sender_username,
                        u1.profile_picture as sender_profile_picture,
                        u2.username as receiver_username,
                        u2.profile_picture as receiver_profile_picture
                    FROM messages m
                    INNER JOIN users u1 ON m.sender_id = u1.id
                    INNER JOIN users u2 ON m.receiver_id = u2.id
                    WHERE (m.sender_id = ? AND m.receiver_id = ?) 
                       OR (m.sender_id = ? AND m.receiver_id = ?)
                    ORDER BY m.created_at ASC
                ");
                $stmt->execute([$current_user_id, $other_user_id, $other_user_id, $current_user_id]);
                $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Okunmamış mesajları okundu olarak işaretle
                $updateStmt = $db->prepare("
                    UPDATE messages 
                    SET is_read = 1 
                    WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
                ");
                $updateStmt->execute([$current_user_id, $other_user_id]);
                
                ob_clean();
                jsonResponse([
                    'success' => true,
                    'messages' => $messages
                ]);
            } else {
                ob_clean();
                jsonResponse(['success' => false, 'message' => 'user_id parametresi gerekli'], 400);
            }
        } catch (PDOException $e) {
            ob_clean();
            error_log('Messages GET error: ' . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Mesajlar yüklenemedi'], 500);
        }
        break;
        
    case 'POST':
        // Session kontrolü
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isLoggedIn()) {
            ob_clean();
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        $sender_id = getCurrentUserId();
        $receiver_id = isset($_POST['receiver_id']) ? intval($_POST['receiver_id']) : null;
        $content = sanitize($_POST['content'] ?? '');
        
        if (!$receiver_id) {
            ob_clean();
            jsonResponse(['success' => false, 'message' => 'Alıcı ID gerekli'], 400);
        }
        
        if (empty($content)) {
            ob_clean();
            jsonResponse(['success' => false, 'message' => 'Mesaj içeriği boş olamaz'], 400);
        }
        
        if ($sender_id == $receiver_id) {
            ob_clean();
            jsonResponse(['success' => false, 'message' => 'Kendinize mesaj gönderemezsiniz'], 400);
        }
        
        try {
            // Mesajı kaydet
            $stmt = $db->prepare("
                INSERT INTO messages (sender_id, receiver_id, content)
                VALUES (?, ?, ?)
            ");
            
            if ($stmt->execute([$sender_id, $receiver_id, $content])) {
                $message_id = $db->lastInsertId();
                
                // Bildirim oluştur
                try {
                    $notifStmt = $db->prepare("
                        INSERT INTO notifications (user_id, type, actor_id, message_id, is_read)
                        VALUES (?, 'message', ?, ?, 0)
                    ");
                    $notifStmt->execute([$receiver_id, $sender_id, $message_id]);
                } catch (PDOException $e) {
                    error_log('Notification creation error: ' . $e->getMessage());
                }
                
                // Mesaj bilgilerini getir
                $msgStmt = $db->prepare("
                    SELECT 
                        m.*,
                        u1.username as sender_username,
                        u1.profile_picture as sender_profile_picture
                    FROM messages m
                    INNER JOIN users u1 ON m.sender_id = u1.id
                    WHERE m.id = ?
                ");
                $msgStmt->execute([$message_id]);
                $message = $msgStmt->fetch(PDO::FETCH_ASSOC);
                
                ob_clean();
                jsonResponse([
                    'success' => true,
                    'message' => $message,
                    'message_text' => 'Mesaj gönderildi'
                ]);
            } else {
                ob_clean();
                jsonResponse(['success' => false, 'message' => 'Mesaj gönderilemedi'], 500);
            }
        } catch (PDOException $e) {
            ob_clean();
            error_log('Messages POST error: ' . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Mesaj gönderilemedi: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'PUT':
    case 'PATCH':
        // Mesajları okundu olarak işaretle
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isLoggedIn()) {
            ob_clean();
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        $current_user_id = getCurrentUserId();
        $other_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
        
        if (!$other_user_id) {
            ob_clean();
            jsonResponse(['success' => false, 'message' => 'user_id parametresi gerekli'], 400);
        }
        
        try {
            $stmt = $db->prepare("
                UPDATE messages 
                SET is_read = 1 
                WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
            ");
            $stmt->execute([$current_user_id, $other_user_id]);
            
            ob_clean();
            jsonResponse(['success' => true, 'message' => 'Mesajlar okundu olarak işaretlendi']);
        } catch (PDOException $e) {
            ob_clean();
            error_log('Messages PUT error: ' . $e->getMessage());
            jsonResponse(['success' => false, 'message' => 'Mesajlar güncellenemedi'], 500);
        }
        break;
        
    default:
        ob_clean();
        jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
        break;
}

