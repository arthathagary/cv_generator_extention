// Content script for Resume AI Chrome Extension - AI-powered universal job extraction
class JobExtractor {
    constructor() {
        this.jobDetails = null;
        this.init();
    }

    init() {
        this.setupMessageListener();
        this.injectUI();
        // Removed auto-detection - now works only on user click
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'extractJobDetails':
                    const details = await this.extractJobDetails();
                    sendResponse({ success: true, jobDetails: details });
                    break;

                case 'checkJobDetails':
                    sendResponse({ 
                        hasJobDetails: this.jobDetails !== null,
                        jobDetails: this.jobDetails 
                    });
                    break;

                case 'highlightKeywords':
                    this.highlightKeywords(request.keywords);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    async extractJobDetails() {
        try {
            // Extract entire page content instead of using site-specific selectors
            const pageContent = this.extractPageContent();
            
            // Send page content to background script for AI processing
            const response = await chrome.runtime.sendMessage({
                action: 'extractJobDetailsFromContent',
                pageContent: pageContent,
                url: window.location.href
            });

            if (response && response.success) {
                this.jobDetails = response.jobDetails;
                
                console.log("job details from AI extraction current", this.jobDetails);
                
                // Save to background script
                chrome.runtime.sendMessage({
                    action: 'saveJobDetails',
                    jobDetails: this.jobDetails
                });

                // Update UI
                this.updateExtractorUI('success');
                
                return this.jobDetails;
            } else {
                throw new Error(response.error || 'Failed to extract job details from page content');
            }
        } catch (error) {
            console.error('Error extracting job details:1', error);
            this.updateExtractorUI('error');
            throw error;
        }
    }

    extractPageContent() {
        // Get the main content of the page
        const content = {
            title: document.title,
            url: window.location.href,
            text: '',
            headings: [],
            lists: [],
            metadata: {}
        };

        // Extract text content from main content areas
        const mainSelectors = [
            'main',
            '[role="main"]',
            '.main-content',
            '#main-content',
            '.content',
            '#content',
            'article',
            '.job-details',
            '.job-description',
            '.posting'
        ];

        let mainContent = null;
        for (const selector of mainSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                mainContent = element;
                break;
            }
        }

        // If no main content found, use body but exclude navigation and footer
        if (!mainContent) {
            mainContent = document.body;
        }

        // Extract text content, excluding scripts, styles, and navigation
        const excludeSelectors = [
            'script',
            'style',
            'nav',
            'header',
            'footer',
            '.navigation',
            '.nav',
            '.menu',
            '.sidebar',
            '.ads',
            '.advertisement',
            '[class*="ad-"]',
            '[id*="ad-"]'
        ];

        // Clone the content to avoid modifying the original
        const clonedContent = mainContent.cloneNode(true);
        
        // Remove excluded elements
        excludeSelectors.forEach(selector => {
            const elements = clonedContent.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });

        // Extract clean text
        content.text = clonedContent.textContent || clonedContent.innerText || '';
        content.text = content.text.replace(/\s+/g, ' ').trim();

        // Extract headings
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            const text = heading.textContent.trim();
            if (text && text.length > 2) {
                content.headings.push({
                    level: heading.tagName.toLowerCase(),
                    text: text
                });
            }
        });

        // Extract lists (often contain requirements, responsibilities)
        const lists = document.querySelectorAll('ul, ol');
        lists.forEach(list => {
            const items = [];
            const listItems = list.querySelectorAll('li');
            listItems.forEach(li => {
                const text = li.textContent.trim();
                if (text && text.length > 2) {
                    items.push(text);
                }
            });
            if (items.length > 0) {
                content.lists.push(items);
            }
        });

        // Extract metadata
        const metaTags = document.querySelectorAll('meta[property], meta[name]');
        metaTags.forEach(meta => {
            const property = meta.getAttribute('property') || meta.getAttribute('name');
            const content_attr = meta.getAttribute('content');
            if (property && content_attr) {
                content.metadata[property] = content_attr;
            }
        });

        // Extract structured data (JSON-LD)
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        const structuredData = [];
        jsonLdScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                structuredData.push(data);
            } catch (e) {
                // Ignore invalid JSON
            }
        });
        content.structuredData = structuredData;

        return content;
    }

    injectUI() {
        // Create floating action button
        const fabContainer = document.createElement('div');
        fabContainer.id = 'resume-ai-fab';
        fabContainer.innerHTML = `
            <div class="fab-button" id="resume-ai-fab-btn" title="Resume AI - Extract Job Details from Any Page">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
            </div>
            <div class="fab-tooltip">Extract job details from any page with AI</div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #resume-ai-fab {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .fab-button {
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
            }
            
            .fab-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .fab-button.extracting {
                animation: pulse 1.5s infinite;
            }
            
            .fab-button.success {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            }
            
            .fab-button.error {
                background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
            }
            
            .fab-tooltip {
                position: absolute;
                bottom: 70px;
                right: 0;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
                pointer-events: none;
            }
            
            #resume-ai-fab:hover .fab-tooltip {
                opacity: 1;
                transform: translateY(0);
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            .job-highlight {
                background-color: rgba(102, 126, 234, 0.2) !important;
                border-radius: 3px;
                padding: 0 2px;
                transition: all 0.3s ease;
            }
            
            .job-highlight:hover {
                background-color: rgba(102, 126, 234, 0.4) !important;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(fabContainer);

        // Add click handler
        document.getElementById('resume-ai-fab-btn').addEventListener('click', () => {
            this.extractJobDetails();
        });
    }

    updateExtractorUI(status) {
        const fabBtn = document.getElementById('resume-ai-fab-btn');
        if (fabBtn) {
            // Remove existing status classes
            fabBtn.classList.remove('extracting', 'success', 'error');
            
            switch (status) {
                case 'extracting':
                    fabBtn.classList.add('extracting');
                    break;
                case 'success':
                    fabBtn.classList.add('success');
                    setTimeout(() => {
                        fabBtn.classList.remove('success');
                    }, 3000);
                    break;
                case 'error':
                    fabBtn.classList.add('error');
                    setTimeout(() => {
                        fabBtn.classList.remove('error');
                    }, 3000);
                    break;
                default:
                    fabBtn.classList.remove('extracting');
            }
        }
    }

    highlightKeywords(keywords) {
        if (!keywords || keywords.length === 0) return;

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            let text = textNode.textContent;
            let modified = false;

            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                if (regex.test(text)) {
                    text = text.replace(regex, `<span class="job-highlight">${keyword}</span>`);
                    modified = true;
                }
            });

            if (modified) {
                const wrapper = document.createElement('span');
                wrapper.innerHTML = text;
                textNode.parentNode.replaceChild(wrapper, textNode);
            }
        });
    }
}

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new JobExtractor();
    });
} else {
    new JobExtractor();
}
