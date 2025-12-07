<?php
// Kullanıcı Debug Scripti
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/functions.php';

try {
    $db = getDB();
    
    // Tüm kullanıcıları getir
    $stmt = $db->query("SELECT id, username, email, full_name, created_at, LENGTH(password) as password_length FROM users ORDER BY id DESC");
    $users = $stmt->fetchAll();
    
    // Toplam kullanıcı sayısı
    $countStmt = $db->query("SELECT COUNT(*) as count FROM users");
    $count = $countStmt->fetch()['count'];
    
    jsonResponse([
        'success' => true,
        'total_users' => $count,
        'users' => $users
    ]);
    
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Hata: ' . $e->getMessage()
    ], 500);
}

