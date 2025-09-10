<?php
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once '../classes/Database.php';
require_once '../classes/Auth.php';
require_once '../classes/Logger.php';
require_once '../classes/FileManager.php';
require_once '../classes/DatabaseInitializer.php';

try {
    // データベースを初期化（初回起動時のみ作成）
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
    $fileManager = new FileManager($db, $logger, $config);
    
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'upload':
            handleUpload($fileManager, $auth, $_FILES, $_POST);
            break;
            
        case 'list':
            handleList($fileManager, $_GET);
            break;
            
        case 'search':
            handleSearch($fileManager, $_GET);
            break;
            
        case 'get':
            handleGet($fileManager, $_GET);
            break;
            
        case 'delete':
            // Support both POST (with CSRF) and DELETE (without CSRF for file manager)
            if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                handleDeleteFile($fileManager, $_GET);
            } else {
                handleDelete($fileManager, $auth, $_POST);
            }
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    if (isset($logger)) {
        $logger->error('Files API Error', ['error' => $e->getMessage()]);
    }
}

function handleUpload($fileManager, $auth, $files, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    if (!isset($files['file'])) {
        throw new Exception('No file uploaded');
    }
    
    $fileId = $fileManager->uploadFile($files['file']);
    $file = $fileManager->getFile($fileId);
    
    // アップロード時は軽量レスポンス（内容は含まない）
    echo json_encode([
        'success' => true,
        'file_id' => $fileId,
        'file' => [
            'id' => $file['id'],
            'original_name' => $file['original_name'],
            'file_size' => $file['file_size'],
            'created_at' => $file['created_at'],
            'metadata' => json_decode($file['metadata'] ?? '{}', true)
        ]
    ]);
}

function handleList($fileManager, $params) {
    $limit = intval($params['limit'] ?? 50);
    $offset = intval($params['offset'] ?? 0);
    
    $files = $fileManager->getFiles($limit, $offset);
    
    // Format files for file manager list - lightweight response without content
    $formattedFiles = array_map(function($file) {
        return [
            'id' => $file['id'],
            'original_name' => $file['original_name'],
            'metadata' => json_decode($file['metadata'] ?? '{}', true),
            'file_size' => $file['file_size'],
            'created_at' => $file['created_at']
        ];
    }, $files);
    
    // Re-index array
    $formattedFiles = array_values($formattedFiles);
    
    echo json_encode([
        'success' => true,
        'files' => $formattedFiles
    ]);
}

function handleSearch($fileManager, $params) {
    $query = $params['q'] ?? '';
    $limit = intval($params['limit'] ?? 20);
    
    if (empty($query)) {
        throw new Exception('Search query required');
    }
    
    $files = $fileManager->searchFiles($query, $limit);
    
    // Format search results to expose markdown content as main content
    $formattedFiles = array_map(function($file) {
        $content = $file['content_markdown'] ?? '';
        // Clean UTF-8 content more aggressively
        $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content); // Remove control chars
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8'); // Clean UTF-8
        $preview = mb_strlen($content) > 200 ? mb_substr($content, 0, 200) . '...' : $content;
        
        return [
            'id' => $file['id'],
            'original_name' => $file['original_name'],
            'content' => $content, // Main content is markdown
            'content_preview' => $preview, // Safe preview
            'metadata' => json_decode($file['metadata'] ?? '{}', true),
            'file_size' => $file['file_size'],
            'created_at' => $file['created_at'],
            'has_meaningful_content' => hasMeaningfulContent($content)
        ];
    }, $files);
    
    // Filter out files without meaningful content
    $formattedFiles = array_filter($formattedFiles, function($file) {
        return $file['has_meaningful_content'];
    });
    
    // Remove the has_meaningful_content flag from the response
    $formattedFiles = array_map(function($file) {
        unset($file['has_meaningful_content']);
        return $file;
    }, $formattedFiles);
    
    // Re-index array after filtering
    $formattedFiles = array_values($formattedFiles);
    
    echo json_encode([
        'success' => true,
        'files' => $formattedFiles,
        'query' => $query
    ]);
}

function handleGet($fileManager, $params) {
    $fileId = $params['id'] ?? null;
    
    if (!$fileId) {
        throw new Exception('File ID required');
    }
    
    $file = $fileManager->getFile($fileId);
    
    if (!$file) {
        throw new Exception('File not found');
    }
    
    // Return file info with markdown content as the main content
    $content = $file['content_markdown'] ?? '';
    $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content); // Remove control chars
    $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8'); // Clean UTF-8
    
    // Note: Allow all files for copy functionality, even if they don't have meaningful markdown content
    
    echo json_encode([
        'success' => true,
        'file' => [
            'id' => $file['id'],
            'original_name' => $file['original_name'],
            'content' => $content, // Main content is the markdown version
            'content_markdown' => $content, // Also available as explicit markdown
            'metadata' => json_decode($file['metadata'] ?? '{}', true),
            'file_size' => $file['file_size'],
            'created_at' => $file['created_at']
        ]
    ]);
}

function handleDelete($fileManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $fileId = $data['file_id'] ?? null;
    
    if (!$fileId) {
        throw new Exception('File ID required');
    }
    
    $fileManager->deleteFile($fileId);
    
    echo json_encode(['success' => true]);
}

function handleDeleteFile($fileManager, $params) {
    $fileId = $params['id'] ?? null;
    
    if (!$fileId) {
        throw new Exception('File ID required');
    }
    
    try {
        $fileManager->deleteFile($fileId);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        // Log detailed error
        if (isset($fileManager) && method_exists($fileManager, 'logger')) {
            $fileManager->logger->error('File deletion failed', [
                'file_id' => $fileId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        throw $e;
    }
}

function hasMeaningfulContent($content) {
    $content = trim($content);
    
    // Empty content
    if (empty($content)) {
        return false;
    }
    
    // Generic "not implemented" or "not available" messages
    $genericMessages = [
        'PowerPoint parsing not yet implemented',
        'PDF parsing not available',
        'Word document parsing not available',
        'Spreadsheet parsing not available',
        'Unsupported file format'
    ];
    
    foreach ($genericMessages as $generic) {
        if (strpos($content, $generic) !== false) {
            return false;
        }
    }
    
    // Content that's too short (probably just a header)
    if (strlen($content) < 50) {
        return false;
    }
    
    return true;
}