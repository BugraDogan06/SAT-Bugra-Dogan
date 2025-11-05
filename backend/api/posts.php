<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        // Tüm gönderileri getir
        $stmt = $db->query("
            SELECT p.*, u.username, u.profile_picture,
                   (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 20
        ");
        $posts = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'posts' => $posts
        ]);
        break;
        
    case 'POST':
        // Yeni gönderi oluştur
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $title = sanitize($data['title'] ?? '');
        $description = sanitize($data['description'] ?? '');
        $image_url = sanitize($data['image_url'] ?? '');
        $car_model = sanitize($data['car_model'] ?? '');
        $car_brand = sanitize($data['car_brand'] ?? '');
        
        if (empty($title) || empty($image_url)) {
            jsonResponse(['success' => false, 'message' => 'Başlık ve görsel gereklidir'], 400);
        }
        
        $stmt = $db->prepare("
            INSERT INTO posts (user_id, title, description, image_url, car_model, car_brand)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        if ($stmt->execute([getCurrentUserId(), $title, $description, $image_url, $car_model, $car_brand])) {
            jsonResponse([
                'success' => true,
                'message' => 'Gönderi oluşturuldu',
                'post_id' => $db->lastInsertId()
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Gönderi oluşturulamadı'], 500);
        }
        break;
        
    default:
        jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
}

