<?php

class ChatManager {
    private $db;
    private $logger;
    
    public function __construct($db, $logger) {
        $this->db = $db;
        $this->logger = $logger;
    }
    
    public function createThread($name) {
        $sql = "INSERT INTO threads (name, created_at, updated_at) VALUES (?, datetime('now','localtime'), datetime('now','localtime'))";
        $this->db->query($sql, [$name]);
        $threadId = $this->db->lastInsertId();
        
        $this->logger->info('Thread created', ['thread_id' => $threadId, 'name' => $name]);
        
        return $threadId;
    }
    
    public function getThreads() {
        $sql = "SELECT * FROM threads ORDER BY updated_at DESC";
        return $this->db->fetchAll($sql);
    }
    
    public function getThread($threadId) {
        $sql = "SELECT * FROM threads WHERE id = ?";
        return $this->db->fetchOne($sql, [$threadId]);
    }
    
    public function updateThreadName($threadId, $name) {
        $sql = "UPDATE threads SET name = ?, updated_at = datetime('now','localtime') WHERE id = ?";
        $this->db->query($sql, [$name, $threadId]);
        
        $this->logger->info('Thread name updated', ['thread_id' => $threadId, 'name' => $name]);
    }
    
    public function deleteThread($threadId) {
        $sql = "DELETE FROM threads WHERE id = ?";
        $this->db->query($sql, [$threadId]);
        
        $this->logger->info('Thread physically deleted', ['thread_id' => $threadId]);
    }
    
    public function updateThreadSystemPrompt($threadId, $systemPrompt) {
        $sql = "UPDATE threads SET thread_system_prompt = ?, updated_at = datetime('now','localtime') WHERE id = ?";
        $this->db->query($sql, [$systemPrompt, $threadId]);
        
        $this->logger->info('Thread system prompt updated', [
            'thread_id' => $threadId, 
            'prompt_length' => strlen($systemPrompt)
        ]);
    }
    
    public function getThreadSystemPrompt($threadId) {
        $sql = "SELECT thread_system_prompt FROM threads WHERE id = ?";
        $result = $this->db->fetchOne($sql, [$threadId]);
        return $result ? $result['thread_system_prompt'] : '';
    }
    
    public function addMessage($threadId, $role, $content, $parentMessageId = null, $isContext = true, $usage = null) {
        $sql = "INSERT INTO messages (thread_id, parent_message_id, content, role, is_context) 
                VALUES (?, ?, ?, ?, ?)";
        
        $this->db->query($sql, [$threadId, $parentMessageId, $content, $role, $isContext ? 1 : 0]);
        $messageId = $this->db->lastInsertId();
        
        // Store usage information for assistant messages
        if ($role === 'assistant' && $usage) {
            $this->logger->info('Storing token usage', [
                'message_id' => $messageId,
                'usage_data' => $usage
            ]);
            $this->storeTokenUsage($messageId, $usage);
        }
        
        $this->logger->info('Message added', [
            'message_id' => $messageId,
            'thread_id' => $threadId,
            'role' => $role,
            'parent_id' => $parentMessageId,
            'has_usage' => $usage ? 'yes' : 'no'
        ]);
        
        return $messageId;
    }
    
    public function updateMessage($messageId, $content) {
        $sql = "UPDATE messages SET content = ? WHERE id = ?";
        $this->db->query($sql, [$content, $messageId]);
        
        $this->logger->info('Message updated', ['message_id' => $messageId]);
    }
    
    public function getMessage($messageId) {
        $sql = "SELECT * FROM messages WHERE id = ?";
        return $this->db->fetchOne($sql, [$messageId]);
    }
    
    public function getMessages($threadId) {
        $sql = "SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC";
        return $this->db->fetchAll($sql, [$threadId]);
    }
    
    public function getMessageTree($threadId) {
        $messages = $this->getMessages($threadId);
        return $this->buildTree($messages);
    }
    
    private function buildTree($messages, $parentId = null) {
        $tree = [];
        
        foreach ($messages as $message) {
            if ($message['parent_message_id'] == $parentId) {
                $message['children'] = $this->buildTree($messages, $message['id']);
                $tree[] = $message;
            }
        }
        
        return $tree;
    }
    
    public function getContextMessages($messageId) {
        $path = $this->getMessagePath($messageId);
        
        $contextMessages = [];
        foreach ($path as $msg) {
            if ($msg['is_context']) {
                $contextMessages[] = [
                    'role' => $msg['role'],
                    'content' => $msg['content'],
                    'id' => $msg['id']
                ];
            }
        }
        
        return $contextMessages;
    }
    
    public function getMessagePath($messageId) {
        $path = [];
        $currentId = $messageId;
        
        while ($currentId) {
            $message = $this->getMessage($currentId);
            if (!$message) break;
            
            array_unshift($path, $message);
            $currentId = $message['parent_message_id'];
        }
        
        return $path;
    }
    
    public function updateContextStatus($messageId, $isContext) {
        $sql = "UPDATE messages SET is_context = ? WHERE id = ?";
        $this->db->query($sql, [$isContext ? 1 : 0, $messageId]);
        
        $this->logger->info('Message context status updated', [
            'message_id' => $messageId,
            'is_context' => $isContext
        ]);
    }
    
    public function createBranch($parentMessageId, $content, $role = 'user') {
        $parentMessage = $this->getMessage($parentMessageId);
        if (!$parentMessage) {
            throw new Exception('Parent message not found');
        }
        
        return $this->addMessage(
            $parentMessage['thread_id'],
            $role,
            $content,
            $parentMessageId
        );
    }
    
    public function getMessageChildren($messageId) {
        $sql = "SELECT * FROM messages WHERE parent_message_id = ? ORDER BY created_at ASC";
        return $this->db->fetchAll($sql, [$messageId]);
    }
    
    public function deleteMessage($messageId) {
        // First delete all child messages recursively
        $deletedChildCount = $this->deleteChildMessages($messageId);
        
        // Then delete the specified message itself
        $sql = "DELETE FROM messages WHERE id = ?";
        $this->db->query($sql, [$messageId]);
        
        $this->logger->info('Message and children deleted', [
            'message_id' => $messageId,
            'child_count' => $deletedChildCount
        ]);
    }
    
    public function deleteChildMessages($messageId) {
        // Get all child messages recursively
        $childIds = $this->getChildMessageIds($messageId);
        
        if (!empty($childIds)) {
            $placeholders = str_repeat('?,', count($childIds) - 1) . '?';
            $sql = "DELETE FROM messages WHERE id IN ($placeholders)";
            $this->db->query($sql, $childIds);
            
            $this->logger->info('Child messages deleted', [
                'parent_message_id' => $messageId,
                'deleted_count' => count($childIds),
                'deleted_ids' => $childIds
            ]);
        }
        
        return count($childIds);
    }
    
    private function getChildMessageIds($messageId, &$childIds = []) {
        $sql = "SELECT id FROM messages WHERE parent_message_id = ?";
        $children = $this->db->fetchAll($sql, [$messageId]);
        
        foreach ($children as $child) {
            $childIds[] = $child['id'];
            // Recursively get grandchildren
            $this->getChildMessageIds($child['id'], $childIds);
        }
        
        return $childIds;
    }
    
    /**
     * Store token usage information in settings table
     */
    private function storeTokenUsage($messageId, $usage) {
        $usageJson = json_encode($usage);
        $sql = "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)";
        $this->db->query($sql, ["token_usage_{$messageId}", $usageJson]);
    }
    
    /**
     * Get token usage information for a message
     */
    private function getTokenUsage($messageId) {
        $sql = "SELECT value FROM settings WHERE key = ?";
        $result = $this->db->fetchOne($sql, ["token_usage_{$messageId}"]);
        return $result ? json_decode($result['value'], true) : null;
    }
    
    /**
     * Get message path from root to target message for token calculation
     */
    public function getMessagePathForTokens($threadId, $targetMessageId) {
        $messages = $this->getMessages($threadId);
        $path = [];
        $this->findMessagePath($messages, $targetMessageId, $path);
        return $path;
    }
    
    /**
     * Find path to target message recursively
     */
    private function findMessagePath($messages, $targetId, &$path, $currentPath = []) {
        // Create a message map for efficient lookups (no static variable)
        $messageMap = [];
        foreach ($messages as $msg) {
            $messageMap[$msg['id']] = $msg;
        }
        
        // Find the target message
        if (!isset($messageMap[$targetId])) {
            return false;
        }
        
        // Build path from target back to root
        $reversePath = [];
        $currentId = $targetId;
        
        while ($currentId !== null) {
            if (!isset($messageMap[$currentId])) {
                break;
            }
            
            $currentMessage = $messageMap[$currentId];
            array_unshift($reversePath, $currentMessage);
            $currentId = $currentMessage['parent_message_id'];
        }
        
        $path = $reversePath;
        return true;
    }
    
    /**
     * Calculate cumulative token usage for a message path
     */
    public function calculateCumulativeTokenUsage($messagePath) {
        $totalTokens = 0;
        $promptTokens = 0;
        $completionTokens = 0;
        $maxTokens = 128000; // GPT-5-mini limit
        
        foreach ($messagePath as $message) {
            if ($message['role'] === 'assistant') {
                $usage = $this->getTokenUsage($message['id']);
                if ($usage) {
                    $totalTokens += $usage['total_tokens'] ?? 0;
                    $promptTokens += $usage['prompt_tokens'] ?? 0;
                    $completionTokens += $usage['completion_tokens'] ?? 0;
                }
            }
        }
        
        $usagePercentage = $maxTokens > 0 ? round(($totalTokens / $maxTokens) * 100, 2) : 0;
        
        return [
            'total_tokens' => $totalTokens,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'max_tokens' => $maxTokens,
            'usage_percentage' => $usagePercentage,
            'usage_display' => "Tokens used: " . number_format($totalTokens) . "/" . number_format($maxTokens) . " - {$usagePercentage}%"
        ];
    }
    
    /**
     * Enhanced getMessageTree with token usage information
     */
    public function getMessageTreeWithTokens($threadId) {
        $tree = $this->getMessageTree($threadId);
        return $this->enrichTreeWithTokenUsage($tree, $threadId);
    }
    
    /**
     * Enrich tree with token usage information
     */
    private function enrichTreeWithTokenUsage($tree, $threadId) {
        foreach ($tree as &$node) {
            $this->enrichNodeWithTokenUsage($node, $threadId);
        }
        return $tree;
    }
    
    /**
     * Enrich single node with token usage information
     */
    private function enrichNodeWithTokenUsage(&$node, $threadId) {
        // Calculate cumulative token usage for this message
        $messagePath = $this->getMessagePathForTokens($threadId, $node['id']);
        $tokenUsage = $this->calculateCumulativeTokenUsage($messagePath);
        
        $node['cumulative_tokens'] = $tokenUsage;
        
        // Process children recursively
        if (isset($node['children']) && is_array($node['children'])) {
            foreach ($node['children'] as &$child) {
                $this->enrichNodeWithTokenUsage($child, $threadId);
            }
        }
    }
}