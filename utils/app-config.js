// Configuration for Resume AI Extension
// Edit these values based on your environment

const CONFIG = {
    // Backend API Configuration
    BACKEND_API_URL: 'http://localhost:3000', // Change this to your backend URL
    BACKEND_API_TIMEOUT: 30000, // 30 seconds
    BACKEND_API_RETRY_ATTEMPTS: 3,
    
    // Environment
    ENVIRONMENT: 'development', // 'development' or 'production'
    
    // API Endpoints
    ENDPOINTS: {
        HEALTH: '/api/health',
        EXTRACT_JOB: '/api/extract-job-details',
        GENERATE_CV: '/api/extension/cv',
        ANALYZE_JOB: '/api/analyze-job'
    },
    
    // Feature Flags
    FEATURES: {
        AUTO_DETECTION: true,
        NOTIFICATIONS: true,
        DEBUG_LOGGING: true
    }
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
