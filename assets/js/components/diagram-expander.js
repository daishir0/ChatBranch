/**
 * 図表拡大機能
 * mermaid-containerに拡大ボタンを追加し、新しいウィンドウで図表を表示
 */
class DiagramExpander {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('DiagramExpander initialized - buttons will be added during message rendering');
    }
    
    
    openDiagramFromButton(button) {
        const container = button.closest('.mermaid-container');
        if (!container) {
            console.error('Mermaid container not found');
            return;
        }
        this.openDiagramWindow(container);
    }
    
    copyDiagramSource(button) {
        const container = button.closest('.mermaid-container');
        if (!container) {
            console.error('Mermaid container not found');
            return;
        }
        
        const mermaidElement = container.querySelector('.mermaid');
        if (!mermaidElement) {
            console.error('Mermaid element not found');
            return;
        }
        
        // Get the original diagram source from data attribute
        const encodedCode = mermaidElement.getAttribute('data-diagram-b64');
        if (!encodedCode) {
            console.error('Diagram source not found');
            return;
        }
        
        try {
            // Decode the Base64 encoded diagram source
            const diagramSource = decodeURIComponent(escape(atob(encodedCode)));
            
            // Format as Markdown code block
            const markdownFormat = '```mermaid\n' + diagramSource + '\n```';
            
            // Copy to clipboard
            this.copyToClipboard(markdownFormat, button);
            
        } catch (error) {
            console.error('Failed to decode diagram source:', error);
        }
    }
    
    async copyToClipboard(text, button) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (!successful) {
                    throw new Error('Fallback copy command failed');
                }
            }
            
            // Show success feedback
            this.showCopyFeedback(button);
            
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            alert('コピーに失敗しました');
        }
    }
    
    showCopyFeedback(button) {
        const translations = (window.appConfig && window.appConfig.diagramTranslations) ? window.appConfig.diagramTranslations : {};
        const copiedText = translations.copied || 'コピーしました';
        const originalText = button.textContent;
        const originalTitle = button.title;
        
        // Show success state
        button.textContent = '✅';
        button.title = copiedText;
        button.classList.add('copy-success');
        
        // Reset after 2 seconds
        setTimeout(() => {
            button.textContent = originalText;
            button.title = originalTitle;
            button.classList.remove('copy-success');
        }, 2000);
    }
    
    openDiagramWindow(container) {
        const mermaidElement = container.querySelector('.mermaid');
        if (!mermaidElement) {
            console.error('Mermaid element not found');
            return;
        }
        
        // 図表のSVGを取得
        const svgElement = mermaidElement.querySelector('svg');
        if (!svgElement) {
            console.error('SVG element not found');
            return;
        }
        
        // SVGのHTMLを取得
        const svgHtml = svgElement.outerHTML;
        
        // 図表タイプを判定
        const diagramType = this.getDiagramType(svgElement);
        
        // 新しいウィンドウのHTMLを生成
        const windowHtml = this.generateWindowHtml(svgHtml, diagramType);
        
        // 新しいウィンドウを開く
        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        
        if (newWindow) {
            newWindow.document.write(windowHtml);
            newWindow.document.close();
            newWindow.focus();
        } else {
            // ポップアップブロックされた場合の処理
            alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。');
        }
    }
    
    getDiagramType(svgElement) {
        const role = svgElement.getAttribute('aria-roledescription');
        
        switch(role) {
            case 'flowchart-v2':
            case 'flowchart':
                return 'フローチャート';
            case 'sequence':
                return 'シーケンス図';
            case 'gantt':
                return 'ガントチャート';
            case 'classDiagram':
                return 'クラス図';
            case 'stateDiagram':
                return '状態遷移図';
            case 'pie':
                return '円グラフ';
            case 'er':
                return 'ER図';
            case 'journey':
                return 'ジャーニー図';
            case 'mindmap':
                return 'マインドマップ';
            default:
                return 'Mermaid図表';
        }
    }
    
    generateWindowHtml(svgHtml, diagramType) {
        // Get translations safely from parent window
        const translations = (window.opener && window.opener.appConfig && window.opener.appConfig.diagramTranslations) 
            ? window.opener.appConfig.diagramTranslations 
            : {
                expanded_view: 'Expanded View',
                zoom_in: 'Zoom In', 
                zoom_out: 'Zoom Out',
                reset_zoom: 'Reset (100%)',
                fit_to_window: 'Fit to Window',
                print: 'Print',
                close: 'Close'
            };
        
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${diagramType} - 拡大表示</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #1a1a1a;
            color: #ffffff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
            height: 100vh;
        }
        
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: #1a1a1a;
            padding: 15px 20px;
            border-bottom: 1px solid #444;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 18px;
            color: #ffffff;
        }
        
        .zoom-info {
            font-size: 14px;
            color: #aaa;
        }
        
        .diagram-viewport {
            position: absolute;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 60px;
            overflow: hidden;
            cursor: grab;
        }
        
        .diagram-viewport.dragging {
            cursor: grabbing;
        }
        
        .diagram-container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            transform-origin: center center;
            transition: transform 0.1s ease-out;
        }
        
        svg {
            max-width: none;
            max-height: none;
            background: transparent;
            user-select: none;
            pointer-events: none;
        }
        
        .controls {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #1a1a1a;
            padding: 15px 20px;
            border-top: 1px solid #444;
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .controls button {
            background-color: #4a9eff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            min-width: 44px;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .controls button:hover {
            background-color: #357abd;
        }
        
        .controls button:disabled {
            background-color: #555;
            cursor: not-allowed;
        }
        
        .zoom-controls {
            display: flex;
            gap: 5px;
            align-items: center;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 16px;
            }
            
            .controls {
                padding: 10px;
            }
            
            .controls button {
                min-width: 48px;
                min-height: 48px;
                font-size: 16px;
            }
            
            .diagram-viewport {
                top: 55px;
                bottom: 70px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${diagramType} - ${translations.expanded_view}</h1>
        <div class="zoom-info" id="zoomInfo">100%</div>
    </div>
    
    <div class="diagram-viewport" id="viewport">
        <div class="diagram-container" id="container">
            ${svgHtml}
        </div>
    </div>
    
    <div class="controls">
        <div class="zoom-controls">
            <button onclick="zoomOut()" id="zoomOutBtn" title="${translations.zoom_out}">🔍−</button>
            <button onclick="resetZoom()" title="${translations.reset_zoom}">🔄</button>
            <button onclick="zoomIn()" id="zoomInBtn" title="${translations.zoom_in}">🔍+</button>
        </div>
        <button onclick="fitToWindow()" title="${translations.fit_to_window}">📐</button>
        <button onclick="window.print()" title="${translations.print}">🖨️</button>
        <button onclick="window.close()" title="${translations.close}">✕</button>
    </div>

    <script>
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startTranslateX = 0;
        let startTranslateY = 0;
        
        const minScale = 0.1;
        const maxScale = 5;
        const scaleStep = 0.2;
        
        const viewport = document.getElementById('viewport');
        const container = document.getElementById('container');
        const zoomInfo = document.getElementById('zoomInfo');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        
        function updateTransform() {
            container.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${scale})\`;
            zoomInfo.textContent = Math.round(scale * 100) + '%';
            
            zoomInBtn.disabled = scale >= maxScale;
            zoomOutBtn.disabled = scale <= minScale;
        }
        
        function zoomIn() {
            if (scale < maxScale) {
                scale = Math.min(scale + scaleStep, maxScale);
                updateTransform();
            }
        }
        
        function zoomOut() {
            if (scale > minScale) {
                scale = Math.max(scale - scaleStep, minScale);
                updateTransform();
            }
        }
        
        function resetZoom() {
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform();
        }
        
        function fitToWindow() {
            const svg = container.querySelector('svg');
            if (!svg) return;
            
            const viewportRect = viewport.getBoundingClientRect();
            const svgRect = svg.getBoundingClientRect();
            
            const scaleX = viewportRect.width / svgRect.width;
            const scaleY = viewportRect.height / svgRect.height;
            
            scale = Math.min(scaleX, scaleY, 1) * 0.9;
            translateX = 0;
            translateY = 0;
            updateTransform();
        }
        
        // マウスイベント
        viewport.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startTranslateX = translateX;
            startTranslateY = translateY;
            viewport.classList.add('dragging');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            translateX = startTranslateX + (e.clientX - startX);
            translateY = startTranslateY + (e.clientY - startY);
            updateTransform();
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            viewport.classList.remove('dragging');
        });
        
        // ホイールズーム
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
            const newScale = Math.max(minScale, Math.min(maxScale, scale + delta));
            
            if (newScale !== scale) {
                const rect = viewport.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // ズーム中心点を調整
                const factor = newScale / scale;
                translateX = x - (x - translateX) * factor;
                translateY = y - (y - translateY) * factor;
                scale = newScale;
                
                updateTransform();
            }
        });
        
        // タッチイベント（ピンチズーム対応）
        let initialDistance = 0;
        let initialScale = 1;
        let touches = [];
        
        viewport.addEventListener('touchstart', (e) => {
            touches = Array.from(e.touches);
            
            if (touches.length === 1) {
                isDragging = true;
                startX = touches[0].clientX;
                startY = touches[0].clientY;
                startTranslateX = translateX;
                startTranslateY = translateY;
            } else if (touches.length === 2) {
                isDragging = false;
                initialDistance = getDistance(touches[0], touches[1]);
                initialScale = scale;
            }
        });
        
        viewport.addEventListener('touchmove', (e) => {
            e.preventDefault();
            touches = Array.from(e.touches);
            
            if (touches.length === 1 && isDragging) {
                translateX = startTranslateX + (touches[0].clientX - startX);
                translateY = startTranslateY + (touches[0].clientY - startY);
                updateTransform();
            } else if (touches.length === 2) {
                const currentDistance = getDistance(touches[0], touches[1]);
                const newScale = Math.max(minScale, Math.min(maxScale, initialScale * (currentDistance / initialDistance)));
                
                if (newScale !== scale) {
                    scale = newScale;
                    updateTransform();
                }
            }
        });
        
        viewport.addEventListener('touchend', () => {
            isDragging = false;
            touches = [];
        });
        
        function getDistance(touch1, touch2) {
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Equal':
                case 'NumpadAdd':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        zoomIn();
                    }
                    break;
                case 'Minus':
                case 'NumpadSubtract':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        zoomOut();
                    }
                    break;
                case 'Digit0':
                case 'Numpad0':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        resetZoom();
                    }
                    break;
                case 'Escape':
                    window.close();
                    break;
            }
        });
        
        // 初期化
        updateTransform();
        
        // ダブルタップでズームリセット（モバイル用）
        let lastTouchTime = 0;
        viewport.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTouchTime;
            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault();
                if (scale === 1) {
                    fitToWindow();
                } else {
                    resetZoom();
                }
            }
            lastTouchTime = currentTime;
        });
    </script>
</body>
</html>
        `;
    }
}

// 初期化
window.diagramExpander = new DiagramExpander();