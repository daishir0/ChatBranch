// ChatBranch Enhanced File Manager Component

class FileManager {
    constructor(context = 'main') {
        this.context = context; // 'main', 'branch', or 'edit'
        this.selectedFiles = [];
        this.allFiles = [];
        this.filteredFiles = [];
        this.searchTimeout = null;
        this.currentView = 'grid'; // Fixed to grid view only
        this.currentFilter = 'all';
        this.currentSort = 'name';
        this.selectionMode = false;
        this.selectedFileIds = new Set();
        
        // URL設定を取得
        this.apiBaseUrl = window.appConfig?.urls?.apiUrl || '/api';
        
        this.init();
    }
    
    // 認証付きFetch
    async authenticatedFetch(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Authorization': 'Basic ' + window.authCredentials,
                ...options.headers
            }
        };
        
        return fetch(url, { ...options, ...defaultOptions });
    }
    
    init() {
        try {
            this.bindEvents();
            this.setupDragAndDrop();
        } catch (error) {
            console.error('FileManager init() failed:', error);
        }
    }
    
    bindEvents() {
        // File Manager Modal
        const closeBtn = document.getElementById('fileManagerClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }
        
        // File Upload
        const fileUpload = document.getElementById('fileUpload');
        if (fileUpload) {
            fileUpload.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }
        
        // File Search
        const fileSearch = document.getElementById('fileSearch');
        if (fileSearch) {
            fileSearch.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.searchFiles(e.target.value);
                }, 300);
            });
        }
        
        // Sort Change
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.setSortBy(e.target.value);
            });
        }
        
        // Filter Chips
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.setFilter(chip.dataset.type);
            });
        });
        
        // Selection Controls
        document.getElementById('cancelSelectionBtn').addEventListener('click', () => {
            this.exitSelectionMode();
        });
        
        document.getElementById('clearSelectionBtn').addEventListener('click', () => {
            this.clearFileSelection();
        });
        
        // Bulk Actions
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
            this.bulkDeleteFiles();
        });
        
        document.getElementById('bulkDownloadBtn').addEventListener('click', () => {
            this.bulkDownloadFiles();
        });
        
        // Delete Confirmation Modal
        document.getElementById('deleteConfirmClose').addEventListener('click', () => {
            this.hideModal('deleteConfirmModal');
        });
        
        document.getElementById('deleteConfirmCancel').addEventListener('click', () => {
            this.hideModal('deleteConfirmModal');
        });
        
        document.getElementById('deleteConfirmOk').addEventListener('click', () => {
            this.confirmDelete();
        });
        
        // Select Files Button
        document.getElementById('selectFilesBtn').addEventListener('click', () => {
            this.selectFiles();
        });
    }
    
    setupDragAndDrop() {
        const uploadArea = document.querySelector('.file-upload-area');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileUpload(files);
        }, false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    show() {
        this.loadFiles();
        this.renderSelectedFiles();
        document.getElementById('fileManagerModal').style.display = 'flex';
        
        // Set fixed grid view
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.className = 'file-list grid-view';
        }
    }
    
    hide() {
        document.getElementById('fileManagerModal').style.display = 'none';
        document.getElementById('fileSearch').value = '';
    }
    
    async loadFiles() {
        try {
            const timestamp = Date.now();
            const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=list&limit=50&_t=${timestamp}`);
            const data = await response.json();
            
            if (data.success) {
                this.allFiles = data.files;
                this.filteredFiles = data.files;
                this.applySortAndFilter();
            }
        } catch (error) {
            console.error('Failed to load files:', error);
        }
    }
    
    
    toggleFileSelection(fileId, isSelected) {
        // Handle both call patterns: toggleFileSelection(fileId, boolean) and toggleFileSelection(fileId)
        if (typeof isSelected === 'undefined') {
            // Toggle mode: if file is selected, remove it; if not selected, add it
            const isCurrentlySelected = this.selectedFiles.includes(fileId);
            isSelected = !isCurrentlySelected;
        }
        
        if (isSelected) {
            if (!this.selectedFiles.includes(fileId)) {
                this.selectedFiles.push(fileId);
            }
        } else {
            this.selectedFiles = this.selectedFiles.filter(id => id !== fileId);
        }
        
        // Update visual selection
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileElement) {
            fileElement.classList.toggle('selected', isSelected);
        }
        
        this.updateSelectButton();
    }
    
    updateSelectButton() {
        const selectBtn = document.getElementById('selectFilesBtn');
        const count = this.selectedFiles.length;
        
        if (count === 0) {
            selectBtn.textContent = 'Select Files';
            selectBtn.disabled = false;
        } else {
            selectBtn.textContent = `Attach ${count} File(s)`;
            selectBtn.disabled = false;
        }
    }
    
    selectFiles() {
        if (this.context === 'main') {
            app.selectedFiles = [...this.selectedFiles];
            app.updateFileAttachments();
        } else if (this.context === 'branch') {
            this.updateAttachmentsForContext('branchFileAttachments');
        } else if (this.context === 'edit') {
            this.updateAttachmentsForContext('editFileAttachments');
        }
        this.hide();
    }
    
    renderSelectedFiles() {
        // Clear previous selections based on context
        if (this.context === 'main') {
            this.selectedFiles = [...app.selectedFiles];
        } else if (this.context === 'branch') {
            this.selectedFiles = [...(window.branchSelectedFiles || [])];
        } else if (this.context === 'edit') {
            this.selectedFiles = [...(window.editSelectedFiles || [])];
        }
        
        this.updateSelectButton();
        
        // Update checkboxes in the file list
        document.querySelectorAll('.file-item').forEach(item => {
            const fileId = parseInt(item.dataset.fileId);
            const checkbox = item.querySelector('.file-checkbox');
            const isSelected = this.selectedFiles.includes(fileId);
            
            checkbox.checked = isSelected;
            item.classList.toggle('selected', isSelected);
        });
    }
    
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        const formData = new FormData();
        formData.append('csrf_token', window.csrfToken);
        
        // Upload files one by one
        for (const file of files) {
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('file', file);
                uploadFormData.append('csrf_token', window.csrfToken);
                
                const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=upload`, {
                    method: 'POST',
                    body: uploadFormData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    console.log(`File uploaded: ${file.name}`);
                } else {
                    throw new Error(data.error || 'Upload failed');
                }
            } catch (error) {
                console.error(`Upload failed for ${file.name}:`, error);
                alert(`Upload failed for ${file.name}: ${error.message}`);
            }
        }
        
        // Refresh file list
        await this.loadFiles();
    }
    
    async searchFiles(query) {
        if (!query.trim()) {
            this.filteredFiles = [...this.allFiles];
            this.renderFiles();
            return;
        }
        
        try {
            const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=search&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                this.filteredFiles = data.files;
                this.renderFiles();
            }
        } catch (error) {
            console.error('Search failed:', error);
            // Fallback to client-side filtering
            this.filteredFiles = this.allFiles.filter(file => 
                file.original_name.toLowerCase().includes(query.toLowerCase())
            );
            this.renderFiles();
        }
    }
    
    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file?')) {
            return;
        }
        
        try {
            const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_id: fileId,
                    csrf_token: window.csrfToken
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remove from selected files if it was selected
                this.selectedFiles = this.selectedFiles.filter(id => id !== fileId);
                app.selectedFiles = app.selectedFiles.filter(id => id !== fileId);
                app.updateFileAttachments();
                
                // Refresh file list
                await this.loadFiles();
            } else {
                throw new Error(data.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Delete failed: ' + error.message);
        }
    }
    
    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        
        const icons = {
            pdf: '📄',
            doc: '📄',
            docx: '📄',
            txt: '📄',
            md: '📄',
            xls: '📊',
            xlsx: '📊',
            ppt: '📊',
            pptx: '📊',
            jpg: '🖼️',
            jpeg: '🖼️',
            png: '🖼️',
            gif: '🖼️',
            zip: '📦',
            rar: '📦'
        };
        
        return icons[extension] || '📄';
    }
    
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
    
    formatDate(dateString) {
        // Use TimeZoneManager if available
        if (window.app && window.app.timezoneManager) {
            return window.app.timezoneManager.formatFileTime(dateString);
        }
        
        // Fallback to original implementation
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 86400000) { // Less than 1 day
            return date.toLocaleTimeString('ja-JP', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else {
            return date.toLocaleDateString('ja-JP');
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Sorting
    setSortBy(sortBy) {
        this.currentSort = sortBy;
        this.applySortAndFilter();
    }
    
    // Filtering
    setFilter(type) {
        this.currentFilter = type;
        
        // Update filter chips
        document.querySelectorAll('.chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.type === type);
        });
        
        this.applySortAndFilter();
    }
    
    applySortAndFilter() {
        let files = [...this.allFiles];
        
        // Apply filter
        if (this.currentFilter !== 'all') {
            files = files.filter(file => this.getFileType(file.original_name) === this.currentFilter);
        }
        
        // Apply sort
        files.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.original_name.localeCompare(b.original_name);
                case 'date':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'size':
                    return (b.file_size || 0) - (a.file_size || 0);
                case 'type':
                    return this.getFileType(a.original_name).localeCompare(this.getFileType(b.original_name));
                default:
                    return 0;
            }
        });
        
        this.filteredFiles = files;
        this.renderFiles();
    }
    
    getFileType(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        
        // PDF files
        if (['pdf'].includes(ext)) return 'pdf';
        
        // Word files
        if (['doc', 'docx'].includes(ext)) return 'word';
        
        // Excel files
        if (['xls', 'xlsx'].includes(ext)) return 'excel';
        
        // PowerPoint files
        if (['ppt', 'pptx'].includes(ext)) return 'ppt';
        
        // Text files
        const textExtensions = [
            // 基本テキスト
            'txt', 'md', 'markdown',
            // データ形式
            'csv', 'json', 'xml',
            // ログ・設定
            'log', 'conf', 'config', 'ini', 'properties',
            // Web・プログラミング
            'html', 'htm', 'css', 'js', 'ts', 'php', 'py', 'sql', 
            'yaml', 'yml', 'toml',
            // その他
            'rtf', 'bat', 'sh'
        ];
        if (textExtensions.includes(ext)) return 'text';
        
        return 'other';
    }
    
    getFileIcon(fileName) {
        const type = this.getFileType(fileName);
        switch (type) {
            case 'pdf': return '📄';
            case 'word': return '📝';
            case 'excel': return '📊';
            case 'ppt': return '📋';
            case 'text': return '📄';
            default: return '📁';
        }
    }
    
    // File Rendering
    renderFiles() {
        const fileList = document.getElementById('fileList');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredFiles.length === 0) {
            fileList.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        fileList.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';
        
        fileList.innerHTML = '';
        
        this.filteredFiles.forEach(file => {
            const fileElement = this.createFileElement(file);
            fileList.appendChild(fileElement);
        });
    }
    
    createFileElement(file) {
        const isSelected = this.selectedFiles.includes(file.id);
        const fileIcon = this.getFileIcon(file.original_name);
        
        // Always use grid view
        return this.createFileCard(file, fileIcon, isSelected);
    }
    
    createFileCard(file, fileIcon, isSelected) {
        const card = document.createElement('div');
        card.className = `file-card ${isSelected ? 'selected' : ''}`;
        card.dataset.fileId = file.id;
        
        card.innerHTML = `
            <input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''}>
            <div class="file-icon">${fileIcon}</div>
            <div class="file-info">
                <span class="file-name" title="${this.escapeHtml(file.original_name)}">${this.escapeHtml(this.truncateText(file.original_name, 20))}</span>
                <span class="file-meta">${this.formatFileSize(file.file_size)} • ${this.formatDate(file.created_at)}</span>
            </div>
            <div class="file-actions">
                <button class="action-btn" onclick="fileManager.copyFileContent(${file.id})" title="Copy to clipboard">📋</button>
                <button class="action-btn delete" onclick="fileManager.deleteFile(${file.id})" title="Delete">🗑️</button>
            </div>
        `;
        
        // Add click handlers
        this.addFileClickHandlers(card, file);
        
        return card;
    }
    
    createFileItem(file, fileIcon, isSelected) {
        const item = document.createElement('div');
        item.className = `file-item ${isSelected ? 'selected' : ''}`;
        item.dataset.fileId = file.id;
        
        item.innerHTML = `
            <div class="file-left">
                <input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''}>
                <span class="file-icon">${fileIcon}</span>
                <div class="file-info">
                    <span class="file-name">${this.escapeHtml(file.original_name)}</span>
                    <span class="file-meta">${this.formatFileSize(file.file_size)} • ${this.formatDate(file.created_at)}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="action-btn" onclick="fileManager.copyFileContent(${file.id})" title="Copy to clipboard">📋</button>
                <button class="action-btn delete" onclick="fileManager.deleteFile(${file.id})" title="Delete">🗑️</button>
            </div>
        `;
        
        // Add click handlers
        this.addFileClickHandlers(item, file);
        
        return item;
    }
    
    addFileClickHandlers(element, file) {
        const checkbox = element.querySelector('.file-checkbox');
        
        // Checkbox change
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.toggleFileSelection(file.id);
        });
        
        // Element click (for selection)
        element.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-btn') || e.target.type === 'checkbox') {
                return; // Don't handle clicks on action buttons or checkbox
            }
            
            if (e.ctrlKey || e.metaKey) {
                // Multi-select on PC
                this.toggleFileSelection(file.id);
            } else if (this.selectionMode) {
                // Selection mode active
                this.toggleFileSelection(file.id);
            }
        });
        
        // Long press for mobile selection
        let pressTimer;
        element.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                this.enterSelectionMode();
                this.toggleFileSelection(file.id);
            }, 500);
        });
        
        element.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });
        
        element.addEventListener('touchmove', () => {
            clearTimeout(pressTimer);
        });
    }
    
    // Selection Management - using simple file selection system only
    
    // File Actions
    async deleteFile(fileId) {
        const file = this.allFiles.find(f => f.id === fileId);
        if (!file) return;
        
        this.showDeleteConfirmation([file]);
    }
    
    async bulkDeleteFiles() {
        const filesToDelete = this.allFiles.filter(file => this.selectedFileIds.has(file.id));
        if (filesToDelete.length === 0) return;
        
        this.showDeleteConfirmation(filesToDelete);
    }
    
    showDeleteConfirmation(files) {
        this.filesToDelete = files;
        const fileList = document.getElementById('deleteFileList');
        
        fileList.innerHTML = '';
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'delete-file-item';
            fileItem.innerHTML = `
                <span class="file-icon">${this.getFileIcon(file.original_name)}</span>
                <span class="file-name">${this.escapeHtml(file.original_name)}</span>
            `;
            fileList.appendChild(fileItem);
        });
        
        this.showModal('deleteConfirmModal');
    }
    
    async confirmDelete() {
        if (!this.filesToDelete || this.filesToDelete.length === 0) return;
        
        try {
            for (const file of this.filesToDelete) {
                const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=delete&id=${file.id}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to delete ${file.original_name}`);
                }
            }
            
            // Remove from local arrays
            const deletedIds = new Set(this.filesToDelete.map(f => f.id));
            this.allFiles = this.allFiles.filter(file => !deletedIds.has(file.id));
            this.filteredFiles = this.filteredFiles.filter(file => !deletedIds.has(file.id));
            
            // Clear selection
            deletedIds.forEach(id => this.selectedFileIds.delete(id));
            this.selectedFiles = this.selectedFiles.filter(id => !deletedIds.has(id));
            
            // Update UI
            this.renderFiles();
            this.updateSelectButton();
            this.hideModal('deleteConfirmModal');
            
            // Show success message
            this.showToast(`${this.filesToDelete.length} file(s) deleted successfully`, 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Failed to delete files', 'error');
        }
        
        this.filesToDelete = null;
    }
    
    async downloadFile(fileId) {
        try {
            const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=download&id=${fileId}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const file = this.allFiles.find(f => f.id === fileId);
                
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.original_name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Failed to download file', 'error');
        }
    }
    
    async bulkDownloadFiles() {
        const selectedFiles = this.allFiles.filter(file => this.selectedFileIds.has(file.id));
        
        for (const file of selectedFiles) {
            await this.downloadFile(file.id);
            // Add small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    /**
     * ファイル内容をクリップボードにコピー
     */
    async copyFileContent(fileId) {
        
        try {
            const file = this.allFiles.find(f => f.id === fileId);
            if (!file) {
                this.showToast('File not found', 'error');
                return;
            }
            
            
            // ファイルの内容を取得（一覧にはもう含まれないので、必ずAPIから取得）
            let content = '';
            const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=get&id=${fileId}`);
            
            const data = await response.json();
            
            if (data.success && data.file && data.file.content_markdown) {
                content = data.file.content_markdown;
            } else {
                this.showToast('Failed to retrieve file content: ' + (data.error || 'Unknown error'), 'error');
                return;
            }
            
            // クリップボードにコピー（オーバーレイUI経由）
            await this.copyTextToClipboard(content);
            
            // Remove automatic success messages - the overlay handles feedback
            this.showCopyFeedback(fileId);
            
        } catch (error) {
            console.error('Copy file content error:', error);
            
            // Show detailed error for mobile debugging
            let debugInfo = '';
            debugInfo += `Error: ${error.message}\n`;
            debugInfo += `Type: ${error.name}\n`;
            debugInfo += `UserAgent: ${navigator.userAgent.substring(0, 50)}...\n`;
            debugInfo += `ClipboardAPI: ${!!navigator.clipboard}\n`;
            debugInfo += `HTTPS: ${location.protocol === 'https:'}\n`;
            
            this.showToast(`Copy failed - ${debugInfo}`, 'error');
        }
    }
    
    /**
     * テキストをクリップボードにコピー（モバイル対応強化版）
     */
    async copyTextToClipboard(text) {
        // Always show overlay UI for better user experience (PC and mobile)
        return new Promise((resolve, reject) => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            
            // Create overlay with instructions
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            overlay.style.zIndex = '9998';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.flexDirection = 'column';
            overlay.style.padding = '60px 20px 20px 20px'; // Extra top padding for buttons
            
            // Remove instruction text - we'll use action buttons instead
            
            // Large content area styling - 80% of viewport
            textArea.style.position = 'relative';
            textArea.style.width = '80vw';
            textArea.style.height = '80vh';
            textArea.style.maxWidth = '80vw';
            textArea.style.maxHeight = '80vh';
            textArea.style.padding = '20px';
            textArea.style.border = '2px solid #007AFF';
            textArea.style.borderRadius = '12px';
            textArea.style.backgroundColor = 'white';
            textArea.style.color = '#000';
            textArea.style.fontSize = '14px';
            textArea.style.fontFamily = 'monospace';
            textArea.style.lineHeight = '1.5';
            textArea.style.resize = 'none';
            textArea.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
            textArea.style.overflow = 'auto';
            
            // Add copy button (green)
            const copyBtn = document.createElement('button');
            copyBtn.innerHTML = 'Copy';
            copyBtn.style.position = 'absolute';
            copyBtn.style.top = '20px';
            copyBtn.style.right = '120px';
            copyBtn.style.padding = '12px 20px';
            copyBtn.style.backgroundColor = '#28a745';
            copyBtn.style.color = 'white';
            copyBtn.style.border = 'none';
            copyBtn.style.borderRadius = '6px';
            copyBtn.style.fontSize = '16px';
            copyBtn.style.fontWeight = 'bold';
            copyBtn.style.cursor = 'pointer';
            copyBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            copyBtn.style.transition = 'all 0.2s ease';
            
            // Add close button (red)
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = 'Close';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '20px';
            closeBtn.style.right = '20px';
            closeBtn.style.padding = '12px 20px';
            closeBtn.style.backgroundColor = '#dc3545';
            closeBtn.style.color = 'white';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '6px';
            closeBtn.style.fontSize = '16px';
            closeBtn.style.fontWeight = 'bold';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            closeBtn.style.transition = 'all 0.2s ease';
            
            // Add hover effects
            copyBtn.addEventListener('mouseenter', () => {
                copyBtn.style.backgroundColor = '#218838';
                copyBtn.style.transform = 'translateY(-1px)';
            });
            copyBtn.addEventListener('mouseleave', () => {
                copyBtn.style.backgroundColor = '#28a745';
                copyBtn.style.transform = 'translateY(0)';
            });
            
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.backgroundColor = '#c82333';
                closeBtn.style.transform = 'translateY(-1px)';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.backgroundColor = '#dc3545';
                closeBtn.style.transform = 'translateY(0)';
            });
            
            overlay.appendChild(textArea);
            overlay.appendChild(copyBtn);
            overlay.appendChild(closeBtn);
            document.body.appendChild(overlay);
            
            
            // Focus and select - critical for mobile
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, textArea.value.length);
            
            
            // Close function (no copy)
            const closeOverlay = () => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                resolve(); // Just close without copying
            };
            
            // Copy function
            const copyAndClose = async () => {
                try {
                    // Try modern clipboard API first
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text);
                    } else {
                        // Fallback to execCommand - temporarily select all for copying
                        textArea.focus();
                        textArea.select();
                        textArea.setSelectionRange(0, textArea.value.length);
                        
                        const successful = document.execCommand('copy');
                        if (!successful) {
                            throw new Error('Copy command failed');
                        }
                        
                        // Clear selection after copy
                        textArea.setSelectionRange(0, 0);
                    }
                    
                    // Show success feedback
                    copyBtn.innerHTML = '✓ Copied!';
                    copyBtn.style.backgroundColor = '#198754';
                    
                    // Close after brief delay
                    setTimeout(() => {
                        if (document.body.contains(overlay)) {
                            document.body.removeChild(overlay);
                        }
                        // Don't call resolve() here to prevent success toast
                    }, 500);
                    
                } catch (error) {
                    console.error('Clipboard copy failed:', error);
                    copyBtn.innerHTML = 'Copy Failed';
                    copyBtn.style.backgroundColor = '#dc3545';
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = 'Copy';
                        copyBtn.style.backgroundColor = '#28a745';
                    }, 2000);
                    // Don't call resolve/reject - keep overlay open for retry
                }
            };
            
            // Button events
            copyBtn.addEventListener('click', copyAndClose);
            closeBtn.addEventListener('click', closeOverlay);
            
            // Close on overlay click (outside content)
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeOverlay();
                }
            });
            
            // Set cursor to beginning and clear selection for better readability
            textArea.focus();
            textArea.setSelectionRange(0, 0); // Cursor at start, no selection
            textArea.scrollTop = 0; // Ensure scroll to top
        });
    }
    
    /**
     * コピー成功のフィードバック表示
     */
    showCopyFeedback(fileId) {
        const button = document.querySelector(`[onclick="fileManager.copyFileContent(${fileId})"]`);
        if (button) {
            const originalText = button.textContent;
            const originalTitle = button.title;
            
            // Temporarily show success
            button.textContent = '✅';
            button.title = 'Copied!';
            button.classList.add('copy-success');
            
            // Revert after 2 seconds
            setTimeout(() => {
                button.textContent = originalText;
                button.title = originalTitle;
                button.classList.remove('copy-success');
            }, 2000);
        }
    }
    
    // Utility methods
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    formatDate(dateString) {
        // Use TimeZoneManager if available
        if (window.app && window.app.timezoneManager) {
            return window.app.timezoneManager.formatDate(dateString);
        }
        
        // Fallback to original implementation
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4a9eff'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    // Override the existing show method to load files
    async show() {
        document.getElementById('fileManagerModal').style.display = 'flex';
        await this.loadFiles();
    }
    
    // ===================================
    // File Attachment Integration Methods
    // ===================================
    
    /**
     * ファイル添付状態を更新（チャットエリア用）
     */
    updateFileAttachments() {
        const attachmentsContainer = document.getElementById('fileAttachments');
        
        if (this.selectedFiles.length === 0) {
            if (attachmentsContainer) {
                attachmentsContainer.style.display = 'none';
            }
            return;
        }
        
        if (attachmentsContainer) {
            attachmentsContainer.style.display = 'block';
            attachmentsContainer.innerHTML = '';
            
            this.selectedFiles.forEach(fileId => {
                this.createAttachmentElementForChat(fileId, attachmentsContainer);
            });
        }
    }
    
    /**
     * 指定されたコンテキストの添付ファイル表示を更新
     */
    updateAttachmentsForContext(containerId) {
        const attachmentsContainer = document.getElementById(containerId);
        
        if (this.selectedFiles.length === 0) {
            if (attachmentsContainer) {
                attachmentsContainer.style.display = 'none';
            }
            // Update global context variables
            if (this.context === 'branch') {
                window.branchSelectedFiles = [];
            } else if (this.context === 'edit') {
                window.editSelectedFiles = [];
            }
            return;
        }
        
        // Update global context variables
        if (this.context === 'branch') {
            window.branchSelectedFiles = [...this.selectedFiles];
        } else if (this.context === 'edit') {
            window.editSelectedFiles = [...this.selectedFiles];
        }
        
        if (attachmentsContainer) {
            attachmentsContainer.style.display = 'block';
            attachmentsContainer.innerHTML = '';
            
            this.selectedFiles.forEach(fileId => {
                this.createAttachmentElementForContext(fileId, attachmentsContainer, containerId);
            });
        }
    }
    
    /**
     * チャット用添付ファイル要素を作成
     */
    async createAttachmentElementForChat(fileId, container) {
        try {
            // console.log('Loading file info for fileId:', fileId);
            
            // Try to find file in loaded data first
            let file = this.allFiles.find(f => f.id == fileId);
            
            if (!file) {
                // If not found, fetch from API
                const data = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=get&id=${fileId}`);
                const result = await data.json();
                if (result.success) {
                    file = result.file;
                } else {
                    console.error('File info API error:', result.error || 'Unknown error');
                    return;
                }
            }
            
            // console.log('File data:', file);
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'attachment-item';
            attachmentDiv.innerHTML = `
                <span>📎 ${this.escapeHtml(file.original_name)}</span>
                <button class="attachment-remove" onclick="app.removeAttachment(${fileId})">×</button>
            `;
            container.appendChild(attachmentDiv);
            // console.log('Attachment element created successfully');
            
        } catch (error) {
            console.error('Failed to load file info:', error);
        }
    }
    
    /**
     * コンテキスト用添付ファイル要素を作成
     */
    async createAttachmentElementForContext(fileId, container, containerId) {
        try {
            // Try to find file in loaded data first
            let file = this.allFiles.find(f => f.id == fileId);
            
            if (!file) {
                // If not found, fetch from API
                const data = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=get&id=${fileId}`);
                const result = await data.json();
                if (result.success) {
                    file = result.file;
                } else {
                    console.error('File info API error:', result.error || 'Unknown error');
                    return;
                }
            }
            
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'attachment-item';
            attachmentDiv.innerHTML = `
                <span>📎 ${this.escapeHtml(file.original_name)}</span>
                <button class="attachment-remove" onclick="window.removeAttachmentFromContext('${this.context}', ${fileId})">×</button>
            `;
            container.appendChild(attachmentDiv);
            
        } catch (error) {
            console.error('Failed to load file info:', error);
        }
    }
    
    /**
     * 添付ファイルを削除（チャット用）
     */
    removeAttachment(fileId) {
        this.selectedFiles = this.selectedFiles.filter(id => id !== fileId);
        this.updateFileAttachments();
    }
    
    /**
     * コンテキスト別添付ファイル削除
     */
    removeAttachmentFromContext(fileId) {
        this.selectedFiles = this.selectedFiles.filter(id => id !== fileId);
        
        if (this.context === 'branch') {
            window.branchSelectedFiles = [...this.selectedFiles];
            this.updateAttachmentsForContext('branchFileAttachments');
        } else if (this.context === 'edit') {
            window.editSelectedFiles = [...this.selectedFiles];
            this.updateAttachmentsForContext('editFileAttachments');
        }
    }
}

// Initialize file managers for different contexts
const fileManager = new FileManager('main');
const branchFileManager = new FileManager('branch');
const editFileManager = new FileManager('edit');

window.fileManager = fileManager;
window.branchFileManager = branchFileManager;
window.editFileManager = editFileManager;

// Global helper functions for attachment removal
window.removeAttachmentFromContext = function(context, fileId) {
    if (context === 'branch') {
        branchFileManager.removeAttachmentFromContext(fileId);
    } else if (context === 'edit') {
        editFileManager.removeAttachmentFromContext(fileId);
    }
};

// Initialize global context variables
window.branchSelectedFiles = [];
window.editSelectedFiles = [];