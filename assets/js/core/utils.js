// ChatBranch Common Utilities

class AppUtils {
    /**
     * HTML エスケープ
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 日付フォーマット（相対時間）
     */
    static formatDate(dateString) {
        // Handle empty or invalid date strings
        if (!dateString || dateString.trim() === '') {
            return '不明';
        }
        
        const date = new Date(dateString);
        
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return '不明';
        }
        
        const now = new Date();
        const diff = now - date;
        
        // Handle future dates (should not happen but just in case)
        if (diff < 0) {
            return date.toLocaleDateString('ja-JP');
        }
        
        if (diff < 60000) return 'たった今';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '時間前';
        if (diff < 604800000) return Math.floor(diff / 86400000) + '日前';
        
        return date.toLocaleDateString('ja-JP');
    }
    
    /**
     * ファイルサイズフォーマット
     */
    static formatFileSize(bytes) {
        if (!bytes) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
    
    /**
     * イベント防止ヘルパー
     */
    static preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    /**
     * デバウンス関数
     */
    static debounce(func, wait) {
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
    
    /**
     * テキストを指定長で切り詰め
     */
    static truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// グローバルに公開
window.AppUtils = AppUtils;