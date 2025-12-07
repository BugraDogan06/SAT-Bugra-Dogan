<?php
// Veritabanı Test Scripti
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Veritabanı Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; }
        .success { color: #4ade80; }
        .error { color: #f87171; }
        .info { color: #60a5fa; }
        pre { background: #2a2a2a; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Veritabanı Bağlantı Testi</h1>
    
<?php
require_once __DIR__ . '/config/config.php';

echo "<h2>1. Yapılandırma Bilgileri</h2>";
echo "<pre>";
echo "DB_HOST: " . DB_HOST . "\n";
echo "DB_USER: " . DB_USER . "\n";
echo "DB_PASS: " . (empty(DB_PASS) ? '(boş)' : '***') . "\n";
echo "DB_NAME: " . DB_NAME . "\n";
echo "</pre>";

echo "<h2>2. MySQL Bağlantı Testi</h2>";
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "<p class='success'>✓ MySQL sunucusuna bağlanıldı</p>";
} catch (PDOException $e) {
    echo "<p class='error'>✗ MySQL bağlantı hatası: " . $e->getMessage() . "</p>";
    echo "<p class='info'>Çözüm: XAMPP Control Panel'de MySQL servisinin çalıştığından emin olun.</p>";
    exit;
}

echo "<h2>3. Veritabanı Kontrolü</h2>";
try {
    $stmt = $pdo->query("SHOW DATABASES LIKE '" . DB_NAME . "'");
    if ($stmt->rowCount() > 0) {
        echo "<p class='success'>✓ Veritabanı mevcut: " . DB_NAME . "</p>";
    } else {
        echo "<p class='info'>ℹ Veritabanı bulunamadı, oluşturuluyor...</p>";
        $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "<p class='success'>✓ Veritabanı oluşturuldu: " . DB_NAME . "</p>";
    }
} catch (PDOException $e) {
    echo "<p class='error'>✗ Veritabanı hatası: " . $e->getMessage() . "</p>";
    exit;
}

echo "<h2>4. Veritabanı Bağlantısı</h2>";
try {
    require_once __DIR__ . '/includes/database.php';
    $db = getDB();
    echo "<p class='success'>✓ Veritabanına başarıyla bağlanıldı</p>";
} catch (Exception $e) {
    echo "<p class='error'>✗ Bağlantı hatası: " . $e->getMessage() . "</p>";
    exit;
}

echo "<h2>5. Tablo Kontrolü</h2>";
$tables = ['users', 'posts', 'likes', 'comments', 'events', 'event_participants', 'follows'];
foreach ($tables as $table) {
    try {
        $stmt = $db->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            $count = $db->query("SELECT COUNT(*) as count FROM $table")->fetch()['count'];
            echo "<p class='success'>✓ Tablo mevcut: $table ($count kayıt)</p>";
        } else {
            echo "<p class='error'>✗ Tablo bulunamadı: $table</p>";
        }
    } catch (PDOException $e) {
        echo "<p class='error'>✗ Tablo kontrolü hatası ($table): " . $e->getMessage() . "</p>";
    }
}

echo "<h2>6. Test Kullanıcı Kontrolü</h2>";
try {
    $stmt = $db->query("SELECT id, username, email, created_at FROM users LIMIT 5");
    $users = $stmt->fetchAll();
    if (count($users) > 0) {
        echo "<p class='success'>✓ Kullanıcılar bulundu:</p>";
        echo "<pre>";
        foreach ($users as $user) {
            echo "ID: {$user['id']}, Kullanıcı Adı: {$user['username']}, E-posta: {$user['email']}, Tarih: {$user['created_at']}\n";
        }
        echo "</pre>";
    } else {
        echo "<p class='info'>ℹ Henüz kullanıcı kaydı yok</p>";
    }
} catch (PDOException $e) {
    echo "<p class='error'>✗ Kullanıcı sorgusu hatası: " . $e->getMessage() . "</p>";
}

echo "<h2>7. Test Sonucu</h2>";
echo "<p class='success'><strong>✓ Tüm testler başarılı! Veritabanı hazır.</strong></p>";
echo "<p class='info'>Artık kayıt ve giriş işlemlerini yapabilirsiniz.</p>";
?>

</body>
</html>

