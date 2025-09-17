<?php

class SettingsManager {
    private $db;
    private $logger;
    
    public function __construct($database, $logger = null) {
        $this->db = $database;
        $this->logger = $logger;
    }
    
    /**
     * Get all settings
     */
    public function getAllSettings() {
        try {
            $rows = $this->db->fetchAll("SELECT key, value FROM settings ORDER BY key");
            
            $settings = [];
            foreach ($rows as $row) {
                $settings[$row['key']] = $this->parseValue($row['value']);
            }
            
            return $settings;
        } catch (Exception $e) {
            if ($this->logger) {
                $this->logger->error('Failed to get settings', ['error' => $e->getMessage()]);
            }
            throw $e;
        }
    }
    
    /**
     * Get individual setting
     */
    public function getSetting($key, $defaultValue = null) {
        try {
            $row = $this->db->fetchOne("SELECT value FROM settings WHERE key = ?", [$key]);
            
            if ($row) {
                return $this->parseValue($row['value']);
            }
            
            return $defaultValue;
        } catch (Exception $e) {
            if ($this->logger) {
                $this->logger->error('Failed to get setting', ['key' => $key, 'error' => $e->getMessage()]);
            }
            return $defaultValue;
        }
    }
    
    /**
     * Save settings
     */
    public function saveSetting($key, $value) {
        try {
            $this->validateSetting($key, $value);
            
            $result = $this->db->query("
                INSERT OR REPLACE INTO settings (key, value, updated_at) 
                VALUES (?, ?, datetime('now','localtime'))
            ", [$key, $this->formatValue($value)]);
            
            if ($this->logger) {
                $this->logger->info('Setting saved', ['key' => $key]);
            }
            
            return $result;
        } catch (Exception $e) {
            if ($this->logger) {
                $this->logger->error('Failed to save setting', ['key' => $key, 'error' => $e->getMessage()]);
            }
            throw $e;
        }
    }
    
    /**
     * Bulk save multiple settings
     */
    public function saveSettings($settings) {
        try {
            $this->db->beginTransaction();
            
            foreach ($settings as $key => $value) {
                $this->validateSetting($key, $value);
                
                $this->db->query("
                    INSERT OR REPLACE INTO settings (key, value, updated_at) 
                    VALUES (?, ?, datetime('now','localtime'))
                ", [$key, $this->formatValue($value)]);
            }
            
            $this->db->commit();
            
            if ($this->logger) {
                $this->logger->info('Settings saved', ['keys' => array_keys($settings)]);
            }
            
            return true;
        } catch (Exception $e) {
            $this->db->rollback();
            
            if ($this->logger) {
                $this->logger->error('Failed to save settings', ['error' => $e->getMessage()]);
            }
            throw $e;
        }
    }
    
    /**
     * Reset settings to default values
     */
    public function resetToDefaults() {
        try {
            $defaults = [
                'default_model' => 'gpt-5-mini',
                'system_prompt' => 'You are a helpful assistant.',
                'theme' => 'dark'
            ];
            
            $this->saveSettings($defaults);
            
            if ($this->logger) {
                $this->logger->info('Settings reset to defaults');
            }
            
            return true;
        } catch (Exception $e) {
            if ($this->logger) {
                $this->logger->error('Failed to reset settings', ['error' => $e->getMessage()]);
            }
            throw $e;
        }
    }
    
    /**
     * Get available model list
     */
    private function getAllowedModels() {
        try {
            // models.phpから動的にモデル一覧を取得
            $modelsPath = __DIR__ . '/../api/models.php';
            
            // models.phpの内容を一時的に取得
            ob_start();
            $_SERVER['PHP_AUTH_USER'] = 'temp';
            $_SERVER['PHP_AUTH_PW'] = 'temp';
            
            // 認証をバイパスしてモデル定義部分のみ実行
            $modelsCode = file_get_contents($modelsPath);
            
            // モデル定義配列を抽出（正規表現で$models配列を取得）
            if (preg_match('/\$models\s*=\s*(\[[^;]+\]);/s', $modelsCode, $matches)) {
                eval('$models = ' . $matches[1] . ';');
                
                $allowedModels = [];
                foreach ($models as $model) {
                    if (isset($model['enabled']) && $model['enabled']) {
                        $allowedModels[] = $model['id'];
                    }
                }
                
                ob_end_clean();
                return $allowedModels;
            }
            
            ob_end_clean();
            
            // フォールバック: デフォルトモデル
            return ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o-mini'];
            
        } catch (Exception $e) {
            if ($this->logger) {
                $this->logger->warning('Failed to get models dynamically, using fallback', ['error' => $e->getMessage()]);
            }
            // エラー時のフォールバック
            return ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o-mini'];
        }
    }
    
    /**
     * Validate setting values
     */
    private function validateSetting($key, $value) {
        switch ($key) {
            case 'system_prompt':
                if (!is_string($value)) {
                    throw new InvalidArgumentException('System prompt must be a string');
                }
                if (strlen($value) > 10000) {
                    throw new InvalidArgumentException('System prompt is too long (max 10000 characters)');
                }
                break;
                
            case 'default_model':
                $allowedModels = $this->getAllowedModels();
                if (!in_array($value, $allowedModels)) {
                    throw new InvalidArgumentException('Invalid model: ' . $value . '. Allowed models: ' . implode(', ', $allowedModels));
                }
                break;
                
            case 'theme':
                $allowedThemes = ['dark', 'light'];
                if (!in_array($value, $allowedThemes)) {
                    throw new InvalidArgumentException('Invalid theme: ' . $value);
                }
                break;
                
            default:
                // Allow other keys with basic validation
                if (!is_string($key) || strlen($key) > 100) {
                    throw new InvalidArgumentException('Invalid setting key');
                }
                break;
        }
    }
    
    /**
     * Convert values to database storage format
     */
    private function formatValue($value) {
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        return (string)$value;
    }
    
    /**
     * Convert database values to appropriate types
     */
    private function parseValue($value) {
        // Boolean values
        if ($value === '1' || $value === '0') {
            return $value === '1';
        }
        
        // String values
        return $value;
    }
    
    /**
     * Check if setting exists
     */
    public function hasSettings() {
        try {
            $result = $this->db->fetchOne("SELECT COUNT(*) as count FROM settings");
            
            return $result['count'] > 0;
        } catch (Exception $e) {
            return false;
        }
    }
}