<?php

class DatabaseInitializer {
    private $configPath;
    private $config;
    
    public function __construct($configPath = null) {
        $this->configPath = $configPath ?? __DIR__ . '/../config.php';
    }
    
    public function initializeDatabase() {
        // Load configuration file
        $this->config = require $this->configPath;
        
        // Check if database path is configured
        if (!isset($this->config['database']['path']) || empty($this->config['database']['path'])) {
            // First startup: Generate random DB file and save config
            return $this->createInitialDatabase();
        }
        
        $dbPath = $this->config['database']['path'];
        
        // If configured path is random generation format (changes every time)
        if (strpos($dbPath, 'random_bytes') !== false || strpos($dbPath, 'bin2hex') !== false) {
            // Old format config: migrate to new fixed DB
            return $this->migrateToFixedDatabase();
        }
        
        // Check if existing DB file exists
        if (!file_exists($dbPath)) {
            // If DB file is deleted: clear config and reinitialize
            return $this->createInitialDatabase();
        }
        
        // Use existing DB
        return $this->config;
    }
    
    private function createInitialDatabase() {
        // ランダムなDBファイル名を生成
        $randomName = 'chotgpt_' . bin2hex(random_bytes(8)) . '.db';
        $dbPath = dirname($this->configPath) . '/' . $randomName;
        
        // 設定を更新
        $this->config['database']['path'] = $dbPath;
        
        // 設定ファイルを更新して保存
        $this->saveConfig();
        
        // データベースファイルを作成
        $this->createDatabaseFile($dbPath);
        
        return $this->config;
    }
    
    private function migrateToFixedDatabase() {
        // 既存のDBファイルを探す
        $configDir = dirname($this->configPath);
        $existingDbs = glob($configDir . '/chatgpt_*.db');
        
        if (!empty($existingDbs)) {
            // 最新のDBファイルを使用
            usort($existingDbs, function($a, $b) {
                return filemtime($b) - filemtime($a);
            });
            
            $latestDb = $existingDbs[0];
            $this->config['database']['path'] = $latestDb;
            $this->saveConfig();
            
            // 古いDBファイルをクリーンアップ（最新以外）
            for ($i = 1; $i < count($existingDbs); $i++) {
                @unlink($existingDbs[$i]);
            }
            
            return $this->config;
        }
        
        // 既存DBが見つからない場合は新規作成
        return $this->createInitialDatabase();
    }
    
    private function createDatabaseFile($dbPath) {
        // Database クラスを使ってDBファイルとテーブルを作成
        try {
            require_once __DIR__ . '/Database.php';
            $tempConfig = ['database' => ['path' => $dbPath]];
            $db = Database::getInstance($tempConfig);
            // Table creation is automatically executed within the Database class
        } catch (Exception $e) {
            error_log("Database creation failed: " . $e->getMessage());
            throw $e;
        }
    }
    
    private function saveConfig() {
        $configContent = $this->generateConfigContent($this->config);
        
        // Create backup
        if (file_exists($this->configPath)) {
            copy($this->configPath, $this->configPath . '.backup');
        }
        
        // Save new configuration
        file_put_contents($this->configPath, $configContent, LOCK_EX);
    }
    
    private function generateConfigContent($config) {
        $content = "<?php\n";
        $content .= "// ChatBranch Configuration File\n";
        $content .= "// Database path automatically configured on first run\n\n";
        $content .= "return [\n";
        
        foreach ($config as $section => $values) {
            $content .= "    // " . ucfirst($section) . " 設定\n";
            $content .= "    '{$section}' => [\n";
            
            foreach ($values as $key => $value) {
                if (is_array($value)) {
                    $content .= "        '{$key}' => [\n";
                    foreach ($value as $subKey => $subValue) {
                        $content .= "            '{$subKey}' => " . var_export($subValue, true) . ",\n";
                    }
                    $content .= "        ],\n";
                } else {
                    $content .= "        '{$key}' => " . var_export($value, true) . ",\n";
                }
            }
            
            $content .= "    ],\n\n";
        }
        
        $content .= "];\n";
        
        return $content;
    }
    
    public function cleanupOldDatabases() {
        $configDir = dirname($this->configPath);
        $currentDbPath = $this->config['database']['path'] ?? '';
        
        // 古いDBファイルを検索
        $dbFiles = glob($configDir . '/chatgpt_*.db');
        $dbFiles = array_merge($dbFiles, glob($configDir . '/chotgpt_*.db'));
        
        $cleaned = 0;
        foreach ($dbFiles as $dbFile) {
            // 現在使用中のDBファイル以外を削除
            if ($dbFile !== $currentDbPath && filemtime($dbFile) < time() - 3600) { // 1時間以上古い
                if (@unlink($dbFile)) {
                    $cleaned++;
                }
            }
        }
        
        return $cleaned;
    }
    
    public function getDatabaseInfo() {
        if (!isset($this->config['database']['path'])) {
            return null;
        }
        
        $dbPath = $this->config['database']['path'];
        
        return [
            'path' => $dbPath,
            'exists' => file_exists($dbPath),
            'size' => file_exists($dbPath) ? filesize($dbPath) : 0,
            'created' => file_exists($dbPath) ? date('Y-m-d H:i:s', filectime($dbPath)) : null,
            'modified' => file_exists($dbPath) ? date('Y-m-d H:i:s', filemtime($dbPath)) : null
        ];
    }
}