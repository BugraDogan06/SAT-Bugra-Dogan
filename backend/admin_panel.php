<?php
/**
 * Basit Admin Panel - Web Arayüzü
 * Kullanım: http://localhost/backend/admin_panel.php
 */

require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/functions.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Basit güvenlik: Sadece localhost'tan erişilebilir
if ($_SERVER['REMOTE_ADDR'] !== '127.0.0.1' && $_SERVER['REMOTE_ADDR'] !== '::1') {
    die('Bu sayfaya sadece localhost\'tan erişilebilir');
}

$db = getDB();
$message = '';
$error = '';

// Form gönderildi mi?
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'make_admin') {
        $username = trim($_POST['username'] ?? '');
        
        if (empty($username)) {
            $error = 'Kullanıcı adı gereklidir';
        } else {
            try {
                // Kullanıcıyı bul
                $stmt = $db->prepare("SELECT id, username FROM users WHERE username = ?");
                $stmt->execute([$username]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$user) {
                    $error = "Kullanıcı bulunamadı: $username";
                } else {
                    // is_admin sütununu kontrol et, yoksa ekle
                    $columns = $db->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('is_admin', $columns)) {
                        $db->exec("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0 AFTER bio");
                    }
                    
                    // Kullanıcıyı admin yap
                    $stmt = $db->prepare("UPDATE users SET is_admin = 1 WHERE id = ?");
                    $stmt->execute([$user['id']]);
                    
                    $message = "✅ Kullanıcı admin yapıldı: {$user['username']} (ID: {$user['id']})";
                }
            } catch (Exception $e) {
                $error = "Hata: " . $e->getMessage();
            }
        }
    }
}

// Tüm kullanıcıları listele
$users = $db->query("
    SELECT id, username, email, is_admin, created_at 
    FROM users 
    ORDER BY created_at DESC
")->fetchAll(PDO::FETCH_ASSOC);

?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Kullanıcı Yönetimi</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8">🔐 Admin Panel - Kullanıcı Yönetimi</h1>
        
        <?php if ($message): ?>
            <div class="bg-green-600 text-white p-4 rounded-lg mb-6">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="bg-red-600 text-white p-4 rounded-lg mb-6">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>
        
        <!-- Kullanıcıyı Admin Yap -->
        <div class="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 class="text-xl font-bold mb-4">Kullanıcıyı Admin Yap</h2>
            <form method="POST" class="flex gap-4">
                <input type="hidden" name="action" value="make_admin">
                <input 
                    type="text" 
                    name="username" 
                    placeholder="Kullanıcı adı" 
                    required
                    class="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                >
                <button 
                    type="submit"
                    class="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
                >
                    Admin Yap
                </button>
            </form>
        </div>
        
        <!-- Kullanıcı Listesi -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h2 class="text-xl font-bold mb-4">Tüm Kullanıcılar</h2>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-gray-700">
                            <th class="text-left p-3">ID</th>
                            <th class="text-left p-3">Kullanıcı Adı</th>
                            <th class="text-left p-3">E-posta</th>
                            <th class="text-left p-3">Admin</th>
                            <th class="text-left p-3">Kayıt Tarihi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($users as $user): ?>
                            <tr class="border-b border-gray-700 hover:bg-gray-700">
                                <td class="p-3"><?php echo htmlspecialchars($user['id']); ?></td>
                                <td class="p-3 font-semibold"><?php echo htmlspecialchars($user['username']); ?></td>
                                <td class="p-3"><?php echo htmlspecialchars($user['email']); ?></td>
                                <td class="p-3">
                                    <?php if ($user['is_admin'] == 1): ?>
                                        <span class="px-2 py-1 bg-red-600 rounded text-sm">✅ Admin</span>
                                    <?php else: ?>
                                        <span class="px-2 py-1 bg-gray-600 rounded text-sm">Kullanıcı</span>
                                    <?php endif; ?>
                                </td>
                                <td class="p-3 text-sm text-gray-400">
                                    <?php echo date('d.m.Y H:i', strtotime($user['created_at'])); ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="mt-8 p-4 bg-blue-900/30 rounded-lg">
            <h3 class="font-bold mb-2">📝 Kullanım Talimatları:</h3>
            <ol class="list-decimal list-inside space-y-2 text-sm">
                <li>Yukarıdaki formdan bir kullanıcı adı gir ve "Admin Yap" butonuna tıkla</li>
                <li>Kullanıcı artık admin yetkilerine sahip olacak</li>
                <li>O kullanıcı ile normal giriş yap: <a href="../frontend/login.html" class="text-red-400 hover:underline">Giriş Sayfası</a></li>
                <li>Giriş yaptıktan sonra Etkinlikler sayfasında "Yeni Etkinlik Ekle" butonu görünecek</li>
            </ol>
        </div>
    </div>
</body>
</html>

