# ChotGPT2

## Overview
ChotGPT2 is an advanced ChatGPT clone system with sophisticated conversation tree functionality. It provides a web-based chat interface with branching conversations, message editing, file management, and AI model switching capabilities. The system features an intuitive tree visualization for conversation branches and supports multiple file formats for context-aware conversations.

![chotgpt2](assets/chotgpt2.png)

## Installation

### Prerequisites
- PHP 7.4 or higher
- Web server (Apache/Nginx)
- PDO SQLite extension
- cURL extension  
- JSON extension
- Write permissions for directories

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/daishir0/ChotGPT2.git
   cd ChotGPT2
   ```

2. **Set up on your web server**
   ```bash
   # Copy to your web server directory
   sudo cp -r . /var/www/html/chotgpt2/
   cd /var/www/html/chotgpt2/
   ```

3. **Set permissions**
   ```bash
   sudo chmod 755 /var/www/html/chotgpt2/
   sudo chown -R www-data:www-data /var/www/html/chotgpt2/
   ```

4. **Access the web setup**
   - Open your browser and navigate to: `http://your-domain.com/chotgpt2/`
   - The setup wizard will automatically appear

![install](assets/install.png)


5. **Complete the web setup**
   - Enter administrator username and password
   - Input your OpenAI API key (get one from [OpenAI API Keys](https://platform.openai.com/api-keys))
   - Set base URL (optional, e.g., `/chotgpt2`)
   - Click "Install"

6. **Security cleanup**
   - After successful setup, delete `setup.php` for security:
   ```bash
   rm setup.php
   ```

## Usage

### Starting a New Chat
1. Click the "New Chat" button
2. Type your message and press Enter or click Send
3. The AI will respond based on your selected model

### File Attachments
1. Click the 📎 attachment button or "Files" button
2. Upload files (PDF, Word, Excel, PowerPoint, Text, Markdown)
3. Files are automatically processed and converted to searchable content
4. Send messages with file context

### Conversation Tree Navigation
1. Click the 🌳 "Tree View" button to visualize conversation branches
2. Click on any node to navigate to that specific conversation point
3. Edit messages to create new conversation branches
4. Use tree navigation to explore different conversation paths

### Message Actions
- **Edit**: Hover over any message and click ✏️ to edit and create a branch
- **Branch**: Click 🌿 to create a new branch from that point
- **Delete**: Click 🗑️ to remove a message and its branches

### Settings Configuration
- Click ⚙️ "Settings" to access configuration
- Switch between AI models (GPT-4o Mini, GPT-4, etc.)
- Adjust system prompts
- Configure context compression settings
- Change themes

### File Management
- View all uploaded files in the Files section
- Search through file contents
- Delete unnecessary files
- Files are automatically processed for AI context

## Notes

### Security Considerations
- **Always delete setup.php after installation** for security
- Keep your OpenAI API key secure and don't share it
- Regularly backup your database files
- Monitor log files for suspicious activity

### Performance Tips
- Large files may take time to process
- Context compression helps with long conversations
- Regular cleanup of old conversations improves performance
- Monitor disk usage for uploaded files

### Troubleshooting
- If setup fails, check PHP extensions and permissions
- For database errors, verify SQLite support
- If files don't upload, check file size limits and permissions
- Clear browser cache if interface doesn't load properly

### Technical Requirements
- Minimum PHP 7.4 (PHP 8+ recommended)
- At least 256MB RAM for PHP
- 1GB disk space for files and database
- SSL certificate recommended for production use

## License
This project is licensed under the MIT License - see the LICENSE file for details.

---

# ChotGPT2

## 概要
ChotGPT2は、高度な会話ツリー機能を持つChatGPTクローンシステムです。会話の分岐、メッセージ編集、ファイル管理、AIモデル切り替え機能を備えたWebベースのチャットインターフェースを提供します。会話の分岐を視覚化する直感的なツリー表示機能があり、複数のファイル形式をサポートしてコンテキスト対応の会話が可能です。

## インストール方法

### 前提条件
- PHP 7.4以上
- Webサーバー（Apache/Nginx）
- PDO SQLite拡張
- cURL拡張
- JSON拡張
- ディレクトリの書き込み権限

### ステップバイステップのインストール方法

1. **リポジトリをクローン**
   ```bash
   git clone https://github.com/daishir0/ChotGPT2.git
   cd ChotGPT2
   ```

2. **Webサーバーにセットアップ**
   ```bash
   # Webサーバーディレクトリにコピー
   sudo cp -r . /var/www/html/chotgpt2/
   cd /var/www/html/chotgpt2/
   ```

3. **権限設定**
   ```bash
   sudo chmod 755 /var/www/html/chotgpt2/
   sudo chown -R www-data:www-data /var/www/html/chotgpt2/
   ```

4. **Webセットアップにアクセス**
   - ブラウザで `http://your-domain.com/chotgpt2/` にアクセス
   - セットアップウィザードが自動的に表示されます

5. **Webセットアップを完了**
   - 管理者ユーザー名とパスワードを入力
   - OpenAI APIキーを入力（[OpenAI API Keys](https://platform.openai.com/api-keys)から取得）
   - ベースURLを設定（オプション、例：`/chotgpt2`）
   - 「インストール」をクリック

6. **セキュリティクリーンアップ**
   - セットアップ完了後、セキュリティのため`setup.php`を削除：
   ```bash
   rm setup.php
   ```

## 使い方

### 新しいチャットの開始
1. 「新規チャット」ボタンをクリック
2. メッセージを入力してEnterキーまたは送信ボタンをクリック
3. 選択したモデルに基づいてAIが応答します

### ファイル添付
1. 📎添付ボタンまたは「ファイル」ボタンをクリック
2. ファイルをアップロード（PDF、Word、Excel、PowerPoint、テキスト、Markdown）
3. ファイルは自動的に処理され、検索可能なコンテンツに変換されます
4. ファイルコンテキスト付きでメッセージを送信

### 会話ツリーナビゲーション
1. 🌳「ツリー表示」ボタンをクリックして会話の分岐を視覚化
2. 任意のノードをクリックしてその特定の会話ポイントに移動
3. メッセージを編集して新しい会話ブランチを作成
4. ツリーナビゲーションを使用して異なる会話パスを探索

### メッセージアクション
- **編集**: メッセージにマウスオーバーして✏️をクリックして編集・分岐作成
- **分岐**: 🌿をクリックしてそのポイントから新しい分岐を作成
- **削除**: 🗑️をクリックしてメッセージとその分岐を削除

### 設定の構成
- ⚙️「設定」をクリックして設定にアクセス
- AIモデルの切り替え（GPT-4o Mini、GPT-4など）
- システムプロンプトの調整
- コンテキスト圧縮設定の構成
- テーマの変更

### ファイル管理
- ファイルセクションでアップロードされたすべてのファイルを表示
- ファイルコンテンツを検索
- 不要なファイルを削除
- ファイルはAIコンテキスト用に自動処理されます

## 注意点

### セキュリティに関する考慮事項
- **インストール後は必ずsetup.phpを削除してください**
- OpenAI APIキーを安全に保管し、共有しないでください
- データベースファイルを定期的にバックアップしてください
- ログファイルで疑わしい活動を監視してください

### パフォーマンスのヒント
- 大きなファイルは処理に時間がかかる場合があります
- コンテキスト圧縮は長い会話に役立ちます
- 古い会話の定期的なクリーンアップでパフォーマンスが向上します
- アップロードファイルのディスク使用量を監視してください

### トラブルシューティング
- セットアップが失敗する場合は、PHP拡張と権限を確認してください
- データベースエラーの場合は、SQLiteサポートを確認してください
- ファイルがアップロードできない場合は、ファイルサイズ制限と権限を確認してください
- インターフェースが読み込まれない場合は、ブラウザキャッシュをクリアしてください

### 技術要件
- 最低PHP 7.4（PHP 8+推奨）
- PHP用に最低256MB RAM
- ファイルとデータベース用に1GB のディスク容量
- 本番使用にはSSL証明書推奨

## ライセンス
このプロジェクトはMITライセンスの下でライセンスされています。詳細はLICENSEファイルを参照してください。