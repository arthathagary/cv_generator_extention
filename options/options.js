// Options page JavaScript for Resume AI Chrome Extension
class OptionsManager {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.loadSettings();
        this.setupJobSitesList();
    }

    init() {
        this.elements = {
            // General settings
            autoDetect: document.getElementById('auto-detect'),
            highlightKeywords: document.getElementById('highlight-keywords'),
            showNotifications: document.getElementById('show-notifications'),
            autoSave: document.getElementById('auto-save'),
            themeSelect: document.getElementById('theme-select'),
            languageSelect: document.getElementById('language-select'),

            // Backend API configuration
            backendApiUrl: document.getElementById('backend-api-url'),
            apiTimeout: document.getElementById('api-timeout'),
            retryAttempts: document.getElementById('retry-attempts'),
            testBackendConnection: document.getElementById('test-backend-connection'),
            backendTestResult: document.getElementById('backend-test-result'),
            viewApiDocs: document.getElementById('view-api-docs'),

            // Job extraction
            jobSitesList: document.getElementById('job-sites-list'),
            extractionDelay: document.getElementById('extraction-delay'),
            extractCompanyInfo: document.getElementById('extract-company-info'),
            extractSalaryInfo: document.getElementById('extract-salary-info'),

            // CV generation
            cvFormat: document.getElementById('cv-format'),
            cvTemplate: document.getElementById('cv-template'),
            includeCoverLetter: document.getElementById('include-cover-letter'),
            optimizeKeywords: document.getElementById('optimize-keywords'),
            cvLength: document.getElementById('cv-length'),

            // Account
            accountStatus: document.getElementById('account-status'),
            connectAccount: document.getElementById('connect-account'),
            disconnectAccount: document.getElementById('disconnect-account'),
            webappUrl: document.getElementById('webapp-url'),
            exportData: document.getElementById('export-data'),
            importData: document.getElementById('import-data'),
            clearData: document.getElementById('clear-data'),

            // Footer
            saveSettings: document.getElementById('save-settings'),
            resetSettings: document.getElementById('reset-settings'),
            saveStatus: document.getElementById('save-status')
        };
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Settings changes
        this.elements.saveSettings.addEventListener('click', () => this.saveSettings());
        this.elements.resetSettings.addEventListener('click', () => this.resetSettings());

        // Backend API testing
        this.elements.testBackendConnection.addEventListener('click', () => this.testBackendConnection());
        
        // API documentation
        this.elements.viewApiDocs.addEventListener('click', () => this.viewApiDocs());

        // Account management
        this.elements.connectAccount.addEventListener('click', () => this.connectAccount());
        this.elements.disconnectAccount.addEventListener('click', () => this.disconnectAccount());

        // Data management
        this.elements.exportData.addEventListener('click', () => this.exportData());
        this.elements.importData.addEventListener('click', () => this.importData());
        this.elements.clearData.addEventListener('click', () => this.clearData());

        // Auto-save on changes
        this.setupAutoSave();
    }

    setupAutoSave() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                if (this.elements.autoSave.checked) {
                    this.saveSettings(false); // Silent save
                }
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['settings']);
            const settings = result.settings || this.getDefaultSettings();

            // General settings
            this.elements.autoDetect.checked = settings.autoDetect ?? true;
            this.elements.highlightKeywords.checked = settings.highlightKeywords ?? true;
            this.elements.showNotifications.checked = settings.showNotifications ?? true;
            this.elements.autoSave.checked = settings.autoSave ?? true;
            this.elements.themeSelect.value = settings.theme || 'auto';
            this.elements.languageSelect.value = settings.language || 'en';

            // Backend API configuration
            this.elements.backendApiUrl.value = settings.backendApiUrl || 'http://localhost:3000';
            this.elements.apiTimeout.value = settings.apiTimeout || 30;
            this.elements.retryAttempts.value = settings.retryAttempts || 3;

            // Job extraction
            this.elements.extractionDelay.value = settings.extractionDelay || 2;
            this.elements.extractCompanyInfo.checked = settings.extractCompanyInfo ?? true;
            this.elements.extractSalaryInfo.checked = settings.extractSalaryInfo ?? true;

            // CV generation
            this.elements.cvFormat.value = settings.cvFormat || 'pdf';
            this.elements.cvTemplate.value = settings.cvTemplate || 'ats-optimized';
            this.elements.includeCoverLetter.checked = settings.includeCoverLetter ?? false;
            this.elements.optimizeKeywords.checked = settings.optimizeKeywords ?? true;
            this.elements.cvLength.value = settings.cvLength || 'auto';

            // Web app URL
            this.elements.webappUrl.value = settings.webAppUrl || 'https://your-webapp-domain.com';

            // Load account status
            await this.loadAccountStatus();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showSaveStatus('Error loading settings', 'error');
        }
    }

    async loadAccountStatus() {
        try {
            const result = await chrome.storage.sync.get(['profileConnected', 'userProfile']);
            
            if (result.profileConnected && result.userProfile) {
                this.updateAccountStatus(true, result.userProfile);
            } else {
                this.updateAccountStatus(false);
            }
        } catch (error) {
            console.error('Error loading account status:', error);
        }
    }

    updateAccountStatus(connected, profile = null) {
        const statusIndicator = this.elements.accountStatus.querySelector('.status-indicator');
        const statusText = this.elements.accountStatus.querySelector('.status-text');
        
        if (connected && profile) {
            statusIndicator.classList.remove('disconnected');
            statusText.innerHTML = `
                <h3>Connected</h3>
                <p>Logged in as ${profile.name || profile.email}</p>
            `;
            this.elements.connectAccount.style.display = 'none';
            this.elements.disconnectAccount.style.display = 'block';
        } else {
            statusIndicator.classList.add('disconnected');
            statusText.innerHTML = `
                <h3>Not Connected</h3>
                <p>Connect your web app account to sync profiles and CVs</p>
            `;
            this.elements.connectAccount.style.display = 'block';
            this.elements.disconnectAccount.style.display = 'none';
        }
    }

    async saveSettings(showMessage = true) {
        try {
            const settings = {
                // General settings
                autoDetect: this.elements.autoDetect.checked,
                highlightKeywords: this.elements.highlightKeywords.checked,
                showNotifications: this.elements.showNotifications.checked,
                autoSave: this.elements.autoSave.checked,
                theme: this.elements.themeSelect.value,
                language: this.elements.languageSelect.value,

                // Backend API configuration
                backendApiUrl: this.elements.backendApiUrl.value.trim(),
                apiTimeout: parseInt(this.elements.apiTimeout.value),
                retryAttempts: parseInt(this.elements.retryAttempts.value),

                // Job extraction
                extractionDelay: parseInt(this.elements.extractionDelay.value),
                extractCompanyInfo: this.elements.extractCompanyInfo.checked,
                extractSalaryInfo: this.elements.extractSalaryInfo.checked,

                // CV generation
                cvFormat: this.elements.cvFormat.value,
                cvTemplate: this.elements.cvTemplate.value,
                includeCoverLetter: this.elements.includeCoverLetter.checked,
                optimizeKeywords: this.elements.optimizeKeywords.checked,
                cvLength: this.elements.cvLength.value,

                // Web app URL
                webAppUrl: this.elements.webappUrl.value
            };

            await chrome.storage.sync.set({ settings });

            if (showMessage) {
                this.showSaveStatus('Settings saved successfully!', 'success');
            }

            // Notify content scripts of settings change
            chrome.runtime.sendMessage({ action: 'settingsUpdated', settings });
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showSaveStatus('Error saving settings', 'error');
        }
    }

    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            return;
        }

        try {
            const defaultSettings = this.getDefaultSettings();
            await chrome.storage.sync.set({ settings: defaultSettings });
            
            // Reload the page to reflect changes
            location.reload();
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showSaveStatus('Error resetting settings', 'error');
        }
    }

    async testBackendConnection() {
        try {
            this.elements.testBackendConnection.disabled = true;
            this.elements.testBackendConnection.textContent = 'Testing...';
            
            const backendUrl = this.elements.backendApiUrl.value || 'http://localhost:3000';
            
            // Test basic connectivity
            const response = await fetch(`${backendUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.showTestResult(`Backend connection successful! ✅ (Version: ${result.version || 'Unknown'})`, 'success');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Backend test failed:', error);
            this.showTestResult(`Backend connection failed: ${error.message}`, 'error');
        } finally {
            this.elements.testBackendConnection.disabled = false;
            this.elements.testBackendConnection.textContent = 'Test Backend Connection';
        }
    }

    viewApiDocs() {
        // Open the API documentation
        const docUrl = chrome.runtime.getURL('API_KEY_SETUP.md');
        chrome.tabs.create({ url: docUrl });
    }

    showTestResult(message, type) {
        this.elements.backendTestResult.textContent = message;
        this.elements.backendTestResult.className = `test-result ${type}`;
        
        setTimeout(() => {
            this.elements.backendTestResult.className = 'test-result';
        }, 5000);
    }

    async connectAccount() {
        try {
            const webAppUrl = this.elements.webappUrl.value;
            if (!webAppUrl) {
                throw new Error('Please enter your web app URL first');
            }

            // Open authentication window
            const authUrl = `${webAppUrl}/auth/chrome-extension`;
            chrome.tabs.create({ url: authUrl });
            
            this.showSaveStatus('Opening authentication window...', 'success');
        } catch (error) {
            console.error('Error connecting account:', error);
            this.showSaveStatus('Error connecting account', 'error');
        }
    }

    async disconnectAccount() {
        if (!confirm('Are you sure you want to disconnect your account?')) {
            return;
        }

        try {
            await chrome.storage.sync.remove(['profileConnected', 'userProfile', 'authToken']);
            this.updateAccountStatus(false);
            this.showSaveStatus('Account disconnected', 'success');
        } catch (error) {
            console.error('Error disconnecting account:', error);
            this.showSaveStatus('Error disconnecting account', 'error');
        }
    }

    async exportData() {
        try {
            const syncData = await chrome.storage.sync.get(null);
            const localData = await chrome.storage.local.get(null);
            
            const exportData = {
                sync: syncData,
                local: localData,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resume-ai-data-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSaveStatus('Data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showSaveStatus('Error exporting data', 'error');
        }
    }

    async importData() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const text = await file.text();
                const data = JSON.parse(text);

                if (data.sync) {
                    await chrome.storage.sync.set(data.sync);
                }
                if (data.local) {
                    await chrome.storage.local.set(data.local);
                }

                this.showSaveStatus('Data imported successfully', 'success');
                setTimeout(() => location.reload(), 2000);
            };

            input.click();
        } catch (error) {
            console.error('Error importing data:', error);
            this.showSaveStatus('Error importing data', 'error');
        }
    }

    async clearData() {
        const confirmed = confirm(
            'Are you sure you want to clear all data? This will:\n\n' +
            '• Remove all settings\n' +
            '• Clear saved job details\n' +
            '• Delete generated CVs\n' +
            '• Disconnect your account\n\n' +
            'This cannot be undone!'
        );

        if (!confirmed) return;

        try {
            await chrome.storage.sync.clear();
            await chrome.storage.local.clear();
            
            this.showSaveStatus('All data cleared', 'success');
            setTimeout(() => location.reload(), 2000);
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showSaveStatus('Error clearing data', 'error');
        }
    }

    setupJobSitesList() {
        const jobSites = [
            { name: 'LinkedIn', enabled: true, logo: '🔗' },
            { name: 'Indeed', enabled: true, logo: '💼' },
            { name: 'Glassdoor', enabled: true, logo: '🏢' },
            { name: 'Google Jobs', enabled: true, logo: '🔍' },
            { name: 'Monster', enabled: true, logo: '👹' },
            { name: 'ZipRecruiter', enabled: true, logo: '📄' },
            { name: 'Dice', enabled: true, logo: '🎲' },
            { name: 'CareerBuilder', enabled: true, logo: '🏗️' }
        ];

        this.elements.jobSitesList.innerHTML = jobSites.map(site => `
            <div class="job-site-item">
                <div class="job-site-info">
                    <span class="job-site-logo">${site.logo}</span>
                    <span>${site.name}</span>
                </div>
                <div class="job-site-status ${site.enabled ? '' : 'disabled'}"></div>
            </div>
        `).join('');
    }

    showSaveStatus(message, type) {
        this.elements.saveStatus.textContent = message;
        this.elements.saveStatus.className = `save-status ${type}`;
        
        setTimeout(() => {
            this.elements.saveStatus.textContent = '';
            this.elements.saveStatus.className = 'save-status';
        }, 3000);
    }

    getDefaultSettings() {
        return {
            autoDetect: true,
            highlightKeywords: true,
            showNotifications: true,
            autoSave: true,
            theme: 'auto',
            language: 'en',
            backendApiUrl: 'http://localhost:3000',
            apiTimeout: 30,
            retryAttempts: 3,
            extractionDelay: 2,
            extractCompanyInfo: true,
            extractSalaryInfo: true,
            cvFormat: 'pdf',
            cvTemplate: 'ats-optimized',
            includeCoverLetter: false,
            optimizeKeywords: true,
            cvLength: 'auto',
            webAppUrl: 'https://your-webapp-domain.com'
        };
    }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});
