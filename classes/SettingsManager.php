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
        // Return all available models that match the settings.php models endpoint
        return [
            'gpt-5-mini',
            'gpt-5',
            'gpt-4o-mini',
            'gpt-4o',
            'gpt-4o-search-preview',
            'gpt-4o-mini-search-preview',
            'o1-preview',
            'o1-mini',
            'gpt-3.5-turbo'
        ];
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