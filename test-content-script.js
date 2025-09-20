// Test script to verify content script loading
console.log('=== TESTING CONTENT SCRIPT ===');

// Check if content script loaded
setTimeout(() => {
    if (window.resumeAIAreaSelector) {
        console.log('✅ Content script loaded successfully');
        console.log('Area selector object:', window.resumeAIAreaSelector);
        
        // Test message sending from console
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            console.log('✅ Chrome runtime available');
            
            // Try to send a test message to the content script
            try {
                chrome.runtime.sendMessage({action: 'test'}, (response) => {
                    console.log('Test message response:', response);
                });
            } catch (error) {
                console.log('Cannot send message from content script context');
            }
        } else {
            console.log('❌ Chrome runtime not available');
        }
    } else {
        console.log('❌ Content script NOT loaded');
        console.log('Available window properties:', Object.keys(window).filter(k => k.includes('resume') || k.includes('AI')));
    }
}, 1000);

// Check again after 3 seconds
setTimeout(() => {
    console.log('=== FINAL CHECK ===');
    if (window.resumeAIAreaSelector) {
        console.log('✅ Content script still available');
        
        // Try direct method call
        try {
            console.log('Testing startCursorSelection method...');
            if (typeof window.resumeAIAreaSelector.startCursorSelection === 'function') {
                console.log('✅ startCursorSelection method exists');
                // Don't call it, just verify it exists
            } else {
                console.log('❌ startCursorSelection method missing');
            }
        } catch (error) {
            console.error('Error testing method:', error);
        }
    } else {
        console.log('❌ Content script lost or never loaded');
    }
}, 3000);
