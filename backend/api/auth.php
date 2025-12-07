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
    case 'POST':
        $action = $_POST['action'] ?? 'login';
        
        if ($action === 'update_profile') {
            // Profil güncelleme işlemi (FormData ile dosya yükleme için POST kullanılıyor)
            if (!isLoggedIn()) {
                jsonResponse(['success' => false, 'message' => 'Giriş yapılmamış'], 401);
            }
            
            $user_id = getCurrentUserId();
            $bio = sanitize($_POST['bio'] ?? '');
            $full_name = sanitize($_POST['full_name'] ?? '');
            
            // Profil fotoğrafı yükleme
            $profile_picture = null;
            if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../uploads/profiles/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $file = $_FILES['profile_picture'];
                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                $maxSize = 5 * 1024 * 1024; // 5MB
                
                if (!in_array($file['type'], $allowedTypes)) {
                    jsonResponse(['success' => false, 'message' => 'Geçersiz dosya tipi. Sadece JPEG, PNG, GIF ve WebP desteklenir.'], 400);
                }
                
                if ($file['size'] > $maxSize) {
                    jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük. Maksimum 5MB.'], 400);
                }
                
                $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $filename = 'profile_' . $user_id . '_' . time() . '.' . $extension;
                $filepath = $uploadDir . $filename;
                
                if (move_uploaded_file($file['tmp_name'], $filepath)) {
                    // Eski profil fotoğrafını sil
                    $stmt = $db->prepare("SELECT profile_picture FROM users WHERE id = ?");
                    $stmt->execute([$user_id]);
                    $oldProfile = $stmt->fetchColumn();
                    if ($oldProfile && file_exists(__DIR__ . '/../../' . $oldProfile)) {
                        unlink(__DIR__ . '/../../' . $oldProfile);
                    }
                    
                    $profile_picture = 'uploads/profiles/' . $filename;
                } else {
                    jsonResponse(['success' => false, 'message' => 'Dosya yüklenirken hata oluştu'], 500);
                }
            }
            
            // Veritabanını güncelle
            if ($profile_picture) {
                $stmt = $db->prepare("UPDATE users SET bio = ?, full_name = ?, profile_picture = ? WHERE id = ?");
                $stmt->execute([$bio, $full_name, $profile_picture, $user_id]);
            } else {
                $stmt = $db->prepare("UPDATE users SET bio = ?, full_name = ? WHERE id = ?");
                $stmt->execute([$bio, $full_name, $user_id]);
            }
            
            // Güncellenmiş kullanıcı bilgilerini getir
            $stmt = $db->prepare("SELECT id, username, email, full_name, profile_picture, bio FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch();
            
            jsonResponse([
                'success' => true,
                'message' => 'Profil güncellendi',
                'user' => $user
            ]);
            
        } else if ($action === 'register') {
            // Kayıt işlemi
            $username = trim($_POST['username'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $password = $_POST['password'] ?? ''; // Şifre sanitize edilmemeli
            $full_name = trim($_POST['full_name'] ?? '');
            
            // Validasyon
            if (empty($username) || empty($email) || empty($password)) {
                jsonResponse(['success' => false, 'message' => 'Tüm alanlar gereklidir'], 400);
            }
            
            if (!validateEmail($email)) {
                jsonResponse(['success' => false, 'message' => 'Geçersiz e-posta adresi'], 400);
            }
            
            if (strlen($password) < 6) {
                jsonResponse(['success' => false, 'message' => 'Şifre en az 6 karakter olmalıdır'], 400);
            }
            
            // Kullanıcı var mı kontrol et
            $stmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
            $stmt->execute([$username, $email]);
            if ($stmt->fetch()) {
                jsonResponse(['success' => false, 'message' => 'Kullanıcı adı veya e-posta zaten kullanılıyor'], 400);
            }
            
            // Kullanıcı oluştur
            $hashedPassword = hashPassword($password);
            
            if (!$hashedPassword) {
                jsonResponse(['success' => false, 'message' => 'Şifre hash\'lenemedi'], 500);
            }
            
            $stmt = $db->prepare("
                INSERT INTO users (username, email, password, full_name)
                VALUES (?, ?, ?, ?)
            ");
            
            try {
                // Transaction başlat
                $db->beginTransaction();
                
                $result = $stmt->execute([$username, $email, $hashedPassword, $full_name]);
                
                if ($result) {
                    $user_id = $db->lastInsertId();
                    
                    if (!$user_id) {
                        $db->rollBack();
                        jsonResponse(['success' => false, 'message' => 'Kullanıcı ID alınamadı'], 500);
                    }
                    
                    // Oluşturulan kullanıcıyı kontrol et
                    $checkStmt = $db->prepare("SELECT id, username, email FROM users WHERE id = ?");
                    $checkStmt->execute([$user_id]);
                    $checkUser = $checkStmt->fetch();
                    
                    if (!$checkUser) {
                        $db->rollBack();
                        jsonResponse(['success' => false, 'message' => 'Kullanıcı oluşturuldu ama veritabanında bulunamadı'], 500);
                    }
                    
                    // Transaction commit et
                    $db->commit();
                    
                    // Session başlat
                    $_SESSION['user_id'] = $user_id;
                    $_SESSION['username'] = $username;
                    
                    // Kullanıcı bilgilerini ve takip istatistiklerini getir (yeni bir sorgu ile)
                    $stmt = $db->prepare("
                        SELECT 
                            u.id, 
                            u.username, 
                            u.email, 
                            u.full_name, 
                            u.profile_picture, 
                            u.bio,
                            u.created_at,
                            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
                            (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
                            (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
                        FROM users u
                        WHERE u.id = ?
                    ");
                    $stmt->execute([$user_id]);
                    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$userData) {
                        jsonResponse(['success' => false, 'message' => 'Kullanıcı bilgileri alınamadı'], 500);
                    }
                    
                    jsonResponse([
                        'success' => true,
                        'message' => 'Kayıt başarılı',
                        'user_id' => $user_id,
                        'username' => $username,
                        'user' => $userData
                    ]);
                } else {
                    $db->rollBack();
                    $errorInfo = $stmt->errorInfo();
                    jsonResponse(['success' => false, 'message' => 'Kayıt başarısız: ' . ($errorInfo[2] ?? 'Bilinmeyen hata'), 'error_info' => $errorInfo], 500);
                }
            } catch (PDOException $e) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
                jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage(), 'error_code' => $e->getCode()], 500);
            }
            
        } else {
            // Giriş işlemi
            $username = trim($_POST['username'] ?? '');
            $password = $_POST['password'] ?? '';
            
            if (empty($username) || empty($password)) {
                jsonResponse(['success' => false, 'message' => 'Kullanıcı adı ve şifre gereklidir'], 400);
            }
            
            // Kullanıcıyı bul - önce username, sonra email ile dene
            try {
                // Önce username ile dene
                $stmt = $db->prepare("SELECT id, username, email, password FROM users WHERE username = ?");
                $stmt->execute([$username]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Bulunamazsa email ile dene
                if (!$user) {
                    $stmt = $db->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
                    $stmt->execute([$username]);
                    $user = $stmt->fetch(PDO::FETCH_ASSOC);
                }
                
                if (!$user) {
                    jsonResponse(['success' => false, 'message' => 'Kullanıcı bulunamadı'], 401);
                }
                
                // Şifre kontrolü
                $passwordValid = password_verify($password, $user['password']);
                
                // Eğer şifre hash'lenmemişse (eski kayıtlar için)
                if (!$passwordValid && strlen($user['password']) < 60) {
                    if ($user['password'] === md5($password) || $user['password'] === $password) {
                        // Şifreyi yeniden hash'le
                        $newHash = password_hash($password, PASSWORD_DEFAULT);
                        $updateStmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
                        $updateStmt->execute([$newHash, $user['id']]);
                        $passwordValid = true;
                    }
                }
                
                if ($passwordValid) {
                    // Session başlat
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $user['username'];
                    
                    // Kullanıcı bilgilerini ve takip istatistiklerini getir
                    $stmt = $db->prepare("
                        SELECT 
                            u.id, 
                            u.username, 
                            u.email, 
                            u.full_name, 
                            u.profile_picture, 
                            u.bio,
                            u.created_at,
                            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
                            (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
                            (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
                        FROM users u
                        WHERE u.id = ?
                    ");
                    $stmt->execute([$user['id']]);
                    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    jsonResponse([
                        'success' => true,
                        'message' => 'Giriş başarılı',
                        'user_id' => $user['id'],
                        'username' => $user['username'],
                        'user' => $userData
                    ]);
                } else {
                    jsonResponse(['success' => false, 'message' => 'Şifre hatalı'], 401);
                }
            } catch (PDOException $e) {
                jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
            }
        }
        break;
        
    case 'GET':
        // Mevcut kullanıcı bilgilerini getir
        // Session kontrolü
        if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
            $user_id = $_SESSION['user_id'];
            
            try {
                // Kullanıcı bilgilerini ve takip istatistiklerini getir
                $stmt = $db->prepare("
                    SELECT 
                        u.id, 
                        u.username, 
                        u.email, 
                        u.full_name, 
                        u.profile_picture, 
                        u.bio,
                        u.is_admin,
                        u.created_at,
                        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
                        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
                        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
                    FROM users u
                    WHERE u.id = ?
                ");
                $stmt->execute([$user_id]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($user) {
                    jsonResponse([
                        'success' => true,
                        'user' => $user
                    ]);
                } else {
                    // Kullanıcı veritabanında yok, session'ı temizle
                    session_destroy();
                    jsonResponse(['success' => false, 'message' => 'Kullanıcı bulunamadı'], 401);
                }
            } catch (PDOException $e) {
                jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
            }
        } else {
            jsonResponse(['success' => false, 'message' => 'Giriş yapılmamış'], 401);
        }
        break;
        
    case 'PUT':
    case 'PATCH':
        // Profil güncelleme işlemi
        if (!isLoggedIn()) {
            jsonResponse(['success' => false, 'message' => 'Giriş yapılmamış'], 401);
        }
        
        // PUT/PATCH için input'u oku
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Eğer JSON değilse, POST verilerini kullan (FormData için)
        if (empty($input)) {
            $input = $_POST;
        }
        
        $action = $input['action'] ?? $_POST['action'] ?? 'update_profile';
        
        if ($action === 'update_profile') {
            $user_id = getCurrentUserId();
            $bio = sanitize($input['bio'] ?? $_POST['bio'] ?? '');
            $full_name = sanitize($input['full_name'] ?? $_POST['full_name'] ?? '');
            
            // Profil fotoğrafı yükleme
            $profile_picture = null;
            if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../uploads/profiles/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $file = $_FILES['profile_picture'];
                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                $maxSize = 5 * 1024 * 1024; // 5MB
                
                if (!in_array($file['type'], $allowedTypes)) {
                    jsonResponse(['success' => false, 'message' => 'Geçersiz dosya tipi. Sadece JPEG, PNG, GIF ve WebP desteklenir.'], 400);
                }
                
                if ($file['size'] > $maxSize) {
                    jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük. Maksimum 5MB.'], 400);
                }
                
                $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $filename = 'profile_' . $user_id . '_' . time() . '.' . $extension;
                $filepath = $uploadDir . $filename;
                
                if (move_uploaded_file($file['tmp_name'], $filepath)) {
                    // Eski profil fotoğrafını sil
                    $stmt = $db->prepare("SELECT profile_picture FROM users WHERE id = ?");
                    $stmt->execute([$user_id]);
                    $oldProfile = $stmt->fetchColumn();
                    if ($oldProfile && file_exists(__DIR__ . '/../../' . $oldProfile)) {
                        unlink(__DIR__ . '/../../' . $oldProfile);
                    }
                    
                    $profile_picture = 'uploads/profiles/' . $filename;
                } else {
                    jsonResponse(['success' => false, 'message' => 'Dosya yüklenirken hata oluştu'], 500);
                }
            }
            
            // Veritabanını güncelle
            if ($profile_picture) {
                $stmt = $db->prepare("UPDATE users SET bio = ?, full_name = ?, profile_picture = ? WHERE id = ?");
                $stmt->execute([$bio, $full_name, $profile_picture, $user_id]);
            } else {
                $stmt = $db->prepare("UPDATE users SET bio = ?, full_name = ? WHERE id = ?");
                $stmt->execute([$bio, $full_name, $user_id]);
            }
            
            // Güncellenmiş kullanıcı bilgilerini ve takip istatistiklerini getir
            $stmt = $db->prepare("
                SELECT 
                    u.id, 
                    u.username, 
                    u.email, 
                    u.full_name, 
                    u.profile_picture, 
                    u.bio,
                    u.created_at,
                    (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
                    (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
                    (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count
                FROM users u
                WHERE u.id = ?
            ");
            $stmt->execute([$user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            jsonResponse([
                'success' => true,
                'message' => 'Profil güncellendi',
                'user' => $user
            ]);
        }
        break;
        
    case 'DELETE':
        // Çıkış işlemi
        session_destroy();
        jsonResponse(['success' => true, 'message' => 'Çıkış yapıldı']);
        break;
        
    default:
        jsonResponse(['success' => false, 'message' => 'Geçersiz metod'], 405);
}

