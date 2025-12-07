<?php
// Yardımcı Fonksiyonlar

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

function redirect($url) {
    header("Location: " . $url);
    exit();
}

function sanitize($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function formatDate($date) {
    $timestamp = strtotime($date);
    $now = time();
    $diff = $now - $timestamp;

    if ($diff < 60) return 'Az önce';
    if ($diff < 3600) return floor($diff / 60) . ' dakika önce';
    if ($diff < 86400) return floor($diff / 3600) . ' saat önce';
    if ($diff < 604800) return floor($diff / 86400) . ' gün önce';
    
    return date('d.m.Y', $timestamp);
}

function isAdmin() {
    if (!isLoggedIn()) {
        return false;
    }
    
    global $db;
    if (!isset($db)) {
        $db = getDB();
    }
    
    $user_id = getCurrentUserId();
    $stmt = $db->prepare("SELECT is_admin FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $user && $user['is_admin'] == 1;
}

function checkAdmin() {
    if (!isAdmin()) {
        jsonResponse(['success' => false, 'message' => 'Bu işlem için yönetici yetkisi gereklidir'], 403);
    }
}

