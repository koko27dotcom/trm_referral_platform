"""
TRM API Client
"""

import requests
import time
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin


class TRMError(Exception):
    """TRM API Error"""
    
    def __init__(self, message: str, code: str, error_type: str, status_code: int, response: dict):
        super().__init__(message)
        self.code = code
        self.error_type = error_type
        self.status_code = status_code
        self.response = response


class TRMClient:
    """TRM API Client"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.trm.com/v1", 
                 timeout: int = 30, max_retries: int = 3, retry_delay: float = 1.0):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json',
            'User-Agent': 'TRM-Python-SDK/1.0.0'
        })
    
    def _request(self, method: str, endpoint: str, data: dict = None, 
                 params: dict = None) -> dict:
        """Make an API request with retry logic"""
        url = urljoin(self.base_url + '/', endpoint.lstrip('/'))
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    timeout=self.timeout
                )
                
                response_data = response.json() if response.content else {}
                
                if not response.ok:
                    error = TRMError(
                        message=response_data.get('error', {}).get('message', 'API Error'),
                        code=response_data.get('error', {}).get('code', 'unknown_error'),
                        error_type=response_data.get('error', {}).get('type', 'api_error'),
                        status_code=response.status_code,
                        response=response_data
                    )
                    
                    # Don't retry on client errors
                    if 400 <= response.status_code < 500:
                        raise error
                    last_error = error
                else:
                    return response_data
                    
            except requests.exceptions.RequestException as e:
                last_error = e
            
            # Wait before retry
            if attempt < self.max_retries - 1:
                time.sleep(self.retry_delay * (2 ** attempt))
        
        raise last_error or TRMError(
            "Max retries exceeded", "max_retries", "request_error", 0, {}
        )
    
    # ============ Jobs ============
    
    def list_jobs(self, **params) -> dict:
        """List all jobs"""
        return self._request('GET', '/jobs', params=params)
    
    def get_job(self, job_id: str) -> dict:
        """Get job details"""
        return self._request('GET', f'/jobs/{job_id}')
    
    def create_job(self, data: dict) -> dict:
        """Create a new job"""
        return self._request('POST', '/jobs', data=data)
    
    def update_job(self, job_id: str, data: dict) -> dict:
        """Update a job"""
        return self._request('PUT', f'/jobs/{job_id}', data=data)
    
    def delete_job(self, job_id: str) -> dict:
        """Delete (close) a job"""
        return self._request('DELETE', f'/jobs/{job_id}')
    
    def get_related_jobs(self, job_id: str, **params) -> dict:
        """Get related jobs"""
        return self._request('GET', f'/jobs/{job_id}/related', params=params)
    
    # ============ Referrals ============
    
    def list_referrals(self, **params) -> dict:
        """List all referrals"""
        return self._request('GET', '/referrals', params=params)
    
    def get_referral(self, referral_id: str) -> dict:
        """Get referral details"""
        return self._request('GET', f'/referrals/{referral_id}')
    
    def create_referral(self, data: dict) -> dict:
        """Create a new referral"""
        return self._request('POST', '/referrals', data=data)
    
    def update_referral_status(self, referral_id: str, status: str, notes: str = None) -> dict:
        """Update referral status"""
        data = {'status': status}
        if notes:
            data['notes'] = notes
        return self._request('PATCH', f'/referrals/{referral_id}/status', data=data)
    
    def get_referral_tracking(self, referral_id: str) -> dict:
        """Get referral tracking/timeline"""
        return self._request('GET', f'/referrals/{referral_id}/tracking')
    
    # ============ Companies ============
    
    def list_companies(self, **params) -> dict:
        """List all companies"""
        return self._request('GET', '/companies', params=params)
    
    def get_company(self, company_id: str) -> dict:
        """Get company details"""
        return self._request('GET', f'/companies/{company_id}')
    
    def get_company_jobs(self, company_id: str, **params) -> dict:
        """Get jobs for a company"""
        return self._request('GET', f'/companies/{company_id}/jobs', params=params)
    
    def create_company(self, data: dict) -> dict:
        """Create a new company"""
        return self._request('POST', '/companies', data=data)
    
    def update_company(self, company_id: str, data: dict) -> dict:
        """Update a company"""
        return self._request('PUT', f'/companies/{company_id}', data=data)
    
    # ============ Users ============
    
    def get_current_user(self) -> dict:
        """Get current user profile"""
        return self._request('GET', '/users/me')
    
    def update_current_user(self, data: dict) -> dict:
        """Update current user profile"""
        return self._request('PUT', '/users/me', data=data)
    
    def get_current_user_referrals(self, **params) -> dict:
        """Get current user's referrals"""
        return self._request('GET', '/users/me/referrals', params=params)
    
    def get_current_user_stats(self) -> dict:
        """Get current user's statistics"""
        return self._request('GET', '/users/me/stats')
    
    def get_user(self, user_id: str) -> dict:
        """Get public user profile"""
        return self._request('GET', f'/users/{user_id}')
    
    # ============ Auth ============
    
    def verify_key(self) -> dict:
        """Verify API key"""
        return self._request('POST', '/auth/verify')
    
    def list_api_keys(self) -> dict:
        """List API keys"""
        return self._request('GET', '/auth/apikeys')
    
    def get_api_key(self, key_id: str) -> dict:
        """Get API key details"""
        return self._request('GET', f'/auth/apikeys/{key_id}')
    
    def create_api_key(self, data: dict) -> dict:
        """Create a new API key"""
        return self._request('POST', '/auth/apikey', data=data)
    
    def update_api_key(self, key_id: str, data: dict) -> dict:
        """Update an API key"""
        return self._request('PUT', f'/auth/apikeys/{key_id}', data=data)
    
    def revoke_api_key(self, key_id: str, reason: str = None) -> dict:
        """Revoke an API key"""
        data = {'reason': reason} if reason else {}
        return self._request('DELETE', f'/auth/apikeys/{key_id}', data=data)
    
    def rotate_api_key(self, key_id: str) -> dict:
        """Rotate an API key"""
        return self._request('POST', f'/auth/apikeys/{key_id}/rotate')
    
    def get_api_key_usage(self, key_id: str, **params) -> dict:
        """Get API key usage"""
        return self._request('GET', f'/auth/apikeys/{key_id}/usage', params=params)
    
    def get_permissions(self) -> dict:
        """Get permissions reference"""
        return self._request('GET', '/auth/permissions')
    
    # ============ Webhooks ============
    
    def list_webhooks(self, **params) -> dict:
        """List webhooks"""
        return self._request('GET', '/webhooks', params=params)
    
    def get_webhook(self, webhook_id: str) -> dict:
        """Get webhook details"""
        return self._request('GET', f'/webhooks/{webhook_id}')
    
    def create_webhook(self, data: dict) -> dict:
        """Create a webhook"""
        return self._request('POST', '/webhooks', data=data)
    
    def update_webhook(self, webhook_id: str, data: dict) -> dict:
        """Update a webhook"""
        return self._request('PUT', f'/webhooks/{webhook_id}', data=data)
    
    def delete_webhook(self, webhook_id: str) -> dict:
        """Delete a webhook"""
        return self._request('DELETE', f'/webhooks/{webhook_id}')
    
    def test_webhook(self, webhook_id: str) -> dict:
        """Test a webhook"""
        return self._request('POST', f'/webhooks/{webhook_id}/test')
    
    def get_webhook_deliveries(self, webhook_id: str, **params) -> dict:
        """Get webhook deliveries"""
        return self._request('GET', f'/webhooks/{webhook_id}/deliveries', params=params)
    
    def get_delivery(self, webhook_id: str, delivery_id: str) -> dict:
        """Get specific delivery"""
        return self._request('GET', f'/webhooks/{webhook_id}/deliveries/{delivery_id}')
    
    def get_webhook_events(self) -> dict:
        """Get available webhook events"""
        return self._request('GET', '/webhooks/events/list')
    
    # ============ Utility ============
    
    def health(self) -> dict:
        """Check API health"""
        return self._request('GET', '/health')
