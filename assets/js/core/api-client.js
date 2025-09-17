// ChatBranch API Client

class APIClient {
    constructor() {
        this.apiBaseUrl = window.appConfig?.urls?.apiUrl || '/api';
    }
    
    /**
     * 認証付きフェッチリクエスト
     */
    async authenticatedFetch(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Authorization': 'Basic ' + window.authCredentials,
                ...options.headers
            }
        };
        
        return fetch(url, { ...options, ...defaultOptions });
    }
    
    // ===================
    // Chat API Methods
    // ===================
    
    /**
     * メッセージ送信
     */
    async sendMessage(payload) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/chat.php?action=send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...payload,
                csrf_token: window.csrfToken
            })
        });
        
        return await response.json();
    }
    
    /**
     * メッセージ履歴取得
     */
    async getMessageHistory(threadId) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/chat.php?action=history&thread_id=${threadId}`);
        return await response.json();
    }
    
    /**
     * メッセージ編集
     */
    async editMessage(messageId, content, systemPrompt, model, files = []) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/chat.php?action=edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message_id: messageId,
                content: content,
                system_prompt: systemPrompt,
                model: model,
                files: files,
                csrf_token: window.csrfToken
            })
        });
        
        return await response.json();
    }
    
    /**
     * メッセージ分岐作成
     */
    async branchMessage(clickedMessageId, content, systemPrompt, model, files = []) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/chat.php?action=branch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clicked_message_id: clickedMessageId,
                content: content,
                system_prompt: systemPrompt,
                model: model,
                files: files,
                csrf_token: window.csrfToken
            })
        });
        
        return await response.json();
    }
    
    /**
     * メッセージ削除
     */
    async deleteMessage(messageId) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/chat.php?action=delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message_id: messageId,
                csrf_token: window.csrfToken
            })
        });
        
        return await response.json();
    }
    
    /**
     * 単一メッセージ取得
     */
    async getMessage(messageId) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/chat.php?action=get&message_id=${messageId}`);
        const data = await response.json();
        return data.success ? data.message : null;
    }
    
    // ===================
    // Thread API Methods
    // ===================
    
    /**
     * スレッド一覧取得
     */
    async listThreads() {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/threads.php?action=list`);
        return await response.json();
    }
    
    /**
     * 空の新規スレッド作成
     */
    async createEmptyThread() {
        const formData = new FormData();
        formData.append('action', 'create_empty');
        formData.append('csrf_token', window.csrfToken);
        
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/threads.php`, {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    }
    
    /**
     * スレッド更新
     */
    async updateThread(threadId, name) {
        const formData = new FormData();
        formData.append('action', 'update');
        formData.append('thread_id', threadId);
        formData.append('name', name);
        formData.append('csrf_token', window.csrfToken);
        
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/threads.php`, {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    }
    
    /**
     * スレッド削除
     */
    async deleteThread(threadId) {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('thread_id', threadId);
        formData.append('csrf_token', window.csrfToken);
        
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/threads.php`, {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    }
    
    /**
     * スレッドツリー取得
     */
    async getThreadTree(threadId) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/threads.php?action=tree&id=${threadId}`);
        return await response.json();
    }
    
    /**
     * スレッドペルソナ取得
     */
    async getThreadPersona(threadId) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/threads.php?action=get_persona&thread_id=${threadId}`);
        return await response.json();
    }
    
    /**
     * スレッドペルソナ設定
     */
    async setThreadPersona(threadId, threadSystemPrompt) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/threads.php?action=set_persona`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                thread_id: threadId,
                thread_system_prompt: threadSystemPrompt,
                csrf_token: window.csrfToken
            })
        });
        
        return await response.json();
    }
    
    // ===================
    // Settings API Methods
    // ===================
    
    /**
     * 設定取得
     */
    async getSettings() {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/settings.php?action=get`);
        return await response.json();
    }
    
    /**
     * システム設定取得（タイムゾーン等）
     */
    async getSystemConfig() {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/settings.php?action=system`);
        return await response.json();
    }
    
    /**
     * 設定保存
     */
    async saveSettings(settings) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/settings.php?action=save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                settings: settings,
                csrf_token: window.csrfToken
            })
        });
        
        return await response.json();
    }
    
    // ===================
    // Files API Methods
    // ===================
    
    /**
     * ファイル情報取得
     */
    async getFileInfo(fileId) {
        const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=get&id=${fileId}`);
        return await response.json();
    }
}

// グローバルに公開
window.APIClient = APIClient;