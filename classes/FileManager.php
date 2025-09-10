<?php

// Load Composer autoloader for Office document parsing libraries
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

class FileManager {
    private $db;
    private $logger;
    private $config;
    private $uploadDir;
    
    public function __construct($db, $logger, $config) {
        $this->db = $db;
        $this->logger = $logger;
        $this->config = $config;
        $this->uploadDir = $config['upload']['storage_path'];
        
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }
    
    public function uploadFile($fileData) {
        if (!$this->validateFile($fileData)) {
            throw new Exception('Invalid file');
        }
        
        $originalName = $fileData['name'];
        $tempPath = $fileData['tmp_name'];
        $fileSize = $fileData['size'];
        
        try {
            // Convert to markdown directly from temporary file
            $content = $this->convertToMarkdown($tempPath, $originalName);
            $metadata = $this->extractMetadata($originalName, $fileSize);
            
            // Store only the markdown content in database - no physical file storage
            $sql = "INSERT INTO files (original_name, stored_name, content_markdown, metadata, file_size) 
                    VALUES (?, ?, ?, ?, ?)";
            
            // Use empty string for stored name since we're not storing physical files
            $this->db->query($sql, [
                $originalName,
                '', // Empty stored name since we're not keeping physical files
                $content,
                json_encode($metadata),
                $fileSize
            ]);
            
            $fileId = $this->db->lastInsertId();
            
            $this->logger->info('File processed and content stored', [
                'file_id' => $fileId,
                'original_name' => $originalName,
                'size' => $fileSize,
                'content_length' => strlen($content)
            ]);
            
            return $fileId;
            
        } catch (Exception $e) {
            throw new Exception('Failed to process file: ' . $e->getMessage());
        }
    }
    
    private function validateFile($fileData) {
        if ($fileData['error'] !== UPLOAD_ERR_OK) {
            $this->logger->warning('File upload error', ['error_code' => $fileData['error'], 'file' => $fileData['name']]);
            
            // Generate specific error message
            switch ($fileData['error']) {
                case UPLOAD_ERR_INI_SIZE:
                    throw new Exception('File size exceeds PHP limit (' . ini_get('upload_max_filesize') . ').');
                case UPLOAD_ERR_FORM_SIZE:
                    throw new Exception('File size exceeds the limit.');
                case UPLOAD_ERR_PARTIAL:
                    throw new Exception('File upload is incomplete.');
                case UPLOAD_ERR_NO_FILE:
                    throw new Exception('No file selected.');
                case UPLOAD_ERR_NO_TMP_DIR:
                    throw new Exception('Temporary directory not found.');
                case UPLOAD_ERR_CANT_WRITE:
                    throw new Exception('Failed to write to disk.');
                default:
                    throw new Exception('File upload error (Code: ' . $fileData['error'] . ').');
            }
        }
        
        if ($fileData['size'] > $this->config['upload']['max_size']) {
            $this->logger->warning('File too large', ['size' => $fileData['size'], 'max_size' => $this->config['upload']['max_size'], 'file' => $fileData['name']]);
            $maxSizeMB = round($this->config['upload']['max_size'] / 1024 / 1024, 1);
            throw new Exception("File size exceeds limit ({$maxSizeMB}MB).");
        }
        
        $extension = strtolower(pathinfo($fileData['name'], PATHINFO_EXTENSION));
        $allowed = in_array($extension, $this->config['upload']['allowed_types']);
        
        if (!$allowed) {
            $this->logger->warning('File extension not allowed', [
                'extension' => $extension, 
                'file' => $fileData['name'],
                'allowed_types' => $this->config['upload']['allowed_types']
            ]);
            $allowedStr = implode(', ', $this->config['upload']['allowed_types']);
            throw new Exception("File format (.{$extension}) is not allowed. Allowed formats: {$allowedStr}");
        }
        
        return true;
    }
    
    private function generateStoredName($originalName) {
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        return date('Y-m-d_H-i-s_') . bin2hex(random_bytes(8)) . '.' . $extension;
    }
    
    private function convertToMarkdown($filePath, $originalName) {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        
        switch ($extension) {
            case 'txt':
            case 'md':
                return file_get_contents($filePath);
                
            case 'pdf':
                return $this->convertPdfToMarkdown($filePath);
                
            case 'docx':
                return $this->convertDocxToMarkdown($filePath);
                
            case 'xlsx':
                return $this->convertXlsxToMarkdown($filePath);
                
            case 'pptx':
                return $this->convertPptxToMarkdown($filePath);
                
            case 'csv':
                return $this->convertCsvToMarkdown($filePath);
                
            default:
                return "# " . $originalName . "\n\nUnsupported file format for text extraction.";
        }
    }
    
    private function convertPdfToMarkdown($filePath) {
        if (class_exists('\\Smalot\\PdfParser\\Parser')) {
            try {
                $parser = new \Smalot\PdfParser\Parser();
                $pdf = $parser->parseFile($filePath);
                return "# PDF Content\n\n" . $pdf->getText();
            } catch (Exception $e) {
                $this->logger->warning('PDF parsing failed', ['error' => $e->getMessage()]);
            }
        }
        
        return "# PDF File\n\nPDF parsing not available. Install smalot/pdfparser for PDF support.";
    }
    
    private function convertDocxToMarkdown($filePath) {
        if (class_exists('\\PhpOffice\\PhpWord\\IOFactory')) {
            try {
                $phpWord = \PhpOffice\PhpWord\IOFactory::load($filePath);
                $content = "# Word Document\n\n";
                
                foreach ($phpWord->getSections() as $section) {
                    foreach ($section->getElements() as $element) {
                        if (method_exists($element, 'getText')) {
                            $content .= $element->getText() . "\n\n";
                        }
                    }
                }
                
                return $content;
            } catch (Exception $e) {
                $this->logger->warning('DOCX parsing failed', ['error' => $e->getMessage()]);
            }
        }
        
        return "# Word Document\n\nWord document parsing not available. Install phpoffice/phpword for DOCX support.";
    }
    
    private function convertXlsxToMarkdown($filePath) {
        if (class_exists('\\PhpOffice\\PhpSpreadsheet\\IOFactory')) {
            try {
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
                $content = "# Excel Spreadsheet\n\n";
                
                foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                    $content .= "## " . $worksheet->getTitle() . "\n\n";
                    $content .= "| ";
                    
                    $highestRow = $worksheet->getHighestRow();
                    $highestColumn = $worksheet->getHighestColumn();
                    
                    for ($row = 1; $row <= $highestRow; $row++) {
                        $rowData = [];
                        for ($col = 'A'; $col <= $highestColumn; $col++) {
                            $cellValue = $worksheet->getCell($col . $row)->getCalculatedValue();
                            $rowData[] = $cellValue;
                        }
                        $content .= implode(' | ', $rowData) . " |\n";
                        
                        if ($row === 1) {
                            $content .= "|" . str_repeat(" --- |", count($rowData)) . "\n";
                        }
                    }
                    $content .= "\n";
                }
                
                return $content;
            } catch (Exception $e) {
                $this->logger->warning('XLSX parsing failed', ['error' => $e->getMessage()]);
            }
        }
        
        return "# Excel Spreadsheet\n\nSpreadsheet parsing not available. Install phpoffice/phpspreadsheet for XLSX support.";
    }
    
    private function convertCsvToMarkdown($filePath) {
        $content = "# CSV Data\n\n";
        
        if (($handle = fopen($filePath, 'r')) !== false) {
            $isFirstRow = true;
            $headers = [];
            
            while (($data = fgetcsv($handle, 0, ",")) !== false) {
                if ($isFirstRow) {
                    // First row as headers
                    $headers = $data;
                    // Remove BOM
                    if (!empty($headers[0])) {
                        $headers[0] = ltrim($headers[0], "\xEF\xBB\xBF");
                    }
                    $content .= "| " . implode(" | ", array_map(function($h) { 
                        return trim(str_replace(["|", "\n", "\r"], ["\\|", " ", " "], $h)); 
                    }, $headers)) . " |\n";
                    $content .= "|" . str_repeat(" --- |", count($headers)) . "\n";
                    $isFirstRow = false;
                } else {
                    // Data rows - sanitize data
                    $sanitizedData = array_map(function($cell) {
                        return trim(str_replace(["|", "\n", "\r"], ["\\|", " ", " "], $cell));
                    }, $data);
                    $content .= "| " . implode(" | ", $sanitizedData) . " |\n";
                }
            }
            
            fclose($handle);
        } else {
            $content .= "CSV file could not be read.";
        }
        
        return $content;
    }
    
    private function convertPptxToMarkdown($filePath) {
        if (class_exists('\\PhpOffice\\PhpPresentation\\IOFactory')) {
            try {
                $presentation = \PhpOffice\PhpPresentation\IOFactory::load($filePath);
                $content = "# PowerPoint Presentation\n\n";
                
                $slideNumber = 1;
                foreach ($presentation->getAllSlides() as $slide) {
                    $content .= "## Slide " . $slideNumber . "\n\n";
                    
                    foreach ($slide->getShapeCollection() as $shape) {
                        if ($shape instanceof \PhpOffice\PhpPresentation\Shape\RichText) {
                            $textContent = '';
                            foreach ($shape->getParagraphs() as $paragraph) {
                                foreach ($paragraph->getRichTextElements() as $element) {
                                    if ($element instanceof \PhpOffice\PhpPresentation\Shape\RichText\TextElement) {
                                        $textContent .= $element->getText();
                                    }
                                }
                                $textContent .= "\n";
                            }
                            
                            if (!empty(trim($textContent))) {
                                $content .= trim($textContent) . "\n\n";
                            }
                        }
                    }
                    
                    $slideNumber++;
                }
                
                return $content;
            } catch (Exception $e) {
                $this->logger->warning('PPTX parsing failed', ['error' => $e->getMessage()]);
            }
        }
        
        // Fallback: Try to extract using ZIP parsing (PPTX is ZIP-based)
        try {
            return $this->extractPptxWithZip($filePath);
        } catch (Exception $e) {
            $this->logger->warning('PPTX ZIP extraction failed', ['error' => $e->getMessage()]);
        }
        
        return "# PowerPoint Presentation\n\nPowerPoint parsing not available. Install phpoffice/phppresentation for full PPTX support.";
    }
    
    private function extractPptxWithZip($filePath) {
        if (!class_exists('ZipArchive')) {
            throw new Exception('ZipArchive not available');
        }
        
        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== TRUE) {
            throw new Exception('Cannot open PPTX file');
        }
        
        $content = "# PowerPoint Presentation\n\n";
        
        // Extract slide content from XML files
        for ($i = 1; ; $i++) { // Check all slides
            $slideXml = $zip->getFromName("ppt/slides/slide{$i}.xml");
            if ($slideXml === false) {
                break; // No more slides
            }
            
            $content .= "## Slide " . $i . "\n\n";
            
            // Parse XML to extract text content
            try {
                $dom = new \DOMDocument();
                $dom->loadXML($slideXml);
                $xpath = new \DOMXPath($dom);
                
                // Extract text from text nodes
                $textNodes = $xpath->query('//a:t', $dom);
                foreach ($textNodes as $textNode) {
                    $text = trim($textNode->textContent);
                    if (!empty($text)) {
                        $content .= $text . "\n";
                    }
                }
                $content .= "\n";
                
            } catch (Exception $e) {
                $content .= "Error parsing slide content\n\n";
            }
        }
        
        $zip->close();
        
        if (strlen($content) <= 50) { // Only header
            $content .= "No readable text content found in presentation.";
        }
        
        return $content;
    }
    
    private function extractMetadata($fileName, $fileSize) {
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        return [
            'original_name' => $fileName,
            'extension' => $extension,
            'size' => $fileSize,
            'type' => $this->getFileType($extension),
            'searchable' => in_array($extension, [
                // PDF files
                'pdf',
                // Word documents  
                'doc', 'docx',
                // Excel spreadsheets
                'xls', 'xlsx', 
                // PowerPoint presentations
                'ppt', 'pptx',
                // Text files
                'txt', 'md', 'markdown', 'csv', 'json', 'xml', 'log', 'conf', 'config', 
                'ini', 'properties', 'html', 'htm', 'css', 'js', 'ts', 'php', 'py', 
                'sql', 'yaml', 'yml', 'toml', 'rtf', 'bat', 'sh'
            ]),
            'keywords' => $this->extractKeywords($fileName)
        ];
    }
    
    private function getFileType($extension) {
        $types = [
            // PDF files
            'pdf' => 'document',
            
            // Word documents
            'doc' => 'document',
            'docx' => 'document',
            
            // Excel spreadsheets  
            'xls' => 'spreadsheet',
            'xlsx' => 'spreadsheet',
            
            // PowerPoint presentations
            'ppt' => 'presentation',
            'pptx' => 'presentation',
            
            // Text files
            'txt' => 'text',
            'md' => 'markdown',
            'markdown' => 'markdown',
            'csv' => 'data',
            'json' => 'data',
            'xml' => 'data',
            'log' => 'log',
            'conf' => 'config',
            'config' => 'config',
            'ini' => 'config',
            'properties' => 'config',
            'html' => 'web',
            'htm' => 'web',
            'css' => 'web',
            'js' => 'code',
            'ts' => 'code',
            'php' => 'code',
            'py' => 'code',
            'sql' => 'database',
            'yaml' => 'config',
            'yml' => 'config',
            'toml' => 'config',
            'rtf' => 'text',
            'bat' => 'script',
            'sh' => 'script'
        ];
        
        return $types[$extension] ?? 'unknown';
    }
    
    private function extractKeywords($fileName) {
        $name = pathinfo($fileName, PATHINFO_FILENAME);
        $keywords = preg_split('/[_\-\s]+/', strtolower($name));
        return array_filter($keywords, function($word) {
            return strlen($word) > 2;
        });
    }
    
    public function getFile($fileId) {
        $sql = "SELECT * FROM files WHERE id = ?";
        return $this->db->fetchOne($sql, [$fileId]);
    }
    
    public function getFiles($limit = null, $offset = 0) {
        if ($limit === null) {
            $sql = "SELECT * FROM files ORDER BY created_at DESC";
            return $this->db->fetchAll($sql);
        } else {
            $sql = "SELECT * FROM files ORDER BY created_at DESC LIMIT ? OFFSET ?";
            return $this->db->fetchAll($sql, [$limit, $offset]);
        }
    }
    
    public function searchFiles($query, $limit = null) {
        if ($limit === null) {
            $sql = "SELECT * FROM files WHERE 
                    original_name LIKE ? 
                    ORDER BY created_at DESC";
            
            $searchTerm = "%{$query}%";
            return $this->db->fetchAll($sql, [$searchTerm]);
        } else {
            $sql = "SELECT * FROM files WHERE 
                    original_name LIKE ? 
                    ORDER BY created_at DESC LIMIT ?";
            
            $searchTerm = "%{$query}%";
            return $this->db->fetchAll($sql, [$searchTerm, $limit]);
        }
    }
    
    public function deleteFile($fileId) {
        // Validate file ID
        if (!$fileId || !is_numeric($fileId)) {
            throw new Exception('Invalid file ID');
        }
        
        $file = $this->getFile($fileId);
        if (!$file) {
            throw new Exception('File not found');
        }
        
        try {
            // Delete related records first (message_files)
            $sql = "DELETE FROM message_files WHERE file_id = ?";
            $this->db->query($sql, [$fileId]);
            
            // Delete the file record
            $sql = "DELETE FROM files WHERE id = ?";
            $result = $this->db->query($sql, [$fileId]);
            
            if ($result === false) {
                throw new Exception('Database deletion failed');
            }
            
            $this->logger->info('File record deleted', [
                'file_id' => $fileId,
                'original_name' => $file['original_name']
            ]);
            
        } catch (Exception $e) {
            $this->logger->error('File deletion error', [
                'file_id' => $fileId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to delete file: ' . $e->getMessage());
        }
    }
    
    public function attachFileToMessage($messageId, $fileId) {
        $sql = "INSERT INTO message_files (message_id, file_id) VALUES (?, ?)";
        $this->db->query($sql, [$messageId, $fileId]);
    }
    
    public function getMessageFiles($messageId) {
        $sql = "SELECT f.* FROM files f 
                JOIN message_files mf ON f.id = mf.file_id 
                WHERE mf.message_id = ?";
        
        return $this->db->fetchAll($sql, [$messageId]);
    }
}