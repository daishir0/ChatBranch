<?php

class Auth {
    private $config;
    
    public function __construct($config) {
        $this->config = $config;
    }
    
    public function authenticate() {
        if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW'])) {
            $this->requireAuth();
            return false;
        }
        
        $username = $_SERVER['PHP_AUTH_USER'];
        $password = $_SERVER['PHP_AUTH_PW'];
        
        if ($username !== $this->config['auth']['username'] || 
            $password !== $this->config['auth']['password']) {
            $this->requireAuth();
            return false;
        }
        
        return true;
    }
    
    private function requireAuth() {
        header('WWW-Authenticate: Basic realm="ChatBranch"');
        header('HTTP/1.0 401 Unauthorized');
        echo 'Authentication required';
        exit;
    }
    
    public function generateCSRFToken() {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }
    
    public function validateCSRFToken($token) {
        return isset($_SESSION['csrf_token']) && 
               hash_equals($_SESSION['csrf_token'], $token);
    }
    
    public function sanitizeInput($input) {
        if (is_array($input)) {
            return array_map([$this, 'sanitizeInput'], $input);
        }
        return htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
    }
    
    public function validateInput($input, $type = 'string', $maxLength = 1000) {
        if ($type === 'string') {
            return is_string($input) && strlen($input) <= $maxLength;
        }
        if ($type === 'int') {
            return is_numeric($input) && (int)$input == $input;
        }
        if ($type === 'email') {
            return filter_var($input, FILTER_VALIDATE_EMAIL) !== false;
        }
        return false;
    }
}