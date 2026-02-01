/**
 * TRM JavaScript SDK
 * Official SDK for The Referral Marketplace API
 * @version 1.0.0
 */

class TRMError extends Error {
  constructor(message, code, type, statusCode, response) {
    super(message);
    this.name = 'TRMError';
    this.code = code;
    this.type = type;
    this.statusCode = statusCode;
    this.response = response;
  }
}

class TRM {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api.trm.com/v1';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Make an API request
   */
  async request(method, endpoint, data = null, params = null) {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'User-Agent': 'TRM-JS-SDK/1.0.0'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    let lastError;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        options.signal = controller.signal;
        
        const response = await fetch(url.toString(), options);
        clearTimeout(timeoutId);

        const responseData = await response.json();

        if (!response.ok) {
          throw new TRMError(
            responseData.error?.message || 'API Error',
            responseData.error?.code || 'unknown_error',
            responseData.error?.type || 'api_error',
            response.status,
            responseData
          );
        }

        return responseData;
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        
        // Wait before retrying
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============ Jobs API ============
  
  /**
   * List all jobs
   */
  async listJobs(params = {}) {
    return this.request('GET', '/jobs', null, params);
  }

  /**
   * Get a specific job
   */
  async getJob(jobId) {
    return this.request('GET', `/jobs/${jobId}`);
  }

  /**
   * Create a new job
   */
  async createJob(data) {
    return this.request('POST', '/jobs', data);
  }

  /**
   * Update a job
   */
  async updateJob(jobId, data) {
    return this.request('PUT', `/jobs/${jobId}`, data);
  }

  /**
   * Delete (close) a job
   */
  async deleteJob(jobId) {
    return this.request('DELETE', `/jobs/${jobId}`);
  }

  /**
   * Get related jobs
   */
  async getRelatedJobs(jobId, params = {}) {
    return this.request('GET', `/jobs/${jobId}/related`, null, params);
  }

  // ============ Referrals API ============

  /**
   * List all referrals
   */
  async listReferrals(params = {}) {
    return this.request('GET', '/referrals', null, params);
  }

  /**
   * Get a specific referral
   */
  async getReferral(referralId) {
    return this.request('GET', `/referrals/${referralId}`);
  }

  /**
   * Create a new referral
   */
  async createReferral(data) {
    return this.request('POST', '/referrals', data);
  }

  /**
   * Update referral status
   */
  async updateReferralStatus(referralId, status, notes = null) {
    return this.request('PATCH', `/referrals/${referralId}/status`, { status, notes });
  }

  /**
   * Get referral tracking/timeline
   */
  async getReferralTracking(referralId) {
    return this.request('GET', `/referrals/${referralId}/tracking`);
  }

  // ============ Companies API ============

  /**
   * List all companies
   */
  async listCompanies(params = {}) {
    return this.request('GET', '/companies', null, params);
  }

  /**
   * Get a specific company
   */
  async getCompany(companyId) {
    return this.request('GET', `/companies/${companyId}`);
  }

  /**
   * Get jobs for a company
   */
  async getCompanyJobs(companyId, params = {}) {
    return this.request('GET', `/companies/${companyId}/jobs`, null, params);
  }

  /**
   * Create a new company
   */
  async createCompany(data) {
    return this.request('POST', '/companies', data);
  }

  /**
   * Update a company
   */
  async updateCompany(companyId, data) {
    return this.request('PUT', `/companies/${companyId}`, data);
  }

  // ============ Users API ============

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    return this.request('GET', '/users/me');
  }

  /**
   * Update current user profile
   */
  async updateCurrentUser(data) {
    return this.request('PUT', '/users/me', data);
  }

  /**
   * Get current user's referrals
   */
  async getCurrentUserReferrals(params = {}) {
    return this.request('GET', '/users/me/referrals', null, params);
  }

  /**
   * Get current user's statistics
   */
  async getCurrentUserStats() {
    return this.request('GET', '/users/me/stats');
  }

  /**
   * Get public user profile
   */
  async getUser(userId) {
    return this.request('GET', `/users/${userId}`);
  }

  // ============ Auth API ============

  /**
   * Verify API key
   */
  async verifyKey() {
    return this.request('POST', '/auth/verify');
  }

  /**
   * List API keys
   */
  async listAPIKeys() {
    return this.request('GET', '/auth/apikeys');
  }

  /**
   * Get API key details
   */
  async getAPIKey(keyId) {
    return this.request('GET', `/auth/apikeys/${keyId}`);
  }

  /**
   * Create a new API key
   */
  async createAPIKey(data) {
    return this.request('POST', '/auth/apikey', data);
  }

  /**
   * Update an API key
   */
  async updateAPIKey(keyId, data) {
    return this.request('PUT', `/auth/apikeys/${keyId}`, data);
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(keyId, reason) {
    return this.request('DELETE', `/auth/apikeys/${keyId}`, { reason });
  }

  /**
   * Rotate an API key
   */
  async rotateAPIKey(keyId) {
    return this.request('POST', `/auth/apikeys/${keyId}/rotate`);
  }

  /**
   * Get API key usage
   */
  async getAPIKeyUsage(keyId, params = {}) {
    return this.request('GET', `/auth/apikeys/${keyId}/usage`, null, params);
  }

  /**
   * Get permissions reference
   */
  async getPermissions() {
    return this.request('GET', '/auth/permissions');
  }

  // ============ Webhooks API ============

  /**
   * List webhooks
   */
  async listWebhooks(params = {}) {
    return this.request('GET', '/webhooks', null, params);
  }

  /**
   * Get a specific webhook
   */
  async getWebhook(webhookId) {
    return this.request('GET', `/webhooks/${webhookId}`);
  }

  /**
   * Create a new webhook
   */
  async createWebhook(data) {
    return this.request('POST', '/webhooks', data);
  }

  /**
   * Update a webhook
   */
  async updateWebhook(webhookId, data) {
    return this.request('PUT', `/webhooks/${webhookId}`, data);
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId) {
    return this.request('DELETE', `/webhooks/${webhookId}`);
  }

  /**
   * Test a webhook
   */
  async testWebhook(webhookId) {
    return this.request('POST', `/webhooks/${webhookId}/test`);
  }

  /**
   * Get webhook deliveries
   */
  async getWebhookDeliveries(webhookId, params = {}) {
    return this.request('GET', `/webhooks/${webhookId}/deliveries`, null, params);
  }

  /**
   * Get specific delivery
   */
  async getDelivery(webhookId, deliveryId) {
    return this.request('GET', `/webhooks/${webhookId}/deliveries/${deliveryId}`);
  }

  /**
   * Get available webhook events
   */
  async getWebhookEvents() {
    return this.request('GET', '/webhooks/events/list');
  }

  // ============ Utility ============

  /**
   * Check API health
   */
  async health() {
    return this.request('GET', '/health');
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TRM, TRMError };
}

if (typeof window !== 'undefined') {
  window.TRM = TRM;
  window.TRMError = TRMError;
}
