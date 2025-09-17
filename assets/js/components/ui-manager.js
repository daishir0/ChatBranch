// ChatBranch UI Manager Component

class UIManager {
    constructor(app) {
        this.app = app;
        this.initScrollNavigation();
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
    
    /**
     * スクロールナビゲーション初期化
     */
    initScrollNavigation() {
        const initButtons = () => {
            const scrollToTopBtn = document.getElementById('scrollToTop');
            const scrollToBottomBtn = document.getElementById('scrollToBottom');
            const messagesContainer = document.getElementById('messagesContainer');
            
            if (!scrollToTopBtn || !scrollToBottomBtn || !messagesContainer) {
                setTimeout(initButtons, 100);
                return;
            }
            
            // 一番上へスクロール機能
            const scrollToTop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    // 新しい方法を試行
                    messagesContainer.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                } catch (error) {
                    // フォールバック: 古いブラウザ向け
                    messagesContainer.scrollTop = 0;
                }
            };
            
            scrollToTopBtn.addEventListener('click', scrollToTop);
            scrollToTopBtn.addEventListener('touchend', scrollToTop);
            
            // 一番下へスクロール機能
            const scrollToBottom = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    // 新しい方法を試行
                    messagesContainer.scrollTo({
                        top: messagesContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                } catch (error) {
                    // フォールバック: 古いブラウザ向け
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            };
            
            scrollToBottomBtn.addEventListener('click', scrollToBottom);
            scrollToBottomBtn.addEventListener('touchend', scrollToBottom);
            
            // スクロール位置に応じてボタン表示を切り替え
            messagesContainer.addEventListener('scroll', () => {
                this.updateScrollButtonVisibility(messagesContainer, scrollToTopBtn, scrollToBottomBtn);
            });
            
            // 初期表示状態を設定
            this.updateScrollButtonVisibility(messagesContainer, scrollToTopBtn, scrollToBottomBtn);
        };
        
        // DOMContentLoadedで試行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initButtons);
        } else {
            // すでにDOMが読み込まれている場合は即座に実行
            initButtons();
        }
        
        // セーフティネット：少し遅らせても実行
        setTimeout(initButtons, 500);
    }
    
    /**
     * スクロールボタン表示更新（外部から呼び出し用）
     */
    updateScrollButtons() {
        const scrollToTopBtn = document.getElementById('scrollToTop');
        const scrollToBottomBtn = document.getElementById('scrollToBottom');
        const messagesContainer = document.getElementById('messagesContainer');
        
        if (scrollToTopBtn && scrollToBottomBtn && messagesContainer) {
            this.updateScrollButtonVisibility(messagesContainer, scrollToTopBtn, scrollToBottomBtn);
        }
    }
    
    /**
     * スクロールボタンの表示状態を更新
     */
    updateScrollButtonVisibility(container, topBtn, bottomBtn) {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        // コンテンツがコンテナより小さい場合は両方のボタンを非表示
        if (scrollHeight <= clientHeight + 50) {
            topBtn.style.display = 'none';
            bottomBtn.style.display = 'none';
            return;
        }
        
        // 上部付近にいる場合は「上へ」ボタンを非表示
        if (scrollTop < 50) {
            topBtn.style.display = 'none';
        } else {
            topBtn.style.display = 'flex';
        }
        
        // 下部付近にいる場合は「下へ」ボタンを非表示
        if (scrollTop + clientHeight >= scrollHeight - 50) {
            bottomBtn.style.display = 'none';
        } else {
            bottomBtn.style.display = 'flex';
        }
    }
}

// グローバルに公開
window.UIManager = UIManager;