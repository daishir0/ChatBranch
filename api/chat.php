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
require_once '../classes/ChatManager.php';
require_once '../classes/OpenAIClient.php';
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
    $chatManager = new ChatManager($db, $logger);
    $openaiClient = new OpenAIClient($config, $logger);
    $fileManager = new FileManager($db, $logger, $config);
    
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'send':
            handleSendMessage($chatManager, $openaiClient, $fileManager, $auth, $logger);
            break;
            
        case 'history':
            handleGetHistory($chatManager, $_GET['thread_id'] ?? null);
            break;
            
        case 'get':
            handleGetMessage($chatManager, $_GET['message_id'] ?? null);
            break;
            
        case 'edit':
            $input = json_decode(file_get_contents('php://input'), true);
            handleEditMessage($chatManager, $auth, $input, $logger);
            break;
            
        case 'delete':
            $input = json_decode(file_get_contents('php://input'), true);
            handleDeleteMessage($chatManager, $auth, $input);
            break;
            
        case 'context':
            $input = json_decode(file_get_contents('php://input'), true);
            handleUpdateContext($chatManager, $auth, $input);
            break;
            
        case 'branch':
            $input = json_decode(file_get_contents('php://input'), true);
            handleCreateBranch($chatManager, $auth, $input, $logger);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    if (isset($logger)) {
        $logger->error('Chat API Error', ['error' => $e->getMessage()]);
    }
}

function handleSendMessage($chatManager, $openaiClient, $fileManager, $auth, $logger) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST method required');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$auth->validateCSRFToken($input['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $threadId = $input['thread_id'] ?? null;
    $message = $auth->sanitizeInput($input['message'] ?? '');
    $parentMessageId = $input['parent_message_id'] ?? null;
    $selectedFiles = $input['files'] ?? [];
    $systemPrompt = $input['system_prompt'] ?? null;
    $model = $input['model'] ?? null;
    
    if (empty($message)) {
        throw new Exception('Message cannot be empty');
    }
    
    if (!$threadId) {
        $threadName = substr($message, 0, 50) . (strlen($message) > 50 ? '...' : '');
        $threadId = $chatManager->createThread($threadName);
    }
    
    $userMessageId = $chatManager->addMessage($threadId, 'user', $message, $parentMessageId);
    
    foreach ($selectedFiles as $fileId) {
        $fileManager->attachFileToMessage($userMessageId, $fileId);
    }
    
    $contextMessages = $chatManager->getContextMessages($userMessageId);
    
    foreach ($selectedFiles as $fileId) {
        $file = $fileManager->getFile($fileId);
        if ($file && $file['content_markdown']) {
            $contextMessages[] = [
                'role' => 'user',
                'content' => "File: " . $file['original_name'] . "\n\n" . $file['content_markdown']
            ];
        }
    }
    
    $compressedContext = $openaiClient->compressContext($contextMessages);
    
    // Get thread system prompt
    $threadSystemPrompt = $chatManager->getThreadSystemPrompt($threadId);
    
    $response = $openaiClient->sendMessage($compressedContext, $model, $systemPrompt, $threadSystemPrompt);
    
    // Check for token limit or empty response issues
    if (empty($response['content'])) {
        if (isset($response['finish_reason']) && $response['finish_reason'] === 'length') {
            throw new Exception('token_limit_exceeded');
        } else {
            throw new Exception('ai_response_empty');
        }
    }
    
    $assistantMessageId = $chatManager->addMessage(
        $threadId, 
        'assistant',
        $response['content'], 
        $userMessageId
    );
    
    echo json_encode([
        'success' => true,
        'thread_id' => $threadId,
        'user_message_id' => $userMessageId,
        'assistant_message_id' => $assistantMessageId,
        'response' => $response['content'],
        'usage' => $response['usage']
    ]);
}

function handleGetHistory($chatManager, $threadId) {
    if (!$threadId) {
        throw new Exception('Thread ID required');
    }
    
    $tree = $chatManager->getMessageTree($threadId);
    $thread = $chatManager->getThread($threadId);
    
    // UTF-8エンコーディング修正
    $cleanThread = cleanUtf8Data($thread);
    $cleanTree = cleanUtf8Data($tree);
    
    echo json_encode([
        'success' => true,
        'thread' => $cleanThread,
        'tree' => $cleanTree
    ]);
}

function handleGetMessage($chatManager, $messageId) {
    if (!$messageId) {
        throw new Exception('Message ID required');
    }
    
    $message = $chatManager->getMessage($messageId);
    
    if (!$message) {
        throw new Exception('Message not found');
    }
    
    echo json_encode([
        'success' => true,
        'message' => $message
    ]);
}

function handleEditMessage($chatManager, $auth, $data, $logger) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $messageId = $data['message_id'] ?? null;
    $newContent = $auth->sanitizeInput($data['content'] ?? '');
    $systemPrompt = $data['system_prompt'] ?? null;
    $model = $data['model'] ?? null;
    
    if (!$messageId || empty($newContent)) {
        throw new Exception('Message ID and content required');
    }
    
    // Get the original message to check if it's a user message
    $originalMessage = $chatManager->getMessage($messageId);
    if (!$originalMessage) {
        throw new Exception('Message not found');
    }
    
    if ($originalMessage['role'] !== 'user') {
        throw new Exception('Only user messages can be edited');
    }
    
    // Update the message content
    $chatManager->updateMessage($messageId, $newContent);
    
    // Delete all child messages (AI responses)
    $deletedCount = $chatManager->deleteChildMessages($messageId);
    
    $logger->info('Message edited and child messages deleted', [
        'message_id' => $messageId,
        'deleted_children' => $deletedCount
    ]);
    
    // Generate new AI response
    $response = generateAIResponse($chatManager, $messageId, $systemPrompt, $model, $logger);
    
    echo json_encode([
        'success' => true,
        'deleted_children' => $deletedCount,
        'ai_response' => $response
    ]);
}

function generateAIResponse($chatManager, $userMessageId, $systemPrompt, $model, $logger) {
    global $config;
    
    try {
        // Get OpenAI client
        $openaiClient = new OpenAIClient($config, $logger);
        
        // Get context messages for the edited message
        $contextMessages = $chatManager->getContextMessages($userMessageId);
        
        // Compress context if needed
        $compressedContext = $openaiClient->compressContext($contextMessages);
        
        // Get thread system prompt
        $threadId = $chatManager->getMessage($userMessageId)['thread_id'];
        $threadSystemPrompt = $chatManager->getThreadSystemPrompt($threadId);
        
        // Send to OpenAI
        $response = $openaiClient->sendMessage($compressedContext, $model, $systemPrompt, $threadSystemPrompt);
        
        // Check for token limit or empty response issues
        if (empty($response['content'])) {
            if (isset($response['finish_reason']) && $response['finish_reason'] === 'length') {
                throw new Exception('token_limit_exceeded');
            } else {
                throw new Exception('ai_response_empty');
            }
        }
        
        // Save AI response as child of the edited message
        $assistantMessageId = $chatManager->addMessage(
            $chatManager->getMessage($userMessageId)['thread_id'], 
            'assistant',
            $response['content'], 
            $userMessageId
        );
        
        $logger->info('AI response generated for edited message', [
            'user_message_id' => $userMessageId,
            'assistant_message_id' => $assistantMessageId,
            'tokens_used' => $response['usage']['total_tokens'] ?? 0
        ]);
        
        return [
            'message_id' => $assistantMessageId,
            'content' => $response['content'],
            'usage' => $response['usage']
        ];
        
    } catch (Exception $e) {
        $logger->error('AI response generation failed', [
            'user_message_id' => $userMessageId,
            'error' => $e->getMessage()
        ]);
        
        // Return error but don't fail the entire edit operation
        return [
            'error' => 'Failed to generate AI response: ' . $e->getMessage()
        ];
    }
}

function handleDeleteMessage($chatManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $messageId = $data['message_id'] ?? null;
    
    if (!$messageId) {
        throw new Exception('Message ID required');
    }
    
    $chatManager->deleteMessage($messageId);
    
    echo json_encode(['success' => true]);
}

function handleUpdateContext($chatManager, $auth, $data) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $messageId = $data['message_id'] ?? null;
    $isContext = $data['is_context'] ?? false;
    
    if (!$messageId) {
        throw new Exception('Message ID required');
    }
    
    $chatManager->updateContextStatus($messageId, $isContext);
    
    echo json_encode(['success' => true]);
}

function handleCreateBranch($chatManager, $auth, $data, $logger) {
    if (!$auth->validateCSRFToken($data['csrf_token'] ?? '')) {
        throw new Exception('Invalid CSRF token');
    }
    
    $clickedMessageId = $data['clicked_message_id'] ?? null;
    $content = $auth->sanitizeInput($data['content'] ?? '');
    $role = $data['role'] ?? 'user';
    $systemPrompt = $data['system_prompt'] ?? null;
    $model = $data['model'] ?? null;
    
    if (!$clickedMessageId || empty($content)) {
        throw new Exception('Clicked message ID and content required');
    }
    
    // Get the clicked message to find its parent
    $clickedMessage = $chatManager->getMessage($clickedMessageId);
    if (!$clickedMessage) {
        throw new Exception('Clicked message not found');
    }
    
    // Use the same parent as the clicked message for branching
    $branchParentId = $clickedMessage['parent_message_id'];
    $threadId = $clickedMessage['thread_id'];
    
    // Create branch message - handle null parent (root-level branching)
    if ($branchParentId === null) {
        // Direct root-level branch creation
        $branchMessageId = $chatManager->addMessage($threadId, $role, $content, null);
    } else {
        // Standard branch creation with parent
        $branchMessageId = $chatManager->createBranch($branchParentId, $content, $role);
    }
    
    $logger->info('Branch message created', [
        'clicked_message_id' => $clickedMessageId,
        'branch_parent_id' => $branchParentId,
        'branch_message_id' => $branchMessageId,
        'role' => $role
    ]);
    
    // Generate AI response if the branch is a user message
    $aiResponse = null;
    if ($role === 'user') {
        $aiResponse = generateAIResponse($chatManager, $branchMessageId, $systemPrompt, $model, $logger);
    }
    
    echo json_encode([
        'success' => true,
        'user_message_id' => $branchMessageId,
        'ai_response' => $aiResponse
    ]);
}

function cleanUtf8Data($data) {
    if (is_array($data)) {
        return array_map('cleanUtf8Data', $data);
    } elseif (is_string($data)) {
        // 不正なUTF-8文字を削除・修正
        $data = mb_convert_encoding($data, 'UTF-8', 'UTF-8');
        // 制御文字を除去
        $data = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $data);
        return $data;
    }
    return $data;
}