<?php
/**
 * ChatBranch Setup & Installation Script
 * 初回実行時のみ実行してください
 */

// 既にインストール済みかチェック
if (file_exists('config.php')) {
    die('❌ Already installed! Delete config.php to reinstall.');
}

echo "🚀 ChatBranch Installation Starting...\n";
echo str_repeat("=", 50) . "\n";

try {
    // 1. セキュアなインスタンス設定生成
    echo "📝 Generating secure configuration...\n";
    $instanceId = bin2hex(random_bytes(12));
    $secretKey = bin2hex(random_bytes(32));
    
    echo "   Instance ID: {$instanceId}\n";
    
    // 2. データディレクトリの作成
    echo "📁 Creating data directory...\n";
    $dataDir = __DIR__ . '/data';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
        echo "   Created: {$dataDir}\n";
    }
    
    // 3. .htaccessでデータディレクトリを保護
    $htaccessContent = "# ChatBranch Data Protection\nOrder deny,allow\nDeny from all\n";
    file_put_contents($dataDir . '/.htaccess', $htaccessContent);
    echo "   Protected data directory with .htaccess\n";
    
    // 4. ログディレクトリの作成
    $logsDir = __DIR__ . '/logs';
    if (!is_dir($logsDir)) {
        mkdir($logsDir, 0755, true);
        echo "   Created: {$logsDir}\n";
    }
    
    // 5. アップロードディレクトリの作成
    $uploadsDir = __DIR__ . '/uploads';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
        echo "   Created: {$uploadsDir}\n";
    }
    
    // 6. 設定ファイルの生成
    echo "⚙️  Generating configuration file...\n";
    $dbName = "chotgpt_{$instanceId}.db";
    
    $config = [
        // インスタンス設定
        'instance_id' => $instanceId,
        'secret_key' => $secretKey,
        
        // データベース設定
        'database' => [
            'type' => 'sqlite',
            'path' => $dataDir . '/' . $dbName,
        ],

        // 認証設定
        'auth' => [
            'username' => 'admin',
            'password' => 'your_password_here',
        ],

        // OpenAI API設定
        'openai' => [
            'api_key' => 'your_openai_api_key_here',
            'default_model' => 'gpt-5-mini',
            'max_tokens' => 128000,
            'temperature' => 0.7,
            // コンテキスト圧縮設定
            'context_window_limit' => 128000, // モデルのコンテキストウィンドウサイズ
            'compression_chunk_size' => 4000, // 圧縮時の各チャンクサイズ（トークン）
            'compression_overlap' => 500,     // チャンク間のオーバーラップサイズ（トークン）
            'compression_ratio' => 0.3,       // 圧縮比率（0.3 = 30%に圧縮）
        ],

        // システム設定
        'system' => [
            'default_prompt' => 'You are a helpful assistant.',
            'debug' => false,
            'log_level' => 'info', // debug, info, warning, error
            'log_rotation_days' => 30,
            'max_file_size' => 10 * 1024 * 1024, // 10MB
            'base_url' => '', // Auto-detected if empty, e.g.: '/chat2' or 'https://example.com/chat2'
            'timezone' => 'UTC', // Timezone setting
        ],

        // Security settings
        'security' => [
            'csrf_token_name' => 'csrf_token',
            'session_timeout' => 3600, // 1 hour
        ],

        // アップロード設定
        'upload' => [
            'allowed_types' => [
                // PDF files
                'pdf',
                // Word documents
                'doc', 'docx',
                // Excel spreadsheets
                'xls', 'xlsx',
                // PowerPoint presentations
                'ppt', 'pptx',
                // Text files - basic
                'txt', 'md', 'markdown',
                // Text files - data formats
                'csv', 'json', 'xml',
                // Text files - logs and config
                'log', 'conf', 'config', 'ini', 'properties',
                // Text files - web and programming
                'html', 'htm', 'css', 'js', 'ts', 'php', 'py', 'sql', 'yaml', 'yml', 'toml',
                // Text files - other
                'rtf', 'bat', 'sh',
            ],
            'max_size' => 15 * 1024 * 1024, // 15MB
            'storage_path' => $uploadsDir,
        ],
    ];

    $configContent = "<?php\n// ChatBranch Configuration File\n// Generated: " . date('Y-m-d H:i:s') . "\n// Instance: {$instanceId}\n\nreturn " . var_export($config, true) . ";\n";
    
    file_put_contents('config.php', $configContent);
    chmod('config.php', 0600);
    
    echo "   Config file created: config.php\n";
    echo "   Database will be: {$dbName}\n";
    
    // 7. データベース初期化テスト
    echo "🗄️  Testing database connection...\n";
    require_once 'classes/Database.php';
    require_once 'classes/DatabaseInitializer.php';
    
    $db = Database::getInstance($config);
    echo "   Database connection successful!\n";
    
    // 8. 成功メッセージ
    echo "\n" . str_repeat("=", 50) . "\n";
    echo "✅ Installation completed successfully!\n";
    echo "\n📋 Next steps:\n";
    echo "1. Edit config.php and set your credentials:\n";
    echo "   - auth.username and auth.password\n";
    echo "   - openai.api_key\n";
    echo "2. Delete install.php for security\n";
    echo "3. Access your application\n";
    echo "\n🔐 Your instance details:\n";
    echo "   Instance ID: {$instanceId}\n";
    echo "   Database: {$dbName}\n";
    echo "   Data directory: ./data/\n";
    echo "\n⚠️  IMPORTANT: Please delete install.php after setup!\n";
    
} catch (Exception $e) {
    echo "\n❌ Installation failed: " . $e->getMessage() . "\n";
    
    // クリーンアップ
    if (file_exists('config.php')) {
        unlink('config.php');
    }
    
    exit(1);
}

echo "\n🎉 Ready to use ChatBranch!\n";
?>