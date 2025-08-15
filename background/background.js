// Background service worker for Resume AI Chrome Extension

console.log('🚀 Background script starting...');

// IMMEDIATELY set up external connection handler (before anything else)
chrome.runtime.onConnect.addListener((port) => {
    console.log('🔌 EXTERNAL CONNECTION RECEIVED:', port.name, 'from:', port.sender?.url);
    console.log('🔌 Port details:', {
        name: port.name,
        sender: port.sender,
        senderUrl: port.sender?.url,
        senderOrigin: port.sender?.origin
    });
    
    if (port.name === 'auth') {
        console.log('✅ Auth port connection accepted - setting up handlers');
        
        port.onMessage.addListener(async (message) => {
            console.log('📨 Connection message received:', message);
            if (message.type === 'EXTENSION_CONNECTED') {
                console.log('🔗 Processing extension connection:', message);
                
                // Store the token directly in background script
                try {
                    const dataToStore = {
                        webAppConnected: true,
                        accessToken: message.accessToken,
                        userId: message.userId,
                        userProfile: message.profile,
                        connectionTime: new Date().toISOString()
                    };
                    
                    await chrome.storage.sync.set(dataToStore);
                    console.log('💾 Connection data stored successfully:', dataToStore);
                    
                    // Verify storage
                    const stored = await chrome.storage.sync.get(['webAppConnected', 'accessToken', 'userProfile']);
                    console.log('🔍 Verification - stored data:', stored);
                    
                } catch (error) {
                    console.error('❌ Failed to store token:', error);
                }
                
                // Forward the message to any listening popup
                chrome.runtime.sendMessage(message).catch(() => {
                    console.log('📢 No popup listening, token stored in background');
                });
                
                // Send acknowledgment
                console.log('📤 Sending acknowledgment to web app');
                port.postMessage({ success: true, received: true, stored: true });
                
                // Don't disconnect immediately, let the web app handle it
                setTimeout(() => {
                    try {
                        console.log('🔌 Closing connection after delay');
                        port.disconnect();
                    } catch (e) {
                        console.log('🔌 Port already disconnected');
                    }
                }, 1000);
            }
        });
        
        port.onDisconnect.addListener(() => {
            console.log('🔌 Auth port disconnected');
            if (chrome.runtime.lastError) {
                console.log('🔌 Disconnect error:', chrome.runtime.lastError.message);
            }
        });
    } else {
        console.log('❌ Unknown port name:', port.name);
    }
});

console.log('✅ External connection handler registered');

// Also add a message listener for external messages (alternative method)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    console.log('📨 External message received:', message, 'from:', sender);
    
    if (message.type === 'EXTENSION_CONNECTED') {
        console.log('🔗 Processing external connection message:', message);
        
        // Handle the connection the same way
        (async () => {
            try {
                const dataToStore = {
                    webAppConnected: true,
                    accessToken: message.accessToken,
                    userId: message.userId,
                    userProfile: message.profile,
                    connectionTime: new Date().toISOString()
                };
                
                await chrome.storage.sync.set(dataToStore);
                console.log('💾 External message - data stored successfully:', dataToStore);
                
                sendResponse({ success: true, received: true, stored: true, method: 'external_message' });
            } catch (error) {
                console.error('❌ External message - failed to store:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        
        return true; // Keep sendResponse callback alive
    }
    
    return false;
});

console.log('✅ External message handler also registered');

// Cache for config to avoid repeated loading
let cachedConfig = null;

// Load configuration from file
async function loadConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }
    
    try {
        // Try loading JSON config first (simpler and more reliable)
        const configUrl = chrome.runtime.getURL('utils/config.json');
        const configResponse = await fetch(configUrl);
        
        if (configResponse.ok) {
            cachedConfig = await configResponse.json();
            console.log('Config loaded successfully from JSON:', cachedConfig);
            return cachedConfig;
        }
    } catch (jsonError) {
        console.log('JSON config not found, trying JS config:', jsonError);
    }
    
    try {
        // Fallback to JS config file
        const configUrl = chrome.runtime.getURL('utils/app-config.js');
        const configResponse = await fetch(configUrl);
        const configText = await configResponse.text();
        
        // Execute the config file to get the CONFIG object
        const configFunc = new Function(configText + '; return CONFIG;');
        cachedConfig = configFunc();
        
        console.log('Config loaded successfully from JS:', cachedConfig);
        return cachedConfig;
    } catch (configError) {
        console.log('Could not load any config file, using defaults:', configError);
        // Return default config
        cachedConfig = {
            BACKEND_API_URL: 'http://localhost:3000',
            BACKEND_API_TIMEOUT: 30000,
            BACKEND_API_RETRY_ATTEMPTS: 3,
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
        return cachedConfig;
    }
}

// Service worker startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Resume AI Service Worker started');
    // Try to setup context menus on startup as well
    setTimeout(() => {
        setupContextMenus();
    }, 200);
});

// Initialize extension when service worker starts
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Resume AI Extension installed:', details.reason);
    
    // Add a small delay to ensure APIs are fully loaded
    setTimeout(() => {
        setupContextMenus();
    }, 100);
    
    if (details.reason === 'install') {
        // Open options page on first install
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    }
});

// Set up message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action || request.type);
    console.log('Full message:', request);
    console.log('Sender:', sender);
    
    // Handle connection messages from web app
    if (request.type === 'EXTENSION_CONNECTED') {
        console.log('Extension connection message received:', request);
        
        // Forward the message to popup if it's open
        chrome.runtime.sendMessage(request).catch(error => {
            console.log('Could not forward to popup (popup might be closed):', error);
        });
        
        // Send response to acknowledge receipt
        sendResponse({ success: true, received: true });
        return true; // Keep channel open
    }
    
    // Handle each action case
    switch (request.action) {
        case 'extractJobDetailsFromContent':
            extractJobDetailsFromContent(request.pageContent, request.url)
                .then(jobDetails => {
                    sendResponse({ success: true, jobDetails: jobDetails });
                })
                .catch(error => {
                    console.error('Error extracting job details from content:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep channel open for async response
            
        case 'generateCV':
            console.log('[Background] CV generation request received:', request);
            
            // Handle both old format (jobDetails, userProfile) and new format (data object)
            const jobDetails = request.data ? request.data.jobAnalysis : request.jobDetails;
            const userProfile = request.data ? request.data.userProfile : request.userProfile;
            
            console.log('[Background] Processing CV generation with:', { 
                hasJobDetails: !!jobDetails, 
                hasUserProfile: !!userProfile,
                jobTitle: jobDetails?.title || 'Unknown'
            });
            
            generateCV(jobDetails, userProfile)
                .then(cvData => {
                    console.log('[Background] CV generation successful:', {
                        hasContent: !!cvData.content,
                        contentLength: cvData.content?.length || 0,
                        dataStructure: Object.keys(cvData)
                    });
                    sendResponse({ success: true, cvData: cvData });
                })
                .catch(error => {
                    console.error('[Background] Error generating CV:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep channel open for async response
            
        case 'saveJobDetails':
            chrome.storage.local.set({ jobDetails: request.jobDetails })
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('Error saving job details:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep channel open for async response
            
        case 'analyzeJob':
            analyzeJobDetails(request.jobDetails)
                .then(analysis => {
                    sendResponse({ success: true, data: analysis });
                })
                .catch(error => {
                    console.error('Error analyzing job:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep channel open for async response
            
        case 'fetchProfile':
            fetchUserProfile()
                .then(profile => {
                    sendResponse({ success: true, data: profile });
                })
                .catch(error => {
                    console.error('Error fetching profile:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep channel open for async response
            
        case 'saveProfile':
            chrome.storage.sync.set({ userProfile: request.profile })
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('Error saving profile:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep channel open for async response
            
        case 'jobDetected':
            // Job was automatically detected on a supported site
            console.log('Job detected on', request.site, ':', request.jobDetails.title);
            
            // Save the detected job details
            chrome.storage.local.set({ 
                lastDetectedJob: {
                    ...request.jobDetails,
                    detectedAt: new Date().toISOString(),
                    site: request.site
                }
            });
            
            // Show notification if enabled
            chrome.storage.sync.get(['showNotifications'])
                .then(result => {
                    if (result.showNotifications !== false) {
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: 'icons/icon48.png',
                            title: 'Resume AI - Job Detected',
                            message: `Found: ${request.jobDetails.title} at ${request.jobDetails.company || request.site}`
                        });
                    }
                });
            
            sendResponse({ success: true });
            return false; // Synchronous response
            
        case 'cursorSelectionComplete':
            // This message is intended for the popup, don't intercept it
            console.log('Cursor selection completed - letting popup handle this message');
            // Don't call sendResponse() so the message can reach the popup
            return false; // Let other listeners handle this
            
        case 'settingsUpdated':
            // Handle settings update notification
            console.log('Settings updated:', request.settings);
            sendResponse({ success: true });
            return false; // Synchronous response
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
            return false; // Synchronous response
    }
});

// Monitor tab updates to show job site indicators
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        checkJobSite(tabId, tab.url);
    }
});

function setupContextMenus() {
    // Check if contextMenus API is available
    if (!chrome.contextMenus) {
        console.log('Context menus API not available - skipping context menu setup');
        return;
    }
    
    try {
        // Simple approach - just create the menus directly
        console.log('Setting up context menus...');
        
        chrome.contextMenus.create({
            id: 'analyzeJob',
            title: 'Analyze job with Resume AI',
            contexts: ['page']
        }, () => {
            if (chrome.runtime.lastError) {
                // Menu might already exist, try to remove and recreate
                console.log('Menu already exists, this is normal on reload');
            } else {
                console.log('Created analyzeJob context menu');
            }
        });

        chrome.contextMenus.create({
            id: 'generateCV',
            title: 'Generate CV for this job',
            contexts: ['page']
        }, () => {
            if (chrome.runtime.lastError) {
                // Menu might already exist, try to remove and recreate
                console.log('Menu already exists, this is normal on reload');
            } else {
                console.log('Created generateCV context menu');
            }
        });
        
    } catch (error) {
        console.error('Error setting up context menus:', error);
        
        // Fallback: try without context menus
        console.log('Context menus failed to setup, extension will work without right-click menus');
    }
}

// Set up context menu click handler
if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        try {
            chrome.tabs.sendMessage(tab.id, {
                action: info.menuItemId,
                text: info.selectionText
            });
        } catch (error) {
            console.error('Error sending message to content script:', error);
        }
    });
}

function checkJobSite(tabId, url) {
    // Universal cursor selection support - no specific site detection needed
    chrome.action.setBadgeText({ text: '', tabId: tabId });
    chrome.action.setTitle({ 
        title: 'Resume AI - Select job text and extract details from any website',
        tabId: tabId 
    });
}

async function generateCV(jobDetails, userProfile) {
    try {
        console.log('Generating CV for job:', jobDetails.title);
        
        // Load config
        const CONFIG = await loadConfig();
        
        // Get backend API URL from config or settings (settings override config)
        const settings = await chrome.storage.sync.get(['backendApiUrl']);
        const apiUrl = settings.backendApiUrl || CONFIG?.BACKEND_API_URL || 'http://localhost:3000';
        
        // Get accessToken if available
        const { accessToken } = await chrome.storage.sync.get(['accessToken']);
        
        // Send job details and user profile to your backend for AI processing
        const response = await fetch(`${apiUrl}/api/extension/cv`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({
                jobAnalysis: jobDetails,
                userProfile: userProfile,
                requestType: 'ats-cv-generation',
                timestamp: Date.now()
            })
        });

        if (!response.ok) {
            throw new Error(`Backend API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        console.log('[CV Generation] Backend response:', {
            success: result.success,
            hasCvContent: !!result.cvContent,
            cvContentType: typeof result.cvContent,
            cvContentKeys: result.cvContent ? Object.keys(result.cvContent) : 'N/A'
        });
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to generate CV via backend');
        }

        // Ensure we have the CV content
        let cvContent = result.cvContent;
        if (typeof cvContent === 'object' && cvContent.content) {
            cvContent = cvContent.content;
        }
        
        if (!cvContent) {
            console.error('[CV Generation] No CV content in backend response:', result);
            throw new Error('Backend returned empty CV content');
        }

        return {
            content: cvContent,
            jobTitle: jobDetails.title,
            company: jobDetails.company,
            timestamp: new Date().toISOString(),
            atsOptimized: true,
            matchScore: result.cvContent.matchScore || null,
            matchAnalysis: result.cvContent.matchAnalysis || null,
            generatedBy: 'Backend_AI',
            metadata: result.metadata
        };
    } catch (error) {
        console.error('Error generating CV via backend:', error);
        throw new Error('CV generation failed: ' + error.message);
    }
}

async function analyzeJobDetails(jobDetails) {
    try {
        // Load config
        const CONFIG = await loadConfig();
        
        // Get backend API URL from config or settings (settings override config)
        const settings = await chrome.storage.sync.get(['backendApiUrl']);
        const apiUrl = settings.backendApiUrl || CONFIG?.BACKEND_API_URL || 'http://localhost:3000';
        
        // Get accessToken if available
        const { accessToken } = await chrome.storage.sync.get(['accessToken']);
        // Send job details to backend for analysis
        const response = await fetch(`${apiUrl}${CONFIG?.ENDPOINTS?.ANALYZE_JOB || '/api/analyze-job'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({
                jobDetails: jobDetails,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`Backend API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to analyze job via backend');
        }

        return result.analysis;
    } catch (error) {
        console.error('Error analyzing job details via backend:', error);
        // Return basic analysis as fallback
        return {
            analysis: 'Job analysis completed via extension',
            keySkills: jobDetails.skills || [],
            recommendations: ['Tailor CV to match job requirements', 'Include relevant keywords', 'Highlight matching experience']
        };
    }
}

async function fetchUserProfile() {
    try {
        const result = await chrome.storage.sync.get(['userProfile']);
        return result.userProfile || {
            name: '',
            email: '',
            phone: '',
            experience: '',
            skills: '',
            education: ''
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

async function extractJobDetailsFromContent(pageContent, url) {
    try {
        console.log('Extracting job details from page content using your backend API...');
        console.log("page content in background", pageContent);        
        
        // Load config
        const CONFIG = await loadConfig();
        
        // Get backend API URL from config or settings (settings override config)
        const settings = await chrome.storage.sync.get(['backendApiUrl']);
        const apiUrl = settings.backendApiUrl || CONFIG?.BACKEND_API_URL || 'http://localhost:3000';
        
        // Get accessToken if available
        const { accessToken } = await chrome.storage.sync.get(['accessToken']);
        if (accessToken) {
    console.log('Access token is available:', accessToken);
} else {
    console.warn('No access token found in chrome.storage.sync');
}
        // Send page content to your backend API for AI processing
        const response = await fetch(`${apiUrl}${CONFIG?.ENDPOINTS?.EXTRACT_JOB || '/api/extract-job-details'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({
                pageContent: pageContent,
                url: url,
                extractedAt: new Date().toISOString(),
                accessToken: accessToken
            })
        });

        if (!response.ok) {
            throw new Error(`Backend API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to extract job details from backend');
        }

        const jobDetails = result.jobDetails;

        // Clean up and validate the extracted data
        const cleanedJobDetails = {
            title: jobDetails.title || 'Unknown Position',
            company: jobDetails.company || 'Unknown Company',
            location: jobDetails.location || '',
            description: jobDetails.description || pageContent.text.substring(0, 1000),
            requirements: jobDetails.requirements || '',
            responsibilities: jobDetails.responsibilities || '',
            skills: Array.isArray(jobDetails.skills) ? jobDetails.skills : [],
            salary: jobDetails.salary || '',
            jobType: jobDetails.jobType || '',
            experience: jobDetails.experience || '',
            education: jobDetails.education || '',
            benefits: jobDetails.benefits || '',
            applicationUrl: jobDetails.applicationUrl || url,
            extractedAt: new Date().toISOString(),
            sourceUrl: url,
            extractionMethod: 'Backend_AI'
        };

        console.log('Successfully extracted job details via backend:', cleanedJobDetails);
        return cleanedJobDetails;

    } catch (error) {
        console.error('Error extracting job details via backend:', error);
        
        // Fallback to basic extraction if backend is not available
        console.log('Backend unavailable, using fallback extraction...');
        return await extractJobDetailsWithFallback(pageContent, url);
    }
}

async function extractJobDetailsWithFallback(pageContent, url) {
    try {
        console.log('Using fallback extraction method...');
        
        // Simple pattern-based extraction as fallback
        const text = pageContent.text.toLowerCase();
        const title = pageContent.title;
        
        // Check if it looks like a job posting
        const jobKeywords = ['job', 'position', 'role', 'career', 'employment', 'hiring', 'vacancy', 'opportunity'];
        const hasJobKeywords = jobKeywords.some(keyword => 
            text.includes(keyword) || title.toLowerCase().includes(keyword)
        );

        if (!hasJobKeywords) {
            return {
                isJobPosting: false,
                reason: 'Page does not contain typical job posting keywords'
            };
        }

        // Extract basic information using simple patterns
        const jobDetails = {
            isJobPosting: true,
            title: extractTitleFromContent(pageContent),
            company: extractCompanyFromContent(pageContent),
            location: extractLocationFromContent(pageContent),
            description: pageContent.text.substring(0, 1000),
            requirements: extractRequirementsFromContent(pageContent),
            responsibilities: extractResponsibilitiesFromContent(pageContent),
            skills: extractSkillsFromContent(pageContent),
            salary: extractSalaryFromContent(pageContent),
            jobType: extractJobTypeFromContent(pageContent),
            experience: extractExperienceFromContent(pageContent),
            education: extractEducationFromContent(pageContent),
            benefits: extractBenefitsFromContent(pageContent),
            applicationUrl: url
        };

        return jobDetails;
    } catch (error) {
        console.error('Fallback extraction failed:', error);
        throw new Error('Unable to extract job details from this page');
    }
}

function extractTitleFromContent(pageContent) {
    // Try to find job title from page title or headings
    const title = pageContent.title;
    const firstHeading = pageContent.headings.length > 0 ? pageContent.headings[0].text : '';
    
    // Remove common website prefixes/suffixes
    const cleanTitle = title.replace(/\s*\|\s*.*$/, '').replace(/^.*\s*-\s*/, '').trim();
    
    return cleanTitle || firstHeading || 'Position';
}

function extractCompanyFromContent(pageContent) {
    // Look for company name in URL or content
    const url = pageContent.url;
    const domain = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return domain ? domain[1].split('.')[0] : 'Company';
}

function extractLocationFromContent(pageContent) {
    const text = pageContent.text;
    const locationPattern = /(?:location|based in|office|city)[\s:]*([^,.\n]+)/i;
    const match = text.match(locationPattern);
    return match ? match[1].trim() : '';
}

function extractRequirementsFromContent(pageContent) {
    const lists = pageContent.lists;
    for (const list of lists) {
        const listText = list.join(' ').toLowerCase();
        if (listText.includes('requirement') || listText.includes('qualification') || listText.includes('must have')) {
            return list.join('\n');
        }
    }
    return '';
}

function extractResponsibilitiesFromContent(pageContent) {
    const lists = pageContent.lists;
    for (const list of lists) {
        const listText = list.join(' ').toLowerCase();
        if (listText.includes('responsibilit') || listText.includes('duties') || listText.includes('you will')) {
            return list.join('\n');
        }
    }
    return '';
}

function extractSkillsFromContent(pageContent) {
    const text = pageContent.text.toLowerCase();
    const commonSkills = [
        'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js', 'typescript',
        'html', 'css', 'sql', 'mongodb', 'postgresql', 'aws', 'azure', 'docker', 'kubernetes',
        'git', 'agile', 'scrum', 'project management', 'communication', 'leadership',
        'problem solving', 'analytical', 'creative', 'teamwork'
    ];
    
    const foundSkills = commonSkills.filter(skill => text.includes(skill.toLowerCase()));
    return foundSkills;
}

function extractSalaryFromContent(pageContent) {
    const text = pageContent.text;
    const salaryPattern = /\$[\d,]+(?:\s*-\s*\$[\d,]+)?|\d+k?\s*-\s*\d+k?|\$\d+k?/i;
    const match = text.match(salaryPattern);
    return match ? match[0] : '';
}

function extractJobTypeFromContent(pageContent) {
    const text = pageContent.text.toLowerCase();
    const types = ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'freelance'];
    const foundType = types.find(type => text.includes(type));
    return foundType || '';
}

function extractExperienceFromContent(pageContent) {
    const text = pageContent.text;
    const expPattern = /(\d+)\s*(?:\+)?\s*years?\s*(?:of\s*)?(?:experience|exp)/i;
    const match = text.match(expPattern);
    return match ? match[0] : '';
}

function extractEducationFromContent(pageContent) {
    const text = pageContent.text.toLowerCase();
    const eduKeywords = ['bachelor', 'master', 'phd', 'degree', 'diploma', 'certification'];
    const foundEdu = eduKeywords.find(keyword => text.includes(keyword));
    return foundEdu || '';
}

function extractBenefitsFromContent(pageContent) {
    const lists = pageContent.lists;
    for (const list of lists) {
        const listText = list.join(' ').toLowerCase();
        if (listText.includes('benefit') || listText.includes('perk') || listText.includes('offer')) {
            return list.join('\n');
        }
    }
    return '';
}

// Global error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker Error:', event.error);
    console.error('Error details:', event.filename, event.lineno, event.colno);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker Unhandled Rejection:', event.reason);
    event.preventDefault();
});

// Runtime error handling
chrome.runtime.onConnect.addListener((port) => {
    port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
            console.error('Port disconnected:', chrome.runtime.lastError.message);
        }
    });
});

console.log('Resume AI Background Service Worker Loaded Successfully');

// Verify that connection listeners are registered
console.log('🔍 Verifying connection listeners...');
console.log('🔍 chrome.runtime.onConnect listeners count:', chrome.runtime.onConnect.hasListeners ? chrome.runtime.onConnect.hasListeners() : 'unknown');

// Test that we can handle connections by logging when one is attempted
console.log('🔍 Connection handler ready - listening for external connections');

// Debug: Log our extension ID for reference
chrome.management.getSelf((info) => {
    console.log('🆔 This extension ID is:', info.id);
    console.log('🔍 Extension name:', info.name);
    console.log('🔍 Extension enabled:', info.enabled);
});
