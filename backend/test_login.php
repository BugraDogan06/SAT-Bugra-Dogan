<?php
// Giriş Test Scripti
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Giriş Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
        .success { color: #4ade80; }
        .error { color: #f87171; }
        .info { color: #60a5fa; }
        pre { background: #2a2a2a; padding: 15px; border-radius: 5px; overflow-x: auto; }
        form { background: #2a2a2a; padding: 20px; border-radius: 5px; margin: 20px 0; }
        input { padding: 10px; margin: 5px; width: 300px; }
        button { padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Giriş Test Scripti</h1>
    
<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/functions.php';

echo "<h2>1. Veritabanı Bağlantısı</h2>";
try {
    $db = getDB();
    echo "<p class='success'>✓ Veritabanı bağlantısı başarılı</p>";
} catch (Exception $e) {
    echo "<p class='error'>✗ Veritabanı bağlantı hatası: " . $e->getMessage() . "</p>";
    exit;
}

echo "<h2>2. Kullanıcılar</h2>";
try {
    $stmt = $db->query("SELECT id, username, email, LENGTH(password) as pwd_len, created_at FROM users ORDER BY id DESC LIMIT 10");
    $users = $stmt->fetchAll();
    
    if (count($users) > 0) {
        echo "<p class='success'>✓ " . count($users) . " kullanıcı bulundu:</p>";
        echo "<pre>";
        foreach ($users as $user) {
            echo "ID: {$user['id']}, Kullanıcı Adı: {$user['username']}, E-posta: {$user['email']}, Şifre Uzunluğu: {$user['pwd_len']}, Tarih: {$user['created_at']}\n";
        }
        echo "</pre>";
    } else {
        echo "<p class='error'>✗ Veritabanında kullanıcı yok!</p>";
    }
} catch (PDOException $e) {
    echo "<p class='error'>✗ Hata: " . $e->getMessage() . "</p>";
}

echo "<h2>3. Test Girişi</h2>";
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['test_login'])) {
    $test_username = trim($_POST['username'] ?? '');
    $test_password = $_POST['password'] ?? '';
    
    echo "<p class='info'>Test ediliyor: Kullanıcı Adı/E-posta = '$test_username'</p>";
    
    try {
        // Kullanıcıyı bul
        $stmt = $db->prepare("SELECT id, username, email, password FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$test_username, $test_username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo "<p class='error'>✗ Kullanıcı bulunamadı!</p>";
        } else {
            echo "<p class='success'>✓ Kullanıcı bulundu: ID={$user['id']}, Username={$user['username']}, Email={$user['email']}</p>";
            echo "<p class='info'>Şifre hash uzunluğu: " . strlen($user['password']) . "</p>";
            
            // Şifre kontrolü
            if (password_verify($test_password, $user['password'])) {
                echo "<p class='success'>✓ Şifre doğru! Giriş başarılı olmalı.</p>";
                
                // Session test
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                echo "<p class='success'>✓ Session oluşturuldu: user_id={$_SESSION['user_id']}, username={$_SESSION['username']}</p>";
            } else {
                echo "<p class='error'>✗ Şifre yanlış!</p>";
                echo "<p class='info'>Girilen şifre: '$test_password'</p>";
                echo "<p class='info'>Hash: " . substr($user['password'], 0, 20) . "...</p>";
            }
        }
    } catch (PDOException $e) {
        echo "<p class='error'>✗ Hata: " . $e->getMessage() . "</p>";
    }
}

echo "<h2>4. Test Formu</h2>";
?>

<form method="POST">
    <input type="text" name="username" placeholder="Kullanıcı Adı veya E-posta" required><br>
    <input type="password" name="password" placeholder="Şifre" required><br>
    <button type="submit" name="test_login">Test Et</button>
</form>

<h2>5. API Test</h2>
<p class="info">Aşağıdaki butona tıklayarak API'yi test edebilirsin:</p>
<button onclick="testAPI()">API Test Et</button>
<div id="apiResult"></div>

<script>
async function testAPI() {
    const username = prompt('Kullanıcı adı veya e-posta:');
    const password = prompt('Şifre:');
    
    if (!username || !password) return;
    
    const formData = new FormData();
    formData.append('action', 'login');
    formData.append('username', username);
    formData.append('password', password);
    
    try {
        const response = await fetch('../backend/api/auth.php', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const data = await response.json();
        document.getElementById('apiResult').innerHTML = 
            '<pre style="background: #2a2a2a; padding: 15px; border-radius: 5px; margin-top: 10px;">' + 
            JSON.stringify(data, null, 2) + 
            '</pre>';
    } catch (error) {
        document.getElementById('apiResult').innerHTML = 
            '<p class="error">Hata: ' + error.message + '</p>';
    }
}
</script>

</body>
</html>

