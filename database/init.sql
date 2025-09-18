-- ChotGPT Database Schema

-- スレッドテーブル
CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    thread_system_prompt TEXT DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now','localtime')),
    updated_at DATETIME DEFAULT (datetime('now','localtime'))
);

-- メッセージテーブル（ツリー構造対応）
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    parent_message_id INTEGER,
    content TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    is_context BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_message_id) REFERENCES messages (id) ON DELETE CASCADE
);

-- ファイルテーブル
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    content_markdown TEXT,
    metadata TEXT, -- JSON形式
    file_size INTEGER,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
);

-- メッセージ-ファイル関連テーブル
CREATE TABLE IF NOT EXISTS message_files (
    message_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    PRIMARY KEY (message_id, file_id),
    FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
);

-- 設定テーブル
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    created_at DATETIME DEFAULT (datetime('now','localtime')),
    updated_at DATETIME DEFAULT (datetime('now','localtime'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages (parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads (updated_at);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at);

-- デフォルト設定値
INSERT OR IGNORE INTO settings (key, value) VALUES
    ('default_model', 'gpt-5-mini'),
    ('system_prompt', 'You are a helpful assistant.'),
    ('theme', 'dark');

-- トリガー（更新日時の自動更新）
CREATE TRIGGER IF NOT EXISTS update_thread_timestamp 
    AFTER INSERT ON messages 
    BEGIN 
        UPDATE threads SET updated_at = datetime('now','localtime') WHERE id = NEW.thread_id;
    END;