<?php
require_once __DIR__ . '/../config/config.php';

class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        try {
            // Önce veritabanı olmadan bağlan
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
            
            // Veritabanı var mı kontrol et
            $stmt = $pdo->query("SHOW DATABASES LIKE '" . DB_NAME . "'");
            if ($stmt->rowCount() == 0) {
                // Veritabanı yoksa oluştur
                $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            }
            
            // Veritabanına bağlan
            $this->conn = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
            
            // Tabloları oluştur (sadece ilk bağlantıda)
            static $tablesCreated = false;
            if (!$tablesCreated) {
                $this->createTables();
                $tablesCreated = true;
            }
            
        } catch (PDOException $e) {
            error_log("Veritabanı bağlantı hatası: " . $e->getMessage());
            throw new Exception("Veritabanı bağlantı hatası: " . $e->getMessage());
        }
    }
    
    private function createTables() {
        $sql = "
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(100),
            profile_picture VARCHAR(255) DEFAULT NULL,
            bio TEXT,
            is_admin TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE IF NOT EXISTS posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            image_url VARCHAR(255) DEFAULT NULL,
            video_url VARCHAR(255) DEFAULT NULL,
            media_type ENUM('image', 'video') DEFAULT 'image',
            car_model VARCHAR(100),
            car_brand VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE IF NOT EXISTS likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            post_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            UNIQUE KEY unique_like (user_id, post_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE IF NOT EXISTS comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            post_id INT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            INDEX idx_post_id (post_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE IF NOT EXISTS events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            event_date DATETIME NOT NULL,
            location VARCHAR(255),
            location_lat DECIMAL(10, 8),
            location_lng DECIMAL(11, 8),
            image_url VARCHAR(255),
            max_participants INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_event_date (event_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE IF NOT EXISTS event_participants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_id INT NOT NULL,
            user_id INT NOT NULL,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_participant (event_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE IF NOT EXISTS follows (
            id INT AUTO_INCREMENT PRIMARY KEY,
            follower_id INT NOT NULL,
            following_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_follow (follower_id, following_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            type ENUM('like', 'comment', 'follow', 'post_mention', 'message') NOT NULL,
            actor_id INT NOT NULL,
            post_id INT DEFAULT NULL,
            comment_id INT DEFAULT NULL,
            message_id INT DEFAULT NULL,
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
        
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            content TEXT NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_sender_id (sender_id),
            INDEX idx_receiver_id (receiver_id),
            INDEX idx_created_at (created_at),
            INDEX idx_is_read (is_read)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        CREATE TABLE IF NOT EXISTS cars (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            brand VARCHAR(100) NOT NULL,
            model VARCHAR(100) NOT NULL,
            year INT,
            color VARCHAR(50),
            engine VARCHAR(100),
            horsepower INT,
            description TEXT,
            image_url VARCHAR(255) DEFAULT NULL,
            is_featured TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_is_featured (is_featured)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        
        // SQL komutlarını ayrı ayrı çalıştır
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        foreach ($statements as $statement) {
            if (!empty($statement)) {
                try {
                    $this->conn->exec($statement);
                } catch (PDOException $e) {
                    // Tablo zaten varsa veya foreign key hatası varsa hata verme
                    $errorMsg = $e->getMessage();
                    if (strpos($errorMsg, 'already exists') !== false || 
                        strpos($errorMsg, 'Duplicate key') !== false ||
                        strpos($errorMsg, 'foreign key constraint') !== false) {
                        // Bu hatalar normal, devam et
                        continue;
                    }
                    error_log("Tablo oluşturma hatası: " . $errorMsg);
                }
            }
        }
        
        // Posts tablosuna eksik sütunları ekle (migration)
        $this->migratePostsTable();
        
        // Users tablosuna is_admin sütununu ekle (migration)
        $this->migrateUsersTable();
        
        // Cars tablosunu oluştur (migration)
        $this->migrateCarsTable();
    }
    
    /**
     * Cars tablosunu oluşturur (migration)
     */
    private function migrateCarsTable() {
        try {
            $tables = $this->conn->query("SHOW TABLES LIKE 'cars'")->fetchAll();
            if (count($tables) == 0) {
                try {
                    $this->conn->exec("
                        CREATE TABLE IF NOT EXISTS cars (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            user_id INT NOT NULL,
                            brand VARCHAR(100) NOT NULL,
                            model VARCHAR(100) NOT NULL,
                            year INT,
                            color VARCHAR(50),
                            engine VARCHAR(100),
                            horsepower INT,
                            description TEXT,
                            image_url VARCHAR(255) DEFAULT NULL,
                            is_featured TINYINT(1) DEFAULT 0,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                            INDEX idx_user_id (user_id),
                            INDEX idx_is_featured (is_featured)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                    ");
                    error_log("Cars tablosu oluşturuldu");
                } catch (PDOException $e) {
                    if (strpos($e->getMessage(), 'already exists') === false) {
                        error_log("Cars tablosu oluşturma hatası: " . $e->getMessage());
                    }
                }
            }
        } catch (PDOException $e) {
            error_log("Cars tablosu migration hatası: " . $e->getMessage());
        }
    }
    
    /**
     * Users tablosuna is_admin sütununu ekler (migration)
     */
    private function migrateUsersTable() {
        try {
            $tables = $this->conn->query("SHOW TABLES LIKE 'users'")->fetchAll();
            if (count($tables) == 0) {
                return;
            }
            
            $columns = $this->conn->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            $hasIsAdmin = in_array('is_admin', $columns);
            
            if (!$hasIsAdmin) {
                try {
                    $this->conn->exec("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0 AFTER bio");
                    error_log("Users tablosuna is_admin sütunu eklendi");
                } catch (PDOException $e) {
                    if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                        error_log("is_admin ekleme hatası: " . $e->getMessage());
                    }
                }
            }
        } catch (PDOException $e) {
            error_log("Users tablosu migration hatası: " . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }
    
    /**
     * Posts tablosuna video_url ve media_type sütunlarını ekler (migration)
     * Ayrıca image_url ve video_url sütunlarını NULL yapılabilir hale getirir
     */
    private function migratePostsTable() {
        try {
            // Önce posts tablosunun var olup olmadığını kontrol et
            $tables = $this->conn->query("SHOW TABLES LIKE 'posts'")->fetchAll();
            if (count($tables) == 0) {
                // Tablo yoksa migration yapmaya gerek yok, createTables zaten oluşturacak
                return;
            }
            
            // Sütunların var olup olmadığını kontrol et
            $columns = $this->conn->query("SHOW COLUMNS FROM posts")->fetchAll(PDO::FETCH_COLUMN);
            $hasVideoUrl = in_array('video_url', $columns);
            $hasMediaType = in_array('media_type', $columns);
            
            // image_url sütununu NULL yapılabilir hale getir
            try {
                $imageColumn = $this->conn->query("SHOW COLUMNS FROM posts WHERE Field = 'image_url'")->fetch(PDO::FETCH_ASSOC);
                if ($imageColumn && $imageColumn['Null'] === 'NO') {
                    $this->conn->exec("ALTER TABLE posts MODIFY COLUMN image_url VARCHAR(255) DEFAULT NULL");
                    error_log("Posts tablosunda image_url sütunu NULL yapılabilir hale getirildi");
                }
            } catch (PDOException $e) {
                error_log("image_url NULL yapma hatası: " . $e->getMessage());
            }
            
            // video_url sütununu ekle
            if (!$hasVideoUrl) {
                try {
                    $this->conn->exec("ALTER TABLE posts ADD COLUMN video_url VARCHAR(255) DEFAULT NULL AFTER image_url");
                    error_log("Posts tablosuna video_url sütunu eklendi");
                } catch (PDOException $e) {
                    // Sütun zaten varsa veya başka bir hata varsa
                    if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                        error_log("video_url ekleme hatası: " . $e->getMessage());
                    }
                }
            } else {
                // video_url zaten varsa, NULL yapılabilir olduğundan emin ol
                try {
                    $videoColumn = $this->conn->query("SHOW COLUMNS FROM posts WHERE Field = 'video_url'")->fetch(PDO::FETCH_ASSOC);
                    if ($videoColumn && $videoColumn['Null'] === 'NO') {
                        $this->conn->exec("ALTER TABLE posts MODIFY COLUMN video_url VARCHAR(255) DEFAULT NULL");
                        error_log("Posts tablosunda video_url sütunu NULL yapılabilir hale getirildi");
                    }
                } catch (PDOException $e) {
                    error_log("video_url NULL yapma hatası: " . $e->getMessage());
                }
            }
            
            // media_type sütununu ekle
            if (!$hasMediaType) {
                try {
                    $this->conn->exec("ALTER TABLE posts ADD COLUMN media_type ENUM('image', 'video') DEFAULT 'image' AFTER video_url");
                    error_log("Posts tablosuna media_type sütunu eklendi");
                } catch (PDOException $e) {
                    // Sütun zaten varsa veya başka bir hata varsa
                    if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                        error_log("media_type ekleme hatası: " . $e->getMessage());
                    }
                }
            }
            
            // Mevcut kayıtlar için media_type'ı güncelle
            try {
                $this->conn->exec("UPDATE posts SET media_type = 'image' WHERE (image_url IS NOT NULL AND image_url != '') AND (media_type IS NULL OR media_type = '')");
                $this->conn->exec("UPDATE posts SET media_type = 'video' WHERE video_url IS NOT NULL AND video_url != ''");
            } catch (PDOException $e) {
                // Hata olursa devam et
                error_log("Media type güncelleme hatası: " . $e->getMessage());
            }
        } catch (PDOException $e) {
            // Tablo yoksa veya başka bir hata varsa sessizce devam et
            error_log("Posts tablosu migration hatası: " . $e->getMessage());
        } catch (Exception $e) {
            error_log("Posts tablosu migration genel hatası: " . $e->getMessage());
        }
    }

    // Bağlantıyı kopyalamayı engelle
    private function __clone() {}
    
    // Unserialize'ı engelle
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

function getDB() {
    try {
    return Database::getInstance()->getConnection();
    } catch (Exception $e) {
        // JSON API için hata döndür
        if (php_sapi_name() !== 'cli') {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
        throw $e;
    }
}

