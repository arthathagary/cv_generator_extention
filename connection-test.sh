#!/bin/bash

echo "🔧 Testing Extension Connection System"
echo "====================================="

# Check if web app server is running
echo "1. Checking web app server..."
if curl -s http://localhost:3000/api/extension/profile -H "Authorization: Bearer test" > /dev/null; then
    echo "✅ Web app server is running on localhost:3000"
else
    echo "❌ Web app server is not running. Please start it with 'npm run dev'"
    exit 1
fi

# Test profile endpoint
echo ""
echo "2. Testing profile endpoint..."
PROFILE_RESPONSE=$(curl -s http://localhost:3000/api/extension/profile -H "Authorization: Bearer test-token")
if echo "$PROFILE_RESPONSE" | grep -q "Sarah Johnson"; then
    echo "✅ Profile endpoint is working"
    echo "   Profile: $(echo "$PROFILE_RESPONSE" | jq -r '.profile.personalInfo.name')"
else
    echo "❌ Profile endpoint is not working properly"
    echo "   Response: $PROFILE_RESPONSE"
fi

# Test auth endpoint
echo ""
echo "3. Testing auth endpoint..."
AUTH_RESPONSE=$(curl -s http://localhost:3000/api/extension/auth -X POST -H "Content-Type: application/json")
if echo "$AUTH_RESPONSE" | grep -q "token"; then
    echo "✅ Auth endpoint is working"
else
    echo "⚠️  Auth endpoint might need authentication (expected for secure setup)"
fi

echo ""
echo "4. Connection Test Instructions:"
echo "   - Load the Chrome extension"
echo "   - Click 'Connect Profile' in the extension popup"
echo "   - Check browser console for detailed logs"
echo "   - Extension should show 'Sarah Johnson' when connected"
echo ""
echo "🔍 Debug URLs:"
echo "   - Auth page: http://localhost:3000/auth/chrome-extension?extensionId=YOUR_EXTENSION_ID"
echo "   - Test page: http://localhost:3000/test-extension-connection.html?extensionId=YOUR_EXTENSION_ID"
echo ""
echo "📝 To get your extension ID:"
echo "   1. Go to chrome://extensions/"
echo "   2. Enable Developer mode"
echo "   3. Find your extension and copy the ID"
