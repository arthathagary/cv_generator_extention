#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 Building Resume AI Extension with environment variables...');

// Read the template env-config file
const envConfigPath = path.join(__dirname, 'utils', 'env-config.js');
let envConfigContent = fs.readFileSync(envConfigPath, 'utf8');

// Replace process.env variables with actual values
const replacements = {
    'process.env.BACKEND_API_URL': `'${process.env.BACKEND_API_URL || 'http://localhost:3000'}'`,
    'process.env.BACKEND_API_TIMEOUT': process.env.BACKEND_API_TIMEOUT || '30000',
    'process.env.BACKEND_API_RETRY_ATTEMPTS': process.env.BACKEND_API_RETRY_ATTEMPTS || '3',
    'process.env.NODE_ENV': `'${process.env.NODE_ENV || 'development'}'`
};

Object.entries(replacements).forEach(([placeholder, value]) => {
    envConfigContent = envConfigContent.replace(new RegExp(placeholder, 'g'), value);
});

// Write the processed file
fs.writeFileSync(envConfigPath, envConfigContent);

console.log('✅ Environment variables injected successfully!');
console.log(`📍 Backend API URL: ${process.env.BACKEND_API_URL || 'http://localhost:3000'}`);
console.log(`⏱️  API Timeout: ${process.env.BACKEND_API_TIMEOUT || '30000'}ms`);
console.log(`🔄 Retry Attempts: ${process.env.BACKEND_API_RETRY_ATTEMPTS || '3'}`);
