// @ts-nocheck
// Popup script for Resume AI Chrome Extension
class PopupController {
    constructor() {
        this.init();
        this.checkForPendingContent(); // Check if content was selected while popup was closed
    }

    async checkForPendingContent() {
        // Check if there's any pending content from cursor selection
        try {
            const result = await chrome.storage.local.get(['pendingSelection']);
            if (result.pendingSelection) {
                console.log('[Popup] Found pending selection:', result.pendingSelection);
                this.showSelectionPreview(result.pendingSelection);
                // Clear the pending selection
                await chrome.storage.local.remove(['pendingSelection']);
            }
        } catch (error) {
            console.error('[Popup] Error checking for pending content:', error);
        }
    }

    init() {
        this.elements = {
            jobStatus: document.getElementById('job-status-text'),
            profileIndicator: document.getElementById('profile-indicator'),
            profileText: document.getElementById('profile-text'),
            connectProfileBtn: document.getElementById('connect-profile'),
            syncProfileBtn: document.getElementById('sync-profile'),
            disconnectProfileBtn: document.getElementById('disconnect-profile'),
            extractJobBtn: document.getElementById('extract-job'),
            progressSection: document.getElementById('progress-section'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            resultsSection: document.getElementById('results-section'),
            jobSummary: document.getElementById('job-summary'),
            downloadCvBtn: document.getElementById('download-cv'),
            editCvBtn: document.getElementById('edit-cv'),
            settingsBtn: document.getElementById('settings-btn'),
            helpBtn: document.getElementById('help-btn'),
            selectionPreview: document.getElementById('selection-preview'),
            previewContent: document.getElementById('preview-content'),
            aiAnalysis: document.getElementById('ai-analysis'),
            analysisContent: document.getElementById('analysis-content'),
            generateCvBtn: document.getElementById('generate-cv-btn')
        };
        
        this.selectedContent = null;
        this.aiAnalysisResult = null;
        
        // Initialize with profile connection check
        this.initializeWithProfileCheck();
    }

    async initializeWithProfileCheck() {
        try {
            await this.enableContentSelection();
            this.setupEventListeners();
            this.checkJobPageStatus();
            this.checkProfileConnection();
        } catch (error) {
            console.error('[Popup] Error during initialization:', error);
        }
    }

    // Helper method to safely set button states
    safeSetButtonState(elementName, disabled, text = null) {
        try {
            // Validate input parameters
            if (!elementName || typeof elementName !== 'string') {
                console.warn('Invalid element name provided to safeSetButtonState:', elementName);
                return false;
            }
            
            // Check if elements object exists
            if (!this.elements) {
                console.warn('Elements object not initialized');
                return false;
            }
            
            const element = this.elements[elementName];
            if (element && element.nodeType === Node.ELEMENT_NODE) {
                // Set disabled state safely
                if (typeof disabled === 'boolean') {
                    element.disabled = disabled;
                    
                    // Add special styling for profile-required disabled buttons
                    if (disabled && text && text.includes('Connect Profile')) {
                        element.classList.add('profile-required');
                    } else {
                        element.classList.remove('profile-required');
                    }
                }
                
                // Set text content safely
                if (text !== null && typeof text === 'string') {
                    element.textContent = text;
                }
                
                return true;
            } else {
                console.warn(`Button element '${elementName}' not found or not valid DOM element`);
                return false;
            }
        } catch (error) {
            console.error(`Error setting button state for '${elementName}':`, error);
            return false;
        }
    }

    // Enable content selection only if profile is connected
    async enableContentSelection() {
        console.log('[Popup] Checking profile connection before enabling content selection');
        
        try {
            // Check if profile is connected
            const result = await chrome.storage.sync.get(['webAppConnected', 'accessToken', 'userProfile']);
            const isProfileConnected = result.webAppConnected && result.accessToken;
            
            if (!isProfileConnected) {
                console.log('[Content Selection] Profile not connected - disabling cursor selection');
                
                // Disable cursor selection button and show connection message
                this.safeSetButtonState('startCursorSelectionBtn', true, '🔒 Connect Profile First');
                
                // Show info message about connecting profile
                this.showNotification('Connect your profile to use content selection features', 'info');
                return;
            }
            
            console.log('[Content Selection] Profile connected - enabling content selection');
            
            // Show manual selection section for content selection
            
            // Enable cursor selection button
            this.safeSetButtonState('startCursorSelectionBtn', false, '👆 Start Cursor Selection');
            console.log('[Content Selection] Cursor selection button enabled');
            
        } catch (error) {
            console.error('[Content Selection] Error enabling content selection:', error);
        }
        
        // Handle cursor selection completion for AI processing
        const self = this;
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('[Popup Message] Received message:', request.action);
            console.log('[Popup Message] Full request object:', request);
            
            if (request.action === 'cursorSelectionComplete') {
                console.log('[Popup] ✅ Cursor selection completed, ready for AI processing');
                console.log('[Popup] 🔍 Checking data structure:', request.data);
                console.log('[Popup] 📊 data type:', typeof request.data);
                console.log('[Popup] 🗂️ data keys:', request.data ? Object.keys(request.data) : 'N/A');
                console.log('[Popup] 🤖 aiContent:', request.aiContent);
                
                if (!request.data && !request.aiContent) {
                    console.error('[Popup] ❌ No data or aiContent received in cursor selection message');
                    self.showNotification('❌ No content received from cursor selection', 'error');
                    sendResponse({ success: false, error: 'No content data' });
                    return;
                }
                
                // Use aiContent if available, otherwise fall back to data
                const contentToProcess = request.aiContent || request.data;
                
                // Show extracted content preview
                try {
                    self.showSelectionPreview(contentToProcess);
                    console.log('[Popup] ✅ Selection preview displayed successfully');
                    self.showNotification('🎯 Content extracted - ready for AI analysis!', 'success');
                    
                    // Update the extract button to show next step
                    self.safeSetButtonState('extractJobBtn', false, '🤖 Analyze Selected Content');
                    
                } catch (previewError) {
                    console.error('[Popup] ❌ Error showing selection preview:', previewError);
                    self.showNotification('❌ Error displaying content preview', 'error');
                }
                
                // Reset cursor selection button using safe method
                try {
                    self.safeSetButtonState('startCursorSelectionBtn', false, '👆 Start Cursor Selection');
                    console.log('[Popup] ✅ Cursor selection button reset');
                } catch (buttonError) {
                    console.warn('[Popup] ⚠️ Warning resetting cursor button:', buttonError);
                }
                
                sendResponse({ success: true });
            }
            
            return true;
        });
        
        // Update status to indicate content selection is ready
        this.updateJobStatus('Ready for content selection', 'success');
        
        // Enable manual selection button
        
        // Content selection ready
        
        // Show notification about content selection
        setTimeout(() => {
            this.showNotification('Content selection ready!', 'success');
        }, 500);
    }

    // Helper method to safely add event listeners
    safeAddEventListener(elementName, event, handler) {
        try {
            const element = this.elements[elementName];
            if (element && typeof element.addEventListener === 'function') {
                element.addEventListener(event, handler);
                return true;
            } else {
                console.warn(`Cannot add event listener to '${elementName}' - element not found or invalid`);
                return false;
            }
        } catch (error) {
            console.error(`Error adding event listener to '${elementName}':`, error);
            return false;
        }
    }

    setupEventListeners() {
        // Safe event listener setup with null checking
        this.safeAddEventListener('connectProfileBtn', 'click', () => this.connectProfile());
        this.safeAddEventListener('syncProfileBtn', 'click', () => this.syncProfileManually());
        this.safeAddEventListener('disconnectProfileBtn', 'click', () => this.disconnectProfile());
        this.safeAddEventListener('extractJobBtn', 'click', () => this.extractJobDetails());
        this.safeAddEventListener('downloadCvBtn', 'click', () => this.downloadCV());
        this.safeAddEventListener('editCvBtn', 'click', () => this.editCV());
        this.safeAddEventListener('settingsBtn', 'click', () => this.openSettings());
        this.safeAddEventListener('helpBtn', 'click', () => this.openHelp());
        
        // Add event listeners for selection and analysis buttons
        const approveBtn = document.getElementById('approve-analysis');
        const reselectBtn = document.getElementById('reselect-content');
        const generateCvBtn = document.getElementById('generate-cv-btn');
        
        if (approveBtn) {
            approveBtn.addEventListener('click', () => this.approveAnalysis());
        }
        
        if (reselectBtn) {
            reselectBtn.addEventListener('click', () => this.reselectContent());
        }
        
        if (generateCvBtn) {
            generateCvBtn.addEventListener('click', () => this.generateATSFriendlyCV());
        }
    }

    async checkJobPageStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Skip chrome:// and extension pages
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
                this.updateJobStatus('Browser internal page - extension not available', 'inactive');
                this.safeSetButtonState('extractJobBtn', true);
                return;
            }
            
            // Check if this is a known job site for enhanced extraction
            const jobSites = [
                { pattern: 'linkedin.com/jobs', name: 'LinkedIn Jobs' },
                { pattern: 'indeed.com/job', name: 'Indeed' },
                { pattern: 'indeed.com/viewjob', name: 'Indeed' },
                { pattern: 'glassdoor.com/job', name: 'Glassdoor' },
                { pattern: 'monster.com/job', name: 'Monster' },
                { pattern: 'ziprecruiter.com/job', name: 'ZipRecruiter' },
                { pattern: 'careerbuilder.com/job', name: 'CareerBuilder' },
                { pattern: 'angel.co', name: 'AngelList' },
                { pattern: 'wellfound.com', name: 'Wellfound' },
                { pattern: 'remoteok.io', name: 'RemoteOK' },
                { pattern: 'weworkremotely.com', name: 'WeWorkRemotely' },
                { pattern: 'stackoverflow.com/job', name: 'Stack Overflow Jobs' }
            ];
            
            const knownJobSite = jobSites.find(site => 
                tab.url.toLowerCase().includes(site.pattern)
            );
            
            if (knownJobSite) {
                // Known job site - offer both structured extraction and manual selection
                this.updateJobStatus(`${knownJobSite.name} detected - enhanced extraction available`, 'success');
                this.safeSetButtonState('extractJobBtn', false, `Auto-Extract from ${knownJobSite.name}`);
                
                // Check if job details are already extracted
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkJobDetails' });
                    if (response && response.hasJobDetails) {
                        this.displayJobSummary(response.jobDetails);
                    }
                } catch (error) {
                    console.log('Content script not yet ready for auto-extraction');
                }
                
            } else {
                // Any other website - check profile connection for appropriate message
                this.updateJobStatus('Website ready for content selection', 'success');
                
                // Check if profile is connected to show appropriate button text
                chrome.storage.sync.get(['webAppConnected', 'accessToken']).then(result => {
                    const isProfileConnected = result.webAppConnected && result.accessToken;
                    if (isProfileConnected) {
                        this.safeSetButtonState('extractJobBtn', false, 'Use Cursor Selection Below');
                    } else {
                        this.safeSetButtonState('extractJobBtn', true, '🔒 Connect Profile First');
                    }
                });
                
                this.showUniversalSelectionInfo();
            }
            
        } catch (error) {
            console.error('Error checking page status:', error);
            this.updateJobStatus('Unable to access current page', 'error');
            this.safeSetButtonState('extractJobBtn', true);
        }
    }
    
    showUniversalSelectionInfo() {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-section';
        infoDiv.innerHTML = `
            <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #2196f3;">
                <h4 style="margin: 0 0 8px 0; color: #1976d2;">Content Selection Tools</h4>
                <p style="margin: 0; font-size: 13px; line-height: 1.4; color: #333;">
                    Use the selection tools below to extract job content from this page.
                </p>
            </div>
        `;
        
        const existingInfo = document.querySelector('.info-section');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        // Find the job status container - try multiple selectors
        const jobStatusContainer = document.getElementById('job-status') || 
                                   document.querySelector('.job-status') || 
                                   document.querySelector('.status-card');
        
        if (jobStatusContainer) {
            jobStatusContainer.appendChild(infoDiv);
        } else {
            console.error('Could not find job status container to append info');
            // Fallback - append to body or a known container
            const fallbackContainer = document.querySelector('.container') || document.body;
            if (fallbackContainer) {
                fallbackContainer.appendChild(infoDiv);
            }
        }
    }
    
    showSupportedSites() {
        const supportedSitesHtml = `
            <div style="margin-top: 10px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; font-size: 12px;">
                <strong>Supported Job Sites:</strong><br>
                • LinkedIn Jobs<br>
                • Indeed<br>
                • Glassdoor<br>
                • Monster<br>
                • ZipRecruiter<br>
                • CareerBuilder<br>
                • AngelList / Wellfound<br>
                • RemoteOK<br>
                • WeWorkRemotely<br>
                • Stack Overflow Jobs
            </div>
        `;
        
        // Add to job status section if not already there
        if (!document.getElementById('supported-sites-info')) {
            const infoDiv = document.createElement('div');
            infoDiv.id = 'supported-sites-info';
            infoDiv.innerHTML = supportedSitesHtml;
            
            // Try multiple fallback selectors for the container
            let targetContainer = null;
            try {
                targetContainer = this.elements.jobStatus?.parentNode ||
                    document.getElementById('job-status')?.parentNode ||
                    document.querySelector('.job-status')?.parentNode ||
                    document.querySelector('.status-card')?.parentNode ||
                    document.querySelector('.container') ||
                    document.body;
                
                if (targetContainer) {
                    targetContainer.appendChild(infoDiv);
                } else {
                    console.warn('Could not find suitable container for supported sites info');
                }
            } catch (error) {
                console.error('Error displaying supported sites info:', error);
                // Fallback to body if all else fails
                try {
                    document.body.appendChild(infoDiv);
                } catch (finalError) {
                    console.error('Failed to append supported sites info to body:', finalError);
                }
            }
        }
    }

    async checkProfileConnection() {
        try {
            const result = await chrome.storage.sync.get(['webAppConnected', 'accessToken', 'userProfile']);
            console.log('[Popup] Connection check result:', {
                connected: !!result.webAppConnected,
                hasToken: !!result.accessToken,
                hasProfile: !!result.userProfile,
                profileName: result.userProfile?.personalInfo?.name || result.userProfile?.name
            });
            
            if (result.webAppConnected && result.accessToken) {
                const profileName = result.userProfile?.personalInfo?.name || 
                                  result.userProfile?.name || 
                                  'Connected Profile';
                this.updateProfileStatus(true, profileName);
                
                // Try to sync profile in background if we have a connection
                this.syncProfile().catch(error => {
                    console.error('Background profile sync failed:', error);
                    // Don't update UI on background sync failure, keep showing connected status
                });
            } else {
                // No connection - show disconnected status
                this.updateProfileStatus(false, 'Profile not connected');
                console.log('[Popup] Profile not connected - user needs to connect');
            }
        } catch (error) {
            console.error('Error checking profile connection:', error);
            this.updateProfileStatus(false, 'Connection check failed');
        }
    }

    updateJobStatus(message, status) {
        // Use fallback selectors for job status element
        const jobStatusElement = this.elements.jobStatus ||
            document.getElementById('job-status-text') ||
            document.querySelector('#job-status-text') ||
            document.querySelector('#job-status p');
        
        if (jobStatusElement) {
            jobStatusElement.textContent = message;
        } else {
            console.warn('Could not find job status element to update');
        }
        
        const statusCard = document.querySelector('.status-card');
        if (statusCard) {
            statusCard.className = 'status-card';
            
            switch (status) {
                case 'success':
                    statusCard.style.borderLeftColor = '#28a745';
                    break;
                case 'error':
                    statusCard.style.borderLeftColor = '#dc3545';
                    break;
                case 'inactive':
                    statusCard.style.borderLeftColor = '#6c757d';
                    break;
                default:
                    statusCard.style.borderLeftColor = '#667eea';
            }
        }
    }

    updateProfileStatus(connected, text) {
        this.elements.profileIndicator.className = `indicator ${connected ? 'connected' : ''}`;
        this.elements.profileText.textContent = text;
        this.elements.connectProfileBtn.style.display = connected ? 'none' : 'inline-block';
        
        // Show/hide sync button based on connection status
        if (this.elements.syncProfileBtn) {
            this.elements.syncProfileBtn.style.display = connected ? 'inline-block' : 'none';
        }
        
        // Show/hide disconnect button based on connection status
        if (this.elements.disconnectProfileBtn) {
            this.elements.disconnectProfileBtn.style.display = connected ? 'inline-block' : 'none';
        }
        
        // Enable/disable cursor selection based on connection status
        if (connected) {
            // Profile connected - enable cursor selection
            this.safeSetButtonState('startCursorSelectionBtn', false, '👆 Start Cursor Selection');
        } else {
            // Profile not connected - disable cursor selection
            this.safeSetButtonState('startCursorSelectionBtn', true, '🔒 Connect Profile First');
        }
        
        // Update extract job button text based on connection status
        // Only update if it's currently disabled (not on supported job sites)
        if (this.elements.extractJobBtn && this.elements.extractJobBtn.disabled) {
            if (connected) {
                this.safeSetButtonState('extractJobBtn', false, 'Use Cursor Selection Below');
            } else {
                this.safeSetButtonState('extractJobBtn', true, '🔒 Connect Profile First');
            }
        }
    }

    async disconnectProfile() {
        try {
            console.log('[Popup] Disconnecting profile...');
            
            // Show confirmation dialog
            const confirmed = confirm('Disconnect your profile? You will need to reconnect to access your profile data.');
            if (!confirmed) {
                return;
            }
            
            // Clear all stored connection data
            await chrome.storage.sync.remove([
                'webAppConnected',
                'accessToken', 
                'userId',
                'userProfile',
                'connectionTime'
            ]);
            
            console.log('[Popup] Profile disconnected successfully');
            
            // Update UI to disconnected state
            this.updateProfileStatus(false, 'Profile not connected');
            
            // Show success notification
            this.showNotification('✅ Profile disconnected successfully!', 'success');
            
            // Optional: Clear any cached CV data
            await chrome.storage.local.remove(['lastGeneratedCV', 'cvData']);
            
        } catch (error) {
            console.error('[Popup] Error disconnecting profile:', error);
            this.showNotification('❌ Error disconnecting profile: ' + error.message, 'error');
        }
    }

    async syncProfileManually() {
        try {
            console.log('[Popup] Manual profile sync requested');
            
            const syncBtn = this.elements.syncProfileBtn;
            if (!syncBtn) return;
            
            // Update button to loading state
            const originalText = syncBtn.innerHTML;
            syncBtn.innerHTML = '⏳ Syncing...';
            syncBtn.disabled = true;
            
            // Check connection first
            const settings = await chrome.storage.sync.get(['webAppConnected', 'accessToken']);
            
            if (!settings.webAppConnected || !settings.accessToken) {
                throw new Error('Not connected to web app. Please connect your profile first.');
            }
            
            // Sync profile
            const profile = await this.syncProfile();
            console.log('[Popup] Profile synced successfully:', profile);
            
            // Update UI
            const profileName = profile.personalInfo?.name || profile.name || 'Connected Profile';
            this.updateProfileStatus(true, profileName);
            
            this.showNotification('✅ Profile synced successfully!', 'success');
            
        } catch (error) {
            console.error('[Popup] Manual profile sync failed:', error);
            this.showNotification('❌ Profile sync failed: ' + error.message, 'error');
        } finally {
            // Reset button
            if (this.elements.syncProfileBtn) {
                this.elements.syncProfileBtn.innerHTML = '🔄 Sync';
                this.elements.syncProfileBtn.disabled = false;
            }
        }
    }

    async connectProfile() {
        try {
            // Get web app URL from settings
            const settings = await chrome.storage.sync.get(['webAppUrl']);
            const webAppUrl = settings.webAppUrl || 'http://localhost:3000';
            
            // Open authentication page with extension ID
            const extensionId = chrome.runtime.id;
            
            // For debugging, you can use this test URL:
            // const authUrl = `${webAppUrl}/test-extension-connection.html?extensionId=${extensionId}`;
            
            // Use the real auth URL
            const authUrl = `${webAppUrl}/auth/chrome-extension?extensionId=${extensionId}`;
            console.log('[Popup] Opening auth URL:', authUrl);
            console.log('[Popup] Extension ID:', extensionId);
            
            const authTab = await chrome.tabs.create({ url: authUrl });
            
            this.showProgress('Waiting for authentication...', 0);
            
            // Listen for connection success
            console.log('[Popup] Waiting for connection...');
            const connectionResult = await this.waitForConnection(authTab.id);
            console.log('[Popup] connectProfile received connectionResult:', connectionResult);
            
            if (!connectionResult.accessToken) {
                console.warn('[Popup] No accessToken received in connectionResult:', connectionResult);
            }
            
            if (connectionResult.success) {
                // Store connection data
                await chrome.storage.sync.set({
                    webAppConnected: true,
                    accessToken: connectionResult.accessToken,
                    userId: connectionResult.userId,
                    userProfile: connectionResult.profile
                });
                
                console.log('[Popup] Connection data stored successfully');
                
                const profileName = connectionResult.profile?.name || 'Profile Connected';
                this.updateProfileStatus(true, profileName);
                this.showNotification('✅ Profile connected successfully!', 'success');
                
                // Try to close the auth tab
                try {
                    await chrome.tabs.remove(authTab.id);
                } catch (tabError) {
                    console.log('[Popup] Could not close auth tab:', tabError);
                }
                
            } else {
                throw new Error(connectionResult.error || 'Authentication failed');
            }
            
        } catch (error) {
            console.error('[Popup] Error connecting profile:', error);
            this.showNotification('❌ Failed to connect profile: ' + error.message, 'error');
        } finally {
            this.hideProgress();
        }
    }

    waitForConnection(tabId) {
        console.log('[Popup] Setting up connection listener for tab:', tabId);
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                console.log('[Popup] Connection timeout reached');
                chrome.runtime.onMessage.removeListener(listener);
                chrome.tabs.onRemoved.removeListener(tabCloseListener);
                resolve({ success: false, error: 'Authentication timeout - please try again' });
            }, 300000); // 5 minutes timeout

            const listener = (message, sender, sendResponse) => {
                console.log('[Popup] waitForConnection received message:', message);
                console.log('[Popup] Message sender:', sender);
                
                if (message.type === 'EXTENSION_CONNECTED') {
                    console.log('[Popup] Processing EXTENSION_CONNECTED message');
                    clearTimeout(timeoutId);
                    chrome.runtime.onMessage.removeListener(listener);
                    chrome.tabs.onRemoved.removeListener(tabCloseListener);
                    
                    // Send acknowledgment
                    if (sendResponse) {
                        sendResponse({ success: true, received: true });
                    }
                    
                    // Web app sends data at root level, not nested under 'data'
                    resolve({ success: true, ...message });
                } else {
                    console.log('[Popup] Ignoring message with type:', message.type);
                }
            };
            
            const tabCloseListener = (closedTabId) => {
                console.log('[Popup] Tab closed:', closedTabId, 'waiting for:', tabId);
                if (closedTabId === tabId) {
                    console.log('[Popup] Auth tab was closed by user');
                    clearTimeout(timeoutId);
                    chrome.runtime.onMessage.removeListener(listener);
                    chrome.tabs.onRemoved.removeListener(tabCloseListener);
                    resolve({ success: false, error: 'User cancelled authentication' });
                }
            };
            
            console.log('[Popup] Adding message and tab listeners');
            chrome.runtime.onMessage.addListener(listener);
            chrome.tabs.onRemoved.addListener(tabCloseListener);
        });
    }

    async syncProfile() {
        try {
            const settings = await chrome.storage.sync.get(['webAppUrl', 'accessToken']);
            
            if (!settings.accessToken) {
                throw new Error('Not connected to web app');
            }
            
            // Use default URL if webAppUrl is not set
            const webAppUrl = settings.webAppUrl || 'http://localhost:3000';
            const profileUrl = `${webAppUrl}/api/extension/profile`;
            
            console.log('Syncing profile from:', profileUrl);
            console.log('Using token:', settings.accessToken);
            
            const response = await fetch(profileUrl, {
                headers: {
                    'Authorization': `Bearer ${settings.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Profile sync response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Profile sync error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Profile sync result:', result);
            
            if (result.success) {
                await chrome.storage.sync.set({ userProfile: result.profile });
                return result.profile;
            } else {
                throw new Error(result.error || 'Failed to sync profile');
            }
        } catch (error) {
            console.error('Profile sync error:', error);
            throw error;
        }
    }

    async saveCVToWebApp(cvData) {
        try {
            const settings = await chrome.storage.sync.get(['webAppUrl', 'accessToken']);
            
            if (!settings.accessToken) {
                console.log('Not connected to web app, skipping CV sync');
                return;
            }
            
            const response = await fetch(`${settings.webAppUrl}/api/extension/cv`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.accessToken}`
                },
                body: JSON.stringify(cvData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('Failed to save CV to web app:', result.error);
            } else {
                console.log('CV saved to web app successfully');
            }
        } catch (error) {
            console.error('CV sync error:', error);
        }
    }

    async extractJobDetails() {
        try {
            // Check if this is cursor selection mode (button text indicates it)
            if (this.elements.extractJobBtn && this.elements.extractJobBtn.textContent === 'Use Cursor Selection Below') {
                console.log('[Popup] Extract button clicked in cursor selection mode');
                // Start cursor selection instead of job extraction
                await this.startCursorSelection();
                return;
            }
            
            // Check if this is analyze selected content mode
            if (this.elements.extractJobBtn && this.elements.extractJobBtn.textContent === '🤖 Analyze Selected Content') {
                console.log('[Popup] Extract button clicked in analyze mode');
                // Send selected content to AI for analysis
                await this.sendContentToAI(this.selectedContent);
                return;
            }
            
            // Check if this is CV generation mode
            if (this.elements.extractJobBtn && this.elements.extractJobBtn.textContent === '📄 Generate ATS-Friendly CV') {
                console.log('[Popup] Extract button clicked in CV generation mode');
                // Generate ATS-friendly CV
                await this.generateATSFriendlyCV();
                return;
            }
            
            this.showProgress('Extracting job details...', 20);
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check if we can communicate with content script
            let response;
            try {
                response = await chrome.tabs.sendMessage(tab.id, { action: 'extractJobDetails' });
            } catch (connectionError) {
                console.log('Content script not available, injecting...');
                
                // Inject content script and CSS if not available
                try {
                    await chrome.scripting.insertCSS({
                        target: { tabId: tab.id },
                        files: ['content/content.css']
                    });
                } catch (cssError) {
                    console.log('CSS injection failed, continuing without styles');
                }
                
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content/content.js']
                });
                
                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Try again
                response = await chrome.tabs.sendMessage(tab.id, { action: 'extractJobDetails' });
            }
            
            this.updateProgress(60, 'Analyzing job requirements...');
            
            if (response && response.success) {
                this.updateProgress(100, 'Extraction complete!');
                
                setTimeout(() => {
                    this.hideProgress();
                    this.displayJobSummary(response.jobDetails);
                }, 1000);
            } else {
                throw new Error(response?.error || 'Failed to extract job details');
            }
        } catch (error) {
            console.error('Error extracting job details:', error);
            
            // Check if it's a backend connection error
            if (error.message && error.message.includes('Backend API request failed')) {
                this.showNotification('Could not connect to backend API. Please check your settings.', 'error');
                // Add a button to open settings
                setTimeout(() => {
                    const openSettingsBtn = document.createElement('button');
                    openSettingsBtn.textContent = 'Check Settings';
                    openSettingsBtn.style.marginTop = '10px';
                    openSettingsBtn.className = 'btn btn-secondary';
                    openSettingsBtn.onclick = () => this.openSettings();
                    
                    const statusCard = document.querySelector('.status-card');
                    if (!statusCard.querySelector('button')) {
                        statusCard.appendChild(openSettingsBtn);
                    }
                }, 1000);
            } else {
                this.showNotification(`Failed to extract job details: ${error.message}`, 'error');
            }
            this.hideProgress();
        }
    }

    displayJobSummary(jobDetails) {
        const summary = `
            <strong>Position:</strong> ${jobDetails.title || 'Not specified'}<br>
            <strong>Company:</strong> ${jobDetails.company || 'Not specified'}<br>
            <strong>Key Skills:</strong> ${jobDetails.skills ? jobDetails.skills.join(', ') : 'Not specified'}<br>
            <strong>Requirements:</strong> ${jobDetails.requirements ? jobDetails.requirements.slice(0, 100) + '...' : 'Not specified'}
        `;
        
        this.elements.jobSummary.innerHTML = summary;
    }

    showResults(cvData) {
        this.elements.resultsSection.style.display = 'block';
        this.elements.resultsSection.classList.add('fade-in');
        
        // Store CV data for download
        chrome.storage.local.set({ generatedCV: cvData });
    }

    showProgress(text, progress) {
        this.elements.progressSection.style.display = 'block';
        this.elements.progressText.textContent = text;
        this.updateProgress(progress);
    }

    updateProgress(progress, text = null) {
        this.elements.progressFill.style.width = `${progress}%`;
        if (text) {
            this.elements.progressText.textContent = text;
        }
    }

    hideProgress() {
        this.elements.progressSection.style.display = 'none';
    }

    async downloadCV() {
        try {
            console.log('[Download] Starting DIRECT PDF download...');
            
            // Get the necessary data from storage using the correct keys
            const [jobResult, profileResult, settingsResult] = await Promise.all([
                chrome.storage.local.get(['jobDetails', 'lastJobAnalysis']),
                chrome.storage.sync.get(['userProfile']),
                chrome.storage.sync.get(['webAppUrl', 'accessToken'])
            ]);
            
            // Use jobDetails or lastJobAnalysis, whichever is available
            const jobAnalysis = jobResult.jobDetails || jobResult.lastJobAnalysis;
            const userProfile = profileResult.userProfile;
            
            console.log('[Download] Retrieved data:', { jobAnalysis, userProfile });
            
            if (!jobAnalysis || !userProfile) {
                console.error('[Download] Missing required data for PDF generation');
                console.log('[Download] Available storage keys:', Object.keys(jobResult), Object.keys(profileResult));
                this.showNotification('❌ Please analyze job content and sync profile first', 'error');
                return;
            }
            
            // Get web app URL
            const webAppUrl = settingsResult.webAppUrl || 'http://localhost:3000';
            const accessToken = settingsResult.accessToken;
            
            this.showNotification('📄 Generating PDF download...', 'info');
            
            // Make direct request to PDF download endpoint
            const response = await fetch(`${webAppUrl}/api/extension/cv/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
                },
                body: JSON.stringify({
                    jobAnalysis: jobAnalysis,
                    userProfile: userProfile,
                    requestType: 'direct_pdf_download',
                    timestamp: Date.now()
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`PDF generation failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            // Get the PDF as ArrayBuffer
            const pdfArrayBuffer = await response.arrayBuffer();
            console.log('[Download] PDF received, size:', pdfArrayBuffer.byteLength, 'bytes');
            
            // Create filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `Professional_CV_ATS_Optimized_${timestamp}.pdf`;
            
            // Download the PDF using Chrome downloads API
            const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('[Download] Chrome download error:', chrome.runtime.lastError);
                    this.showNotification('❌ Download failed. Try again.', 'error');
                } else {
                    console.log('[Download] PDF download started with ID:', downloadId);
                    this.showNotification('✅ Professional CV PDF download started!', 'success');
                    
                    // Clean up the object URL
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                }
            });
            
        } catch (error) {
            console.error('[Download] Error with direct PDF download:', error);
            this.showNotification(`❌ PDF download failed: ${error.message}`, 'error');
        }
    }

    async downloadPDFFromBase64(base64Data) {
        try {
            // Convert base64 to blob
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            // Create optimized filename
            const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
            const filename = `Professional_CV_ATS_Optimized_${timestamp}.pdf`;
            
            console.log('[Download] Generated PDF filename:', filename);
            
            // Check if chrome.downloads API is available
            if (chrome.downloads && chrome.downloads.download) {
                // Use Chrome downloads API
                await chrome.downloads.download({
                    url: url,
                    filename: filename,
                    saveAs: true // Let user choose location
                });
                
                this.showNotification('✅ Professional CV PDF downloaded successfully!', 'success');
            } else {
                // Fallback: Create download link and click it
                console.log('[Download] Using fallback PDF download method');
                
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = filename;
                downloadLink.style.display = 'none';
                
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                this.showNotification('✅ Professional CV PDF downloaded!', 'success');
            }
            
            // Clean up the object URL after a short delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
        } catch (error) {
            console.error('[Download] Error downloading PDF:', error);
            this.showNotification(`❌ Failed to download PDF: ${error.message}`, 'error');
        }
    }

    async downloadHTMLWithPDFInstructions(htmlContent) {
        try {
            // Enhance HTML content for PDF generation
            const enhancedHTML = this.enhanceHTMLForPDF(htmlContent);
            
            // Create optimized filename
            const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
            const filename = `Professional_CV_ATS_Optimized_${timestamp}.html`;
            
            console.log('[Download] Generated HTML filename:', filename);
            
            // Create download blob with enhanced HTML
            const blob = new Blob([enhancedHTML], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            // Check if chrome.downloads API is available
            if (chrome.downloads && chrome.downloads.download) {
                // Use Chrome downloads API
                await chrome.downloads.download({
                    url: url,
                    filename: filename,
                    saveAs: true // Let user choose location
                });
                
                this.showNotification('✅ CV downloaded as HTML! Open and Print to PDF for best results.', 'success');
            } else {
                // Fallback: Create download link and click it
                console.log('[Download] Using fallback download method');
                
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = filename;
                downloadLink.style.display = 'none';
                
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                this.showNotification('✅ CV downloaded as HTML! Open and Print to PDF.', 'success');
            }
            
            // Clean up the object URL after a short delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
            // Show PDF generation instructions
            this.showPDFInstructions();
            
        } catch (error) {
            console.error('[Download] Error downloading HTML:', error);
            this.showNotification(`❌ Failed to download: ${error.message}`, 'error');
        }
    }

    enhanceHTMLForPDF(htmlContent) {
        // If content is not HTML, wrap it in a basic HTML structure
        if (!htmlContent.includes('<html>') && !htmlContent.includes('<!DOCTYPE')) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Professional CV</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 25px; }
        h1 { color: #2c3e50; }
        h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
        @media print { body { margin: 20px; } }
        @page { margin: 0.75in; }
    </style>
</head>
<body>
    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${htmlContent}</pre>
</body>
</html>`;
        }
        
        // For existing HTML, enhance it with PDF-optimized styles
        let enhancedHTML = htmlContent;
        
        // Add PDF-specific print styles if not present
        if (!enhancedHTML.includes('@media print')) {
            const pdfStyles = `
        <style>
            @media print {
                body { 
                    font-size: 10pt !important; 
                    line-height: 1.4 !important; 
                    padding: 15px !important; 
                    max-width: none !important; 
                }
                .header h1 { font-size: 20pt !important; }
                .section { margin-bottom: 15px !important; }
                .experience-item, .project-item { break-inside: avoid !important; }
                .skill-tag.highlighted { animation: none !important; background: #e74c3c !important; }
            }
            @page { 
                margin: 0.5in; 
                size: letter; 
            }
            
            /* Additional PDF optimization */
            body {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        </style>`;
            
            // Insert before closing head tag
            enhancedHTML = enhancedHTML.replace('</head>', pdfStyles + '</head>');
        }
        
        // Add print button and instructions
        const printInstructions = `
        <div id="print-instructions" style="background: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2196f3; position: relative;">
            <button onclick="window.print(); document.getElementById('print-instructions').style.display='none';" 
                    style="position: absolute; top: 10px; right: 10px; background: #2196f3; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                🖨️ Print to PDF
            </button>
            <h3 style="margin: 0 0 10px 0; color: #1976d2;">📄 Professional CV Ready</h3>
            <p style="margin: 0; font-size: 14px; line-height: 1.4; color: #333;">
                <strong>To save as PDF:</strong> Click the "Print to PDF" button above or use Ctrl+P (Cmd+P on Mac) and select "Save as PDF" as the destination.
            </p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">
                This CV is ATS-optimized and formatted for professional use. The print styles ensure perfect PDF formatting.
            </p>
        </div>`;
        
        // Insert after body tag
        enhancedHTML = enhancedHTML.replace('<body>', '<body>' + printInstructions);
        
        return enhancedHTML;
    }

    showPDFInstructions() {
        setTimeout(() => {
            this.showNotification('💡 Tip: Open the downloaded HTML file and use "Print to PDF" for the best professional format!', 'info');
        }, 2000);
    }

    editCV() {
        // Open CV editor in web app
        const editorUrl = 'http://localhost:3000/cv-editor';
        chrome.tabs.create({ url: editorUrl });
    }

    openSettings() {
        chrome.runtime.openOptionsPage();
    }

    openHelp() {
        chrome.tabs.create({ 
            url: 'http://localhost:3000/help/chrome-extension' 
        });
    }

    showNotification(message, type) {
        try {
            // Create temporary notification
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            Object.assign(notification.style, {
                position: 'fixed',
                top: '10px',
                right: '10px',
                padding: '10px 15px',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px',
                zIndex: '9999',
                background: type === 'success' ? '#28a745' : '#dc3545'
            });
            
            // Safe append with fallback
            const container = document.body || document.documentElement || document.querySelector('.container');
            if (container) {
                container.appendChild(notification);
                
                setTimeout(() => {
                    if (notification && notification.parentNode) {
                        notification.remove();
                    }
                }, 3000);
            } else {
                console.warn('Could not display notification - no container found:', message);
            }
        } catch (error) {
            console.error('Error showing notification:', error, 'Message was:', message);
        }
    }

    async startElementSelection(type) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send message to content script to start area selection
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'startAreaSelection', 
                type: type 
            });
            
            if (response && response.success) {
                // Update button state
                document.querySelectorAll('.selection-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('data-type') === type) {
                        btn.classList.add('active');
                    }
                });
                
                this.showNotification(`Draw a rectangle around the ${type} area`, 'info');
                
                // Close popup so user can interact with page
                window.close();
            }
        } catch (error) {
            console.error('Error starting area selection:', error);
            this.showNotification('Failed to start selection mode', 'error');
        }
    }

    handleElementSelected(type, data) {
        console.log(`Area selected for ${type}:`, data);
        
        // Update button to show selection
        const button = document.querySelector(`[data-type="${type}"]`);
        if (button) {
            button.classList.add('selected');
            const originalText = button.textContent;
            button.textContent = originalText.replace('📝', '✅').replace('🏢', '✅').replace('📍', '✅').replace('📄', '✅').replace('✅', '✅').replace('💰', '✅');
        }
        
        this.showNotification(`${type} area selected successfully!`, 'success');
    }

    handleCursorSelectionComplete(data) {
        console.log('Cursor selection completed:', data);
        
        // Reset cursor selection button using safe method
        this.safeSetButtonState('startCursorSelectionBtn', false, '👆 Start Cursor Selection');
        
        // Handle the selected content
        if (data && data.content) {
            this.selectedContent = data;
            this.showSelectionPreview(data);
            this.showNotification(`${data.elements || 0} element(s) selected via cursor!`, 'success');
        }
    }

    async clearSelections() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            await chrome.tabs.sendMessage(tab.id, { action: 'clearAllSelections' });
            
            // Reset button states
            document.querySelectorAll('.selection-btn').forEach(btn => {
                btn.classList.remove('selected', 'active');
                const originalText = btn.getAttribute('data-type');
                const emoji = btn.textContent.split(' ')[0];
                btn.textContent = `${emoji} ${originalText.charAt(0).toUpperCase() + originalText.slice(1)}`;
            });
            
            this.showNotification('All selections cleared', 'success');
        } catch (error) {
            console.error('Error clearing selections:', error);
            this.showNotification('Failed to clear selections', 'error');
        }
    }

    async modifySelection() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'modifySelection',
                type: 'content' 
            });
            
            if (response && response.success) {
                this.elements.selectionPreview.style.display = 'none';
                this.showNotification('Select a new area', 'success');
            }
        } catch (error) {
            console.error('Error modifying selection:', error);
            this.showNotification('Failed to modify selection', 'error');
        }
    }

    async sendToAI() {
        // Check if profile is connected before allowing AI analysis
        const result = await chrome.storage.sync.get(['webAppConnected', 'accessToken']);
        const isProfileConnected = result.webAppConnected && result.accessToken;
        
        if (!isProfileConnected) {
            this.showNotification('Please connect your profile first to use AI analysis', 'error');
            return;
        }
        
        if (!this.selectedContent) {
            this.showNotification('No content selected', 'error');
            return;
        }

        // Verify content before sending
        console.log('[AI] Preparing to send content to AI...');
        console.log('[AI] Content length:', this.selectedContent.content.length);
        console.log('[AI] Content preview:', this.selectedContent.content.substring(0, 500));
        console.log('[AI] Full selected content object:', this.selectedContent);

        if (this.selectedContent.content.length < 10) {
            this.showNotification('Selected content too short for analysis', 'error');
            console.log('[AI] Content too short, aborting');
            return;
        }

        this.safeSetButtonState('sendToAiBtn', true, '🤖 Analyzing...');

        try {
            console.log('[AI] Sending content to backend...');
            
            // Send content to backend for AI analysis
            const response = await this.analyzeContentWithAI(this.selectedContent);
            
            console.log('[AI] Backend response:', response);
            
            if (response && response.success) {
                console.log('[AI] Analysis successful:', response.analysis);
                this.aiAnalysisResult = response.analysis;
                console.log('[AI] Stored analysis result:', this.aiAnalysisResult);
                
                this.showAIAnalysis(response.analysis);
                this.showNotification('AI analysis completed!', 'success');
                
                console.log('[AI] About to check button state after analysis...');
                setTimeout(() => {
                    const extractBtn = document.getElementById('extract-job');
                    console.log('[AI] Button check - Element found:', !!extractBtn);
                    console.log('[AI] Button check - Current text:', extractBtn?.textContent);
                    console.log('[AI] Button check - Disabled state:', extractBtn?.disabled);
                }, 100);
                
            } else {
                console.log('[AI] Analysis failed:', response);
                this.showNotification('AI analysis failed: ' + (response.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('[AI] Error sending to AI:', error);
            this.showNotification('Failed to analyze content: ' + error.message, 'error');
        } finally {
            this.safeSetButtonState('sendToAiBtn', false, '🤖 Analyze with AI');
        }
    }

    async analyzeContentWithAI(contentData) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                endpoint: '/api/extension/analyze',
                method: 'POST',
                data: {
                    content: contentData.content,
                    url: contentData.url,
                    type: 'job_posting'
                }
            });

            return response;
        } catch (error) {
            console.error('Error in AI analysis:', error);
            throw error;
        }
    }

    showAIAnalysis(analysis) {
        this.elements.analysisContent.innerHTML = `
            <div class="analysis-result">
                <div class="analysis-field">
                    <strong>Job Title:</strong> ${analysis.title || 'Not found'}
                </div>
                <div class="analysis-field">
                    <strong>Company:</strong> ${analysis.company || 'Not found'}
                </div>
                <div class="analysis-field">
                    <strong>Location:</strong> ${analysis.location || 'Not found'}
                </div>
                <div class="analysis-field">
                    <strong>Salary:</strong> ${analysis.salary || 'Not specified'}
                </div>
                <div class="analysis-field">
                    <strong>Description:</strong><br>
                    <div class="description-text">${analysis.description || 'Not found'}</div>
                </div>
                <div class="analysis-field">
                    <strong>Requirements:</strong><br>
                    <div class="requirements-text">${analysis.requirements || 'Not found'}</div>
                </div>
            </div>
        `;
        
        this.elements.aiAnalysis.style.display = 'block';
        
        // Show the dedicated Generate CV button with enhanced debugging
        console.log('[AI Analysis] Showing Generate CV button');
        console.log('[AI Analysis] Elements object:', this.elements);
        console.log('[AI Analysis] generateCvBtn element:', this.elements.generateCvBtn);
        
        // Try multiple approaches to show the button
        let buttonShown = false;
        
        // Method 1: Using this.elements reference
        if (this.elements.generateCvBtn) {
            this.elements.generateCvBtn.style.display = 'inline-block';
            this.elements.generateCvBtn.style.visibility = 'visible';
            console.log('[AI Analysis] Generate CV button shown via elements reference');
            buttonShown = true;
        }
        
        // Method 2: Direct getElementById (always try this as backup)
        const directBtn = document.getElementById('generate-cv-btn');
        if (directBtn) {
            directBtn.style.display = 'inline-block';
            directBtn.style.visibility = 'visible';
            console.log('[AI Analysis] Generate CV button shown via direct getElementById');
            buttonShown = true;
        }
        
        // Method 3: Query selector as last resort
        if (!buttonShown) {
            const queryBtn = document.querySelector('#generate-cv-btn');
            if (queryBtn) {
                queryBtn.style.display = 'inline-block';
                queryBtn.style.visibility = 'visible';
                console.log('[AI Analysis] Generate CV button shown via querySelector');
                buttonShown = true;
            }
        }
        
        if (!buttonShown) {
            console.error('[AI Analysis] Could not find Generate CV button with any method');
            // Create the button if it doesn't exist
            this.createGenerateCVButton();
        } else {
            console.log('[AI Analysis] Generate CV button successfully shown');
        }
    }

    createGenerateCVButton() {
        console.log('[AI Analysis] Creating Generate CV button as fallback');
        
        // Find the analysis actions container
        const actionsContainer = document.querySelector('.analysis-actions') || 
                                document.querySelector('#ai-analysis');
        
        if (actionsContainer) {
            // Create the button
            const generateBtn = document.createElement('button');
            generateBtn.id = 'generate-cv-btn';
            generateBtn.className = 'btn btn-primary';
            generateBtn.textContent = '📄 Generate ATS-Friendly CV';
            generateBtn.style.display = 'inline-block';
            generateBtn.style.margin = '5px';
            
            // Add event listener
            generateBtn.addEventListener('click', () => this.generateATSFriendlyCV());
            
            // Insert it in the right place
            const approveBtn = document.getElementById('approve-analysis');
            if (approveBtn && approveBtn.parentNode === actionsContainer) {
                // Insert after approve button
                approveBtn.insertAdjacentElement('afterend', generateBtn);
            } else {
                // Just append to container
                actionsContainer.appendChild(generateBtn);
            }
            
            // Update elements reference
            this.elements.generateCvBtn = generateBtn;
            
            console.log('[AI Analysis] Generate CV button created and added successfully');
        } else {
            console.error('[AI Analysis] Could not find actions container to add Generate CV button');
        }
    }

    async approveAnalysis() {
        if (!this.aiAnalysisResult) {
            this.showNotification('No analysis to approve', 'error');
            return;
        }

        try {
            // Save the analyzed job details
            await chrome.storage.local.set({ jobDetails: this.aiAnalysisResult });
            
            this.displayJobSummary(this.aiAnalysisResult);
            
            this.showNotification('Job analysis approved and saved!', 'success');
        } catch (error) {
            console.error('Error approving analysis:', error);
            this.showNotification('Failed to save analysis', 'error');
        }
    }

    async generateATSFriendlyCV() {
        try {
            console.log('[CV Generation] Starting ATS-friendly CV generation...');
            
            // Check if we have analyzed job details
            if (!this.aiAnalysisResult) {
                this.showNotification('No job analysis found. Please analyze job content first.', 'error');
                return;
            }
            
            // Check if profile is connected
            const result = await chrome.storage.sync.get(['webAppConnected', 'accessToken', 'userProfile']);
            const isProfileConnected = result.webAppConnected && result.accessToken;
            
            if (!isProfileConnected) {
                this.showNotification('Please connect your profile first to generate CV', 'error');
                return;
            }
            
            this.showProgress('Generating ATS-friendly CV...', 10);
            
            // Get user profile
            const userProfile = result.userProfile;
            if (!userProfile) {
                this.showNotification('User profile not found. Please sync your profile.', 'error');
                this.hideProgress();
                return;
            }
            
            this.updateProgress(30, 'Analyzing job requirements...');
            
            // Prepare data for CV generation
            const cvData = {
                jobAnalysis: this.aiAnalysisResult,
                userProfile: userProfile,
                jobContent: this.selectedContent ? this.selectedContent.content : null,
                cvType: 'ats-friendly'
            };
            
            this.updateProgress(50, 'Tailoring CV content...');
            
            // Send to backend for CV generation
            const response = await chrome.runtime.sendMessage({
                action: 'generateCV',
                data: cvData
            });
            
            this.updateProgress(80, 'Formatting CV...');
            
            if (response && response.success) {
                this.updateProgress(100, 'CV generated successfully!');
                
                setTimeout(() => {
                    this.hideProgress();
                    this.showCVResults(response.cvData);
                    this.safeSetButtonState('extractJobBtn', false, '📄 CV Generated!');
                }, 1000);
                
                // Store generated CV
                await chrome.storage.local.set({ 
                    generatedCV: response.cvData,
                    lastJobAnalysis: this.aiAnalysisResult
                });
                
                this.showNotification('✅ ATS-friendly CV generated successfully!', 'success');
                
            } else {
                throw new Error(response?.error || 'Failed to generate CV');
            }
            
        } catch (error) {
            console.error('[CV Generation] Error generating CV:', error);
            this.showNotification(`Failed to generate CV: ${error.message}`, 'error');
            this.hideProgress();
        }
    }

    showCVResults(cvData) {
        console.log('[CV Results] Displaying CV results:', cvData);
        
        // Show results section
        this.elements.resultsSection.style.display = 'block';
        this.elements.resultsSection.classList.add('fade-in');
        
        // Update job summary to include CV info
        const cvSummary = `
            <div class="cv-generated-info">
                <h4 style="color: #28a745; margin-bottom: 10px;">✅ ATS-Friendly CV Generated</h4>
                <div class="cv-details">
                    <strong>Job Title:</strong> ${this.aiAnalysisResult?.title || 'Not specified'}<br>
                    <strong>Company:</strong> ${this.aiAnalysisResult?.company || 'Not specified'}<br>
                    <strong>CV Type:</strong> ATS-Optimized<br>
                    <strong>Generated:</strong> ${new Date().toLocaleString()}
                </div>
            </div>
        `;
        
        this.elements.jobSummary.innerHTML = cvSummary;
        
        // Store CV data for download
        chrome.storage.local.set({ 
            generatedCV: cvData,
            cvMetadata: {
                jobTitle: this.aiAnalysisResult?.title,
                company: this.aiAnalysisResult?.company,
                generatedAt: new Date().toISOString()
            }
        });
    }

    reselectContent() {
        this.selectedContent = null;
        this.aiAnalysisResult = null;
        this.elements.selectionPreview.style.display = 'none';
        this.elements.aiAnalysis.style.display = 'none';
        this.startCursorSelection();
    }

    async startCursorSelection() {
        try {
            console.log('[Popup] Starting cursor selection...');
            
            // First check if profile is connected
            const result = await chrome.storage.sync.get(['webAppConnected', 'accessToken']);
            const isProfileConnected = result.webAppConnected && result.accessToken;
            
            if (!isProfileConnected) {
                console.log('[Popup] Cannot start cursor selection - profile not connected');
                this.showNotification('Please connect your profile first to use cursor selection', 'error');
                return;
            }
            
            console.log('[Popup] Profile is connected, proceeding with cursor selection...');
            console.log('[Popup] Elements object:', this.elements ? 'exists' : 'missing');
            console.log('[Popup] Cursor button element:', this.elements?.startCursorSelectionBtn ? 'found' : 'not found');
            
            // Get active tab first
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                console.error('[Popup] No active tab found!');
                this.showNotification('No active tab found', 'error');
                return;
            }
            
            console.log('[Popup] Active tab found:', tab.url);
            
            // Try to ping content script first to see if it's loaded
            console.log('[Popup] Testing content script connection...');
            let pingResponse;
            try {
                pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                console.log('[Popup] Content script ping response:', pingResponse);
            } catch (pingError) {
                console.log('[Popup] Content script not loaded, attempting injection...');
                
                // Inject content script if not available
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content/content_selector.js']
                    });
                    
                    // Wait for script to initialize
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Try ping again
                    pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                    console.log('[Popup] Content script ping after injection:', pingResponse);
                } catch (injectionError) {
                    console.error('[Popup] Failed to inject content script:', injectionError);
                    this.showNotification('Failed to load cursor selection. Try refreshing the page.', 'error');
                    return;
                }
            }
            
            console.log('[Popup] Sending cursor selection message...');
            
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'startCursorSelection',
                type: 'content' 
            });
            
            console.log('[Popup] Response from content script:', response);
            
            if (response && response.success) {
                // Use safe button state method instead of direct access
                console.log('[Popup] Setting button state...');
                const buttonResult = this.safeSetButtonState('startCursorSelectionBtn', true, '👆 Selecting...');
                console.log('[Popup] Button state set result:', buttonResult);
                
                this.showNotification('Hover and click to select elements', 'success');
                console.log('[Popup] Cursor selection started successfully');
            } else {
                console.error('[Popup] Content script returned failure:', response);
                this.showNotification('Content script failed to start cursor selection', 'error');
            }
        } catch (error) {
            console.error('[Popup] Error starting cursor selection:', error.name, error.message);
            // Avoid logging circular references in error.stack
            if (error.stack) {
                console.error('[Popup] Error stack (first 500 chars):', error.stack.substring(0, 500));
            }
            this.showNotification(`Failed to start cursor selection: ${error.message}`, 'error');
        }
    }

    showSelectionPreview(data) {
        console.log('[Preview] Showing selection preview:', data);
        console.log('[Preview] Data type check:', typeof data, data);
        
        // Handle both data formats: simple {content, elements, url} and AI-ready format
        let content, elements, url, isAIReady = false;
        
        if (data.rawText && data.metadata) {
            // AI-ready format from content script
            console.log('[Preview] AI-ready format detected');
            content = data.rawText;
            elements = data.metadata.totalElements;
            url = data.metadata.pageUrl;
            isAIReady = true;
        } else if (data.content) {
            // Simple format from cursor selection
            console.log('[Preview] Simple format detected');
            content = data.content;
            elements = data.elements || 0;
            url = data.url || 'Unknown';
            isAIReady = false;
        } else {
            console.error('[Preview] Unknown data format:', data);
            this.showNotification('Invalid selection data format', 'error');
            return;
        }
        
        if (!content || content.length < 5) {
            console.error('[Preview] Content too short:', content);
            this.showNotification('Selected content is too short for analysis', 'error');
            return;
        }
        
        const preview = content.substring(0, 300) + (content.length > 300 ? '...' : '');
        
        // Always show unified preview with AI processing button
        this.elements.previewContent.innerHTML = `
            <div class="content-preview">
                <div class="cursor-selection-header">
                    <h4>👆 Content Selected for AI Analysis</h4>
                    <span class="selection-badge" style="background: #4CAF50;">ready</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 10px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                    <div style="text-align: center;">
                        <strong>${content.length}</strong><br>
                        <small>Characters</small>
                    </div>
                    <div style="text-align: center;">
                        <strong>${elements}</strong><br>
                        <small>Elements</small>
                    </div>
                    <div style="text-align: center;">
                        <strong>${Math.round(content.length / 100) / 10}KB</strong><br>
                        <small>Size</small>
                    </div>
                </div>
                <div style="margin: 10px 0;">
                    <strong>Preview:</strong><br>
                    <div style="background: #f9f9f9; padding: 8px; border-radius: 4px; max-height: 100px; overflow-y: auto; font-size: 12px; border: 1px solid #ddd;">
                        ${preview.replace(/\n/g, '<br>')}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 15px;">
                    <button id="send-to-ai-main" style="
                        flex: 1; background: linear-gradient(45deg, #4CAF50, #45a049); color: white; 
                        border: none; padding: 12px; border-radius: 6px; font-weight: bold; 
                        cursor: pointer; font-size: 14px;
                    ">
                        🤖 Send to AI for Processing
                    </button>
                    <button id="reselect-content-main" style="
                        background: #2196F3; color: white; border: none; padding: 8px 12px; 
                        border-radius: 6px; cursor: pointer; font-size: 12px;
                    ">
                        🔄 Select Again
                    </button>
                </div>
            </div>
        `;
        
        // Store the content for API call
        this.selectedContent = {
            content: content,
            elements: elements,
            url: url,
            rawData: data // Store original data
        };
        
        console.log('[Preview] Stored selected content:', this.selectedContent);
        
        // Add event listeners for the buttons
        const sendBtn = document.getElementById('send-to-ai-main');
        const reselectBtn = document.getElementById('reselect-content-main');
        
        if (sendBtn) {
            sendBtn.onclick = () => {
                console.log('[Preview] Send to AI button clicked');
                this.sendContentToAI(data); // Send original data format
            };
        }
        
        if (reselectBtn) {
            reselectBtn.onclick = () => {
                console.log('[Preview] Reselect button clicked');
                this.reselectContent();
            };
        }
        
        // Show the preview
        this.elements.selectionPreview.style.display = 'block';
        this.elements.aiAnalysis.style.display = 'none';
        
        console.log('[Preview] Selection preview displayed successfully');
        this.showNotification('Content ready for AI processing!', 'success');
    }
    
    // Send content to AI for processing (unified method)
    async sendContentToAI(contentData) {
        console.log('[AI] Preparing to send content to AI...');
        console.log('[AI] Content data received:', contentData);
        
        // Find and disable the send button
        const sendBtn = document.getElementById('send-to-ai-main') || document.getElementById('send-to-ai-btn');
        if (sendBtn) {
            sendBtn.innerHTML = '🔄 Processing...';
            sendBtn.disabled = true;
        }
        
        try {
            // Prepare the content for API - handle both formats
            let apiRequest;
            
            if (contentData.rawText && contentData.metadata) {
                // AI-ready format
                console.log('[AI] Using AI-ready format');
                apiRequest = {
                    content: contentData.rawText,
                    htmlContent: contentData.structuredHTML || '',
                    metadata: contentData.metadata,
                    extractionMethod: contentData.metadata.extractionMethod || 'cursor-selection',
                    url: contentData.metadata.pageUrl || window.location.href,
                    requestType: 'content-analysis',
                    timestamp: Date.now()
                };
            } else if (contentData.content) {
                // Simple format 
                console.log('[AI] Using simple format');
                apiRequest = {
                    content: contentData.content,
                    htmlContent: '',
                    metadata: {
                        totalElements: contentData.elements || 0,
                        totalTextLength: contentData.content.length,
                        extractionMethod: 'cursor-selection',
                        pageUrl: contentData.url || window.location.href
                    },
                    extractionMethod: 'cursor-selection',
                    url: contentData.url || window.location.href,
                    requestType: 'content-analysis',
                    timestamp: Date.now()
                };
            } else {
                throw new Error('Invalid content data format');
            }
            
            console.log('[AI] API request prepared:', apiRequest);
            
            const apiUrl = 'http://localhost:3000/api/content/analyze';
            console.log('[AI] Calling API at:', apiUrl);
            
            // Make the API call
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiRequest)
            });
            
            console.log('[AI] Response status:', response.status);
            console.log('[AI] Response ok:', response.ok);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AI] API Error Response:', errorText);
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('[AI] AI analysis result:', result);
            
            // Show success notification
            this.showNotification('✅ AI analysis completed!', 'success');
            
            // Display the result
            this.displayAIAnalysisResult(result);
            
        } catch (error) {
            console.error('[AI] Error sending content to AI:', error);
            
            // Show error notification
            this.showNotification('❌ AI processing failed: ' + error.message, 'error');
            
            // Show detailed error in UI
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'background: #ffebee; border: 1px solid #f44336; color: #c62828; padding: 10px; border-radius: 4px; margin-top: 10px;';
            errorDiv.innerHTML = `
                <strong>❌ AI Processing Error</strong><br>
                <small>${error.message}</small><br>
                <small>Troubleshooting:</small><br>
                <small>• Check server is running: <code>npm run dev</code></small><br>
                <small>• Check Network tab for failed requests</small><br>
                <small>• Verify API endpoint: http://localhost:3000/api/content/analyze</small><br>
                <button onclick="this.parentElement.remove()" style="margin-top: 8px; padding: 4px 8px; font-size: 10px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">Dismiss</button>
            `;
            
            const previewContainer = this.elements.previewContent || document.getElementById('preview-content');
            if (previewContainer) {
                previewContainer.appendChild(errorDiv);
            }
        } finally {
            // Reset button state
            if (sendBtn) {
                sendBtn.innerHTML = '🤖 Send to AI for Processing';
                sendBtn.disabled = false;
            }
        }
    }
    
    // Display AI analysis results
    displayAIAnalysisResult(result) {
        console.log('[AI Result] Displaying AI analysis result');
        console.log('[AI Result] Full result object:', result);
        
        // Store result for CV generation
        this.latestJobAnalysis = result;
        
        // IMPORTANT: Extract the actual analysis data from the API response
        let analysisData = null;
        
        // Check different possible response formats
        if (result.analysis) {
            analysisData = result.analysis;
        } else if (result.data && result.data.analysis) {
            analysisData = result.data.analysis;
        } else if (result.jobDetails) {
            analysisData = result.jobDetails;
        } else if (result.extractedData) {
            analysisData = result.extractedData;
        } else {
            // If no structured data, create a basic structure
            analysisData = {
                title: result.title || result.jobTitle || 'Job Title Not Found',
                company: result.company || result.companyName || 'Company Not Found',
                location: result.location || 'Location Not Found',
                salary: result.salary || result.compensation || 'Not specified',
                description: result.description || result.jobDescription || 'Description not found',
                requirements: result.requirements || result.qualifications || 'Requirements not found'
            };
        }
        
        console.log('[AI Result] Extracted analysis data:', analysisData);
        
        // Store the analysis result for CV generation
        this.aiAnalysisResult = analysisData;
        
        // Show the structured AI analysis with the Generate CV button
        this.showAIAnalysis(analysisData);
        
        // Also show raw JSON for debugging (optional)
        const previewContainer = this.elements.previewContent || document.getElementById('preview-content');
        if (previewContainer) {
            const debugDiv = document.createElement('div');
            debugDiv.style.cssText = 'margin-top: 15px; padding: 10px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px;';
            debugDiv.innerHTML = `
                <details style="cursor: pointer;">
                    <summary style="font-weight: bold; color: #495057;">🔍 Raw API Response (Debug)</summary>
                    <pre style="white-space: pre-wrap; font-size: 11px; margin: 10px 0 0 0; padding: 10px; background: white; border-radius: 4px; overflow-x: auto;">${JSON.stringify(result, null, 2)}</pre>
                </details>
            `;
            previewContainer.appendChild(debugDiv);
        }

        // Add CSS animation for pulse effect
        if (!document.getElementById('cv-animations')) {
            const style = document.createElement('style');
            style.id = 'cv-animations';
            style.textContent = `
                @keyframes pulse {
                    0% { box-shadow: 0 2px 8px rgba(107, 115, 255, 0.3); }
                    50% { box-shadow: 0 4px 16px rgba(107, 115, 255, 0.5); }
                    100% { box-shadow: 0 2px 8px rgba(107, 115, 255, 0.3); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Show raw content in a modal
    showRawContent(aiContent) {
        console.log('[Raw Content] Showing raw content modal');
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 10000; 
            display: flex; align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white; width: 90%; height: 90%; border-radius: 8px; 
                display: flex; flex-direction: column; overflow: hidden;
            ">
                <div style="padding: 15px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">📄 Raw Content Data</h3>
                    <button onclick="this.closest('#raw-content-modal').remove();" style="
                        background: #f44336; color: white; border: none; 
                        padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                        ✕ Close
                    </button>
                </div>
                <div style="flex: 1; padding: 15px; overflow-y: auto;">
                    <div style="margin-bottom: 20px;">
                        <h4>Text Content:</h4>
                        <textarea readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">${aiContent.rawText}</textarea>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <h4>HTML Content:</h4>
                        <textarea readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">${aiContent.structuredHTML}</textarea>
                    </div>
                    <div>
                        <h4>Metadata:</h4>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${JSON.stringify(aiContent.metadata, null, 2)}</pre>
                    </div>
                </div>
            </div>
        `;
        
        modal.id = 'raw-content-modal';
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }
    
    // Enable AI analysis button
    enableAIAnalysisButton(aiContent) {
        console.log('[AI Button] Enabling AI analysis button');
        // This is handled in showSelectionPreview now
    }
    
    // Helper method to download results
    downloadResult(result) {
        const blob = new Blob([result], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-analysis-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // Check for pending content when popup opens
    checkForPendingContent() {
        console.log('[Popup] Checking for pending content...');
        
        try {
            // Check localStorage first
            const pendingData = localStorage.getItem('resumeAI_pendingContent');
            if (pendingData) {
                console.log('[Popup] Found pending content in localStorage');
                const data = JSON.parse(pendingData);
                
                // Check if content is recent (within 5 minutes)
                const isRecent = (Date.now() - data.timestamp) < 300000;
                if (isRecent && data.content) {
                    console.log('[Popup] Loading recent pending content');
                    
                    // Clear the stored content
                    localStorage.removeItem('resumeAI_pendingContent');
                    
                    // Process the content
                    this.showSelectionPreview(data.content.aiReadyContent || data.content);
                    this.showNotification('📥 Loading previously selected content...', 'success');
                    
                    return;
                }
            }
            
            // Also check chrome.storage
            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['resumeAI_pendingContent'], (result) => {
                    if (result.resumeAI_pendingContent) {
                        const data = result.resumeAI_pendingContent;
                        const isRecent = (Date.now() - data.timestamp) < 300000;
                        
                        if (isRecent && data.content) {
                            console.log('[Popup] Loading recent pending content from chrome.storage');
                            
                            // Clear the stored content
                            chrome.storage.local.remove(['resumeAI_pendingContent']);
                            
                            // Process the content
                            this.showSelectionPreview(data.content.aiReadyContent || data.content);
                            this.showNotification('📥 Loading previously selected content...', 'success');
                        }
                    }
                });
            }
            
            console.log('[Popup] No recent pending content found');
        } catch (error) {
            console.error('[Popup] Error checking for pending content:', error);
        }
    }

    // Generate CV using job analysis and user profile data
    async generateCV() {
        console.log('[CV] Starting CV generation process...');
        
        if (!this.latestJobAnalysis) {
            this.showNotification('❌ No job analysis available. Please analyze a job posting first.', 'error');
            return;
        }

        const generateBtn = document.getElementById('generate-cv-btn');
        if (!generateBtn) return;

        // Update button to loading state
        const originalBtnText = generateBtn.innerHTML;
        generateBtn.innerHTML = '⏳ Generating CV...';
        generateBtn.disabled = true;

        try {
            // Step 1: Check profile connection and get user profile data
            console.log('[CV] Checking profile connection and fetching user data...');
            const userProfileData = await this.getUserProfileData();

            if (!userProfileData) {
                throw new Error('👤 Unable to fetch user profile. Please connect your profile first by clicking "Connect Profile" button.');
            }

            console.log('[CV] Profile data retrieved successfully:', {
                name: userProfileData.personalInfo?.name || 'Unknown',
                hasExperience: !!userProfileData.experience,
                hasSkills: !!userProfileData.skills,
                hasEducation: !!userProfileData.education
            });

            // Update button text to show progress
            generateBtn.innerHTML = '🔄 Generating CV content...';

            // Step 2: Send job analysis + user data to AI for CV content generation
            const cvContentResponse = await this.generateCVContent(this.latestJobAnalysis, userProfileData);
            console.log('[CV] CV content response:', cvContentResponse);
            
            // Extract the actual CV content from response
            const cvContent = cvContentResponse.cvContent || cvContentResponse;
            console.log('[CV] Extracted CV content:', cvContent);

            // Update button text
            generateBtn.innerHTML = '🎯 Optimizing for ATS...';

            // Step 3: Send generated content to matching endpoint for ATS optimization
            const atsResponse = await this.optimizeCVForATS(cvContent, this.latestJobAnalysis);
            console.log('[CV] ATS optimization response:', atsResponse);
            
            // Extract optimized CV from response
            const optimizedCV = atsResponse.optimizedCV || atsResponse;
            console.log('[CV] Extracted optimized CV:', optimizedCV);

            // Update button text
            generateBtn.innerHTML = '📄 Preparing PDF...';

            // Step 4: Generate PDF metadata
            const pdfResponse = await this.generateCVPDF(optimizedCV);
            console.log('[CV] PDF generation response:', pdfResponse);
            
            // Extract PDF result
            const pdfResult = pdfResponse.pdfResult || pdfResponse;
            console.log('[CV] Extracted PDF result:', pdfResult);

            // Show success notification
            this.showNotification('✅ CV generated successfully! Ready to download.', 'success');

            // Display CV generation result - pass the final optimized CV
            this.displayCVResult(optimizedCV, pdfResult);

        } catch (error) {
            console.error('[CV] Error generating CV:', error);
            
            // Provide specific error messages based on the error type
            let errorMessage = error.message;
            let actionHint = '';
            
            if (error.message.includes('profile') || error.message.includes('👤')) {
                actionHint = '\n\n💡 Solution: Click "Connect Profile" to link your web app account.';
            } else if (error.message.includes('job') || error.message.includes('analysis')) {
                actionHint = '\n\n💡 Solution: Go to a job page and analyze job posting first.';
            } else if (error.message.includes('fetch') || error.message.includes('network')) {
                actionHint = '\n\n💡 Solution: Check your internet connection and try again.';
            }
            
            this.showNotification('❌ CV Generation Failed\n\n' + errorMessage + actionHint, 'error');
            
        } finally {
            // Reset button
            if (generateBtn) {
                generateBtn.innerHTML = originalBtnText;
                generateBtn.disabled = false;
            }
        }
    }

    // Get real user profile data from connected web app
    async getUserProfileData() {
        try {
            console.log('[Profile] Fetching user profile data...');
            
            // Check if we have a connection
            const settings = await chrome.storage.sync.get(['webAppConnected', 'accessToken', 'userProfile', 'webAppUrl']);
            console.log('[Profile] Current settings:', {
                connected: !!settings.webAppConnected,
                hasToken: !!settings.accessToken,
                hasProfile: !!settings.userProfile,
                profileType: settings.userProfile ? typeof settings.userProfile : 'undefined',
                profileKeys: settings.userProfile ? Object.keys(settings.userProfile) : []
            });
            
            if (!settings.webAppConnected || !settings.accessToken) {
                console.log('[Profile] Not connected to web app, attempting to use cached profile...');
                
                // Check if we have cached profile data
                if (settings.userProfile) {
                    console.log('[Profile] Using cached profile data:', settings.userProfile);
                    return settings.userProfile;
                }
                
                // No connection and no cached data - show connection prompt
                this.showNotification('❌ Please connect your profile first to generate CV', 'error');
                return null;
            }

            // If we have cached profile data that looks valid, use it first
            if (settings.userProfile && settings.userProfile.personalInfo) {
                console.log('[Profile] Using cached profile data - no need to sync');
                const profileName = settings.userProfile.personalInfo.name || settings.userProfile.name;
                console.log('[Profile] Profile name:', profileName);
                return settings.userProfile;
            }

            try {
                console.log('[Profile] Syncing latest profile from web app...');
                const webAppUrl = settings.webAppUrl || 'http://localhost:3000';
                
                const response = await fetch(`${webAppUrl}/api/extension/profile`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${settings.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('[Profile] Profile sync response:', result);

                if (result.success && result.profile) {
                    // Cache the latest profile data
                    await chrome.storage.sync.set({ userProfile: result.profile });
                    console.log('[Profile] Profile data synced and cached successfully');
                    console.log('[Profile] Profile name from sync:', result.profile.personalInfo?.name || result.profile.name);
                    return result.profile;
                } else {
                    throw new Error(result.error || 'Failed to fetch profile');
                }

            } catch (fetchError) {
                console.warn('[Profile] Failed to sync from web app:', fetchError.message);
                
                // Fallback to cached profile if sync fails
                if (settings.userProfile) {
                    console.log('[Profile] Using cached profile data as fallback');
                    this.showNotification('⚠️ Using cached profile data (sync failed)', 'warning');
                    return settings.userProfile;
                }
                
                throw fetchError;
            }

        } catch (error) {
            console.error('[Profile] Error getting user profile data:', error);
            
            // NEVER fall back to dummy data if we have a connection
            const settings = await chrome.storage.sync.get(['webAppConnected']);
            if (settings.webAppConnected) {
                console.error('[Profile] Connected but failed to get profile - not using dummy data');
                this.showNotification('❌ Failed to get profile data. Try reconnecting your profile.', 'error');
                return null;
            }
            
            // Only use dummy data if completely disconnected
            console.log('[Profile] Not connected - showing connection prompt');
            this.showNotification('❌ Please connect your profile to generate CV', 'error');
            return null;
        }
    }

    // Check if we're in development mode
    isDevelopmentMode() {
        return chrome.runtime.getManifest().name.toLowerCase().includes('dev') || 
               location.hostname === 'localhost';
    }

    // Get dummy user data for testing (fallback only)
    getDummyUserData() {
        return {
            personalInfo: {
                name: "John Doe",
                email: "john.doe@email.com",
                phone: "+1 (555) 123-4567",
                location: "New York, NY",
                linkedin: "linkedin.com/in/johndoe",
                portfolio: "johndoe.dev"
            },
            summary: "Experienced software developer with 5+ years in full-stack development, specializing in React, Node.js, and cloud technologies. Passionate about building scalable applications and mentoring junior developers.",
            experience: [
                {
                    title: "Senior Software Developer",
                    company: "Tech Solutions Inc",
                    duration: "2021 - Present",
                    location: "New York, NY",
                    achievements: [
                        "Led development of microservices architecture serving 1M+ users",
                        "Improved application performance by 40% through optimization",
                        "Mentored 3 junior developers and conducted code reviews"
                    ]
                },
                {
                    title: "Full Stack Developer",
                    company: "StartupXYZ",
                    duration: "2019 - 2021",
                    location: "San Francisco, CA",
                    achievements: [
                        "Built responsive web applications using React and Node.js",
                        "Implemented CI/CD pipelines reducing deployment time by 60%",
                        "Collaborated with UX team to improve user experience"
                    ]
                }
            ],
            skills: {
                technical: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "Docker", "AWS", "MongoDB", "PostgreSQL"],
                soft: ["Leadership", "Problem Solving", "Team Collaboration", "Communication", "Agile Methodologies"]
            },
            education: [
                {
                    degree: "Bachelor of Science in Computer Science",
                    institution: "University of Technology",
                    year: "2019",
                    gpa: "3.8/4.0"
                }
            ],
            certifications: [
                "AWS Certified Developer",
                "Google Cloud Professional",
                "Scrum Master Certified"
            ]
        };
    }

    // Generate CV content using AI
    async generateCVContent(jobAnalysis, userProfile) {
        console.log('[CV] Generating CV content with AI...');
        
        const payload = {
            jobAnalysis: jobAnalysis,
            userProfile: userProfile,
            requestType: 'cv_generation',
            timestamp: Date.now()
        };

        const response = await fetch('http://localhost:3000/api/extension/cv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'chrome-extension://' + chrome.runtime.id
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`CV content generation failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // Optimize CV for ATS compatibility
    async optimizeCVForATS(cvContent, jobAnalysis) {
        console.log('[CV] Optimizing CV for ATS...');
        
        const payload = {
            cvContent: cvContent,
            jobAnalysis: jobAnalysis,
            requestType: 'ats_optimization',
            timestamp: Date.now()
        };

        const response = await fetch('http://localhost:3000/api/jobs/match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'chrome-extension://' + chrome.runtime.id
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`ATS optimization failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // Generate PDF from optimized CV
    async generateCVPDF(optimizedCV) {
        console.log('[CV] Generating PDF...');
        
        const payload = {
            cvData: optimizedCV,
            format: 'pdf',
            template: 'ats_friendly',
            timestamp: Date.now()
        };

        const response = await fetch('http://localhost:3000/api/extension/cv/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'chrome-extension://' + chrome.runtime.id
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`PDF generation failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // Display CV generation result
    displayCVResult(cvData, pdfResult) {
        console.log('[CV] Displaying CV generation result');
        console.log('[CV] cvData received:', cvData);
        console.log('[CV] pdfResult received:', pdfResult);
        
        const previewContainer = this.elements.previewContent || document.getElementById('preview-content');
        if (!previewContainer) return;

        const cvResultDiv = document.createElement('div');
        cvResultDiv.style.cssText = 'margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;';
        cvResultDiv.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: white; display: flex; align-items: center; gap: 10px;">
                📄 CV Generated Successfully!
                <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: normal;">ATS Optimized</span>
            </h3>
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #fff;">CV Preview:</h4>
                <div style="background: rgba(255,255,255,0.9); color: #333; padding: 12px; border-radius: 4px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px;">
                    <pre style="white-space: pre-wrap; margin: 0;">${JSON.stringify(cvData, null, 2)}</pre>
                </div>
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button id="download-pdf-btn" style="
                    background: #4CAF50; color: white; border: none; padding: 10px 16px; 
                    border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; 
                    transition: all 0.2s; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);">
                    📄 Download PDF
                </button>
                <button onclick="navigator.clipboard.writeText('${JSON.stringify(cvData).replace(/'/g, "\\'")}');" style="
                    background: #2196F3; color: white; border: none; padding: 10px 16px; 
                    border-radius: 6px; font-size: 13px; cursor: pointer; transition: all 0.2s;">
                    📋 Copy CV Data
                </button>
                <button onclick="this.parentElement.parentElement.style.display='none';" style="
                    background: #FF5722; color: white; border: none; padding: 10px 16px; 
                    border-radius: 6px; font-size: 13px; cursor: pointer; transition: all 0.2s;">
                    ❌ Close
                </button>
            </div>
        `;
        
        previewContainer.appendChild(cvResultDiv);

        // Add download functionality with actual PDF generation
        const downloadBtn = cvResultDiv.querySelector('#download-pdf-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.generateAndDownloadPDF(cvData, pdfResult);
            });
        }

        // Add hover effects
        const buttons = cvResultDiv.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.filter = 'brightness(110%)';
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.filter = 'brightness(100%)';
            });
        });

        // Auto-scroll to show the result
        cvResultDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    // Generate and download actual PDF
    async generateAndDownloadPDF(cvData, pdfResult) {
        console.log('[PDF] Starting PDF generation...');
        
        // Update button to show loading
        const downloadBtn = document.getElementById('download-pdf-btn');
        if (downloadBtn) {
            downloadBtn.innerHTML = '⏳ Generating PDF...';
            downloadBtn.disabled = true;
        }
        
        try {
            // Check if jsPDF is available (should be loaded from local file)
            if (window.jspdf) {
                console.log('[PDF] jsPDF library already available');
                this.createPDFWithJSPDF(cvData, pdfResult);
                return;
            }
            
            // Fallback - try to wait a bit for library to load
            console.log('[PDF] jsPDF not immediately available, waiting...');
            setTimeout(() => {
                if (window.jspdf) {
                    console.log('[PDF] jsPDF available after delay');
                    this.createPDFWithJSPDF(cvData, pdfResult);
                } else {
                    console.error('[PDF] jsPDF library not loaded, using HTML fallback');
                    this.showNotification('⚠️ PDF library not available, using HTML fallback', 'warning');
                    this.fallbackHTMLDownload(cvData, pdfResult);
                }
            }, 500);
            
        } catch (error) {
            console.error('[PDF] Error in PDF generation setup:', error);
            this.showNotification('❌ PDF generation failed, downloading as HTML', 'error');
            this.fallbackHTMLDownload(cvData, pdfResult);
        } finally {
            // Reset button after a delay
            setTimeout(() => {
                if (downloadBtn) {
                    downloadBtn.innerHTML = '📄 Download PDF';
                    downloadBtn.disabled = false;
                }
            }, 3000);
        }
    }

    // Create PDF using jsPDF
    createPDFWithJSPDF(cvData, pdfResult) {
        console.log('[PDF] Creating PDF with jsPDF...');
        console.log('[PDF] cvData structure:', cvData);
        
        try {
            // Check if jsPDF is available
            if (!window.jspdf) {
                throw new Error('jsPDF library not loaded');
            }
            
            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            console.log('[PDF] jsPDF constructor available:', !!jsPDF);
            
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            console.log('[PDF] jsPDF document created');
            
            // Set default font
            doc.setFont('helvetica', 'normal');
            
            let yPos = 20;
            const leftMargin = 20;
            const rightMargin = 190;
            const pageWidth = 170; // A4 width minus margins
            const lineHeight = 6;
            
            // Helper function to add text with word wrapping
            const addWrappedText = (text, x, y, maxWidth, fontSize = 10, fontStyle = 'normal') => {
                if (!text) return y;
                
                doc.setFontSize(fontSize);
                doc.setFont('helvetica', fontStyle);
                
                const lines = doc.splitTextToSize(text.toString(), maxWidth);
                doc.text(lines, x, y);
                return y + (lines.length * lineHeight) + 2;
            };
            
            // Check page overflow and add new page if needed
            const checkPageOverflow = (requiredSpace = 20) => {
                if (yPos + requiredSpace > 280) {
                    doc.addPage();
                    yPos = 20;
                    return true;
                }
                return false;
            };

            // Extract data safely from the nested structure
            let personalInfo, professionalSummary, experience, skills, education, atsScore, keywords;
            
            // Try to extract from nested structure
            if (cvData.cvContent) {
                personalInfo = cvData.cvContent.personalInfo;
                professionalSummary = cvData.cvContent.professionalSummary;
                experience = cvData.cvContent.experience;
                skills = cvData.cvContent.skills;
                education = cvData.cvContent.education;
                atsScore = cvData.cvContent.atsScore || cvData.atsScore;
                keywords = cvData.cvContent.keywords || cvData.keywords;
            } else {
                // Direct structure
                personalInfo = cvData.personalInfo;
                professionalSummary = cvData.professionalSummary;
                experience = cvData.experience;
                skills = cvData.skills;
                education = cvData.education;
                atsScore = cvData.atsScore;
                keywords = cvData.keywords;
            }
            
            console.log('[PDF] Extracted data:', {
                personalInfo,
                professionalSummary,
                experience,
                skills,
                education,
                atsScore,
                keywords
            });
            
            // CLEAN PROFESSIONAL HEADER
            const name = personalInfo?.name || 'Professional Resume';
            console.log('[PDF] Adding clean header with name:', name);
            
            // Name - large, bold, centered
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            const nameWidth = doc.getTextWidth(name);
            const centerX = (210 - nameWidth) / 2;
            doc.text(name, centerX, yPos);
            yPos += 8;
            
            // Contact info - clean, centered format
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80); // Dark gray
            
            const contactParts = [];
            if (personalInfo?.email) contactParts.push(personalInfo.email);
            if (personalInfo?.phone) contactParts.push(personalInfo.phone);
            if (personalInfo?.location) contactParts.push(personalInfo.location);
            
            if (contactParts.length > 0) {
                const contactLine = contactParts.join(' | ');
                const contactWidth = doc.getTextWidth(contactLine);
                const contactCenterX = (210 - contactWidth) / 2;
                doc.text(contactLine, contactCenterX, yPos);
                yPos += 6;
            }
            
            // Subtle separator line
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);
            
            console.log('[PDF] Added clean contact info');
            
            // Reset text color and position
            doc.setTextColor(0, 0, 0);
            yPos = yPos + 15;
            
            // PROFESSIONAL SUMMARY - Clean ATS Format
            if (professionalSummary) {
                console.log('[PDF] Adding professional summary');
                checkPageOverflow(25);
                
                // Simple, clean section header
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('PROFESSIONAL SUMMARY', leftMargin, yPos);
                
                // Subtle underline
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);
                doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);
                yPos += 8;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                yPos = addWrappedText(professionalSummary, leftMargin, yPos, pageWidth, 10);
                yPos += 8;
            }
            
            // PROFESSIONAL EXPERIENCE - ATS Optimized Format
            if (experience && Array.isArray(experience) && experience.length > 0) {
                console.log('[PDF] Adding experience section, count:', experience.length);
                checkPageOverflow(25);
                
                // Clean section header
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('PROFESSIONAL EXPERIENCE', leftMargin, yPos);
                
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);
                doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);
                yPos += 10;
                
                experience.forEach((exp, index) => {
                    console.log('[PDF] Adding experience item:', index, exp);
                    checkPageOverflow(20);
                    
                    // Job title - prominent but clean
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    yPos = addWrappedText(exp.title || 'Position', leftMargin, yPos, pageWidth, 11, 'bold');
                    
                    // Company, duration, location in one clean line
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(60, 60, 60); // Dark gray
                    const companyLine = [
                        exp.company || 'Company',
                        exp.duration || 'Duration',
                        exp.location || ''
                    ].filter(Boolean).join(' | ');
                    yPos = addWrappedText(companyLine, leftMargin, yPos, pageWidth, 10);
                    yPos += 3;
                    
                    // Achievements - clean bullet points
                    if (exp.achievements && Array.isArray(exp.achievements)) {
                        doc.setTextColor(0, 0, 0);
                        exp.achievements.forEach(achievement => {
                            checkPageOverflow(6);
                            doc.setFont('helvetica', 'normal');
                            yPos = addWrappedText(`• ${achievement}`, leftMargin + 2, yPos, pageWidth - 2, 10);
                        });
                    }
                    yPos += 5;
                });
            } else {
                console.log('[PDF] No experience data found');
            }
            
            // SKILLS SECTION - Clean ATS Format
            if (skills && (skills.technical || skills.soft)) {
                console.log('[PDF] Adding skills section');
                checkPageOverflow(20);
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('SKILLS', leftMargin, yPos);
                
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);
                doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);
                yPos += 8;
                
                // Technical Skills - clean format
                if (skills.technical && Array.isArray(skills.technical) && skills.technical.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(40, 40, 40);
                    doc.text('Technical Skills:', leftMargin, yPos);
                    yPos += 5;
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    yPos = addWrappedText(skills.technical.join(' • '), leftMargin, yPos, pageWidth, 10);
                    yPos += 5;
                }
                
                // Soft Skills - clean format
                if (skills.soft && Array.isArray(skills.soft) && skills.soft.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(40, 40, 40);
                    doc.text('Soft Skills:', leftMargin, yPos);
                    yPos += 5;
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(0, 0, 0);
                    yPos = addWrappedText(skills.soft.join(' • '), leftMargin, yPos, pageWidth, 10);
                    yPos += 5;
                }
            }
            
            // EDUCATION - Clean Professional Format
            if (education && Array.isArray(education) && education.length > 0) {
                console.log('[PDF] Adding education section');
                checkPageOverflow(15);
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('EDUCATION', leftMargin, yPos);
                
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);
                doc.line(leftMargin, yPos + 2, rightMargin, yPos + 2);
                yPos += 8;
                
                education.forEach(edu => {
                    checkPageOverflow(10);
                    
                    // Degree name
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    yPos = addWrappedText(edu.degree || 'Degree', leftMargin, yPos, pageWidth, 11, 'bold');
                    
                    // Institution and details
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(60, 60, 60);
                    const eduDetails = [
                        edu.institution || 'Institution',
                        edu.year || 'Year',
                        edu.gpa ? `GPA: ${edu.gpa}` : ''
                    ].filter(Boolean).join(' | ');
                    yPos = addWrappedText(eduDetails, leftMargin, yPos, pageWidth, 10);
                    yPos += 4;
                });
            }
            
            // FOOTER - Simple and Clean
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${pageCount}`, rightMargin - 15, 285, { align: 'right' });
            }
            
            // Save the PDF
            const filename = pdfResult?.filename?.replace('.html', '.pdf') || `Resume_${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            console.log('[PDF] Saving PDF as:', filename);
            
            doc.save(filename);
            
            this.showNotification('🎉 Professional PDF downloaded successfully!', 'success');
            console.log('[PDF] Professional PDF generated and downloaded successfully');
            
        } catch (error) {
            console.error('[PDF] Error creating PDF with jsPDF:', error);
            console.error('[PDF] Error details:', error.message);
            this.showNotification(`❌ PDF error: ${error.message}. Using HTML fallback.`, 'error');
            this.fallbackHTMLDownload(cvData, pdfResult);
        }
    }

    // Fallback HTML download
    fallbackHTMLDownload(cvData, pdfResult) {
        console.log('[FALLBACK] Using HTML fallback download');
        console.log('[FALLBACK] cvData structure:', cvData);
        
        try {
            const htmlContent = this.generateHTMLForDownload(cvData);
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = pdfResult?.filename?.replace('.pdf', '.html') || 'resume.html';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showNotification('📄 CV downloaded as HTML (print to PDF from browser)', 'success');
            console.log('[FALLBACK] HTML download completed successfully');
            
        } catch (error) {
            console.error('[FALLBACK] Error in HTML fallback:', error);
            this.showNotification('❌ Download failed completely. Please try again.', 'error');
        }
    }

    // Generate HTML content for download
    generateHTMLForDownload(cvData) {
        console.log('[HTML] Generating HTML for download with cvData:', cvData);
        
        // Extract data safely from nested structure
        let personalInfo, professionalSummary, experience, skills, education, atsScore, keywords;
        
        if (cvData.cvContent) {
            personalInfo = cvData.cvContent.personalInfo;
            professionalSummary = cvData.cvContent.professionalSummary;
            experience = cvData.cvContent.experience;
            skills = cvData.cvContent.skills;
            education = cvData.cvContent.education;
            atsScore = cvData.cvContent.atsScore || cvData.atsScore;
            keywords = cvData.cvContent.keywords || cvData.keywords;
        } else {
            personalInfo = cvData.personalInfo;
            professionalSummary = cvData.professionalSummary;
            experience = cvData.experience;
            skills = cvData.skills;
            education = cvData.education;
            atsScore = cvData.atsScore;
            keywords = cvData.keywords;
        }
        
        const name = personalInfo?.name || 'Professional Resume';
        console.log('[HTML] Extracted name:', name, 'hasExperience:', !!experience, 'hasSkills:', !!skills);
        
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Resume - ${name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Arial', 'Helvetica', sans-serif; 
            font-size: 11px;
            line-height: 1.4; 
            color: #000;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 60px;
            background: #fff;
        }
        
        /* Header Styling */
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 15px;
        }
        .header h1 { 
            font-size: 22px; 
            font-weight: bold; 
            color: #000;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        .contact-info { 
            font-size: 10px; 
            color: #555;
            line-height: 1.3;
        }
        
        /* Section Styling */
        .section { 
            margin-bottom: 25px; 
        }
        .section-title { 
            font-size: 12px; 
            font-weight: bold; 
            color: #000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 3px;
        }
        
        /* Experience Styling */
        .experience-item { 
            margin-bottom: 18px; 
            page-break-inside: avoid;
        }
        .job-title { 
            font-size: 11px; 
            font-weight: bold; 
            color: #000;
            margin-bottom: 2px;
        }
        .company-info { 
            font-size: 10px;
            color: #555; 
            margin-bottom: 6px;
        }
        .achievements { 
            list-style: none; 
            padding-left: 0; 
        }
        .achievements li { 
            font-size: 10px;
            margin-bottom: 3px; 
            position: relative; 
            padding-left: 12px;
            line-height: 1.3;
        }
        .achievements li:before { 
            content: "•"; 
            position: absolute; 
            left: 0; 
            color: #000;
            font-weight: bold;
        }
        
        /* Skills Styling */
        .skills-category { 
            margin-bottom: 8px; 
        }
        .skills-category strong {
            font-size: 10px;
            color: #333;
            display: block;
            margin-bottom: 3px;
        }
        .skills-text {
            font-size: 10px;
            line-height: 1.3;
        }
        
        /* Education Styling */
        .education-item { 
            margin-bottom: 12px; 
        }
        .degree { 
            font-weight: bold; 
            font-size: 11px;
            color: #000;
            margin-bottom: 2px;
        }
        .institution { 
            font-size: 10px;
            color: #555;
        }
        
        /* Print Optimization */
        @media print { 
            body { 
                margin: 0; 
                padding: 20px;
                font-size: 10px;
            }
            .section {
                page-break-inside: avoid;
            }
            .experience-item {
                page-break-inside: avoid;
            }
        }
        
        /* Footer */
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 8px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${name}</h1>
        <div class="contact-info">
            ${contactParts.length > 0 ? contactParts.join(' | ') : ''}
        </div>
    </div>
    
    ${professionalSummary ? `
    <div class="section">
        <div class="section-title">Professional Summary</div>
        <p style="font-size: 10px; line-height: 1.4;">${professionalSummary}</p>
    </div>
    ` : ''}
    
    ${experience && Array.isArray(experience) && experience.length > 0 ? `
    <div class="section">
        <div class="section-title">Professional Experience</div>
        ${experience.map(exp => `
            <div class="experience-item">
                <div class="job-title">${exp.title || 'Position'}</div>
                <div class="company-info">
                    ${[exp.company || 'Company', exp.duration || 'Duration', exp.location].filter(Boolean).join(' | ')}
                </div>
                ${exp.achievements && Array.isArray(exp.achievements) ? `
                    <ul class="achievements">
                        ${exp.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}
    
    ${skills && (skills.technical || skills.soft) ? `
    <div class="section">
        <div class="section-title">Skills</div>
        ${skills.technical && Array.isArray(skills.technical) && skills.technical.length > 0 ? `
            <div class="skills-category">
                <strong>Technical Skills:</strong>
                <div class="skills-text">${skills.technical.join(' • ')}</div>
            </div>
        ` : ''}
        ${skills.soft && Array.isArray(skills.soft) && skills.soft.length > 0 ? `
            <div class="skills-category">
                <strong>Soft Skills:</strong>
                <div class="skills-text">${skills.soft.join(' • ')}</div>
            </div>
        ` : ''}
    </div>
    ` : ''}
    
    ${education && Array.isArray(education) && education.length > 0 ? `
    <div class="section">
        <div class="section-title">Education</div>
        ${education.map(edu => `
            <div class="education-item">
                <div class="degree">${edu.degree || 'Degree'}</div>
                <div class="institution">
                    ${[edu.institution || 'Institution', edu.year || 'Year', edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join(' | ')}
                </div>
            </div>
        `).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
        ${new Date().toLocaleDateString()}
    </div>
</body>
</html>`;
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Popup] 🚀 DOM loaded, initializing PopupController...');
    try {
        const popupController = new PopupController();
        console.log('[Popup] ✅ PopupController initialized successfully');
        
        // Make it available globally for debugging
        window.popupController = popupController;
        
        // Add a quick test method
        window.testExtensionSetup = () => {
            console.log('🔧 Extension Setup Test:');
            console.log('✅ PopupController exists:', !!popupController);
            console.log('✅ sendContentToAI method:', typeof popupController.sendContentToAI);
            console.log('✅ testAPIConnection method:', typeof popupController.testAPIConnection);
            console.log('✅ showSelectionPreview method:', typeof popupController.showSelectionPreview);
            console.log('✅ checkForPendingContent method:', typeof popupController.checkForPendingContent);
            return popupController;
        };
        
    } catch (error) {
        console.error('[Popup] ❌ Error initializing PopupController:', error);
    }
});
