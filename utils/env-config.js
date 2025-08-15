// Environment configuration for Resume AI Extension
// This file is generated from .env during build process

const ENV_CONFIG = {
    BACKEND_API_URL: process.env.BACKEND_API_URL || 'http://localhost:3000',
    BACKEND_API_TIMEOUT: parseInt(process.env.BACKEND_API_TIMEOUT) || 30000,
    BACKEND_API_RETRY_ATTEMPTS: parseInt(process.env.BACKEND_API_RETRY_ATTEMPTS) || 3,
    
    // Development vs Production detection
    IS_DEVELOPMENT: process.env.NODE_ENV !== 'production',
    
    // API endpoints
    ENDPOINTS: {
        HEALTH: '/api/health',
        EXTRACT_JOB: '/api/extract-job-details',
        GENERATE_CV: '/api/extension/cv',
        ANALYZE_JOB: '/api/analyze-job'
    }
};

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ENV_CONFIG;
} else if (typeof window !== 'undefined') {
    window.ENV_CONFIG = ENV_CONFIG;
}
