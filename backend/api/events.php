<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        // Tüm etkinlikleri getir (herkes görebilir)
        // Şehir filtresi varsa uygula
        $city = isset($_GET['city']) ? sanitize($_GET['city']) : '';
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
        $upcoming = isset($_GET['upcoming']) && $_GET['upcoming'] == '1';
        
        // Kullanıcı giriş yapmışsa katılım durumunu da getir
        $currentUserId = getCurrentUserId();
        
        if ($city) {
            // Şehir filtrelemesi ile
            if ($currentUserId) {
                $stmt = $db->prepare("
                    SELECT e.*, u.username,
                           (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participant_count,
                           (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND user_id = ?) as is_registered
                    FROM events e
                    JOIN users u ON e.user_id = u.id
                    WHERE e.event_date >= NOW()
                    AND e.location LIKE ?
                    ORDER BY e.event_date ASC
                    LIMIT ?
                ");
                $stmt->execute([$currentUserId, '%' . $city . '%', $limit]);
            } else {
                $stmt = $db->prepare("
                    SELECT e.*, u.username,
                           (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participant_count,
                           0 as is_registered
                    FROM events e
                    JOIN users u ON e.user_id = u.id
                    WHERE e.event_date >= NOW()
                    AND e.location LIKE ?
                    ORDER BY e.event_date ASC
                    LIMIT ?
                ");
                $stmt->execute(['%' . $city . '%', $limit]);
            }
        } else {
            // Tüm etkinlikler
            if ($currentUserId) {
                $stmt = $db->prepare("
                    SELECT e.*, u.username,
                           (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participant_count,
                           (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND user_id = ?) as is_registered
                    FROM events e
                    JOIN users u ON e.user_id = u.id
                    WHERE e.event_date >= NOW()
                    ORDER BY e.event_date ASC
                    LIMIT ?
                ");
                $stmt->execute([$currentUserId, $limit]);
            } else {
                $stmt = $db->prepare("
                    SELECT e.*, u.username,
                           (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participant_count,
                           0 as is_registered
                    FROM events e
                    JOIN users u ON e.user_id = u.id
                    WHERE e.event_date >= NOW()
                    ORDER BY e.event_date ASC
                    LIMIT ?
                ");
                $stmt->execute([$limit]);
            }
        }
        
        $events = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'events' => $events
        ]);
        break;
        
    case 'POST':
        // Etkinliğe katıl (action=join) veya Yeni etkinlik oluştur
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        // Etkinliğe katılma işlemi
        if (isset($_GET['action']) && $_GET['action'] === 'join') {
            $event_id = intval($_POST['event_id'] ?? 0);
            
            if (!$event_id) {
                jsonResponse(['success' => false, 'message' => 'Etkinlik ID gereklidir'], 400);
            }
            
            // Etkinlik var mı kontrol et
            $stmt = $db->prepare("SELECT id FROM events WHERE id = ?");
            $stmt->execute([$event_id]);
            if (!$stmt->fetch()) {
                jsonResponse(['success' => false, 'message' => 'Etkinlik bulunamadı'], 404);
            }
            
            // Kullanıcı zaten katılmış mı?
            $stmt = $db->prepare("SELECT id FROM event_participants WHERE event_id = ? AND user_id = ?");
            $stmt->execute([$event_id, getCurrentUserId()]);
            if ($stmt->fetch()) {
                jsonResponse(['success' => false, 'message' => 'Bu etkinliğe zaten katıldınız'], 400);
            }
            
            // Katılımcıyı ekle
            $stmt = $db->prepare("INSERT INTO event_participants (event_id, user_id, registered_at) VALUES (?, ?, NOW())");
            
            if ($stmt->execute([$event_id, getCurrentUserId()])) {
                // Yeni katılımcı sayısını al
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM event_participants WHERE event_id = ?");
                $stmt->execute([$event_id]);
                $result = $stmt->fetch();
                
                jsonResponse([
                    'success' => true,
                    'message' => 'Etkinliğe başarıyla katıldınız!',
                    'participant_count' => $result['count']
                ]);
            } else {
                jsonResponse(['success' => false, 'message' => 'Katılım sırasında hata oluştu'], 500);
            }
            break;
        }
        
        // Yeni etkinlik oluştur - SADECE ADMIN
        checkAdmin(); // Admin kontrolü
        
        // FormData ile dosya yükleme
        if (isset($_FILES['poster_image']) && $_FILES['poster_image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../frontend/images/events/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $file = $_FILES['poster_image'];
            $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            $maxSize = 5 * 1024 * 1024; // 5MB
            
            if (!in_array($file['type'], $allowedTypes)) {
                jsonResponse(['success' => false, 'message' => 'Geçersiz dosya tipi. Sadece JPG, PNG ve WebP kabul edilir.'], 400);
            }
            
            if ($file['size'] > $maxSize) {
                jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük. Maksimum 5MB.'], 400);
            }
            
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $fileName = 'event_' . time() . '_' . uniqid() . '.' . $extension;
            $filePath = $uploadDir . $fileName;
            
            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                $image_url = 'frontend/images/events/' . $fileName;
            } else {
                jsonResponse(['success' => false, 'message' => 'Dosya yüklenemedi'], 500);
            }
        } else {
            $image_url = sanitize($_POST['image_url'] ?? '');
        }
        
        $title = sanitize($_POST['title'] ?? '');
        $description = sanitize($_POST['description'] ?? '');
        $event_date = $_POST['event_date'] ?? '';
        $location = sanitize($_POST['location'] ?? '');
        
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
        
    case 'PUT':
    case 'PATCH':
        // Etkinlik güncelle - SADECE ADMIN
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        checkAdmin(); // Admin kontrolü
        
        $data = json_decode(file_get_contents('php://input'), true);
        $event_id = intval($data['id'] ?? 0);
        
        if (!$event_id) {
            jsonResponse(['success' => false, 'message' => 'Etkinlik ID gereklidir'], 400);
        }
        
        $title = sanitize($data['title'] ?? '');
        $description = sanitize($data['description'] ?? '');
        $event_date = $data['event_date'] ?? '';
        $location = sanitize($data['location'] ?? '');
        $image_url = sanitize($data['image_url'] ?? '');
        
        $stmt = $db->prepare("
            UPDATE events 
            SET title = ?, description = ?, event_date = ?, location = ?, image_url = ?
            WHERE id = ?
        ");
        
        if ($stmt->execute([$title, $description, $event_date, $location, $image_url, $event_id])) {
            jsonResponse([
                'success' => true,
                'message' => 'Etkinlik güncellendi'
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Etkinlik güncellenemedi'], 500);
        }
        break;
        
    case 'DELETE':
        // Etkinlik sil - SADECE ADMIN
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        checkAdmin(); // Admin kontrolü
        
        $event_id = intval($_GET['id'] ?? 0);
        
        if (!$event_id) {
            jsonResponse(['success' => false, 'message' => 'Etkinlik ID gereklidir'], 400);
        }
        
        // Önce görseli sil
        $stmt = $db->prepare("SELECT image_url FROM events WHERE id = ?");
        $stmt->execute([$event_id]);
        $event = $stmt->fetch();
        
        if ($event && $event['image_url']) {
            $imagePath = __DIR__ . '/../../frontend/' . $event['image_url'];
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }
        
        // Etkinliği sil
        $stmt = $db->prepare("DELETE FROM events WHERE id = ?");
        
        if ($stmt->execute([$event_id])) {
            jsonResponse([
                'success' => true,
                'message' => 'Etkinlik silindi'
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Etkinlik silinemedi'], 500);
        }
        break;
        
    default:
        jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
}
