// ChatBranch UI Manager Component

class UIManager {
    constructor(app) {
        this.app = app;
        this.newTreeMode = false;
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
     * フルスクリーンツリービュー表示
     */
    showFullscreenTree() {
        const fullscreenModal = document.getElementById('fullscreenTreeModal');
        fullscreenModal.style.display = 'flex';

        // フルスクリーン用のツリーを読み込み
        this.loadFullscreenTree();

        // ESCキーでフルスクリーンを閉じるイベントリスナーを追加
        this.setupFullscreenKeyHandler();
    }

    /**
     * フルスクリーンツリービュー非表示
     */
    hideFullscreenTree() {
        const fullscreenModal = document.getElementById('fullscreenTreeModal');
        fullscreenModal.style.display = 'none';

        // キーハンドラーを削除
        this.removeFullscreenKeyHandler();
    }

    /**
     * フルスクリーン用ツリーデータ読み込み
     */
    async loadFullscreenTree() {
        if (!this.app.currentThread) return;

        try {
            const data = await this.app.apiClient.getThreadTree(this.app.currentThread);

            if (data.success) {
                // フルスクリーン用のコンテナでツリーを表示
                window.treeViewer.renderFullscreen(data.tree);
            }
        } catch (error) {
            console.error('Failed to load fullscreen tree:', error);
        }
    }

    /**
     * フルスクリーンモード用キーボードイベント設定
     */
    setupFullscreenKeyHandler() {
        this.fullscreenKeyHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hideFullscreenTree();
            }
        };

        document.addEventListener('keydown', this.fullscreenKeyHandler);
    }

    /**
     * フルスクリーンモード用キーボードイベント削除
     */
    removeFullscreenKeyHandler() {
        if (this.fullscreenKeyHandler) {
            document.removeEventListener('keydown', this.fullscreenKeyHandler);
            this.fullscreenKeyHandler = null;
        }
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
     * 新規ツリーモード切り替え
     */
    toggleNewTreeMode() {
        this.newTreeMode = !this.newTreeMode;

        if (this.newTreeMode) {
            this.enterNewTreeMode();
        } else {
            this.exitNewTreeMode();
        }
    }

    /**
     * 新規ツリーモード開始
     */
    enterNewTreeMode() {
        console.log('Entering New Tree Mode');
        this.newTreeMode = true;

        // UI状態更新
        this.updateNewTreeModeUI();

        // currentMessageIdをnullに設定
        this.app._currentMessageId = null;

        // メッセージ入力エリアのプレースホルダー更新
        this.updateMessageInputPlaceholder();

        // ツリービューがある場合は閉じる
        this.hideTreeView();
    }

    /**
     * 新規ツリーモード終了
     */
    exitNewTreeMode() {
        console.log('Exiting New Tree Mode');
        this.newTreeMode = false;

        // UI状態更新
        this.updateNewTreeModeUI();

        // メッセージ入力エリアのプレースホルダーを元に戻す
        this.updateMessageInputPlaceholder();

        // メッセージを再読み込み
        if (this.app._currentThread) {
            this.app.chatManager.loadMessages();
        }
    }

    /**
     * 新規ツリーモードUI更新
     */
    updateNewTreeModeUI() {
        const newTreeBtn = document.getElementById('newTreeBtn');
        const messagesContainer = document.getElementById('messagesContainer');
        const newTreeMode = document.getElementById('newTreeMode');

        if (this.newTreeMode) {
            // ボタンをアクティブ状態に
            newTreeBtn.classList.add('active');

            // メッセージコンテナを非表示、新規ツリーモードを表示
            messagesContainer.style.display = 'none';
            newTreeMode.style.display = 'flex';
        } else {
            // ボタンのアクティブ状態を解除
            newTreeBtn.classList.remove('active');

            // 新規ツリーモードを非表示、メッセージコンテナを表示
            newTreeMode.style.display = 'none';
            messagesContainer.style.display = 'block';
        }
    }

    /**
     * メッセージ入力エリアのプレースホルダー更新
     */
    updateMessageInputPlaceholder() {
        const messageInput = document.getElementById('messageInput');

        if (this.newTreeMode) {
            messageInput.placeholder = 'Start a new conversation tree...';
        } else {
            messageInput.placeholder = 'Type your message...';
        }
    }

    /**
     * スレッド切り替え時のクリーンアップ
     */
    onThreadSwitch() {
        // 新規ツリーモードが有効な場合は終了
        if (this.newTreeMode) {
            this.exitNewTreeMode();
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