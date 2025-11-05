<?php
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

if ($method !== 'GET') {
    jsonResponse(['success' => false, 'message' => 'Sadece GET metodu kullanılabilir'], 405);
}

$query = sanitize($_GET['q'] ?? '');

if (empty($query)) {
    jsonResponse(['success' => false, 'message' => 'Arama terimi gereklidir'], 400);
}

$searchTerm = "%{$query}%";

// Gönderilerde ara
$stmt = $db->prepare("
    SELECT p.*, u.username, u.profile_picture,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.title LIKE ? 
       OR p.description LIKE ? 
       OR p.car_brand LIKE ? 
       OR p.car_model LIKE ?
    ORDER BY p.created_at DESC
    LIMIT 20
");
$stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
$posts = $stmt->fetchAll();

// Kullanıcılarda ara
$stmt = $db->prepare("
    SELECT id, username, full_name, profile_picture, bio
    FROM users
    WHERE username LIKE ? OR full_name LIKE ?
    LIMIT 10
");
$stmt->execute([$searchTerm, $searchTerm]);
$users = $stmt->fetchAll();

jsonResponse([
    'success' => true,
    'posts' => $posts,
    'users' => $users
]);

