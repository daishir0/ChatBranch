<?php
// Check if setup is completed
if (!file_exists('config.php')) {
    // Redirect to setup page if not configured
    header('Location: setup.php');
    exit;
}

session_start();
require_once 'classes/Database.php';
require_once 'classes/Auth.php';
require_once 'classes/Logger.php';
require_once 'classes/UrlHelper.php';
require_once 'classes/DatabaseInitializer.php';
require_once 'classes/Language.php';

try {
    // Initialize database (created only on first startup)
    $dbInitializer = new DatabaseInitializer();
    $config = $dbInitializer->initializeDatabase();
    
    // Set timezone from config
    if (isset($config['system']['timezone'])) {
        date_default_timezone_set($config['system']['timezone']);
    } else {
        // Fallback
        date_default_timezone_set('UTC');
    }
} catch (Exception $e) {
    die('Configuration or database initialization failed: ' . $e->getMessage());
}

// Initialize URL settings
UrlHelper::init($config);

$logger = new Logger($config);
$auth = new Auth($config);

if (!$auth->authenticate()) {
    exit;
}

$db = Database::getInstance($config);
$csrfToken = $auth->generateCSRFToken();

// Initialize language system
$lang = Language::getInstance();

?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ChatBranch - AI Chat with Conversation Trees</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="dark-theme">
    <div class="app-container">
        <!-- Mobile Sidebar Overlay -->
        <div class="sidebar-overlay" id="sidebarOverlay"></div>
        
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h1 class="logo">ChatBranch</h1>
                <button class="new-chat-btn" id="newChatBtn">
                    <span>+</span> <?= __('navigation.new_chat') ?>
                </button>
            </div>
            
            <!-- Thread Search -->
            <div class="thread-search">
                <div class="search-input-container">
                    <input type="text" id="threadSearch" placeholder="🔍 <?= __('threads.search_placeholder') ?>" class="search-input">
                    <button class="search-clear-btn" id="searchClearBtn" title="<?= __('common.clear') ?>">×</button>
                </div>
                <div class="search-results-info" id="searchResultsInfo" style="display: none;"></div>
            </div>
            
            <div class="thread-list" id="threadList">
                <!-- Thread list will be dynamically loaded here -->
            </div>
            
            <div class="sidebar-footer">
                <button class="settings-btn" id="settingsBtn">⚙️ <?= __('navigation.settings') ?></button>
            </div>
        </aside>
        
        <!-- Main Content -->
        <main class="main-content">
            <!-- Chat Header -->
            <header class="chat-header">
                <div class="header-left">
                    <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
                    <div class="thread-info">
                        <h2 id="currentThreadName"><?= __('chat.select_chat') ?></h2>
                    </div>
                </div>
                <div class="chat-actions">
                    <button class="persona-btn" id="personaBtn" title="<?= __('settings.thread_persona') ?>">🎭</button>
                    <button class="tree-toggle-btn" id="treeToggleBtn" title="Toggle Message Tree">🌳</button>
                </div>
            </header>
            
            <!-- Tree View Panel -->
            <div class="tree-panel" id="treePanel" style="display: none;">
                <div class="tree-container" id="treeContainer">
                    <!-- Message tree will be displayed here -->
                </div>
            </div>
            
            <!-- Chat Messages -->
            <div class="messages-container" id="messagesContainer">
                <div class="welcome-message">
                    <h3><?= __('chat.welcome_title') ?></h3>
                    <p><?= __('chat.welcome_message') ?></p>
                </div>
            </div>
            
            <!-- Scroll Navigation Buttons -->
            <button class="scroll-nav-btn scroll-to-bottom" id="scrollToBottom" title="Scroll to Bottom">↓</button>
            <button class="scroll-nav-btn scroll-to-top" id="scrollToTop" title="Scroll to Top">↑</button>
            
            <!-- Chat Input -->
            <div class="chat-input-container">
                <div class="file-attachments" id="fileAttachments" style="display: none;">
                    <!-- File attachment display area -->
                </div>
                
                <form class="chat-form" id="chatForm">
                    <div class="input-group">
                        <textarea 
                            id="messageInput" 
                            placeholder="<?= __('chat.placeholder') ?>" 
                            rows="3"
                            required
                        ></textarea>
                        <div class="input-actions">
                            <button type="button" id="attachFileBtn" title="<?= __('files.upload') ?>">📎</button>
                            <button type="submit" id="sendBtn" title="<?= __('chat.send') ?>">➤</button>
                        </div>
                    </div>
                </form>
            </div>
        </main>
        
        <!-- File Manager Modal -->
        <div class="modal" id="fileManagerModal" style="display: none;">
            <div class="modal-content file-manager-modal">
                <div class="modal-header">
                    <h3><?= __('files.title') ?></h3>
                    <button class="modal-close" id="fileManagerClose">×</button>
                </div>
                <div class="modal-body">
                    <!-- Upload Area -->
                    <div class="file-upload-area">
                        <input type="file" id="fileUpload" multiple accept=".pdf,.txt,.docx,.xlsx,.pptx,.md,.csv,.jpg,.jpeg,.png,.gif">
                        <label for="fileUpload" class="upload-label">
                            <span class="upload-icon">📤</span>
                            <span class="upload-text"><?= __('files.drag_drop_text') ?></span>
                        </label>
                    </div>
                    
                    <!-- Controls -->
                    <div class="file-controls">
                        <div class="file-search">
                            <input type="text" id="fileSearch" placeholder="🔍 <?= __('files.search_placeholder') ?>">
                        </div>
                        
                        <div class="file-actions">
                            <div class="view-toggle">
                                <button class="view-btn active" id="gridViewBtn" data-view="grid" title="<?= __('files.grid_view') ?>">⚏</button>
                                <button class="view-btn" id="listViewBtn" data-view="list" title="<?= __('files.list_view') ?>">☰</button>
                            </div>
                            
                            <select class="sort-select" id="sortSelect">
                                <option value="name"><?= __('files.sort_name') ?></option>
                                <option value="date"><?= __('files.sort_date') ?></option>
                                <option value="size"><?= __('files.sort_size') ?></option>
                                <option value="type"><?= __('files.sort_type') ?></option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Filter Chips -->
                    <div class="filter-chips">
                        <span class="chip active" data-type="all"><?= __('files.all_types') ?></span>
                        <span class="chip" data-type="pdf">PDF</span>
                        <span class="chip" data-type="word">Word</span>
                        <span class="chip" data-type="excel">Excel</span>
                        <span class="chip" data-type="ppt">PPT</span>
                        <span class="chip" data-type="text">TEXT</span>
                    </div>
                    
                    <!-- Selection Toolbar -->
                    <div class="selection-toolbar" id="selectionToolbar" style="display: none;">
                        <span class="selection-count" id="selectionCount">0 <?= __('files.selected') ?></span>
                        <div class="bulk-actions">
                            <button class="bulk-action-btn" id="bulkDownloadBtn">📥 <?= __('files.download') ?></button>
                            <button class="bulk-action-btn danger" id="bulkDeleteBtn">🗑️ <?= __('common.delete') ?></button>
                            <button class="cancel-selection" id="cancelSelectionBtn"><?= __('common.cancel') ?></button>
                        </div>
                    </div>
                    
                    <!-- File List Container -->
                    <div class="file-container">
                        <div class="file-list grid-view" id="fileList">
                            <!-- Files list will be dynamically generated here -->
                        </div>
                        
                        <div class="empty-state" id="emptyState" style="display: none;">
                            <div class="empty-icon">📁</div>
                            <div class="empty-text"><?= __('files.no_files') ?></div>
                            <div class="empty-subtext"><?= __('files.upload_instruction') ?></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="clearSelectionBtn"><?= __('files.clear_selection') ?></button>
                    <button class="btn-primary" id="selectFilesBtn"><?= __('files.attach_selected') ?></button>
                </div>
            </div>
        </div>
        
        <!-- Delete Confirmation Modal -->
        <div class="modal" id="deleteConfirmModal" style="display: none;">
            <div class="modal-content small">
                <div class="modal-header">
                    <h3><?= __('files.delete_file') ?></h3>
                    <button class="modal-close" id="deleteConfirmClose">×</button>
                </div>
                <div class="modal-body">
                    <div class="delete-confirm-content">
                        <div class="warning-icon">⚠️</div>
                        <div class="delete-message">
                            <p><?= __('files.delete_confirm_message') ?></p>
                            <div class="delete-file-list" id="deleteFileList"></div>
                            <p class="delete-warning"><?= __('files.delete_warning') ?></p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="deleteConfirmCancel"><?= __('common.cancel') ?></button>
                    <button class="btn-danger" id="deleteConfirmOk"><?= __('files.delete_confirm') ?></button>
                </div>
            </div>
        </div>
        
        <!-- Edit Message Modal -->
        <div class="modal" id="editMessageModal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><?= __('messages.edit_message') ?></h3>
                    <button class="modal-close" id="editMessageClose">×</button>
                </div>
                <div class="modal-body">
                    <!-- File Attachments Area -->
                    <div class="file-attachments" id="editFileAttachments" style="display: none;">
                        <!-- File attachment display area -->
                    </div>
                    
                    <div class="edit-message-form">
                        <label for="editMessageTextarea"><?= __('messages.message_content') ?>:</label>
                        <div class="textarea-container">
                            <textarea id="editMessageTextarea" rows="6" placeholder="<?= __('messages.edit_placeholder') ?>"></textarea>
                            <div class="input-actions">
                                <button type="button" id="editAttachFileBtn" title="<?= __('files.upload') ?>">📎</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="editMessageCancel"><?= __('common.cancel') ?></button>
                    <button class="btn-primary" id="editMessageSave"><?= __('common.save') ?></button>
                </div>
            </div>
        </div>
        
        <!-- Branch Message Modal -->
        <div class="modal" id="branchMessageModal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><?= __('messages.branch_message') ?></h3>
                    <button class="modal-close" id="branchMessageClose">×</button>
                </div>
                <div class="modal-body">
                    <!-- File Attachments Area -->
                    <div class="file-attachments" id="branchFileAttachments" style="display: none;">
                        <!-- File attachment display area -->
                    </div>
                    
                    <div class="branch-message-form">
                        <label for="branchMessageTextarea"><?= __('messages.branch_content') ?>:</label>
                        <div class="textarea-container">
                            <textarea id="branchMessageTextarea" rows="6" placeholder="<?= __('messages.branch_placeholder') ?>"></textarea>
                            <div class="input-actions">
                                <button type="button" id="branchAttachFileBtn" title="<?= __('files.upload') ?>">📎</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="branchMessageCancel"><?= __('common.cancel') ?></button>
                    <button class="btn-primary" id="branchMessageSave"><?= __('messages.create_branch') ?></button>
                </div>
            </div>
        </div>
        
        <!-- Thread Persona Modal -->
        <div class="modal" id="threadPersonaModal" style="display: none;">
            <div class="modal-content persona-modal">
                <div class="modal-header">
                    <div class="modal-title-group">
                        <span class="persona-icon">🎭</span>
                        <h3><?= __('settings.thread_persona') ?></h3>
                    </div>
                    <button class="modal-close" id="threadPersonaClose">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="persona-editor">
                        <div class="persona-input-section">
                            <textarea 
                                id="threadPersonaTextarea" 
                                class="persona-textarea"
                                placeholder="<?= __('persona.placeholder') ?>"
                                rows="8"></textarea>
                        </div>
                        
                        <div class="persona-meta">
                            <div class="character-count">
                                <span id="personaCharCount">0</span><span class="count-limit">/50000</span>
                            </div>
                            <div class="persona-hint">
                                💡 <?= __('persona.hint') ?>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-text" id="threadPersonaClear"><?= __('common.reset') ?></button>
                    <div class="action-buttons">
                        <button class="btn-secondary" id="threadPersonaCancel"><?= __('common.cancel') ?></button>
                        <button class="btn-primary" id="threadPersonaSave">
                            <span class="btn-icon">✓</span>
                            <?= __('common.save') ?>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Settings Modal -->
        <div class="modal" id="settingsModal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><?= __('settings.title') ?></h3>
                    <button class="modal-close" id="settingsClose">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group">
                        <label for="modelSelect"><?= __('settings.ai_model') ?></label>
                        <select id="modelSelect">
                            <!-- Model options are dynamically generated by JavaScript -->
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label for="systemPrompt"><?= __('settings.system_prompt') ?></label>
                        <textarea id="systemPrompt" rows="4" placeholder="<?= __('settings.system_prompt_placeholder') ?>">You are a helpful assistant.</textarea>
                    </div>
                    
                    <div class="setting-group">
                        <label><?= __('settings.theme') ?></label>
                        <div class="radio-group">
                            <label><input type="radio" name="theme" value="dark" checked> <?= __('theme.dark') ?></label>
                            <label><input type="radio" name="theme" value="light"> <?= __('theme.light') ?></label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" id="saveSettingsBtn"><?= __('settings.save') ?></button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Loading Spinner -->
    <div class="loading-spinner" id="loadingSpinner" style="display: none;">
        <div class="spinner"></div>
        <p><?= __('chat.generating') ?></p>
    </div>
    
    <script>
        // Pass application configuration to JavaScript
        // Get diagram translations safely
        const diagramTranslations = {
            expand: <?php echo json_encode(__('diagram.expand')); ?>,
            copy: <?php echo json_encode(__('diagram.copy')); ?>,
            copied: <?php echo json_encode(__('diagram.copied')); ?>,
            zoom_in: <?php echo json_encode(__('diagram.zoom_in')); ?>,
            zoom_out: <?php echo json_encode(__('diagram.zoom_out')); ?>,
            reset_zoom: <?php echo json_encode(__('diagram.reset_zoom')); ?>,
            fit_to_window: <?php echo json_encode(__('diagram.fit_to_window')); ?>,
            print: <?php echo json_encode(__('diagram.print')); ?>,
            close: <?php echo json_encode(__('diagram.close')); ?>,
            expanded_view: <?php echo json_encode(__('diagram.expanded_view')); ?>
        };
        
        window.appConfig = {
            csrfToken: '<?php echo $csrfToken; ?>',
            authCredentials: '<?php echo base64_encode($config['auth']['username'] . ':' . $config['auth']['password']); ?>',
            urls: <?php echo json_encode(UrlHelper::getJsConfig()); ?>,
            diagramTranslations: diagramTranslations,
            currentLanguage: '<?php echo $lang->getCurrentLanguage(); ?>'
        };
        
        // For backward compatibility
        window.csrfToken = window.appConfig.csrfToken;
        window.authCredentials = window.appConfig.authCredentials;
    </script>
    <!-- External Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>

    <!-- Core Framework -->
    <script src="assets/js/core/utils.js"></script>
    <script src="assets/js/core/timezone-manager.js"></script>
    <script src="assets/js/core/api-client.js"></script>

    <!-- Components -->
    <script src="assets/js/components/message-renderer.js"></script>
    <script src="assets/js/components/settings-manager.js"></script>
    <script src="assets/js/components/ui-manager.js"></script>
    <script src="assets/js/components/chat-manager.js"></script>
    <script src="assets/js/components/thread-manager.js"></script>
    <script src="assets/js/components/file-manager.js"></script>
    <script src="assets/js/components/diagram-expander.js"></script>

    <!-- Modules -->
    <script src="assets/js/modules/mobile-handler.js"></script>
    <script src="assets/js/modules/message-actions.js"></script>

    <!-- Vis.js Library for Rich Tree Visualization -->
    <script src="https://unpkg.com/vis-network@latest/dist/vis-network.min.js"></script>

    <!-- Main Application -->
    <script src="assets/js/core/app.js"></script>

    <!-- Rich Tree Components -->
    <script src="assets/js/legacy/tree.js"></script>
</body>
</html>