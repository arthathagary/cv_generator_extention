// Content script for area selection and scraping on any website

// Add CSS for animations and styling
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
    }
    
    .resume-ai-review-highlight {
        animation: pulse 1s infinite;
    }
    
    .resize-handle {
        position: absolute;
        background: #4CAF50;
        border: 1px solid white;
        z-index: 10002;
        border-radius: 2px;
        transition: all 0.2s ease;
    }
    
    .resize-handle:hover {
        background: #45a049;
        transform: scale(1.3);
        box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
    }
    
    .resume-ai-area-highlight {
        transition: box-shadow 0.2s ease;
    }
    
    .resume-ai-area-highlight:hover {
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
    }
    
    .edit-selection-btn, .delete-selection-btn {
        transition: all 0.2s ease;
        font-family: Arial, sans-serif;
    }
    
    .edit-selection-btn:hover {
        background: #1976d2 !important;
        transform: scale(1.1);
    }
    
    .delete-selection-btn:hover {
        background: #d32f2f !important;
        transform: scale(1.1);
    }
    
    .resume-ai-scroll-highlight {
        animation: scrollPulse 2s infinite;
    }
    
    @keyframes scrollPulse {
        0%, 100% { border-color: #2196F3; }
        50% { border-color: #03A9F4; }
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    .scroll-message {
        animation: slideIn 0.3s ease-out;
    }
`;
document.head.appendChild(style);

class AreaSelector {
    constructor() {
        console.log('[AreaSelector] Starting constructor...');
        
        try {
            this.isSelectionMode = false;
            this.isDrawing = false;
            this.startX = 0;
            this.startY = 0;
            this.currentX = 0;
            this.currentY = 0;
            this.overlay = null;
            this.selectionBox = null;
            this.selectedAreas = {
                title: null,
                company: null,
                description: null,
                requirements: null,
                location: null,
                salary: null
            };
            this.currentSelectionType = null;
            
            console.log('[AreaSelector] Basic properties initialized');
            
            // Scroll selection properties
            this.isScrollSelecting = false;
            this.scrollSelectionBounds = null;
            this.scrollContent = new Set();
            this.scrollHighlight = null;
            this.scrollStartPosition = 0;
            
            console.log('[AreaSelector] Scroll properties initialized');
            
            // Cursor selection properties
            this.isCursorSelecting = false;
            this.cursorSelectedElements = new Set();
            this.cursorContent = new Set();
            this.cursorHighlights = new Map();
            this.lastHoveredElement = null;
            
            console.log('[AreaSelector] Cursor properties initialized');
            
            this.setupMessageListener();
            console.log('[AreaSelector] ✅ Constructor completed successfully');
            
        } catch (error) {
            console.error('[AreaSelector] ❌ Error in constructor:', error);
            throw error;
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Content area selector received message:', request.action);
            
            switch (request.action) {
                case 'ping':
                    console.log('[Content Script] Received ping, responding with pong');
                    sendResponse({ success: true, message: 'pong', timestamp: Date.now() });
                    return true;
                
                case 'startAreaSelection':
                    this.startSelection(request.type);
                    sendResponse({ success: true });
                    break;
                    
                case 'extractSelectedAreas':
                    const allContent = this.getAllSelectedContent();
                    sendResponse({ 
                        success: true, 
                        data: allContent,
                        readyForAI: allContent.totalSelections > 0
                    });
                    break;
                    
                case 'stopSelection':
                    this.stopSelection();
                    sendResponse({ success: true });
                    break;
                    
                case 'clearAllSelections':
                    this.clearAllSelections();
                    sendResponse({ success: true });
                    break;
                    
                case 'modifySelection':
                    this.enableSelectionModification(request.type);
                    sendResponse({ success: true });
                    break;
                    
                case 'previewSelection':
                    const preview = this.previewSelection(request.type);
                    sendResponse({ success: true, preview: preview });
                    break;
                    
                case 'highlightForReview':
                    this.highlightSelectionForReview(request.type);
                    sendResponse({ success: true });
                    break;
                    
                case 'debugExtraction':
                    const debugInfo = this.getDebugInfo();
                    console.log('[Debug] Extraction debug info:', debugInfo);
                    sendResponse({ success: true, debug: debugInfo });
                    break;
                    
                case 'testContentExtraction':
                    const testResult = this.testContentExtraction();
                    console.log('[Debug] Content extraction test:', testResult);
                    sendResponse({ success: true, test: testResult });
                    break;
                    
                case 'selectEntireViewport':
                    this.selectEntireViewport();
                    sendResponse({ success: true });
                    break;
                    
                case 'selectFullPage':
                    this.selectFullPage();
                    sendResponse({ success: true });
                    break;
                    
                case 'startScrollSelection':
                    this.startScrollSelection();
                    sendResponse({ success: true });
                    break;
                    
                case 'stopScrollSelection':
                    this.stopScrollSelection();
                    sendResponse({ success: true });
                    break;
                    
                case 'startCursorSelection':
                    console.log('[Content] Received startCursorSelection message');
                    try {
                        this.startCursorSelection();
                        console.log('[Content] startCursorSelection completed successfully');
                        sendResponse({ success: true });
                    } catch (error) {
                        console.error('[Content] Error in startCursorSelection:', error);
                        sendResponse({ success: false, error: error.message });
                    }
                    break;
                    
                case 'stopCursorSelection':
                    this.stopCursorSelection();
                    sendResponse({ success: true });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
            
            return true;
        });
    }

    // Method to handle messages forwarded from other content scripts
    async handleMessage(request, sender, sendResponse) {
        console.log('[AreaSelector] Received forwarded message:', request.action);
        
        try {
            switch (request.action) {
                case 'startAreaSelection':
                    this.startSelection(request.type);
                    sendResponse({ success: true });
                    break;
                    
                case 'startCursorSelection':
                    console.log('[AreaSelector] Handling forwarded startCursorSelection');
                    this.startCursorSelection();
                    sendResponse({ success: true });
                    break;
                    
                case 'stopCursorSelection':
                    this.stopCursorSelection();
                    sendResponse({ success: true });
                    break;
                    
                case 'extractSelectedAreas':
                    const allContent = this.getAllSelectedContent();
                    sendResponse({ 
                        success: true, 
                        data: allContent,
                        readyForAI: allContent.totalSelections > 0
                    });
                    break;
                    
                case 'clearAllSelections':
                    this.clearAllSelections();
                    sendResponse({ success: true });
                    break;
                    
                case 'selectEntireViewport':
                    this.selectEntireViewport();
                    sendResponse({ success: true });
                    break;
                    
                case 'selectFullPage':
                    this.selectFullPage();
                    sendResponse({ success: true });
                    break;
                    
                case 'startScrollSelection':
                    this.startScrollSelection();
                    sendResponse({ success: true });
                    break;
                    
                case 'stopScrollSelection':
                    this.stopScrollSelection();
                    sendResponse({ success: true });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action in AreaSelector' });
            }
        } catch (error) {
            console.error('[AreaSelector] Error handling forwarded message:', error);
            sendResponse({ success: false, error: error.message });
        }
        
        return true;
    }

    startSelection(type) {
        console.log('Starting area selection for:', type);
        this.isSelectionMode = true;
        this.currentSelectionType = type;
        
        // Create overlay with crop tool
        this.createCropOverlay(type);
        
        // Add mouse event listeners
        document.addEventListener('mousedown', this.handleMouseDown.bind(this), true);
        document.addEventListener('mousemove', this.handleMouseMove.bind(this), true);
        document.addEventListener('mouseup', this.handleMouseUp.bind(this), true);
        
        // Prevent text selection during cropping
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'crosshair';
    }

    createCropOverlay(type) {
        // Create main overlay that covers entire page
        this.overlay = document.createElement('div');
        this.overlay.id = 'resume-ai-crop-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            z-index: 10000;
            pointer-events: none;
        `;

        // Create selection box
        this.selectionBox = document.createElement('div');
        this.selectionBox.id = 'resume-ai-selection-box';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px dashed #4CAF50;
            background: rgba(76, 175, 80, 0.1);
            display: none;
            pointer-events: none;
        `;

        // Create instruction panel
        const instructionPanel = document.createElement('div');
        instructionPanel.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #4CAF50;
                color: white;
                padding: 15px 25px;
                border-radius: 25px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 10001;
                font-family: Arial, sans-serif;
                font-size: 14px;
                text-align: center;
                pointer-events: auto;
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">
                    � Select ${type.charAt(0).toUpperCase() + type.slice(1)} Area
                </div>
                <div style="font-size: 12px; opacity: 0.9;">
                    Click and drag to select the area containing the ${type}
                </div>
                <button id="cancel-crop-selection" style="
                    background: #f44336;
                    color: white;
                    border: none;
                    padding: 5px 15px;
                    border-radius: 15px;
                    cursor: pointer;
                    margin-top: 8px;
                    font-size: 11px;
                ">Cancel</button>
            </div>
        `;

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.selectionBox);
        document.body.appendChild(instructionPanel);

        // Add cancel button listener
        document.getElementById('cancel-crop-selection').addEventListener('click', () => {
            this.stopSelection();
            chrome.runtime.sendMessage({ action: 'selectionCancelled' });
        });

        // Make overlay interactive for mouse events
        this.overlay.style.pointerEvents = 'auto';
    }

    handleMouseDown(event) {
        if (!this.isSelectionMode || event.target.id === 'cancel-crop-selection') return;
        
        event.preventDefault();
        event.stopPropagation();
        
        this.isDrawing = true;
        
        // Get mouse position relative to viewport
        const rect = document.documentElement.getBoundingClientRect();
        this.startX = event.clientX;
        this.startY = event.clientY;
        
        // Show selection box
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.left = this.startX + 'px';
        this.selectionBox.style.top = this.startY + 'px';
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
    }

    handleMouseMove(event) {
        if (!this.isSelectionMode || !this.isDrawing) return;
        
        event.preventDefault();
        
        this.currentX = event.clientX;
        this.currentY = event.clientY;
        
        // Calculate selection box dimensions
        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        
        // Update selection box
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
        
        // Update overlay to show selected area clearly
        this.updateOverlayMask(left, top, width, height);
    }

    handleMouseUp(event) {
        if (!this.isSelectionMode || !this.isDrawing) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        this.isDrawing = false;
        
        // Get final selection coordinates
        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        
        if (width > 10 && height > 10) { // Minimum selection size
            this.processSelection(left, top, width, height);
        } else {
            this.showMessage('Selection too small. Please select a larger area.');
            this.selectionBox.style.display = 'none';
        }
    }

    updateOverlayMask(left, top, width, height) {
        // Create a mask effect showing only the selected area clearly
        const maskPath = `
            polygon(
                0% 0%, 
                0% 100%, 
                ${left}px 100%, 
                ${left}px ${top}px, 
                ${left + width}px ${top}px, 
                ${left + width}px ${top + height}px, 
                ${left}px ${top + height}px, 
                ${left}px 100%, 
                100% 100%, 
                100% 0%
            )
        `;
        
        this.overlay.style.clipPath = maskPath;
        this.overlay.style.webkitClipPath = maskPath;
    }

    processSelection(left, top, width, height) {
        console.log(`Processing selection: ${left}, ${top}, ${width}x${height}`);
        
        // Convert viewport coordinates to document coordinates
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        const docLeft = left + scrollX;
        const docTop = top + scrollY;
        
        // Find all elements within the selected area
        const elementsInArea = this.getElementsInArea(docLeft, docTop, width, height);
        
        // Extract all content from the selected area
        const selectedContent = this.extractContentFromArea(elementsInArea, docLeft, docTop, width, height);
        
        // Store the selection with full content
        this.selectedAreas[this.currentSelectionType] = {
            bounds: { left: docLeft, top: docTop, width, height },
            content: selectedContent.rawText,
            structuredContent: selectedContent.structuredContent,
            elements: elementsInArea.length,
            type: this.currentSelectionType,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        // Create permanent highlight for this selection
        this.createPermanentHighlight(left, top, width, height, this.currentSelectionType);
        
        // Stop selection mode
        this.stopSelection();
        
        // Notify popup with full content for AI analysis
        chrome.runtime.sendMessage({
            action: 'areaSelected',
            type: this.currentSelectionType,
            data: this.selectedAreas[this.currentSelectionType],
            readyForAI: true
        });
        
        this.showMessage(`Content area selected! Ready for AI analysis.`);
    }

    getElementsInArea(left, top, width, height) {
        const elements = [];
        const allElements = document.querySelectorAll('*');
        
        for (const element of allElements) {
            const rect = element.getBoundingClientRect();
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            
            const elemLeft = rect.left + scrollX;
            const elemTop = rect.top + scrollY;
            const elemRight = elemLeft + rect.width;
            const elemBottom = elemTop + rect.height;
            
            // Check if element intersects with selected area
            if (!(elemRight < left || elemLeft > left + width ||
                  elemBottom < top || elemTop > top + height)) {
                elements.push(element);
            }
        }
        
        return elements;
    }

    extractContentFromArea(elements, left, top, width, height) {
        console.log(`[Content Extraction] Starting extraction for area: ${width}x${height} at ${left},${top}`);
        console.log(`[Content Extraction] Found ${elements.length} elements in area`);
        
        const contentParts = [];
        const seenTexts = new Set();
        
        // Sort elements by their position (top to bottom, left to right)
        elements.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            
            if (Math.abs(rectA.top - rectB.top) < 10) {
                return rectA.left - rectB.left;
            }
            return rectA.top - rectB.top;
        });
        
        console.log(`[Content Extraction] Processing ${elements.length} sorted elements`);
        
        for (const element of elements) {
            const text = element.textContent.trim();
            if (!text || seenTexts.has(text) || text.length < 3) continue;
            
            // Check if this is a leaf element (no child elements with text)
            const hasTextChildren = Array.from(element.children).some(child => 
                child.textContent.trim().length > 0
            );
            
            if (!hasTextChildren) {
                const rect = element.getBoundingClientRect();
                const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
                const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                
                contentParts.push({
                    text: text,
                    element: element.tagName,
                    position: { x: rect.left + scrollX, y: rect.top + scrollY },
                    styles: {
                        fontSize: window.getComputedStyle(element).fontSize,
                        fontWeight: window.getComputedStyle(element).fontWeight,
                        color: window.getComputedStyle(element).color
                    }
                });
                seenTexts.add(text);
                
                console.log(`[Content Extraction] Added text from ${element.tagName}: "${text.substring(0, 50)}..."`);
            }
        }
        
        // Combine all content with structure preserved
        const fullContent = contentParts.map(part => part.text).join('\n');
        
        console.log(`[Content Extraction] Final content length: ${fullContent.length} characters`);
        console.log(`[Content Extraction] Content preview:`, fullContent.substring(0, 300));
        console.log(`[Content Extraction] Structured parts:`, contentParts.length);
        
        const result = {
            rawText: fullContent,
            structuredContent: contentParts,
            totalElements: elements.length,
            area: { left, top, width, height },
            extractionTimestamp: Date.now()
        };
        
        // Store extraction log for debugging
        this.lastExtraction = {
            area: { left, top, width, height },
            elementsFound: elements.length,
            contentLength: fullContent.length,
            partsExtracted: contentParts.length,
            preview: fullContent.substring(0, 200),
            timestamp: Date.now()
        };
        
        console.log(`[Content Extraction] Extraction completed:`, this.lastExtraction);
        
        return result;
    }

    createPermanentHighlight(left, top, width, height, type) {
        const highlight = document.createElement('div');
        highlight.className = 'resume-ai-area-highlight';
        highlight.setAttribute('data-type', type);
        highlight.style.cssText = `
            position: fixed;
            left: ${left}px;
            top: ${top}px;
            width: ${width}px;
            height: ${height}px;
            border: 3px solid #4CAF50;
            background: rgba(76, 175, 80, 0.15);
            z-index: 9998;
            border-radius: 4px;
            cursor: move;
        `;
        
        // Add resize handles
        const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
        handles.forEach(handle => {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = `resize-handle resize-${handle}`;
            resizeHandle.style.cssText = this.getResizeHandleStyle(handle);
            highlight.appendChild(resizeHandle);
        });
        
        // Add label
        const label = document.createElement('div');
        label.textContent = type.toUpperCase();
        label.style.cssText = `
            position: absolute;
            top: -25px;
            left: 0;
            background: #4CAF50;
            color: white;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: bold;
            border-radius: 3px;
            font-family: Arial, sans-serif;
            pointer-events: none;
        `;
        
        // Add edit/delete buttons
        const editButton = document.createElement('button');
        editButton.textContent = '✏️';
        editButton.className = 'edit-selection-btn';
        editButton.style.cssText = `
            position: absolute;
            top: -25px;
            right: 25px;
            background: #2196F3;
            color: white;
            border: none;
            padding: 2px 6px;
            font-size: 10px;
            border-radius: 3px;
            cursor: pointer;
        `;
        editButton.onclick = (e) => {
            e.stopPropagation();
            this.editSelection(highlight, type);
        };
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '❌';
        deleteButton.className = 'delete-selection-btn';
        deleteButton.style.cssText = `
            position: absolute;
            top: -25px;
            right: 0;
            background: #f44336;
            color: white;
            border: none;
            padding: 2px 6px;
            font-size: 10px;
            border-radius: 3px;
            cursor: pointer;
        `;
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            this.deleteSelection(highlight, type);
        };
        
        highlight.appendChild(label);
        highlight.appendChild(editButton);
        highlight.appendChild(deleteButton);
        
        // Make draggable
        this.makeDraggable(highlight, type);
        
        // Make resizable
        this.makeResizable(highlight, type);
        
        document.body.appendChild(highlight);
    }

    stopSelection() {
        this.isSelectionMode = false;
        this.isDrawing = false;
        this.currentSelectionType = null;
        
        // Remove overlays
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
        
        // Remove instruction panel
        const instructionPanel = document.querySelector('div[style*="transform: translateX(-50%)"]');
        if (instructionPanel) {
            instructionPanel.remove();
        }
        
        // Remove event listeners
        document.removeEventListener('mousedown', this.handleMouseDown.bind(this), true);
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this), true);
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this), true);
        
        // Reset styles
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    }

    extractSelectedData() {
        const jobData = {
            title: '',
            company: '',
            description: '',
            requirements: '',
            location: '',
            salary: '',
            url: window.location.href,
            extractedAt: new Date().toISOString(),
            extractionMethod: 'Area_Selection'
        };

        for (const [type, data] of Object.entries(this.selectedAreas)) {
            if (data && data.content) {
                jobData[type] = data.content.trim();
            }
        }

        return jobData;
    }

    clearAllSelections() {
        // Remove all highlights
        document.querySelectorAll('.resume-ai-area-highlight').forEach(highlight => {
            highlight.remove();
        });
        
        // Clear selection data
        this.selectedAreas = {
            title: null,
            company: null,
            description: null,
            requirements: null,
            location: null,
            salary: null
        };
        
        console.log('All area selections cleared');
    }

    showMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10002;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // Method to allow users to modify/realign selections
    enableSelectionModification(type) {
        const existingHighlight = document.querySelector(`[data-type="${type}"]`);
        if (existingHighlight) {
            // Remove existing highlight
            existingHighlight.remove();
            
            // Clear stored data for this type
            delete this.selectedAreas[type];
            
            // Start new selection for this type
            this.startAreaSelection(type);
            
            this.showMessage(`Modify ${type} selection - drag to select new area`);
        }
    }

    // Method to get all selected content for AI analysis
    getAllSelectedContent() {
        console.log('[Get All Content] Starting content collection...');
        console.log('[Get All Content] Available selections:', Object.keys(this.selectedAreas));
        
        const allContent = [];
        let totalContentLength = 0;
        
        Object.entries(this.selectedAreas).forEach(([type, data]) => {
            if (data && data.content) {
                console.log(`[Get All Content] Processing ${type}:`, {
                    contentLength: data.content.length,
                    elementsCount: data.elements,
                    preview: data.content.substring(0, 100) + '...'
                });
                
                allContent.push({
                    type: type,
                    content: data.content,
                    structuredContent: data.structuredContent,
                    bounds: data.bounds,
                    url: data.url,
                    timestamp: data.timestamp,
                    elementsCount: data.elements
                });
                
                totalContentLength += data.content.length;
            } else {
                console.log(`[Get All Content] Skipping ${type} - no content`);
            }
        });
        
        const combinedText = allContent.map(item => {
            return `=== ${item.type.toUpperCase()} ===\n${item.content}\n`;
        }).join('\n');
        
        const result = {
            totalSelections: allContent.length,
            content: allContent,
            combinedText: combinedText,
            totalContentLength: totalContentLength,
            pageUrl: window.location.href,
            pageTitle: document.title,
            extractionTimestamp: Date.now()
        };
        
        console.log('[Get All Content] Final result:', {
            totalSelections: result.totalSelections,
            totalContentLength: result.totalContentLength,
            combinedTextPreview: result.combinedText.substring(0, 300) + '...'
        });
        
        // Store for debugging
        this.lastContentCollection = result;
        
        return result;
    }

    // Method to preview selection before sending to AI
    previewSelection(type) {
        const selection = this.selectedAreas[type];
        if (!selection) return null;
        
        return {
            type: type,
            contentLength: selection.content.length,
            preview: selection.content.substring(0, 200) + (selection.content.length > 200 ? '...' : ''),
            elementCount: selection.elements,
            bounds: selection.bounds
        };
    }

    // Method to highlight specific selection for review
    highlightSelectionForReview(type) {
        // Remove any existing review highlights
        document.querySelectorAll('.resume-ai-review-highlight').forEach(el => el.remove());
        
        const selection = this.selectedAreas[type];
        if (!selection) return;
        
        const { left, top, width, height } = selection.bounds;
        
        // Convert document coordinates back to viewport coordinates
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        const viewportLeft = left - scrollX;
        const viewportTop = top - scrollY;
        
        const reviewHighlight = document.createElement('div');
        reviewHighlight.className = 'resume-ai-review-highlight';
        reviewHighlight.style.cssText = `
            position: fixed;
            left: ${viewportLeft}px;
            top: ${viewportTop}px;
            width: ${width}px;
            height: ${height}px;
            border: 4px solid #FF9800;
            background: rgba(255, 152, 0, 0.2);
            pointer-events: none;
            z-index: 10001;
            border-radius: 6px;
            animation: pulse 1s infinite;
        `;
        
        document.body.appendChild(reviewHighlight);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            reviewHighlight.remove();
        }, 3000);
    }

    // Method to get resize handle styles
    getResizeHandleStyle(handle) {
        const baseStyle = `
            position: absolute;
            background: #4CAF50;
            border: 1px solid white;
            z-index: 10002;
        `;
        
        switch(handle) {
            case 'nw':
                return baseStyle + `
                    top: -4px; left: -4px;
                    width: 8px; height: 8px;
                    cursor: nw-resize;
                `;
            case 'ne':
                return baseStyle + `
                    top: -4px; right: -4px;
                    width: 8px; height: 8px;
                    cursor: ne-resize;
                `;
            case 'sw':
                return baseStyle + `
                    bottom: -4px; left: -4px;
                    width: 8px; height: 8px;
                    cursor: sw-resize;
                `;
            case 'se':
                return baseStyle + `
                    bottom: -4px; right: -4px;
                    width: 8px; height: 8px;
                    cursor: se-resize;
                `;
            case 'n':
                return baseStyle + `
                    top: -4px; left: 50%; transform: translateX(-50%);
                    width: 8px; height: 8px;
                    cursor: n-resize;
                `;
            case 's':
                return baseStyle + `
                    bottom: -4px; left: 50%; transform: translateX(-50%);
                    width: 8px; height: 8px;
                    cursor: s-resize;
                `;
            case 'e':
                return baseStyle + `
                    top: 50%; right: -4px; transform: translateY(-50%);
                    width: 8px; height: 8px;
                    cursor: e-resize;
                `;
            case 'w':
                return baseStyle + `
                    top: 50%; left: -4px; transform: translateY(-50%);
                    width: 8px; height: 8px;
                    cursor: w-resize;
                `;
        }
    }

    // Make selection draggable
    makeDraggable(element, type) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        
        element.addEventListener('mousedown', (e) => {
            if (e.target.className.includes('resize-handle') || 
                e.target.className.includes('btn')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = parseInt(element.style.left);
            initialTop = parseInt(element.style.top);
            
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
            e.preventDefault();
        });
        
        const onDrag = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = initialLeft + deltaX;
            const newTop = initialTop + deltaY;
            
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            
            console.log(`[Drag] ${type} moved to: ${newLeft}, ${newTop}`);
        };
        
        const stopDrag = () => {
            if (isDragging) {
                isDragging = false;
                this.updateSelectionData(element, type);
                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mouseup', stopDrag);
                console.log(`[Drag] ${type} drag completed`);
            }
        };
    }

    // Make selection resizable
    makeResizable(element, type) {
        const handles = element.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            let isResizing = false;
            let startX, startY, startWidth, startHeight, startLeft, startTop;
            const handleType = handle.className.split(' ')[1].replace('resize-', '');
            
            handle.addEventListener('mousedown', (e) => {
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseInt(element.style.width);
                startHeight = parseInt(element.style.height);
                startLeft = parseInt(element.style.left);
                startTop = parseInt(element.style.top);
                
                document.addEventListener('mousemove', onResize);
                document.addEventListener('mouseup', stopResize);
                e.preventDefault();
                e.stopPropagation();
            });
            
            const onResize = (e) => {
                if (!isResizing) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                
                // Handle different resize directions
                if (handleType.includes('e')) {
                    newWidth = startWidth + deltaX;
                }
                if (handleType.includes('w')) {
                    newWidth = startWidth - deltaX;
                    newLeft = startLeft + deltaX;
                }
                if (handleType.includes('s')) {
                    newHeight = startHeight + deltaY;
                }
                if (handleType.includes('n')) {
                    newHeight = startHeight - deltaY;
                    newTop = startTop + deltaY;
                }
                
                // Minimum size constraints
                if (newWidth < 20) newWidth = 20;
                if (newHeight < 20) newHeight = 20;
                
                element.style.width = newWidth + 'px';
                element.style.height = newHeight + 'px';
                element.style.left = newLeft + 'px';
                element.style.top = newTop + 'px';
                
                console.log(`[Resize] ${type} resized to: ${newWidth}x${newHeight} at ${newLeft}, ${newTop}`);
            };
            
            const stopResize = () => {
                if (isResizing) {
                    isResizing = false;
                    this.updateSelectionData(element, type);
                    document.removeEventListener('mousemove', onResize);
                    document.removeEventListener('mouseup', stopResize);
                    console.log(`[Resize] ${type} resize completed`);
                }
            };
        });
    }

    // Update selection data after drag/resize
    updateSelectionData(element, type) {
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        const left = parseInt(element.style.left) + scrollX;
        const top = parseInt(element.style.top) + scrollY;
        const width = parseInt(element.style.width);
        const height = parseInt(element.style.height);
        
        console.log(`[Update] ${type} selection updated:`, { left, top, width, height });
        
        // Re-extract content from new position
        const elementsInArea = this.getElementsInArea(left, top, width, height);
        const selectedContent = this.extractContentFromArea(elementsInArea, left, top, width, height);
        
        console.log(`[Update] ${type} content re-extracted:`, selectedContent.rawText.substring(0, 200) + '...');
        
        // Update stored selection
        this.selectedAreas[type] = {
            bounds: { left, top, width, height },
            content: selectedContent.rawText,
            structuredContent: selectedContent.structuredContent,
            elements: elementsInArea.length,
            type: type,
            timestamp: Date.now(),
            url: window.location.href
        };
    }

    // Edit selection (re-enable selection mode)
    editSelection(element, type) {
        console.log(`[Edit] Starting edit mode for ${type}`);
        element.remove();
        delete this.selectedAreas[type];
        this.startAreaSelection(type);
    }

    // Delete selection
    deleteSelection(element, type) {
        console.log(`[Delete] Removing selection ${type}`);
        element.remove();
        delete this.selectedAreas[type];
        
        chrome.runtime.sendMessage({
            action: 'selectionDeleted',
            type: type
        });
    }

    // Debug and testing methods
    getDebugInfo() {
        return {
            currentSelections: Object.keys(this.selectedAreas),
            selectionsData: this.selectedAreas,
            lastExtraction: this.lastExtraction,
            lastContentCollection: this.lastContentCollection,
            pageInfo: {
                url: window.location.href,
                title: document.title,
                totalElements: document.querySelectorAll('*').length
            }
        };
    }

    testContentExtraction() {
        // Test extraction on entire visible area
        const viewport = {
            left: window.pageXOffset,
            top: window.pageYOffset,
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        console.log('[Test] Testing content extraction on viewport:', viewport);
        
        const elements = this.getElementsInArea(
            viewport.left, 
            viewport.top, 
            viewport.width, 
            viewport.height
        );
        
        console.log(`[Test] Found ${elements.length} elements in viewport`);
        
        const extraction = this.extractContentFromArea(
            elements, 
            viewport.left, 
            viewport.top, 
            viewport.width, 
            viewport.height
        );
        
        return {
            viewport: viewport,
            elementsFound: elements.length,
            contentLength: extraction.rawText.length,
            structuredParts: extraction.structuredContent.length,
            preview: extraction.rawText.substring(0, 500),
            success: extraction.rawText.length > 0
        };
    }

    // Method to manually trigger content extraction for debugging
    debugSelection(type = 'debug') {
        if (!this.selectedAreas[type]) {
            console.log('[Debug] No selection found for type:', type);
            return null;
        }
        
        const selection = this.selectedAreas[type];
        console.log('[Debug] Debug extraction for:', type, selection.bounds);
        
        const elements = this.getElementsInArea(
            selection.bounds.left,
            selection.bounds.top,
            selection.bounds.width,
            selection.bounds.height
        );
        
        const extraction = this.extractContentFromArea(
            elements,
            selection.bounds.left,
            selection.bounds.top,
            selection.bounds.width,
            selection.bounds.height
        );
        
        console.log('[Debug] Fresh extraction result:', extraction);
        return extraction;
    }

    // Method to select entire viewport automatically
    selectEntireViewport() {
        console.log('[Viewport Selection] Starting automatic viewport selection...');
        
        // Get viewport dimensions
        const viewportLeft = window.pageXOffset;
        const viewportTop = window.pageYOffset;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        console.log('[Viewport Selection] Viewport bounds:', {
            left: viewportLeft,
            top: viewportTop,
            width: viewportWidth,
            height: viewportHeight
        });
        
        // Create selection for entire viewport
        this.createViewportSelection(viewportLeft, viewportTop, viewportWidth, viewportHeight, 'viewport');
        
        this.showMessage('Entire viewport selected for job extraction!');
    }

    // Method to select full page content
    selectFullPage() {
        console.log('[Full Page Selection] Starting full page selection...');
        
        // Get full page dimensions
        const pageWidth = Math.max(
            document.body.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.clientWidth,
            document.documentElement.scrollWidth,
            document.documentElement.offsetWidth
        );
        
        const pageHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        
        console.log('[Full Page Selection] Page dimensions:', {
            width: pageWidth,
            height: pageHeight
        });
        
        // Create selection for entire page
        this.createViewportSelection(0, 0, pageWidth, pageHeight, 'fullpage');
        
        this.showMessage('Entire page selected for job extraction!');
    }

    // Create viewport or full page selection
    createViewportSelection(left, top, width, height, type) {
        console.log(`[${type} Selection] Creating selection:`, { left, top, width, height });
        
        // Find all elements in the area
        const elementsInArea = this.getElementsInArea(left, top, width, height);
        console.log(`[${type} Selection] Found ${elementsInArea.length} elements`);
        
        // Extract content from the area
        const selectedContent = this.extractContentFromArea(elementsInArea, left, top, width, height);
        console.log(`[${type} Selection] Extracted ${selectedContent.rawText.length} characters`);
        
        // Store the selection
        this.selectedAreas[type] = {
            bounds: { left, top, width, height },
            content: selectedContent.rawText,
            structuredContent: selectedContent.structuredContent,
            elements: elementsInArea.length,
            type: type,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        // Create visual highlight for viewport (only show viewport portion)
        const viewportLeft = window.pageXOffset;
        const viewportTop = window.pageYOffset;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        this.createSpecialHighlight(
            viewportLeft, 
            viewportTop, 
            viewportWidth, 
            viewportHeight, 
            type
        );
        
        // Notify popup
        chrome.runtime.sendMessage({
            action: 'areaSelected',
            type: type,
            data: this.selectedAreas[type],
            readyForAI: true,
            autoSelected: true
        });
        
        console.log(`[${type} Selection] Selection completed and stored`);
    }

    // Create special highlight for viewport/full page selections
    createSpecialHighlight(left, top, width, height, type) {
        // Remove any existing highlights of this type
        document.querySelectorAll(`[data-type="${type}"]`).forEach(el => el.remove());
        
        const highlight = document.createElement('div');
        highlight.className = 'resume-ai-area-highlight';
        highlight.setAttribute('data-type', type);
        
        const color = type === 'viewport' ? '#FF9800' : '#9C27B0'; // Orange for viewport, Purple for full page
        const label = type === 'viewport' ? 'VIEWPORT' : 'FULL PAGE';
        
        highlight.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            border: 4px solid ${color};
            background: rgba(${type === 'viewport' ? '255, 152, 0' : '156, 39, 176'}, 0.1);
            z-index: 9998;
            border-radius: 8px;
            cursor: move;
            pointer-events: auto;
        `;
        
        // Add label
        const labelEl = document.createElement('div');
        labelEl.textContent = label + ' SELECTED';
        labelEl.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: ${color};
            color: white;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            pointer-events: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        
        // Add clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = '✕ Clear';
        clearButton.className = 'clear-viewport-btn';
        clearButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #f44336;
            color: white;
            border: none;
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 4px;
            cursor: pointer;
        `;
        clearButton.onclick = (e) => {
            e.stopPropagation();
            this.deleteSelection(highlight, type);
        };
        
        // Add content info
        const infoEl = document.createElement('div');
        const selection = this.selectedAreas[type];
        infoEl.innerHTML = `
            <strong>Content Length:</strong> ${selection.content.length} chars<br>
            <strong>Elements:</strong> ${selection.elements}<br>
            <strong>Ready for AI Analysis</strong>
        `;
        infoEl.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 16px;
            font-size: 11px;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            pointer-events: none;
            text-align: center;
        `;
        
        highlight.appendChild(labelEl);
        highlight.appendChild(clearButton);
        highlight.appendChild(infoEl);
        
        document.body.appendChild(highlight);
        
        // Auto-hide after 5 seconds but keep selection data
        setTimeout(() => {
            if (highlight.parentNode) {
                highlight.style.opacity = '0.3';
                highlight.style.pointerEvents = 'none';
            }
        }, 5000);
        
        console.log(`[${type} Selection] Visual highlight created`);
    }

    // Scroll-based Selection Methods
    startScrollSelection() {
        console.log('[Scroll Selection] Starting scroll-based selection...');
        
        if (this.isScrollSelecting) {
            this.stopScrollSelection();
        }
        
        this.isScrollSelecting = true;
        this.scrollContent = new Set();
        this.scrollStartPosition = window.pageYOffset;
        
        // Create initial viewport selection
        const viewportBounds = {
            left: window.pageXOffset,
            top: window.pageYOffset,
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        this.scrollSelectionBounds = {
            left: viewportBounds.left,
            top: viewportBounds.top,
            width: viewportBounds.width,
            height: viewportBounds.height,
            bottom: viewportBounds.top + viewportBounds.height
        };
        
        // Create scroll highlight
        this.createScrollHighlight();
        
        // Add initial viewport content
        this.addViewportContentToScrollSelection();
        
        // Add scroll listener
        this.scrollListener = this.handleScroll.bind(this);
        window.addEventListener('scroll', this.scrollListener, { passive: true });
        
        // Add wheel listener for better scroll detection
        this.wheelListener = this.handleWheel.bind(this);
        window.addEventListener('wheel', this.wheelListener, { passive: true });
        
        this.showMessage('Scroll Selection Active! Scroll to extend selection area.');
        
        console.log('[Scroll Selection] Initial bounds:', this.scrollSelectionBounds);
    }

    handleScroll() {
        if (!this.isScrollSelecting) return;
        
        const currentScrollY = window.pageYOffset;
        const viewportHeight = window.innerHeight;
        const currentViewportTop = currentScrollY;
        const currentViewportBottom = currentScrollY + viewportHeight;
        
        console.log(`[Scroll] Current position: ${currentScrollY}, Viewport: ${currentViewportTop}-${currentViewportBottom}`);
        
        // Extend selection bounds based on scroll direction
        let boundsChanged = false;
        
        if (currentViewportTop < this.scrollSelectionBounds.top) {
            // Scrolled up - extend selection upward
            this.scrollSelectionBounds.top = currentViewportTop;
            boundsChanged = true;
            console.log('[Scroll] Extended selection upward to:', currentViewportTop);
        }
        
        if (currentViewportBottom > this.scrollSelectionBounds.bottom) {
            // Scrolled down - extend selection downward
            this.scrollSelectionBounds.bottom = currentViewportBottom;
            boundsChanged = true;
            console.log('[Scroll] Extended selection downward to:', currentViewportBottom);
        }
        
        // Update height
        this.scrollSelectionBounds.height = this.scrollSelectionBounds.bottom - this.scrollSelectionBounds.top;
        
        if (boundsChanged) {
            // Add new content from extended area
            this.addNewContentToScrollSelection();
            
            // Update visual highlight
            this.updateScrollHighlight();
            
            console.log('[Scroll] Updated bounds:', this.scrollSelectionBounds);
            console.log('[Scroll] Total content pieces:', this.scrollContent.size);
        }
    }

    handleWheel(event) {
        if (!this.isScrollSelecting) return;
        
        // Provide visual feedback during scrolling
        if (this.scrollHighlight) {
            this.scrollHighlight.style.opacity = '0.8';
            
            clearTimeout(this.wheelTimeout);
            this.wheelTimeout = setTimeout(() => {
                if (this.scrollHighlight) {
                    this.scrollHighlight.style.opacity = '0.4';
                }
            }, 500);
        }
    }

    addViewportContentToScrollSelection() {
        const viewport = {
            left: window.pageXOffset,
            top: window.pageYOffset,
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        const elements = this.getElementsInArea(
            viewport.left,
            viewport.top,
            viewport.width,
            viewport.height
        );
        
        console.log(`[Scroll] Adding initial viewport content: ${elements.length} elements`);
        
        elements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && text.length > 3) {
                this.scrollContent.add(text);
            }
        });
    }

    addNewContentToScrollSelection() {
        // Get elements in the extended bounds
        const elements = this.getElementsInArea(
            this.scrollSelectionBounds.left,
            this.scrollSelectionBounds.top,
            this.scrollSelectionBounds.width,
            this.scrollSelectionBounds.height
        );
        
        let newContentCount = 0;
        
        elements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && text.length > 3 && !this.scrollContent.has(text)) {
                this.scrollContent.add(text);
                newContentCount++;
            }
        });
        
        console.log(`[Scroll] Added ${newContentCount} new content pieces, total: ${this.scrollContent.size}`);
        
        // Update message with content count
        if (newContentCount > 0) {
            this.showScrollMessage(`Content Extended! Total: ${this.scrollContent.size} pieces`);
        }
    }

    createScrollHighlight() {
        // Remove existing scroll highlight
        if (this.scrollHighlight) {
            this.scrollHighlight.remove();
        }
        
        this.scrollHighlight = document.createElement('div');
        this.scrollHighlight.className = 'resume-ai-scroll-highlight';
        this.scrollHighlight.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            border: 3px solid #2196F3;
            background: rgba(33, 150, 243, 0.1);
            z-index: 9997;
            pointer-events: none;
            border-radius: 8px;
            opacity: 0.4;
        `;
        
        // Add scroll indicator
        const indicator = document.createElement('div');
        indicator.innerHTML = `
            <div style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); 
                        background: #2196F3; color: white; padding: 8px 16px; 
                        border-radius: 20px; font-size: 12px; font-weight: bold;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                📜 SCROLL SELECTION ACTIVE - Scroll to extend!
            </div>
        `;
        
        // Add content counter
        this.scrollCounter = document.createElement('div');
        this.scrollCounter.style.cssText = `
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(33, 150, 243, 0.9);
            color: white;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 11px;
            font-weight: bold;
        `;
        this.updateScrollCounter();
        
        // Add stop button
        const stopButton = document.createElement('button');
        stopButton.textContent = '✓ Stop & Extract';
        stopButton.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        stopButton.onclick = () => this.stopScrollSelection();
        
        this.scrollHighlight.appendChild(indicator);
        this.scrollHighlight.appendChild(this.scrollCounter);
        this.scrollHighlight.appendChild(stopButton);
        
        document.body.appendChild(this.scrollHighlight);
    }

    updateScrollHighlight() {
        if (!this.scrollHighlight) return;
        
        // Keep highlight covering viewport
        this.scrollHighlight.style.opacity = '0.6';
        this.updateScrollCounter();
        
        // Brief flash to show extension
        setTimeout(() => {
            if (this.scrollHighlight) {
                this.scrollHighlight.style.opacity = '0.4';
            }
        }, 200);
    }

    updateScrollCounter() {
        if (this.scrollCounter) {
            const height = Math.round(this.scrollSelectionBounds.height);
            this.scrollCounter.textContent = `${this.scrollContent.size} pieces | ${height}px tall`;
        }
    }

    stopScrollSelection() {
        if (!this.isScrollSelecting) return;
        
        console.log('[Scroll Selection] Stopping scroll selection...');
        
        this.isScrollSelecting = false;
        
        // Remove listeners
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        
        if (this.wheelListener) {
            window.removeEventListener('wheel', this.wheelListener);
            this.wheelListener = null;
        }
        
        // Combine all collected content
        const combinedContent = Array.from(this.scrollContent).join('\n');
        
        console.log('[Scroll Selection] Final content length:', combinedContent.length);
        console.log('[Scroll Selection] Content pieces:', this.scrollContent.size);
        console.log('[Scroll Selection] Final bounds:', this.scrollSelectionBounds);
        
        // Store the selection
        this.selectedAreas['scroll'] = {
            bounds: this.scrollSelectionBounds,
            content: combinedContent,
            structuredContent: Array.from(this.scrollContent).map((text, index) => ({
                text: text,
                element: 'MIXED',
                position: { x: 0, y: index * 20 },
                styles: {}
            })),
            elements: this.scrollContent.size,
            type: 'scroll',
            timestamp: Date.now(),
            url: window.location.href
        };
        
        // Remove visual highlight
        if (this.scrollHighlight) {
            this.scrollHighlight.remove();
            this.scrollHighlight = null;
        }
        
        // Notify popup
        chrome.runtime.sendMessage({
            action: 'areaSelected',
            type: 'scroll',
            data: this.selectedAreas['scroll'],
            readyForAI: true,
            autoSelected: true
        });
        
        this.showMessage(`Scroll Selection Complete! ${combinedContent.length} characters captured.`);
        
        // Reset scroll selection data
        this.scrollContent = new Set();
        this.scrollSelectionBounds = null;
    }

    showScrollMessage(message) {
        // Remove existing scroll message
        const existing = document.querySelector('.scroll-message');
        if (existing) existing.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'scroll-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #2196F3;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            font-weight: bold;
            z-index: 10003;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 2000);
    }

    // Cursor-based Selection Methods
    startCursorSelection() {
        console.log('[Cursor Selection] Starting cursor-based selection...');
        
        try {
            console.log('[Cursor Selection] Step 1: Checking existing selection...');
            if (this.isCursorSelecting) {
                console.log('[Cursor Selection] Already selecting, stopping previous session');
                this.stopCursorSelection();
            }
            
            console.log('[Cursor Selection] Step 2: Initializing properties...');
            this.isCursorSelecting = true;
            this.cursorSelectedElements = new Set();
            this.cursorContent = new Set();
            this.cursorHighlights = new Map();
            
            console.log('[Cursor Selection] Step 3: Adding cursor selection styles...');
            try {
                this.addCursorSelectionStyles();
                console.log('[Cursor Selection] ✅ Styles added successfully');
            } catch (styleError) {
                console.error('[Cursor Selection] ❌ Error adding styles:', styleError);
                throw new Error(`Style error: ${styleError.message}`);
            }
            
            console.log('[Cursor Selection] Step 4: Setting up event listeners...');
            try {
                // Add event listeners
                this.cursorMoveListener = this.handleCursorMove.bind(this);
                this.cursorClickListener = this.handleCursorClick.bind(this);
                this.cursorKeyListener = this.handleCursorKey.bind(this);
                
                document.addEventListener('mousemove', this.cursorMoveListener, true);
                document.addEventListener('click', this.cursorClickListener, true);
                document.addEventListener('keydown', this.cursorKeyListener, true);
                console.log('[Cursor Selection] ✅ Event listeners added successfully');
            } catch (listenerError) {
                console.error('[Cursor Selection] ❌ Error adding event listeners:', listenerError);
                throw new Error(`Event listener error: ${listenerError.message}`);
            }
            
            console.log('[Cursor Selection] Step 5: Creating cursor selection UI...');
            try {
                this.createCursorSelectionUI();
                console.log('[Cursor Selection] ✅ UI created successfully');
            } catch (uiError) {
                console.error('[Cursor Selection] ❌ Error creating UI:', uiError);
                throw new Error(`UI creation error: ${uiError.message}`);
            }
            
            console.log('[Cursor Selection] Step 6: Showing message...');
            try {
                this.showMessage('Cursor Selection Active! Hover to preview, click to select elements.');
                console.log('[Cursor Selection] ✅ Message shown successfully');
            } catch (messageError) {
                console.error('[Cursor Selection] ❌ Error showing message:', messageError);
                // Don't throw for message error, it's not critical
                console.log('[Cursor Selection] Continuing without message...');
            }
            
            console.log('[Cursor Selection] ✅ Cursor selection started successfully');
        } catch (error) {
            console.error('[Cursor Selection] ❌ Error starting cursor selection:', error);
            console.error('[Cursor Selection] Error name:', error.name);
            console.error('[Cursor Selection] Error message:', error.message);
            console.error('[Cursor Selection] Error stack:', error.stack);
            this.isCursorSelecting = false;
            
            // Clean up any partial state
            try {
                this.stopCursorSelection();
            } catch (cleanupError) {
                console.error('[Cursor Selection] Error during cleanup:', cleanupError);
            }
            
            throw error;
        }
    }

    addCursorSelectionStyles() {
        if (document.getElementById('cursor-selection-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'cursor-selection-styles';
        style.textContent = `
            .cursor-hover-highlight {
                outline: 2px solid #FF5722 !important;
                outline-offset: 2px !important;
                background: rgba(255, 87, 34, 0.1) !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
            }
            
            .cursor-selected-highlight {
                outline: 3px solid #4CAF50 !important;
                outline-offset: 2px !important;
                background: rgba(76, 175, 80, 0.2) !important;
                position: relative !important;
            }
            
            .cursor-selected-highlight::after {
                content: "✓";
                position: absolute !important;
                top: -8px !important;
                right: -8px !important;
                background: #4CAF50 !important;
                color: white !important;
                width: 16px !important;
                height: 16px !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 10px !important;
                font-weight: bold !important;
                z-index: 10001 !important;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(-50%) translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes bounceIn {
                0% {
                    transform: translate(-50%, -50%) scale(0.3);
                    opacity: 0;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.05);
                    opacity: 1;
                }
                70% {
                    transform: translate(-50%, -50%) scale(0.9);
                }
                100% {
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            @keyframes fadeOut {
                from {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.95);
                }
            }
        `;
        document.head.appendChild(style);
    }

    handleCursorMove(event) {
        if (!this.isCursorSelecting) return;
        
        // Defensive check for event and target
        if (!event || !event.target) {
            console.warn('[Cursor Selection] Invalid event or missing target in handleCursorMove');
            return;
        }
        
        const element = event.target;
        
        // Additional safety check
        if (!element || typeof element !== 'object') {
            console.warn('[Cursor Selection] Invalid element in handleCursorMove:', element);
            return;
        }
        
        // Skip if same element or already selected
        if (element === this.lastHoveredElement || this.cursorSelectedElements.has(element)) {
            return;
        }
        
        // Remove previous hover highlight
        if (this.lastHoveredElement && !this.cursorSelectedElements.has(this.lastHoveredElement)) {
            try {
                this.lastHoveredElement.classList.remove('cursor-hover-highlight');
            } catch (error) {
                console.warn('[Cursor Selection] Error removing hover highlight:', error);
            }
        }
        
        // Skip certain elements
        try {
            if (this.shouldSkipElement(element)) {
                this.lastHoveredElement = null;
                return;
            }
        } catch (error) {
            console.error('[Cursor Selection] Error in shouldSkipElement call:', error);
            this.lastHoveredElement = null;
            return;
        }
        
        // Add hover highlight
        try {
            element.classList.add('cursor-hover-highlight');
            this.lastHoveredElement = element;
        } catch (error) {
            console.warn('[Cursor Selection] Error adding hover highlight:', error);
            return;
        }
        
        // Show element info
        try {
            this.showElementInfo(element, event.clientX, event.clientY);
        } catch (error) {
            console.warn('[Cursor Selection] Error showing element info:', error);
        }
    }

    handleCursorClick(event) {
        if (!this.isCursorSelecting) return;
        
        // Defensive checks
        if (!event || !event.target) {
            console.warn('[Cursor Selection] Invalid event or missing target in handleCursorClick');
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const element = event.target;
        
        // Additional safety check
        if (!element || typeof element !== 'object') {
            console.warn('[Cursor Selection] Invalid element in handleCursorClick:', element);
            return;
        }
        
        // Safe call to shouldSkipElement
        try {
            if (this.shouldSkipElement(element)) return;
        } catch (error) {
            console.error('[Cursor Selection] Error in shouldSkipElement call from handleCursorClick:', error);
            return;
        }
        
        // Toggle selection
        if (this.cursorSelectedElements.has(element)) {
            // Deselect
            this.deselectElement(element);
        } else {
            // Select
            this.selectElement(element);
        }
        
        this.updateCursorSelectionCounter();
    }

    handleCursorKey(event) {
        if (!this.isCursorSelecting) return;
        
        if (event.key === 'Escape') {
            this.stopCursorSelection();
        } else if (event.key === 'Enter') {
            this.finishCursorSelection();
        } else if (event.key === 'c' && event.ctrlKey) {
            this.clearCursorSelections();
        }
    }

    shouldSkipElement(element) {
        // Defensive check for null/undefined element
        if (!element) {
            console.warn('[Cursor Selection] shouldSkipElement called with null/undefined element');
            return true;
        }
        
        // Defensive check for element properties
        if (!element.tagName) {
            console.warn('[Cursor Selection] Element has no tagName:', element);
            return true;
        }
        
        try {
            const skipTags = ['HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'META', 'LINK'];
            const skipClasses = ['cursor-selection-ui', 'cursor-element-info', 'resume-ai'];
            
            if (skipTags.includes(element.tagName)) return true;
            if (skipClasses.some(cls => element.className && element.className.includes && element.className.includes(cls))) return true;
            if (!element.textContent || element.textContent.trim().length < 3) return true;
            
            return false;
        } catch (error) {
            console.error('[Cursor Selection] Error in shouldSkipElement:', error);
            console.error('[Cursor Selection] Element causing error:', element);
            return true; // Skip elements that cause errors
        }
    }

    selectElement(element) {
        console.log('[Cursor] Selecting element:', element.tagName, element.textContent.substring(0, 50));
        
        // Remove hover highlight
        element.classList.remove('cursor-hover-highlight');
        
        // Add selected highlight
        element.classList.add('cursor-selected-highlight');
        
        // Store element and content
        this.cursorSelectedElements.add(element);
        const content = element.textContent.trim();
        if (content && content.length > 0) {
            this.cursorContent.add(content);
        }
        
        this.showCursorMessage(`Selected: ${element.tagName} (${content.length} chars)`);
    }

    deselectElement(element) {
        console.log('[Cursor] Deselecting element:', element.tagName);
        
        // Remove selected highlight
        element.classList.remove('cursor-selected-highlight');
        
        // Remove from sets
        this.cursorSelectedElements.delete(element);
        const content = element.textContent.trim();
        this.cursorContent.delete(content);
        
        this.showCursorMessage(`Deselected: ${element.tagName}`);
    }

    showElementInfo(element, x, y) {
        // Remove existing info
        const existing = document.querySelector('.cursor-element-info');
        if (existing) existing.remove();
        
        const info = document.createElement('div');
        info.className = 'cursor-element-info';
        info.style.cssText = `
            position: fixed;
            left: ${x + 10}px;
            top: ${y - 30}px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-family: Arial, sans-serif;
            z-index: 10002;
            pointer-events: none;
            white-space: nowrap;
            max-width: 200px;
            overflow: hidden;
        `;
        
        const content = element.textContent.trim();
        const preview = content.length > 30 ? content.substring(0, 30) + '...' : content;
        info.textContent = `${element.tagName}: "${preview}" (${content.length} chars)`;
        
        document.body.appendChild(info);
        
        // Auto-remove
        setTimeout(() => {
            if (info.parentNode) info.remove();
        }, 2000);
    }

    createCursorSelectionUI() {
        // Remove existing UI
        const existing = document.querySelector('.cursor-selection-ui');
        if (existing) existing.remove();
        
        const ui = document.createElement('div');
        ui.className = 'cursor-selection-ui';
        ui.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 87, 34, 0.95);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 10003;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 15px;
        `;
        
        ui.innerHTML = `
            <span>👆 CURSOR SELECTION</span>
            <span class="cursor-counter">0 selected</span>
            <button class="cursor-finish-btn" style="
                background: #4CAF50; border: none; color: white; 
                padding: 4px 8px; border-radius: 12px; font-size: 10px; 
                cursor: pointer; font-weight: bold;">
                ✓ Finish
            </button>
            <button class="cursor-clear-btn" style="
                background: #f44336; border: none; color: white; 
                padding: 4px 8px; border-radius: 12px; font-size: 10px; 
                cursor: pointer; font-weight: bold;">
                ✕ Clear
            </button>
            <span style="font-size: 10px; opacity: 0.9;">ESC to cancel | ENTER to finish</span>
        `;
        
        // Add button listeners
        ui.querySelector('.cursor-finish-btn').onclick = () => this.finishCursorSelection();
        ui.querySelector('.cursor-clear-btn').onclick = () => this.clearCursorSelections();
        
        document.body.appendChild(ui);
        this.cursorUI = ui;
    }

    updateCursorSelectionCounter() {
        const counter = document.querySelector('.cursor-counter');
        if (counter) {
            const totalChars = Array.from(this.cursorContent).reduce((sum, text) => sum + text.length, 0);
            counter.textContent = `${this.cursorSelectedElements.size} selected (${totalChars} chars)`;
        }
    }

    clearCursorSelections() {
        console.log('[Cursor] Clearing all cursor selections');
        
        // Remove highlights from all selected elements
        this.cursorSelectedElements.forEach(element => {
            element.classList.remove('cursor-selected-highlight');
        });
        
        // Clear collections
        this.cursorSelectedElements.clear();
        this.cursorContent.clear();
        
        this.updateCursorSelectionCounter();
        this.showCursorMessage('All selections cleared');
    }

    finishCursorSelection() {
        if (this.cursorSelectedElements.size === 0) {
            this.showCursorMessage('No elements selected!');
            return;
        }
        
        console.log('[Cursor] Finishing cursor selection...');
        console.log(`[Cursor] Selected ${this.cursorSelectedElements.size} elements`);
        
        // Extract comprehensive content from all selected elements
        const extractedData = this.extractAllContentFromSelection();
        
        // Log all extracted content to console
        console.log('='.repeat(80));
        console.log('CURSOR SELECTION - EXTRACTED CONTENT');
        console.log('='.repeat(80));
        console.log('Total Elements Selected:', this.cursorSelectedElements.size);
        console.log('Total Content Length:', extractedData.combinedTextContent.length);
        console.log('\n--- COMBINED TEXT CONTENT ---');
        console.log(extractedData.combinedTextContent);
        console.log('\n--- DETAILED ELEMENT BREAKDOWN ---');
        extractedData.elementDetails.forEach((detail, index) => {
            console.log(`\nElement ${index + 1}:`);
            console.log(`  Tag: ${detail.tagName}`);
            console.log(`  Classes: ${detail.classes}`);
            console.log(`  ID: ${detail.id || 'none'}`);
            console.log(`  Text Content: "${detail.textContent.substring(0, 200)}${detail.textContent.length > 200 ? '...' : ''}"`);
            console.log(`  Inner HTML (first 300 chars): "${detail.innerHTML.substring(0, 300)}${detail.innerHTML.length > 300 ? '...' : ''}"`);
            console.log(`  Attributes:`, detail.attributes);
            console.log(`  Position: x=${detail.position.x}, y=${detail.position.y}, width=${detail.position.width}, height=${detail.position.height}`);
        });
        console.log('\n--- STRUCTURED HTML CONTENT ---');
        console.log(extractedData.combinedHTMLContent);
        console.log('='.repeat(80));
        
        // Create bounds encompassing all selected elements
        const bounds = this.calculateSelectedElementsBounds();
        
        // Store the selection with enhanced data for AI processing
        this.selectedAreas['cursor'] = {
            bounds: bounds,
            content: extractedData.combinedTextContent,
            htmlContent: extractedData.combinedHTMLContent,
            structuredContent: extractedData.elementDetails,
            elements: this.cursorSelectedElements.size,
            type: 'cursor',
            timestamp: Date.now(),
            url: window.location.href,
            extractedData: extractedData,
            // Enhanced data for AI processing
            aiReadyContent: {
                rawText: extractedData.combinedTextContent,
                structuredHTML: extractedData.combinedHTMLContent,
                elementBreakdown: extractedData.elementDetails.map(detail => ({
                    tag: detail.tagName,
                    text: detail.textContent,
                    html: detail.innerHTML,
                    attributes: detail.attributes,
                    position: detail.position
                })),
                metadata: {
                    totalElements: extractedData.totalElements,
                    totalTextLength: extractedData.totalTextLength,
                    totalHTMLLength: extractedData.totalHTMLLength,
                    extractionMethod: 'cursor-selection',
                    pageUrl: window.location.href,
                    pageTitle: document.title,
                    timestamp: Date.now()
                }
            }
        };
        
        // Stop cursor selection
        this.stopCursorSelection();
        
        // Notify popup with enhanced data ready for AI processing
        console.log('[Cursor Selection] Sending completion message to popup...');
        
        const messageData = {
            action: 'cursorSelectionComplete',
            type: 'cursor',
            data: this.selectedAreas['cursor'],
            readyForAI: true,
            autoSelected: true,
            aiContent: this.selectedAreas['cursor'].aiReadyContent
        };
        
        console.log('[Cursor Selection] Message data to send:', messageData);
        
        try {
            // First try to send to popup directly (if open)
            chrome.runtime.sendMessage(messageData, (response) => {
                if (chrome.runtime.lastError) {
                    // Better error logging - chrome.runtime.lastError is an object
                    const errorMsg = chrome.runtime.lastError.message || 'Unknown runtime error';
                    console.error('[Cursor Selection] ❌ Error sending message to popup:', errorMsg);
                    console.error('[Cursor Selection] Full error object:', chrome.runtime.lastError);
                    console.error('[Cursor Selection] This usually means the popup is not open');
                    
                    // Store the data for later retrieval when popup opens
                    this.storeContentForPopup(this.selectedAreas['cursor']);
                    
                    // Show message to user to open popup
                    this.showPersistentMessage('✅ Content selected! Click the extension icon to process with AI.', 10000);
                } else {
                    console.log('[Cursor Selection] ✅ Message sent successfully, response:', response);
                    
                    // Check if the response indicates success or if popup handled it
                    if (response && (response.success === false || response.forwarded)) {
                        console.log('[Cursor Selection] Response indicates popup may not have handled message, storing content as fallback');
                        this.storeContentForPopup(this.selectedAreas['cursor']);
                        this.showPersistentMessage('✅ Content selected! Click the extension icon to process with AI.', 10000);
                    }
                }
            });
        } catch (error) {
            console.error('[Cursor Selection] ❌ Error sending message:', error);
            
            // Fallback: Store content for later
            this.storeContentForPopup(this.selectedAreas['cursor']);
            this.showPersistentMessage('✅ Content selected! Click the extension icon to process with AI.', 10000);
        }
        
        this.showMessage(`Cursor Selection Complete! Content ready for AI analysis - ${extractedData.combinedTextContent.length} chars from ${this.cursorSelectedElements.size} elements.`);
    }

    extractAllContentFromSelection() {
        const elementDetails = [];
        const textContents = [];
        const htmlContents = [];
        
        // Convert Set to Array and sort by DOM order
        const sortedElements = Array.from(this.cursorSelectedElements).sort((a, b) => {
            const position = a.compareDocumentPosition(b);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
            return 0;
        });
        
        sortedElements.forEach((element, index) => {
            // Get element position
            const rect = element.getBoundingClientRect();
            const scrollX = window.pageXOffset;
            const scrollY = window.pageYOffset;
            
            // Extract all attributes
            const attributes = {};
            for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                attributes[attr.name] = attr.value;
            }
            
            // Get computed styles for important properties
            const computedStyle = window.getComputedStyle(element);
            const importantStyles = {
                fontSize: computedStyle.fontSize,
                fontWeight: computedStyle.fontWeight,
                color: computedStyle.color,
                backgroundColor: computedStyle.backgroundColor,
                display: computedStyle.display,
                position: computedStyle.position
            };
            
            const detail = {
                index: index,
                tagName: element.tagName,
                id: element.id,
                classes: element.className,
                textContent: element.textContent.trim(),
                innerHTML: element.innerHTML,
                outerHTML: element.outerHTML,
                attributes: attributes,
                styles: importantStyles,
                position: {
                    x: rect.left + scrollX,
                    y: rect.top + scrollY,
                    width: rect.width,
                    height: rect.height
                },
                childElementCount: element.childElementCount,
                hasLinks: element.querySelectorAll('a').length > 0,
                hasImages: element.querySelectorAll('img').length > 0,
                hasList: element.querySelectorAll('ul, ol, li').length > 0
            };
            
            elementDetails.push(detail);
            
            // Collect text content (avoid duplicates)
            const textContent = element.textContent.trim();
            if (textContent && !textContents.includes(textContent)) {
                textContents.push(textContent);
            }
            
            // Collect HTML content
            htmlContents.push(`<!-- Element ${index + 1}: ${element.tagName} -->`);
            htmlContents.push(element.outerHTML);
        });
        
        return {
            elementDetails: elementDetails,
            combinedTextContent: textContents.join('\n\n'),
            combinedHTMLContent: htmlContents.join('\n'),
            totalElements: sortedElements.length,
            totalTextLength: textContents.join('\n\n').length,
            totalHTMLLength: htmlContents.join('\n').length
        };
    }

    calculateSelectedElementsBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.cursorSelectedElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const scrollX = window.pageXOffset;
            const scrollY = window.pageYOffset;
            
            minX = Math.min(minX, rect.left + scrollX);
            minY = Math.min(minY, rect.top + scrollY);
            maxX = Math.max(maxX, rect.right + scrollX);
            maxY = Math.max(maxY, rect.bottom + scrollY);
        });
        
        return {
            left: minX,
            top: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    stopCursorSelection() {
        if (!this.isCursorSelecting) return;
        
        console.log('[Cursor Selection] Stopping cursor selection...');
        
        this.isCursorSelecting = false;
        
        // Remove event listeners
        if (this.cursorMoveListener) {
            document.removeEventListener('mousemove', this.cursorMoveListener, true);
            this.cursorMoveListener = null;
        }
        if (this.cursorClickListener) {
            document.removeEventListener('click', this.cursorClickListener, true);
            this.cursorClickListener = null;
        }
        if (this.cursorKeyListener) {
            document.removeEventListener('keydown', this.cursorKeyListener, true);
            this.cursorKeyListener = null;
        }
        
        // Remove highlights
        document.querySelectorAll('.cursor-hover-highlight, .cursor-selected-highlight')
            .forEach(el => {
                el.classList.remove('cursor-hover-highlight', 'cursor-selected-highlight');
            });
        
        // Remove UI elements
        const ui = document.querySelector('.cursor-selection-ui');
        if (ui) ui.remove();
        
        const info = document.querySelector('.cursor-element-info');
        if (info) info.remove();
        
        // Remove styles
        const styles = document.getElementById('cursor-selection-styles');
        if (styles) styles.remove();
        
        // Reset properties
        this.cursorSelectedElements.clear();
        this.cursorContent.clear();
        this.lastHoveredElement = null;
        
        console.log('[Cursor Selection] Cursor selection stopped');
    }

    showCursorMessage(message) {
        // Remove existing cursor message
        const existing = document.querySelector('.cursor-message');
        if (existing) existing.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'cursor-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #FF5722;
            color: white;
            padding: 6px 12px;
            border-radius: 15px;
            font-family: Arial, sans-serif;
            font-size: 11px;
            font-weight: bold;
            z-index: 10003;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 1500);
    }

    // Store content for popup to retrieve later
    storeContentForPopup(contentData) {
        console.log('[Storage] 🗄️ Starting content storage process...');
        console.log('[Storage] Content data keys:', contentData ? Object.keys(contentData) : 'null');
        console.log('[Storage] Content size (chars):', contentData?.content?.length || 0);
        
        if (!contentData) {
            console.error('[Storage] ❌ No content data provided to store');
            return;
        }
        
        try {
            // Store in both localStorage and chrome.storage for redundancy
            const storageData = {
                timestamp: Date.now(),
                url: window.location.href,
                pageTitle: document.title,
                content: contentData,
                type: 'cursor-selection',
                id: `resume-ai-${Date.now()}`
            };
            
            console.log('[Storage] Prepared storage data with ID:', storageData.id);
            
            // Store in localStorage first
            try {
                const serializedData = JSON.stringify(storageData);
                localStorage.setItem('resumeAI_pendingContent', serializedData);
                console.log('[Storage] ✅ Content stored in localStorage successfully');
                console.log('[Storage] localStorage item size:', serializedData.length, 'characters');
            } catch (localError) {
                console.error('[Storage] ❌ Error storing in localStorage:', localError);
                console.error('[Storage] localStorage might be full or unavailable');
            }
            
            // Also store in chrome.storage if available
            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({
                    'resumeAI_pendingContent': storageData
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('[Storage] ⚠️ Chrome storage error:', chrome.runtime.lastError.message);
                        console.warn('[Storage] Using localStorage only');
                    } else {
                        console.log('[Storage] ✅ Content stored in chrome.storage successfully');
                        
                        // Verify the storage
                        chrome.storage.local.get(['resumeAI_pendingContent'], (result) => {
                            if (result.resumeAI_pendingContent) {
                                console.log('[Storage] ✅ Storage verification successful');
                            } else {
                                console.warn('[Storage] ⚠️ Storage verification failed - data not found');
                            }
                        });
                    }
                });
            } else {
                console.warn('[Storage] ⚠️ Chrome storage API not available');
            }
            
            console.log('[Storage] ✅ Content storage process completed');
            
            // Show a more prominent notification to user
            this.showStorageSuccessMessage();
            
        } catch (error) {
            console.error('[Storage] ❌ Error in storage process:', error);
            console.error('[Storage] Error name:', error.name);
            console.error('[Storage] Error message:', error.message);
            
            // Try to show error to user
            this.showPersistentMessage('⚠️ Error storing content. Try selecting again.', 8000);
        }
    }
    
    // Show storage success with more prominent styling
    showStorageSuccessMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'storage-success-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 16px;
            font-weight: 600;
            z-index: 10006;
            box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3);
            text-align: center;
            min-width: 300px;
            animation: bounceIn 0.6s ease-out;
            border: 2px solid rgba(255,255,255,0.2);
        `;
        
        messageDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                <div style="font-size: 24px;">✅</div>
                <div>
                    <div style="font-size: 18px; margin-bottom: 4px;">Content Captured!</div>
                    <div style="font-size: 13px; opacity: 0.9;">Click the extension icon to process with AI</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Auto remove after delay
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.style.animation = 'fadeOut 0.3s ease-out forwards';
                setTimeout(() => messageDiv.remove(), 300);
            }
        }, 4000);
        
        // Click to dismiss
        messageDiv.onclick = () => {
            messageDiv.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => messageDiv.remove(), 300);
        };
    }
    
    // Show persistent message to user
    showPersistentMessage(message, duration = 5000) {
        // Remove existing persistent messages
        const existing = document.querySelectorAll('.persistent-message');
        existing.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'persistent-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 10005;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            max-width: 300px;
            animation: slideInRight 0.4s ease-out;
            cursor: pointer;
        `;
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 10px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            opacity: 0.7;
        `;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            messageDiv.remove();
        };
        
        messageDiv.innerHTML = message;
        messageDiv.appendChild(closeBtn);
        
        // Click to dismiss
        messageDiv.onclick = () => messageDiv.remove();
        
        document.body.appendChild(messageDiv);
        
        // Auto remove after duration
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, duration);
    }
}

// Initialize the area selector with error handling
console.log('[Content Script] Starting Resume AI Area Selector initialization...');

try {
    const areaSelector = new AreaSelector();
    
    // Expose globally for debugging
    window.resumeAIAreaSelector = areaSelector;
    
    console.log('[Content Script] Resume AI Area Selector loaded successfully');
    
} catch (error) {
    console.error('[Content Script] Failed to initialize area selector:', error);
}
