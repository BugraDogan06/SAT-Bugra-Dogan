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

// Gönderi onaylama/reddetme
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'approve_post') {
        $post_id = intval($_POST['post_id'] ?? 0);
        if ($post_id) {
            try {
                $stmt = $db->prepare("UPDATE posts SET is_approved = 1, approval_date = NOW() WHERE id = ?");
                $stmt->execute([$post_id]);
                $message = "✅ Gönderi onaylandı";
            } catch (Exception $e) {
                $error = "Hata: " . $e->getMessage();
            }
        }
    }
    
    if ($action === 'reject_post') {
        $post_id = intval($_POST['post_id'] ?? 0);
        if ($post_id) {
            try {
                // Gönderiyi sil (veya is_approved = -1 yaparak reddedilmiş olarak işaretleyebilirsiniz)
                $stmt = $db->prepare("DELETE FROM posts WHERE id = ?");
                $stmt->execute([$post_id]);
                $message = "✅ Gönderi reddedildi ve silindi";
            } catch (Exception $e) {
                $error = "Hata: " . $e->getMessage();
            }
        }
    }
    
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

// Onay bekleyen gönderileri getir
$pending_posts = $db->query("
    SELECT p.*, u.username, u.email 
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.is_approved = 0
    ORDER BY p.created_at DESC
")->fetchAll(PDO::FETCH_ASSOC);

// Tüm kullanıcıları listele
$users = $db->query("
    SELECT id, username, email, is_admin, created_at 
    FROM users 
    ORDER BY created_at DESC
")->fetchAll(PDO::FETCH_ASSOC);

// İstatistikler
$stats = [
    'total_users' => $db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
    'total_posts' => $db->query("SELECT COUNT(*) FROM posts")->fetchColumn(),
    'pending_posts' => count($pending_posts),
    'total_cars' => $db->query("SELECT COUNT(*) FROM cars")->fetchColumn(),
    'total_events' => $db->query("SELECT COUNT(*) FROM events")->fetchColumn(),
    'admin_users' => $db->query("SELECT COUNT(*) FROM users WHERE is_admin = 1")->fetchColumn(),
];

// Son kayıt olan kullanıcılar
$recent_users = $db->query("
    SELECT id, username, email, created_at 
    FROM users 
    ORDER BY created_at DESC 
    LIMIT 5
")->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Piyasa Garage</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;900&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0000 0%, #1a0000 50%, #0a0000 100%);
            background-attachment: fixed;
        }
        
        .neon-text {
            font-family: 'Orbitron', sans-serif;
            color: #ff2b2b;
            text-shadow: 0 0 10px #ff2b2b, 0 0 20px #ff2b2b, 0 0 40px #ff2b2b;
        }
        
        .glass-card {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .stat-card {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(17, 24, 39, 0.8) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(239, 68, 68, 0.3);
            transition: all 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            border-color: rgba(239, 68, 68, 0.6);
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.2);
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
            50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.6); }
        }
        
        .glow-border {
            animation: glow 2s infinite;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slide-in {
            animation: slideIn 0.5s ease-out forwards;
        }
    </style>
</head>
<body class="text-white min-h-screen">
    <!-- Background Gradient Effects -->
    <div class="fixed inset-0 pointer-events-none">
        <div class="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full filter blur-3xl opacity-10"></div>
        <div class="absolute bottom-0 left-0 w-96 h-96 bg-red-700 rounded-full filter blur-3xl opacity-10"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 border-b border-red-900/30 bg-black/50 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg">
                        <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                        </svg>
                    </div>
                    <div>
                        <h1 class="neon-text text-3xl font-bold">Piyasa Garage</h1>
                        <p class="text-gray-400 text-sm">Admin Control Panel</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <a href="../frontend/index.html" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition border border-gray-700">
                        🏠 Ana Sayfa
                    </a>
                    <div class="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center font-bold shadow-lg">
                        A
                    </div>
                </div>
            </div>
        </div>
    </header>

    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Alert Messages -->
        <?php if ($message): ?>
            <div class="mb-6 animate-slide-in">
                <div class="glass-card rounded-xl p-4 border-green-500/50 bg-green-900/20">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <p class="text-green-100 font-medium"><?php echo htmlspecialchars($message); ?></p>
                    </div>
                </div>
            </div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="mb-6 animate-slide-in">
                <div class="glass-card rounded-xl p-4 border-red-500/50 bg-red-900/20">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <p class="text-red-100 font-medium"><?php echo htmlspecialchars($error); ?></p>
                    </div>
                </div>
            </div>
        <?php endif; ?>
        
        <!-- Dashboard Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <!-- Total Users -->
            <div class="stat-card rounded-2xl p-6 animate-slide-in">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                    </div>
                    <span class="text-3xl font-bold text-white"><?php echo $stats['total_users']; ?></span>
                </div>
                <p class="text-gray-400 text-sm font-medium">Toplam Kullanıcı</p>
                <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="text-green-400">●</span>
                    <span class="text-gray-500"><?php echo $stats['admin_users']; ?> admin</span>
                </div>
            </div>

            <!-- Total Posts -->
            <div class="stat-card rounded-2xl p-6 animate-slide-in" style="animation-delay: 0.1s">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <span class="text-3xl font-bold text-white"><?php echo $stats['total_posts']; ?></span>
                </div>
                <p class="text-gray-400 text-sm font-medium">Toplam Gönderi</p>
                <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="text-yellow-400">●</span>
                    <span class="text-gray-500"><?php echo $stats['pending_posts']; ?> onay bekliyor</span>
                </div>
            </div>

            <!-- Total Cars -->
            <div class="stat-card rounded-2xl p-6 animate-slide-in" style="animation-delay: 0.2s">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 252.094 252.094">
                            <path d="M196.979,146.785c-1.091,0-2.214,0.157-3.338,0.467l-4.228,1.165l-6.229-15.173c-3.492-8.506-13.814-15.426-23.01-15.426H91.808c-9.195,0-19.518,6.921-23.009,15.427l-6.218,15.145l-4.127-1.137c-1.124-0.31-2.247-0.467-3.338-0.467c-5.485,0-9.467,3.935-9.467,9.356c0,5.352,3.906,9.858,9.2,11.211c-2.903,8.017-5.159,20.034-5.159,27.929v32.287c0,6.893,5.607,12.5,12.5,12.5h4.583c6.893,0,12.5-5.607,12.5-12.5v-6.04h93.435v6.04c0,6.893,5.607,12.5,12.5,12.5h4.585c6.893,0,12.5-5.607,12.5-12.5v-32.287c0-7.887-2.252-19.888-5.15-27.905c5.346-1.32,9.303-5.85,9.303-11.235C206.445,150.72,202.464,146.785,196.979,146.785z"/>
                        </svg>
                    </div>
                    <span class="text-3xl font-bold text-white"><?php echo $stats['total_cars']; ?></span>
                </div>
                <p class="text-gray-400 text-sm font-medium">Toplam Araç</p>
                <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="text-red-400">●</span>
                    <span class="text-gray-500">Garajda</span>
                </div>
            </div>

            <!-- Total Events -->
            <div class="stat-card rounded-2xl p-6 animate-slide-in" style="animation-delay: 0.3s">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <span class="text-3xl font-bold text-white"><?php echo $stats['total_events']; ?></span>
                </div>
                <p class="text-gray-400 text-sm font-medium">Toplam Etkinlik</p>
                <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="text-green-400">●</span>
                    <span class="text-gray-500">Aktif</span>
                </div>
            </div>

            <!-- Pending Posts - Highlighted -->
            <div class="stat-card rounded-2xl p-6 animate-slide-in glow-border" style="animation-delay: 0.4s">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <span class="text-3xl font-bold text-white"><?php echo $stats['pending_posts']; ?></span>
                </div>
                <p class="text-gray-400 text-sm font-medium">Onay Bekleyen</p>
                <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="text-yellow-400">●</span>
                    <span class="text-gray-500">İşlem gerekli</span>
                </div>
            </div>

            <!-- Admin Actions Quick -->
            <div class="stat-card rounded-2xl p-6 animate-slide-in" style="animation-delay: 0.5s">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-700 rounded-xl flex items-center justify-center shadow-lg">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </div>
                    <button onclick="scrollToAdminForm()" class="text-sm px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition">
                        Yönet
                    </button>
                </div>
                <p class="text-gray-400 text-sm font-medium">Hızlı Erişim</p>
                <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="text-pink-400">●</span>
                    <span class="text-gray-500">Admin yönetimi</span>
                </div>
            </div>
        </div>

        <!-- Onay Bekleyen Gönderiler -->
        <div class="glass-card rounded-2xl p-6 mb-8">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold flex items-center gap-3">
                    <div class="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    Onay Bekleyen Gönderiler
                </h2>
                <span class="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-bold border border-yellow-500/30">
                    <?php echo count($pending_posts); ?> Beklemede
                </span>
            </div>
            
            <?php if (empty($pending_posts)): ?>
                <div class="text-center py-16">
                    <div class="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <p class="text-gray-400 text-lg font-medium">Harika! Onay bekleyen gönderi yok</p>
                    <p class="text-gray-500 text-sm mt-2">Tüm gönderiler işlendi</p>
                </div>
            <?php else: ?>
                <div class="space-y-4">
                    <?php foreach ($pending_posts as $post): ?>
                        <div class="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-5 border border-yellow-500/30 hover:border-yellow-500/50 transition">
                            <div class="flex flex-col md:flex-row gap-6">
                                <!-- Görsel -->
                                <div class="flex-shrink-0">
                                    <?php if ($post['image_url']): ?>
                                        <img src="../<?php echo htmlspecialchars($post['image_url']); ?>" 
                                             alt="Gönderi" 
                                             class="w-full md:w-40 h-40 object-cover rounded-xl border-2 border-gray-700 shadow-lg">
                                    <?php else: ?>
                                        <div class="w-full md:w-40 h-40 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center border-2 border-gray-700">
                                            <svg class="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                        </div>
                                    <?php endif; ?>
                                </div>
                                
                                <!-- Bilgiler -->
                                <div class="flex-1">
                                    <div class="flex items-start justify-between mb-3">
                                        <h3 class="text-xl font-bold text-white">
                                            <?php echo htmlspecialchars($post['title']); ?>
                                        </h3>
                                        <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold border border-yellow-500/30 whitespace-nowrap ml-2">
                                            Beklemede
                                        </span>
                                    </div>
                                    
                                    <?php if ($post['description']): ?>
                                        <p class="text-gray-300 mb-3 text-sm leading-relaxed line-clamp-2">
                                            <?php echo htmlspecialchars($post['description']); ?>
                                        </p>
                                    <?php endif; ?>
                                    
                                    <div class="flex flex-wrap items-center gap-4 text-sm mb-4">
                                        <div class="flex items-center gap-2 text-gray-400">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                            <span><?php echo htmlspecialchars($post['username']); ?></span>
                                        </div>
                                        <div class="flex items-center gap-2 text-gray-400">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                            <span><?php echo htmlspecialchars($post['email']); ?></span>
                                        </div>
                                        <div class="flex items-center gap-2 text-gray-400">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            <span><?php echo date('d.m.Y H:i', strtotime($post['created_at'])); ?></span>
                                        </div>
                                    </div>
                                    
                                    <?php if ($post['car_brand'] || $post['car_model']): ?>
                                        <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm mb-4 border border-red-500/30">
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 252.094 252.094">
                                                <path d="M196.979,146.785c-1.091,0-2.214,0.157-3.338,0.467l-4.228,1.165l-6.229-15.173c-3.492-8.506-13.814-15.426-23.01-15.426H91.808c-9.195,0-19.518,6.921-23.009,15.427l-6.218,15.145l-4.127-1.137c-1.124-0.31-2.247-0.467-3.338-0.467c-5.485,0-9.467,3.935-9.467,9.356c0,5.352,3.906,9.858,9.2,11.211c-2.903,8.017-5.159,20.034-5.159,27.929v32.287c0,6.893,5.607,12.5,12.5,12.5h4.583c6.893,0,12.5-5.607,12.5-12.5v-6.04h93.435v6.04c0,6.893,5.607,12.5,12.5,12.5h4.585c6.893,0,12.5-5.607,12.5-12.5v-32.287c0-7.887-2.252-19.888-5.15-27.905c5.346-1.32,9.303-5.85,9.303-11.235C206.445,150.72,202.464,146.785,196.979,146.785z"/>
                                            </svg>
                                            <span class="font-medium"><?php echo htmlspecialchars($post['car_brand'] . ' ' . $post['car_model']); ?></span>
                                        </div>
                                    <?php endif; ?>
                                    
                                    <!-- Onay Butonları -->
                                    <div class="flex gap-3">
                                        <form method="POST" class="flex-1" onsubmit="return confirm('Bu gönderiyi onaylamak istediğinize emin misiniz?')">
                                            <input type="hidden" name="action" value="approve_post">
                                            <input type="hidden" name="post_id" value="<?php echo $post['id']; ?>">
                                            <button type="submit" 
                                                    class="w-full px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl text-white font-semibold transition shadow-lg hover:shadow-green-600/50 flex items-center justify-center gap-2">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                                Onayla
                                            </button>
                                        </form>
                                        
                                        <form method="POST" class="flex-1" onsubmit="return confirm('Bu gönderiyi reddetmek ve silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')">
                                            <input type="hidden" name="action" value="reject_post">
                                            <input type="hidden" name="post_id" value="<?php echo $post['id']; ?>">
                                            <button type="submit" 
                                                    class="w-full px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl text-white font-semibold transition shadow-lg hover:shadow-red-600/50 flex items-center justify-center gap-2">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                                Reddet
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
        
        <!-- Kullanıcıyı Admin Yap -->
        <div id="adminForm" class="glass-card rounded-2xl p-6 mb-8">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold">Yeni Admin Ekle</h2>
            </div>
            <form method="POST" class="flex flex-col md:flex-row gap-4">
                <input type="hidden" name="action" value="make_admin">
                <div class="flex-1">
                    <input 
                        type="text" 
                        name="username" 
                        placeholder="Kullanıcı adını girin..." 
                        required
                        class="w-full px-5 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                    >
                </div>
                <button 
                    type="submit"
                    class="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl font-bold transition shadow-lg hover:shadow-red-600/50 flex items-center justify-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Admin Yap
                </button>
            </form>
            <p class="text-gray-500 text-sm mt-3">Bu kullanıcı admin yetkilerine sahip olacak ve etkinlik oluşturabilecek.</p>
        </div>
        
        <!-- Kullanıcı Listesi -->
        <div class="glass-card rounded-2xl p-6 mb-8">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold">Tüm Kullanıcılar</h2>
                </div>
                <span class="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-bold border border-blue-500/30">
                    <?php echo count($users); ?> Kullanıcı
                </span>
            </div>
            
            <div class="overflow-x-auto rounded-xl border border-gray-800">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-900/50">
                            <th class="text-left p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                            <th class="text-left p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Kullanıcı</th>
                            <th class="text-left p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">E-posta</th>
                            <th class="text-left p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Yetki</th>
                            <th class="text-left p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Kayıt Tarihi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                        <?php foreach ($users as $user): ?>
                            <tr class="hover:bg-gray-800/50 transition">
                                <td class="p-4">
                                    <span class="px-2 py-1 bg-gray-700 rounded text-sm font-mono">
                                        #<?php echo htmlspecialchars($user['id']); ?>
                                    </span>
                                </td>
                                <td class="p-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center font-bold text-sm">
                                            <?php echo strtoupper(substr($user['username'], 0, 1)); ?>
                                        </div>
                                        <span class="font-semibold text-white"><?php echo htmlspecialchars($user['username']); ?></span>
                                    </div>
                                </td>
                                <td class="p-4 text-gray-400 text-sm"><?php echo htmlspecialchars($user['email']); ?></td>
                                <td class="p-4">
                                    <?php if ($user['is_admin'] == 1): ?>
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-bold border border-red-500/30">
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clip-rule="evenodd"></path>
                                            </svg>
                                            Admin
                                        </span>
                                    <?php else: ?>
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-gray-400 rounded-lg text-sm font-medium">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                            Kullanıcı
                                        </span>
                                    <?php endif; ?>
                                </td>
                                <td class="p-4 text-sm text-gray-400">
                                    <?php echo date('d M Y, H:i', strtotime($user['created_at'])); ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Son Kayıtlar -->
        <div class="glass-card rounded-2xl p-6 mb-8">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold">Son Kayıtlar</h2>
            </div>
            <div class="space-y-3">
                <?php foreach ($recent_users as $user): ?>
                    <div class="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center font-bold">
                                <?php echo strtoupper(substr($user['username'], 0, 1)); ?>
                            </div>
                            <div>
                                <p class="font-semibold text-white"><?php echo htmlspecialchars($user['username']); ?></p>
                                <p class="text-sm text-gray-400"><?php echo htmlspecialchars($user['email']); ?></p>
                            </div>
                        </div>
                        <span class="text-xs text-gray-500">
                            <?php echo date('d.m.Y H:i', strtotime($user['created_at'])); ?>
                        </span>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        
        <!-- Yardım Kartı -->
        <div class="glass-card rounded-2xl p-6 border-blue-500/30">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div class="flex-1">
                    <h3 class="text-lg font-bold mb-3 text-white">📝 Hızlı Kılavuz</h3>
                    <ul class="space-y-2 text-sm text-gray-300">
                        <li class="flex items-start gap-2">
                            <span class="text-blue-400 mt-0.5">→</span>
                            <span>Kullanıcıyı admin yapmak için yukarıdaki formdan kullanıcı adını girin</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="text-blue-400 mt-0.5">→</span>
                            <span>Admin kullanıcılar etkinlik oluşturabilir ve yönetebilir</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="text-blue-400 mt-0.5">→</span>
                            <span>Bekleyen gönderileri onaylayarak veya reddederek yönetin</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="text-blue-400 mt-0.5">→</span>
                            <span>Uygulamaya dönmek için: <a href="../frontend/index.html" class="text-red-400 hover:text-red-300 underline font-medium">Ana Sayfa</a></span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="relative z-10 mt-16 border-t border-red-900/30 bg-black/50 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                <p class="text-gray-500 text-sm">
                    © 2024 <span class="neon-text font-bold">Piyasa Garage</span> - Admin Panel
                </p>
                <div class="flex items-center gap-4">
                    <span class="text-xs text-gray-600">Localhost Only</span>
                    <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    </footer>

    <script>
        function scrollToAdminForm() {
            document.getElementById('adminForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    </script>
</body>
</html>

