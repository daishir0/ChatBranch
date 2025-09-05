// ChotGPT Chat Manager Component

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
                
                // スレッドIDの更新（新規チャット時のスレッド作成は削除済み）
                // currentThreadは事前に設定済みのはず
                
                this.app._currentMessageId = data.assistant_message_id;
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
                
                // Set currentMessageId to the last message in the displayed path
                if (messagePath && messagePath.length > 0) {
                    this.app._currentMessageId = messagePath[messagePath.length - 1].id;
                    console.log('Set currentMessageId to:', this.app._currentMessageId);
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
        this.findMessagePath(tree, this.app._currentMessageId, path);
        
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
                    <h3>ChotGPTへようこそ</h3>
                    <p>新しいチャットを開始するか、既存のスレッドを選択してください。</p>
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
        
        // アクションボタンの設定
        let actionsHTML = '';
        if (message.role === 'user') {
            // ユーザーメッセージ: 編集・分岐・削除ボタン
            const showBranchButton = userMessageIndex > 1;
            actionsHTML = `
                <div class="message-actions">
                    <button class="message-action-btn" onclick="app.editMessage(${message.id})" title="編集">✏️</button>
                    ${showBranchButton ? `<button class="message-action-btn" onclick="app.branchMessage(${message.id})" title="分岐">🌿</button>` : ''}
                    <button class="message-action-btn" onclick="app.deleteMessage(${message.id})" title="削除">🗑️</button>
                </div>
            `;
        } else if (message.role === 'assistant') {
            // AIメッセージ: コピーボタンのみ
            actionsHTML = `
                <div class="message-actions ai-actions">
                    <button class="message-action-btn copy-btn" onclick="app.copyMessage(${message.id})" title="コピー">📋</button>
                </div>
            `;
        }
        
        const formattedContent = await this.formatMessageContent(message.content);
        
        messageDiv.innerHTML = `
            <div class="message-avatar ${avatarClass}">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${formattedContent}</div>
                ${actionsHTML}
            </div>
        `;
        
        // Add double-tap prevention to dynamically created messages
        this.app.mobileHandler.addDoubleTabPreventionToElement(messageDiv);
        
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
     * 新しいチャット開始
     */
    async newChat() {
        try {
            // 新規スレッドをデータベースに作成
            const data = await this.app.apiClient.createEmptyThread();
            
            if (data.success) {
                // 作成されたスレッドを選択状態にする
                this.app._currentThread = data.thread_id;
                this.app._currentMessageId = null;
                
                // Clear file attachments safely
                if (this.app.fileAttachmentManager) {
                    this.app.fileAttachmentManager.selectedFiles = [];
                    this.app.fileAttachmentManager.updateFileAttachments();
                }
                
                // UI更新
                document.getElementById('currentThreadName').textContent = data.thread_name;
                document.getElementById('messagesContainer').innerHTML = `
                    <div class="welcome-message">
                        <h3>新しいチャットを開始</h3>
                        <p>メッセージを入力してチャットを始めてください。</p>
                    </div>
                `;
                
                // スレッド一覧の選択状態を更新
                document.querySelectorAll('.thread-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.threadId == data.thread_id);
                });
                
                // ボタン有効化
                this.app.updateThreadDependentButtons();
                
                // スレッド一覧を更新 - 新規作成したスレッドを直接追加
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
                
                this.app.uiManager.hideTreeView();
            }
        } catch (error) {
            console.error('新規スレッド作成エラー:', error);
            // フォールバック：従来の動作
            this.app._currentThread = null;
            this.app._currentMessageId = null;
            
            if (this.app.fileAttachmentManager) {
                this.app.fileAttachmentManager.selectedFiles = [];
                this.app.fileAttachmentManager.updateFileAttachments();
            }
            
            this.app.updateThreadDependentButtons();
            
            document.getElementById('currentThreadName').textContent = '新しいチャット';
            document.getElementById('messagesContainer').innerHTML = `
                <div class="welcome-message">
                    <h3>新しいチャットを開始</h3>
                    <p>メッセージを入力してチャットを始めてください。</p>
                </div>
            `;
            
            document.querySelectorAll('.thread-item').forEach(item => {
                item.classList.remove('active');
            });
            
            this.app.uiManager.hideTreeView();
        }
    }
}

// グローバルに公開
window.ChatManager = ChatManager;