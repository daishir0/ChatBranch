<?php

/**
 * Language Management Class
 * Handles internationalization and localization for the ChatBranch system
 * Supports dynamic language switching and parameter substitution
 */
class Language {
    private $translations = [];
    private $currentLang = 'en';
    private $fallbackLang = 'en';
    private $langDir = '';
    private static $instance = null;
    
    /**
     * Singleton pattern implementation
     * @return Language
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor - Initialize language system
     */
    private function __construct() {
        $this->langDir = dirname(__DIR__) . '/lang/';
        $this->loadDefaultLanguage();
    }
    
    /**
     * Load default language based on system settings
     */
    private function loadDefaultLanguage() {
        // Try to load from session first, then config, then default to English
        if (isset($_SESSION['language'])) {
            $this->currentLang = $_SESSION['language'];
        } else {
            $this->currentLang = 'en'; // Default to English
        }
        
        $this->loadLanguage($this->currentLang);
    }
    
    /**
     * Load language file
     * @param string $lang Language code (en, ja, etc.)
     * @return bool Success status
     */
    public function loadLanguage($lang) {
        $langFile = $this->langDir . $lang . '.json';
        
        if (!file_exists($langFile)) {
            // If requested language doesn't exist, load fallback
            if ($lang !== $this->fallbackLang) {
                return $this->loadLanguage($this->fallbackLang);
            }
            return false;
        }
        
        $content = file_get_contents($langFile);
        $translations = json_decode($content, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("Language file parsing error for {$lang}: " . json_last_error_msg());
            return false;
        }
        
        $this->translations = $translations;
        $this->currentLang = $lang;
        $_SESSION['language'] = $lang;
        
        return true;
    }
    
    /**
     * Translate text with optional parameter substitution
     * @param string $key Translation key (dot notation supported)
     * @param array $params Parameters for substitution
     * @return string Translated text or key if not found
     */
    public function t($key, $params = []) {
        $value = $this->getNestedValue($this->translations, $key);
        
        if ($value === null) {
            // Log missing translation key
            error_log("Missing translation key: {$key} for language: {$this->currentLang}");
            return $key; // Return key as fallback
        }
        
        // Replace parameters in the translation
        if (!empty($params)) {
            foreach ($params as $paramKey => $paramValue) {
                $value = str_replace('{' . $paramKey . '}', $paramValue, $value);
            }
        }
        
        return $value;
    }
    
    /**
     * Get nested array value using dot notation
     * @param array $array Source array
     * @param string $key Dot notation key (e.g., 'user.messages.welcome')
     * @return mixed Value or null if not found
     */
    private function getNestedValue($array, $key) {
        $keys = explode('.', $key);
        $current = $array;
        
        foreach ($keys as $k) {
            if (!is_array($current) || !array_key_exists($k, $current)) {
                return null;
            }
            $current = $current[$k];
        }
        
        return $current;
    }
    
    /**
     * Get current language
     * @return string Current language code
     */
    public function getCurrentLanguage() {
        return $this->currentLang;
    }
    
    /**
     * Get available languages
     * @return array List of available language codes
     */
    public function getAvailableLanguages() {
        $languages = [];
        $files = glob($this->langDir . '*.json');
        
        foreach ($files as $file) {
            $lang = basename($file, '.json');
            $languages[] = $lang;
        }
        
        return $languages;
    }
    
    /**
     * Set language preference
     * @param string $lang Language code
     * @return bool Success status
     */
    public function setLanguage($lang) {
        return $this->loadLanguage($lang);
    }
    
    /**
     * Get language metadata (name, direction, etc.)
     * @param string $lang Language code
     * @return array Language metadata
     */
    public function getLanguageMetadata($lang) {
        $metadataFile = $this->langDir . 'metadata.json';
        
        if (!file_exists($metadataFile)) {
            return [
                'name' => $lang,
                'direction' => 'ltr',
                'charset' => 'UTF-8'
            ];
        }
        
        $metadata = json_decode(file_get_contents($metadataFile), true);
        
        return $metadata[$lang] ?? [
            'name' => $lang,
            'direction' => 'ltr', 
            'charset' => 'UTF-8'
        ];
    }
}

/**
 * Global translation function for convenience
 * @param string $key Translation key
 * @param array $params Parameters for substitution
 * @return string Translated text
 */
function __($key, $params = []) {
    return Language::getInstance()->t($key, $params);
}

/**
 * Short alias for translation function
 * @param string $key Translation key
 * @param array $params Parameters for substitution  
 * @return string Translated text
 */
function t($key, $params = []) {
    return Language::getInstance()->t($key, $params);
}