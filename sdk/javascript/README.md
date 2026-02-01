# TRM JavaScript SDK

Official JavaScript SDK for The Referral Marketplace (TRM) API.

## Installation

```bash
npm install @trm/sdk
```

Or include directly in HTML:

```html
<script src="https://cdn.trm.com/sdk/v1/trm.js"></script>
```

## Quick Start

```javascript
const { TRM } = require('@trm/sdk');

// Initialize the client
const trm = new TRM('your_api_key_here');

// List jobs
const jobs = await trm.listJobs();
console.log(jobs.data);

// Create a referral
const referral = await trm.createReferral({
  jobId: 'job_id_here',
  candidate: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890'
  }
});
```

## Configuration

```javascript
const trm = new TRM('your_api_key', {
  baseURL: 'https://api.trm.com/v1',  // Optional
  timeout: 30000,                      // Request timeout in ms
  maxRetries: 3,                       // Max retry attempts
  retryDelay: 1000                     // Initial retry delay in ms
});
```

## API Reference

### Jobs

- `listJobs(params)` - List all jobs
- `getJob(jobId)` - Get job details
- `createJob(data)` - Create a new job
- `updateJob(jobId, data)` - Update a job
- `deleteJob(jobId)` - Delete (close) a job
- `getRelatedJobs(jobId, params)` - Get related jobs

### Referrals

- `listReferrals(params)` - List referrals
- `getReferral(referralId)` - Get referral details
- `createReferral(data)` - Create a referral
- `updateReferralStatus(referralId, status, notes)` - Update status
- `getReferralTracking(referralId)` - Get tracking timeline

### Companies

- `listCompanies(params)` - List companies
- `getCompany(companyId)` - Get company details
- `getCompanyJobs(companyId, params)` - Get company jobs
- `createCompany(data)` - Create a company
- `updateCompany(companyId, data)` - Update a company

### Users

- `getCurrentUser()` - Get current user profile
- `updateCurrentUser(data)` - Update profile
- `getCurrentUserReferrals(params)` - Get user's referrals
- `getCurrentUserStats()` - Get user statistics
- `getUser(userId)` - Get public user profile

### API Keys

- `listAPIKeys()` - List API keys
- `createAPIKey(data)` - Create a new API key
- `getAPIKey(keyId)` - Get API key details
- `updateAPIKey(keyId, data)` - Update API key
- `revokeAPIKey(keyId, reason)` - Revoke API key
- `rotateAPIKey(keyId)` - Rotate API key
- `getAPIKeyUsage(keyId, params)` - Get usage stats

### Webhooks

- `listWebhooks(params)` - List webhooks
- `createWebhook(data)` - Create a webhook
- `getWebhook(webhookId)` - Get webhook details
- `updateWebhook(webhookId, data)` - Update webhook
- `deleteWebhook(webhookId)` - Delete webhook
- `testWebhook(webhookId)` - Send test event
- `getWebhookDeliveries(webhookId, params)` - Get delivery history

## Error Handling

```javascript
try {
  const job = await trm.getJob('invalid_id');
} catch (error) {
  if (error.name === 'TRMError') {
    console.log(error.code);      // Error code
    console.log(error.message);   // Error message
    console.log(error.statusCode); // HTTP status
  }
}
```

## License

MIT
