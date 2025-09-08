<?php

class OpenAIClient {
    private $apiKey;
    private $config;
    private $logger;
    
    public function __construct($config, $logger) {
        $this->apiKey = $config['openai']['api_key'];
        $this->config = $config;
        $this->logger = $logger;
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
        
        $data = [
            'model' => $model,
            'messages' => $formattedMessages
        ];
        
        // GPT-5 series uses max_completion_tokens and temperature=1 (default), other models use max_tokens and configured value
        if (strpos($model, 'gpt-5') === 0) {
            $data['max_completion_tokens'] = $this->config['openai']['max_tokens'];
            // GPT-5 series only supports temperature=1 (omitted as default value)
            // $data['temperature'] = 1; // No need to set as it's the default value
        } else {
            $data['max_tokens'] = $this->config['openai']['max_tokens'];
            $data['temperature'] = $this->config['openai']['temperature'];
        }
        
        $this->logger->info('OpenAI API Request', [
            'model' => $model,
            'message_count' => count($formattedMessages)
        ]);
        
        $response = $this->makeRequest('https://api.openai.com/v1/chat/completions', $data);
        
        if (isset($response['error'])) {
            $this->logger->error('OpenAI API Error', $response['error']);
            throw new Exception('OpenAI API Error: ' . $response['error']['message']);
        }
        
        // Debug: Log response structure
        $this->logger->info('OpenAI API Full Response', [
            'model' => $model,
            'response_structure' => json_encode($response, JSON_PRETTY_PRINT),
            'choices_count' => count($response['choices'] ?? []),
            'first_choice' => $response['choices'][0] ?? null
        ]);
        
        $content = $response['choices'][0]['message']['content'] ?? '';
        
        // GPT-5 series may have different structure, check multiple locations
        if (empty($content) && strpos($model, 'gpt-5') === 0) {
            // Alternative content retrieval method for GPT-5 series
            $content = $response['choices'][0]['message']['reasoning'] ?? 
                      $response['choices'][0]['content'] ?? 
                      $response['content'] ?? '';
        }
        
        $this->logger->info('OpenAI API Response', [
            'tokens_used' => $response['usage']['total_tokens'] ?? 0,
            'response_length' => strlen($content),
            'reasoning_tokens' => $response['usage']['completion_tokens_details']['reasoning_tokens'] ?? 0,
            'final_content' => substr($content, 0, 100) . (strlen($content) > 100 ? '...' : '')
        ]);
        
        return [
            'content' => $content,
            'usage' => $response['usage'] ?? [],
            'finish_reason' => $response['choices'][0]['finish_reason'] ?? 'unknown'
        ];
    }
    
    private function makeRequest($url, $data) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey
            ],
            CURLOPT_TIMEOUT => 300,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_error($ch)) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new Exception('cURL Error: ' . $error);
        }
        
        curl_close($ch);
        
        if ($httpCode !== 200) {
            $this->logger->error('OpenAI API HTTP Error', [
                'http_code' => $httpCode,
                'response' => $response
            ]);
        }
        
        return json_decode($response, true);
    }
    
    public function compressContext($messages, $maxTokens = 8000) {
        $totalTokens = $this->estimateTokens($messages);
        
        if ($totalTokens <= $maxTokens) {
            return $messages;
        }
        
        $compressed = [];
        $currentTokens = 0;
        
        for ($i = count($messages) - 1; $i >= 0; $i--) {
            $messageTokens = $this->estimateTokens([$messages[$i]]);
            
            if ($currentTokens + $messageTokens > $maxTokens && !empty($compressed)) {
                break;
            }
            
            array_unshift($compressed, $messages[$i]);
            $currentTokens += $messageTokens;
        }
        
        $this->logger->info('Context compressed', [
            'original_count' => count($messages),
            'compressed_count' => count($compressed),
            'estimated_tokens' => $currentTokens
        ]);
        
        return $compressed;
    }
    
    private function estimateTokens($messages) {
        $text = '';
        foreach ($messages as $message) {
            $text .= $message['content'] . ' ';
        }
        
        return intval(strlen($text) / 4);
    }
}