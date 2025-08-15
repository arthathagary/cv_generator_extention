// AI Service utility for calling web app AI endpoints
// This replaces direct Gemini API calls with secure server-side AI processing

class AIService {
    constructor() {
        this.baseUrl = null;
        this.authToken = null;
        this.init();
    }

    async init() {
        try {
            const settings = await chrome.storage.sync.get(['settings', 'authToken']);
            this.baseUrl = settings.settings?.webAppUrl || 'http://localhost:3000';
            this.authToken = settings.authToken;
        } catch (error) {
            console.error('[AI Service] Failed to initialize:', error);
        }
    }

    async ensureAuthenticated() {
        if (!this.authToken) {
            const result = await chrome.storage.sync.get(['authToken']);
            this.authToken = result.authToken;
        }

        if (!this.authToken) {
            throw new Error('Authentication required. Please connect to your web app account.');
        }
    }

    async makeRequest(endpoint, data) {
        await this.ensureAuthenticated();

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401 && errorData.authUrl) {
                // Token expired, redirect to auth
                throw new Error(`Authentication required: ${errorData.authUrl}`);
            }
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Analyze job description and extract structured information
     * @param {string} jobDescription - The job description text
     * @param {string} analysisType - Type of analysis: 'job_analysis', 'keyword_extraction', 'cv_enhancement', 'skills_matching'
     * @param {Object} userProfile - Optional user profile for skills matching
     * @param {string} context - Optional additional context
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeJob(jobDescription, analysisType = 'job_analysis', userProfile = null, context = '') {
        try {
            const response = await this.makeRequest('/api/extension/ai/analyze', {
                jobDescription,
                analysisType,
                userProfile,
                context
            });

            return {
                success: true,
                result: response.result,
                analysisType: response.analysis_type
            };
        } catch (error) {
            console.error('[AI Service] Job analysis failed:', error);
            return {
                success: false,
                error: error.message,
                fallback: this.getJobAnalysisFallback(jobDescription, analysisType)
            };
        }
    }

    /**
     * Enhance CV content using AI
     * @param {string} content - Content to enhance
     * @param {string} jobDescription - Job description for context
     * @param {string} section - Section type: 'summary', 'experience', 'skills', 'projects', 'general'
     * @param {Object} userProfile - Optional user profile
     * @returns {Promise<Object>} Enhanced content
     */
    async enhanceContent(content, jobDescription, section = 'general', userProfile = null) {
        try {
            const response = await this.makeRequest('/api/extension/ai/enhance', {
                content,
                jobDescription,
                section,
                userProfile
            });

            return {
                success: true,
                original: response.original,
                enhanced: response.enhanced,
                section: response.section
            };
        } catch (error) {
            console.error('[AI Service] Content enhancement failed:', error);
            return {
                success: false,
                error: error.message,
                original: content,
                enhanced: content // Return original as fallback
            };
        }
    }

    /**
     * Extract ATS-friendly keywords from job description
     * @param {string} jobDescription - The job description text
     * @returns {Promise<Array>} Array of keywords
     */
    async extractKeywords(jobDescription) {
        try {
            const result = await this.analyzeJob(jobDescription, 'keyword_extraction');
            if (result.success && result.result) {
                // Flatten keyword categories into a single array
                const keywords = [];
                if (result.result.high_priority) keywords.push(...result.result.high_priority);
                if (result.result.medium_priority) keywords.push(...result.result.medium_priority);
                if (result.result.technical_skills) keywords.push(...result.result.technical_skills);
                if (result.result.soft_skills) keywords.push(...result.result.soft_skills);
                
                return [...new Set(keywords)]; // Remove duplicates
            }
        } catch (error) {
            console.error('[AI Service] Keyword extraction failed:', error);
        }
        
        // Fallback keyword extraction
        return this.extractKeywordsFallback(jobDescription);
    }

    /**
     * Get skills matching analysis
     * @param {string} jobDescription - The job description text
     * @param {Object} userProfile - User profile with skills
     * @returns {Promise<Object>} Skills matching result
     */
    async analyzeSkillsMatch(jobDescription, userProfile) {
        try {
            const result = await this.analyzeJob(jobDescription, 'skills_matching', userProfile);
            if (result.success) {
                return result.result;
            }
        } catch (error) {
            console.error('[AI Service] Skills matching failed:', error);
        }
        
        // Fallback skills matching
        return this.getSkillsMatchFallback(jobDescription, userProfile);
    }

    // Fallback methods for when AI service is unavailable
    getJobAnalysisFallback(jobDescription, analysisType) {
        const commonSkills = Config.COMMON_SKILLS;
        const foundSkills = commonSkills.filter(skill => 
            jobDescription.toLowerCase().includes(skill.toLowerCase())
        );

        switch (analysisType) {
            case 'keyword_extraction':
                return {
                    high_priority: foundSkills.slice(0, 5),
                    medium_priority: foundSkills.slice(5, 10),
                    technical_skills: foundSkills.filter(skill => 
                        ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'].includes(skill)
                    ),
                    soft_skills: ['Communication', 'Problem Solving', 'Team Work']
                };
            
            case 'job_analysis':
                return {
                    title: this.extractJobTitleFallback(jobDescription),
                    requirements: {
                        required_skills: foundSkills.slice(0, 5),
                        experience_years: "2-5",
                        education: "Bachelor's degree"
                    },
                    keywords: foundSkills
                };
            
            default:
                return { keywords: foundSkills };
        }
    }

    extractKeywordsFallback(jobDescription) {
        const commonSkills = Config.COMMON_SKILLS;
        return commonSkills.filter(skill => 
            jobDescription.toLowerCase().includes(skill.toLowerCase())
        ).slice(0, 15);
    }

    extractJobTitleFallback(jobDescription) {
        const titlePatterns = [
            /(?:software|frontend|backend|full.?stack|senior|junior|lead)\s+(?:developer|engineer)/gi,
            /(?:data|machine learning|ai)\s+(?:scientist|engineer)/gi,
            /(?:product|project)\s+manager/gi,
            /(?:ui\/ux|ux|ui)\s+designer/gi
        ];
        
        for (const pattern of titlePatterns) {
            const match = jobDescription.match(pattern);
            if (match) return match[0];
        }
        
        return 'Software Developer';
    }

    getSkillsMatchFallback(jobDescription, userProfile) {
        const userSkills = [
            ...(userProfile?.skills?.technical || []),
            ...(userProfile?.skills?.soft || [])
        ];
        
        const jobKeywords = this.extractKeywordsFallback(jobDescription);
        const matchedSkills = userSkills.filter(skill => 
            jobKeywords.some(keyword => keyword.toLowerCase().includes(skill.toLowerCase()))
        );
        
        return {
            overall_match_percentage: Math.min(90, (matchedSkills.length / Math.max(jobKeywords.length, 5)) * 100),
            matched_skills: matchedSkills,
            missing_skills: jobKeywords.filter(keyword => 
                !userSkills.some(skill => skill.toLowerCase().includes(keyword.toLowerCase()))
            ).slice(0, 5)
        };
    }

    /**
     * Check if AI service is available
     * @returns {Promise<boolean>} True if service is available
     */
    async isAvailable() {
        try {
            await this.ensureAuthenticated();
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create singleton instance
const aiService = new AIService();

// Make it available globally
if (typeof window !== 'undefined') {
    window.AIService = aiService;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}