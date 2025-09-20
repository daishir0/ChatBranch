// ChatBranch Thread Manager Component

class ThreadManager {
    constructor(app) {
        this.app = app;
        this.allThreads = []; // Store all threads for search
        this.filteredThreads = []; // Store filtered threads

        // 複数選択機能
        this.selectionMode = false;
        this.selectedThreads = new Set();

        // アーカイブ機能
        this.isArchiveMode = false;

        this.setupBulkActionUI();
    }
    
    /**
     * スレッド一覧を読み込み
     */
    async loadThreads() {
        try {
            const data = await this.app.apiClient.listThreads();

            if (data.success) {
                this.allThreads = data.threads;
                this.filterThreadsByMode();
                this.renderThreads(this.filteredThreads);
            }
        } catch (error) {
            console.error('Failed to load threads:', error);
        }
    }
    
    /**
     * 新規スレッドをリストに追加
     */
    addNewThreadToList(newThread) {
        // 配列の先頭に新しいスレッドを追加
        this.allThreads.unshift(newThread);
        this.filteredThreads.unshift(newThread);
        
        // リストを再描画
        this.renderThreads(this.filteredThreads);
    }
    
    /**
     * スレッド一覧をレンダリング
     */
    renderThreads(threads) {
        const threadList = document.getElementById('threadList');
        threadList.innerHTML = '';

        threads.forEach(thread => {
            const threadElement = document.createElement('div');
            threadElement.className = 'thread-item';
            threadElement.dataset.threadId = thread.id;

            // アーカイブ状態の判定とクラス追加
            const isArchived = this.isThreadArchived(thread);
            if (isArchived) {
                threadElement.classList.add('archived');
            }

            // 選択モード時はチェックボックスを表示
            const checkboxHtml = this.selectionMode ?
                `<input type="checkbox" class="thread-checkbox" data-thread-id="${thread.id}" ${this.selectedThreads.has(thread.id) ? 'checked' : ''}>` : '';

            // アーカイブボタンの設定
            const archiveAction = isArchived ? 'Unarchive' : 'Archive';
            const archiveIcon = isArchived ? '📤' : '📦';

            // 表示用スレッド名（archived_プレフィックスを除去）
            const displayName = this.getDisplayTitle(thread);

            threadElement.innerHTML = `
                ${checkboxHtml}
                <div class="thread-content" data-thread-id="${thread.id}">
                    <div class="thread-name" data-thread-name="${AppUtils.escapeHtml(thread.name)}">${AppUtils.escapeHtml(displayName)}</div>
                    <div class="thread-time" data-raw-date="${thread.updated_at}">${AppUtils.formatDate(thread.updated_at)}</div>
                </div>
                <div class="thread-actions" style="${this.selectionMode ? 'display: none;' : ''}">
                    <button class="thread-menu-trigger" data-thread-id="${thread.id}" title="Menu" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;border-radius:4px;font-size:14px;min-width:24px;height:24px;display:flex;align-items:center;justify-content:center;">⋯</button>
                    <div class="thread-menu" style="display:none; position:absolute; right:12px; z-index:1000; background: var(--bg-secondary); border:1px solid var(--border-color); border-radius:6px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); min-width: 180px;">
                        <button class="thread-menu-item" data-action="edit" style="display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:none;color:var(--text-primary);cursor:pointer;">✏️ Edit</button>
                        <button class="thread-menu-item" data-action="toggle-archive" style="display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:none;color:var(--text-primary);cursor:pointer;">${archiveIcon} ${archiveAction}</button>
                        <div style="height:1px;background:var(--border-color);margin:4px 0;"></div>
                        <button class="thread-menu-item danger" data-action="delete" style="display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:none;color:var(--error-color);cursor:pointer;">🗑️ Delete</button>
                    </div>
                </div>
            `;
            
            // 選択状態を視覚的に反映
            if (this.selectionMode && this.selectedThreads.has(thread.id)) {
                threadElement.classList.add('selected');
            }
            
            // チェックボックスイベント（選択モード時）
            const checkbox = threadElement.querySelector('.thread-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    this.toggleThreadSelection(thread.id, e.target.checked);
                });
            }
            
            // Thread content click event
            const threadContent = threadElement.querySelector('.thread-content');
            threadContent.addEventListener('click', () => {
                if (this.selectionMode) {
                    // 選択モード時はチェックボックスを切り替え
                    this.toggleThreadSelection(thread.id);
                } else {
                    // 通常モード時はスレッドを開く
                    this.selectThread(thread.id, thread.name);
                }
            });
            
            // Add touch events for mobile responsiveness without preventing scroll
            let touchStartY = 0;
            let touchMoved = false;
            
            threadContent.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
                touchMoved = false;
            }, { passive: true });
            
            threadContent.addEventListener('touchmove', (e) => {
                // Check if user is scrolling
                if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
                    touchMoved = true;
                }
            }, { passive: true });
            
            threadContent.addEventListener('touchend', (e) => {
                // Only select thread if user didn't scroll
                if (!touchMoved) {
                    this.selectThread(thread.id, thread.name);
                }
            }, { passive: true });
            
            // Thread menu interactions
            const menuTrigger = threadElement.querySelector('.thread-menu-trigger');
            const menu = threadElement.querySelector('.thread-menu');
            if (menuTrigger && menu) {
                const closeMenu = () => {
                    menu.style.display = 'none';
                    document.removeEventListener('click', onDocClick);
                    document.removeEventListener('keydown', onEsc);
                };
                const onDocClick = (e) => {
                    if (!menu.contains(e.target) && e.target !== menuTrigger) closeMenu();
                };
                const onEsc = (e) => { if (e.key === 'Escape') closeMenu(); };

                menuTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Position menu near trigger
                    const rect = menuTrigger.getBoundingClientRect();
                    menu.style.top = (menuTrigger.offsetTop + menuTrigger.offsetHeight + 4) + 'px';
                    menu.style.right = '12px';

                    const isOpen = menu.style.display === 'block';
                    document.querySelectorAll('.thread-menu').forEach(m => m.style.display = 'none');
                    if (!isOpen) {
                        menu.style.display = 'block';
                        setTimeout(() => {
                            document.addEventListener('click', onDocClick);
                            document.addEventListener('keydown', onEsc);
                        }, 0);
                    }
                });

                menu.querySelectorAll('.thread-menu-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const action = item.getAttribute('data-action');
                        if (action === 'edit') {
                            this.editThreadName(thread.id, thread.name);
                        } else if (action === 'toggle-archive') {
                            if (isArchived) {
                                this.unarchiveThread(thread.id);
                            } else {
                                this.archiveThread(thread.id);
                            }
                        } else if (action === 'delete') {
                            this.deleteThread(thread.id, thread.name);
                        }
                        closeMenu();
                    });
                });
            }
            
            threadList.appendChild(threadElement);
        });
    }
    
    /**
     * スレッドを選択
     */
    selectThread(threadId, threadName) {
        this.app._currentThread = threadId;
        this.app._currentMessageId = null; // Reset message ID when switching threads
        this.app._currentThreadMessages = []; // Reset message cache when switching threads
        
        // Close mobile menu if open
        if (window.innerWidth <= 768) {
            this.app.mobileHandler.closeMobileMenu();
        }
        
        // Update UI
        document.getElementById('currentThreadName').textContent = threadName;
        document.querySelectorAll('.thread-item').forEach(item => {
            item.classList.toggle('active', item.dataset.threadId == threadId);
        });

        // Reset new tree mode if active
        this.app.uiManager.onThreadSwitch();

        // Update thread-dependent buttons
        this.app.updateThreadDependentButtons();
        
        this.app.chatManager.loadMessages();
        this.app.uiManager.loadTree();
        this.app.settingsManager.loadThreadPersonaState();
    }
    
    /**
     * スレッド検索
     */
    searchThreads(query) {
        if (!query.trim()) {
            this.filterThreadsByMode();
            this.updateSearchResultsInfo('');
        } else {
            const normalizedQuery = query.toLowerCase().trim();
            // アーカイブモードを考慮した検索
            let baseThreads = this.isArchiveMode ?
                this.allThreads.filter(thread => this.isThreadArchived(thread)) :
                this.allThreads.filter(thread => !this.isThreadArchived(thread));

            this.filteredThreads = baseThreads.filter(thread =>
                thread.name.toLowerCase().includes(normalizedQuery)
            );
            this.updateSearchResultsInfo(query);
        }
        this.renderThreads(this.filteredThreads);
    }
    
    /**
     * 検索クリアボタンの表示更新
     */
    updateSearchClearButton(value) {
        const clearBtn = document.getElementById('searchClearBtn');
        if (value.trim()) {
            clearBtn.classList.add('visible');
        } else {
            clearBtn.classList.remove('visible');
        }
    }
    
    /**
     * 検索結果情報更新
     */
    updateSearchResultsInfo(query) {
        const resultsInfo = document.getElementById('searchResultsInfo');
        if (!query.trim()) {
            resultsInfo.style.display = 'none';
            return;
        }
        
        const count = this.filteredThreads.length;
        const totalCount = this.allThreads.length;
        
        if (count === 0) {
            resultsInfo.textContent = 'No matching threads found';
            resultsInfo.style.color = 'var(--error-color)';
        } else if (count === totalCount) {
            resultsInfo.textContent = `All ${totalCount} threads`;
            resultsInfo.style.color = 'var(--text-secondary)';
        } else {
            resultsInfo.textContent = `${count} / ${totalCount} threads`;
            resultsInfo.style.color = 'var(--text-secondary)';
        }
        resultsInfo.style.display = 'block';
    }
    
    /**
     * 検索クリア
     */
    clearSearch() {
        const searchInput = document.getElementById('threadSearch');
        searchInput.value = '';
        this.filterThreadsByMode(); // アーカイブモードを考慮したフィルタリング
        this.renderThreads(this.filteredThreads);
        this.updateSearchClearButton('');
        this.updateSearchResultsInfo('');
    }
    
    /**
     * 最初の検索結果を選択
     */
    selectFirstSearchResult() {
        if (this.filteredThreads.length > 0) {
            const firstThread = this.filteredThreads[0];
            this.selectThread(firstThread.id, firstThread.name);
        }
    }
    
    /**
     * スレッド名を編集
     */
    async editThreadName(threadId, currentName) {
        const newName = prompt('Edit thread name:', currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            try {
                const data = await this.app.apiClient.updateThread(threadId, newName.trim());
                console.log('Update thread response:', data);
                if (data.success) {
                    // Update current thread name if this is the active thread
                    if (this.app._currentThread == threadId) {
                        document.getElementById('currentThreadName').textContent = newName.trim();
                    }
                    // Reload threads to reflect the change
                    this.loadThreads();
                } else {
                    console.error('Update thread failed:', data);
                    alert('Failed to update thread name: ' + (data.error || data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Edit thread error:', error);
                alert('An error occurred while updating thread name');
            }
        }
    }
    
    /**
     * スレッドを削除
     */
    async deleteThread(threadId, threadName) {
        if (confirm(`Are you sure you want to delete thread "${threadName}"? This action cannot be undone.`)) {
            try {
                const data = await this.app.apiClient.deleteThread(threadId);
                console.log('Delete thread response:', data);
                if (data.success) {
                    // If this was the active thread, reset the view
                    if (this.app._currentThread == threadId) {
                        this.app._currentThread = null;
                        this.app._currentMessageId = null;
                        document.getElementById('currentThreadName').textContent = 'Please select a chat';
                        document.getElementById('messagesContainer').innerHTML = `
                            <div class="welcome-message">
                                <h3>Welcome to ChatBranch</h3>
                                <p>Start a new chat or select an existing thread.</p>
                            </div>
                        `;
                        // Update thread-dependent buttons
                        this.app.updateThreadDependentButtons();
                        this.app.uiManager.hideTreeView();
                    }
                    // Reload threads to reflect the change
                    this.loadThreads();
                } else {
                    console.error('Delete thread failed:', data);
                    alert('Failed to delete thread: ' + (data.error || data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Delete thread error:', error);
                alert('An error occurred while deleting thread');
            }
        }
    }
    
    // === 複数選択機能 ===
    
    setupBulkActionUI() {
        // バルクアクションボタンを既存のsidebarに追加
        const sidebarFooter = document.querySelector('.sidebar-footer');
        if (sidebarFooter) {
            const bulkButton = document.createElement('button');
            bulkButton.className = 'settings-btn';
            bulkButton.id = 'bulkSelectBtn';
            bulkButton.innerHTML = '☑️ Select';
            bulkButton.addEventListener('click', () => this.toggleSelectionMode());
            
            sidebarFooter.insertBefore(bulkButton, sidebarFooter.firstChild);
        }
    }
    
    toggleSelectionMode() {
        this.selectionMode = !this.selectionMode;
        this.selectedThreads.clear();
        
        // ボタンテキストを更新
        const btn = document.getElementById('bulkSelectBtn');
        if (btn) {
            btn.innerHTML = this.selectionMode ? '✕ Exit' : '☑️ Select';
        }
        
        // バルクアクションバーの表示切り替え
        this.updateBulkActionBar();
        
        // スレッドリストを再描画
        this.renderThreads(this.filteredThreads);
    }
    
    toggleThreadSelection(threadId, forceState = null) {
        const shouldSelect = forceState !== null ? forceState : !this.selectedThreads.has(threadId);
        
        if (shouldSelect) {
            this.selectedThreads.add(threadId);
        } else {
            this.selectedThreads.delete(threadId);
        }
        
        // UI更新
        const threadElement = document.querySelector(`[data-thread-id="${threadId}"]`);
        if (threadElement) {
            const checkbox = threadElement.querySelector('.thread-checkbox');
            if (checkbox) checkbox.checked = shouldSelect;
            
            threadElement.classList.toggle('selected', shouldSelect);
        }
        
        this.updateBulkActionBar();
    }
    
    updateBulkActionBar() {
        let bar = document.getElementById('bulkActionBar');
        
        if (this.selectionMode) {
            if (!bar) {
                // バルクアクションバーを作成
                bar = document.createElement('div');
                bar.id = 'bulkActionBar';
                bar.className = 'bulk-action-bar';
                bar.innerHTML = `
                    <div class="bulk-info">
                        <span id="bulkCount">0</span> selected
                    </div>
                    <div class="bulk-actions">
                        <button class="bulk-btn" id="selectAllBtn">Select All</button>
                        <button class="bulk-btn" id="deselectAllBtn">Deselect All</button>
                        <button class="bulk-btn danger" id="threadBulkDeleteBtn">Delete</button>
                    </div>
                `;
                document.body.appendChild(bar);
                
                // イベントリスナー追加
                document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
                document.getElementById('deselectAllBtn').addEventListener('click', () => this.deselectAll());
                document.getElementById('threadBulkDeleteBtn').addEventListener('click', () => this.bulkDelete());
            }
            
            // 選択数を更新
            document.getElementById('bulkCount').textContent = this.selectedThreads.size;
            bar.style.display = 'flex';
        } else if (bar) {
            bar.style.display = 'none';
        }
    }
    
    selectAll() {
        this.filteredThreads.forEach(thread => {
            this.selectedThreads.add(thread.id);
        });
        this.renderThreads(this.filteredThreads);
        this.updateBulkActionBar();
    }
    
    deselectAll() {
        this.selectedThreads.clear();
        this.renderThreads(this.filteredThreads);
        this.updateBulkActionBar();
    }
    
    async bulkDelete() {
        const count = this.selectedThreads.size;
        if (count === 0) return;
        
        const confirmed = confirm(`Delete ${count} selected threads?\n\nThis action cannot be undone.`);
        if (!confirmed) return;
        
        try {
            const threadIds = Array.from(this.selectedThreads);
            
            // 順次削除（シンプルな実装）
            let deletedCount = 0;
            for (const threadId of threadIds) {
                try {
                    const result = await this.app.apiClient.deleteThread(threadId);
                    if (result.success) {
                        deletedCount++;
                        this.selectedThreads.delete(threadId);
                    }
                } catch (error) {
                    console.error(`Failed to delete thread ${threadId}:`, error);
                }
            }
            
            // 結果表示
            if (deletedCount > 0) {
                alert(`${deletedCount} threads deleted successfully.`);
                this.loadThreads(); // リストを再読み込み
            }
            
            if (deletedCount < count) {
                alert(`Failed to delete ${count - deletedCount} threads.`);
            }
            
        } catch (error) {
            console.error('Bulk delete error:', error);
            alert('An error occurred during the deletion process.');
        }
    }

    // === アーカイブ機能 ===

    /**
     * アーカイブモードの切り替え
     */
    toggleArchiveMode() {
        this.isArchiveMode = !this.isArchiveMode;

        // 検索をクリア
        const searchInput = document.getElementById('threadSearch');
        if (searchInput) {
            searchInput.value = '';
        }

        this.filterThreadsByMode();
        this.renderThreads(this.filteredThreads);
        this.updateArchiveButtonState();
        this.updateSearchResultsInfo('');
    }

    /**
     * モードに基づいてスレッドをフィルタリング
     */
    filterThreadsByMode() {
        if (this.isArchiveMode) {
            // アーカイブモード: アーカイブされたスレッドのみ表示
            this.filteredThreads = this.allThreads.filter(thread => this.isThreadArchived(thread));
        } else {
            // 通常モード: アーカイブされていないスレッドのみ表示
            this.filteredThreads = this.allThreads.filter(thread => !this.isThreadArchived(thread));
        }
    }

    /**
     * アーカイブボタンの状態を更新
     */
    updateArchiveButtonState() {
        const archiveBtn = document.getElementById('archiveToggleBtn');
        if (archiveBtn) {
            archiveBtn.classList.toggle('active', this.isArchiveMode);
        }
    }

    /**
     * スレッドがアーカイブされているかチェック
     */
    isThreadArchived(thread) {
        return thread.name.startsWith('archived_');
    }

    /**
     * 表示用のタイトルを取得（archived_プレフィックスを除去）
     */
    getDisplayTitle(thread) {
        if (this.isThreadArchived(thread)) {
            return thread.name.substring(9); // Remove 'archived_' prefix
        }
        return thread.name;
    }

    /**
     * スレッドをアーカイブ
     */
    async archiveThread(threadId) {
        try {
            const data = await this.app.apiClient.archiveThread(threadId);
            if (data.success) {
                this.loadThreads(); // リストを再読み込み
            } else {
                console.error('Archive thread failed:', data);
                alert('Failed to archive thread: ' + (data.error || data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Archive thread error:', error);
            alert('An error occurred while archiving thread');
        }
    }

    /**
     * スレッドのアーカイブを解除
     */
    async unarchiveThread(threadId) {
        try {
            const data = await this.app.apiClient.unarchiveThread(threadId);
            if (data.success) {
                // アーカイブモードの場合は通常モードに切り替え
                if (this.isArchiveMode) {
                    this.isArchiveMode = false;
                    this.updateArchiveButtonState();
                }
                this.loadThreads(); // リストを再読み込み
            } else {
                console.error('Unarchive thread failed:', data);
                alert('Failed to unarchive thread: ' + (data.error || data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Unarchive thread error:', error);
            alert('An error occurred while unarchiving thread');
        }
    }
}

// グローバルに公開
window.ThreadManager = ThreadManager;
