<?php
/**
 * Kullanıcıyı admin yapmak için script
 * Kullanım: php make_admin.php <username>
 */

require_once __DIR__ . '/includes/database.php';

if ($argc < 2) {
    echo "Kullanım: php make_admin.php <username>\n";
    exit(1);
}

$username = $argv[1];
$db = getDB();

try {
    // Kullanıcıyı bul
    $stmt = $db->prepare("SELECT id, username FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "Kullanıcı bulunamadı: $username\n";
        exit(1);
    }
    
    // is_admin sütununu kontrol et, yoksa ekle
    $columns = $db->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('is_admin', $columns)) {
        $db->exec("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0 AFTER bio");
        echo "is_admin sütunu eklendi.\n";
    }
    
    // Kullanıcıyı admin yap
    $stmt = $db->prepare("UPDATE users SET is_admin = 1 WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    echo "Kullanıcı admin yapıldı: {$user['username']} (ID: {$user['id']})\n";
    
} catch (Exception $e) {
    echo "Hata: " . $e->getMessage() . "\n";
    exit(1);
}

