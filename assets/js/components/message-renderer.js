// ChatBranch Message Renderer Component

// Markdown rendering utility class
class MessageRenderer {
    constructor() {
        this.initializeLibraries();
    }
    
    initializeLibraries() {
        if (typeof marked !== 'undefined') {
            // Marked.js設定
            marked.setOptions({
                highlight: (code, lang) => {
                    if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (err) {
                            console.warn('Highlight.js error:', err);
                        }
                    }
                    return hljs ? hljs.highlightAuto(code).value : this.escapeHtml(code);
                },
                breaks: true,
                gfm: true,
                tables: true,
                sanitize: false,
                smartypants: true
            });
        }
        
        // KaTeX初期化確認
        if (typeof katex !== 'undefined') {
            console.log('KaTeX initialized successfully');
        }
        
        // Mermaid初期化
        if (typeof mermaid !== 'undefined') {
            try {
                this.initializeMermaidTheme();
                console.log('Mermaid initialized successfully', {
                    version: mermaid.version || 'unknown',
                    themes: mermaid.theme || 'default'
                });
            } catch (error) {
                console.error('Mermaid initialization error:', error);
            }
        } else {
            console.warn('Mermaid library not found - diagram rendering will be disabled');
        }
    }
    
    async renderMessage(content) {
        if (!content) return '';
        
        try {
            // 数式・図表を含むかどうかもチェック
            if (this.isMarkdownContent(content) || this.hasMathContent(content) || this.hasMermaidContent(content)) {
                let html;
                
                // Mermaidの前処理（数式より先に処理）
                content = await this.preprocessMermaid(content);
                
                // 数式の前処理
                content = this.preprocessMath(content);
                
                // Markdownレンダリング
                html = marked ? marked.parse(content) : this.escapeHtml(content);
                
                // テーブルをレスポンシブ対応に変換
                html = this.makeTablesResponsive(html);
                
                const finalHtml = `<div class="markdown-content">${html}</div>`;
                
                // Markdownコンテンツのレンダリング完了
                
                // Mermaidの後処理（DOMに追加後に実行）
                // より確実なタイミングで実行するため遅延を長くする
                setTimeout(() => {
                    console.log('Starting Mermaid processing with delay...');
                    this.processMermaidDiagrams();
                }, 200);
                
                // さらなる保険として追加の遅延処理も実行
                setTimeout(() => {
                    console.log('Additional Mermaid processing attempt...');
                    this.processMermaidDiagrams();
                }, 500);
                
                return finalHtml;
            } else {
                // 通常のテキストとして処理
                return this.escapeHtml(content).replace(/\n/g, '<br>');
            }
        } catch (error) {
            console.warn('Markdown rendering error:', error);
            return this.escapeHtml(content).replace(/\n/g, '<br>');
        }
    }
    
    makeTablesResponsive(html) {
        // テーブルをラッパーで囲む
        return html.replace(/<table([^>]*)>/g, '<div class="table-wrapper"><table$1>').replace(/<\/table>/g, '</table></div>');
    }
    
    
    hasMathContent(content) {
        const mathPatterns = [
            /\$\$[\s\S]*?\$\$/,     // ブロック数式 $$...$$
            /\$[^$\n]*\$/,          // インライン数式 $...$
            /\\\[[\s\S]*?\\\]/,     // LaTeX ブロック数式 \[...\]
            /\\\([\s\S]*?\\\)/,     // LaTeX インライン数式 \(...\)
            /\[[\s\S]*?\]/          // 簡略ブロック数式 [...]（AIがよく使う）
        ];
        
        return mathPatterns.some(pattern => pattern.test(content));
    }
    
    hasMermaidContent(content) {
        const mermaidPatterns = [
            /```mermaid[\s\S]*?```/i,       // コードブロック内のmermaid
            /```graph[\s\S]*?```/i,        // graph記法
            /```flowchart[\s\S]*?```/i,    // flowchart記法
            /```sequence[\s\S]*?```/i,     // sequence記法
            /```gantt[\s\S]*?```/i,        // gantt記法
            /```pie[\s\S]*?```/i,          // pie記法
            /```mindmap[\s\S]*?```/i,      // mindmap記法
            /```stateDiagram[\s\S]*?```/i, // stateDiagram記法
            /```stateDiagram-v2[\s\S]*?```/i, // stateDiagram-v2記法
            /```state[\s\S]*?```/i,        // state記法（短縮形）
            /```journey[\s\S]*?```/i,      // journey記法
            /```gitgraph[\s\S]*?```/i,     // gitgraph記法
            /```classDiagram[\s\S]*?```/i, // classDiagram記法
            /```erDiagram[\s\S]*?```/i,    // erDiagram記法
            /```class[\s\S]*?```/i,        // class記法（短縮形）
            /```er[\s\S]*?```/i            // er記法（短縮形）
        ];
        
        return mermaidPatterns.some(pattern => pattern.test(content));
    }
    
    initializeMermaidTheme() {
        const isDark = document.body.classList.contains('dark-theme');
        
        const mermaidConfig = {
            startOnLoad: false,
            securityLevel: 'loose',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            theme: isDark ? 'dark' : 'default',
            // State Diagram特有の設定
            state: {
                primaryColor: isDark ? '#4a9eff' : '#4a9eff',
                primaryTextColor: isDark ? '#ffffff' : '#1f2937',
                primaryBorderColor: isDark ? '#6b7280' : '#d1d5db',
                lineColor: isDark ? '#9ca3af' : '#6b7280',
                secondaryColor: isDark ? '#374151' : '#f3f4f6',
                tertiaryColor: isDark ? '#1f2937' : '#ffffff',
                background: isDark ? '#111827' : '#ffffff',
                transitionColor: isDark ? '#9ca3af' : '#6b7280',
                transitionLabelColor: isDark ? '#ffffff' : '#1f2937',
                stateLabelColor: isDark ? '#ffffff' : '#1f2937',
                stateBkg: isDark ? '#374151' : '#f9fafb',
                labelBoxBkgColor: isDark ? '#1f2937' : '#ffffff',
                labelBoxBorderColor: isDark ? '#6b7280' : '#d1d5db',
                labelTextColor: isDark ? '#ffffff' : '#1f2937'
            },
            themeVariables: isDark ? {
                // ダークモード用カスタムカラー
                primaryColor: '#4a9eff',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#6b7280',
                lineColor: '#9ca3af',
                secondaryColor: '#374151',
                tertiaryColor: '#1f2937',
                background: '#111827',
                mainBkg: '#1f2937',
                secondBkg: '#374151',
                tertiaryBkg: '#4b5563',
                // State Diagram専用変数
                cScale0: '#4a9eff',
                cScale1: '#374151',
                cScale2: '#1f2937',
                stateLabelColor: '#ffffff',
                stateBkg: '#374151',
                labelBoxBkgColor: '#1f2937',
                labelBoxBorderColor: '#6b7280',
                labelTextColor: '#ffffff'
            } : {
                // ライトモード用カスタムカラー
                primaryColor: '#4a9eff',
                primaryTextColor: '#1f2937',
                primaryBorderColor: '#d1d5db',
                lineColor: '#6b7280',
                secondaryColor: '#f3f4f6',
                tertiaryColor: '#ffffff',
                background: '#ffffff',
                mainBkg: '#ffffff',
                secondBkg: '#f9fafb',
                tertiaryBkg: '#f3f4f6',
                // State Diagram専用変数
                cScale0: '#4a9eff',
                cScale1: '#f3f4f6',
                cScale2: '#ffffff',
                stateLabelColor: '#1f2937',
                stateBkg: '#f9fafb',
                labelBoxBkgColor: '#ffffff',
                labelBoxBorderColor: '#d1d5db',
                labelTextColor: '#1f2937'
            }
        };
        
        mermaid.initialize(mermaidConfig);
    }
    
    async preprocessMermaid(content) {
        if (typeof mermaid === 'undefined') {
            console.warn('Mermaid not available');
            return content;
        }
        
        try {
            // Mermaidコードブロックをプレースホルダーに置換
            let diagramCount = 0;
            content = content.replace(/```(mermaid|graph|flowchart|sequence|gantt|pie|mindmap|stateDiagram|stateDiagram-v2|state|journey|gitgraph|classDiagram|erDiagram|class|er)\n([\s\S]*?)```/gi, (match, type, diagramCode) => {
                const diagramId = `mermaid-diagram-${Date.now()}-${diagramCount++}`;
                
                // diagramCodeから不要なエンコーディングをクリーンアップ
                const cleanDiagramCode = this.cleanDiagramCode(diagramCode.trim());
                
                console.log('Preprocessing Mermaid diagram:', {
                    type,
                    id: diagramId,
                    originalCode: diagramCode.substring(0, 100) + '...',
                    cleanedCode: cleanDiagramCode.substring(0, 100) + '...'
                });
                
                // プレースホルダーを作成（後でSVGに置換される）
                // data-diagram属性にはBase64エンコードを使用してHTML干渉を回避
                try {
                    const encodedCode = btoa(unescape(encodeURIComponent(cleanDiagramCode)));
                    const expandTitle = (window.appConfig && window.appConfig.diagramTranslations) 
                        ? window.appConfig.diagramTranslations.expand 
                        : '図表を新しいウィンドウで拡大表示';
                    return `<div class="mermaid-container">
                        <div class="mermaid" id="${diagramId}" data-diagram-b64="${encodedCode}" data-diagram-type="${type}">
                            <!-- Diagram will be rendered here -->
                        </div>
                        <button class="expand-btn" onclick="window.diagramExpander.openDiagramFromButton(this)" title="${expandTitle}">🔍</button>
                    </div>`;
                } catch (encodeError) {
                    console.error('Failed to encode diagram:', encodeError);
                    return `<div class="mermaid-container">
                        <div class="mermaid-error">
                            <strong>図表エンコーディングエラー:</strong><br>
                            <code>${this.escapeHtml(encodeError.message)}</code>
                        </div>
                    </div>`;
                }
            });
            
            return content;
        } catch (error) {
            console.warn('Mermaid preprocessing error:', error);
            return content;
        }
    }
    
    cleanDiagramCode(code) {
        // HTMLエンティティのデコード
        let cleanedCode = code
            .replace(/&amp;gt;/g, '>')
            .replace(/&gt;/g, '>')
            .replace(/&amp;lt;/g, '<')
            .replace(/&lt;/g, '<')
            .replace(/&amp;amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');

        // Mermaid構文の問題となる文字列を修正
        cleanedCode = cleanedCode
            // 改行文字を実際の改行に変換（Mermaid構文を維持）
            .replace(/\\n/g, '\n')
            // <br/>を改行に変換
            .replace(/<br\/?>/g, '\n')
            // ノードラベル内の特殊文字をエスケープ
            .replace(/\[([^\]]*?)\(([^\)]*?)\)([^\]]*?)\]/g, '[$1-$2-$3]')
            // 括弧を安全な文字に置換
            .replace(/\[([^\]]*?)\(/g, '[$1 - ')
            .replace(/\)([^\]]*?)\]/g, ' - $1]');

        // 行を分割して処理
        let lines = cleanedCode.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // mindmap特有の処理
        if (lines.length > 0 && lines[0].toLowerCase() === 'mindmap') {
            lines = this.fixMindmapIndentation(lines);
        }

        return lines.join('\n');
    }

    fixMindmapIndentation(lines) {
        const result = [lines[0]]; // 'mindmap'
        
        if (lines.length <= 1) return result;
        
        let currentDepth = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            
            // rootの場合
            if (line.toLowerCase() === 'root') {
                result.push('  ' + line);
                currentDepth = 1;
                continue;
            }
            
            // 子ノードの場合、階層を推測
            if (line.includes('1.') || line.includes('2.') || line.includes('3.')) {
                // サブノード（例: 子ノード1.1）
                result.push('      ' + line);
            } else if (line.startsWith('子ノード') || line.match(/^[^.]*[12345]$/)) {
                // 第1レベル子ノード（例: 子ノード1）
                result.push('    ' + line);
            } else {
                // その他は第1レベルとして扱う
                result.push('    ' + line);
            }
        }
        
        return result;
    }
    
    async processMermaidDiagrams() {
        if (typeof mermaid === 'undefined') {
            console.warn('Mermaid library not available');
            return;
        }
        
        console.log('Starting Mermaid diagram processing...');
        
        // テーマが変更されている可能性があるので再初期化
        this.initializeMermaidTheme();
        
        const diagrams = document.querySelectorAll('.mermaid:not(.mermaid-processed)');
        console.log(`Found ${diagrams.length} unprocessed Mermaid diagrams`);
        
        if (diagrams.length === 0) {
            console.log('No unprocessed Mermaid diagrams found');
            return;
        }
        
        for (const diagram of diagrams) {
            try {
                console.log('Processing diagram:', diagram.id);
                
                // Base64エンコードされたデータからdiagramCodeを復元
                let diagramCode = '';
                if (diagram.dataset.diagramB64) {
                    try {
                        diagramCode = decodeURIComponent(escape(atob(diagram.dataset.diagramB64)));
                        console.log('Successfully decoded diagram from Base64');
                    } catch (decodeError) {
                        console.warn('Base64 decode error, falling back to textContent:', decodeError);
                        diagramCode = diagram.dataset.diagram || diagram.textContent;
                    }
                } else {
                    diagramCode = diagram.dataset.diagram || diagram.textContent;
                }
                
                if (!diagramCode || !diagramCode.trim()) {
                    console.warn('No diagram code found for:', diagram.id);
                    diagram.innerHTML = `<div class="mermaid-error">
                        <strong>図表エラー:</strong><br>
                        <code>図表コードが見つかりません</code>
                    </div>`;
                    diagram.classList.add('mermaid-processed');
                    continue;
                }
                
                // HTMLエンティティが残っている場合は追加でクリーンアップ
                const originalCode = diagramCode;
                diagramCode = this.cleanDiagramCode(diagramCode.trim());
                
                console.log('Processing diagram:', {
                    id: diagram.id,
                    type: diagram.dataset.diagramType,
                    originalLength: originalCode.length,
                    cleanedLength: diagramCode.length,
                    codePreview: diagramCode.substring(0, 100) + (diagramCode.length > 100 ? '...' : '')
                });
                
                // SVGを生成
                const renderStartTime = performance.now();
                const { svg } = await mermaid.render(diagram.id + '-svg', diagramCode);
                const renderEndTime = performance.now();
                
                console.log(`Mermaid rendering completed for ${diagram.id} in ${renderEndTime - renderStartTime}ms`);
                
                // SVGを挿入
                diagram.innerHTML = svg;
                diagram.classList.add('mermaid-processed');
                
                // SVG要素に基本スタイルを適用
                const svgElement = diagram.querySelector('svg');
                if (svgElement) {
                    // 基本スタイル設定
                    svgElement.style.maxWidth = '100%';
                    svgElement.style.width = 'auto';
                    svgElement.style.height = 'auto';
                    svgElement.style.maxHeight = '500px';
                    svgElement.style.display = 'block';
                    svgElement.style.margin = '0 auto';
                    
                    // 図表タイプ別の最適化
                    const diagramType = diagram.dataset.diagramType;
                    switch(diagramType) {
                        case 'pie':
                            svgElement.style.maxWidth = '500px';
                            svgElement.style.maxHeight = '500px';
                            svgElement.style.minWidth = '300px';
                            svgElement.style.minHeight = '300px';
                            // 円グラフのテキストサイズを大きくする
                            const pieTexts = svgElement.querySelectorAll('text');
                            pieTexts.forEach(text => {
                                text.style.fontSize = '16px';
                                text.style.fontWeight = '600';
                                text.style.fill = 'var(--text-primary)';
                            });
                            break;
                        case 'gantt':
                            svgElement.style.maxWidth = '900px';
                            svgElement.style.maxHeight = '500px';
                            svgElement.style.minWidth = '400px';
                            svgElement.style.minHeight = '250px';
                            // ガントチャートのテキストサイズを大きくする
                            const ganttTexts = svgElement.querySelectorAll('text');
                            ganttTexts.forEach(text => {
                                text.style.fontSize = '14px';
                                text.style.fontWeight = '500';
                                text.style.fill = 'var(--text-primary)';
                            });
                            break;
                        case 'sequence':
                            svgElement.style.maxWidth = '700px';
                            svgElement.style.maxHeight = '500px';
                            break;
                        case 'flowchart':
                        case 'graph':
                            svgElement.style.maxWidth = '600px';
                            svgElement.style.maxHeight = '500px';
                            break;
                        case 'stateDiagram':
                        case 'stateDiagram-v2':
                        case 'state':
                            svgElement.style.maxWidth = '500px';
                            svgElement.style.maxHeight = '400px';
                            break;
                        case 'classDiagram':
                        case 'class':
                            svgElement.style.maxWidth = '600px';
                            svgElement.style.maxHeight = '500px';
                            break;
                        case 'erDiagram':
                        case 'er':
                            svgElement.style.maxWidth = '700px';
                            svgElement.style.maxHeight = '500px';
                            break;
                        case 'gitgraph':
                            svgElement.style.maxWidth = '600px';
                            svgElement.style.maxHeight = '300px';
                            break;
                        default:
                            svgElement.style.maxWidth = '600px';
                            svgElement.style.maxHeight = '400px';
                    }
                    
                    console.log(`Successfully rendered ${diagramType || 'unknown'} diagram:`, diagram.id);
                } else {
                    console.warn('SVG element not found after rendering:', diagram.id);
                }
                
            } catch (error) {
                console.error('Mermaid rendering error for diagram:', diagram.id, error);
                
                let failedCode = 'コード取得エラー';
                try {
                    failedCode = diagram.dataset.diagramB64 ? 
                        decodeURIComponent(escape(atob(diagram.dataset.diagramB64))) : 
                        (diagram.dataset.diagram || diagram.textContent || 'コードなし');
                } catch (decodeError) {
                    console.warn('Failed to decode error code:', decodeError);
                }
                
                diagram.innerHTML = `<div class="mermaid-error" style="
                    padding: 12px;
                    background-color: var(--error-bg, #fee);
                    border: 1px solid var(--error-border, #fcc);
                    border-radius: 4px;
                    color: var(--error-text, #c00);
                    font-family: monospace;
                    font-size: 12px;
                ">
                    <strong style="color: var(--error-text, #c00);">🚨 Mermaid図表レンダリングエラー</strong><br>
                    <code style="background: var(--code-bg, #f5f5f5); padding: 2px 4px; border-radius: 2px;">${this.escapeHtml(error.message)}</code>
                    <details style="margin-top: 8px;">
                        <summary style="cursor: pointer; color: var(--primary-color, #007bff);">図表コードを表示</summary>
                        <pre style="white-space: pre-wrap; margin-top: 8px; font-size: 11px;">${this.escapeHtml(failedCode.substring(0, 500))}${failedCode.length > 500 ? '\n... (truncated)' : ''}</pre>
                    </details>
                </div>`;
                diagram.classList.add('mermaid-processed');
                diagram.classList.add('mermaid-error-state');
            }
        }
        
        console.log('Mermaid diagram processing completed');
    }
    
    preprocessMath(content) {
        if (typeof katex === 'undefined') {
            console.warn('KaTeX not available');
            return content;
        }
        
        try {
            // ブロック数式の処理 $$...$$
            content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
                try {
                    const rendered = katex.renderToString(math.trim(), {
                        displayMode: true,
                        throwOnError: false,
                        strict: false
                    });
                    return `<div class="math-block">${rendered}</div>`;
                } catch (error) {
                    console.warn('KaTeX block math error:', error);
                    return `<div class="math-error">$$${math}$$</div>`;
                }
            });
            
            // LaTeX ブロック数式の処理 \[...\]
            content = content.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
                try {
                    const rendered = katex.renderToString(math.trim(), {
                        displayMode: true,
                        throwOnError: false,
                        strict: false
                    });
                    return `<div class="math-block">${rendered}</div>`;
                } catch (error) {
                    console.warn('KaTeX LaTeX block math error:', error);
                    return `<div class="math-error">\\[${math}\\]</div>`;
                }
            });
            
            // 簡略ブロック数式の処理 [...]（AIがよく使う）
            content = content.replace(/^\s*\[\s*([\s\S]*?)\s*\]\s*$/gm, (match, math) => {
                // 数式っぽいかチェック（英数字、記号、LaTeX命令を含む）
                if (/[a-zA-Z0-9+\-=^_{}\\()√∫∑∏αβγδεζηθικλμνξοπρστυφχψω]/.test(math)) {
                    try {
                        const rendered = katex.renderToString(math.trim(), {
                            displayMode: true,
                            throwOnError: false,
                            strict: false
                        });
                        return `<div class="math-block">${rendered}</div>`;
                    } catch (error) {
                        console.warn('KaTeX bracket math error:', error);
                        return `<div class="math-error">[${math}]</div>`;
                    }
                }
                return match; // 数式でない場合はそのまま
            });
            
            // インライン数式の処理 $...$
            content = content.replace(/\$([^$\n]+?)\$/g, (match, math) => {
                try {
                    const rendered = katex.renderToString(math.trim(), {
                        displayMode: false,
                        throwOnError: false,
                        strict: false
                    });
                    return `<span class="math-inline">${rendered}</span>`;
                } catch (error) {
                    console.warn('KaTeX inline math error:', error);
                    return `<span class="math-error">$${math}$</span>`;
                }
            });
            
            // LaTeX インライン数式の処理 \(...\)
            content = content.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
                try {
                    const rendered = katex.renderToString(math.trim(), {
                        displayMode: false,
                        throwOnError: false,
                        strict: false
                    });
                    return `<span class="math-inline">${rendered}</span>`;
                } catch (error) {
                    console.warn('KaTeX LaTeX inline math error:', error);
                    return `<span class="math-error">\\(${math}\\)</span>`;
                }
            });
            
            return content;
        } catch (error) {
            console.warn('Math preprocessing error:', error);
            return content;
        }
    }
    
    isMarkdownContent(content) {
        const markdownPatterns = [
            /^#{1,6}\s/m,           // 見出し
            /```[\s\S]*?```/,       // コードブロック
            /\|.+\|/,              // テーブル
            /^\s*[-*+]\s/m,        // リスト
            /^\s*\d+\.\s/m,        // 番号付きリスト
            /^\s*>\s/m,            // 引用
            /\*\*[^*]+\*\*/,       // 太字
            /\*[^*]+\*/,           // 斜体
            /`[^`]+`/,             // インラインコード
            /\[.+\]\(.+\)/,        // リンク
            /^---+$/m,             // 水平線
            /\$\$[\s\S]*?\$\$/,    // ブロック数式
            /\$[^$\n]+\$/,         // インライン数式
            /\\\[[\s\S]*?\\\]/,    // LaTeX ブロック数式
            /\\\([\s\S]*?\\\)/,    // LaTeX インライン数式
            /\[[\s\S]*?\]/,        // 簡略ブロック数式
            /```mermaid[\s\S]*?```/i,      // Mermaid図表
            /```graph[\s\S]*?```/i,       // Graph記法
            /```flowchart[\s\S]*?```/i,   // Flowchart記法
            /```stateDiagram[\s\S]*?```/i, // StateDiagram記法
            /```stateDiagram-v2[\s\S]*?```/i, // StateDiagram-v2記法
            /```state[\s\S]*?```/i,       // State記法
            /```journey[\s\S]*?```/i,     // Journey記法
            /```gitgraph[\s\S]*?```/i,    // Gitgraph記法
            /```classDiagram[\s\S]*?```/i, // ClassDiagram記法
            /```erDiagram[\s\S]*?```/i,    // ErDiagram記法
            /```class[\s\S]*?```/i,       // Class記法
            /```er[\s\S]*?```/i           // Er記法
        ];
        
        return markdownPatterns.some(pattern => pattern.test(content));
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// グローバルに公開
window.MessageRenderer = MessageRenderer;