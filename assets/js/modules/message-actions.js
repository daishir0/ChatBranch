// ChatBranch Message Actions Manager Module

class MessageActionsManager {
    constructor(app) {
        this.app = app;
        this.currentEditMessageId = null;
        this.currentBranchParentId = null;
    }
    
    /**
     * メッセージを編集
     */
    async editMessage(messageId) {
        // Get current message content
        try {
            const message = await this.app.apiClient.getMessage(messageId);
            if (message) {
                this.currentEditMessageId = messageId;
                document.getElementById('editMessageTextarea').value = message.content;
                this.app.uiManager.showModal('editMessageModal');
                
                // Focus on textarea after modal is shown
                setTimeout(() => {
                    const textarea = document.getElementById('editMessageTextarea');
                    textarea.focus();
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }, 100);
            }
        } catch (error) {
            console.error('Get message error:', error);
            alert('Failed to retrieve message');
        }
    }
    
    /**
     * 編集したメッセージを保存
     */
    async saveEditedMessage() {
        const newContent = document.getElementById('editMessageTextarea').value.trim();
        
        if (!newContent) {
            alert('Please enter message content');
            return;
        }
        
        if (!this.currentEditMessageId) {
            alert('Error: Target message for editing not found');
            return;
        }
        
        // Show loading spinner
        document.getElementById('loadingSpinner').style.display = 'flex';
        
        try {
            // Get selected files for edit message
            const selectedFiles = window.editSelectedFiles || [];
            
            const data = await this.app.apiClient.editMessage(
                this.currentEditMessageId,
                newContent,
                this.app.settingsManager.settings.systemPrompt,
                this.app.settingsManager.settings.model,
                selectedFiles
            );
            
            console.log('Edit message response:', data);
            
            if (data.success) {
                this.app.uiManager.hideModal('editMessageModal');
                
                // Clear edit file attachments
                window.editSelectedFiles = [];
                const editAttachments = document.getElementById('editFileAttachments');
                if (editAttachments) {
                    editAttachments.style.display = 'none';
                    editAttachments.innerHTML = '';
                }
                
                // 編集完了後、適切なメッセージIDを設定
                if (data.ai_response && data.ai_response.message_id) {
                    // AIレスポンスがある場合はそのIDを設定
                    this.app._currentMessageId = data.ai_response.message_id;
                    console.log('Set currentMessageId to AI response:', data.ai_response.message_id);
                } else {
                    // AIレスポンスがない場合は編集されたメッセージ自体を設定
                    this.app._currentMessageId = this.currentEditMessageId;
                    console.log('Set currentMessageId to edited message:', this.currentEditMessageId);
                }
                
                // Check if AI response generation was successful
                if (data.ai_response && data.ai_response.error) {
                    alert('Message was updated but AI response generation failed: ' + data.ai_response.error);
                } else if (data.ai_response) {
                    console.log('AI response generated:', data.ai_response);
                }
                
                // Reload messages and tree
                this.app.chatManager.loadMessages();
                this.app.uiManager.loadTree();
                this.currentEditMessageId = null;
            } else {
                alert('Failed to update message: ' + (data.error || data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Edit message error:', error);
            alert('An error occurred while updating the message');
        } finally {
            // Hide loading spinner
            document.getElementById('loadingSpinner').style.display = 'none';
        }
    }
    
    /**
     * メッセージを分岐
     */
    async branchMessage(messageId) {
        this.currentBranchParentId = messageId;
        document.getElementById('branchMessageTextarea').value = '';
        this.app.uiManager.showModal('branchMessageModal');
        
        // Focus on textarea after modal is shown
        setTimeout(() => {
            const textarea = document.getElementById('branchMessageTextarea');
            textarea.focus();
        }, 100);
    }
    
    /**
     * 分岐メッセージを保存
     */
    async saveBranchMessage() {
        const content = document.getElementById('branchMessageTextarea').value.trim();
        
        if (!content) {
            alert('Please enter branch message content');
            return;
        }
        
        if (!this.currentBranchParentId) {
            alert('Error: Source message for branching not found');
            return;
        }
        
        // Show loading spinner
        document.getElementById('loadingSpinner').style.display = 'flex';
        
        try {
            // Get selected files for branch message
            const selectedFiles = window.branchSelectedFiles || [];
            
            const data = await this.app.apiClient.branchMessage(
                this.currentBranchParentId,
                content,
                this.app.settingsManager.settings.systemPrompt,
                this.app.settingsManager.settings.model,
                selectedFiles
            );
            
            console.log('Branch message response:', data);
            
            if (data.success) {
                this.app.uiManager.hideModal('branchMessageModal');
                
                // Clear branch file attachments
                window.branchSelectedFiles = [];
                const branchAttachments = document.getElementById('branchFileAttachments');
                if (branchAttachments) {
                    branchAttachments.style.display = 'none';
                    branchAttachments.innerHTML = '';
                }
                
                // Update current message to the AI response (for proper path display)
                this.app._currentMessageId = data.ai_response && data.ai_response.message_id ? data.ai_response.message_id : data.user_message_id;
                
                // Check if AI response generation was successful
                if (data.ai_response && data.ai_response.error) {
                    alert('Branch was created but AI response generation failed: ' + data.ai_response.error);
                } else if (data.ai_response) {
                    console.log('AI response generated for branch:', data.ai_response);
                }
                
                // Reload messages and tree
                this.app.chatManager.loadMessages();
                this.app.uiManager.loadTree();
                this.currentBranchParentId = null;
            } else {
                alert('Failed to create branch: ' + (data.error || data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Branch message error:', error);
            alert('An error occurred while creating the branch');
        } finally {
            // Hide loading spinner
            document.getElementById('loadingSpinner').style.display = 'none';
        }
    }
    
    /**
     * メッセージを削除
     */
    async deleteMessage(messageId) {
        if (confirm('Are you sure you want to delete this message?')) {
            try {
                // 削除前に親メッセージIDを取得
                const parentMessageId = this.getParentMessageId(messageId);
                
                const data = await this.app.apiClient.deleteMessage(messageId);
                if (data.success) {
                    // 削除後に親メッセージIDを設定（親がない場合はnull）
                    this.app._currentMessageId = parentMessageId;
                    this.app.chatManager.loadMessages();
                    this.app.uiManager.loadTree();
                }
            } catch (error) {
                console.error('Delete message error:', error);
            }
        }
    }
    
    /**
     * 指定されたメッセージの親メッセージIDを取得
     */
    getParentMessageId(messageId) {
        if (!this.app._currentThreadMessages || this.app._currentThreadMessages.length === 0) {
            return null;
        }
        
        const message = this.findMessageInTree(this.app._currentThreadMessages, messageId);
        return message ? message.parent_message_id : null;
    }
    
    /**
     * メッセージをコピー
     */
    async copyMessage(messageId) {
        try {
            console.log('Copying message:', messageId);
            
            // Step 1: メッセージIDから実際のメッセージデータを取得
            let messageContent = await this.getFullMessageContent(messageId);
            
            if (messageContent) {
                console.log('Retrieved full message content from data, length:', messageContent.length);
                
                // テキストのクリーンアップ
                messageContent = messageContent
                    .replace(/\n\s*\n\s*\n/g, '\n\n') // 3つ以上の改行を2つに
                    .replace(/^\s+|\s+$/g, '') // 前後の空白を削除
                    .trim();
                
                // クリップボードにコピー
                await this.copyTextToClipboard(messageContent);
                this.showCopyFeedback(messageId);
                return;
            }
            
            console.log('Fallback: searching for message element in DOM');
            
            // Step 2: フォールバック - DOM要素から取得
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (!messageElement) {
                console.error('Message element not found for ID:', messageId);
                throw new Error('Message not found');
            }
            
            console.log('Found message element:', messageElement);
            console.log('Element structure:', messageElement.innerHTML);
            
            // ツリーノードの場合は、メインメッセージエリアから該当メッセージを探す
            if (messageElement.classList.contains('tree-node')) {
                console.log('This is a tree node, searching for actual message in main area...');
                const mainMessageElement = document.querySelector(`#messagesContainer [data-message-id="${messageId}"]`);
                if (mainMessageElement) {
                    console.log('Found corresponding message in main area');
                    return this.copyFromDOMElement(mainMessageElement, messageId);
                } else {
                    console.log('No corresponding message found in main area, using stored data');
                    throw new Error('Unable to find full message content');
                }
            }
            
            // 通常のメッセージ要素の場合
            return this.copyFromDOMElement(messageElement, messageId);
            
        } catch (error) {
            console.error('Copy failed:', error);
            console.error('Error stack:', error.stack);
            alert(`Copy failed: ${error.message}`);
        }
    }
    
    /**
     * 完全なメッセージ内容を取得
     */
    async getFullMessageContent(messageId) {
        try {
            // キャッシュされたメッセージからコンテンツを取得
            const allMessages = this.getAllStoredMessages();
            const message = this.findMessageInTree(allMessages, messageId);
            
            if (message && message.content) {
                console.log('Found message in stored data:', message.content.substring(0, 100) + '...');
                return message.content;
            }
            
            console.log('Message not found in stored data, will use DOM fallback');
            return null;
        } catch (error) {
            console.error('Error getting full message content:', error);
            return null;
        }
    }
    
    /**
     * 保存された全メッセージを取得
     */
    getAllStoredMessages() {
        // 現在表示されているメッセージツリーから全メッセージを取得
        if (this.app._currentThreadMessages) {
            return this.app._currentThreadMessages;
        }
        
        // フォールバック: APIから取得（キャッシュがない場合）
        return [];
    }
    
    /**
     * ツリーからメッセージを検索
     */
    findMessageInTree(messages, targetId) {
        for (const message of messages) {
            if (message.id == targetId) {
                return message;
            }
            if (message.children && message.children.length > 0) {
                const found = this.findMessageInTree(message.children, targetId);
                if (found) return found;
            }
        }
        return null;
    }
    
    /**
     * テキストをクリップボードにコピー
     */
    async copyTextToClipboard(text) {
        console.log('Copying text to clipboard, length:', text.length);
        console.log('First 200 chars:', text.substring(0, 200));
        console.log('Last 200 chars:', text.substring(text.length - 200));
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            console.log('Using modern clipboard API');
            await navigator.clipboard.writeText(text);
        } else {
            console.log('Using fallback clipboard method');
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (!successful) {
                throw new Error('Fallback copy command failed');
            }
        }
        
        console.log('Copy successful');
    }
    
    /**
     * DOM要素からコピー
     */
    async copyFromDOMElement(messageElement, messageId) {
        // より柔軟にメッセージテキスト要素を検索
        let messageTextElement = messageElement.querySelector('.message-text');
        
        // .message-textが見つからない場合、代替要素を探す
        if (!messageTextElement) {
            console.log('Primary .message-text not found, searching alternatives...');
            
            // 代替候補を検索
            messageTextElement = messageElement.querySelector('.message-content') || 
                                messageElement.querySelector('.message') || 
                                messageElement;
            
            console.log('Using alternative element:', messageTextElement);
        }
        
        if (!messageTextElement) {
            console.error('No suitable message text element found');
            throw new Error('Message text element not found');
        }
        
        console.log('Found message text element:', messageTextElement);
        
        let textContent = '';
        
        // 複数の方法でテキスト取得を試行
        try {
            // 最も確実な方法：要素をクローンしてボタン類を削除してからテキスト抽出
            const tempDiv = messageTextElement.cloneNode(true);
            
            // すべてのボタン要素とアクション要素を削除
            const elementsToRemove = tempDiv.querySelectorAll('.copy-btn, .message-action-btn, .message-actions, button');
            elementsToRemove.forEach(el => el.remove());
            
            // 方法1: innerTextを使用（最も正確）
            textContent = tempDiv.innerText || '';
            
            // 方法2: innerTextが空の場合、textContentを試行
            if (!textContent.trim()) {
                console.log('innerText empty, trying textContent...');
                textContent = tempDiv.textContent || '';
            }
            
            // 方法3: それでも空の場合、子要素から再帰的に取得
            if (!textContent.trim()) {
                console.log('textContent empty, trying recursive extraction...');
                
                const extractText = (element) => {
                    let text = '';
                    for (const node of element.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            text += node.textContent;
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'BR') {
                                text += '\n';
                            } else if (node.tagName === 'P') {
                                text += extractText(node) + '\n\n';
                            } else if (node.tagName === 'PRE' || node.tagName === 'CODE') {
                                text += node.textContent || node.innerText || '';
                            } else if (node.tagName === 'H1' || node.tagName === 'H2' || node.tagName === 'H3' || 
                                      node.tagName === 'H4' || node.tagName === 'H5' || node.tagName === 'H6') {
                                text += extractText(node) + '\n\n';
                            } else if (node.tagName === 'LI') {
                                text += '• ' + extractText(node) + '\n';
                            } else if (node.tagName === 'TD' || node.tagName === 'TH') {
                                text += extractText(node) + '\t';
                            } else if (node.tagName === 'TR') {
                                text += extractText(node) + '\n';
                            } else {
                                text += extractText(node);
                            }
                        }
                    }
                    return text;
                };
                
                textContent = extractText(tempDiv);
            }
            
            console.log('DOM extracted text content length:', textContent.length);
            console.log('First 200 chars:', textContent.substring(0, 200));
            console.log('Last 200 chars:', textContent.substring(textContent.length - 200));
            
        } catch (extractError) {
            console.error('Text extraction error:', extractError);
            // Emergency fallback
            textContent = messageTextElement.innerText || messageTextElement.textContent || 'Text extraction error';
        }
        
        if (!textContent || !textContent.trim()) {
            console.error('No content found to copy');
            throw new Error('No content to copy');
        }
        
        // テキストのクリーンアップ
        textContent = textContent
            .replace(/\n\s*\n\s*\n/g, '\n\n') // 3つ以上の改行を2つに
            .replace(/^\s+|\s+$/g, '') // 前後の空白を削除
            .trim();
        
        console.log('Cleaned DOM text content:', textContent);
        
        // クリップボードにコピー
        await this.copyTextToClipboard(textContent);
        this.showCopyFeedback(messageId);
    }
    
    /**
     * コピー成功のフィードバック表示
     */
    showCopyFeedback(messageId) {
        const button = document.querySelector(`[data-message-id="${messageId}"] .copy-btn`);
        if (button) {
            const originalText = button.textContent;
            const originalTitle = button.title;
            
            // 一時的に成功表示
            button.textContent = '✅';
            button.title = 'Copied!';
            button.classList.add('copy-success');
            
            // 2秒後に元に戻す
            setTimeout(() => {
                button.textContent = originalText;
                button.title = originalTitle;
                button.classList.remove('copy-success');
            }, 2000);
        }
    }
}

// グローバルに公開
window.MessageActionsManager = MessageActionsManager;