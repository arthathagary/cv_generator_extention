// Debug script to test cursor selection
console.log('=== DEBUGGING CURSOR SELECTION ===');

// Check if the area selector is loaded
if (window.resumeAIAreaSelector) {
    console.log('✅ Area selector is loaded');
    console.log('Area selector object:', window.resumeAIAreaSelector);
    
    // Check if cursor selection method exists
    if (typeof window.resumeAIAreaSelector.startCursorSelection === 'function') {
        console.log('✅ startCursorSelection method exists');
    } else {
        console.log('❌ startCursorSelection method missing');
    }
    
    // Test the method
    try {
        console.log('Testing cursor selection...');
        window.resumeAIAreaSelector.startCursorSelection();
        console.log('✅ Cursor selection started successfully');
    } catch (error) {
        console.error('❌ Error starting cursor selection:', error);
    }
} else {
    console.log('❌ Area selector not found - content script may not be loaded');
}
