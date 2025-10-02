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

        // 空白の場合、直近のユーザーメッセージを入力
        if (!message) {
            const lastUserMessage = this.getLastUserMessage();
            if (lastUserMessage) {
                messageInput.value = lastUserMessage.content;
                messageInput.focus();

                // ハイライトアニメーション
                messageInput.classList.add('resend-highlight');
                setTimeout(() => messageInput.classList.remove('resend-highlight'), 1000);

                console.log('📝 Last user message loaded for resend:', lastUserMessage.id);
            }
            return;
        }

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
                // ただし、新規ツリーモード中は上書きしない（ルート開始を維持するため）
                if ((!this.app.uiManager || !this.app.uiManager.newTreeMode) && messagePath && messagePath.length > 0) {
                    this.app._currentMessageId = messagePath[messagePath.length - 1].id;
                    console.log('Set currentMessageId to last message in path:', this.app._currentMessageId);

                    // デバッグ用ログ
                    const lastMessage = messagePath[messagePath.length - 1];
                    console.log('Last message role:', lastMessage.role, 'ID:', lastMessage.id);
                } else if (this.app.uiManager && this.app.uiManager.newTreeMode) {
                    console.log('New Tree Mode active: keep currentMessageId as null for root-start');
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

        // If clicked message has children, include the first child (AI response only)
        const clickedMessage = this.findMessageById(tree, this.app._currentMessageId);
        if (clickedMessage && clickedMessage.children && clickedMessage.children.length > 0) {
            const firstChild = clickedMessage.children[0];
            if (firstChild.role === 'assistant') {  // AIメッセージのみ追加
                path.push(firstChild);
            }
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
        
        // 一旦末尾へスクロール
        container.scrollTop = container.scrollHeight;

        // 遅延レンダリング（ハイライト、Mermaid、画像読み込み等）に備えて、
        // しばらくの間は変化の度に末尾へ寄せる（ユーザーが操作する前の初期安定化）
        try {
            const settleMs = 800; // 監視時間
            const start = Date.now();
            let rafId = null;

            const scrollToBottom = () => {
                container.scrollTop = container.scrollHeight;
            };

            // 追加の確定スクロール（タイマー）
            setTimeout(scrollToBottom, 50);
            setTimeout(scrollToBottom, 200);
            setTimeout(scrollToBottom, 600);

            // DOM変化を監視してそのたびに下寄せ
            const mo = new MutationObserver(() => {
                // フレーム終端で実行
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(scrollToBottom);
            });
            mo.observe(container, { childList: true, subtree: true });

            // 一定時間後に監視を終了
            setTimeout(() => { try { mo.disconnect(); } catch (_){} }, settleMs);
        } catch (_) {}

        // スクロールボタンの表示を更新（少し遅らせる）
        setTimeout(() => {
            if (this.app.uiManager) {
                this.app.uiManager.updateScrollButtons();
            }
        }, 150);
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
        
        // Configure action menu (three-dots)
        let actionsHTML = '';
        if (message.role === 'user') {
            actionsHTML = `
                <div class="message-actions">
                    <button class="message-action-btn menu-trigger" title="Menu">⋯</button>
                    <div class="message-menu" style="display:none; position:absolute; right:8px; top:24px; z-index:1000; background: var(--bg-secondary); border:1px solid var(--border-color); border-radius:6px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); min-width: 180px;">
                        <button class="menu-item" data-action="copy" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color: var(--text-primary); cursor:pointer;">📋 Copy</button>
                        <button class="menu-item" data-action="permalink" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color: var(--text-primary); cursor:pointer;">🔗 Copy permalink</button>
                        <div style="height:1px; background: var(--border-color); margin:4px 0;"></div>
                        <button class="menu-item" data-action="edit" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color: var(--text-primary); cursor:pointer;">✏️ Edit</button>
                        <button class="menu-item" data-action="branch" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color: var(--text-primary); cursor:pointer;">🌿 Branch</button>
                        <button class="menu-item danger" data-action="delete" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color: var(--error-color); cursor:pointer;">🗑️ Delete</button>
                    </div>
                </div>
            `;
        } else if (message.role === 'assistant') {
            // AI message: copy and copy all in menu
            actionsHTML = `
                <div class="message-actions ai-actions">
                    <button class="message-action-btn menu-trigger" title="Menu">⋯</button>
                    <div class="message-menu" style="display:none; position:absolute; right:8px; top:24px; z-index:1000; background: var(--bg-secondary); border:1px solid var(--border-color); border-radius:6px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); min-width: 160px;">
                        <button class="menu-item" data-action="copy" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color: var(--text-primary); cursor:pointer;">📋 Copy</button>
                        <button class="menu-item" data-action="copy-all" style="display:block; width:100%; text-align:left; padding:8px 12px; background:none; border:none; color: var(--text-primary); cursor:pointer;">📑 Copy All</button>
                    </div>
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
        
        // Wire up menu interactions
        const actionsContainer = messageDiv.querySelector('.message-actions');
        if (actionsContainer) {
            const trigger = actionsContainer.querySelector('.menu-trigger');
            const menu = actionsContainer.querySelector('.message-menu');
            if (trigger && menu) {
                const closeMenu = () => { menu.style.display = 'none'; document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onEsc); };
                const onDocClick = (e) => { if (!menu.contains(e.target) && e.target !== trigger) closeMenu(); };
                const onEsc = (e) => { if (e.key === 'Escape') closeMenu(); };

                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = menu.style.display === 'block';
                    document.querySelectorAll('.message-menu').forEach(m => m.style.display = 'none');
                    if (!isOpen) {
                        menu.style.display = 'block';
                        setTimeout(() => {
                            document.addEventListener('click', onDocClick);
                            document.addEventListener('keydown', onEsc);
                        }, 0);
                    }
                });

                // Menu item handlers
                menu.querySelectorAll('.menu-item').forEach(item => {
                    item.addEventListener('click', async (ev) => {
                        ev.stopPropagation();
                        const action = item.getAttribute('data-action');
                        try {
                            if (action === 'copy') {
                                await this.app.copyMessage(message.id);
                            } else if (action === 'copy-all') {
                                const result = await this.app.messageActionsManager.copyAllMessages(message.id);
                                if (result && result.success) {
                                    const original = item.textContent;
                                    item.textContent = `✅ Copied (${result.messageCount} messages)`;
                                    setTimeout(() => { item.textContent = original; }, 2000);
                                }
                            } else if (action === 'permalink') {
                                const ok = await this.app.messageActionsManager.copyPermalink(message.id);
                                if (ok) {
                                    const original = item.textContent;
                                    item.textContent = '✅ Copied';
                                    setTimeout(() => { item.textContent = original; }, 1500);
                                }
                            } else if (action === 'edit') {
                                this.app.editMessage(message.id);
                            } else if (action === 'branch') {
                                this.app.branchMessage(message.id);
                            } else if (action === 'delete') {
                                this.app.deleteMessage(message.id);
                            }
                        } finally {
                            closeMenu();
                        }
                    });
                });
            }
        }
        
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

    /**
     * 直近のユーザーメッセージを取得
     */
    getLastUserMessage() {
        if (!this.app._currentThreadMessages || this.app._currentThreadMessages.length === 0) {
            console.log('No thread messages available');
            return null;
        }

        // 現在表示中のメッセージパスを取得
        const messagePath = this.getMessagePath(this.app._currentThreadMessages);

        if (!messagePath || messagePath.length === 0) {
            console.log('No message path found');
            return null;
        }

        // 逆順でユーザーメッセージを検索
        for (let i = messagePath.length - 1; i >= 0; i--) {
            if (messagePath[i].role === 'user') {
                console.log('Found last user message:', messagePath[i].id);
                return messagePath[i];
            }
        }

        console.log('No user message found in path');
        return null;
    }
}

// グローバルに公開
window.ChatManager = ChatManager;
