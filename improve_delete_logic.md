# 論理削除への移行計画

## 概要

messages, threads, filesテーブルをすべて論理削除（deleted_atカラムを使用）に変更する。

---

## 1. データベーススキーマ変更

### 1.1 FOREIGN KEY制約の調整

**対象:** `database/init.sql`

**現状の問題:**
- ON DELETE CASCADEが論理削除では発火しない
- 物理削除を前提とした設計になっている

**対応方針:**
- FOREIGN KEY制約は維持（参照整合性のため）
- ON DELETE CASCADEは維持（将来的な物理削除に備える）
- カスケード削除はアプリケーション層で手動実装

**変更不要** - スキーマはそのまま維持

---

## 2. SELECT クエリの修正

すべてのSELECTクエリに `WHERE deleted_at IS NULL` 条件を追加する。

### 2.1 ChatManager.php

| 行番号 | メソッド | 現在のSQL | 修正後のSQL |
|--------|---------|-----------|------------|
| 23 | `getThreads()` | `SELECT * FROM threads WHERE deleted_at IS NULL ...` | ✅ 既に対応済み |
| 28 | `getThread()` | `SELECT * FROM threads WHERE id = ?` | `SELECT * FROM threads WHERE id = ? AND deleted_at IS NULL` |
| 87 | `getThreadSystemPrompt()` | `SELECT thread_system_prompt FROM threads WHERE id = ?` | `SELECT thread_system_prompt FROM threads WHERE id = ? AND deleted_at IS NULL` |
| 127 | `getMessage()` | `SELECT * FROM messages WHERE id = ?` | `SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL` |
| 132 | `getMessages()` | `SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC` | `SELECT * FROM messages WHERE thread_id = ? AND deleted_at IS NULL ORDER BY created_at ASC` |
| 211 | `getMessageChildren()` | `SELECT * FROM messages WHERE parent_message_id = ? ORDER BY created_at ASC` | `SELECT * FROM messages WHERE parent_message_id = ? AND deleted_at IS NULL ORDER BY created_at ASC` |
| 249 | `getChildMessageIds()` | `SELECT id FROM messages WHERE parent_message_id = ?` | `SELECT id FROM messages WHERE parent_message_id = ? AND deleted_at IS NULL` |
| 274 | `getSetting()` | `SELECT value FROM settings WHERE key = ?` | 変更不要（settingsテーブルは削除対象外） |

**特記事項:**
- `getMessages()` (132行目) は **ツリー構築の基礎** となるため最重要
- `getChildMessageIds()` (249行目) は再帰削除ロジックで使用されるため、論理削除対応が必須

### 2.2 FileManager.php

| 行番号 | メソッド | 現在のSQL | 修正後のSQL |
|--------|---------|-----------|------------|
| 438 | `getFile()` | `SELECT * FROM files WHERE id = ?` | `SELECT * FROM files WHERE id = ? AND deleted_at IS NULL` |
| 444 | `getFiles()` (no limit) | `SELECT * FROM files ORDER BY created_at DESC` | `SELECT * FROM files WHERE deleted_at IS NULL ORDER BY created_at DESC` |
| 447 | `getFiles()` (with limit) | `SELECT * FROM files ORDER BY created_at DESC LIMIT ? OFFSET ?` | `SELECT * FROM files WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?` |
| 454-456 | `searchFiles()` (no limit) | `SELECT * FROM files WHERE original_name LIKE ? ORDER BY created_at DESC` | `SELECT * FROM files WHERE original_name LIKE ? AND deleted_at IS NULL ORDER BY created_at DESC` |
| 461-463 | `searchFiles()` (with limit) | `SELECT * FROM files WHERE original_name LIKE ? ORDER BY created_at DESC LIMIT ?` | `SELECT * FROM files WHERE original_name LIKE ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?` |
| 514-516 | `getMessageFiles()` | `SELECT f.* FROM files f JOIN message_files mf ON f.id = mf.file_id WHERE mf.message_id = ?` | `SELECT f.* FROM files f JOIN message_files mf ON f.id = mf.file_id WHERE mf.message_id = ? AND f.deleted_at IS NULL` |

**合計修正箇所: 12箇所**

---

## 3. DELETE文の修正（論理削除への変更）

### 3.1 ChatManager.php - メッセージ削除

**3.1.1 `deleteMessage()` メソッド (215-227行目)**

**現在のコード:**
```php
public function deleteMessage($messageId) {
    // First delete all child messages recursively
    $deletedChildCount = $this->deleteChildMessages($messageId);

    // Then delete the specified message itself
    $sql = "DELETE FROM messages WHERE id = ?";
    $this->db->query($sql, [$messageId]);

    $this->logger->info('Message and children deleted', [
        'message_id' => $messageId,
        'child_count' => $deletedChildCount
    ]);
}
```

**修正後:**
```php
public function deleteMessage($messageId) {
    // First delete all child messages recursively (logical delete)
    $deletedChildCount = $this->deleteChildMessages($messageId);

    // Then logically delete the specified message itself
    $sql = "UPDATE messages SET deleted_at = datetime('now','localtime') WHERE id = ?";
    $this->db->query($sql, [$messageId]);

    $this->logger->info('Message and children logically deleted', [
        'message_id' => $messageId,
        'child_count' => $deletedChildCount
    ]);
}
```

**3.1.2 `deleteChildMessages()` メソッド (229-246行目)**

**現在のコード:**
```php
public function deleteChildMessages($messageId) {
    // Get all child messages recursively
    $childIds = $this->getChildMessageIds($messageId);

    if (!empty($childIds)) {
        $placeholders = str_repeat('?,', count($childIds) - 1) . '?';
        $sql = "DELETE FROM messages WHERE id IN ($placeholders)";
        $this->db->query($sql, $childIds);

        $this->logger->info('Child messages deleted', [
            'parent_message_id' => $messageId,
            'deleted_count' => count($childIds),
            'deleted_ids' => $childIds
        ]);
    }

    return count($childIds);
}
```

**修正後:**
```php
public function deleteChildMessages($messageId) {
    // Get all child messages recursively
    $childIds = $this->getChildMessageIds($messageId);

    if (!empty($childIds)) {
        $placeholders = str_repeat('?,', count($childIds) - 1) . '?';
        $sql = "UPDATE messages SET deleted_at = datetime('now','localtime') WHERE id IN ($placeholders)";
        $this->db->query($sql, $childIds);

        $this->logger->info('Child messages logically deleted', [
            'parent_message_id' => $messageId,
            'deleted_count' => count($childIds),
            'deleted_ids' => $childIds
        ]);
    }

    return count($childIds);
}
```

**3.1.3 `getChildMessageIds()` メソッド (248-258行目)**

**重要:** このメソッドは削除対象の子メッセージを取得するため、**論理削除済みメッセージも含める必要がある**

**現在のコード:**
```php
private function getChildMessageIds($messageId, &$childIds = []) {
    $sql = "SELECT id FROM messages WHERE parent_message_id = ?";
    $children = $this->db->fetchAll($sql, [$messageId]);

    foreach ($children as $child) {
        $childIds[] = $child['id'];
        // Recursively get grandchildren
        $this->getChildMessageIds($child['id'], $childIds);
    }

    return $childIds;
}
```

**修正後:**
```php
private function getChildMessageIds($messageId, &$childIds = []) {
    // 削除対象を取得するため、deleted_atの条件は付けない
    // （既に論理削除されたメッセージの子も含める）
    $sql = "SELECT id FROM messages WHERE parent_message_id = ?";
    $children = $this->db->fetchAll($sql, [$messageId]);

    foreach ($children as $child) {
        $childIds[] = $child['id'];
        // Recursively get grandchildren
        $this->getChildMessageIds($child['id'], $childIds);
    }

    return $childIds;
}
```

**注意:** このメソッドは削除専用なので、deleted_at条件を付けない

### 3.2 ChatManager.php - スレッド削除

**3.2.1 `deleteThread()` メソッド (39-44行目)**

**現在のコード:**
```php
public function deleteThread($threadId) {
    $sql = "DELETE FROM threads WHERE id = ?";
    $this->db->query($sql, [$threadId]);

    $this->logger->info('Thread physically deleted', ['thread_id' => $threadId]);
}
```

**修正後:**
```php
public function deleteThread($threadId) {
    // 1. スレッドに紐づく全メッセージを論理削除
    $sql = "UPDATE messages SET deleted_at = datetime('now','localtime')
            WHERE thread_id = ? AND deleted_at IS NULL";
    $this->db->query($sql, [$threadId]);

    // 2. スレッド自体を論理削除
    $sql = "UPDATE threads SET deleted_at = datetime('now','localtime') WHERE id = ?";
    $this->db->query($sql, [$threadId]);

    $this->logger->info('Thread and its messages logically deleted', ['thread_id' => $threadId]);
}
```

**重要:** スレッド削除時は、ON DELETE CASCADEの代わりに手動でメッセージも削除する

### 3.3 FileManager.php - ファイル削除

**3.3.1 `deleteFile()` メソッド (470-500行目)**

**現在のコード:**
```php
public function deleteFile($fileId) {
    // Validate file ID
    if (!$fileId || !is_numeric($fileId)) {
        throw new Exception('Invalid file ID');
    }

    $file = $this->getFile($fileId);
    if (!$file) {
        throw new Exception('File not found');
    }

    try {
        // Delete related records first (message_files)
        $sql = "DELETE FROM message_files WHERE file_id = ?";
        $this->db->query($sql, [$fileId]);

        // Delete the file record
        $sql = "DELETE FROM files WHERE id = ?";
        $result = $this->db->query($sql, [$fileId]);

        if ($result === false) {
            throw new Exception('Database deletion failed');
        }

        $this->logger->info('File record deleted', [
            'file_id' => $fileId,
            'original_name' => $file['original_name']
        ]);

    } catch (Exception $e) {
        $this->logger->error('File deletion error', [
            'file_id' => $fileId,
            'error' => $e->getMessage()
        ]);
        throw new Exception('Failed to delete file: ' . $e->getMessage());
    }
}
```

**修正後:**
```php
public function deleteFile($fileId) {
    // Validate file ID
    if (!$fileId || !is_numeric($fileId)) {
        throw new Exception('Invalid file ID');
    }

    $file = $this->getFile($fileId);
    if (!$file) {
        throw new Exception('File not found');
    }

    try {
        // message_filesは中間テーブルなので物理削除のまま維持
        // （ON DELETE CASCADEで自動削除されるため、手動削除は不要）
        // ただし、念のため手動削除も残す
        $sql = "DELETE FROM message_files WHERE file_id = ?";
        $this->db->query($sql, [$fileId]);

        // Logically delete the file record
        $sql = "UPDATE files SET deleted_at = datetime('now','localtime') WHERE id = ?";
        $result = $this->db->query($sql, [$fileId]);

        if ($result === false) {
            throw new Exception('Database update failed');
        }

        $this->logger->info('File record logically deleted', [
            'file_id' => $fileId,
            'original_name' => $file['original_name']
        ]);

    } catch (Exception $e) {
        $this->logger->error('File deletion error', [
            'file_id' => $fileId,
            'error' => $e->getMessage()
        ]);
        throw new Exception('Failed to delete file: ' . $e->getMessage());
    }
}
```

---

## 4. 追加で必要な対応

### 4.1 メッセージ編集時の子メッセージ削除

**対象:** `api/chat.php` (241-242行目)

**現在のコード:**
```php
// Delete all child messages (AI responses)
$deletedCount = $chatManager->deleteChildMessages($messageId);
```

**対応:** 既に `deleteChildMessages()` が論理削除に変更されているため、追加変更不要

### 4.2 孤立メッセージの防止

**問題:**
- 論理削除されたメッセージの子メッセージは孤立する可能性がある
- ツリー構築時に表示されなくなる

**対応方針:**
1. 削除時に必ず子メッセージも削除する（既に実装済み）
2. ツリー構築時に孤立メッセージをチェックして警告ログを出力（オプション）

### 4.3 論理削除されたデータの物理削除

**今後の課題:**
- 論理削除されたデータを定期的に物理削除するバッチ処理の実装
- 削除から一定期間経過したデータを完全削除

**実装例（将来的に追加）:**
```php
// 30日以上前に論理削除されたデータを物理削除
public function purgeOldDeletedRecords($days = 30) {
    $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$days} days"));

    // Messages
    $sql = "DELETE FROM messages WHERE deleted_at IS NOT NULL AND deleted_at < ?";
    $this->db->query($sql, [$cutoffDate]);

    // Threads
    $sql = "DELETE FROM threads WHERE deleted_at IS NOT NULL AND deleted_at < ?";
    $this->db->query($sql, [$cutoffDate]);

    // Files
    $sql = "DELETE FROM files WHERE deleted_at IS NOT NULL AND deleted_at < ?";
    $this->db->query($sql, [$cutoffDate]);
}
```

---

## 5. テスト項目

### 5.1 メッセージ削除テスト

- [ ] ユーザーメッセージを削除 → 子AIメッセージも論理削除される
- [ ] 親メッセージを削除 → 孫メッセージも含めて全て論理削除される
- [ ] 削除後、ツリー表示で表示されないことを確認
- [ ] 削除後、メッセージ一覧で表示されないことを確認
- [ ] `deleted_at`カラムが正しく設定されることを確認

### 5.2 スレッド削除テスト

- [ ] スレッド削除 → 全メッセージが論理削除される
- [ ] スレッド一覧で表示されないことを確認
- [ ] 削除されたスレッドのメッセージが取得できないことを確認

### 5.3 ファイル削除テスト

- [ ] ファイル削除 → 論理削除される
- [ ] ファイル一覧で表示されないことを確認
- [ ] message_filesの関連レコードが削除されることを確認

### 5.4 メッセージ編集テスト

- [ ] メッセージ編集 → 子メッセージが論理削除される
- [ ] 新しいAIレスポンスが生成される

### 5.5 ツリー構造の整合性テスト

- [ ] 複雑なツリー構造で削除 → 孤立メッセージが発生しない
- [ ] 削除後もツリーが正しく表示される

---

## 6. 実装優先順位

### Phase 1: 基礎的な修正（必須）
1. ✅ ChatManager.php - SELECTクエリ修正（6箇所）
2. ✅ FileManager.php - SELECTクエリ修正（6箇所）
3. ✅ ChatManager.php - DELETE → UPDATE変更（メッセージ削除）
4. ✅ ChatManager.php - DELETE → UPDATE変更（スレッド削除）
5. ✅ FileManager.php - DELETE → UPDATE変更（ファイル削除）

### Phase 2: カスケード削除の手動実装（必須）
6. ✅ スレッド削除時のメッセージ一括削除
7. ✅ 子メッセージの再帰削除ロジック

### Phase 3: テスト（必須）
8. ⬜ 全ユースケースのテスト実施

### Phase 4: 将来的な対応（オプション）
9. ⬜ 論理削除データの物理削除バッチ処理
10. ⬜ 削除データの復元機能

---

## 7. チェックリスト

### 7.1 コード修正

- [ ] `ChatManager.php` - `getThread()` にdeleted_at条件追加
- [ ] `ChatManager.php` - `getThreadSystemPrompt()` にdeleted_at条件追加
- [ ] `ChatManager.php` - `getMessage()` にdeleted_at条件追加
- [ ] `ChatManager.php` - `getMessages()` にdeleted_at条件追加
- [ ] `ChatManager.php` - `getMessageChildren()` にdeleted_at条件追加
- [ ] `ChatManager.php` - `getChildMessageIds()` を削除専用として維持
- [ ] `ChatManager.php` - `deleteMessage()` をUPDATEに変更
- [ ] `ChatManager.php` - `deleteChildMessages()` をUPDATEに変更
- [ ] `ChatManager.php` - `deleteThread()` をUPDATEに変更＋メッセージ削除追加
- [ ] `FileManager.php` - `getFile()` にdeleted_at条件追加
- [ ] `FileManager.php` - `getFiles()` (no limit) にdeleted_at条件追加
- [ ] `FileManager.php` - `getFiles()` (with limit) にdeleted_at条件追加
- [ ] `FileManager.php` - `searchFiles()` (no limit) にdeleted_at条件追加
- [ ] `FileManager.php` - `searchFiles()` (with limit) にdeleted_at条件追加
- [ ] `FileManager.php` - `getMessageFiles()` にdeleted_at条件追加
- [ ] `FileManager.php` - `deleteFile()` をUPDATEに変更

### 7.2 テスト実施

- [ ] メッセージ削除テスト（5項目）
- [ ] スレッド削除テスト（3項目）
- [ ] ファイル削除テスト（3項目）
- [ ] メッセージ編集テスト（2項目）
- [ ] ツリー構造整合性テスト（2項目）

### 7.3 動作確認

- [ ] ブラウザで実際にメッセージ削除を実行
- [ ] ブラウザで実際にスレッド削除を実行
- [ ] ブラウザで実際にファイル削除を実行
- [ ] データベースで`deleted_at`カラムを確認

---

## 8. 注意事項

1. **バックアップ必須**: 実装前に必ずデータベースをバックアップする
2. **段階的実装**: Phase 1から順番に実装し、各Phaseごとにテストする
3. **ロールバック計画**: 問題が発生した場合の元に戻す手順を準備する
4. **パフォーマンス**: `deleted_at IS NULL` 条件によるクエリ性能への影響を監視
5. **インデックス**: 必要に応じて `deleted_at` カラムにインデックスを追加

---

## 9. 実装後の確認事項

- [ ] すべてのSELECTクエリに`deleted_at IS NULL`条件が追加されている
- [ ] すべてのDELETE文がUPDATE文に変更されている
- [ ] カスケード削除が正しく手動実装されている
- [ ] ツリー構造が正しく表示される
- [ ] 孤立メッセージが発生しない
- [ ] 論理削除されたデータがUI上で表示されない
- [ ] パフォーマンスに問題がない

---

## 10. リスク評価

| リスク | 発生確率 | 影響度 | 対策 |
|--------|---------|--------|------|
| ツリー構造の破損 | 中 | 高 | 十分なテストを実施 |
| 孤立メッセージの発生 | 低 | 中 | カスケード削除を確実に実装 |
| パフォーマンス低下 | 低 | 中 | インデックス追加、クエリ最適化 |
| データ不整合 | 低 | 高 | トランザクション処理、ロールバック準備 |

---

**最終更新:** 2025-01-09
**作成者:** Claude Code
