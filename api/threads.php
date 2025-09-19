<?php
ini_set('memory_limit', '256M');
ini_set('max_execution_time', 60);
header('Content-Type: application/json');

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Basic authentication check
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

try {
    require_once '../classes/Database.php';
    require_once '../classes/Auth.php';
    require_once '../classes/Logger.php';
    require_once '../classes/ChatManager.php';
    require_once '../classes/DatabaseInitializer.php';
    
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
    $chatManager = new ChatManager($db, $logger);
    
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'list':
            $threads = $chatManager->getThreads();
            
            // UTF-8エンコーディング修正
            $cleanThreads = array_map(function($thread) {
                foreach ($thread as $key => $value) {
                    if (is_string($value)) {
                        // 不正なUTF-8文字を削除・修正
                        $thread[$key] = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
                        // 制御文字を除去
                        $thread[$key] = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $thread[$key]);
                    }
                }
                return $thread;
            }, $threads);
            
            echo json_encode([
                'success' => true,
                'threads' => $cleanThreads
            ]);
            break;
            
        case 'create':
            handleCreate($chatManager, $auth, $_POST);
            break;
            
        case 'create_empty':
            handleCreateEmpty($chatManager, $auth, $_POST);
            break;
            
        case 'get':
            handleGet($chatManager, $_GET);
            break;
            
        case 'update':
            handleUpdate($chatManager, $auth, $_POST);
            break;
            
        case 'delete':
            // FormData for POST requests
            $postData = $_POST;
            if (empty($postData) && $_SERVER['CONTENT_TYPE'] === 'application/x-www-form-urlencoded') {
                parse_str(file_get_contents('php://input'), $postData);
            }
            handleDelete($chatManager, $auth, $postData);
            break;
            
        case 'tree':
            handleGetTree($chatManager, $_GET);
            break;
            
        case 'get_persona':
            handleGetPersona($chatManager, $_GET);
            break;
            
        case 'set_persona':
            $input = json_decode(file_get_contents('php://input'), true);
            handleSetPersona($chatManager, $auth, $input);
            break;

        case 'archive':
            $postData = $_POST;
            if (empty($postData) && $_SERVER['CONTENT_TYPE'] === 'application/x-www-form-urlencoded') {
                parse_str(file_get_contents('php://input'), $postData);
            }
            handleArchive($chatManager, $auth, $postData);
            break;

        case 'unarchive':
            $postData = $_POST;
            if (empty($postData) && $_SERVER['CONTENT_TYPE'] === 'application/x-www-form-urlencoded') {
                parse_str(file_get_contents('php://input'), $postData);
            }
            handleUnarchive($chatManager, $auth, $postData);
            break;

        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    if (isset($logger)) {
        $logger->error('Threads API Error', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    }
} catch (Error $e) {
    http_response_code(500);
    echo json_encode(['error' => 'PHP Error: ' . $e->getMessage()]);
    error_log('Threads API PHP Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Unexpected error: ' . $e->getMessage()]);
    error_log('Threads API Unexpected Error: ' . $e->getMessage());
}

function handleList($chatManager) {
    $threads = $chatManager->getThreads();
    
    $response = json_encode([
        'success' => true,
        'threads' => $threads
    ]);
    
    echo $response;
}

function handleCreate($chatManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $name = $auth->sanitizeInput($data['name'] ?? '');
    
    if (empty($name)) {
        throw new Exception('Thread name required');
    }
    
    $threadId = $chatManager->createThread($name);
    $thread = $chatManager->getThread($threadId);
    
    echo json_encode([
        'success' => true,
        'thread' => $thread
    ]);
}

function handleCreateEmpty($chatManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    // タイムスタンプ付きのスレッド名を生成
    $timestamp = date('Y-m-d H:i');
    $name = 'New Chat ' . $timestamp;
    
    $threadId = $chatManager->createThread($name);
    $thread = $chatManager->getThread($threadId);
    
    echo json_encode([
        'success' => true,
        'thread_id' => $threadId,
        'thread_name' => $name,
        'thread' => $thread
    ]);
}

function handleGet($chatManager, $params) {
    $threadId = $params['id'] ?? null;
    
    if (!$threadId) {
        throw new Exception('Thread ID required');
    }
    
    $thread = $chatManager->getThread($threadId);
    
    if (!$thread) {
        throw new Exception('Thread not found');
    }
    
    echo json_encode([
        'success' => true,
        'thread' => $thread
    ]);
}

function handleUpdate($chatManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $threadId = $data['thread_id'] ?? null;
    $name = $auth->sanitizeInput($data['name'] ?? '');
    
    if (!$threadId) {
        throw new Exception('Thread ID required');
    }
    
    if (empty($name)) {
        throw new Exception('Thread name required');
    }
    
    $chatManager->updateThreadName($threadId, $name);
    $thread = $chatManager->getThread($threadId);
    
    echo json_encode([
        'success' => true,
        'thread' => $thread
    ]);
}

function handleDelete($chatManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $threadId = $data['thread_id'] ?? null;
    
    if (!$threadId) {
        throw new Exception('Thread ID required');
    }
    
    $chatManager->deleteThread($threadId);
    
    echo json_encode(['success' => true]);
}

function handleGetTree($chatManager, $params) {
    $threadId = $params['id'] ?? null;
    
    if (!$threadId) {
        throw new Exception('Thread ID required');
    }
    
    $tree = $chatManager->getMessageTree($threadId);
    
    echo json_encode([
        'success' => true,
        'tree' => $tree
    ]);
}

function handleGetPersona($chatManager, $params) {
    $threadId = $params['thread_id'] ?? null;
    
    if (!$threadId) {
        throw new Exception('Thread ID required');
    }
    
    $systemPrompt = $chatManager->getThreadSystemPrompt($threadId);
    
    echo json_encode([
        'success' => true,
        'thread_system_prompt' => $systemPrompt
    ]);
}

function handleSetPersona($chatManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $threadId = $data['thread_id'] ?? null;
    $systemPrompt = $auth->sanitizeInput($data['thread_system_prompt'] ?? '');
    
    if (!$threadId) {
        throw new Exception('Thread ID required');
    }
    
    // Validate system prompt length
    if (strlen($systemPrompt) > 50000) {
        throw new Exception('Thread system prompt is too long (max 50000 characters)');
    }
    
    $chatManager->updateThreadSystemPrompt($threadId, $systemPrompt);
    
    echo json_encode([
        'success' => true,
        'message' => 'Thread system prompt updated successfully'
    ]);
}

function handleArchive($chatManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }

    $threadId = $data['thread_id'] ?? null;

    if (!$threadId) {
        throw new Exception('Thread ID required');
    }

    $chatManager->archiveThread($threadId);

    echo json_encode(['success' => true]);
}

function handleUnarchive($chatManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }

    $threadId = $data['thread_id'] ?? null;

    if (!$threadId) {
        throw new Exception('Thread ID required');
    }

    $chatManager->unarchiveThread($threadId);

    echo json_encode(['success' => true]);
}