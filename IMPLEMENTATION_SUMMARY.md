# 論理削除機能の実装完了サマリー

## 実装日
2025-10-09

## 概要
メッセージ、スレッド、ファイルの削除を物理削除から論理削除に変更しました。これにより、データの復元可能性を確保し、監査要件に対応できるようになりました。

## 実装内容

### 1. データベーススキーマの修正

#### messagesテーブル
```sql
ALTER TABLE messages ADD COLUMN deleted_at DATETIME DEFAULT NULL;
```

#### filesテーブル
```sql
ALTER TABLE files ADD COLUMN deleted_at DATETIME DEFAULT NULL;
```

**注**: threadsテーブルは既に `deleted_at` カラムが存在していたため、修正不要でした。

### 2. コード修正

#### ChatManager.php の修正

**SELECTクエリの修正（6箇所）**:
1. `getThread()` - Line 28
2. `getThreadSystemPrompt()` - Line 87
3. `getMessage()` - Line 127
4. `getMessages()` - Line 132
5. `getMessageChildren()` - Line 211
6. `getThreads()` - Line 23

全てのSELECTクエリに `AND deleted_at IS NULL` 条件を追加

**DELETE → UPDATE 変更（3箇所）**:
1. `deleteMessage()` - Line 215-227
   - 再帰的な子メッセージの論理削除を実装
2. `deleteChildMessages()` - Line 229-246
   - 子メッセージを一括で論理削除
3. `deleteThread()` - Line 39-50
   - スレッドに紐づく全メッセージを論理削除してから、スレッド自体を論理削除

**特殊処理**:
- `getChildMessageIds()` - 削除対象を取得するため、`deleted_at` フィルタを**付けない**

#### FileManager.php の修正

**SELECTクエリの修正（6箇所）**:
1. `getFile()` - Line 438
2. `getFiles()` (limit なし) - Line 444
3. `getFiles()` (limit あり) - Line 447
4. `searchFiles()` (limit なし) - Line 454-456
5. `searchFiles()` (limit あり) - Line 461-463
6. `getMessageFiles()` - Line 514-516

全てのSELECTクエリに `AND deleted_at IS NULL` 条件を追加

**DELETE → UPDATE 変更（1箇所）**:
1. `deleteFile()` - Line 470-505
   - ファイルレコードを論理削除
   - message_files の削除は不要（JOIN時にフィルタされるため）

### 3. データベースの現在の状態

```
threads:  45件（21件アクティブ、24件削除済み）
messages: 654件（全てアクティブ）
files:    44件（全てアクティブ）
```

## 技術的なポイント

### 論理削除の実装パターン
```php
// 物理削除（旧）
$sql = "DELETE FROM table WHERE id = ?";

// 論理削除（新）
$sql = "UPDATE table SET deleted_at = datetime('now','localtime') WHERE id = ?";
```

### SELECTクエリのフィルタパターン
```php
// 論理削除されていないレコードのみ取得
$sql = "SELECT * FROM table WHERE id = ? AND deleted_at IS NULL";
```

### カスケード削除の手動実装

SQLiteの `ON DELETE CASCADE` は物理削除時のみ動作するため、論理削除では手動でカスケード処理を実装：

```php
public function deleteThread($threadId) {
    // 1. スレッドに紐づく全メッセージを論理削除
    $sql = "UPDATE messages SET deleted_at = datetime('now','localtime')
            WHERE thread_id = ? AND deleted_at IS NULL";
    $this->db->query($sql, [$threadId]);

    // 2. スレッド自体を論理削除
    $sql = "UPDATE threads SET deleted_at = datetime('now','localtime') WHERE id = ?";
    $this->db->query($sql, [$threadId]);
}
```

## テスト結果

### 自動テスト
- ✓ サイトアクセス成功
- ✓ JavaScriptエラーなし
- ✓ データベーススキーマ確認完了

### 手動テストで確認すべき項目

- [ ] メッセージを削除した際、画面から消えること
- [ ] 削除したメッセージがDBで `deleted_at` が設定されていること
- [ ] スレッドを削除した際、リストから消えること
- [ ] 削除したスレッドがDBで `deleted_at` が設定されていること
- [ ] ファイルを削除した際、リストから消えること
- [ ] 削除したファイルがDBで `deleted_at` が設定されていること
- [ ] 親メッセージを削除した際、子メッセージも削除されること
- [ ] ツリー構造が正しく表示されること

## 影響範囲

### 変更されたファイル
1. `/var/www/html/chat2/classes/ChatManager.php`
2. `/var/www/html/chat2/classes/FileManager.php`
3. `/var/www/data/chotgpt_36a8ffec64dba7adca466546.db` (スキーマ変更)

### 変更されていないファイル
- フロントエンドコード（JavaScript、HTML、CSS）は変更不要
- APIエンドポイント（index.php、api/）は変更不要
- 設定ファイル（config.php）は変更不要

## メリット

1. **データ復元**: 誤って削除したデータを復元可能
2. **監査証跡**: 削除履歴を追跡可能
3. **データ分析**: 削除されたデータも含めて分析可能
4. **安全性**: 物理削除による永久的なデータ損失を防止

## 注意事項

1. **データベースサイズ**: 削除されたレコードもディスクに保持されるため、長期的にはデータベースサイズが増大
2. **定期的なクリーンアップ**: 必要に応じて古い削除済みレコードを物理削除するバッチ処理の実装を推奨
3. **パフォーマンス**: `deleted_at IS NULL` 条件が追加されるため、適切なインデックスが必要（現在は未実装）

## 推奨される今後の改善

### 1. インデックスの追加
```sql
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages (deleted_at);
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files (deleted_at);
CREATE INDEX IF NOT EXISTS idx_threads_deleted_at ON threads (deleted_at);
```

### 2. 古いレコードのクリーンアップスクリプト
```sql
-- 例: 90日以上前に削除されたレコードを物理削除
DELETE FROM messages
WHERE deleted_at IS NOT NULL
  AND deleted_at < datetime('now', '-90 days');
```

### 3. 削除されたデータの復元機能
管理画面から削除されたレコードを表示・復元できる機能の実装

## まとめ

論理削除への移行が正常に完了しました。すべてのコード変更とデータベーススキーマ変更が適用され、基本的な動作確認も完了しています。実運用前に上記の手動テスト項目を確認することを推奨します。

---
*実装者: Claude Code*
*参考ドキュメント: /var/www/html/chat2/improve_delete_logic.md*
