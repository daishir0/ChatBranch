<?php
/**
 * ChatBranch Web-Based Setup Interface
 */

// Check if already installed
if (file_exists('config.php')) {
    header('Location: index.php');
    exit;
}

$step = intval($_GET['step'] ?? 1);
$errors = [];
$success = '';

// Step 2: Actual installation process
if ($_POST['action'] ?? '' === 'install') {
    try {
        // Validation
        $username = trim($_POST['username'] ?? '');
        $password = trim($_POST['password'] ?? '');
        $openai_key = trim($_POST['openai_key'] ?? '');
        $base_url = trim($_POST['base_url'] ?? '');
        
        if (empty($username)) $errors[] = 'Username is required';
        if (empty($password)) $errors[] = 'Password is required';
        if (strlen($password) < 1) $errors[] = 'Password must be at least 1 character long';
        if (empty($openai_key)) $errors[] = 'OpenAI API key is required';
        if (!preg_match('/^sk-[a-zA-Z0-9]+/', $openai_key)) $errors[] = 'OpenAI API key format is invalid';
        
        if (empty($errors)) {
            // Execute installation
            $result = performInstallation($username, $password, $openai_key, $base_url);
            if ($result['success']) {
                $step = 3; // Completion step
                $success = $result['message'];
                $instanceId = $result['instance_id'];
            } else {
                $errors[] = $result['error'];
            }
        }
    } catch (Exception $e) {
        $errors[] = 'Installation Error: ' . $e->getMessage();
    }
}

function performInstallation($username, $password, $openai_key, $base_url) {
    try {
        // 1. Generate secure instance configuration
        $instanceId = bin2hex(random_bytes(12));
        $secretKey = bin2hex(random_bytes(32));
        
        // 2. Create directories
        $dataDir = __DIR__ . '/data';
        $logsDir = __DIR__ . '/logs';
        $uploadsDir = __DIR__ . '/uploads';
        
        if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);
        if (!is_dir($logsDir)) mkdir($logsDir, 0755, true);
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);
        
        // 3. Protect data directory with .htaccess
        $htaccessContent = "# ChatBranch Data Protection\nOrder deny,allow\nDeny from all\n";
        file_put_contents($dataDir . '/.htaccess', $htaccessContent);
        
        // 4. Generate configuration file
        $dbName = "chotgpt_{$instanceId}.db";
        
        $config = [
            'instance_id' => $instanceId,
            'secret_key' => $secretKey,
            'database' => [
                'type' => 'sqlite',
                'path' => $dataDir . '/' . $dbName,
            ],
            'auth' => [
                'username' => $username,
                'password' => $password,
            ],
            'openai' => [
                'api_key' => $openai_key,
                'default_model' => 'gpt-4o-mini',
                'max_tokens' => 128000,
                'temperature' => 0.7,
                'context_window_limit' => 128000,
                'compression_chunk_size' => 4000,
                'compression_overlap' => 500,
                'compression_ratio' => 0.3,
            ],
            'system' => [
                'default_prompt' => 'You are a helpful assistant.',
                'debug' => false,
                'log_level' => 'info',
                'log_rotation_days' => 30,
                'max_file_size' => 10 * 1024 * 1024,
                'base_url' => $base_url,
            ],
            'security' => [
                'csrf_token_name' => 'csrf_token',
                'session_timeout' => 3600,
            ],
            'upload' => [
                'allowed_types' => ['pdf', 'txt', 'docx', 'pptx', 'xlsx', 'md', 'csv'],
                'max_size' => 5 * 1024 * 1024,
                'storage_path' => $uploadsDir,
            ],
        ];

        $configContent = "<?php\n// ChatBranch Configuration File\n// Generated: " . date('Y-m-d H:i:s') . "\n// Instance: {$instanceId}\n\nreturn " . var_export($config, true) . ";\n";
        
        file_put_contents('config.php', $configContent);
        chmod('config.php', 0600);
        
        // 5. Test database initialization
        require_once 'classes/Database.php';
        $db = Database::getInstance($config);
        
        return [
            'success' => true,
            'message' => 'Installation completed successfully!',
            'instance_id' => $instanceId
        ];
        
    } catch (Exception $e) {
        // Cleanup on error
        if (file_exists('config.php')) {
            unlink('config.php');
        }
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChatBranch Setup</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }
        .setup-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 90%;
            overflow: hidden;
        }
        .setup-header {
            background: #2d3748;
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .setup-header h1 {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
        }
        .setup-header p {
            opacity: 0.8;
            font-size: 0.9rem;
        }
        .setup-body {
            padding: 2rem;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #2d3748;
        }
        .form-group input, .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .form-group small {
            display: block;
            margin-top: 0.25rem;
            color: #666;
            font-size: 0.85rem;
        }
        .btn {
            background: #667eea;
            color: white;
            padding: 0.75rem 2rem;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.2s;
            width: 100%;
        }
        .btn:hover {
            background: #5a67d8;
        }
        .btn:disabled {
            background: #a0aec0;
            cursor: not-allowed;
        }
        .alert {
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 1.5rem;
        }
        .alert-error {
            background: #fed7d7;
            border: 1px solid #feb2b2;
            color: #c53030;
        }
        .alert-success {
            background: #c6f6d5;
            border: 1px solid #9ae6b4;
            color: #276749;
        }
        .requirements {
            background: #f7fafc;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 1.5rem;
        }
        .requirements h3 {
            margin-bottom: 0.5rem;
            color: #2d3748;
        }
        .requirements ul {
            list-style: none;
            padding-left: 0;
        }
        .requirements li {
            padding: 0.25rem 0;
            display: flex;
            align-items: center;
        }
        .requirements li::before {
            content: "✅";
            margin-right: 0.5rem;
        }
        .step-indicator {
            display: flex;
            justify-content: center;
            margin-bottom: 2rem;
        }
        .step {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            background: #e2e8f0;
            color: #a0aec0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin: 0 0.5rem;
        }
        .step.active {
            background: #667eea;
            color: white;
        }
        .step.completed {
            background: #38a169;
            color: white;
        }
        .completion-message {
            text-align: center;
        }
        .completion-message h2 {
            color: #38a169;
            margin-bottom: 1rem;
        }
        .completion-message .instance-info {
            background: #f7fafc;
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
            text-align: left;
        }
        .completion-message .warning {
            background: #fed7d7;
            border: 1px solid #feb2b2;
            color: #c53030;
            padding: 1rem;
            border-radius: 6px;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="setup-container">
        <div class="setup-header">
            <h1>🚀 ChatBranch Setup</h1>
            <p>Initial configuration for ChatGPT clone system</p>
        </div>
        
        <div class="setup-body">
            <div class="step-indicator">
                <div class="step <?= $step >= 1 ? ($step > 1 ? 'completed' : 'active') : '' ?>">1</div>
                <div class="step <?= $step >= 2 ? ($step > 2 ? 'completed' : 'active') : '' ?>">2</div>
                <div class="step <?= $step >= 3 ? 'active' : '' ?>">3</div>
            </div>
            

            <?php if ($step === 1): ?>
                <!-- Step 1: System requirements check -->
                <div class="requirements">
                    <h3>System Requirements Check</h3>
                    <ul>
                        <li>PHP <?= PHP_VERSION ?></li>
                        <li>PDO SQLite Extension</li>
                        <li>cURL Extension</li>
                        <li>JSON Extension</li>
                        <li>Write Permissions</li>
                    </ul>
                </div>
                
                <p style="margin-bottom: 2rem; color: #666;">
                    Configure the necessary settings to use ChatBranch.<br>
                    You will need an OpenAI API key and login information.
                </p>
                
                <form method="get">
                    <input type="hidden" name="step" value="2">
                    <button type="submit" class="btn">Start Configuration</button>
                </form>

            <?php elseif ($step == 2): ?>
                <!-- Step 2: Configuration input -->
                <?php if (!empty($errors)): ?>
                    <div class="alert alert-error">
                        <ul style="margin: 0; padding-left: 1.5rem;">
                            <?php foreach ($errors as $error): ?>
                                <li><?= htmlspecialchars($error) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>

                <form method="post">
                    <input type="hidden" name="action" value="install">
                    
                    <div class="form-group">
                        <label for="username">Administrator Username *</label>
                        <input type="text" id="username" name="username" value="<?= htmlspecialchars($_POST['username'] ?? 'admin') ?>" required>
                        <small>Username for Basic authentication</small>
                    </div>

                    <div class="form-group">
                        <label for="password">Administrator Password *</label>
                        <input type="password" id="password" name="password" required minlength="1">
                        <small>Please set a password of at least 1 character</small>
                    </div>

                    <div class="form-group">
                        <label for="openai_key">OpenAI API Key *</label>
                        <input type="text" id="openai_key" name="openai_key" value="<?= htmlspecialchars($_POST['openai_key'] ?? '') ?>" required placeholder="sk-...">
                        <small>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI API Keys</a></small>
                    </div>

                    <div class="form-group">
                        <label for="base_url">Base URL (Optional)</label>
                        <input type="text" id="base_url" name="base_url" value="<?= htmlspecialchars($_POST['base_url'] ?? '') ?>" placeholder="/chat2">
                        <small>Leave blank for auto-detection (example: /chat2)</small>
                    </div>

                    <button type="submit" class="btn">Start Installation</button>
                </form>

            <?php elseif ($step == 3): ?>
                <!-- Step 3: Completion -->
                <div class="completion-message">
                    <h2>🎉 Setup Complete!</h2>
                    
                    <?php if (!empty($success)): ?>
                        <div class="alert alert-success">
                            <?= htmlspecialchars($success) ?>
                        </div>
                    <?php endif; ?>

                    <div class="instance-info">
                        <strong>Instance Information:</strong><br>
                        Instance ID: <code><?= htmlspecialchars($instanceId ?? 'Unknown') ?></code><br>
                        Database: <code>chotgpt_<?= htmlspecialchars($instanceId ?? 'Unknown') ?>.db</code><br>
                        Data Directory: <code>./data/</code>
                    </div>

                    <p style="margin: 1.5rem 0;">
                        ChatBranch is now ready to use.<br>
                        You can start the application using the button below.
                    </p>

                    <div class="warning">
                        <strong>⚠️ Important Security Notice</strong><br>
                        For security reasons, it is strongly recommended to delete this file:<br>
                        <code>setup.php</code><br>
                        <small>To delete: <code>rm setup.php</code></small>
                    </div>

                    <div style="margin-top: 2rem;">
                        <a href="index.php" class="btn" style="text-decoration: none; display: inline-block; text-align: center;">
                            Start ChatBranch
                        </a>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <script>
        // Form submission confirmation
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.querySelector('form[method="post"]');
            if (form) {
                form.addEventListener('submit', function(e) {
                    const btn = form.querySelector('.btn');
                    btn.disabled = true;
                    btn.textContent = 'Installing...';
                });
            }
        });
    </script>
</body>
</html>