<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDB();
} catch (Exception $e) {
    jsonResponse(['success' => false, 'message' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()], 500);
}

switch ($method) {
    case 'GET':
        $user_id = $_GET['user_id'] ?? null;
        $car_id = $_GET['car_id'] ?? null;
        
        if ($car_id) {
            // Tek bir araba getir
            $stmt = $db->prepare("
                SELECT c.*, u.username, u.profile_picture
                FROM cars c
                JOIN users u ON c.user_id = u.id
                WHERE c.id = ?
            ");
            $stmt->execute([$car_id]);
            $car = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$car) {
                jsonResponse(['success' => false, 'message' => 'Araba bulunamadı'], 404);
            }
            
            jsonResponse(['success' => true, 'car' => $car]);
        } elseif ($user_id) {
            // Kullanıcının arabalarını getir
            $stmt = $db->prepare("
                SELECT * FROM cars 
                WHERE user_id = ? 
                ORDER BY is_featured DESC, created_at DESC
            ");
            $stmt->execute([$user_id]);
            $cars = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            jsonResponse(['success' => true, 'cars' => $cars]);
        } else {
            // Tüm arabaları getir (featured önce)
            $stmt = $db->query("
                SELECT c.*, u.username, u.profile_picture
                FROM cars c
                JOIN users u ON c.user_id = u.id
                ORDER BY c.is_featured DESC, c.created_at DESC
            ");
            $cars = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            jsonResponse(['success' => true, 'cars' => $cars]);
        }
        break;
        
    case 'POST':
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapılmamış'], 401);
        }
        
        $action = $_POST['action'] ?? 'create';
        $user_id = getCurrentUserId();
        
        // Düzenleme işlemi
        if ($action === 'update') {
            $car_id = $_POST['car_id'] ?? null;
            
            if (!$car_id) {
                jsonResponse(['success' => false, 'message' => 'Araba ID gereklidir'], 400);
            }
            
            // Arabanın sahibi kontrolü
            $stmt = $db->prepare("SELECT user_id FROM cars WHERE id = ?");
            $stmt->execute([$car_id]);
            $car = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$car) {
                jsonResponse(['success' => false, 'message' => 'Araba bulunamadı'], 404);
            }
            
            if ($car['user_id'] != $user_id) {
                jsonResponse(['success' => false, 'message' => 'Bu işlem için yetkiniz yok'], 403);
            }
            
            $brand = sanitize($_POST['brand'] ?? '');
            $model = sanitize($_POST['model'] ?? '');
            $year = !empty($_POST['year']) ? (int)$_POST['year'] : null;
            $color = sanitize($_POST['color'] ?? '');
            $engine = sanitize($_POST['engine'] ?? '');
            $horsepower = !empty($_POST['horsepower']) ? (int)$_POST['horsepower'] : null;
            $description = sanitize($_POST['description'] ?? '');
            $is_featured = isset($_POST['is_featured']) ? (int)$_POST['is_featured'] : 0;
            
            if (empty($brand) || empty($model)) {
                jsonResponse(['success' => false, 'message' => 'Marka ve model gereklidir'], 400);
            }
            
            // Mevcut resmi al
            $stmt = $db->prepare("SELECT image_url FROM cars WHERE id = ?");
            $stmt->execute([$car_id]);
            $currentCar = $stmt->fetch(PDO::FETCH_ASSOC);
            $image_url = $currentCar['image_url'];
            
            // Yeni resim yükleme (varsa)
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../uploads/cars/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $file = $_FILES['image'];
                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                $maxSize = 5 * 1024 * 1024; // 5MB
                
                if (!in_array($file['type'], $allowedTypes)) {
                    jsonResponse(['success' => false, 'message' => 'Geçersiz dosya tipi'], 400);
                }
                
                if ($file['size'] > $maxSize) {
                    jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük (Maks. 5MB)'], 400);
                }
                
                // Eski resmi sil
                if ($image_url) {
                    $oldPath = __DIR__ . '/../' . str_replace('../backend/', '', $image_url);
                    if (file_exists($oldPath)) {
                        @unlink($oldPath);
                    }
                }
                
                $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $filename = 'car_' . time() . '_' . uniqid() . '.' . $extension;
                $filepath = $uploadDir . $filename;
                
                if (move_uploaded_file($file['tmp_name'], $filepath)) {
                    $image_url = '../backend/uploads/cars/' . $filename;
                } else {
                    jsonResponse(['success' => false, 'message' => 'Dosya yükleme hatası'], 500);
                }
            }
            
            try {
                $stmt = $db->prepare("
                    UPDATE cars 
                    SET brand = ?, model = ?, year = ?, color = ?, engine = ?, horsepower = ?, 
                        description = ?, image_url = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ");
                $stmt->execute([
                    $brand, $model, $year, $color, $engine, $horsepower, $description, $image_url, $is_featured, $car_id
                ]);
                
                jsonResponse(['success' => true, 'message' => 'Araba başarıyla güncellendi']);
            } catch (PDOException $e) {
                jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
            }
            break;
        }
        
        // Yeni araba ekleme
        // FormData ile dosya yükleme
        $brand = sanitize($_POST['brand'] ?? '');
        $model = sanitize($_POST['model'] ?? '');
        $year = !empty($_POST['year']) ? (int)$_POST['year'] : null;
        $color = sanitize($_POST['color'] ?? '');
        $engine = sanitize($_POST['engine'] ?? '');
        $horsepower = !empty($_POST['horsepower']) ? (int)$_POST['horsepower'] : null;
        $description = sanitize($_POST['description'] ?? '');
        $is_featured = isset($_POST['is_featured']) ? (int)$_POST['is_featured'] : 0;
        
        if (empty($brand) || empty($model)) {
            jsonResponse(['success' => false, 'message' => 'Marka ve model gereklidir'], 400);
        }
        
        $image_url = null;
        
        // Resim yükleme
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/cars/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $file = $_FILES['image'];
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $maxSize = 5 * 1024 * 1024; // 5MB
            
            if (!in_array($file['type'], $allowedTypes)) {
                jsonResponse(['success' => false, 'message' => 'Geçersiz dosya tipi'], 400);
            }
            
            if ($file['size'] > $maxSize) {
                jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük (Maks. 5MB)'], 400);
            }
            
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'car_' . time() . '_' . uniqid() . '.' . $extension;
            $filepath = $uploadDir . $filename;
            
            if (move_uploaded_file($file['tmp_name'], $filepath)) {
                $image_url = '../backend/uploads/cars/' . $filename;
            } else {
                jsonResponse(['success' => false, 'message' => 'Dosya yükleme hatası'], 500);
            }
        }
        
        try {
            $stmt = $db->prepare("
                INSERT INTO cars (user_id, brand, model, year, color, engine, horsepower, description, image_url, is_featured)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $user_id, $brand, $model, $year, $color, $engine, $horsepower, $description, $image_url, $is_featured
            ]);
            
            $car_id = $db->lastInsertId();
            
            jsonResponse([
                'success' => true,
                'message' => 'Araba başarıyla eklendi',
                'car_id' => $car_id
            ]);
        } catch (PDOException $e) {
            jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'PUT':
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapılmamış'], 401);
        }
        
        // FormData ile gönderilmişse $_POST kullan, değilse php://input parse et
        if (!empty($_POST)) {
            $data = $_POST;
        } else {
            parse_str(file_get_contents('php://input'), $data);
        }
        $car_id = $data['car_id'] ?? null;
        
        if (!$car_id) {
            jsonResponse(['success' => false, 'message' => 'Araba ID gereklidir'], 400);
        }
        
        // Arabanın sahibi kontrolü
        $stmt = $db->prepare("SELECT user_id FROM cars WHERE id = ?");
        $stmt->execute([$car_id]);
        $car = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$car) {
            jsonResponse(['success' => false, 'message' => 'Araba bulunamadı'], 404);
        }
        
        if ($car['user_id'] != getCurrentUserId()) {
            jsonResponse(['success' => false, 'message' => 'Bu işlem için yetkiniz yok'], 403);
        }
        
        $brand = sanitize($data['brand'] ?? '');
        $model = sanitize($data['model'] ?? '');
        $year = !empty($data['year']) ? (int)$data['year'] : null;
        $color = sanitize($data['color'] ?? '');
        $engine = sanitize($data['engine'] ?? '');
        $horsepower = !empty($data['horsepower']) ? (int)$data['horsepower'] : null;
        $description = sanitize($data['description'] ?? '');
        $is_featured = isset($data['is_featured']) ? (int)$data['is_featured'] : 0;
        
        if (empty($brand) || empty($model)) {
            jsonResponse(['success' => false, 'message' => 'Marka ve model gereklidir'], 400);
        }
        
        // Mevcut resmi al
        $stmt = $db->prepare("SELECT image_url FROM cars WHERE id = ?");
        $stmt->execute([$car_id]);
        $currentCar = $stmt->fetch(PDO::FETCH_ASSOC);
        $image_url = $currentCar['image_url'];
        
        // Yeni resim yükleme (varsa)
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/cars/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $file = $_FILES['image'];
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $maxSize = 5 * 1024 * 1024; // 5MB
            
            if (!in_array($file['type'], $allowedTypes)) {
                jsonResponse(['success' => false, 'message' => 'Geçersiz dosya tipi'], 400);
            }
            
            if ($file['size'] > $maxSize) {
                jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük (Maks. 5MB)'], 400);
            }
            
            // Eski resmi sil
            if ($image_url) {
                $oldPath = __DIR__ . '/../' . str_replace('../backend/', '', $image_url);
                if (file_exists($oldPath)) {
                    @unlink($oldPath);
                }
            }
            
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'car_' . time() . '_' . uniqid() . '.' . $extension;
            $filepath = $uploadDir . $filename;
            
            if (move_uploaded_file($file['tmp_name'], $filepath)) {
                $image_url = '../backend/uploads/cars/' . $filename;
            } else {
                jsonResponse(['success' => false, 'message' => 'Dosya yükleme hatası'], 500);
            }
        }
        
        try {
            $stmt = $db->prepare("
                UPDATE cars 
                SET brand = ?, model = ?, year = ?, color = ?, engine = ?, horsepower = ?, 
                    description = ?, image_url = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->execute([
                $brand, $model, $year, $color, $engine, $horsepower, $description, $image_url, $is_featured, $car_id
            ]);
            
            jsonResponse(['success' => true, 'message' => 'Araba başarıyla güncellendi']);
        } catch (PDOException $e) {
            jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'DELETE':
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapılmamış'], 401);
        }
        
        $car_id = $_GET['car_id'] ?? null;
        
        if (!$car_id) {
            jsonResponse(['success' => false, 'message' => 'Araba ID gereklidir'], 400);
        }
        
        // Arabanın sahibi kontrolü
        $stmt = $db->prepare("SELECT user_id, image_url FROM cars WHERE id = ?");
        $stmt->execute([$car_id]);
        $car = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$car) {
            jsonResponse(['success' => false, 'message' => 'Araba bulunamadı'], 404);
        }
        
        if ($car['user_id'] != getCurrentUserId()) {
            jsonResponse(['success' => false, 'message' => 'Bu işlem için yetkiniz yok'], 403);
        }
        
        // Resmi sil
        if ($car['image_url']) {
            $imagePath = __DIR__ . '/../' . str_replace('../backend/', '', $car['image_url']);
            if (file_exists($imagePath)) {
                @unlink($imagePath);
            }
        }
        
        try {
            $stmt = $db->prepare("DELETE FROM cars WHERE id = ?");
            $stmt->execute([$car_id]);
            
            jsonResponse(['success' => true, 'message' => 'Araba başarıyla silindi']);
        } catch (PDOException $e) {
            jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
        }
        break;
        
    default:
        jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
}

