// Enhanced File Manager Component

class FileManager {
    constructor() {
        this.selectedFiles = [];
        this.allFiles = [];
        this.filteredFiles = [];
        this.searchTimeout = null;
        this.currentView = 'grid'; // 'grid' or 'list'
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
        this.bindEvents();
        this.setupDragAndDrop();
    }
    
    bindEvents() {
        // File Manager Modal
        document.getElementById('fileManagerClose').addEventListener('click', () => {
            this.hide();
        });
        
        // File Upload
        document.getElementById('fileUpload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });
        
        // File Search
        document.getElementById('fileSearch').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchFiles(e.target.value);
            }, 300);
        });
        
        // View Toggle
        document.getElementById('gridViewBtn').addEventListener('click', () => {
            this.setView('grid');
        });
        
        document.getElementById('listViewBtn').addEventListener('click', () => {
            this.setView('list');
        });
        
        // Sort Change
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.setSortBy(e.target.value);
        });
        
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
    }
    
    hide() {
        document.getElementById('fileManagerModal').style.display = 'none';
        document.getElementById('fileSearch').value = '';
    }
    
    async loadFiles() {
        try {
            const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=list&limit=50`);
            const data = await response.json();
            
            if (data.success) {
                this.allFiles = data.files;
                this.renderFileList(this.allFiles);
            }
        } catch (error) {
            console.error('Failed to load files:', error);
        }
    }
    
    renderFileList(files) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        if (files.length === 0) {
            fileList.innerHTML = '<p class="text-muted">ファイルがありません</p>';
            return;
        }
        
        files.forEach(file => {
            const fileElement = this.createFileElement(file);
            fileList.appendChild(fileElement);
        });
    }
    
    createFileElement(file) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.dataset.fileId = file.id;
        
        if (this.selectedFiles.includes(file.id)) {
            fileDiv.classList.add('selected');
        }
        
        const icon = this.getFileIcon(file.original_name);
        const size = this.formatFileSize(file.file_size);
        const date = this.formatDate(file.created_at);
        
        fileDiv.innerHTML = `
            <div class="file-icon">${icon}</div>
            <div class="file-info">
                <div class="file-name">${this.escapeHtml(file.original_name)}</div>
                <div class="file-meta">${size} • ${date}</div>
            </div>
            <input type="checkbox" class="file-checkbox" ${this.selectedFiles.includes(file.id) ? 'checked' : ''}>
        `;
        
        const checkbox = fileDiv.querySelector('.file-checkbox');
        checkbox.addEventListener('change', (e) => {
            this.toggleFileSelection(file.id, e.target.checked);
        });
        
        fileDiv.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        
        return fileDiv;
    }
    
    toggleFileSelection(fileId, isSelected) {
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
            selectBtn.textContent = 'ファイルを選択';
            selectBtn.disabled = false;
        } else {
            selectBtn.textContent = `${count}個のファイルを添付`;
            selectBtn.disabled = false;
        }
    }
    
    selectFiles() {
        app.selectedFiles = [...this.selectedFiles];
        app.updateFileAttachments();
        this.hide();
    }
    
    renderSelectedFiles() {
        // Clear previous selections
        this.selectedFiles = [...app.selectedFiles];
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
        this.loadFiles();
    }
    
    async searchFiles(query) {
        if (!query.trim()) {
            this.renderFileList(this.allFiles);
            return;
        }
        
        try {
            const response = await this.authenticatedFetch(`${this.apiBaseUrl}/files.php?action=search&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderFileList(data.files);
            }
        } catch (error) {
            console.error('Search failed:', error);
            // Fallback to client-side filtering
            const filtered = this.allFiles.filter(file => 
                file.original_name.toLowerCase().includes(query.toLowerCase())
            );
            this.renderFileList(filtered);
        }
    }
    
    async deleteFile(fileId) {
        if (!confirm('このファイルを削除しますか？')) {
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
                this.loadFiles();
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
    // View Management
    setView(view) {
        this.currentView = view;
        const fileList = document.getElementById('fileList');
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Update file list class
        fileList.className = `file-list ${view}-view`;
        
        // Re-render files
        this.renderFiles();
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
        if (['pdf'].includes(ext)) return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return 'image';
        if (['doc', 'docx', 'txt', 'md', 'xlsx', 'pptx', 'csv'].includes(ext)) return 'document';
        return 'other';
    }
    
    getFileIcon(fileName) {
        const type = this.getFileType(fileName);
        switch (type) {
            case 'pdf': return '📄';
            case 'image': return '🖼️';
            case 'document': return '📝';
            default: return '📁';
        }
    }
    
    // File Rendering
    renderFiles() {
        const fileList = document.getElementById('fileList');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredFiles.length === 0) {
            fileList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        fileList.style.display = this.currentView === 'grid' ? 'grid' : 'flex';
        emptyState.style.display = 'none';
        
        fileList.innerHTML = '';
        
        this.filteredFiles.forEach(file => {
            const fileElement = this.createFileElement(file);
            fileList.appendChild(fileElement);
        });
    }
    
    createFileElement(file) {
        const isSelected = this.selectedFileIds.has(file.id);
        const fileIcon = this.getFileIcon(file.original_name);
        
        if (this.currentView === 'grid') {
            return this.createFileCard(file, fileIcon, isSelected);
        } else {
            return this.createFileItem(file, fileIcon, isSelected);
        }
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
                <button class="action-btn" onclick="fileManager.previewFile(${file.id})" title="プレビュー">👁️</button>
                <button class="action-btn" onclick="fileManager.downloadFile(${file.id})" title="ダウンロード">⬇️</button>
                <button class="action-btn delete" onclick="fileManager.deleteFile(${file.id})" title="削除">🗑️</button>
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
                <button class="action-btn" onclick="fileManager.previewFile(${file.id})" title="プレビュー">👁️</button>
                <button class="action-btn" onclick="fileManager.downloadFile(${file.id})" title="ダウンロード">⬇️</button>
                <button class="action-btn delete" onclick="fileManager.deleteFile(${file.id})" title="削除">🗑️</button>
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
    
    // Selection Management
    toggleFileSelection(fileId) {
        const element = document.querySelector(`[data-file-id="${fileId}"]`);
        const checkbox = element.querySelector('.file-checkbox');
        
        if (this.selectedFileIds.has(fileId)) {
            this.selectedFileIds.delete(fileId);
            element.classList.remove('selected');
            checkbox.checked = false;
        } else {
            this.selectedFileIds.add(fileId);
            element.classList.add('selected');
            checkbox.checked = true;
        }
        
        this.updateSelectionUI();
    }
    
    enterSelectionMode() {
        this.selectionMode = true;
        document.getElementById('selectionToolbar').style.display = 'flex';
        this.updateSelectionUI();
    }
    
    exitSelectionMode() {
        this.selectionMode = false;
        this.selectedFileIds.clear();
        document.getElementById('selectionToolbar').style.display = 'none';
        
        // Clear visual selection
        document.querySelectorAll('.file-card, .file-item').forEach(element => {
            element.classList.remove('selected');
            element.querySelector('.file-checkbox').checked = false;
        });
    }
    
    updateSelectionUI() {
        const count = this.selectedFileIds.size;
        document.getElementById('selectionCount').textContent = `${count}個選択中`;
        
        if (count > 0) {
            this.enterSelectionMode();
        } else if (this.selectionMode) {
            this.exitSelectionMode();
        }
    }
    
    clearFileSelection() {
        this.selectedFileIds.clear();
        document.querySelectorAll('.file-card, .file-item').forEach(element => {
            element.classList.remove('selected');
            element.querySelector('.file-checkbox').checked = false;
        });
        this.updateSelectionUI();
    }
    
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
            
            // Update UI
            this.renderFiles();
            this.updateSelectionUI();
            this.hideModal('deleteConfirmModal');
            
            // Show success message
            this.showToast(`${this.filesToDelete.length}個のファイルを削除しました`, 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('ファイルの削除に失敗しました', 'error');
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
            this.showToast('ファイルのダウンロードに失敗しました', 'error');
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
    
    previewFile(fileId) {
        // File preview functionality - could open in new tab or modal
        const file = this.allFiles.find(f => f.id === fileId);
        if (!file) return;
        
        const url = `${this.apiBaseUrl}/files.php?action=download&id=${fileId}`;
        window.open(url, '_blank');
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
}

// Initialize file manager
const fileManager = new FileManager();
window.fileManager = fileManager;