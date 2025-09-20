// Manual Extension Debug Test
// Paste this in Chrome DevTools console when extension popup is open

// Test 1: Direct API call from extension context
async function testDirectAPICall() {
    console.log('🔧 Testing direct API call...');
    
    try {
        const response = await fetch('http://localhost:3000/api/content/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: 'Manual test from console',
                extractionMethod: 'console-test',
                requestType: 'manual-debug',
                timestamp: Date.now()
            })
        });
        
        console.log('🔧 Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('🔧 Success:', result);
            return true;
        } else {
            console.error('🔧 API Error:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('🔧 Network Error:', error);
        return false;
    }
}

// Test 2: Simulate cursor selection data
const mockCursorData = {
    rawText: 'Senior Frontend Developer position at TechCorp. Requirements: React, TypeScript, 3+ years experience. Location: San Francisco, CA. Salary: $120,000-$150,000.',
    structuredHTML: '<div><h2>Senior Frontend Developer</h2><p>TechCorp is hiring...</p></div>',
    metadata: {
        totalElements: 3,
        totalTextLength: 146,
        extractionMethod: 'cursor-selection',
        pageUrl: window.location.href
    }
};

// Test 3: Check extension popup methods
function testExtensionMethods() {
    console.log('🔧 Testing extension methods...');
    
    // Check if PopupController exists
    const popup = window.popupController;
    if (popup) {
        console.log('🔧 PopupController found:', popup);
        
        // Test sendContentToAI method
        if (typeof popup.sendContentToAI === 'function') {
            console.log('🔧 sendContentToAI method exists');
            // Don't call it yet, just check existence
        } else {
            console.error('🔧 sendContentToAI method not found');
        }
        
        // Test testAPIConnection method
        if (typeof popup.testAPIConnection === 'function') {
            console.log('🔧 testAPIConnection method exists');
        } else {
            console.error('🔧 testAPIConnection method not found');
        }
    } else {
        console.error('🔧 PopupController not found - extension may not be loaded properly');
    }
}

// Run tests
console.log('🔧 Starting extension debug tests...');
testDirectAPICall();
testExtensionMethods();

// Instructions
console.log(`
🔧 EXTENSION DEBUG INSTRUCTIONS:
1. Run testDirectAPICall() - This should work if API is running
2. Run testExtensionMethods() - This checks if extension methods exist
3. Use Network tab to monitor actual requests
4. Check for CORS errors in console
5. Verify extension is loaded in chrome://extensions
`);
