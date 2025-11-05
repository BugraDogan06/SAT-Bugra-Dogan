<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'POST':
        $action = $_POST['action'] ?? 'login';
        
        if ($action === 'register') {
            // Kayıt işlemi
            $username = sanitize($_POST['username'] ?? '');
            $email = sanitize($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';
            $full_name = sanitize($_POST['full_name'] ?? '');
            
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
            $stmt = $db->prepare("
                INSERT INTO users (username, email, password, full_name)
                VALUES (?, ?, ?, ?)
            ");
            
            if ($stmt->execute([$username, $email, $hashedPassword, $full_name])) {
                $user_id = $db->lastInsertId();
                
                // Session başlat
                $_SESSION['user_id'] = $user_id;
                $_SESSION['username'] = $username;
                
                jsonResponse([
                    'success' => true,
                    'message' => 'Kayıt başarılı',
                    'user_id' => $user_id
                ]);
            } else {
                jsonResponse(['success' => false, 'message' => 'Kayıt başarısız'], 500);
            }
            
        } else {
            // Giriş işlemi
            $username = sanitize($_POST['username'] ?? '');
            $password = $_POST['password'] ?? '';
            
            if (empty($username) || empty($password)) {
                jsonResponse(['success' => false, 'message' => 'Kullanıcı adı ve şifre gereklidir'], 400);
            }
            
            // Kullanıcıyı bul
            $stmt = $db->prepare("SELECT id, username, email, password FROM users WHERE username = ? OR email = ?");
            $stmt->execute([$username, $username]);
            $user = $stmt->fetch();
            
            if ($user && verifyPassword($password, $user['password'])) {
                // Session başlat
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                
                jsonResponse([
                    'success' => true,
                    'message' => 'Giriş başarılı',
                    'user_id' => $user['id']
                ]);
            } else {
                jsonResponse(['success' => false, 'message' => 'Kullanıcı adı veya şifre hatalı'], 401);
            }
        }
        break;
        
    case 'GET':
        // Mevcut kullanıcı bilgilerini getir
        if (isLoggedIn()) {
            $stmt = $db->prepare("SELECT id, username, email, full_name, profile_picture, bio FROM users WHERE id = ?");
            $stmt->execute([getCurrentUserId()]);
            $user = $stmt->fetch();
            
            jsonResponse([
                'success' => true,
                'user' => $user
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Giriş yapılmamış'], 401);
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

