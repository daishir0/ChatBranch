# ChatBranch

## Overview
ChatBranch is a web-based AI chat application that organizes conversations as trees. It focuses on clear navigation, precise branching, and practical collaboration features.

Highlights
- Conversation trees with user/assistant messages and branching
- Three-dots action menus for messages and threads (clean UI)
- Deep links (permalinks) to start from any point, including root-start links
- Thread-specific persona (system prompt) per conversation thread
- File attachments as additional context for AI responses
- Token usage summary (cumulative) on assistant nodes
- Rich rendering (Markdown, code highlight, KaTeX, Mermaid)
- Mobile-optimized UX, real-time thread search, dark/light theme

![setting persona](assets/setting_persona.png)
![www](assets/www.png)

## Installation

### Prerequisites
- PHP 7.4+ (PHP 8+ recommended)
- Apache/Nginx
- PDO SQLite, cURL, JSON PHP extensions
- Composer (for document parsing libraries)
- Write permission to the app directory

### Step-by-step
1) Clone and place under your web root
```bash
git clone https://github.com/daishir0/ChatBranch.git
sudo cp -r ChatBranch /var/www/html/ChatBranch
cd /var/www/html/ChatBranch
```
2) Install libraries (optional but recommended for Office/PDF parsing)
```bash
php composer.phar install || (curl -sS https://getcomposer.org/installer | php && php composer.phar install)
```
3) Set ownership/permission (adjust user/group for your server)
```bash
sudo chown -R apache:apache /var/www/html/ChatBranch  # CentOS/RHEL/Amazon Linux
# or
sudo chown -R www-data:www-data /var/www/html/ChatBranch  # Ubuntu/Debian
sudo chmod 755 /var/www/html/ChatBranch
```
4) Open the app in a browser
- Navigate to `http://your-domain/ChatBranch/` and follow the setup wizard
- Enter Basic Auth credentials and your OpenAI API key
- After installation, delete `setup.php` for security

Configuration tips: `config.php` includes `auth` (Basic Auth), `openai.api_key`, `system.base_url`, and `system.timezone`.

## Usage

### Starting a new chat
- Click “New Chat” and send your first message
- Keyboard: Enter=send (PC), Shift+Enter=new line; on mobile, Enter inserts a new line

### New Tree Mode (root-start in existing thread)
- Click 🆕 to enter New Tree mode; your next send creates a root-level user message (no parent)
- The placeholder panel also provides “Copy root-start link”

### Threads (left sidebar)
- Search in real time; toggle archive view
- Each thread row has a three-dots menu:
  - ✏️ Edit name
  - 📦 Archive / 📤 Unarchive
  - 🗑️ Delete

### Messages (three-dots menu)
- User message actions:
  - 📋 Copy
  - 🔗 Copy permalink (deep link to this message)
  - ✏️ Edit (regenerates the child AI response)
  - 🌿 Branch (creates an alternative user message at the same parent = sibling branch)
  - 🗑️ Delete (removes the message and all descendants)
- Assistant message actions:
  - 📋 Copy

### Deep links (permalinks)
- Message permalink (user messages only): `?thread=<threadId>&message=<messageId>`
  - Copy from the message menu (🔗 Copy permalink)
  - On open: the app opens the thread and displays the path to that message; your next send continues from the end of the displayed path
- Root-start link: `?thread=<threadId>&start=root`
  - Copy in New Tree mode (🔗 Copy root-start link)
  - On open: the app enters New Tree mode in the target thread and the next send creates a root message (parent_message_id=null)
- Authentication: if Basic Auth prompts, the browser retries the same URL after auth, so deep-link intent is preserved

### Files
- Attach files via 📎; supported formats include PDF/Office/text
- Attached content is injected into the AI context as additional user messages

### Tree view and rendering
- 🌳 toggles the tree panel (vis-network)
- Markdown, code highlight, KaTeX, and Mermaid are supported

### Token usage
- Assistant nodes show cumulative token usage along the path

### Internationalization
- English and Japanese are included; add more under `lang/`

### Troubleshooting
- Ensure PHP extensions (PDO SQLite, cURL, JSON) are enabled
- Check directory permissions and server user
- Remove `setup.php` after installation

## Publication
ChatBranch — The AI Conversation Platform that Changes How We Think (Ready Tensor)
- URL: https://app.readytensor.ai/publications/chatbranch-the-ai-conversation-platform-that-changes-how-we-think-HFKsqg1ERUig
- Key takeaways:
  - Parallel exploration with branching/sub-branching (e.g., Strategy, Risk, Financial) keeps context while diverging lines of inquiry
  - Visual conversation trees help teams see the full decision landscape and maintain shared understanding
  - Robust relational design (threads/messages/parents) preserves structure for analysis and review; cumulative token usage informs cost/length
  - Practical workflows: sibling branching from any user message; root-start links to begin fresh paths in the same thread
  - Business value: reduces context switching and meetings, increases traceability, speeds up consensus and strategic decisions

## License
MIT

---

# ChatBranch（日本語）

## 概要
ChatBranch は、会話をツリーで管理する Web ベースの AI チャットです。分岐のしやすさ、ナビゲーション性、実用的な連携機能に重点を置いています。

主なポイント
- 会話ツリーと分岐（ユーザー/AI メッセージ）
- 三点メニューでメッセージ/スレッド操作を集約
- 任意位置から開始できるパーマリンク（ルート開始リンク含む）
- スレッドごとのペルソナ（thread system prompt）
- ファイル添付は AI の文脈として利用
- AI ノードに累積トークン使用量を表示
- Markdown/コード/KaTeX/Mermaid 対応
- モバイル最適化、リアルタイム検索、ダーク/ライトテーマ

## インストール

### 前提
- PHP 7.4+（PHP 8+ 推奨）
- Apache/Nginx
- PDO SQLite / cURL / JSON 拡張
- Composer（ドキュメント解析用）
- アプリディレクトリへの書き込み権限

### 手順
1) 配置
```bash
git clone https://github.com/daishir0/ChatBranch.git
sudo cp -r ChatBranch /var/www/html/ChatBranch
cd /var/www/html/ChatBranch
```
2) 依存インストール（推奨）
```bash
php composer.phar install || (curl -sS https://getcomposer.org/installer | php && php composer.phar install)
```
3) 権限
```bash
sudo chown -R apache:apache /var/www/html/ChatBranch  # CentOS/RHEL/Amazon Linux
# または
sudo chown -R www-data:www-data /var/www/html/ChatBranch  # Ubuntu/Debian
sudo chmod 755 /var/www/html/ChatBranch
```
4) ブラウザでアクセス
- `http://your-domain/ChatBranch/` → セットアップウィザード
- Basic 認証と OpenAI API キーを設定
- セットアップ後は `setup.php` を必ず削除

`config.php` の主な設定: `auth`（Basic 認証）, `openai.api_key`, `system.base_url`, `system.timezone`。

## 使い方

### 新規チャット
- 「New Chat」から送信
- キーボード: PC は Enter＝送信 / Shift+Enter＝改行、モバイルは Enter＝改行

### 新規ツリーモード（既存スレッドのルート開始）
- 🆕 で New Tree モードに入り、次の送信で親なしのルートユーザーメッセージを作成
- プレースホルダーに「ルートから開始リンクをコピー」を表示

### スレッド（左）
- リアルタイム検索、アーカイブ表示切替
- 行の三点メニュー:
  - ✏️ 名前編集
  - 📦 アーカイブ / 📤 解除
  - 🗑️ 削除

### メッセージ（三点メニュー）
- ユーザーメッセージ:
  - 📋 コピー
  - 🔗 パーマリンクをコピー（このメッセージへのリンク）
  - ✏️ 編集（子の AI 応答を再生成）
  - 🌿 分岐（同じ親を持つ別案＝兄弟分岐を作成）
  - 🗑️ 削除（配下ごと削除）
- AI メッセージ:
  - 📋 コピー

### パーマリンク（Deep Link）
- メッセージ: `?thread=<threadId>&message=<messageId>`
  - ユーザーメッセージのメニューからコピー
  - 開くとそのメッセージまでのパスを表示。以後の送信は表示中パスの末尾から継続
- ルート開始: `?thread=<threadId>&start=root`
  - New Tree モードでコピー
  - 開くと新規ツリーモードで親なし投稿開始（parent_message_id=null）
- 認証: Basic 認証後も同じ URL で再リクエストされるため、リンクの意図は保持されます

### ファイル
- 📎 で添付。PDF/Office/テキスト等に対応
- 添付の内容は AI への追加ユーザーメッセージとして文脈に注入

### ツリー/表示
- 🌳 でツリー表示（vis-network）
- Markdown/コード/数式/図に対応

### トークン
- AI ノードにその経路の累積トークン使用量を表示

### 国際化
- 英語/日本語を同梱。`lang/` に追加可能

### トラブルシューティング
- PHP 拡張（PDO SQLite, cURL, JSON）を有効化
- ディレクトリ権限/サーバーユーザーを確認
- セットアップ後に `setup.php` を削除

## 技術記事（Publication）
ChatBranch — The AI Conversation Platform that Changes How We Think（Ready Tensor）
- URL: https://app.readytensor.ai/publications/chatbranch-the-ai-conversation-platform-that-changes-how-we-think-HFKsqg1ERUig
- 要点:
  - 分岐／サブ分岐により、戦略・リスク・財務など複数観点を並行検討しつつ文脈を保持
  - 会話ツリーの可視化で、意思決定の全体像を共有・整理しやすい
  - スレッド／メッセージ／親子関係の堅牢なデータ設計により、構造化された記録と分析が可能（累積トークン情報も有用）
  - 実務フロー: 任意のユーザーメッセージから兄弟分岐、同一スレッドのルート開始リンクで新規パスを開始
  - ビジネス価値: 文脈切替や会議回数を削減し、トレーサビリティを高め、合意形成と戦略決定を加速

## ライセンス
MIT
