// ResponsiveThreadManager - PC/スマホ両対応の複数選択削除機能付きThreadManager

class ResponsiveThreadManager extends ThreadManager {
    constructor(app) {
        super(app);
        this.deviceType = this.detectDevice();
        this.selectionMode = false;
        this.selectedThreads = new Set();
        this.longPressTimer = null;
        this.longPressStarted = false;
        
        this.initializeDeviceSpecificBehaviors();
        this.setupSelectionUI();
    }
    
    detectDevice() {
        const isMobile = window.innerWidth <= 768 || 
                        'ontouchstart' in window || 
                        navigator.maxTouchPoints > 0;
        return isMobile ? 'mobile' : 'desktop';
    }
    
    initializeDeviceSpecificBehaviors() {
        // デバイス別UI要素の表示/非表示
        this.updateDeviceDisplay();
        
        if (this.deviceType === 'mobile') {
            this.setupMobileBehaviors();
        } else {
            this.setupDesktopBehaviors();
        }
        
        // 画面サイズ変更時の動的調整
        window.addEventListener('resize', this.debounce(() => {
            const newDeviceType = this.detectDevice();
            if (newDeviceType !== this.deviceType) {
                this.deviceType = newDeviceType;
                this.switchDeviceMode();
            }
        }, 250));
    }
    
    setupSelectionUI() {
        // 選択ツールバーを追加
        this.createSelectionToolbar();
        // DOM更新後にイベントリスナーを設定
        setTimeout(() => {
            this.setupSelectionEventListeners();
        }, 0);
    }
    
    createSelectionToolbar() {
        // 既存のツールバーがあれば削除
        const existingToolbar = document.getElementById('threadToolbar');
        if (existingToolbar) {
            existingToolbar.remove();
        }
        
        const threadList = document.getElementById('threadList');
        const toolbar = document.createElement('div');
        toolbar.className = 'thread-toolbar';
        toolbar.id = 'threadToolbar';
        
        toolbar.innerHTML = `
            <!-- Mobile Actions -->
            <div class="mobile-toolbar-actions" data-device="mobile" style="display: none;">
                <button class="action-btn primary" id="selectModeBtn">
                    <span class="icon">☑️</span>
                    <span class="label">Select</span>
                </button>
            </div>
            
            <!-- Desktop Actions -->
            <div class="desktop-actions" data-device="desktop" style="display: none;">
                <div class="toolbar-left">
                    <button class="select-mode-btn" id="selectModeBtn">☑️ Select Mode</button>
                    <div class="thread-stats">
                        <span class="total-count" id="totalCount">Total: 0</span>
                        <span class="selected-count" id="selectedInfo" style="display:none;">
                            / <span id="selectedNum">0</span> selected
                        </span>
                    </div>
                </div>
                <div class="toolbar-right" id="bulkActions" style="display: none;">
                    <button class="btn-secondary" id="selectAllBtn">Select All</button>
                    <button class="btn-secondary" id="deselectAllBtn">Deselect All</button>
                    <button class="btn-danger" id="bulkDeleteBtn">
                        Delete (<span id="deleteCount">0</span>)
                    </button>
                </div>
            </div>
            
            <!-- Mobile Fixed Action Bar -->
            <div class="mobile-bulk-actions glass-fixed" id="mobileBulkActions" data-device="mobile" style="display: none;">
                <div class="mobile-action-grid">
                    <button class="mobile-action-btn secondary" id="mobileDeselectAllBtn">
                        <div class="action-icon">↶</div>
                        <div class="action-label">Clear</div>
                    </button>
                    <button class="mobile-action-btn secondary" id="mobileSelectAllBtn">
                        <div class="action-icon">☑</div>
                        <div class="action-label">Select All</div>
                    </button>
                    <button class="mobile-action-btn danger" id="mobileBulkDeleteBtn">
                        <div class="action-icon">🗑️</div>
                        <div class="action-label">Delete (<span id="mobileDeleteCount">0</span>)</div>
                        <div class="selected-badge" id="selectedBadge">0</div>
                    </button>
                </div>
            </div>
        `;
        
        threadList.parentNode.insertBefore(toolbar, threadList);
        this.updateDeviceDisplay();
    }
    
    setupSelectionEventListeners() {
        // 選択モードボタン
        const selectModeButtons = document.querySelectorAll('#selectModeBtn');
        selectModeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.toggleSelectionMode());
        });
        
        // デスクトップ用バルクアクション
        document.getElementById('selectAllBtn')?.addEventListener('click', () => this.selectAll());
        document.getElementById('deselectAllBtn')?.addEventListener('click', () => this.deselectAll());
        document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => this.bulkDelete());
        
        // モバイル用バルクアクション
        document.getElementById('mobileSelectAllBtn')?.addEventListener('click', () => this.selectAll());
        document.getElementById('mobileDeselectAllBtn')?.addEventListener('click', () => this.deselectAll());
        document.getElementById('mobileBulkDeleteBtn')?.addEventListener('click', () => this.bulkDelete());
        
        // Escapeキーで選択モード終了
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selectionMode) {
                this.exitSelectionMode();
            }
        });
    }
    
    setupMobileBehaviors() {
        console.log('Setting up mobile behaviors');
        // 長押し選択はrenderThreadsで各アイテムに設定
    }
    
    setupDesktopBehaviors() {
        console.log('Setting up desktop behaviors');
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'a' && this.selectionMode) {
                e.preventDefault();
                this.selectAll();
            }
        });
        
        // 右クリックコンテキストメニュー（将来実装）
        // this.setupContextMenu();
    }
    
    renderThreads(threads) {
        const threadList = document.getElementById('threadList');
        threadList.innerHTML = '';
        
        // 総件数更新
        const totalCount = document.getElementById('totalCount');
        if (totalCount) {
            totalCount.textContent = `Total: ${threads.length}`;
        }
        
        threads.forEach(thread => {
            const threadElement = document.createElement('div');
            threadElement.className = 'thread-item';
            threadElement.dataset.threadId = thread.id;
            threadElement.dataset.selectionMode = this.selectionMode;
            
            threadElement.innerHTML = `
                <div class="thread-checkbox" style="display: ${this.selectionMode ? 'flex' : 'none'};">
                    <input type="checkbox" class="thread-select" id="check_${thread.id}" data-thread-id="${thread.id}">
                    <label for="check_${thread.id}" class="checkbox-label"></label>
                </div>
                
                <div class="thread-content" data-thread-id="${thread.id}">
                    <div class="thread-main">
                        <div class="thread-name" data-thread-name="${AppUtils.escapeHtml(thread.name)}">${AppUtils.escapeHtml(thread.name)}</div>
                        <div class="thread-meta">
                            <span class="thread-time" data-raw-date="${thread.updated_at}">${AppUtils.formatDate(thread.updated_at)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="thread-actions">
                    <!-- Mobile Actions -->
                    <div class="mobile-actions" data-device="mobile" style="display: none;">
                        <button class="action-menu-trigger" data-thread-id="${thread.id}">⋮</button>
                        <div class="action-menu" style="display: none;">
                            <div class="menu-item" data-action="rename" data-thread-id="${thread.id}">✏️ Rename</div>
                            <div class="menu-item danger" data-action="delete" data-thread-id="${thread.id}">🗑️ Delete</div>
                        </div>
                    </div>
                    
                    <!-- Desktop Actions -->
                    <div class="desktop-actions" data-device="desktop" style="display: none;">
                        <button class="thread-edit-btn" data-thread-id="${thread.id}" title="Rename">✏️</button>
                        <button class="thread-delete-btn" data-thread-id="${thread.id}" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
            
            this.setupThreadElementEvents(threadElement, thread);
            threadList.appendChild(threadElement);
        });
        
        this.updateDeviceDisplay();
    }
    
    setupThreadElementEvents(threadElement, thread) {
        const threadContent = threadElement.querySelector('.thread-content');
        const checkbox = threadElement.querySelector('.thread-select');
        
        // チェックボックスイベント
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleThreadSelection(thread.id, e.target.checked);
            });
        }
        
        // スレッドコンテンツクリック
        if (!this.selectionMode) {
            threadContent.addEventListener('click', () => {
                this.selectThread(thread.id, thread.name);
            });
        }
        
        // モバイル: 長押しで選択モード開始
        if (this.deviceType === 'mobile') {
            this.setupLongPressSelection(threadContent, thread.id);
        }
        
        // デスクトップ: Ctrl+クリックで選択切り替え
        if (this.deviceType === 'desktop') {
            threadContent.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (!this.selectionMode) {
                        this.enterSelectionMode();
                    }
                    this.toggleThreadSelection(thread.id);
                } else if (!this.selectionMode) {
                    this.selectThread(thread.id, thread.name);
                }
            });
        }
        
        // 既存のedit/deleteボタンイベント
        const editBtn = threadElement.querySelector('.thread-edit-btn');
        const deleteBtn = threadElement.querySelector('.thread-delete-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editThreadName(thread.id, thread.name);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteThread(thread.id, thread.name);
            });
        }
    }
    
    setupLongPressSelection(element, threadId) {
        let touchStartTime = 0;
        let touchStartPosition = { x: 0, y: 0 };
        const LONG_PRESS_DURATION = 600; // 0.6秒
        const MOVE_THRESHOLD = 10; // 10px以上動いたら長押し無効
        
        element.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchStartPosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            
            this.longPressTimer = setTimeout(() => {
                if (!this.selectionMode) {
                    this.enterSelectionMode();
                }
                this.toggleThreadSelection(threadId);
                
                // バイブレーション（対応デバイスのみ）
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, LONG_PRESS_DURATION);
        }, { passive: true });
        
        element.addEventListener('touchmove', (e) => {
            const currentPosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            
            const distance = Math.sqrt(
                Math.pow(currentPosition.x - touchStartPosition.x, 2) +
                Math.pow(currentPosition.y - touchStartPosition.y, 2)
            );
            
            if (distance > MOVE_THRESHOLD) {
                clearTimeout(this.longPressTimer);
            }
        }, { passive: true });
        
        element.addEventListener('touchend', () => {
            clearTimeout(this.longPressTimer);
        }, { passive: true });
    }
    
    toggleSelectionMode() {
        if (this.selectionMode) {
            this.exitSelectionMode();
        } else {
            this.enterSelectionMode();
        }
    }
    
    enterSelectionMode() {
        console.log('Entering selection mode');
        this.selectionMode = true;
        this.selectedThreads.clear();
        
        // UI更新
        this.updateSelectionModeUI();
        this.renderThreads(this.filteredThreads);
    }
    
    exitSelectionMode() {
        console.log('Exiting selection mode');
        this.selectionMode = false;
        this.selectedThreads.clear();
        
        // UI更新
        this.updateSelectionModeUI();
        this.renderThreads(this.filteredThreads);
    }
    
    updateSelectionModeUI() {
        const selectModeButtons = document.querySelectorAll('#selectModeBtn');
        const bulkActions = document.getElementById('bulkActions');
        const mobileBulkActions = document.getElementById('mobileBulkActions');
        const selectedInfo = document.getElementById('selectedInfo');
        
        selectModeButtons.forEach(btn => {
            if (this.deviceType === 'mobile') {
                btn.innerHTML = this.selectionMode ?
                    '<span class="icon">✕</span><span class="label">Exit</span>' :
                    '<span class="icon">☑️</span><span class="label">Select</span>';
            } else {
                btn.textContent = this.selectionMode ? '✕ Exit Selection' : '☑️ Select Mode';
            }
        });
        
        // バルクアクション表示はupdateDeviceDisplay()で制御
        this.updateDeviceDisplay();
        
        if (!this.selectionMode) {
            if (selectedInfo) selectedInfo.style.display = 'none';
        }
        
        this.updateSelectionCount();
    }
    
    toggleThreadSelection(threadId, forceState = null) {
        const shouldSelect = forceState !== null ? forceState : !this.selectedThreads.has(threadId);
        
        if (shouldSelect) {
            this.selectedThreads.add(threadId);
        } else {
            this.selectedThreads.delete(threadId);
        }
        
        // UI更新
        this.updateThreadSelectionUI(threadId, shouldSelect);
        this.updateSelectionCount();
    }
    
    updateThreadSelectionUI(threadId, selected) {
        const threadElement = document.querySelector(`[data-thread-id="${threadId}"]`);
        const checkbox = document.getElementById(`check_${threadId}`);
        
        if (threadElement) {
            if (selected) {
                threadElement.classList.add('selected');
            } else {
                threadElement.classList.remove('selected');
            }
        }
        
        if (checkbox) {
            checkbox.checked = selected;
        }
    }
    
    updateSelectionCount() {
        const count = this.selectedThreads.size;
        
        // デスクトップUI更新
        const selectedInfo = document.getElementById('selectedInfo');
        const selectedNum = document.getElementById('selectedNum');
        const deleteCount = document.getElementById('deleteCount');
        
        if (selectedInfo) {
            selectedInfo.style.display = count > 0 ? 'inline' : 'none';
        }
        if (selectedNum) selectedNum.textContent = count;
        if (deleteCount) deleteCount.textContent = count;
        
        // モバイルUI更新
        const mobileDeleteCount = document.getElementById('mobileDeleteCount');
        const selectedBadge = document.getElementById('selectedBadge');
        
        if (mobileDeleteCount) mobileDeleteCount.textContent = count;
        if (selectedBadge) {
            if (count > 0) {
                selectedBadge.style.display = 'flex';
                selectedBadge.textContent = count;
            } else {
                selectedBadge.style.display = 'none';
            }
        }
        
        // バルク削除ボタンの有効/無効
        const bulkDeleteBtns = document.querySelectorAll('#bulkDeleteBtn, #mobileBulkDeleteBtn');
        bulkDeleteBtns.forEach(btn => {
            if (btn) btn.disabled = count === 0;
        });
    }
    
    selectAll() {
        this.filteredThreads.forEach(thread => {
            this.selectedThreads.add(thread.id);
            this.updateThreadSelectionUI(thread.id, true);
        });
        this.updateSelectionCount();
    }
    
    deselectAll() {
        this.selectedThreads.forEach(threadId => {
            this.updateThreadSelectionUI(threadId, false);
        });
        this.selectedThreads.clear();
        this.updateSelectionCount();
    }
    
    async bulkDelete() {
        if (this.selectedThreads.size === 0) return;
        
        const threadIds = Array.from(this.selectedThreads);
        const threadCount = threadIds.length;
        
        // 確認ダイアログ
        const confirmed = await this.showBulkDeleteConfirmation(threadCount);
        if (!confirmed) return;
        
        try {
            // プログレス表示開始
            const progressUI = this.showProgressUI(threadCount);
            
            let completed = 0;
            let errors = [];
            
            // 順次削除実行
            for (const threadId of threadIds) {
                try {
                    const data = await this.app.apiClient.deleteThread(threadId);
                    if (!data.success) {
                        throw new Error(data.error || 'Failed to delete thread');
                    }
                    completed++;
                } catch (error) {
                    console.error(`Failed to delete thread ${threadId}:`, error);
                    errors.push({ threadId, error: error.message });
                }
                
                progressUI.updateProgress(completed + errors.length, threadCount);
                
                // UI更新のために少し待機
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            progressUI.close();
            
            // 結果表示
            if (errors.length === 0) {
                this.showSuccessMessage(`${completed} threads deleted successfully.`);
            } else {
                this.showWarningMessage(`${completed} threads deleted. ${errors.length} errors occurred.`);
            }
            
            // UI状態をリセット
            this.exitSelectionMode();
            await this.loadThreads();
            
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showErrorMessage('An error occurred during the deletion process.');
        }
    }
    
    async showBulkDeleteConfirmation(count) {
        const message = `Delete ${count} selected threads?\n\nThis action cannot be undone.`;
        return confirm(message);
    }
    
    showProgressUI(total) {
        // プログレス表示用のオーバーレイを作成
        const overlay = document.createElement('div');
        overlay.className = `progress-overlay ${this.deviceType}`;
        overlay.innerHTML = `
            <div class="progress-card">
                <div class="progress-icon">🗑️</div>
                <div class="progress-title">Deleting threads</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text">
                    <span id="progressCurrent">0</span> / ${total} completed
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        return {
            updateProgress: (current, total) => {
                const percent = Math.round((current / total) * 100);
                const progressFill = document.getElementById('progressFill');
                const progressCurrent = document.getElementById('progressCurrent');
                
                if (progressFill) progressFill.style.width = `${percent}%`;
                if (progressCurrent) progressCurrent.textContent = current;
            },
            close: () => {
                overlay.remove();
            }
        };
    }
    
    showSuccessMessage(message) {
        // 成功メッセージを表示
        this.showToast(message, 'success');
    }
    
    showWarningMessage(message) {
        // 警告メッセージを表示
        this.showToast(message, 'warning');
    }
    
    showErrorMessage(message) {
        // エラーメッセージを表示
        alert(message);
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // アニメーション
        setTimeout(() => toast.classList.add('visible'), 10);
        
        // 自動削除
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    updateDeviceDisplay() {
        const mobileElements = document.querySelectorAll('[data-device="mobile"]');
        const desktopElements = document.querySelectorAll('[data-device="desktop"]');
        
        if (this.deviceType === 'mobile') {
            mobileElements.forEach(el => {
                // mobile-bulk-actions は選択モード時のみ表示
                if (el.id === 'mobileBulkActions') {
                    el.style.display = this.selectionMode ? 'flex' : 'none';
                } else {
                    el.style.display = 'flex';
                }
            });
            desktopElements.forEach(el => el.style.display = 'none');
        } else {
            mobileElements.forEach(el => el.style.display = 'none');
            desktopElements.forEach(el => {
                // bulkActions は選択モード時のみ表示
                if (el.id === 'bulkActions') {
                    el.style.display = this.selectionMode ? 'flex' : 'none';
                } else {
                    el.style.display = 'flex';
                }
            });
        }
    }
    
    switchDeviceMode() {
        console.log(`Switching to ${this.deviceType} mode`);
        this.updateDeviceDisplay();
        
        // 選択モードをリセット
        if (this.selectionMode) {
            this.exitSelectionMode();
        }
        
        // デバイス固有の動作を再設定
        if (this.deviceType === 'mobile') {
            this.setupMobileBehaviors();
        } else {
            this.setupDesktopBehaviors();
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// グローバルに公開
window.ResponsiveThreadManager = ResponsiveThreadManager;