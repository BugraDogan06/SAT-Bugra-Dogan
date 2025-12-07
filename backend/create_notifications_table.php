<?php
require_once __DIR__ . '/includes/database.php';

try {
    $db = getDB();
    
    $sql = "
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('like', 'comment', 'follow', 'post_mention') NOT NULL,
        actor_id INT NOT NULL,
        post_id INT DEFAULT NULL,
        comment_id INT DEFAULT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    
    $db->exec($sql);
    
    echo "Notifications tablosu başarıyla oluşturuldu!\n";
    
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "Notifications tablosu zaten mevcut.\n";
    } else {
        echo "Hata: " . $e->getMessage() . "\n";
    }
} catch (Exception $e) {
    echo "Hata: " . $e->getMessage() . "\n";
}

