<?php
// Şifre Sıfırlama Scripti (Sadece geliştirme için)
// Bu dosyayı production'da kullanmayın!

require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

// Sadece POST isteklerini kabul et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Sadece POST metodu kullanılabilir'], 405);
}

$username = trim($_POST['username'] ?? '');
$new_password = $_POST['new_password'] ?? '';

if (empty($username) || empty($new_password)) {
    jsonResponse(['success' => false, 'message' => 'Kullanıcı adı ve yeni şifre gereklidir'], 400);
}

if (strlen($new_password) < 6) {
    jsonResponse(['success' => false, 'message' => 'Şifre en az 6 karakter olmalıdır'], 400);
}

try {
    $db = getDB();
    
    // Kullanıcıyı bul
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Kullanıcı bulunamadı'], 404);
    }
    
    // Yeni şifreyi hash'le
    $hashedPassword = hashPassword($new_password);
    
    // Şifreyi güncelle
    $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
    if ($stmt->execute([$hashedPassword, $user['id']])) {
        jsonResponse([
            'success' => true,
            'message' => 'Şifre başarıyla sıfırlandı',
            'user_id' => $user['id']
        ]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Şifre güncellenemedi'], 500);
    }
    
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Veritabanı hatası: ' . $e->getMessage()], 500);
}

