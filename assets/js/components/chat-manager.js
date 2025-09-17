// ChatBranch Chat Manager Component

class ChatManager {
    constructor(app) {
        this.app = app;
        this.messageRenderer = new MessageRenderer();
    }
    
    /**
     * メッセージを送信
     */
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = true;
        messageInput.disabled = true;
        
        this.app.uiManager.showLoading();
        
        try {
            const selectedFiles = (this.app.fileAttachmentManager && this.app.fileAttachmentManager.selectedFiles) 
                ? this.app.fileAttachmentManager.selectedFiles 
                : [];
            
            console.log('🔍 Sending message with files:', selectedFiles);
            
            const data = await this.app.apiClient.sendMessage({
                message: message,
                thread_id: this.app._currentThread,
                parent_message_id: this.app._currentMessageId,
                files: selectedFiles,
                system_prompt: this.app.settingsManager.settings.systemPrompt,
                model: this.app.settingsManager.settings.model
            });
            
            if (data.success) {
                messageInput.value = '';
                
                // Clear attached files
                if (this.app.fileAttachmentManager) {
                    this.app.fileAttachmentManager.selectedFiles = [];
                    this.app.fileAttachmentManager.updateFileAttachments();
                } else {
                    console.warn('⚠️ fileAttachmentManager not available for cleanup');
                }
                
                // Update thread ID (thread creation for new chat has been removed)
                // currentThread should be set in advance
                
                this.app._currentMessageId = data.assistant_message_id;

                // 新規ツリーモードが有効な場合は終了
                if (this.app.uiManager.newTreeMode) {
                    this.app.uiManager.exitNewTreeMode();
                }

                this.loadMessages();
                this.app.uiManager.loadTree();
            } else {
                throw new Error(data.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Send message error:', error);
            alert('Failed to send message: ' + error.message);
        } finally {
            this.app.uiManager.hideLoading();
            sendBtn.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        }
    }
    
    /**
     * メッセージ履歴を読み込み
     */
    async loadMessages() {
        if (!this.app._currentThread) return;
        
        try {
            console.log('Loading messages for thread:', this.app._currentThread);
            const data = await this.app.apiClient.getMessageHistory(this.app._currentThread);
            console.log('Response data:', data);
            
            if (data.success) {
                console.log('Processing tree data...');
                
                // Store the complete message tree for copy functionality
                this.app._currentThreadMessages = data.tree;
                console.log('Stored currentThreadMessages:', this.app._currentThreadMessages.length, 'messages');
                
                // Get the path for current message instead of rendering entire tree
                const messagePath = this.getMessagePath(data.tree);
                console.log('Message path:', messagePath);
                
                this.renderMessagePath(messagePath);
                
                // スレッド読み込み時にスクロールボタンを表示
                this.showScrollButtons();
                
                // Set currentMessageId to the last message in the displayed path
                // ただし、既にcurrentMessageIdが設定されている場合（編集後など）は上書きしない
                if (messagePath && messagePath.length > 0 && !this.app._currentMessageId) {
                    this.app._currentMessageId = messagePath[messagePath.length - 1].id;
                    console.log('Set currentMessageId to:', this.app._currentMessageId);
                } else if (this.app._currentMessageId) {
                    console.log('Keeping existing currentMessageId:', this.app._currentMessageId);
                }
            } else {
                console.error('Data success is false:', data);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            console.error('Error details:', error.stack);
        }
    }
    
    /**
     * メッセージパス取得
     */
    getMessagePath(tree) {
        // If no current message selected, find the deepest message path
        if (!this.app._currentMessageId) {
            return this.findDeepestPath(tree);
        }
        
        // Find path to currentMessageId
        const path = [];
        const found = this.findMessagePath(tree, this.app._currentMessageId, path);
        
        // フォールバック: メッセージが見つからない場合、直接探索
        if (!found || path.length === 0) {
            const directMessage = this.findMessageById(tree, this.app._currentMessageId);
            if (directMessage) {
                console.log('Fallback: Found message directly, adding to path');
                path.push(directMessage);
            }
        }
        
        // If clicked message has children, include the first child (AI response)
        const clickedMessage = this.findMessageById(tree, this.app._currentMessageId);
        if (clickedMessage && clickedMessage.children && clickedMessage.children.length > 0) {
            path.push(clickedMessage.children[0]);
        }
        
        return path;
    }
    
    /**
     * 最深のメッセージパスを取得
     */
    findDeepestPath(tree) {
        let deepestPath = [];
        
        const traverse = (nodes, currentPath) => {
            for (const node of nodes) {
                const newPath = [...currentPath, node];
                
                if (!node.children || node.children.length === 0) {
                    // Leaf node - check if this path is deeper
                    if (newPath.length > deepestPath.length) {
                        deepestPath = newPath;
                    }
                } else {
                    // Continue traversing
                    traverse(node.children, newPath);
                }
            }
        };
        
        traverse(tree, []);
        return deepestPath;
    }
    
    /**
     * メッセージパスを検索
     */
    findMessagePath(tree, targetId, currentPath) {
        for (const node of tree) {
            const newPath = [...currentPath, node];
            
            if (node.id == targetId) {
                // Found the target - replace currentPath with the found path
                currentPath.length = 0;
                currentPath.push(...newPath);
                return true;
            }
            
            if (node.children && node.children.length > 0) {
                if (this.findMessagePath(node.children, targetId, newPath)) {
                    // Found in children - update currentPath with the result
                    currentPath.length = 0;
                    currentPath.push(...newPath);
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * IDでメッセージを検索
     */
    findMessageById(tree, targetId) {
        for (const node of tree) {
            if (node.id == targetId) {
                return node;
            }
            
            if (node.children && node.children.length > 0) {
                const found = this.findMessageById(node.children, targetId);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
    
    /**
     * メッセージパスをレンダリング
     */
    async renderMessagePath(messagePath) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';
        
        if (!messagePath || messagePath.length === 0) {
            container.innerHTML = `
                <div class="welcome-message">
                    <h3>Welcome to ChatBranch</h3>
                    <p>Start a new chat or select an existing thread.</p>
                </div>
            `;
            return;
        }
        
        let userMessageIndex = 0;
        
        for (const message of messagePath) {
            if (message.role === 'user') {
                userMessageIndex++;
            }
            
            const messageElement = await this.createMessageElement(message, userMessageIndex);
            container.appendChild(messageElement);
        }
        
        container.scrollTop = container.scrollHeight;
        
        // スクロールボタンの表示を更新
        setTimeout(() => {
            if (this.app.uiManager) {
                this.app.uiManager.updateScrollButtons();
            }
        }, 100);
    }
    
    /**
     * メッセージ要素を作成
     */
    async createMessageElement(message, userMessageIndex = 0) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        messageDiv.dataset.messageId = message.id;
        
        const avatar = message.role === 'user' ? 'U' : 'AI';
        const avatarClass = message.role === 'user' ? 'user' : 'assistant';
        
        // Configure action buttons
        let actionsHTML = '';
        if (message.role === 'user') {
            // User message: edit, branch, delete buttons
            // TODO: 分岐ボタンの表示条件を一時的に変更（元の仕様: userMessageIndex > 1）
            const showBranchButton = true; // 全てのユーザーメッセージに表示
            actionsHTML = `
                <div class="message-actions">
                    <button class="message-action-btn copy-btn" onclick="app.copyMessage(${message.id})" title="Copy">📋</button>
                    <button class="message-action-btn" onclick="app.editMessage(${message.id})" title="Edit">✏️</button>
                    ${showBranchButton ? `<button class="message-action-btn" onclick="app.branchMessage(${message.id})" title="Branch">🌿</button>` : ''}
                    <button class="message-action-btn" onclick="app.deleteMessage(${message.id})" title="Delete">🗑️</button>
                </div>
            `;
        } else if (message.role === 'assistant') {
            // AI message: copy button only
            actionsHTML = `
                <div class="message-actions ai-actions">
                    <button class="message-action-btn copy-btn" onclick="app.copyMessage(${message.id})" title="Copy">📋</button>
                </div>
            `;
        }
        
        const formattedContent = await this.formatMessageContent(message.content);
        
        // Generate token usage display for AI messages
        let tokenInfoHTML = '';
        if (message.role === 'assistant' && message.cumulative_tokens) {
            const tokens = message.cumulative_tokens;
            let colorClass = 'token-info-green';
            if (tokens.usage_percentage > 75) {
                colorClass = 'token-info-red';
            } else if (tokens.usage_percentage > 50) {
                colorClass = 'token-info-yellow';
            }
            
            tokenInfoHTML = `
                <div class="token-usage-info ${colorClass}">
                    <small>(${tokens.usage_display})</small>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar ${avatarClass}">${avatar}</div>
            <div class="message-content">
                ${actionsHTML}
                <div class="message-text">${formattedContent}</div>
                ${tokenInfoHTML}
            </div>
        `;
        
        // Add double-tap prevention to dynamically created messages
        this.app.mobileHandler.addDoubleTabPreventionToElement(messageDiv);
        
        // 折りたたみセクションがある場合、全開閉ボタンを追加
        this.addToggleAllButtonIfNeeded(messageDiv);
        
        // Add mobile tap interaction for showing action buttons
        this.app.mobileHandler.addMobileActionInteraction(messageDiv);
        
        return messageDiv;
    }
    
    /**
     * メッセージ内容をフォーマット
     */
    async formatMessageContent(content) {
        return await this.messageRenderer.renderMessage(content);
    }
    
    /**
     * 折りたたみセクションがあるメッセージに全開閉ボタンを追加
     */
    addToggleAllButtonIfNeeded(messageDiv) {
        // 折りたたみセクションが存在するかチェック
        const collapsibleSections = messageDiv.querySelectorAll('.collapsible-section');
        
        if (collapsibleSections.length > 0) {
            // メッセージアクションエリアを取得
            const actionsDiv = messageDiv.querySelector('.message-actions');
            
            if (actionsDiv) {
                // 全開閉ボタンを作成
                const toggleAllBtn = document.createElement('button');
                toggleAllBtn.className = 'message-action-btn toggle-all-btn';
                toggleAllBtn.title = '全セクション開閉';
                toggleAllBtn.innerHTML = '📂';
                
                // ボタンのクリックイベント
                toggleAllBtn.onclick = () => this.toggleAllSections(messageDiv);
                
                // 既存のボタンの前（一番左）に追加
                actionsDiv.insertBefore(toggleAllBtn, actionsDiv.firstChild);
            }
        }
    }
    
    /**
     * メッセージ内の全セクションを開閉
     */
    toggleAllSections(messageDiv) {
        const sections = messageDiv.querySelectorAll('.collapsible-section');
        if (sections.length === 0) return;
        
        // 現在展開されているセクション数をカウント
        const expandedCount = messageDiv.querySelectorAll('.collapsible-section.expanded').length;
        const shouldCollapse = expandedCount > sections.length / 2;
        
        // 全セクションを開閉
        sections.forEach(section => {
            const toggle = section.querySelector('.section-toggle');
            const sectionId = section.getAttribute('data-section-id');
            
            if (shouldCollapse) {
                // 閉じる
                section.classList.add('collapsed');
                section.classList.remove('expanded');
                if (toggle) toggle.textContent = '▶';
            } else {
                // 開く
                section.classList.remove('collapsed');
                section.classList.add('expanded');
                if (toggle) toggle.textContent = '▼';
            }
        });
    }
    
    /**
     * スクロールボタンを表示
     */
    showScrollButtons() {
        const scrollToTopBtn = document.getElementById('scrollToTop');
        const scrollToBottomBtn = document.getElementById('scrollToBottom');
        
        if (scrollToTopBtn) {
            scrollToTopBtn.style.display = 'flex';
        }
        if (scrollToBottomBtn) {
            scrollToBottomBtn.style.display = 'flex';
        }
        
        // UIManagerのボタン表示ロジックを呼び出し
        if (this.app.uiManager) {
            setTimeout(() => {
                this.app.uiManager.updateScrollButtons();
            }, 100);
        }
    }
    
    /**
     * スクロールボタンを非表示
     */
    hideScrollButtons() {
        const scrollToTopBtn = document.getElementById('scrollToTop');
        const scrollToBottomBtn = document.getElementById('scrollToBottom');
        
        if (scrollToTopBtn) {
            scrollToTopBtn.style.display = 'none';
        }
        if (scrollToBottomBtn) {
            scrollToBottomBtn.style.display = 'none';
        }
    }
    
    /**
     * 新しいチャット開始
     */
    async newChat() {
        try {
            // Create new thread in database
            const data = await this.app.apiClient.createEmptyThread();
            
            if (data.success) {
                // Set created thread as selected
                this.app._currentThread = data.thread_id;
                this.app._currentMessageId = null;
                
                // Clear file attachments safely
                if (this.app.fileAttachmentManager) {
                    this.app.fileAttachmentManager.selectedFiles = [];
                    this.app.fileAttachmentManager.updateFileAttachments();
                }
                
                // Update UI
                document.getElementById('currentThreadName').textContent = data.thread_name;
                document.getElementById('messagesContainer').innerHTML = `
                    <div class="welcome-message">
                        <h3>Start a New Chat</h3>
                        <p>Enter a message to start chatting.</p>
                    </div>
                `;
                
                // Update thread list selection state
                document.querySelectorAll('.thread-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.threadId == data.thread_id);
                });
                
                // Enable buttons
                this.app.updateThreadDependentButtons();
                
                // Update thread list - directly add newly created thread
                const now = new Date();
                const localDateTime = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0') + ' ' + 
                    String(now.getHours()).padStart(2, '0') + ':' + 
                    String(now.getMinutes()).padStart(2, '0') + ':' + 
                    String(now.getSeconds()).padStart(2, '0');
                
                this.app.threadManager.addNewThreadToList({
                    id: data.thread_id,
                    name: data.thread_name,
                    created_at: localDateTime,
                    updated_at: localDateTime
                });
                
                this.hideScrollButtons();
                this.app.uiManager.hideTreeView();
            }
        } catch (error) {
            console.error('New thread creation error:', error);
            // Fallback: traditional behavior
            this.app._currentThread = null;
            this.app._currentMessageId = null;
            
            if (this.app.fileAttachmentManager) {
                this.app.fileAttachmentManager.selectedFiles = [];
                this.app.fileAttachmentManager.updateFileAttachments();
            }
            
            this.app.updateThreadDependentButtons();
            
            document.getElementById('currentThreadName').textContent = 'New Chat';
            document.getElementById('messagesContainer').innerHTML = `
                <div class="welcome-message">
                    <h3>Start a New Chat</h3>
                    <p>Enter a message to start chatting.</p>
                </div>
            `;
            
            document.querySelectorAll('.thread-item').forEach(item => {
                item.classList.remove('active');
            });
            
            this.hideScrollButtons();
            this.app.uiManager.hideTreeView();
        }
    }
}

// グローバルに公開
window.ChatManager = ChatManager;