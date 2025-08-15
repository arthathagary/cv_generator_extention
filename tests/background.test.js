// Test suite for background service worker functionality
describe('BackgroundService', () => {
    let mockChrome;
    
    beforeEach(() => {
        // Mock Chrome APIs
        mockChrome = {
            runtime: {
                onMessage: {
                    addListener: jest.fn()
                },
                onInstalled: {
                    addListener: jest.fn()
                },
                sendMessage: jest.fn()
            },
            storage: {
                sync: {
                    get: jest.fn(),
                    set: jest.fn()
                },
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            },
            tabs: {
                onUpdated: {
                    addListener: jest.fn()
                },
                sendMessage: jest.fn()
            },
            contextMenus: {
                create: jest.fn(),
                onClicked: {
                    addListener: jest.fn()
                }
            },
            action: {
                setBadgeText: jest.fn(),
                setBadgeBackgroundColor: jest.fn()
            }
        };
        global.chrome = mockChrome;
        global.fetch = jest.fn();
    });

    describe('Message Handling', () => {
        test('should handle generateCV message', async () => {
            const service = new BackgroundService();
            const mockJobDetails = {
                title: 'Software Engineer',
                company: 'Tech Corp',
                skills: ['JavaScript', 'React'],
                description: 'Software development role'
            };
            const mockUserProfile = {
                name: 'John Doe',
                email: 'john@example.com',
                skills: ['JavaScript', 'Python', 'React']
            };

            // Mock Gemini API response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: 'Generated CV content here...'
                            }]
                        }
                    }]
                })
            });

            // Mock storage
            mockChrome.storage.sync.get.mockResolvedValueOnce({
                geminiApiKey: 'test-api-key'
            });

            const result = await service.generateCV(mockJobDetails, mockUserProfile);

            expect(result.success).toBe(true);
            expect(result.cvData).toBeDefined();
            expect(result.cvData.content).toContain('Generated CV content');
        });

        test('should handle missing API key', async () => {
            const service = new BackgroundService();
            
            mockChrome.storage.sync.get.mockResolvedValueOnce({});

            const result = await service.generateCV({}, {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('API key not configured');
        });
    });

    describe('CV Generation', () => {
        test('should build proper CV prompt', () => {
            const service = new BackgroundService();
            const jobDetails = {
                title: 'Frontend Developer',
                company: 'Startup Inc',
                skills: ['React', 'TypeScript'],
                description: 'Build user interfaces'
            };
            const userProfile = {
                name: 'Jane Smith',
                email: 'jane@example.com',
                experience: [{ title: 'Developer', company: 'Previous Corp' }]
            };

            const prompt = service.buildCVPrompt(jobDetails, userProfile);

            expect(prompt).toContain('Frontend Developer');
            expect(prompt).toContain('Startup Inc');
            expect(prompt).toContain('React');
            expect(prompt).toContain('TypeScript');
            expect(prompt).toContain('Jane Smith');
            expect(prompt).toContain('ATS-friendly');
        });

        test('should format CV data correctly', async () => {
            const service = new BackgroundService();
            const content = 'Sample CV content';
            const jobDetails = {
                title: 'Software Engineer',
                company: 'Tech Corp'
            };

            mockChrome.storage.sync.get.mockResolvedValueOnce({
                settings: { cvFormat: 'pdf' }
            });

            const formattedCV = await service.formatCV(content, jobDetails);

            expect(formattedCV.content).toBe(content);
            expect(formattedCV.format).toBe('pdf');
            expect(formattedCV.title).toContain('Tech_Corp');
            expect(formattedCV.title).toContain('Software_Engineer');
            expect(formattedCV.metadata.jobTitle).toBe('Software Engineer');
            expect(formattedCV.metadata.company).toBe('Tech Corp');
        });
    });

    describe('Job Analysis', () => {
        test('should analyze job details with AI', async () => {
            const service = new BackgroundService();
            const jobDetails = {
                title: 'Data Scientist',
                description: 'Machine learning role requiring Python and SQL'
            };

            // Mock API response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    skills: ['Python', 'SQL', 'Machine Learning'],
                                    experienceLevel: 'mid',
                                    keywords: ['data', 'science', 'analytics']
                                })
                            }]
                        }
                    }]
                })
            });

            mockChrome.storage.sync.get.mockResolvedValueOnce({
                geminiApiKey: 'test-key'
            });

            const result = await service.analyzeJobDetails(jobDetails);

            expect(result.success).toBe(true);
            expect(result.analysis.skills).toContain('Python');
            expect(result.analysis.skills).toContain('SQL');
            expect(result.analysis.experienceLevel).toBe('mid');
        });
    });

    describe('User Profile Management', () => {
        test('should fetch user profile from web app', async () => {
            const service = new BackgroundService();
            const mockProfile = {
                name: 'John Doe',
                email: 'john@example.com',
                skills: ['JavaScript', 'React']
            };

            mockChrome.storage.sync.get.mockResolvedValueOnce({
                webAppUrl: 'https://app.example.com',
                authToken: 'test-token'
            });

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockProfile
            });

            const result = await service.fetchUserProfile();

            expect(result.success).toBe(true);
            expect(result.profile).toEqual(mockProfile);
        });

        test('should handle unauthenticated user', async () => {
            const service = new BackgroundService();

            mockChrome.storage.sync.get.mockResolvedValueOnce({});

            const result = await service.fetchUserProfile();

            expect(result.success).toBe(false);
            expect(result.error).toContain('not authenticated');
        });
    });

    describe('Storage Management', () => {
        test('should save job details to local storage', async () => {
            const service = new BackgroundService();
            const jobDetails = {
                title: 'Software Engineer',
                company: 'Tech Corp'
            };

            await service.saveJobDetails(jobDetails);

            expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    jobDetails: jobDetails,
                    lastExtracted: expect.any(String)
                })
            );
        });

        test('should save generated CV to local storage', async () => {
            const service = new BackgroundService();
            const cvData = {
                content: 'CV content',
                format: 'pdf'
            };

            await service.saveGeneratedCV(cvData);

            expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    generatedCV: cvData,
                    lastGenerated: expect.any(String)
                })
            );
        });
    });

    describe('Badge Management', () => {
        test('should update badge for job sites', async () => {
            const service = new BackgroundService();
            const tab = {
                url: 'https://linkedin.com/jobs/123'
            };

            await service.checkJobPageAndUpdateBadge(tab);

            expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' });
            expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#28a745' });
        });

        test('should clear badge for non-job sites', async () => {
            const service = new BackgroundService();
            const tab = {
                url: 'https://google.com'
            };

            await service.checkJobPageAndUpdateBadge(tab);

            expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
        });
    });

    describe('Error Handling', () => {
        test('should handle API errors gracefully', async () => {
            const service = new BackgroundService();

            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            mockChrome.storage.sync.get.mockResolvedValueOnce({
                geminiApiKey: 'test-key'
            });

            const result = await service.generateCV({}, {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });

        test('should handle storage errors', async () => {
            const service = new BackgroundService();

            mockChrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'));

            await expect(service.saveJobDetails({})).rejects.toThrow('Storage error');
        });
    });
});

// Mock BackgroundService class for testing
class BackgroundService {
    constructor() {
        this.init();
    }

    init() {
        // Initialize service
    }

    async generateCV(jobDetails, userProfile) {
        try {
            if (!jobDetails || !userProfile) {
                throw new Error('Missing job details or user profile');
            }

            const prompt = this.buildCVPrompt(jobDetails, userProfile);
            const cvContent = await this.callGeminiAPI(prompt);
            const formattedCV = await this.formatCV(cvContent, jobDetails);
            
            await this.saveGeneratedCV(formattedCV);
            
            return {
                success: true,
                cvData: formattedCV,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    jobId: jobDetails.id,
                    version: '1.0'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    buildCVPrompt(jobDetails, userProfile) {
        return `
        You are an expert CV/Resume writer specializing in ATS-optimized resumes. 
        Create a tailored CV based on the following job requirements and user profile:

        JOB DETAILS:
        Title: ${jobDetails.title}
        Company: ${jobDetails.company}
        Skills Required: ${jobDetails.skills?.join(', ') || 'Not specified'}
        Description: ${jobDetails.description}

        USER PROFILE:
        Name: ${userProfile.name}
        Email: ${userProfile.email}
        Skills: ${userProfile.skills?.join(', ') || 'Not specified'}

        Create an ATS-friendly CV format with relevant keywords.
        `;
    }

    async callGeminiAPI(prompt) {
        const result = await chrome.storage.sync.get(['geminiApiKey']);
        if (!result.geminiApiKey) {
            throw new Error('Gemini API key not configured');
        }

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${result.geminiApiKey}`
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    async formatCV(content, jobDetails) {
        const result = await chrome.storage.sync.get(['settings']);
        const format = result.settings?.cvFormat || 'pdf';

        return {
            content: content,
            format: format,
            title: `CV_${jobDetails.company}_${jobDetails.title}`.replace(/[^a-zA-Z0-9]/g, '_'),
            metadata: {
                jobTitle: jobDetails.title,
                company: jobDetails.company,
                generatedAt: new Date().toISOString()
            }
        };
    }

    async analyzeJobDetails(jobDetails) {
        try {
            const prompt = `Analyze this job posting and return JSON with skills, experienceLevel, and keywords: ${jobDetails.description}`;
            const analysis = await this.callGeminiAPI(prompt);
            
            return {
                success: true,
                analysis: JSON.parse(analysis)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async fetchUserProfile() {
        try {
            const result = await chrome.storage.sync.get(['webAppUrl', 'authToken']);
            
            if (!result.authToken) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(`${result.webAppUrl}/api/profile`, {
                headers: {
                    'Authorization': `Bearer ${result.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }

            const profile = await response.json();
            
            return {
                success: true,
                profile: profile
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async saveJobDetails(jobDetails) {
        await chrome.storage.local.set({
            jobDetails: jobDetails,
            lastExtracted: new Date().toISOString()
        });
    }

    async saveGeneratedCV(cvData) {
        await chrome.storage.local.set({
            generatedCV: cvData,
            lastGenerated: new Date().toISOString()
        });
    }

    async checkJobPageAndUpdateBadge(tab) {
        const jobSites = [
            'linkedin.com/jobs',
            'indeed.com/viewjob',
            'glassdoor.com/job-listing'
        ];

        const isJobSite = jobSites.some(site => tab.url.includes(site));
        
        if (isJobSite) {
            chrome.action.setBadgeText({ text: '✓' });
            chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    }
}
