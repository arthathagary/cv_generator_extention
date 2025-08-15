# Debug Instructions for Cursor Selection Issue

## Steps to Debug:

1. **Reload the Extension:**
   - Go to chrome://extensions/
   - Find "Resume AI" extension
   - Click the reload button (🔄)
   - This ensures all our latest changes are loaded

2. **Check Content Script Loading:**
   - Open any webpage (try the test-cursor-selection.html we created)
   - Open Developer Tools (F12)
   - Go to Console tab
   - You should see: "Resume AI Area Selector loaded"
   - If not, the content script isn't loading properly

3. **Test Content Script Directly:**
   - In the console, paste and run the content of debug-cursor.js
   - This will test if the area selector is properly loaded

4. **Test from Popup:**
   - Open the extension popup
   - Open Developer Tools for the popup:
     - Right-click on the extension icon
     - Select "Inspect popup"
   - Click the "Cursor Selection" button
   - Check both popup console and page console for error messages

5. **Common Issues to Check:**
   - Make sure you're testing on a regular webpage (not chrome:// pages)
   - Ensure the content script has permissions to run on the site
   - Check if any JavaScript errors are preventing the script from loading

## Expected Console Output:
When working correctly, you should see:
- "[Popup] Starting cursor selection..."
- "[Content] Received startCursorSelection message" 
- "[Cursor Selection] Starting cursor-based selection..."
- "[Cursor Selection] Cursor selection started successfully"

## If Still Failing:
1. Check the browser console for any JavaScript errors
2. Try on a simple HTML page first
3. Make sure no other extensions are interfering
4. Clear browser cache and reload the extension
