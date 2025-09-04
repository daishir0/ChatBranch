# ChotGPT2

## Overview
ChotGPT2 is an advanced ChatGPT clone system with sophisticated conversation tree functionality and **revolutionary thread-specific AI personas**. It provides a web-based chat interface with branching conversations, message editing, file management, and AI model switching capabilities. The system features an intuitive tree visualization for conversation branches and supports multiple file formats including **CSV files** for context-aware conversations. Enhanced with **mobile-optimized UX**, **real-time thread search**, **comprehensive Markdown rendering with LaTeX math support**, **complete Mermaid diagram visualization**, and **responsive design** for seamless cross-platform usage.

### 🚀 BREAKTHROUGH INNOVATION: Thread-Specific AI Personas
**ChotGPT2 introduces the world's first thread-specific AI persona system** - a revolutionary feature that no other AI chat application offers:
- **Unique AI personalities per conversation thread** - Create specialized experts, creative writers, technical advisors, or any character you need
- **Context-aware personality switching** - The AI automatically adapts its behavior based on the active thread
- **Persistent persona memory** - Each thread maintains its unique character across sessions
- **Global + thread prompt combination** - Unprecedented flexibility in AI behavior customization

This groundbreaking innovation transforms AI chat from one-size-fits-all to truly personalized, context-aware interactions.

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
   - **PC**: Enter sends message, Shift+Enter creates new line
   - **Mobile**: Enter creates new line, use Send button to send
3. The AI will respond based on your selected model

### Thread Management
1. **Search Threads**: Use the 🔍 search box above the thread list
   - Real-time incremental filtering as you type
   - Case-insensitive search supporting multiple languages
   - Shows search results count (e.g., "5 / 20 threads")
   - Press **Enter** to select first result, **Escape** to clear search
2. **Mobile Optimization**: 
   - Touch-scroll through thread list
   - Single-tap thread selection (no double-tap required)
   - Responsive sidebar with smooth animations

### File Attachments
1. Click the 📎 attachment button or "Files" button
2. Upload files (PDF, Word, Excel, PowerPoint, Text, Markdown, **CSV**)
3. Files are automatically processed and converted to searchable content
   - **CSV files are converted to Markdown tables** for better AI context
4. Send messages with file context

### Rich Content Rendering
1. **Markdown Support**: Full GitHub Flavored Markdown with syntax highlighting
   - Headers, lists, tables, code blocks, links, images
   - Syntax highlighting for 100+ programming languages
   - Responsive table design with horizontal scrolling
2. **Mathematical Equations**: Complete LaTeX rendering with KaTeX
   - Inline math: `$E = mc^2$`
   - Block equations: `$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$`
   - Advanced mathematical notation and symbols
3. **Diagram Visualization**: Full Mermaid.js support for all diagram types
   - **Flowcharts**: Process flows and decision trees
   - **Sequence Diagrams**: System interactions and API flows
   - **Gantt Charts**: Project timelines and scheduling
   - **Pie Charts**: Data distribution and statistics
   - **State Diagrams**: System states and transitions
   - **Class Diagrams**: Object-oriented design visualization
   - **ER Diagrams**: Database relationships and schemas
   - **Git Graphs**: Version control branch visualization

### Conversation Tree Navigation
1. Click the 🌳 "Tree View" button to visualize conversation branches
2. Click on any node to navigate to that specific conversation point
3. Edit messages to create new conversation branches
4. Use tree navigation to explore different conversation paths

### Message Actions
- **Edit**: Hover over any message and click ✏️ to edit and create a branch
- **Branch**: Click 🌿 to create a new branch from that point
- **Delete**: Click 🗑️ to remove a message and its branches
- **Copy**: Click 📋 on AI messages to copy the full text content (preserves formatting)
- **Mobile Touch**: Single tap on messages to show action buttons on mobile devices

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
- If files don't upload, check file size limits and permissions (CSV files up to 10MB supported)
- Clear browser cache if interface doesn't load properly
- **Thread deletion errors**: Ensure sessions are properly initialized
- **Mobile scrolling issues**: Check CSS touch-action and overflow settings
- **Search not working**: Verify JavaScript is enabled and no console errors
- **Markdown not rendering**: Ensure Marked.js and Highlight.js libraries are loaded
- **Math equations not showing**: Verify KaTeX library is properly included
- **Mermaid diagrams not rendering**: Check Mermaid.js library loading and browser console for errors

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
ChotGPT2は、高度な会話ツリー機能と**革新的なスレッド固有AIペルソナ**を持つChatGPTクローンシステムです。会話の分岐、メッセージ編集、ファイル管理、AIモデル切り替え機能を備えたWebベースのチャットインターフェースを提供します。会話の分岐を視覚化する直感的なツリー表示機能があり、**CSVファイル**を含む複数のファイル形式をサポートしてコンテキスト対応の会話が可能です。**モバイル最適化されたUX**、**リアルタイムスレッド検索**、**LaTeX数式対応の包括的Markdownレンダリング**、**完全なMermaid図表可視化**、**レスポンシブデザイン**により、シームレスなクロスプラットフォーム使用を実現しています。

### 🚀 画期的イノベーション：スレッド固有AIペルソナ
**ChotGPT2は世界初のスレッド固有AIペルソナシステムを導入** - 他のAIチャットアプリケーションにはない革新的機能：
- **会話スレッドごとの独自AIパーソナリティ** - 専門家、創作作家、技術顧問など必要なキャラクターを創造
- **コンテキスト対応パーソナリティ切り替え** - アクティブなスレッドに基づいてAIが自動的に行動を適応
- **永続的ペルソナメモリ** - 各スレッドがセッション間で独自のキャラクターを維持
- **グローバル＋スレッドプロンプト組み合わせ** - AI行動カスタマイゼーションの前例のない柔軟性

この画期的なイノベーションは、AIチャットを万能型から真にパーソナライズされたコンテキスト対応のインタラクションに変革します。

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
   - **PC**: Enterでメッセージ送信、Shift+Enterで改行
   - **スマホ**: Enterで改行、送信ボタンでメッセージ送信
3. 選択したモデルに基づいてAIが応答します

### スレッド管理
1. **スレッド検索**: スレッド一覧上の🔍検索ボックスを使用
   - 入力と同時にリアルタイムでインクリメンタルフィルタリング
   - 大文字小文字を区別しない多言語対応検索
   - 検索結果件数を表示（例：「5 / 20 件のスレッド」）
   - **Enter**キーで最初の結果を選択、**Escape**キーで検索をクリア
2. **モバイル最適化**: 
   - スレッド一覧のタッチスクロール対応
   - シングルタップでのスレッド選択（ダブルタップ不要）
   - スムーズなアニメーションのレスポンシブサイドバー

### ファイル添付
1. 📎添付ボタンまたは「ファイル」ボタンをクリック
2. ファイルをアップロード（PDF、Word、Excel、PowerPoint、テキスト、Markdown、**CSV**）
3. ファイルは自動的に処理され、検索可能なコンテンツに変換されます
   - **CSVファイルはMarkdownテーブルに変換**され、AIがより理解しやすい形式になります
4. ファイルコンテキスト付きでメッセージを送信

### リッチコンテンツレンダリング
1. **Markdownサポート**: シンタックスハイライト付きの完全なGitHub Flavored Markdown
   - 見出し、リスト、テーブル、コードブロック、リンク、画像
   - 100以上のプログラミング言語のシンタックスハイライト
   - 水平スクロール対応のレスポンシブテーブルデザイン
2. **数学方程式**: KaTeXによる完全なLaTeXレンダリング
   - インライン数式: `$E = mc^2$`
   - ブロック方程式: `$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$`
   - 高度な数学記号と表記法
3. **図表可視化**: 全図表タイプ対応の完全なMermaid.jsサポート
   - **フローチャート**: プロセスフローと決定木
   - **シーケンス図**: システムインタラクションとAPIフロー
   - **ガントチャート**: プロジェクトタイムラインとスケジューリング
   - **円グラフ**: データ分布と統計
   - **状態遷移図**: システム状態と遷移
   - **クラス図**: オブジェクト指向設計の可視化
   - **ER図**: データベースリレーションシップとスキーマ
   - **Gitグラフ**: バージョン管理ブランチの可視化

### 会話ツリーナビゲーション
1. 🌳「ツリー表示」ボタンをクリックして会話の分岐を視覚化
2. 任意のノードをクリックしてその特定の会話ポイントに移動
3. メッセージを編集して新しい会話ブランチを作成
4. ツリーナビゲーションを使用して異なる会話パスを探索

### メッセージアクション
- **編集**: メッセージにマウスオーバーして✏️をクリックして編集・分岐作成
- **分岐**: 🌿をクリックしてそのポイントから新しい分岐を作成
- **削除**: 🗑️をクリックしてメッセージとその分岐を削除
- **コピー**: AIメッセージの📋をクリックしてフルテキストコンテンツをコピー（フォーマット保持）
- **モバイルタッチ**: モバイルデバイスでメッセージをシングルタップしてアクションボタンを表示

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
- ファイルがアップロードできない場合は、ファイルサイズ制限と権限を確認してください（CSVファイルは最大10MBまでサポート）
- インターフェースが読み込まれない場合は、ブラウザキャッシュをクリアしてください
- **スレッド削除エラー**: セッションが適切に初期化されていることを確認してください
- **モバイルスクロールの問題**: CSSのtouch-actionとoverflowの設定を確認してください
- **検索が動作しない**: JavaScriptが有効になっており、コンソールエラーがないことを確認してください
- **Markdownがレンダリングされない**: Marked.jsとHighlight.jsライブラリが読み込まれていることを確認してください
- **数式が表示されない**: KaTeXライブラリが適切にインクルードされていることを確認してください
- **Mermaid図表がレンダリングされない**: Mermaid.jsライブラリの読み込みとブラウザコンソールのエラーを確認してください

### 技術要件
- 最低PHP 7.4（PHP 8+推奨）
- PHP用に最低256MB RAM
- ファイルとデータベース用に1GB のディスク容量
- 本番使用にはSSL証明書推奨

## ライセンス
このプロジェクトはMITライセンスの下でライセンスされています。詳細はLICENSEファイルを参照してください。