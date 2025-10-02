// ChatBranch Mobile Handler Module

class MobileHandler {
    constructor(app) {
        this.app = app;
        this.initMobileViewportFix();
        this._preKBMainScrollTop = null;
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

        // VisualViewport を利用してキーボード表示・非表示に追従
        const updateKeyboardState = () => {
            try {
                if (!window.visualViewport) return;
                const vv = window.visualViewport;
                // Account for iOS toolbar offset: keyboard height ~= innerHeight - vv.height - vv.offsetTop
                const kb = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
                document.documentElement.style.setProperty('--kb', `${kb}px`);
                document.body.classList.toggle('kb-open', kb > 0);

                // 入力エリアの実測高さを変数に反映（スクロールボタンや余白に利用）
                const inputContainer = document.querySelector('.chat-input-container');
                if (inputContainer) {
                    document.documentElement.style.setProperty('--composer-h', `${inputContainer.offsetHeight}px`);
                }

                // If using iOS sticky mode, don't attempt restore/freeze here
                if (!document.body.classList.contains('ios-sticky-mode')) {
                    const mainContent = document.querySelector('.main-content');
                    if (kb > 0) {
                        // Store current scroll to restore after iOS adjustments
                        if (mainContent && this._preKBMainScrollTop === null) {
                            this._preKBMainScrollTop = mainContent.scrollTop;
                        }
                        // Attempt to counter Safari's auto scroll by restoring position
                        if (mainContent) {
                            const restore = () => {
                                try { mainContent.scrollTop = this._preKBMainScrollTop || 0; } catch (e) {}
                            };
                            requestAnimationFrame(() => {
                                restore();
                                setTimeout(restore, 50);
                                setTimeout(restore, 150);
                            });
                        }
                    } else {
                        // Keyboard closed, release lock and clear state
                        this._preKBMainScrollTop = null;
                    }
                }
            } catch (e) {
                // fail-safe: do nothing
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateKeyboardState);
            window.visualViewport.addEventListener('scroll', updateKeyboardState);
            updateKeyboardState();
        }

        // 入力フォーカス時にメッセージ末尾へ、かつ各寸法を更新
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            // 共通: フォーカス時にスクロール末尾へ軽く補助
            messageInput.addEventListener('focus', () => {
                setTimeout(() => {
                    const scrollArea = document.getElementById('messagesContainer');
                    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
                    updateKeyboardState();
                }, 50);
            }, { passive: true });

            // 入力中も高さを追跡
            messageInput.addEventListener('input', () => {
                const inputContainer = document.querySelector('.chat-input-container');
                if (inputContainer) {
                    document.documentElement.style.setProperty('--composer-h', `${inputContainer.offsetHeight}px`);
                }
            });
        }
    }

    /**
     * iOS用のオーバーレイ入力（プロキシ）を初期化
     */
    _initIOSOverlayInput() {
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const isMobile = window.innerWidth <= 768;
        if (!isIOS || !isMobile) return;

        // 既に作成済みならスキップ
        if (this._overlay) return;

        const overlay = document.createElement('div');
        overlay.className = 'ios-input-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <form class="overlay-form">
                <div class="input-group">
                    <textarea class="overlay-textarea" rows="3"></textarea>
                    <div class="input-actions">
                        <button type="button" class="overlay-attach">📎</button>
                        <button type="submit" class="overlay-send">➤</button>
                    </div>
                </div>
            </form>
        `;
        document.body.appendChild(overlay);

        // Wiring
        const textarea = overlay.querySelector('.overlay-textarea');
        const attachBtn = overlay.querySelector('.overlay-attach');
        const form = overlay.querySelector('.overlay-form');
        const original = document.getElementById('messageInput');

        // プレースホルダーは元の入力欄に合わせる
        const orig = document.getElementById('messageInput');
        if (orig && orig.placeholder) textarea.placeholder = orig.placeholder;

        const autoSize = () => {
            textarea.style.height = 'auto';
            const maxPx = Math.floor(window.innerHeight * 0.4);
            const next = Math.min(textarea.scrollHeight, maxPx);
            textarea.style.height = next + 'px';
            const h = overlay.offsetHeight;
            document.documentElement.style.setProperty('--composer-h', h + 'px');
        };

        const syncToOriginal = () => {
            if (original) original.value = textarea.value;
        };

        // Submit: sync back and call app send
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            syncToOriginal();
            this.app.chatManager.sendMessage();
            this._hideIOSOverlay();
        });

        // Attach: delegate to original file manager
        attachBtn.addEventListener('click', (e) => {
            e.preventDefault();
            try { if (window.fileManager) window.fileManager.show(); } catch (err) {}
        });

        // Sync typing back to original and autosize
        textarea.addEventListener('input', () => {
            syncToOriginal();
            autoSize();
        });

        // VisualViewportでオーバーレイ位置を更新
        const updateOverlay = () => {
            if (!this._overlayOpen) return;
            autoSize();
        };
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateOverlay);
            window.visualViewport.addEventListener('scroll', updateOverlay);
        }

        this._overlay = overlay;
        this._overlayTextarea = textarea;
    }

    _showIOSOverlay() {
        if (!this._overlay) return;
        document.body.classList.add('ios-overlay-open');
        // 初期値をコピー
        const original = document.getElementById('messageInput');
        if (original) this._overlayTextarea.value = original.value;
        this._overlay.style.display = 'block';
        this._overlayOpen = true;
        // キーボード上に配置
        setTimeout(() => {
            this._overlayTextarea.focus();
            const evt = new Event('input');
            this._overlayTextarea.dispatchEvent(evt);
        }, 0);
    }

    _hideIOSOverlay() {
        if (!this._overlay) return;
        this._overlay.style.display = 'none';
        this._overlayOpen = false;
        document.body.classList.remove('ios-overlay-open');
        // 元の入力にフォーカス戻す（任意）
        const original = document.getElementById('messageInput');
        if (original) original.blur();
    }

    _canOpenOverlay() {
        try {
            // スレッド未選択（送信不可）の時はオーバーレイを開かない
            if (!this.app || !this.app._currentThread) return false;
            const sendBtn = document.getElementById('sendBtn');
            if (sendBtn && sendBtn.disabled) return false;
        } catch (e) {}
        return true;
    }
}

// グローバルに公開
window.MobileHandler = MobileHandler;
