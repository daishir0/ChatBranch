<?php
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
    require_once '../classes/DatabaseInitializer.php';
    
    $dbInitializer = new DatabaseInitializer(__DIR__ . '/../config.php');
    $config = $dbInitializer->initializeDatabase();
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
    
    // GPT-5 series and GPT-4o-mini model definitions
    $models = [
        [
            'id' => 'gpt-5',
            'name' => 'GPT-5 (Full Model)',
            'description' => 'Most capable model for coding and agentic tasks. OpenAI\'s strongest coding model to date.',
            'category' => 'premium',
            'capabilities' => ['text', 'vision', 'code', 'reasoning', 'agentic'],
            'pricing' => [
                'input_per_1m' => 1.25,
                'output_per_1m' => 10.0,
                'currency' => 'USD'
            ],
            'limits' => [
                'max_tokens' => 128000,
                'context_window' => 400000,
                'rate_limit_rpm' => 10000
            ],
            'features' => [
                'Knowledge cutoff: September 30, 2024',
                '94.6% on AIME 2025 without tools',
                '74.9% on SWE-bench Verified',
                '45% less likely to hallucinate than GPT-4o'
            ],
            'recommended' => false,
            'enabled' => true
        ],
        [
            'id' => 'gpt-5-mini',
            'name' => 'GPT-5 Mini (Recommended)',
            'description' => 'Perfect balance of performance and cost. Powers real-time experiences for apps and agents.',
            'category' => 'standard',
            'capabilities' => ['text', 'vision', 'code', 'reasoning', 'tool_calling'],
            'pricing' => [
                'input_per_1m' => 0.25,
                'output_per_1m' => 2.0,
                'currency' => 'USD'
            ],
            'limits' => [
                'max_tokens' => 128000,
                'context_window' => 400000,
                'rate_limit_rpm' => 10000
            ],
            'features' => [
                'Knowledge cutoff: May 30, 2024',
                'Optimized for reasoning and tool calling',
                'Real-time app experiences',
                'Customer problem solving'
            ],
            'recommended' => true,
            'enabled' => true,
            'default' => true
        ],
        [
            'id' => 'gpt-5-nano',
            'name' => 'GPT-5 Nano (Ultra-Fast)',
            'description' => 'Ultra-low-latency model focused on speed with rich Q&A capabilities.',
            'category' => 'basic',
            'capabilities' => ['text', 'reasoning', 'qa'],
            'pricing' => [
                'input_per_1m' => 0.05,
                'output_per_1m' => 0.40,
                'currency' => 'USD'
            ],
            'limits' => [
                'max_tokens' => 128000,
                'context_window' => 400000,
                'rate_limit_rpm' => 10000
            ],
            'features' => [
                'Knowledge cutoff: May 30, 2024',
                'Ultra-low-latency responses',
                'Rich Q&A capabilities',
                'Speed optimized'
            ],
            'recommended' => false,
            'enabled' => true
        ],
        [
            'id' => 'gpt-4o-mini',
            'name' => 'GPT-4o Mini (Legacy)',
            'description' => 'Previous generation efficient multimodal model. Still reliable for most tasks.',
            'category' => 'legacy',
            'capabilities' => ['text', 'vision', 'code'],
            'pricing' => [
                'input_per_1m' => 0.15,
                'output_per_1m' => 0.60,
                'currency' => 'USD'
            ],
            'limits' => [
                'max_tokens' => 16384,
                'context_window' => 128000,
                'rate_limit_rpm' => 10000
            ],
            'features' => [
                'Previous generation model',
                'Multimodal capabilities',
                'Proven reliability',
                'Lower cost alternative'
            ],
            'recommended' => false,
            'enabled' => true
        ]
    ];
    
    echo json_encode([
        'success' => true,
        'models' => $models,
        'default_model' => 'gpt-5-mini',
        'last_updated' => '2025-09-04'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Error $e) {
    http_response_code(500);
    echo json_encode(['error' => 'PHP Error: ' . $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Unexpected error: ' . $e->getMessage()]);
}