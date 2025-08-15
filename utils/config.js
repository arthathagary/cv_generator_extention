// Configuration and utility functions for Resume AI Chrome Extension

class Config {
    static get API_ENDPOINTS() {
        return {
            // Remove direct Gemini API access - now handled by web app
            WEB_APP_BASE: 'https://your-webapp-domain.com',
            AUTH_ENDPOINT: '/api/auth/chrome-extension',
            PROFILE_ENDPOINT: '/api/extension/profile',
            CV_GENERATION_ENDPOINT: '/api/extension/cv/download',
            JOB_ANALYSIS_ENDPOINT: '/api/extension/ai/analyze',
            CONTENT_ENHANCEMENT_ENDPOINT: '/api/extension/ai/enhance',
            FEEDBACK_ENDPOINT: '/api/feedback'
        };
    }

    static get STORAGE_KEYS() {
        return {
            SETTINGS: 'settings',
            USER_PROFILE: 'userProfile',
            AUTH_TOKEN: 'authToken',
            JOB_DETAILS: 'jobDetails',
            GENERATED_CV: 'generatedCV',
            // Remove GEMINI_API_KEY as it's now handled server-side
            LAST_EXTRACTED: 'lastExtracted',
            EXTRACTION_HISTORY: 'extractionHistory'
        };
    }

    static get DEFAULT_SETTINGS() {
        return {
            autoDetect: true,
            cvFormat: 'pdf',
            aiProvider: 'webapp', // Changed from 'gemini' to indicate server-side AI
            highlightKeywords: true,
            showNotifications: true,
            autoSave: true,
            theme: 'auto',
            language: 'en',
            webAppUrl: this.API_ENDPOINTS.WEB_APP_BASE
        };
    }

    // Removed SUPPORTED_JOB_SITES - now uses universal cursor selection

    static get COMMON_SKILLS() {
        return [
            // Programming Languages
            'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift',
            'Kotlin', 'TypeScript', 'R', 'MATLAB', 'Scala', 'Perl', 'Objective-C',
            
            // Web Technologies
            'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Next.js',
            'Svelte', 'jQuery', 'Bootstrap', 'Tailwind CSS', 'SASS', 'LESS',
            
            // Databases
            'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle',
            'Microsoft SQL Server', 'Cassandra', 'DynamoDB', 'Firebase',
            
            // Cloud & DevOps
            'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Git',
            'GitHub', 'GitLab', 'CI/CD', 'Terraform', 'Ansible', 'Chef', 'Puppet',
            
            // Data & Analytics
            'Machine Learning', 'Deep Learning', 'Data Science', 'Artificial Intelligence',
            'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Tableau', 'Power BI',
            'Apache Spark', 'Hadoop', 'Elasticsearch',
            
            // Mobile Development
            'iOS', 'Android', 'React Native', 'Flutter', 'Xamarin', 'Ionic',
            
            // Methodologies
            'Agile', 'Scrum', 'Kanban', 'DevOps', 'Test-Driven Development', 'Microservices',
            'REST API', 'GraphQL', 'SOAP', 'Continuous Integration', 'Continuous Deployment',
            
            // Soft Skills
            'Leadership', 'Communication', 'Problem Solving', 'Team Work', 'Project Management',
            'Critical Thinking', 'Adaptability', 'Time Management', 'Collaboration'
        ];
    }

    static get CV_TEMPLATES() {
        return {
            ATS_OPTIMIZED: {
                name: 'ATS Optimized',
                description: 'Simple, clean format optimized for Applicant Tracking Systems',
                sections: ['summary', 'experience', 'skills', 'education', 'certifications'],
                formatting: {
                    fonts: ['Arial', 'Calibri', 'Times New Roman'],
                    fontSize: 11,
                    margins: '0.5in',
                    lineSpacing: 1.15
                }
            },
            MODERN: {
                name: 'Modern Professional',
                description: 'Contemporary design with subtle styling',
                sections: ['summary', 'experience', 'skills', 'education', 'projects', 'achievements'],
                formatting: {
                    fonts: ['Helvetica', 'Open Sans', 'Roboto'],
                    fontSize: 10,
                    margins: '0.75in',
                    lineSpacing: 1.2
                }
            },
            TECHNICAL: {
                name: 'Technical Focus',
                description: 'Emphasizes technical skills and projects',
                sections: ['summary', 'technical_skills', 'experience', 'projects', 'education'],
                formatting: {
                    fonts: ['Consolas', 'Source Code Pro', 'Monaco'],
                    fontSize: 10,
                    margins: '0.5in',
                    lineSpacing: 1.1
                }
            }
        };
    }
}

class Utils {
    static async makeApiRequest(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    static async getStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(keys, resolve);
        });
    }

    static async setStorageData(data) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(data, resolve);
        });
    }

    static async getLocalStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    }

    static async setLocalStorageData(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, resolve);
        });
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static sanitizeText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-.,!?()]/g, '')
            .trim();
    }

    static extractEmails(text) {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        return text.match(emailRegex) || [];
    }

    static extractPhones(text) {
        const phoneRegex = /(\+\d{1,3}[- ]?)?\d{10}|\(\d{3}\)\s*\d{3}[- ]?\d{4}|\d{3}[- ]?\d{3}[- ]?\d{4}/g;
        return text.match(phoneRegex) || [];
    }

    static extractUrls(text) {
        const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
        return text.match(urlRegex) || [];
    }

    static calculateReadingTime(text) {
        const wordsPerMinute = 200;
        const words = text.split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return minutes;
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        return new Intl.DateTimeFormat('en-US', mergedOptions).format(new Date(date));
    }

    static getRelativeTime(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
        
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 },
            { label: 'second', seconds: 1 }
        ];
        
        for (const interval of intervals) {
            const count = Math.floor(diffInSeconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
            }
        }
        
        return 'just now';
    }

    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text).catch(err => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        });
    }

    static downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static parseJobSalary(salaryText) {
        if (!salaryText) return null;
        
        const numericRegex = /[\d,]+/g;
        const numbers = salaryText.match(numericRegex);
        
        if (!numbers) return null;
        
        const cleanNumbers = numbers.map(n => parseInt(n.replace(/,/g, '')));
        const isHourly = /hour|hr|\/hr/i.test(salaryText);
        const isYearly = /year|annual|\/yr|annually/i.test(salaryText);
        
        return {
            min: Math.min(...cleanNumbers),
            max: Math.max(...cleanNumbers),
            type: isHourly ? 'hourly' : isYearly ? 'yearly' : 'unknown',
            currency: salaryText.includes('$') ? 'USD' : null,
            original: salaryText
        };
    }

    static extractExperienceLevel(text) {
        const levels = {
            'entry': ['entry', 'junior', 'associate', '0-2 years', 'graduate', 'intern'],
            'mid': ['mid', 'intermediate', '2-5 years', '3-7 years', 'experienced'],
            'senior': ['senior', 'lead', '5+ years', '7+ years', 'principal', 'staff'],
            'executive': ['director', 'vp', 'cto', 'ceo', 'head of', 'chief']
        };
        
        const lowerText = text.toLowerCase();
        
        for (const [level, keywords] of Object.entries(levels)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return level;
            }
        }
        
        return 'unknown';
    }

    static scoreJobMatch(jobDetails, userProfile) {
        if (!jobDetails || !userProfile) return 0;
        
        let score = 0;
        let maxScore = 0;
        
        // Skills matching (40% weight)
        const jobSkills = jobDetails.skills || [];
        const userSkills = userProfile.skills || [];
        const skillsWeight = 40;
        
        if (jobSkills.length > 0) {
            const matchingSkills = jobSkills.filter(skill => 
                userSkills.some(userSkill => 
                    userSkill.toLowerCase().includes(skill.toLowerCase()) ||
                    skill.toLowerCase().includes(userSkill.toLowerCase())
                )
            );
            score += (matchingSkills.length / jobSkills.length) * skillsWeight;
        }
        maxScore += skillsWeight;
        
        // Experience level matching (30% weight)
        const jobExperience = this.extractExperienceLevel(jobDetails.description || '');
        const userExperience = userProfile.experienceLevel || 'unknown';
        const experienceWeight = 30;
        
        if (jobExperience !== 'unknown' && userExperience !== 'unknown') {
            const experienceMatch = jobExperience === userExperience ? 1 : 0.5;
            score += experienceMatch * experienceWeight;
        }
        maxScore += experienceWeight;
        
        // Location matching (20% weight)
        const locationWeight = 20;
        if (jobDetails.location && userProfile.location) {
            const locationMatch = jobDetails.location.toLowerCase().includes(userProfile.location.toLowerCase()) ||
                                 userProfile.location.toLowerCase().includes(jobDetails.location.toLowerCase());
            if (locationMatch) {
                score += locationWeight;
            }
        }
        maxScore += locationWeight;
        
        // Industry matching (10% weight)
        const industryWeight = 10;
        if (jobDetails.industry && userProfile.industry) {
            const industryMatch = jobDetails.industry.toLowerCase() === userProfile.industry.toLowerCase();
            if (industryMatch) {
                score += industryWeight;
            }
        }
        maxScore += industryWeight;
        
        return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    }
}

class Logger {
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };
        
        console[level](`[Resume AI] ${timestamp}: ${message}`, data || '');
        
        // Store logs for debugging
        this.storeLogs(logEntry);
    }

    static info(message, data = null) {
        this.log('info', message, data);
    }

    static warn(message, data = null) {
        this.log('warn', message, data);
    }

    static error(message, data = null) {
        this.log('error', message, data);
    }

    static async storeLogs(logEntry) {
        try {
            const result = await Utils.getLocalStorageData(['logs']);
            const logs = result.logs || [];
            
            logs.push(logEntry);
            
            // Keep only last 100 logs
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            await Utils.setLocalStorageData({ logs });
        } catch (error) {
            console.error('Failed to store log:', error);
        }
    }

    static async exportLogs() {
        try {
            const result = await Utils.getLocalStorageData(['logs']);
            const logs = result.logs || [];
            
            const logContent = logs.map(log => 
                `${log.timestamp} [${log.level.toUpperCase()}]: ${log.message} ${log.data ? JSON.stringify(log.data) : ''}`
            ).join('\n');
            
            Utils.downloadFile(logContent, `resume-ai-logs-${Date.now()}.txt`, 'text/plain');
        } catch (error) {
            console.error('Failed to export logs:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Config, Utils, Logger };
}
