<?php
// Veritabanı Kontrol ve Oluşturma Scripti

require_once __DIR__ . '/config/config.php';

echo "<h2>Veritabanı Kontrolü</h2>";

try {
    // Önce veritabanı olmadan bağlan
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // Veritabanı var mı kontrol et
    $stmt = $pdo->query("SHOW DATABASES LIKE '" . DB_NAME . "'");
    $dbExists = $stmt->rowCount() > 0;
    
    if (!$dbExists) {
        echo "<p style='color: orange;'>Veritabanı bulunamadı. Oluşturuluyor...</p>";
        $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "<p style='color: green;'>✓ Veritabanı oluşturuldu: " . DB_NAME . "</p>";
    } else {
        echo "<p style='color: green;'>✓ Veritabanı mevcut: " . DB_NAME . "</p>";
    }
    
    // Veritabanına bağlan
    $pdo->exec("USE " . DB_NAME);
    
    // Tabloları kontrol et
    $tables = ['users', 'posts', 'likes', 'comments', 'events', 'event_participants', 'follows'];
    $missingTables = [];
    
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() == 0) {
            $missingTables[] = $table;
        }
    }
    
    if (empty($missingTables)) {
        echo "<p style='color: green;'>✓ Tüm tablolar mevcut</p>";
    } else {
        echo "<p style='color: orange;'>Eksik tablolar: " . implode(', ', $missingTables) . "</p>";
        echo "<p>Lütfen <code>database/schema.sql</code> dosyasını çalıştırın.</p>";
    }
    
    // Users tablosundan örnek veri çek
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
        $result = $stmt->fetch();
        echo "<p style='color: green;'>✓ Users tablosunda " . $result['count'] . " kullanıcı var</p>";
    } catch (PDOException $e) {
        echo "<p style='color: red;'>✗ Users tablosu hatası: " . $e->getMessage() . "</p>";
    }
    
    // Bağlantı testi
    echo "<p style='color: green;'>✓ Veritabanı bağlantısı başarılı!</p>";
    
} catch (PDOException $e) {
    echo "<p style='color: red;'>✗ Hata: " . $e->getMessage() . "</p>";
    echo "<p>Lütfen <code>backend/config/config.php</code> dosyasındaki veritabanı ayarlarını kontrol edin.</p>";
}

echo "<hr>";
echo "<h3>Yapılacaklar:</h3>";
echo "<ol>";
echo "<li>Eğer veritabanı yoksa, phpMyAdmin'den veya MySQL komut satırından <code>database/schema.sql</code> dosyasını çalıştırın.</li>";
echo "<li>XAMPP'te MySQL servisinin çalıştığından emin olun.</li>";
echo "<li><code>backend/config/config.php</code> dosyasındaki veritabanı bilgilerini kontrol edin.</li>";
echo "</ol>";

