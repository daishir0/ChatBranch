// ChotGPT Settings Manager Component

class SettingsManager {
    constructor(app) {
        this.app = app;
        this.settings = {
            model: 'gpt-5-mini',
            systemPrompt: 'You are a helpful assistant.',
            theme: 'dark'
        };
        this.availableModels = [];
        this.messageRenderer = null; // Will be set by app
    }
    
    /**
     * 利用可能なモデル一覧を読み込む
     */
    async loadAvailableModels() {
        try {
            const response = await this.app.apiClient.authenticatedFetch(`${this.app.apiClient.apiBaseUrl}/models.php`);
            const data = await response.json();
            
            if (data.success) {
                this.availableModels = data.models;
                this.renderModelSelect();
            } else {
                console.error('Failed to load models:', data.error);
                // フォールバック
                this.availableModels = [
                    { id: 'gpt-5', name: 'GPT-5 (Full Model)', description: 'Most capable model', category: 'premium', enabled: true },
                    { id: 'gpt-5-mini', name: 'GPT-5 Mini (Recommended)', description: 'Perfect balance', category: 'standard', enabled: true, default: true },
                    { id: 'gpt-5-nano', name: 'GPT-5 Nano (Ultra-Fast)', description: 'Ultra-low-latency', category: 'basic', enabled: true },
                    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Legacy)', description: 'Previous generation', category: 'legacy', enabled: true }
                ];
                this.renderModelSelect();
            }
        } catch (error) {
            console.error('Error loading models:', error);
            // フォールバック
            this.availableModels = [
                { id: 'gpt-5', name: 'GPT-5 (Full Model)', description: 'Most capable model', category: 'premium', enabled: true },
                { id: 'gpt-5-mini', name: 'GPT-5 Mini (Recommended)', description: 'Perfect balance', category: 'standard', enabled: true, default: true },
                { id: 'gpt-5-nano', name: 'GPT-5 Nano (Ultra-Fast)', description: 'Ultra-low-latency', category: 'basic', enabled: true },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Legacy)', description: 'Previous generation', category: 'legacy', enabled: true }
            ];
            this.renderModelSelect();
        }
    }
    
    /**
     * モデル選択肢を動的に生成
     */
    renderModelSelect() {
        const modelSelect = document.getElementById('modelSelect');
        if (!modelSelect) return;
        
        modelSelect.innerHTML = '';
        
        // 有効なモデルのみ表示
        const enabledModels = this.availableModels.filter(model => model.enabled);
        
        enabledModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            
            // 説明があれば追加
            if (model.description) {
                option.title = model.description;
            }
            
            modelSelect.appendChild(option);
        });
    }
    
    /**
     * 設定を読み込む
     */
    async loadSettings() {
        try {
            // Load available models first
            await this.loadAvailableModels();
            
            // Load settings from server
            const data = await this.app.apiClient.getSettings();
            
            if (data.success) {
                this.settings = { ...this.settings, ...data.settings };
            } else {
                console.error('Failed to load settings:', data.error);
                // Use default settings if server fails
                this.settings = {
                    model: 'gpt-5-mini',
                    systemPrompt: 'You are a helpful assistant.',
                    theme: 'dark'
                };
            }
        } catch (error) {
            console.error('Settings load error:', error);
            // Use default settings on error
            this.settings = {
                model: 'gpt-5-mini',
                systemPrompt: 'You are a helpful assistant.',
                theme: 'dark'
            };
        }
        
        this.applyTheme();
    }
    
    /**
     * 設定を保存する
     */
    async saveSettings() {
        this.settings.model = document.getElementById('modelSelect').value;
        this.settings.systemPrompt = document.getElementById('systemPrompt').value;
        this.settings.theme = document.querySelector('input[name="theme"]:checked').value;
        
        this.applyTheme();
        await this.storeSettings();
        this.app.uiManager.hideModal('settingsModal');
    }
    
    /**
     * サーバーに設定を保存
     */
    async storeSettings() {
        try {
            const data = await this.app.apiClient.saveSettings(this.settings);
            if (!data.success) {
                throw new Error(data.error || 'Failed to save settings');
            }
            
            console.log('Settings saved to server');
        } catch (error) {
            console.error('Settings save error:', error);
            alert('設定の保存中にエラーが発生しました。サーバーに接続できません。');
            throw error; // Re-throw to prevent silent failures
        }
    }
    
    /**
     * 設定画面を表示
     */
    showSettings() {
        document.getElementById('modelSelect').value = this.settings.model;
        document.getElementById('systemPrompt').value = this.settings.systemPrompt;
        document.querySelector(`input[name="theme"][value="${this.settings.theme}"]`).checked = true;
        
        this.app.uiManager.showModal('settingsModal');
    }
    
    /**
     * テーマを適用
     */
    applyTheme() {
        document.body.className = this.settings.theme + '-theme';
        
        // Mermaidテーマも更新
        if (typeof mermaid !== 'undefined' && this.messageRenderer) {
            this.messageRenderer.initializeMermaidTheme();
            // 既存の図表を再レンダリング（オプション）
            this.reRenderMermaidDiagrams();
        }
    }
    
    /**
     * Mermaid図表を再レンダリング
     */
    reRenderMermaidDiagrams() {
        const diagrams = document.querySelectorAll('.mermaid.mermaid-processed');
        diagrams.forEach(diagram => {
            diagram.classList.remove('mermaid-processed');
        });
        
        // 少し遅延してから再レンダリング
        setTimeout(() => {
            if (this.messageRenderer) {
                this.messageRenderer.processMermaidDiagrams();
            }
        }, 100);
    }
    
    /**
     * スレッドペルソナ設定を表示
     */
    async showThreadPersona() {
        if (!this.app.currentThread) {
            alert('スレッドを選択してください');
            return;
        }
        
        try {
            // Load current thread persona
            const data = await this.app.apiClient.getThreadPersona(this.app.currentThread);
            
            if (data.success) {
                // Update modal content
                document.getElementById('threadPersonaTextarea').value = data.thread_system_prompt || '';
                this.updatePersonaCharCount(data.thread_system_prompt || '');
                this.updatePersonaButtonState(data.thread_system_prompt || '');
                this.app.uiManager.showModal('threadPersonaModal');
            } else {
                throw new Error(data.error || 'Failed to load thread persona');
            }
        } catch (error) {
            console.error('Thread persona load error:', error);
            alert('ペルソナ設定の読み込みに失敗しました');
        }
    }
    
    /**
     * スレッドペルソナを保存
     */
    async saveThreadPersona() {
        if (!this.app.currentThread) {
            alert('スレッドが選択されていません');
            return;
        }
        
        const persona = document.getElementById('threadPersonaTextarea').value.trim();
        
        if (persona.length > 1000) {
            alert('ペルソナは1000文字以内で入力してください');
            return;
        }
        
        try {
            const data = await this.app.apiClient.setThreadPersona(this.app.currentThread, persona);
            if (data.success) {
                this.app.uiManager.hideModal('threadPersonaModal');
                this.updatePersonaButtonState(persona);
                
                // Show notification for future messages
                if (persona) {
                    this.showNotification('ペルソナが設定されました。新しいメッセージから適用されます。');
                } else {
                    this.showNotification('ペルソナがクリアされました。');
                }
            } else {
                throw new Error(data.error || 'Failed to save thread persona');
            }
        } catch (error) {
            console.error('Thread persona save error:', error);
            alert('ペルソナの保存に失敗しました');
        }
    }
    
    /**
     * スレッドペルソナをクリア
     */
    clearThreadPersona() {
        if (confirm('スレッドペルソナを削除しますか？')) {
            document.getElementById('threadPersonaTextarea').value = '';
            this.updatePersonaCharCount('');
        }
    }
    
    /**
     * ペルソナ文字数カウント更新
     */
    updatePersonaCharCount(text) {
        const count = text.length;
        document.getElementById('personaCharCount').textContent = count;
        
        // Change color based on limit
        const countElement = document.getElementById('personaCharCount');
        if (count > 1000) {
            countElement.style.color = 'var(--error-color, #ff4444)';
        } else if (count > 800) {
            countElement.style.color = 'var(--warning-color, #ffaa00)';
        } else {
            countElement.style.color = '';
        }
    }
    
    /**
     * ペルソナボタン状態更新
     */
    updatePersonaButtonState(persona) {
        const personaBtn = document.getElementById('personaBtn');
        if (persona && persona.trim()) {
            personaBtn.classList.add('active');
            personaBtn.title = 'スレッドペルソナ設定済み';
        } else {
            personaBtn.classList.remove('active');
            personaBtn.title = 'スレッドペルソナ設定';
        }
    }
    
    /**
     * スレッドペルソナ状態読み込み
     */
    async loadThreadPersonaState() {
        if (!this.app.currentThread) {
            this.updatePersonaButtonState('');
            return;
        }
        
        try {
            const data = await this.app.apiClient.getThreadPersona(this.app.currentThread);
            
            if (data.success) {
                this.updatePersonaButtonState(data.thread_system_prompt || '');
            }
        } catch (error) {
            console.error('Failed to load thread persona state:', error);
            this.updatePersonaButtonState('');
        }
    }
    
    /**
     * 通知表示
     */
    showNotification(message) {
        // Simple notification - can be enhanced later
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color, #007bff);
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// グローバルに公開
window.SettingsManager = SettingsManager;