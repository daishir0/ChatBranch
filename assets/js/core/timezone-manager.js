// ChatBranch Timezone Manager
// Unified timezone handling for the entire system

class TimeZoneManager {
    constructor() {
        this.timezone = 'Asia/Tokyo'; // デフォルト
        this.locale = 'ja-JP';        // デフォルト
        this.loaded = false;
    }
    
    /**
     * システムタイムゾーン設定を読み込み
     */
    async loadSystemTimezone() {
        try {
            const config = await app.apiClient.getSystemConfig();
            if (config.success) {
                this.timezone = config.timezone || 'Asia/Tokyo';
                this.locale = config.locale || 'ja-JP';
                this.loaded = true;
                console.log('Timezone loaded:', { timezone: this.timezone, locale: this.locale });
            }
        } catch (error) {
            console.warn('Failed to load timezone config, using defaults:', error);
            this.loaded = true; // デフォルト値で続行
        }
    }
    
    /**
     * UTC文字列を設定タイムゾーンの日付+時刻に変換
     */
    formatDateTime(utcDateString, options = {}) {
        if (!utcDateString) return '不明';
        
        const date = new Date(utcDateString + 'Z'); // UTCであることを明示
        
        // 日付が不正な場合
        if (isNaN(date.getTime())) {
            return '不明';
        }
        
        const defaultOptions = {
            timeZone: this.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };
        
        try {
            return date.toLocaleString(this.locale, defaultOptions);
        } catch (error) {
            // フォールバック
            console.warn('Date formatting failed, using fallback:', error);
            return date.toLocaleString('ja-JP', defaultOptions);
        }
    }
    
    /**
     * 日付のみフォーマット
     */
    formatDate(utcDateString) {
        return this.formatDateTime(utcDateString, {
            hour: undefined,
            minute: undefined,
            second: undefined
        });
    }
    
    /**
     * 時刻のみフォーマット  
     */
    formatTime(utcDateString) {
        return this.formatDateTime(utcDateString, {
            year: undefined,
            month: undefined,
            day: undefined
        });
    }
    
    /**
     * コンパクトな日付+時刻フォーマット（Vis.js用）
     */
    formatCompactDateTime(utcDateString) {
        const date = new Date(utcDateString + 'Z');
        if (isNaN(date.getTime())) return '不明';
        
        try {
            const dateStr = date.toLocaleDateString(this.locale, {
                timeZone: this.timezone,
                month: '2-digit',
                day: '2-digit'
            });
            
            const timeStr = date.toLocaleTimeString(this.locale, {
                timeZone: this.timezone,
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `${dateStr} ${timeStr}`;
        } catch (error) {
            // フォールバック
            return date.toLocaleString('ja-JP', {
                timeZone: this.timezone,
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
    
    /**
     * 相対時間フォーマット（スレッド一覧用）
     */
    formatRelativeTime(utcDateString) {
        if (!utcDateString) return '不明';
        
        const date = new Date(utcDateString + 'Z');
        const now = new Date();
        const diff = now - date;
        
        // 不正な日付
        if (isNaN(date.getTime())) {
            return '不明';
        }
        
        // 未来の日付（起こりえないが念のため）
        if (diff < 0) {
            return this.formatDate(utcDateString);
        }
        
        // 相対時間の閾値
        if (diff < 60000) return 'たった今';                    // 1分未満
        if (diff < 3600000) return Math.floor(diff / 60000) + '分前';     // 1時間未満
        if (diff < 86400000) return Math.floor(diff / 3600000) + '時間前'; // 1日未満
        if (diff < 604800000) return Math.floor(diff / 86400000) + '日前'; // 1週間未満
        
        // 1週間以上は絶対日付
        return this.formatDate(utcDateString);
    }
    
    /**
     * ファイル用の時刻フォーマット（1日未満は時刻、それ以外は日付）
     */
    formatFileTime(utcDateString) {
        if (!utcDateString) return '不明';
        
        const date = new Date(utcDateString + 'Z');
        const now = new Date();
        const diff = now - date;
        
        if (isNaN(date.getTime())) {
            return '不明';
        }
        
        // 1日未満は時刻のみ
        if (diff < 86400000) {
            return this.formatTime(utcDateString);
        }
        
        // 1日以上は日付のみ
        return this.formatDate(utcDateString);
    }
}

// グローバルに公開
window.TimeZoneManager = TimeZoneManager;