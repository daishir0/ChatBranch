/**
 * 図表拡大表示機能
 */
class DiagramViewer {
    constructor() {
        this.currentScale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.processedDiagrams = new Set();
        this.debugCount = 0;
        
        this.init();
    }
    
    init() {
        // 画面上に初期化メッセージを表示
        this.showDebugMessage('DiagramViewer initialized');
        
        // DOM変更を監視して図表に拡大ボタンを追加（無限ループ防止）
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    // 図表関連の変更のみ処理（デバッグメッセージは無視）
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === 1 && 
                            (node.tagName === 'SVG' || node.classList?.contains('mermaid')) &&
                            !node.classList?.contains('debug-message') &&
                            !node.classList?.contains('diagram-container')) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
            });
            if (shouldProcess) {
                setTimeout(() => this.addExpandButtons(), 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 初期実行
        this.showDebugMessage('Scheduling addExpandButtons calls');
        setTimeout(() => {
            this.showDebugMessage('First addExpandButtons call');
            this.addExpandButtons();
        }, 500);
        setTimeout(() => {
            this.showDebugMessage('Second addExpandButtons call');
            this.addExpandButtons();
        }, 1500);
        
        // Escapeキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeFullscreen();
            }
        });
    }
    
    showDebugMessage(message) {
        // デバッグメッセージの数を制限（無限ループ防止）
        if (this.debugCount >= 10) return;
        this.debugCount++;
        
        const debugDiv = document.createElement('div');
        debugDiv.style.position = 'fixed';
        debugDiv.style.top = (10 + (this.debugCount * 30)) + 'px';
        debugDiv.style.right = '10px';
        debugDiv.style.backgroundColor = 'yellow';
        debugDiv.style.padding = '5px';
        debugDiv.style.border = '1px solid black';
        debugDiv.style.zIndex = '9999';
        debugDiv.style.fontSize = '12px';
        debugDiv.textContent = message;
        debugDiv.className = 'debug-message'; // MutationObserverで無視するため
        document.body.appendChild(debugDiv);
        
        // 3秒後に削除
        setTimeout(() => {
            if (debugDiv.parentNode) {
                debugDiv.parentNode.removeChild(debugDiv);
            }
        }, 3000);
    }
    
    addExpandButtons() {
        this.showDebugMessage('addExpandButtons called');
        const diagrams = document.querySelectorAll('svg, .mermaid');
        this.showDebugMessage(`Found ${diagrams.length} diagrams`);
        
        diagrams.forEach(diagram => {
            // 既にボタンがある場合はスキップ
            if (diagram.closest('.diagram-container')) {
                return;
            }
            
            // Mermaidの場合はSVGの存在を確認
            if (diagram.classList.contains('mermaid') && !diagram.querySelector('svg')) {
                return;
            }
            
            // サイズチェック
            const rect = diagram.getBoundingClientRect();
            if (rect.width < 50 || rect.height < 30) {
                return;
            }
            
            console.log(`Adding expand button to: ${diagram.tagName}${diagram.className ? '.' + diagram.className : ''}`);
            this.wrapWithContainer(diagram);
        });
    }
    
    wrapWithContainer(diagram) {
        const container = document.createElement('div');
        container.className = 'diagram-container';
        container.style.position = 'relative';
        container.style.display = 'inline-block';
        container.style.border = '1px solid #ddd';
        container.style.borderRadius = '4px';
        container.style.padding = '8px';
        container.style.margin = '4px 0';
        
        const expandBtn = document.createElement('button');
        expandBtn.innerHTML = '🔍';
        expandBtn.title = 'Expand diagram';
        expandBtn.style.position = 'absolute';
        expandBtn.style.top = '4px';
        expandBtn.style.right = '4px';
        expandBtn.style.width = '28px';
        expandBtn.style.height = '28px';
        expandBtn.style.border = '1px solid #ccc';
        expandBtn.style.borderRadius = '4px';
        expandBtn.style.backgroundColor = '#fff';
        expandBtn.style.cursor = 'pointer';
        expandBtn.style.zIndex = '1000';
        expandBtn.style.fontSize = '12px';
        
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openFullscreen(diagram);
        });
        
        // DOM操作
        if (diagram.parentNode) {
            diagram.parentNode.insertBefore(container, diagram);
            container.appendChild(diagram);
            container.appendChild(expandBtn);
            console.log('Successfully added expand button');
        }
    }
    
    openFullscreen(diagram) {
        console.log('Opening fullscreen for diagram');
        
        // オーバーレイ作成
        const overlay = document.createElement('div');
        overlay.className = 'diagram-fullscreen-overlay';
        
        // コンテンツ作成
        const content = document.createElement('div');
        content.className = 'diagram-fullscreen-content';
        
        // ヘッダー
        const header = document.createElement('div');
        header.className = 'diagram-fullscreen-header';
        
        const title = document.createElement('div');
        title.textContent = 'Diagram';
        title.style.fontWeight = 'bold';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕ Close';
        closeBtn.style.padding = '4px 8px';
        closeBtn.addEventListener('click', () => this.closeFullscreen());
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // ビューア
        const viewer = document.createElement('div');
        viewer.className = 'diagram-fullscreen-viewer';
        
        // 図表クローン
        let clonedDiagram;
        if (diagram.classList.contains('mermaid')) {
            const svg = diagram.querySelector('svg');
            clonedDiagram = svg ? svg.cloneNode(true) : diagram.cloneNode(true);
        } else {
            clonedDiagram = diagram.cloneNode(true);
        }
        
        if (clonedDiagram) {
            clonedDiagram.style.maxWidth = '90vw';
            clonedDiagram.style.maxHeight = '80vh';
            clonedDiagram.style.cursor = 'grab';
            viewer.appendChild(clonedDiagram);
        }
        
        // ズームコントロール
        const zoomControls = document.createElement('div');
        zoomControls.style.textAlign = 'center';
        zoomControls.style.padding = '10px';
        
        const zoomOut = document.createElement('button');
        zoomOut.innerHTML = '−';
        zoomOut.addEventListener('click', () => this.zoomOut(clonedDiagram));
        
        const zoomLevel = document.createElement('span');
        zoomLevel.textContent = '100%';
        zoomLevel.style.margin = '0 10px';
        this.zoomLevelDisplay = zoomLevel;
        
        const zoomIn = document.createElement('button');
        zoomIn.innerHTML = '＋';
        zoomIn.addEventListener('click', () => this.zoomIn(clonedDiagram));
        
        const resetZoom = document.createElement('button');
        resetZoom.innerHTML = '⌂';
        resetZoom.addEventListener('click', () => this.resetZoom(clonedDiagram));
        
        zoomControls.appendChild(zoomOut);
        zoomControls.appendChild(zoomLevel);
        zoomControls.appendChild(zoomIn);
        zoomControls.appendChild(resetZoom);
        
        // 組み立て
        content.appendChild(header);
        content.appendChild(viewer);
        content.appendChild(zoomControls);
        overlay.appendChild(content);
        
        // ドラッグ機能追加
        this.addDragFunctionality(clonedDiagram);
        
        // 表示
        document.body.appendChild(overlay);
        this.currentOverlay = overlay;
        this.resetTransform();
        
        console.log('Fullscreen opened successfully');
    }
    
    addDragFunctionality(diagram) {
        let startX, startY, startTranslateX, startTranslateY;
        
        diagram.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startTranslateX = this.translateX;
            startTranslateY = this.translateY;
            diagram.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            this.translateX = startTranslateX + (e.clientX - startX);
            this.translateY = startTranslateY + (e.clientY - startY);
            this.updateTransform(diagram);
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            diagram.style.cursor = 'grab';
        });
    }
    
    zoomIn(diagram) {
        this.currentScale = Math.min(this.currentScale * 1.2, 4);
        this.updateTransform(diagram);
        this.updateZoomLevel();
    }
    
    zoomOut(diagram) {
        this.currentScale = Math.max(this.currentScale / 1.2, 0.25);
        this.updateTransform(diagram);
        this.updateZoomLevel();
    }
    
    resetZoom(diagram) {
        this.resetTransform();
        this.updateTransform(diagram);
        this.updateZoomLevel();
    }
    
    updateTransform(diagram) {
        diagram.style.transform = `scale(${this.currentScale}) translate(${this.translateX / this.currentScale}px, ${this.translateY / this.currentScale}px)`;
    }
    
    updateZoomLevel() {
        if (this.zoomLevelDisplay) {
            this.zoomLevelDisplay.textContent = `${Math.round(this.currentScale * 100)}%`;
        }
    }
    
    resetTransform() {
        this.currentScale = 1;
        this.translateX = 0;
        this.translateY = 0;
    }
    
    closeFullscreen() {
        if (this.currentOverlay) {
            this.currentOverlay.remove();
            this.currentOverlay = null;
            console.log('Fullscreen closed');
        }
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.diagramViewer = new DiagramViewer();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.diagramViewer = new DiagramViewer();
}