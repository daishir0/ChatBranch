// ChatBranch Main Application (Lightweight Coordinator)

class ChatBranchApp {
    constructor() {
        // Internal properties (prefixed with _ for clarity)
        this._currentThread = null;
        this._currentMessageId = null;
        this._currentThreadMessages = []; // Store complete message tree for copy functionality
        
        // Initialize API client first
        this.apiClient = new APIClient();
        
        // Initialize all managers
        this.settingsManager = new SettingsManager(this);
        this.uiManager = new UIManager(this);
        this.chatManager = new ChatManager(this);
        this.threadManager = new ThreadManager(this);
        this.messageActionsManager = new MessageActionsManager(this);
        this.mobileHandler = new MobileHandler(this);
        
        // Set up file attachment manager after DOM is ready
        this.setupFileAttachmentManager();
        
        // Set up cross-references
        this.settingsManager.messageRenderer = this.chatManager.messageRenderer;
        
        this.init();
    }
    
    /**
     * アプリケーション初期化
     */
    /**
     * ファイル添付マネージャーのセットアップ
     */
    setupFileAttachmentManager() {
        if (window.fileManager) {
            this.fileAttachmentManager = window.fileManager;
            console.log('✅ FileManager successfully linked to app');
        } else {
            console.error('❌ window.fileManager not found');
            // フォールバック: 少し待ってから再試行
            setTimeout(() => {
                if (window.fileManager) {
                    this.fileAttachmentManager = window.fileManager;
                    console.log('✅ FileManager linked to app (delayed)');
                } else {
                    console.error('❌ window.fileManager still not found after delay');
                }
            }, 100);
        }
    }
    
    async init() {
        // Initialize timezone manager first
        this.timezoneManager = new TimeZoneManager();
        await this.timezoneManager.loadSystemTimezone(this);
        
        await this.settingsManager.loadSettings();
        this.bindEvents();
        this.threadManager.loadThreads();
        this.mobileHandler.preventDoubleTabZoom();
        
        // 初期状態でスレッド依存ボタンを無効化
        this.updateThreadDependentButtons();
    }
    
    /**
     * イベントバインディング
     */
    bindEvents() {
        this.bindChatEvents();
        this.bindThreadEvents();
        this.bindSettingsEvents();
        this.bindMobileEvents();
        this.bindModalEvents();
        this.bindMessageActionEvents();
    }
    
    /**
     * チャット関連イベント
     */
    bindChatEvents() {
        // New Chat
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.newChat();
        });
        
        // Chat Form
        document.getElementById('chatForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Message Input
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // Check if device is mobile
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                    || window.innerWidth <= 768;
                
                if (isMobile) {
                    // Mobile: Enter key creates new line (default behavior)
                    return;
                } else {
                    // PC: Enter sends message, Shift+Enter creates new line
                    if (!e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                }
            }
        });
        
        // File Attachment
        document.getElementById('attachFileBtn').addEventListener('click', () => {
            window.fileManager.show();
        });
    }
    
    /**
     * スレッド関連イベント
     */
    bindThreadEvents() {
        // Thread Search
        const threadSearch = document.getElementById('threadSearch');
        const searchClearBtn = document.getElementById('searchClearBtn');
        
        threadSearch.addEventListener('input', (e) => {
            this.threadManager.searchThreads(e.target.value);
            this.threadManager.updateSearchClearButton(e.target.value);
        });
        
        threadSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.threadManager.selectFirstSearchResult();
            } else if (e.key === 'Escape') {
                this.threadManager.clearSearch();
                threadSearch.blur();
            }
        });
        
        searchClearBtn.addEventListener('click', () => {
            this.threadManager.clearSearch();
        });
        
        // Tree Toggle
        const treeToggleHandler = () => {
            this.uiManager.toggleTreeView();
        };
        
        const treeToggleBtn = document.getElementById('treeToggleBtn');
        treeToggleBtn.addEventListener('click', treeToggleHandler);
        treeToggleBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            treeToggleHandler();
        });

        // New Tree Mode Event
        const newTreeToggleHandler = () => {
            this.uiManager.toggleNewTreeMode();
        };

        const newTreeBtn = document.getElementById('newTreeBtn');
        newTreeBtn.addEventListener('click', newTreeToggleHandler);
        newTreeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            newTreeToggleHandler();
        });
    }
    
    /**
     * 設定関連イベント
     */
    bindSettingsEvents() {
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.settingsManager.showSettings();
        });
        
        document.getElementById('settingsClose').addEventListener('click', () => {
            this.uiManager.hideModal('settingsModal');
        });
        
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.settingsManager.saveSettings();
        });
        
        // Thread Persona
        document.getElementById('personaBtn').addEventListener('click', () => {
            this.settingsManager.showThreadPersona();
        });
        
        document.getElementById('threadPersonaClose').addEventListener('click', () => {
            this.uiManager.hideModal('threadPersonaModal');
        });
        
        document.getElementById('threadPersonaCancel').addEventListener('click', () => {
            this.uiManager.hideModal('threadPersonaModal');
        });
        
        document.getElementById('threadPersonaSave').addEventListener('click', () => {
            this.settingsManager.saveThreadPersona();
        });
        
        document.getElementById('threadPersonaClear').addEventListener('click', () => {
            this.settingsManager.clearThreadPersona();
        });
        
        // Character count for persona textarea
        document.getElementById('threadPersonaTextarea').addEventListener('input', (e) => {
            this.settingsManager.updatePersonaCharCount(e.target.value);
        });
    }
    
    /**
     * モバイル関連イベント
     */
    bindMobileEvents() {
        // Mobile Menu
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            this.mobileHandler.toggleMobileMenu();
        });
        
        // Sidebar Overlay
        document.getElementById('sidebarOverlay').addEventListener('click', () => {
            this.mobileHandler.closeMobileMenu();
        });
    }
    
    /**
     * モーダル関連イベント
     */
    bindModalEvents() {
        // Edit Message Modal
        document.getElementById('editMessageClose').addEventListener('click', () => {
            this.uiManager.hideModal('editMessageModal');
        });
        
        document.getElementById('editMessageCancel').addEventListener('click', () => {
            this.uiManager.hideModal('editMessageModal');
        });
        
        document.getElementById('editMessageSave').addEventListener('click', () => {
            this.messageActionsManager.saveEditedMessage();
        });
        
        // Edit message textarea keyboard shortcuts
        document.getElementById('editMessageTextarea').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.messageActionsManager.saveEditedMessage();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.uiManager.hideModal('editMessageModal');
            }
        });
        
        // Branch Message Modal
        document.getElementById('branchMessageClose').addEventListener('click', () => {
            this.uiManager.hideModal('branchMessageModal');
        });
        
        document.getElementById('branchMessageCancel').addEventListener('click', () => {
            this.uiManager.hideModal('branchMessageModal');
        });
        
        document.getElementById('branchMessageSave').addEventListener('click', () => {
            this.messageActionsManager.saveBranchMessage();
        });
        
        // Branch message textarea keyboard shortcuts
        document.getElementById('branchMessageTextarea').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.messageActionsManager.saveBranchMessage();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.uiManager.hideModal('branchMessageModal');
            }
        });
        
        // File attachment buttons for Branch/Edit modals
        document.getElementById('branchAttachFileBtn').addEventListener('click', () => {
            window.branchFileManager.show();
        });
        
        document.getElementById('editAttachFileBtn').addEventListener('click', () => {
            window.editFileManager.show();
        });
        
        // Modal Close Events
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }
    
    /**
     * メッセージアクション関連イベント
     */
    bindMessageActionEvents() {
        // These are handled via onclick attributes in HTML for compatibility
        // The methods are delegated to messageActionsManager
    }
    
    // ===========================================
    // Public API Methods (Delegation Pattern)
    // ===========================================
    
    /**
     * 新しいチャット開始
     */
    newChat() {
        return this.chatManager.newChat();
    }
    
    /**
     * メッセージ送信
     */
    async sendMessage() {
        // Check if thread is selected
        if (!this.currentThread) {
            // Show alert and highlight new chat button
            alert('Please create a new chat first before sending a message.');

            // Temporarily enhance highlight effect
            const newChatBtn = document.getElementById('newChatBtn');
            if (newChatBtn) {
                newChatBtn.classList.add('highlighted');
                newChatBtn.style.animation = 'pulse 0.5s ease-in-out 3';

                // Reset animation after effect
                setTimeout(() => {
                    newChatBtn.style.animation = 'pulse 2s infinite';
                }, 1500);
            }

            return;
        }

        return this.chatManager.sendMessage();
    }
    
    /**
     * メッセージ履歴読み込み
     */
    async loadMessages() {
        return this.chatManager.loadMessages();
    }
    
    /**
     * ツリー読み込み
     */
    async loadTree() {
        return this.uiManager.loadTree();
    }
    
    /**
     * スレッド一覧読み込み
     */
    async loadThreads() {
        return this.threadManager.loadThreads();
    }
    
    /**
     * スレッド選択
     */
    selectThread(threadId, threadName) {
        return this.threadManager.selectThread(threadId, threadName);
    }
    
    /**
     * ファイル添付状態更新
     */
    updateFileAttachments() {
        if (this.fileAttachmentManager && this.fileAttachmentManager.updateFileAttachments) {
            console.log('🔍 Calling fileAttachmentManager.updateFileAttachments');
            return this.fileAttachmentManager.updateFileAttachments();
        } else {
            console.error('❌ fileAttachmentManager or updateFileAttachments method not available');
            console.log('fileAttachmentManager:', this.fileAttachmentManager);
        }
    }
    
    // ===========================================
    // Legacy Compatibility Properties & Methods
    // ===========================================
    
    /**
     * 選択されたファイル一覧（互換性のため）
     */
    get selectedFiles() {
        return this.fileAttachmentManager ? this.fileAttachmentManager.selectedFiles : [];
    }
    
    set selectedFiles(files) {
        console.log('🔍 app.selectedFiles setter called with:', files);
        console.log('🔍 fileAttachmentManager available:', !!this.fileAttachmentManager);
        
        if (this.fileAttachmentManager) {
            this.fileAttachmentManager.selectedFiles = files;
            console.log('🔍 Set fileAttachmentManager.selectedFiles to:', this.fileAttachmentManager.selectedFiles);
        } else {
            console.warn('⚠️ fileAttachmentManager not available, cannot set selectedFiles');
        }
    }
    
    /**
     * 現在のメッセージID（互換性のため）
     */
    get currentMessageId() {
        return this._currentMessageId;
    }
    
    set currentMessageId(messageId) {
        this._currentMessageId = messageId;
    }
    
    /**
     * 現在のスレッドID（互換性のため）
     */
    get currentThread() {
        return this._currentThread;
    }
    
    set currentThread(threadId) {
        this._currentThread = threadId;
    }
    
    /**
     * 現在のスレッドメッセージ（互換性のため）
     */
    get currentThreadMessages() {
        return this._currentThreadMessages;
    }
    
    set currentThreadMessages(messages) {
        this._currentThreadMessages = messages;
    }
    
    /**
     * スレッド依存ボタンの状態を更新
     */
    updateThreadDependentButtons() {
        const personaBtn = document.getElementById('personaBtn');
        const treeToggleBtn = document.getElementById('treeToggleBtn');
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        const newChatBtn = document.getElementById('newChatBtn');

        const hasThread = !!this.currentThread;

        if (personaBtn) {
            personaBtn.disabled = !hasThread;
        }
        if (treeToggleBtn) {
            treeToggleBtn.disabled = !hasThread;
        }

        // Update send button and message input
        if (sendBtn) {
            sendBtn.disabled = !hasThread;
            sendBtn.style.opacity = hasThread ? '1' : '0.5';
        }
        if (messageInput) {
            messageInput.disabled = !hasThread;
            messageInput.placeholder = hasThread ?
                messageInput.getAttribute('data-original-placeholder') || 'Type your message...' :
                'Please create a new chat first to start messaging';

            // Store original placeholder on first run
            if (!messageInput.getAttribute('data-original-placeholder')) {
                messageInput.setAttribute('data-original-placeholder', messageInput.placeholder);
            }
        }

        // Highlight new chat button when no thread selected OR no threads exist
        if (newChatBtn) {
            const noThreadsExist = !this.threadManager || !this.threadManager.allThreads || this.threadManager.allThreads.length === 0;
            const shouldHighlight = !hasThread || noThreadsExist;

            if (shouldHighlight) {
                newChatBtn.classList.add('highlighted');
            } else {
                newChatBtn.classList.remove('highlighted');
            }
        }
    }
    
    /**
     * メッセージ編集（互換性のため）
     */
    editMessage(messageId) {
        return this.messageActionsManager.editMessage(messageId);
    }
    
    /**
     * メッセージ分岐（互換性のため）
     */
    branchMessage(messageId) {
        return this.messageActionsManager.branchMessage(messageId);
    }
    
    /**
     * メッセージ削除（互換性のため）
     */
    deleteMessage(messageId) {
        return this.messageActionsManager.deleteMessage(messageId);
    }
    
    /**
     * メッセージコピー（互換性のため）
     */
    copyMessage(messageId) {
        return this.messageActionsManager.copyMessage(messageId);
    }
    
    /**
     * 添付ファイル削除（互換性のため）
     */
    removeAttachment(fileId) {
        return this.fileAttachmentManager.removeAttachment(fileId);
    }
    
    /**
     * 設定表示（互換性のため）
     */
    showSettings() {
        return this.settingsManager.showSettings();
    }
    
    /**
     * モーダル表示（互換性のため）
     */
    showModal(modalId) {
        return this.uiManager.showModal(modalId);
    }
    
    /**
     * モーダル非表示（互換性のため）
     */
    hideModal(modalId) {
        return this.uiManager.hideModal(modalId);
    }
    
    /**
     * ローディング表示（互換性のため）
     */
    showLoading() {
        return this.uiManager.showLoading();
    }
    
    /**
     * ローディング非表示（互換性のため）
     */
    hideLoading() {
        return this.uiManager.hideLoading();
    }
    
    /**
     * ツリービュー切り替え（互換性のため）
     */
    toggleTreeView() {
        return this.uiManager.toggleTreeView();
    }
}

// Initialize the application
const app = new ChatBranchApp();

// Make app globally available
window.app = app;