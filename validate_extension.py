#!/usr/bin/env python3
"""
Chrome Extension Validation Script for Resume AI
Checks if all required files are present and valid for loading the extension.
"""

import json
import os
from pathlib import Path

def check_extension_structure():
    """Validate the Chrome extension structure and files."""
    
    print("🔍 Validating Resume AI Chrome Extension...")
    print("=" * 50)
    
    errors = []
    warnings = []
    
    # Check manifest.json
    print("📄 Checking manifest.json...")
    if not os.path.exists('manifest.json'):
        errors.append("❌ manifest.json not found")
    else:
        try:
            with open('manifest.json', 'r') as f:
                manifest = json.load(f)
            
            # Validate required fields
            required_fields = ['manifest_version', 'name', 'version']
            for field in required_fields:
                if field not in manifest:
                    errors.append(f"❌ Missing required field in manifest: {field}")
            
            # Check icons
            if 'icons' in manifest:
                print("🎨 Checking icon files...")
                for size, path in manifest['icons'].items():
                    if not os.path.exists(path):
                        errors.append(f"❌ Icon file not found: {path}")
                    else:
                        file_size = os.path.getsize(path)
                        if file_size == 0:
                            errors.append(f"❌ Icon file is empty: {path}")
                        else:
                            print(f"  ✅ {path} ({file_size} bytes)")
            
            print("✅ manifest.json is valid")
            
        except json.JSONDecodeError as e:
            errors.append(f"❌ Invalid JSON in manifest.json: {e}")
    
    # Check required directories and files
    required_structure = {
        'popup/popup.html': 'Popup HTML file',
        'popup/popup.css': 'Popup CSS file', 
        'popup/popup.js': 'Popup JavaScript file',
        'content/content.js': 'Content script file',
        'content/content.css': 'Content CSS file',
        'background/background.js': 'Background script file',
        'options/options.html': 'Options page HTML',
        'options/options.css': 'Options page CSS',
        'options/options.js': 'Options page JavaScript',
        'utils/config.js': 'Configuration utilities'
    }
    
    print("\n📁 Checking file structure...")
    for file_path, description in required_structure.items():
        if not os.path.exists(file_path):
            errors.append(f"❌ Missing {description}: {file_path}")
        else:
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                warnings.append(f"⚠️  Empty file: {file_path}")
            else:
                print(f"  ✅ {file_path} ({file_size} bytes)")
    
    # Check for package.json (development)
    print("\n📦 Checking development files...")
    if os.path.exists('package.json'):
        print("  ✅ package.json found")
    else:
        warnings.append("⚠️  package.json not found (development setup)")
    
    if os.path.exists('README.md'):
        print("  ✅ README.md found")
    else:
        warnings.append("⚠️  README.md not found")
    
    # Final results
    print("\n" + "=" * 50)
    print("📊 VALIDATION RESULTS")
    print("=" * 50)
    
    if not errors:
        print("🎉 SUCCESS! Extension structure is valid and ready to load.")
        print("\n📝 Next steps:")
        print("   1. Open Chrome and go to chrome://extensions/")
        print("   2. Enable 'Developer mode'")
        print("   3. Click 'Load unpacked'")
        print("   4. Select this directory")
        print("   5. Configure your Gemini API key in extension settings")
    else:
        print("❌ ERRORS FOUND - Extension cannot be loaded:")
        for error in errors:
            print(f"   {error}")
    
    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for warning in warnings:
            print(f"   {warning}")
    
    return len(errors) == 0

if __name__ == "__main__":
    success = check_extension_structure()
    exit(0 if success else 1)
