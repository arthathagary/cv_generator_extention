// Content script for Resume AI Chrome Extension - Site-specific job extraction
class JobExtractor {
    constructor() {
        this.jobDetails = null;
        this.currentSite = this.detectJobSite();
        this.init();
    }

    init() {
        this.setupMessageListener();
        if (this.currentSite && this.currentSite !== 'unknown') {
            this.injectUI();
            // Auto-detect job details on supported sites
            setTimeout(() => this.autoDetectJob(), 2000);
        }
    }

    detectJobSite() {
        const hostname = window.location.hostname.toLowerCase();
        const url = window.location.href.toLowerCase();

        // LinkedIn Jobs
        if (hostname.includes('linkedin.com') && url.includes('/jobs/')) {
            return 'linkedin';
        }
        
        // Indeed
        if (hostname.includes('indeed.com') && url.includes('/job')) {
            return 'indeed';
        }
        
        // Glassdoor
        if (hostname.includes('glassdoor.com') && url.includes('/job')) {
            return 'glassdoor';
        }
        
        // Monster
        if (hostname.includes('monster.com') && url.includes('/job')) {
            return 'monster';
        }
        
        // ZipRecruiter
        if (hostname.includes('ziprecruiter.com') && url.includes('/job')) {
            return 'ziprecruiter';
        }
        
        // CareerBuilder
        if (hostname.includes('careerbuilder.com') && url.includes('/job')) {
            return 'careerbuilder';
        }
        
        // AngelList/Wellfound
        if (hostname.includes('angel.co') || hostname.includes('wellfound.com')) {
            return 'angellist';
        }
        
        // RemoteOK
        if (hostname.includes('remoteok.io')) {
            return 'remoteok';
        }
        
        // WeWorkRemotely
        if (hostname.includes('weworkremotely.com')) {
            return 'weworkremotely';
        }
        
        // Stack Overflow Jobs
        if (hostname.includes('stackoverflow.com') && url.includes('/job')) {
            return 'stackoverflow';
        }

        return 'unknown';
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'extractJobDetails':
                    const details = await this.extractJobDetails();
                    sendResponse({ success: true, jobDetails: details });
                    break;

                case 'checkJobDetails':
                    sendResponse({ 
                        hasJobDetails: this.jobDetails !== null,
                        jobDetails: this.jobDetails,
                        site: this.currentSite
                    });
                    break;

                case 'highlightKeywords':
                    this.highlightKeywords(request.keywords);
                    sendResponse({ success: true });
                    break;

                default:
                    // Forward unknown messages to area selector if it exists
                    if (window.resumeAIAreaSelector && 
                        typeof window.resumeAIAreaSelector.handleMessage === 'function') {
                        console.log('[Targeted] Forwarding message to area selector:', request.action);
                        window.resumeAIAreaSelector.handleMessage(request, sender, sendResponse);
                    } else {
                        sendResponse({ error: 'Unknown action' });
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    async extractJobDetails() {
        try {
            let jobData = {};
            
            switch (this.currentSite) {
                case 'linkedin':
                    jobData = this.extractLinkedInJob();
                    break;
                case 'indeed':
                    jobData = this.extractIndeedJob();
                    break;
                case 'glassdoor':
                    jobData = this.extractGlassdoorJob();
                    break;
                case 'monster':
                    jobData = this.extractMonsterJob();
                    break;
                case 'ziprecruiter':
                    jobData = this.extractZipRecruiterJob();
                    break;
                case 'careerbuilder':
                    jobData = this.extractCareerBuilderJob();
                    break;
                case 'angellist':
                    jobData = this.extractAngelListJob();
                    break;
                case 'remoteok':
                    jobData = this.extractRemoteOKJob();
                    break;
                case 'weworkremotely':
                    jobData = this.extractWeWorkRemotelyJob();
                    break;
                case 'stackoverflow':
                    jobData = this.extractStackOverflowJob();
                    break;
                default:
                    throw new Error(`Unsupported job site: ${this.currentSite}`);
            }

            // Add metadata
            jobData.extractedAt = new Date().toISOString();
            jobData.url = window.location.href;
            jobData.site = this.currentSite;

            this.jobDetails = jobData;
            return jobData;

        } catch (error) {
            console.error('Error extracting job details:', error);
            throw error;
        }
    }

    extractLinkedInJob() {
        const jobData = {
            title: this.getTextContent([
                '.top-card-layout__title',
                '.jobs-unified-top-card__job-title h1',
                'h1[data-automation-id="jobPostingHeader"]'
            ]),
            company: this.getTextContent([
                '.top-card-layout__card .top-card-layout__entity-info a',
                '.jobs-unified-top-card__company-name a',
                'span[data-automation-id="job-detail-company"]'
            ]),
            location: this.getTextContent([
                '.top-card-layout__card .top-card-layout__entity-info .topcard__flavor',
                '.jobs-unified-top-card__bullet',
                'span[data-automation-id="job-detail-location"]'
            ]),
            description: this.getTextContent([
                '.jobs-description__content',
                '.jobs-box__html-content',
                'div[data-automation-id="jobPostingDescription"]'
            ]),
            requirements: this.extractRequirements([
                '.jobs-description__content',
                '.jobs-box__html-content'
            ]),
            jobType: this.getTextContent([
                '.jobs-unified-top-card__job-insight span',
                '.job-criteria dd'
            ]),
            seniority: this.getTextContent([
                '.job-criteria__text--criteria'
            ]),
            postedTime: this.getTextContent([
                '.jobs-unified-top-card__posted-date',
                'span[data-automation-id="job-detail-date"]'
            ])
        };

        return this.cleanJobData(jobData);
    }

    extractIndeedJob() {
        const jobData = {
            title: this.getTextContent([
                'h1[data-testid="jobsearch-JobInfoHeader-title"]',
                '.jobsearch-JobInfoHeader-title',
                'h1.jobTitle'
            ]),
            company: this.getTextContent([
                'span[data-testid="jobsearch-JobInfoHeader-companyName"]',
                '.jobsearch-JobInfoHeader-subtitle a',
                '.jobCompany'
            ]),
            location: this.getTextContent([
                'div[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
                '.jobsearch-JobInfoHeader-subtitle div',
                '.jobLocation'
            ]),
            salary: this.getTextContent([
                'span[data-testid="jobsearch-JobMetadataHeader-item"]',
                '.jobsearch-JobMetadataHeader-item',
                '.salary-snippet'
            ]),
            description: this.getTextContent([
                '#jobDescriptionText',
                '.jobsearch-jobDescriptionText',
                '.job-description'
            ]),
            requirements: this.extractRequirements([
                '#jobDescriptionText',
                '.jobsearch-jobDescriptionText'
            ]),
            jobType: this.getTextContent([
                'span[data-testid="jobsearch-JobMetadataHeader-item"]'
            ]),
            postedTime: this.getTextContent([
                'span[data-testid="jobsearch-JobMetadataHeader-item"]'
            ])
        };

        return this.cleanJobData(jobData);
    }

    extractGlassdoorJob() {
        const jobData = {
            title: this.getTextContent([
                'h1[data-test="job-title"]',
                '.jobHeader h1',
                '.job-title'
            ]),
            company: this.getTextContent([
                'span[data-test="employer-name"]',
                '.jobHeader .employer',
                '.company-name'
            ]),
            location: this.getTextContent([
                'span[data-test="job-location"]',
                '.jobHeader .location',
                '.job-location'
            ]),
            salary: this.getTextContent([
                'span[data-test="salary-estimate"]',
                '.salary-estimate',
                '.salary'
            ]),
            description: this.getTextContent([
                'div[data-test="jobDescriptionContainer"]',
                '.jobDescription',
                '.job-description'
            ]),
            requirements: this.extractRequirements([
                'div[data-test="jobDescriptionContainer"]',
                '.jobDescription'
            ]),
            rating: this.getTextContent([
                'span[data-test="rating"]',
                '.rating'
            ])
        };

        return this.cleanJobData(jobData);
    }

    extractMonsterJob() {
        const jobData = {
            title: this.getTextContent([
                'h1[data-testid="svx-job-header-job-title"]',
                '.job-header h1',
                '.job-title'
            ]),
            company: this.getTextContent([
                'a[data-testid="svx-job-header-company-name"]',
                '.job-header .company',
                '.company-name'
            ]),
            location: this.getTextContent([
                'span[data-testid="svx-job-header-location"]',
                '.job-header .location',
                '.job-location'
            ]),
            salary: this.getTextContent([
                'span[data-testid="svx-job-header-salary"]',
                '.salary-info',
                '.salary'
            ]),
            description: this.getTextContent([
                'div[data-testid="svx-job-description"]',
                '.job-description',
                '.description'
            ]),
            requirements: this.extractRequirements([
                'div[data-testid="svx-job-description"]',
                '.job-description'
            ])
        };

        return this.cleanJobData(jobData);
    }

    extractZipRecruiterJob() {
        const jobData = {
            title: this.getTextContent([
                'h1[data-testid="job-title"]',
                '.job_title h1',
                '.job-title'
            ]),
            company: this.getTextContent([
                'a[data-testid="company-name"]',
                '.company_name',
                '.company-name'
            ]),
            location: this.getTextContent([
                'span[data-testid="job-location"]',
                '.location',
                '.job-location'
            ]),
            salary: this.getTextContent([
                'span[data-testid="compensation"]',
                '.compensation',
                '.salary'
            ]),
            description: this.getTextContent([
                'div[data-testid="job-description"]',
                '.job_description',
                '.description'
            ]),
            requirements: this.extractRequirements([
                'div[data-testid="job-description"]',
                '.job_description'
            ])
        };

        return this.cleanJobData(jobData);
    }

    extractCareerBuilderJob() {
        const jobData = {
            title: this.getTextContent([
                'h1[data-testid="job-title"]',
                '.job-title h1'
            ]),
            company: this.getTextContent([
                'span[data-testid="company-name"]',
                '.company-name'
            ]),
            location: this.getTextContent([
                'span[data-testid="job-location"]',
                '.job-location'
            ]),
            description: this.getTextContent([
                'div[data-testid="job-description"]',
                '.job-description'
            ]),
            requirements: this.extractRequirements([
                'div[data-testid="job-description"]'
            ])
        };

        return this.cleanJobData(jobData);
    }

    extractAngelListJob() {
        const jobData = {
            title: this.getTextContent([
                'h1[data-test="JobTitle"]',
                '.job-title h1'
            ]),
            company: this.getTextContent([
                'a[data-test="StartupLink"]',
                '.company-name'
            ]),
            location: this.getTextContent([
                'span[data-test="JobLocation"]',
                '.location'
            ]),
            description: this.getTextContent([
                'div[data-test="JobDescription"]',
                '.job-description'
            ]),
            requirements: this.extractRequirements([
                'div[data-test="JobDescription"]'
            ]),
            equity: this.getTextContent([
                'span[data-test="EquityRange"]'
            ])
        };

        return this.cleanJobData(jobData);
    }

    extractRemoteOKJob() {
        const jobData = {
            title: this.getTextContent([
                'h1',
                '.title'
            ]),
            company: this.getTextContent([
                '.company h3',
                '.company-name'
            ]),
            description: this.getTextContent([
                '.description',
                '.job-description'
            ]),
            requirements: this.extractRequirements([
                '.description'
            ]),
            tags: this.getTags([
                '.tags .tag'
            ])
        };

        return this.cleanJobData(jobData);
    }

    extractWeWorkRemotelyJob() {
        const jobData = {
            title: this.getTextContent([
                'h1',
                '.listing-header h1'
            ]),
            company: this.getTextContent([
                '.company h2',
                '.company-name'
            ]),
            description: this.getTextContent([
                '.listing-container',
                '.job-description'
            ]),
            requirements: this.extractRequirements([
                '.listing-container'
            ])
        };

        return this.cleanJobData(jobData);
    }

    extractStackOverflowJob() {
        const jobData = {
            title: this.getTextContent([
                'h1[data-test-id="job-title"]',
                '.job-title h1'
            ]),
            company: this.getTextContent([
                'a[data-test-id="company-name"]',
                '.company-name'
            ]),
            location: this.getTextContent([
                'span[data-test-id="job-location"]',
                '.location'
            ]),
            description: this.getTextContent([
                'div[data-test-id="job-description"]',
                '.job-description'
            ]),
            requirements: this.extractRequirements([
                'div[data-test-id="job-description"]'
            ]),
            tags: this.getTags([
                '.tags .tag'
            ])
        };

        return this.cleanJobData(jobData);
    }

    getTextContent(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        return '';
    }

    getTags(selectors) {
        const tags = [];
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.textContent.trim()) {
                    tags.push(el.textContent.trim());
                }
            });
        }
        return tags;
    }

    extractRequirements(selectors) {
        const requirements = [];
        const description = this.getTextContent(selectors);
        
        if (!description) return requirements;

        // Common requirement keywords
        const skillPatterns = [
            /(?:experience (?:with|in)|knowledge of|proficient in|skilled in|familiar with)\s+([^,.;]+)/gi,
            /(?:requirements?|qualifications?|skills?)[:\s]*([^.]+)/gi,
            /(?:must have|should have|required)[:\s]*([^.]+)/gi,
            /\b(?:JavaScript|Python|Java|React|Node\.js|SQL|HTML|CSS|AWS|Docker|Kubernetes|Git|TypeScript|Angular|Vue|PHP|Ruby|Go|Rust|Swift|Kotlin|C\+\+|C#|\.NET|Spring|Django|Flask|Express|MongoDB|PostgreSQL|MySQL|Redis|GraphQL|REST|API|CI\/CD|DevOps|Agile|Scrum|Machine Learning|AI|Data Science|Analytics)\b/gi
        ];

        skillPatterns.forEach(pattern => {
            const matches = description.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const clean = match.replace(/^(?:experience with|knowledge of|proficient in|skilled in|familiar with|requirements?|qualifications?|skills?|must have|should have|required)[:\s]*/i, '').trim();
                    if (clean && clean.length > 2 && clean.length < 50) {
                        requirements.push(clean);
                    }
                });
            }
        });

        return [...new Set(requirements)]; // Remove duplicates
    }

    cleanJobData(jobData) {
        const cleaned = {};
        
        for (const [key, value] of Object.entries(jobData)) {
            if (typeof value === 'string') {
                cleaned[key] = value.replace(/\s+/g, ' ').trim();
            } else if (Array.isArray(value)) {
                cleaned[key] = value.filter(item => item && item.trim());
            } else {
                cleaned[key] = value;
            }
        }

        return cleaned;
    }

    async autoDetectJob() {
        if (this.currentSite === 'unknown') return;

        try {
            const jobDetails = await this.extractJobDetails();
            if (jobDetails && jobDetails.title) {
                // Send extracted details to background script
                chrome.runtime.sendMessage({
                    action: 'jobDetected',
                    jobDetails: jobDetails,
                    site: this.currentSite
                });
            }
        } catch (error) {
            console.log('Auto-detection failed:', error.message);
        }
    }

    injectUI() {
        // Create extraction indicator
        if (!document.getElementById('resume-ai-indicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'resume-ai-indicator';
            indicator.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #0066cc;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 20px;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    z-index: 10000;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    cursor: pointer;
                ">
                    📄 Resume AI - ${this.currentSite.charAt(0).toUpperCase() + this.currentSite.slice(1)} Job Detected
                </div>
            `;
            
            indicator.addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: 'openPopup' });
            });
            
            document.body.appendChild(indicator);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.style.opacity = '0.7';
                }
            }, 5000);
        }
    }

    highlightKeywords(keywords) {
        if (!keywords || keywords.length === 0) return;

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            
            textNodes.forEach(textNode => {
                if (regex.test(textNode.textContent)) {
                    const parent = textNode.parentNode;
                    if (parent && !parent.querySelector('.resume-ai-highlight')) {
                        const highlightedHTML = textNode.textContent.replace(regex, 
                            `<span class="resume-ai-highlight" style="background-color: yellow; padding: 1px 2px;">${keyword}</span>`
                        );
                        
                        const wrapper = document.createElement('span');
                        wrapper.innerHTML = highlightedHTML;
                        parent.replaceChild(wrapper, textNode);
                    }
                }
            });
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new JobExtractor());
} else {
    new JobExtractor();
}
