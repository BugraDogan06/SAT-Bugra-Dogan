<?php
// Hata raporlamayı aç (geliştirme için)
error_reporting(E_ALL);
ini_set('display_errors', 0); // JSON response için display_errors kapalı
ini_set('log_errors', 1);

// Output buffering başlat (tüm sayfa için)
ob_start();

require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDB();
} catch (Exception $e) {
    ob_clean();
    error_log("Database connection error in posts.php: " . $e->getMessage());
    error_log("Trace: " . $e->getTraceAsString());
    jsonResponse(['success' => false, 'message' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()], 500);
}

switch ($method) {
    case 'GET':
        // Session kontrolü (beğeni durumu için)
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        $current_user_id = $_SESSION['user_id'] ?? null;
        $requested_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
        $stats_request = isset($_GET['stats']) && $_GET['stats'] == '1';
        
        // İstatistikler isteniyorsa
        if ($stats_request) {
            $totalPosts = $db->query("SELECT COUNT(*) as count FROM posts")->fetch(PDO::FETCH_ASSOC)['count'];
            $totalUsers = $db->query("SELECT COUNT(*) as count FROM users")->fetch(PDO::FETCH_ASSOC)['count'];
            $totalLikes = $db->query("SELECT COUNT(*) as count FROM likes")->fetch(PDO::FETCH_ASSOC)['count'];
            
            jsonResponse([
                'success' => true,
                'stats' => [
                    'total_posts' => intval($totalPosts),
                    'total_users' => intval($totalUsers),
                    'total_likes' => intval($totalLikes)
                ]
            ]);
            break;
        }
        
        // Eğer user_id parametresi varsa, sadece o kullanıcının gönderilerini getir (profil sayfası için)
        if ($requested_user_id) {
            if ($current_user_id) {
                $stmt = $db->prepare("
                    SELECT p.*, u.username, u.profile_picture,
                           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                           CASE WHEN EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) THEN 1 ELSE 0 END as is_liked
                    FROM posts p
                    JOIN users u ON p.user_id = u.id
                    WHERE p.user_id = ?
                    ORDER BY p.created_at DESC
                    LIMIT 50
                ");
                $stmt->execute([$current_user_id, $requested_user_id]);
            } else {
                $stmt = $db->prepare("
                    SELECT p.*, u.username, u.profile_picture,
                           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                           0 as is_liked
                    FROM posts p
                    JOIN users u ON p.user_id = u.id
                    WHERE p.user_id = ?
                    ORDER BY p.created_at DESC
                    LIMIT 50
                ");
                $stmt->execute([$requested_user_id]);
            }
        } else {
            // user_id yoksa tüm gönderileri getir (keşfet sayfası için)
            if ($current_user_id) {
                $stmt = $db->prepare("
                    SELECT p.*, u.username, u.profile_picture,
                           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                           CASE WHEN EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) THEN 1 ELSE 0 END as is_liked
                    FROM posts p
                    JOIN users u ON p.user_id = u.id
                    ORDER BY p.created_at DESC
                    LIMIT 50
                ");
                $stmt->execute([$current_user_id]);
            } else {
                // Giriş yapılmamışsa sadece gönderileri getir
                $stmt = $db->query("
                    SELECT p.*, u.username, u.profile_picture,
                           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                           0 as is_liked
                    FROM posts p
                    JOIN users u ON p.user_id = u.id
                    ORDER BY p.created_at DESC
                    LIMIT 50
                ");
            }
        }
        
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        jsonResponse([
            'success' => true,
            'posts' => $posts
        ]);
        break;
        
    case 'POST':
        // POST ile güncelleme kontrolü (action=update parametresi ile)
        if (isset($_POST['action']) && $_POST['action'] === 'update') {
            // Gönderi güncelle
            if (!isLoggedIn()) {
                jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
            }
            
            $user_id = getCurrentUserId();
            $post_id = intval($_POST['post_id'] ?? 0);
            
            if (!$post_id) {
                jsonResponse(['success' => false, 'message' => 'Geçersiz gönderi ID'], 400);
            }
            
            // Gönderi sahibi kontrolü
            $stmt = $db->prepare("SELECT user_id, image_url FROM posts WHERE id = ?");
            $stmt->execute([$post_id]);
            $post = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$post) {
                jsonResponse(['success' => false, 'message' => 'Gönderi bulunamadı'], 404);
            }
            
            if ($post['user_id'] != $user_id) {
                jsonResponse(['success' => false, 'message' => 'Bu gönderiyi düzenleme yetkiniz yok'], 403);
            }
            
            // Form verilerini al
            $title = sanitize($_POST['title'] ?? '');
            $description = sanitize($_POST['description'] ?? '');
            $car_model = sanitize($_POST['car_model'] ?? '');
            $car_brand = sanitize($_POST['car_brand'] ?? '');
            $image_url = $post['image_url']; // Varsayılan olarak mevcut görsel
            
            // Yeni fotoğraf yüklendi mi?
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../uploads/posts/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $file = $_FILES['image'];
                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                $maxSize = 10 * 1024 * 1024; // 10MB
                
                if (!in_array($file['type'], $allowedTypes)) {
                    jsonResponse(['success' => false, 'message' => 'Geçersiz dosya tipi. Sadece JPEG, PNG, GIF ve WebP desteklenir.'], 400);
                }
                
                if ($file['size'] > $maxSize) {
                    jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük. Maksimum 10MB.'], 400);
                }
                
                // Eski görseli sil
                if ($post['image_url'] && file_exists(__DIR__ . '/../../' . $post['image_url'])) {
                    unlink(__DIR__ . '/../../' . $post['image_url']);
                }
                
                $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $filename = 'post_' . $user_id . '_' . time() . '.' . $extension;
                $filepath = $uploadDir . $filename;
                
                if (move_uploaded_file($file['tmp_name'], $filepath)) {
                    $image_url = 'uploads/posts/' . $filename;
                } else {
                    jsonResponse(['success' => false, 'message' => 'Dosya yüklenirken hata oluştu'], 500);
                }
            }
            
            if (empty($title)) {
                jsonResponse(['success' => false, 'message' => 'Başlık gereklidir'], 400);
            }
            
            $stmt = $db->prepare("
                UPDATE posts 
                SET title = ?, description = ?, image_url = ?, car_model = ?, car_brand = ?
                WHERE id = ? AND user_id = ?
            ");
            
            if ($stmt->execute([$title, $description, $image_url, $car_model, $car_brand, $post_id, $user_id])) {
                jsonResponse([
                    'success' => true,
                    'message' => 'Gönderi güncellendi'
                ]);
            } else {
                jsonResponse(['success' => false, 'message' => 'Gönderi güncellenemedi'], 500);
            }
            break;
        }
        
        // Yeni gönderi oluştur
        ob_start(); // Output buffering başlat
        
        try {
            if (!isLoggedIn()) {
                ob_clean();
                jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
            }
            
            $user_id = getCurrentUserId();
            $title = sanitize($_POST['title'] ?? '');
            $description = sanitize($_POST['description'] ?? '');
            $car_model = sanitize($_POST['car_model'] ?? '');
            $car_brand = sanitize($_POST['car_brand'] ?? '');
            
            // Medya yükleme (fotoğraf veya video)
            $image_url = null;
            $video_url = null;
            $media_type = 'image';
            
            // Video yükleme kontrolü
            if (isset($_FILES['video']) && $_FILES['video']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../uploads/posts/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $file = $_FILES['video'];
            $allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
            $maxSize = 100 * 1024 * 1024; // 100MB
            
                if (!in_array($file['type'], $allowedTypes)) {
                    ob_clean();
                    jsonResponse(['success' => false, 'message' => 'Geçersiz dosya tipi. Sadece MP4, WebM, OGG ve MOV desteklenir.'], 400);
                }
                
                if ($file['size'] > $maxSize) {
                    ob_clean();
                    jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük. Maksimum 100MB.'], 400);
                }
            
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'post_video_' . $user_id . '_' . time() . '.' . $extension;
            $filepath = $uploadDir . $filename;
            
                if (move_uploaded_file($file['tmp_name'], $filepath)) {
                    $video_url = 'uploads/posts/' . $filename;
                    $media_type = 'video';
                } else {
                    ob_clean();
                    jsonResponse(['success' => false, 'message' => 'Video yüklenirken hata oluştu'], 500);
                }
            }
            // Fotoğraf yükleme kontrolü
            elseif (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../uploads/posts/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $file = $_FILES['image'];
                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                $maxSize = 10 * 1024 * 1024; // 10MB
                
                if (!in_array($file['type'], $allowedTypes)) {
                    ob_clean();
                    jsonResponse(['success' => false, 'message' => 'Geçersiz dosya tipi. Sadece JPEG, PNG, GIF ve WebP desteklenir.'], 400);
                }
                
                if ($file['size'] > $maxSize) {
                    ob_clean();
                    jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük. Maksimum 10MB.'], 400);
                }
                
                $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $filename = 'post_' . $user_id . '_' . time() . '.' . $extension;
                $filepath = $uploadDir . $filename;
                
                if (move_uploaded_file($file['tmp_name'], $filepath)) {
                    $image_url = 'uploads/posts/' . $filename;
                    $media_type = 'image';
                } else {
                    ob_clean();
                    jsonResponse(['success' => false, 'message' => 'Dosya yüklenirken hata oluştu'], 500);
                }
            }
            
            // Eğer JSON ile gönderilmişse (eski yöntem)
            if (!$image_url && !$video_url && empty($_POST)) {
                $data = json_decode(file_get_contents('php://input'), true);
                $title = sanitize($data['title'] ?? '');
                $description = sanitize($data['description'] ?? '');
                $image_url = sanitize($data['image_url'] ?? '');
                $video_url = sanitize($data['video_url'] ?? '');
                $media_type = $video_url ? 'video' : 'image';
                $car_model = sanitize($data['car_model'] ?? '');
                $car_brand = sanitize($data['car_brand'] ?? '');
            }
            
            if (empty($title) || (empty($image_url) && empty($video_url))) {
                ob_clean();
                jsonResponse(['success' => false, 'message' => 'Başlık ve medya (fotoğraf veya video) gereklidir'], 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO posts (user_id, title, description, image_url, video_url, media_type, car_model, car_brand)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            if ($stmt->execute([$user_id, $title, $description, $image_url, $video_url, $media_type, $car_model, $car_brand])) {
                ob_clean();
                jsonResponse([
                    'success' => true,
                    'message' => 'Gönderi oluşturuldu',
                    'post_id' => $db->lastInsertId()
                ]);
            } else {
                ob_clean();
                jsonResponse(['success' => false, 'message' => 'Gönderi oluşturulamadı'], 500);
            }
        } catch (PDOException $e) {
            ob_clean();
            error_log('Post creation PDO error: ' . $e->getMessage());
            error_log('SQL State: ' . $e->getCode());
            error_log('Trace: ' . $e->getTraceAsString());
            jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
        } catch (Exception $e) {
            ob_clean();
            error_log('Post creation error: ' . $e->getMessage());
            error_log('Trace: ' . $e->getTraceAsString());
            jsonResponse(['success' => false, 'message' => 'Gönderi oluşturulurken bir hata oluştu: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'DELETE':
        // Gönderi sil
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapmalısınız'], 401);
        }
        
        $user_id = getCurrentUserId();
        $post_id = intval($_GET['id'] ?? 0);
        
        if (!$post_id) {
            jsonResponse(['success' => false, 'message' => 'Geçersiz gönderi ID'], 400);
        }
        
        // Gönderi sahibi kontrolü
        $stmt = $db->prepare("SELECT user_id, image_url FROM posts WHERE id = ?");
        $stmt->execute([$post_id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$post) {
            jsonResponse(['success' => false, 'message' => 'Gönderi bulunamadı'], 404);
        }
        
        if ($post['user_id'] != $user_id) {
            jsonResponse(['success' => false, 'message' => 'Bu gönderiyi silme yetkiniz yok'], 403);
        }
        
        // Görseli sil
        if ($post['image_url'] && file_exists(__DIR__ . '/../../' . $post['image_url'])) {
            unlink(__DIR__ . '/../../' . $post['image_url']);
        }
        
        // Gönderiyi sil (CASCADE ile likes ve comments otomatik silinir)
        $stmt = $db->prepare("DELETE FROM posts WHERE id = ? AND user_id = ?");
        if ($stmt->execute([$post_id, $user_id])) {
            jsonResponse([
                'success' => true,
                'message' => 'Gönderi silindi'
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Gönderi silinemedi'], 500);
        }
        break;
        
    default:
        jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
}

