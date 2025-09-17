<?php
header('Content-Type: application/json');

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Require files
require_once '../classes/Database.php';
require_once '../classes/Auth.php';
require_once '../classes/Logger.php';
require_once '../classes/SettingsManager.php';
require_once '../classes/DatabaseInitializer.php';

try {
    // Initialize database
    $dbInitializer = new DatabaseInitializer(__DIR__ . '/../config.php');
    $config = $dbInitializer->initializeDatabase();
    
    // configから取得したタイムゾーンを設定
    if (isset($config['system']['timezone'])) {
        date_default_timezone_set($config['system']['timezone']);
    } else {
        // フォールバック
        date_default_timezone_set('Asia/Tokyo');
    }
    
    $logger = new Logger($config);
    $auth = new Auth($config);
    
    // Check authentication without output
    if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }
    
    if ($_SERVER['PHP_AUTH_USER'] !== $config['auth']['username'] || 
        $_SERVER['PHP_AUTH_PW'] !== $config['auth']['password']) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }
    
    $db = Database::getInstance($config);
    $settingsManager = new SettingsManager($db, $logger);
    
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'get':
            handleGetSettings($settingsManager);
            break;
            
        case 'save':
            handleSaveSettings($settingsManager, $auth, $logger);
            break;
            
        case 'reset':
            handleResetSettings($settingsManager, $auth, $logger);
            break;
            
        case 'system':
            handleGetSystemConfig($config);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    if (isset($logger)) {
        $logger->error('Settings API Error', ['error' => $e->getMessage()]);
    }
}

function handleGetSettings($settingsManager) {
    try {
        $settings = $settingsManager->getAllSettings();
        
        // Ensure we have the expected structure for frontend compatibility
        $frontendSettings = [
            'model' => $settings['default_model'] ?? 'gpt-4o-mini',
            'systemPrompt' => $settings['system_prompt'] ?? 'You are a helpful assistant.',
            'theme' => $settings['theme'] ?? 'dark'
        ];
        
        echo json_encode([
            'success' => true,
            'settings' => $frontendSettings
        ]);
    } catch (Exception $e) {
        throw new Exception('Failed to get settings: ' . $e->getMessage());
    }
}

function handleSaveSettings($settingsManager, $auth, $logger) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST method required');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$auth->validateCSRFToken($input['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    // Extract settings from input
    $settings = $input['settings'] ?? [];
    
    if (empty($settings)) {
        throw new Exception('No settings provided');
    }
    
    // Map frontend keys to database keys
    $dbSettings = [];
    if (isset($settings['model'])) {
        $dbSettings['default_model'] = $auth->sanitizeInput($settings['model']);
    }
    if (isset($settings['systemPrompt'])) {
        $dbSettings['system_prompt'] = $auth->sanitizeInput($settings['systemPrompt']);
    }
    if (isset($settings['theme'])) {
        $dbSettings['theme'] = $auth->sanitizeInput($settings['theme']);
    }
    
    if (empty($dbSettings)) {
        throw new Exception('No valid settings provided');
    }
    
    $settingsManager->saveSettings($dbSettings);
    
    echo json_encode([
        'success' => true,
        'message' => 'Settings saved successfully'
    ]);
}

function handleResetSettings($settingsManager, $auth, $logger) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST method required');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$auth->validateCSRFToken($input['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $settingsManager->resetToDefaults();
    
    // Get the reset settings to return to frontend
    $settings = $settingsManager->getAllSettings();
    $frontendSettings = [
        'model' => $settings['default_model'] ?? 'gpt-4o-mini',
        'systemPrompt' => $settings['system_prompt'] ?? 'You are a helpful assistant.',
        'theme' => $settings['theme'] ?? 'dark'
    ];
    
    echo json_encode([
        'success' => true,
        'message' => 'Settings reset to defaults',
        'settings' => $frontendSettings
    ]);
}

function handleGetSystemConfig($config) {
    echo json_encode([
        'success' => true,
        'timezone' => $config['system']['timezone'] ?? 'UTC',
        'locale' => 'ja-JP' // 将来的にconfigから取得可能
    ]);
}