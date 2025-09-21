<?php

require_once __DIR__ . '/../vendor/autoload.php';

class OpenAIClient {
    private $client;
    private $config;
    private $logger;

    public function __construct($config, $logger) {
        $this->config = $config;
        $this->logger = $logger;

        // Initialize OpenAI client with API key
        $this->client = \OpenAI::client($config['openai']['api_key']);

        $this->logger->info('OpenAI Client initialized with openai-php/client library', [
            'library_version' => 'openai-php/client v0.16.1',
            'default_model' => $config['openai']['default_model']
        ]);
    }

    public function sendMessage($messages, $model = null, $systemPrompt = null, $threadSystemPrompt = null) {
        if (!$model) {
            $model = $this->config['openai']['default_model'];
        }

        $formattedMessages = [];

        // Combine system prompts
        $finalSystemPrompt = '';

        if ($systemPrompt) {
            $finalSystemPrompt .= $systemPrompt;
        }

        if ($threadSystemPrompt) {
            if ($finalSystemPrompt) {
                $finalSystemPrompt .= "\n\n" . $threadSystemPrompt;
            } else {
                $finalSystemPrompt = $threadSystemPrompt;
            }
        }

        if ($finalSystemPrompt) {
            $formattedMessages[] = [
                'role' => 'system',
                'content' => $finalSystemPrompt
            ];
        }

        foreach ($messages as $message) {
            $formattedMessages[] = [
                'role' => $message['role'],
                'content' => $message['content']
            ];
        }

        // Determine appropriate parameters based on model
        $maxTokens = $this->getMaxTokensForModel($model);
        $requestParams = [
            'model' => $model,
            'messages' => $formattedMessages
        ];

        // GPT-5 and o1 models use max_completion_tokens and don't support temperature
        if ($this->isReasoningModel($model)) {
            $requestParams['max_completion_tokens'] = $maxTokens;
            // o1/GPT-5 models don't support temperature parameter
        } else {
            $requestParams['max_tokens'] = $maxTokens;
            $requestParams['temperature'] = $this->config['openai']['temperature'];
        }

        $this->logger->info('OpenAI API Request', [
            'model' => $model,
            'message_count' => count($formattedMessages),
            'max_tokens' => $requestParams['max_tokens'] ?? null,
            'max_completion_tokens' => $requestParams['max_completion_tokens'] ?? null,
            'temperature' => $requestParams['temperature'] ?? null,
            'is_reasoning_model' => $this->isReasoningModel($model)
        ]);

        try {
            $response = $this->client->chat()->create($requestParams);

            // Extract content from response
            $content = $response->choices[0]->message->content ?? '';

            // Convert usage to array format for backward compatibility
            $usage = [
                'prompt_tokens' => $response->usage->promptTokens ?? 0,
                'completion_tokens' => $response->usage->completionTokens ?? 0,
                'total_tokens' => $response->usage->totalTokens ?? 0
            ];

            // Add reasoning tokens if available (for o1 models)
            if (isset($response->usage->completionTokensDetails->reasoningTokens)) {
                $usage['completion_tokens_details'] = [
                    'reasoning_tokens' => $response->usage->completionTokensDetails->reasoningTokens
                ];
            }

            $finishReason = $response->choices[0]->finishReason ?? 'unknown';

            $this->logger->info('OpenAI API Response', [
                'tokens_used' => $usage['total_tokens'],
                'response_length' => strlen($content),
                'finish_reason' => $finishReason,
                'reasoning_tokens' => $usage['completion_tokens_details']['reasoning_tokens'] ?? 0,
                'final_content' => substr($content, 0, 100) . (strlen($content) > 100 ? '...' : '')
            ]);

            // Check for context length limit exceeded
            if ($finishReason === 'length') {
                throw new Exception('token_limit_exceeded');
            }

            // Check for empty response
            if (empty($content)) {
                throw new Exception('ai_response_empty');
            }

            return [
                'content' => $content,
                'usage' => $usage,
                'finish_reason' => $finishReason,
                'model' => $model,
                'model_info' => [
                    'max_context_tokens' => $this->getMaxContextTokensForModel($model),
                    'is_reasoning_model' => $this->isReasoningModel($model)
                ]
            ];

        } catch (\OpenAI\Exceptions\ErrorException $e) {
            $this->logger->error('OpenAI API Error', [
                'error_type' => get_class($e),
                'message' => $e->getMessage(),
                'model' => $model
            ]);

            // Handle specific OpenAI errors
            $errorMessage = $e->getMessage();
            if (strpos($errorMessage, 'context_length_exceeded') !== false ||
                strpos($errorMessage, 'maximum context length') !== false) {
                throw new Exception('token_limit_exceeded');
            }

            throw new Exception('OpenAI API Error: ' . $errorMessage);

        } catch (Exception $e) {
            $this->logger->error('OpenAI Client Error', [
                'error_type' => get_class($e),
                'message' => $e->getMessage(),
                'model' => $model
            ]);

            throw $e;
        }
    }

    /**
     * Context compression method - now deprecated but kept for backward compatibility
     * Returns messages as-is since compression is disabled per requirements
     */
    public function compressContext($messages, $maxTokens = 8000) {
        $this->logger->info('Context compression called but disabled by design', [
            'original_count' => count($messages),
            'max_tokens_param' => $maxTokens
        ]);

        // Return messages unchanged - no compression
        return $messages;
    }

    /**
     * Check if model is a reasoning model (o1/GPT-5 series)
     */
    private function isReasoningModel($model) {
        $reasoningModels = [
            'o1-preview',
            'o1-mini',
            'gpt-5',
            'gpt-5-mini',
            'gpt-5-nano'
        ];

        return in_array($model, $reasoningModels) ||
               strpos($model, 'o1-') === 0 ||
               strpos($model, 'gpt-5') === 0;
    }

    /**
     * Get appropriate max_tokens for the given model
     */
    private function getMaxTokensForModel($model) {
        // Model-specific limits (as of 2025) - Official OpenAI specifications
        $modelLimits = [
            'gpt-4o-mini' => 16000,      // Official: 16K output tokens
            'gpt-4o' => 16000,           // Official: 16K output tokens
            'gpt-4-turbo' => 4096,
            'gpt-4' => 4096,
            'gpt-3.5-turbo' => 4096,
            'gpt-3.5-turbo-1106' => 4096,
            'gpt-3.5-turbo-instruct' => 4096,
            // o1 models - Official specifications
            'o1-preview' => 32000,       // Official: ~32K output tokens
            'o1-mini' => 65000,          // Official: ~65K output tokens
            // GPT-5 series - Official specifications
            'gpt-5-mini' => 128000,      // Official: 128K reasoning & output tokens
            'gpt-5' => 128000,           // Official: 128K reasoning & output tokens
        ];

        // Check if model has specific limit
        if (isset($modelLimits[$model])) {
            return $modelLimits[$model];
        }

        // For unknown models, use a conservative limit
        $configLimit = $this->config['openai']['max_tokens'];
        $conservativeLimit = min($configLimit, 4096);

        $this->logger->warning('Unknown model, using conservative max_tokens', [
            'model' => $model,
            'max_tokens' => $conservativeLimit
        ]);

        return $conservativeLimit;
    }

    /**
     * Get maximum context tokens for the given model
     */
    public function getMaxContextTokensForModel($model) {
        // Model-specific context limits (as of 2025)
        $contextLimits = [
            'gpt-4o-mini' => 128000,
            'gpt-4o' => 128000,
            'gpt-4-turbo' => 128000,
            'gpt-4' => 8192,
            'gpt-3.5-turbo' => 16385,
            'gpt-3.5-turbo-1106' => 16385,
            'gpt-3.5-turbo-instruct' => 4096,
            // o1 models
            'o1-preview' => 128000,
            'o1-mini' => 128000,
            // GPT-5 series
            'gpt-5-mini' => 272000, // Based on official pricing page
            'gpt-5' => 272000,
        ];

        // Check if model has specific context limit
        if (isset($contextLimits[$model])) {
            return $contextLimits[$model];
        }

        // For unknown models, use a conservative limit
        $conservativeLimit = 128000; // Default to a reasonable context limit

        $this->logger->warning('Unknown model, using conservative context limit', [
            'model' => $model,
            'context_limit' => $conservativeLimit
        ]);

        return $conservativeLimit;
    }

    /**
     * Estimate tokens - kept for backward compatibility
     */
    private function estimateTokens($messages) {
        $text = '';
        foreach ($messages as $message) {
            $text .= $message['content'] . ' ';
        }

        // Simple estimation: ~4 characters per token
        return intval(strlen($text) / 4);
    }
}