// Development Configuration
const DEVELOPMENT_CONFIG = {
    BACKEND_API_URL: 'http://localhost:3000',
    BACKEND_API_TIMEOUT: 30000,
    BACKEND_API_RETRY_ATTEMPTS: 3,
    ENVIRONMENT: 'development',
    
    ENDPOINTS: {
        HEALTH: '/api/health',
        EXTRACT_JOB: '/api/extract-job-details',
        GENERATE_CV: '/api/extension/cv',
        ANALYZE_JOB: '/api/analyze-job'
    },
    
    FEATURES: {
        AUTO_DETECTION: true,
        NOTIFICATIONS: true,
        DEBUG_LOGGING: true
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEVELOPMENT_CONFIG;
} else {
    window.DEVELOPMENT_CONFIG = DEVELOPMENT_CONFIG;
}
