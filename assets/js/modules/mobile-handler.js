// ChatBranch Mobile Handler Module

class MobileHandler {
    constructor(app) {
        this.app = app;
        this.initMobileViewportFix();
        this.initTextareaHeightExpansion();
    }
    
    /**
     * モバイルメニュー切り替え
     */
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar.classList.contains('open')) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }
    
    /**
     * モバイルメニューを開く
     */
    openMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    /**
     * モバイルメニューを閉じる
     */
    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    /**
     * ダブルタップズーム防止
     */
    preventDoubleTabZoom() {
        let lastTouchEnd = 0;
        
        document.addEventListener('touchend', function (event) {
            // Allow scrolling in thread list, sidebar areas, and chat actions
            if (event.target.closest('.thread-list, .sidebar, .chat-actions')) {
                return;
            }
            
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Additional prevention for specific elements
        const elements = document.querySelectorAll('.message, .message-content, .message-text, .messages-container');
        elements.forEach(element => {
            let tapCount = 0;
            let tapTimeout;
            
            element.addEventListener('touchstart', function(event) {
                // テーブル要素内とthread-list内、chat-actions内のタッチは除外
                if (event.target.closest('.table-wrapper, table, .thread-list, .sidebar, .chat-actions')) {
                    return;
                }
                
                tapCount++;
                if (tapCount === 1) {
                    tapTimeout = setTimeout(function() {
                        tapCount = 0;
                    }, 300);
                } else if (tapCount === 2) {
                    clearTimeout(tapTimeout);
                    event.preventDefault();
                    event.stopPropagation();
                    tapCount = 0;
                }
            }, { passive: false });
        });
    }
    
    /**
     * 特定要素へのダブルタップ防止追加
     */
    addDoubleTabPreventionToElement(element) {
        let tapCount = 0;
        let tapTimeout;
        
        element.addEventListener('touchstart', function(event) {
            // テーブル要素内のタッチは除外
            if (event.target.closest('.table-wrapper, table')) {
                return;
            }
            
            tapCount++;
            if (tapCount === 1) {
                tapTimeout = setTimeout(function() {
                    tapCount = 0;
                }, 300);
            } else if (tapCount === 2) {
                clearTimeout(tapTimeout);
                event.preventDefault();
                event.stopPropagation();
                tapCount = 0;
            }
        }, { passive: false });
    }
    
    /**
     * モバイルアクションインタラクション追加
     */
    addMobileActionInteraction(messageElement) {
        // モバイルデバイスでのタップでアクションボタン表示制御
        let tapTimeout = null;
        let isActive = false;
        
        const toggleActions = () => {
            // 他のアクティブなメッセージを非アクティブに
            document.querySelectorAll('.message.active').forEach(el => {
                if (el !== messageElement) {
                    el.classList.remove('active');
                }
            });
            
            // このメッセージのアクティブ状態を切り替え
            isActive = !isActive;
            if (isActive) {
                messageElement.classList.add('active');
                
                // 5秒後に自動的に非アクティブに
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                }
                tapTimeout = setTimeout(() => {
                    messageElement.classList.remove('active');
                    isActive = false;
                }, 5000);
            } else {
                messageElement.classList.remove('active');
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                    tapTimeout = null;
                }
            }
        };
        
        // タッチデバイスでのタップイベント
        let touchStartY = 0;
        let touchMoved = false;
        
        messageElement.addEventListener('touchstart', (e) => {
            // アクションボタンのクリックは除外
            if (e.target.closest('.message-action-btn, .message-actions')) {
                return;
            }
            
            // タッチ開始位置を記録
            touchStartY = e.touches[0].clientY;
            touchMoved = false;
        }, { passive: true });
        
        messageElement.addEventListener('touchmove', (e) => {
            // スクロールが発生したかチェック
            if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
                touchMoved = true;
            }
        }, { passive: true });
        
        messageElement.addEventListener('touchend', (e) => {
            // アクションボタンのクリックは除外
            if (e.target.closest('.message-action-btn, .message-actions')) {
                return;
            }
            
            // メッセージ本体をタップして、スクロールしていない場合のみアクション表示
            if (!touchMoved && (e.target.closest('.message-content') || e.target.closest('.message-text'))) {
                toggleActions();
            }
        }, { passive: true });
        
        // 非タッチデバイス（PC）でのクリック
        messageElement.addEventListener('click', (e) => {
            // タッチデバイスではないか確認
            if ('ontouchstart' in window) {
                return; // タッチデバイスではクリックイベントを無視
            }
            
            // アクションボタンのクリックは除外
            if (e.target.closest('.message-action-btn, .message-actions')) {
                return;
            }
            
            // メッセージ本体をクリックした場合のみアクション表示
            if (e.target.closest('.message-content') || e.target.closest('.message-text')) {
                toggleActions();
            }
        });
        
        // 外部クリックで非アクティブ化
        document.addEventListener('click', (e) => {
            if (!messageElement.contains(e.target)) {
                messageElement.classList.remove('active');
                isActive = false;
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                    tapTimeout = null;
                }
            }
        });
    }

    /**
     * モバイルビューポート高さ修正
     */
    initMobileViewportFix() {
        // モバイルブラウザでの実際のビューポート高さを動的に計算
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        // 初期設定
        setViewportHeight();

        // リサイズとオリエンテーション変更時に再計算
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 100); // iOS対応で少し遅延
        });

        // iOS Safari アドレスバー対応
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            window.addEventListener('scroll', setViewportHeight);
        }
    }

    /**
     * テキストエリア高さ拡張機能（シンプル版）
     */
    initTextareaHeightExpansion() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;

        let originalHeight = '';
        let isExpanded = false;

        // スクロールボタンの元の表示状態を保存
        let scrollButtonsOriginalDisplay = {
            scrollToTop: '',
            scrollToBottom: ''
        };

        // フォーカス時に高さを画面の80%に変更
        messageInput.addEventListener('focus', () => {
            if (isExpanded) return;

            // 元の高さを保存
            originalHeight = messageInput.style.height || getComputedStyle(messageInput).height;

            // スクロールボタンの元の表示状態を保存して隠す
            const scrollToTopBtn = document.getElementById('scrollToTop');
            const scrollToBottomBtn = document.getElementById('scrollToBottom');

            if (scrollToTopBtn) {
                // 計算されたスタイルも含めて現在の表示状態を取得
                const computedDisplay = getComputedStyle(scrollToTopBtn).display;
                scrollButtonsOriginalDisplay.scrollToTop = scrollToTopBtn.style.display || computedDisplay;
                scrollToTopBtn.style.display = 'none';
            }

            if (scrollToBottomBtn) {
                // 計算されたスタイルも含めて現在の表示状態を取得
                const computedDisplay = getComputedStyle(scrollToBottomBtn).display;
                scrollButtonsOriginalDisplay.scrollToBottom = scrollToBottomBtn.style.display || computedDisplay;
                scrollToBottomBtn.style.display = 'none';
            }

            // 画面の80%の高さに変更
            const newHeight = window.innerHeight * 0.8;
            messageInput.style.height = `${newHeight}px`;
            messageInput.style.minHeight = `${newHeight}px`;
            messageInput.style.maxHeight = `${newHeight}px`;

            isExpanded = true;
        });

        // ブラー時に元の高さに戻す
        messageInput.addEventListener('blur', () => {
            if (!isExpanded) return;

            // 元の高さに戻す
            messageInput.style.height = originalHeight;
            messageInput.style.minHeight = '';
            messageInput.style.maxHeight = '';

            // スクロールボタンの表示状態を元に戻す
            const scrollToTopBtn = document.getElementById('scrollToTop');
            const scrollToBottomBtn = document.getElementById('scrollToBottom');

            if (scrollToTopBtn) {
                // 元々noneだった場合はnoneのまま、そうでなければ元の状態に戻す
                if (scrollButtonsOriginalDisplay.scrollToTop === 'none') {
                    scrollToTopBtn.style.display = 'none';
                } else {
                    scrollToTopBtn.style.display = scrollButtonsOriginalDisplay.scrollToTop === 'flex' ? 'flex' : '';
                }
            }

            if (scrollToBottomBtn) {
                // 元々noneだった場合はnoneのまま、そうでなければ元の状態に戻す
                if (scrollButtonsOriginalDisplay.scrollToBottom === 'none') {
                    scrollToBottomBtn.style.display = 'none';
                } else {
                    scrollToBottomBtn.style.display = scrollButtonsOriginalDisplay.scrollToBottom === 'flex' ? 'flex' : '';
                }
            }

            isExpanded = false;
        });
    }
}

// グローバルに公開
window.MobileHandler = MobileHandler;