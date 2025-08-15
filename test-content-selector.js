// Test file to verify content selector fixes
console.log('Testing content selector defensive programming...');

// Simulate the error conditions that might occur
const testCases = [
    null,
    undefined,
    {},
    { tagName: null },
    { tagName: 'DIV', className: null },
    { tagName: 'DIV', className: 'test-class', textContent: null },
    { tagName: 'SCRIPT' }, // Should be skipped
    { tagName: 'DIV', className: 'cursor-selection-ui' }, // Should be skipped
    { tagName: 'DIV', className: 'normal-class', textContent: 'Valid content' }, // Should not be skipped
];

// Mock the shouldSkipElement function with defensive programming
function shouldSkipElement(element) {
    // Defensive check for null/undefined element
    if (!element) {
        console.warn('shouldSkipElement called with null/undefined element');
        return true;
    }
    
    // Defensive check for element properties
    if (!element.tagName) {
        console.warn('Element has no tagName:', element);
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
        console.error('Error in shouldSkipElement:', error);
        console.error('Element causing error:', element);
        return true; // Skip elements that cause errors
    }
}

// Test all cases
testCases.forEach((testCase, index) => {
    try {
        const result = shouldSkipElement(testCase);
        console.log(`Test ${index + 1}: ${result ? 'SKIP' : 'ALLOW'} - ${JSON.stringify(testCase)}`);
    } catch (error) {
        console.error(`Test ${index + 1} FAILED:`, error);
    }
});

console.log('Testing complete!');
