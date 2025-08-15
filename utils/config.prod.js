// Production Configuration
const PRODUCTION_CONFIG = {
    BACKEND_API_URL: 'https://your-production-backend.com',
    BACKEND_API_TIMEOUT: 45000,
    BACKEND_API_RETRY_ATTEMPTS: 5,
    ENVIRONMENT: 'production',
    
    ENDPOINTS: {
        HEALTH: '/api/health',
        EXTRACT_JOB: '/api/extract-job-details',
        GENERATE_CV: '/api/extension/cv',
        ANALYZE_JOB: '/api/analyze-job'
    },
    
    FEATURES: {
        AUTO_DETECTION: true,
        NOTIFICATIONS: true,
        DEBUG_LOGGING: false
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRODUCTION_CONFIG;
} else {
    window.PRODUCTION_CONFIG = PRODUCTION_CONFIG;
}
