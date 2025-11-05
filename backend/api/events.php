<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        // Tüm etkinlikleri getir
        $stmt = $db->query("
            SELECT e.*, u.username,
                   (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participant_count
            FROM events e
            JOIN users u ON e.user_id = u.id
            WHERE e.event_date >= NOW()
            ORDER BY e.event_date ASC
            LIMIT 20
        ");
        $events = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'events' => $events
        ]);
        break;
        
    case 'POST':
        // Yeni etkinlik oluştur
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $title = sanitize($data['title'] ?? '');
        $description = sanitize($data['description'] ?? '');
        $event_date = $data['event_date'] ?? '';
        $location = sanitize($data['location'] ?? '');
        $image_url = sanitize($data['image_url'] ?? '');
        
        if (empty($title) || empty($event_date)) {
            jsonResponse(['success' => false, 'message' => 'Başlık ve tarih gereklidir'], 400);
        }
        
        $stmt = $db->prepare("
            INSERT INTO events (user_id, title, description, event_date, location, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        if ($stmt->execute([getCurrentUserId(), $title, $description, $event_date, $location, $image_url])) {
            jsonResponse([
                'success' => true,
                'message' => 'Etkinlik oluşturuldu',
                'event_id' => $db->lastInsertId()
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Etkinlik oluşturulamadı'], 500);
        }
        break;
        
    default:
        jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
}

