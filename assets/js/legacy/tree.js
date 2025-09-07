// Tree Visualization Component using Vis.js Network

class VisTreeViewer {
    constructor() {
        this.container = document.getElementById('treeContainer');
        this.network = null;
        this.nodes = new vis.DataSet([]);
        this.edges = new vis.DataSet([]);
        this.currentMessageId = null;
        
        this.initializeNetwork();
    }
    
    initializeNetwork() {
        const data = {
            nodes: this.nodes,
            edges: this.edges
        };
        
        const options = {
            layout: {
                hierarchical: {
                    direction: 'UD',
                    sortMethod: 'directed',
                    nodeSpacing: window.innerWidth < 768 ? 100 : 150,
                    levelSeparation: window.innerWidth < 768 ? 80 : 120,
                    treeSpacing: window.innerWidth < 768 ? 120 : 200,
                    blockShifting: true,
                    edgeMinimization: true,
                    parentCentralization: true,
                    shakeTowards: 'leaves'  // Ensure root nodes align at top
                }
            },
            physics: {
                enabled: false
            },
            nodes: {
                shape: 'box',
                margin: window.innerWidth < 768 ? 5 : 10,
                font: {
                    size: window.innerWidth < 768 ? 10 : 12,
                    face: 'arial'
                },
                borderWidth: 2,
                shadow: true,
                widthConstraint: {
                    minimum: window.innerWidth < 768 ? 100 : 120,
                    maximum: window.innerWidth < 768 ? 200 : 250
                },
                heightConstraint: {
                    minimum: window.innerWidth < 768 ? 35 : 40
                }
            },
            edges: {
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.8
                    }
                },
                color: {
                    color: '#848484',
                    highlight: '#4a9eff'
                },
                width: 2,
                smooth: {
                    enabled: true,
                    type: 'cubicBezier'
                }
            },
            interaction: {
                selectConnectedEdges: false,
                hover: true,
                hoverConnectedEdges: false,
                multiselect: false,
                navigationButtons: false,
                keyboard: false,
                zoomView: true,
                dragView: true,
                dragNodes: false
            }
        };
        
        this.network = new vis.Network(this.container, data, options);
        
        // Add click event listener (only for user messages)
        this.network.on('selectNode', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const nodeData = this.nodes.get(nodeId);
                
                // Only allow selection of user messages
                if (nodeData && nodeData.label.includes('[User]')) {
                    this.selectNode(nodeId);
                } else {
                    // Deselect AI nodes immediately
                    this.network.unselectAll();
                }
            }
        });
        
        // Handle responsive sizing
        this.handleResize();
        window.addEventListener('resize', () => {
            this.handleResize();
            this.updateOptionsForScreenSize();
        });
    }
    
    handleResize() {
        if (this.network) {
            this.network.redraw();
            this.network.fit();
        }
    }
    
    updateOptionsForScreenSize() {
        if (this.network) {
            const isMobile = window.innerWidth < 768;
            const newOptions = {
                layout: {
                    hierarchical: {
                        direction: 'UD',
                        sortMethod: 'directed',
                        nodeSpacing: isMobile ? 100 : 150,
                        levelSeparation: isMobile ? 80 : 120,
                        treeSpacing: isMobile ? 120 : 200,
                        blockShifting: true,
                        edgeMinimization: true,
                        parentCentralization: true,
                        shakeTowards: 'leaves'
                    }
                },
                nodes: {
                    shape: 'box',
                    margin: isMobile ? 5 : 10,
                    font: {
                        size: isMobile ? 10 : 12,
                        face: 'arial'
                    },
                    borderWidth: 2,
                    shadow: true,
                    widthConstraint: {
                        minimum: isMobile ? 100 : 120,
                        maximum: isMobile ? 200 : 250
                    },
                    heightConstraint: {
                        minimum: isMobile ? 35 : 40
                    }
                }
            };
            
            this.network.setOptions(newOptions);
            setTimeout(() => {
                this.network.fit();
            }, 100);
        }
    }
    
    render(tree) {
        this.nodes.clear();
        this.edges.clear();
        
        if (!tree || tree.length === 0) return;
        
        this.processTreeNodes(tree);
        
        // Fit the network after rendering
        setTimeout(() => {
            if (this.network) {
                this.network.fit({
                    animation: {
                        duration: 1000,
                        easingFunction: 'easeInOutQuart'
                    }
                });
            }
        }, 100);
    }
    
    processTreeNodes(nodes, parentId = null, level = 0) {
        nodes.forEach(node => {
            const preview = this.getMessagePreview(node.content);
            const timestamp = this.formatTimestamp(node.created_at);
            const isCurrentMessage = node.id === app.currentMessageId;
            
            // Create node with explicit level for consistent root alignment
            const nodeData = {
                id: node.id,
                label: `[${node.role === 'user' ? 'User' : 'AI'}]\n${preview}\n${timestamp}`,
                color: this.getNodeColor(node.role, isCurrentMessage),
                font: {
                    color: node.role === 'user' ? '#ffffff' : '#ffffff',
                    size: 11
                },
                borderWidth: isCurrentMessage ? 4 : 2,
                borderColor: isCurrentMessage ? '#ffeb3b' : '#ffffff',
                // Make AI nodes appear non-interactive
                chosen: node.role === 'user',
                opacity: node.role === 'user' ? 1.0 : 0.8,
                // Explicitly set level for hierarchical layout
                level: level
            };
            
            this.nodes.add(nodeData);
            
            // Create edge from parent
            if (parentId) {
                this.edges.add({
                    id: `${parentId}-${node.id}`,
                    from: parentId,
                    to: node.id
                });
            }
            
            // Process children recursively with incremented level
            if (node.children && node.children.length > 0) {
                this.processTreeNodes(node.children, node.id, level + 1);
            }
        });
    }
    
    getNodeColor(role, isCurrent) {
        if (isCurrent) {
            return {
                background: role === 'user' ? '#2e7d32' : '#5a5a5a',
                border: '#ffeb3b',
                highlight: {
                    background: role === 'user' ? '#4caf50' : '#6a6a6a',
                    border: '#ffeb3b'
                }
            };
        }
        
        return {
            background: role === 'user' ? '#4caf50' : '#757575',
            border: '#ffffff',
            highlight: {
                background: role === 'user' ? '#66bb6a' : '#8a8a8a',
                border: '#4a9eff'
            }
        };
    }
    
    getMessagePreview(content) {
        const maxLength = window.innerWidth < 768 ? 30 : 40;
        const preview = content.replace(/\n/g, ' ').trim();
        
        if (preview.length > maxLength) {
            return preview.substring(0, maxLength) + '...';
        }
        
        return preview;
    }
    
    formatTimestamp(timestamp) {
        // Use TimeZoneManager if available for date+time display
        if (window.app && window.app.timezoneManager) {
            return window.app.timezoneManager.formatCompactDateTime(timestamp);
        }
        
        // Fallback to original implementation
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    selectNode(messageId) {
        // Update current message
        app.currentMessageId = messageId;
        this.currentMessageId = messageId;
        
        // Update node colors to reflect selection
        this.updateNodeSelection();
        
        // Reload chat display with the new message path
        if (typeof app.loadMessages === 'function') {
            app.loadMessages();
        }
        
        // Focus on selected node
        this.network.focus(messageId, {
            animation: {
                duration: 800,
                easingFunction: 'easeInOutQuart'
            },
            scale: 1.2
        });
        
        // Scroll to the message in the chat view
        this.scrollToMessage(messageId);
    }
    
    updateNodeSelection() {
        const updates = [];
        this.nodes.forEach(node => {
            const isCurrentMessage = node.id === app.currentMessageId;
            const role = node.label.includes('[User]') ? 'user' : 'assistant';
            
            updates.push({
                id: node.id,
                color: this.getNodeColor(role, isCurrentMessage),
                borderWidth: isCurrentMessage ? 4 : 2,
                borderColor: isCurrentMessage ? '#ffeb3b' : '#ffffff'
            });
        });
        
        this.nodes.update(updates);
    }
    
    scrollToMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }
    
    expandPath(messageId) {
        // Focus on the specific message
        if (this.network) {
            this.network.focus(messageId, {
                animation: {
                    duration: 1000,
                    easingFunction: 'easeInOutQuart'
                }
            });
        }
    }
    
    getPathToMessage(messageId) {
        // This would traverse the network to find the path to a specific message
        const connectedNodes = this.network.getConnectedNodes(messageId);
        return connectedNodes;
    }
}

// Alternative Tree Visualization using Canvas or SVG for better performance
class CanvasTreeViewer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tree = null;
        this.nodeRadius = 8;
        this.levelHeight = 60;
        this.nodeSpacing = 40;
        
        this.setupCanvas();
    }
    
    setupCanvas() {
        // Handle high DPI displays
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        // Add click handler
        this.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
        });
    }
    
    render(tree) {
        this.tree = tree;
        this.clearCanvas();
        
        if (!tree || tree.length === 0) return;
        
        const layout = this.calculateLayout(tree);
        this.drawTree(layout);
    }
    
    calculateLayout(nodes, level = 0, startX = 0) {
        const layout = [];
        let currentX = startX;
        
        nodes.forEach((node, index) => {
            const nodeLayout = {
                ...node,
                x: currentX + (index * this.nodeSpacing),
                y: level * this.levelHeight + 30,
                level: level
            };
            
            layout.push(nodeLayout);
            
            if (node.children && node.children.length > 0) {
                const childLayout = this.calculateLayout(
                    node.children, 
                    level + 1, 
                    nodeLayout.x - (node.children.length * this.nodeSpacing) / 2
                );
                layout.push(...childLayout);
                
                // Draw connections to children
                childLayout.forEach(child => {
                    if (child.level === level + 1) {
                        this.drawConnection(nodeLayout, child);
                    }
                });
            }
            
            currentX += this.nodeSpacing;
        });
        
        return layout;
    }
    
    drawTree(layout) {
        // Draw connections first
        layout.forEach(node => {
            if (node.children) {
                node.children.forEach(child => {
                    this.drawConnection(node, child);
                });
            }
        });
        
        // Then draw nodes
        layout.forEach(node => {
            this.drawNode(node);
        });
    }
    
    drawNode(node) {
        const { x, y } = node;
        
        // Node circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.nodeRadius, 0, 2 * Math.PI);
        
        // Color based on role and current status
        if (node.id === app.currentMessageId) {
            this.ctx.fillStyle = '#4a9eff';
        } else if (node.role === 'user') {
            this.ctx.fillStyle = '#4caf50';
        } else {
            this.ctx.fillStyle = '#757575';
        }
        
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Node label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            node.role === 'user' ? 'U' : 'AI', 
            x, 
            y + 4
        );
        
        // Message preview
        const preview = this.getMessagePreview(node.content, 20);
        this.ctx.fillStyle = '#cccccc';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText(preview, x, y + this.nodeRadius + 15);
    }
    
    drawConnection(parent, child) {
        this.ctx.beginPath();
        this.ctx.moveTo(parent.x, parent.y + this.nodeRadius);
        this.ctx.lineTo(child.x, child.y - this.nodeRadius);
        this.ctx.strokeStyle = '#555555';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
    
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Find clicked node
        if (this.tree) {
            const layout = this.calculateLayout(this.tree);
            const clickedNode = layout.find(node => {
                const distance = Math.sqrt(
                    Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
                );
                return distance <= this.nodeRadius;
            });
            
            if (clickedNode) {
                app.currentMessageId = clickedNode.id;
                this.render(this.tree); // Re-render to update selection
                
                // Reload chat display with the new message path
                if (typeof app.loadMessages === 'function') {
                    app.loadMessages();
                }
            }
        }
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    getMessagePreview(content, maxLength = 20) {
        const preview = content.replace(/\n/g, ' ').trim();
        return preview.length > maxLength 
            ? preview.substring(0, maxLength) + '...'
            : preview;
    }
}

// Initialize tree viewer
const treeViewer = new VisTreeViewer();
window.treeViewer = treeViewer;