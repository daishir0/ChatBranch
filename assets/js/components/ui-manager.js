// ChatBranch UI Manager Component

class UIManager {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * モーダル表示
     */
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }
    
    /**
     * モーダル非表示
     */
    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    /**
     * ローディング表示
     */
    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    }
    
    /**
     * ローディング非表示
     */
    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
    
    /**
     * ツリービュー切り替え
     */
    toggleTreeView() {
        const treePanel = document.getElementById('treePanel');
        const toggleBtn = document.getElementById('treeToggleBtn');
        
        if (treePanel.style.display === 'none' || !treePanel.style.display) {
            this.showTreeView();
        } else {
            this.hideTreeView();
        }
    }
    
    /**
     * ツリービュー表示
     */
    showTreeView() {
        const treePanel = document.getElementById('treePanel');
        const toggleBtn = document.getElementById('treeToggleBtn');
        
        treePanel.style.display = 'block';
        toggleBtn.classList.add('active');
        this.loadTree();
    }
    
    /**
     * ツリービュー非表示
     */
    hideTreeView() {
        const treePanel = document.getElementById('treePanel');
        const toggleBtn = document.getElementById('treeToggleBtn');
        
        treePanel.style.display = 'none';
        toggleBtn.classList.remove('active');
    }
    
    /**
     * ツリーデータ読み込み
     */
    async loadTree() {
        if (!this.app.currentThread) return;
        
        try {
            const data = await this.app.apiClient.getThreadTree(this.app.currentThread);
            
            if (data.success) {
                window.treeViewer.render(data.tree);
            }
        } catch (error) {
            console.error('Failed to load tree:', error);
        }
    }
}

// グローバルに公開
window.UIManager = UIManager;