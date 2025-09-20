// Test suite for content script functionality
describe('JobExtractor', () => {
    let mockChrome;
    
    beforeEach(() => {
        // Mock Chrome APIs
        mockChrome = {
            runtime: {
                onMessage: {
                    addListener: jest.fn()
                },
                sendMessage: jest.fn()
            },
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            }
        };
        global.chrome = mockChrome;
        
        // Mock DOM
        document.body.innerHTML = '';
        global.window = { location: { href: 'https://linkedin.com/jobs/123' } };
    });

    describe('LinkedIn Extraction', () => {
        beforeEach(() => {
            // Mock LinkedIn page structure
            document.body.innerHTML = `
                <div class="top-card-layout__title">Software Engineer</div>
                <div class="topcard__flavor">Tech Company Inc</div>
                <div class="topcard__flavor--bullet">San Francisco, CA</div>
                <div class="description__text">
                    We are looking for a skilled software engineer with experience in 
                    JavaScript, React, Node.js and Python. The ideal candidate should 
                    have 3-5 years of experience in web development.
                </div>
            `;
        });

        test('should extract job title correctly', async () => {
            const extractor = new LinkedInExtractor();
            const result = await extractor.extract();
            
            expect(result.title).toBe('Software Engineer');
        });

        test('should extract company name correctly', async () => {
            const extractor = new LinkedInExtractor();
            const result = await extractor.extract();
            
            expect(result.company).toBe('Tech Company Inc');
        });

        test('should extract location correctly', async () => {
            const extractor = new LinkedInExtractor();
            const result = await extractor.extract();
            
            expect(result.location).toBe('San Francisco, CA');
        });

        test('should extract and parse skills correctly', async () => {
            const extractor = new LinkedInExtractor();
            const result = await extractor.extract();
            
            expect(result.skills).toContain('JavaScript');
            expect(result.skills).toContain('React');
            expect(result.skills).toContain('Node.js');
            expect(result.skills).toContain('Python');
        });

        test('should generate unique job ID', async () => {
            const extractor = new LinkedInExtractor();
            const result1 = await extractor.extract();
            const result2 = await extractor.extract();
            
            expect(result1.id).toBeDefined();
            expect(result2.id).toBeDefined();
            expect(result1.id).not.toBe(result2.id);
        });
    });

    describe('Indeed Extraction', () => {
        beforeEach(() => {
            global.window.location.href = 'https://indeed.com/viewjob?jk=123';
            document.body.innerHTML = `
                <h1 data-testid="jobsearch-JobInfoHeader-title">Frontend Developer</h1>
                <div data-testid="inlineHeader-companyName">Startup Corp</div>
                <div data-testid="job-location">Remote</div>
                <div id="jobDescriptionText">
                    Looking for a frontend developer proficient in React, Vue.js, 
                    HTML, CSS, and JavaScript. Must have experience with responsive design.
                </div>
            `;
        });

        test('should extract job details from Indeed', async () => {
            const extractor = new IndeedExtractor();
            const result = await extractor.extract();
            
            expect(result.title).toBe('Frontend Developer');
            expect(result.company).toBe('Startup Corp');
            expect(result.location).toBe('Remote');
            expect(result.skills).toContain('React');
            expect(result.skills).toContain('Vue.js');
        });
    });

    describe('Generic Extraction Fallback', () => {
        beforeEach(() => {
            global.window.location.href = 'https://unknown-job-site.com/job/123';
            document.body.innerHTML = `
                <h1 class="job-title">Data Scientist</h1>
                <div class="company">Analytics Inc</div>
                <div class="location">New York, NY</div>
                <div class="description">
                    Seeking a data scientist with Machine Learning, Python, 
                    and SQL experience. Should be familiar with TensorFlow and pandas.
                </div>
            `;
        });

        test('should fall back to generic extraction', async () => {
            const extractor = new GenericExtractor();
            const result = await extractor.extract();
            
            expect(result.title).toBe('Data Scientist');
            expect(result.company).toBe('Analytics Inc');
            expect(result.location).toBe('New York, NY');
            expect(result.skills).toContain('Machine Learning');
            expect(result.skills).toContain('Python');
            expect(result.skills).toContain('SQL');
        });
    });

    describe('Error Handling', () => {
        test('should handle missing elements gracefully', async () => {
            document.body.innerHTML = '<div>Empty page</div>';
            
            const extractor = new LinkedInExtractor();
            const result = await extractor.extract();
            
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.url).toBeDefined();
            expect(result.extractedAt).toBeDefined();
        });

        test('should clean null values from results', async () => {
            document.body.innerHTML = '<div>Empty page</div>';
            
            const extractor = new BaseExtractor();
            const result = await extractor.extract();
            
            // Should not contain null or undefined values
            Object.values(result).forEach(value => {
                expect(value).not.toBeNull();
                expect(value).not.toBeUndefined();
            });
        });
    });

    describe('Skill Parsing', () => {
        test('should parse common technical skills', () => {
            const extractor = new BaseExtractor();
            const text = 'We need someone with JavaScript, Python, React, and AWS experience';
            const skills = extractor.parseSkills(text);
            
            expect(skills).toContain('JavaScript');
            expect(skills).toContain('Python');
            expect(skills).toContain('React');
            expect(skills).toContain('AWS');
        });

        test('should handle case insensitive skill matching', () => {
            const extractor = new BaseExtractor();
            const text = 'Experience with javascript, PYTHON, and react required';
            const skills = extractor.parseSkills(text);
            
            expect(skills).toContain('JavaScript');
            expect(skills).toContain('Python');
            expect(skills).toContain('React');
        });
    });

    describe('Keyword Extraction', () => {
        test('should extract relevant keywords', () => {
            const extractor = new BaseExtractor();
            const text = 'Software development position requiring programming experience and teamwork skills';
            const keywords = extractor.parseKeywords(text);
            
            expect(keywords).toContain('software');
            expect(keywords).toContain('development');
            expect(keywords).toContain('programming');
            expect(keywords).toContain('experience');
            expect(keywords).toContain('teamwork');
            expect(keywords).toContain('skills');
        });

        test('should filter out common words', () => {
            const extractor = new BaseExtractor();
            const text = 'We are looking for the best candidate with and without experience';
            const keywords = extractor.parseKeywords(text);
            
            expect(keywords).not.toContain('the');
            expect(keywords).not.toContain('and');
            expect(keywords).not.toContain('for');
            expect(keywords).not.toContain('with');
        });
    });
});

// Mock classes for testing
class BaseExtractor {
    constructor() {
        this.selectors = this.getSelectors();
    }

    getSelectors() {
        return {};
    }

    async extract() {
        return {
            id: this.generateJobId(),
            url: window.location.href,
            extractedAt: new Date().toISOString(),
            title: this.extractTitle(),
            company: this.extractCompany(),
            location: this.extractLocation(),
            description: this.extractDescription(),
            skills: this.extractSkills(),
            keywords: this.extractKeywords()
        };
    }

    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    extractTitle() {
        return this.getTextContent(this.selectors.title);
    }

    extractCompany() {
        return this.getTextContent(this.selectors.company);
    }

    extractLocation() {
        return this.getTextContent(this.selectors.location);
    }

    extractDescription() {
        return this.getTextContent(this.selectors.description);
    }

    extractSkills() {
        const skillsText = this.getTextContent(this.selectors.skills) || this.extractDescription();
        return this.parseSkills(skillsText);
    }

    extractKeywords() {
        const fullText = [
            this.extractTitle(),
            this.extractDescription()
        ].filter(Boolean).join(' ');
        
        return this.parseKeywords(fullText);
    }

    getTextContent(selector) {
        if (!selector) return null;
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : null;
    }

    parseSkills(text) {
        if (!text) return [];
        
        const commonSkills = [
            'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
            'Angular', 'Vue.js', 'Docker', 'AWS', 'Machine Learning', 'TensorFlow'
        ];
        
        const foundSkills = [];
        const textLower = text.toLowerCase();
        
        commonSkills.forEach(skill => {
            if (textLower.includes(skill.toLowerCase())) {
                foundSkills.push(skill);
            }
        });
        
        return foundSkills;
    }

    parseKeywords(text) {
        if (!text) return [];
        
        const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.includes(word));
        
        return [...new Set(words)];
    }
}

class LinkedInExtractor extends BaseExtractor {
    getSelectors() {
        return {
            title: '.top-card-layout__title',
            company: '.topcard__flavor',
            location: '.topcard__flavor--bullet',
            description: '.description__text'
        };
    }
}

class IndeedExtractor extends BaseExtractor {
    getSelectors() {
        return {
            title: '[data-testid="jobsearch-JobInfoHeader-title"]',
            company: '[data-testid="inlineHeader-companyName"]',
            location: '[data-testid="job-location"]',
            description: '#jobDescriptionText'
        };
    }
}

class GenericExtractor extends BaseExtractor {
    getSelectors() {
        return {
            title: '.job-title',
            company: '.company',
            location: '.location',
            description: '.description'
        };
    }
}
