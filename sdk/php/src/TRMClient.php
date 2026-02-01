<?php

namespace TRM;

use Exception;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

/**
 * TRM PHP SDK
 * Official SDK for The Referral Marketplace API
 */
class TRMClient
{
    private $apiKey;
    private $baseURL;
    private $client;
    private $maxRetries;
    private $retryDelay;

    public function __construct(string $apiKey, array $options = [])
    {
        $this->apiKey = $apiKey;
        $this->baseURL = $options['baseURL'] ?? 'https://api.trm.com/v1';
        $this->maxRetries = $options['maxRetries'] ?? 3;
        $this->retryDelay = $options['retryDelay'] ?? 1000;

        $this->client = new Client([
            'base_uri' => $this->baseURL,
            'timeout' => $options['timeout'] ?? 30,
            'headers' => [
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
                'User-Agent' => 'TRM-PHP-SDK/1.0.0'
            ]
        ]);
    }

    /**
     * Make an API request with retry logic
     */
    private function request(string $method, string $endpoint, array $data = null, array $params = null): array
    {
        $options = [];
        
        if ($data) {
            $options['json'] = $data;
        }
        
        if ($params) {
            $options['query'] = $params;
        }

        $lastError = null;
        
        for ($attempt = 0; $attempt < $this->maxRetries; $attempt++) {
            try {
                $response = $this->client->request($method, $endpoint, $options);
                $body = json_decode($response->getBody()->getContents(), true);
                
                return $body;
            } catch (RequestException $e) {
                $lastError = $e;
                
                if ($e->hasResponse()) {
                    $statusCode = $e->getResponse()->getStatusCode();
                    
                    // Don't retry on client errors
                    if ($statusCode >= 400 && $statusCode < 500) {
                        throw $this->createError($e);
                    }
                }
                
                // Wait before retry
                if ($attempt < $this->maxRetries - 1) {
                    usleep($this->retryDelay * pow(2, $attempt) * 1000);
                }
            }
        }
        
        throw $this->createError($lastError);
    }

    /**
     * Create TRMError from exception
     */
    private function createError(RequestException $e): TRMError
    {
        $response = $e->getResponse();
        $statusCode = $response ? $response->getStatusCode() : 0;
        $body = [];
        
        if ($response) {
            $body = json_decode($response->getBody()->getContents(), true) ?? [];
        }
        
        return new TRMError(
            $body['error']['message'] ?? $e->getMessage(),
            $body['error']['code'] ?? 'unknown_error',
            $body['error']['type'] ?? 'api_error',
            $statusCode,
            $body
        );
    }

    // ============ Jobs ============

    public function listJobs(array $params = []): array
    {
        return $this->request('GET', '/jobs', null, $params);
    }

    public function getJob(string $jobId): array
    {
        return $this->request('GET', "/jobs/{$jobId}");
    }

    public function createJob(array $data): array
    {
        return $this->request('POST', '/jobs', $data);
    }

    public function updateJob(string $jobId, array $data): array
    {
        return $this->request('PUT', "/jobs/{$jobId}", $data);
    }

    public function deleteJob(string $jobId): array
    {
        return $this->request('DELETE', "/jobs/{$jobId}");
    }

    public function getRelatedJobs(string $jobId, array $params = []): array
    {
        return $this->request('GET', "/jobs/{$jobId}/related", null, $params);
    }

    // ============ Referrals ============

    public function listReferrals(array $params = []): array
    {
        return $this->request('GET', '/referrals', null, $params);
    }

    public function getReferral(string $referralId): array
    {
        return $this->request('GET', "/referrals/{$referralId}");
    }

    public function createReferral(array $data): array
    {
        return $this->request('POST', '/referrals', $data);
    }

    public function updateReferralStatus(string $referralId, string $status, string $notes = null): array
    {
        $data = ['status' => $status];
        if ($notes) {
            $data['notes'] = $notes;
        }
        return $this->request('PATCH', "/referrals/{$referralId}/status", $data);
    }

    public function getReferralTracking(string $referralId): array
    {
        return $this->request('GET', "/referrals/{$referralId}/tracking");
    }

    // ============ Companies ============

    public function listCompanies(array $params = []): array
    {
        return $this->request('GET', '/companies', null, $params);
    }

    public function getCompany(string $companyId): array
    {
        return $this->request('GET', "/companies/{$companyId}");
    }

    public function getCompanyJobs(string $companyId, array $params = []): array
    {
        return $this->request('GET', "/companies/{$companyId}/jobs", null, $params);
    }

    public function createCompany(array $data): array
    {
        return $this->request('POST', '/companies', $data);
    }

    public function updateCompany(string $companyId, array $data): array
    {
        return $this->request('PUT', "/companies/{$companyId}", $data);
    }

    // ============ Users ============

    public function getCurrentUser(): array
    {
        return $this->request('GET', '/users/me');
    }

    public function updateCurrentUser(array $data): array
    {
        return $this->request('PUT', '/users/me', $data);
    }

    public function getCurrentUserReferrals(array $params = []): array
    {
        return $this->request('GET', '/users/me/referrals', null, $params);
    }

    public function getCurrentUserStats(): array
    {
        return $this->request('GET', '/users/me/stats');
    }

    public function getUser(string $userId): array
    {
        return $this->request('GET', "/users/{$userId}");
    }

    // ============ Auth ============

    public function verifyKey(): array
    {
        return $this->request('POST', '/auth/verify');
    }

    public function listAPIKeys(): array
    {
        return $this->request('GET', '/auth/apikeys');
    }

    public function getAPIKey(string $keyId): array
    {
        return $this->request('GET', "/auth/apikeys/{$keyId}");
    }

    public function createAPIKey(array $data): array
    {
        return $this->request('POST', '/auth/apikey', $data);
    }

    public function updateAPIKey(string $keyId, array $data): array
    {
        return $this->request('PUT', "/auth/apikeys/{$keyId}", $data);
    }

    public function revokeAPIKey(string $keyId, string $reason = null): array
    {
        $data = $reason ? ['reason' => $reason] : [];
        return $this->request('DELETE', "/auth/apikeys/{$keyId}", $data);
    }

    public function rotateAPIKey(string $keyId): array
    {
        return $this->request('POST', "/auth/apikeys/{$keyId}/rotate");
    }

    public function getAPIKeyUsage(string $keyId, array $params = []): array
    {
        return $this->request('GET', "/auth/apikeys/{$keyId}/usage", null, $params);
    }

    public function getPermissions(): array
    {
        return $this->request('GET', '/auth/permissions');
    }

    // ============ Webhooks ============

    public function listWebhooks(array $params = []): array
    {
        return $this->request('GET', '/webhooks', null, $params);
    }

    public function getWebhook(string $webhookId): array
    {
        return $this->request('GET', "/webhooks/{$webhookId}");
    }

    public function createWebhook(array $data): array
    {
        return $this->request('POST', '/webhooks', $data);
    }

    public function updateWebhook(string $webhookId, array $data): array
    {
        return $this->request('PUT', "/webhooks/{$webhookId}", $data);
    }

    public function deleteWebhook(string $webhookId): array
    {
        return $this->request('DELETE', "/webhooks/{$webhookId}");
    }

    public function testWebhook(string $webhookId): array
    {
        return $this->request('POST', "/webhooks/{$webhookId}/test");
    }

    public function getWebhookDeliveries(string $webhookId, array $params = []): array
    {
        return $this->request('GET', "/webhooks/{$webhookId}/deliveries", null, $params);
    }

    public function getDelivery(string $webhookId, string $deliveryId): array
    {
        return $this->request('GET', "/webhooks/{$webhookId}/deliveries/{$deliveryId}");
    }

    public function getWebhookEvents(): array
    {
        return $this->request('GET', '/webhooks/events/list');
    }

    // ============ Utility ============

    public function health(): array
    {
        return $this->request('GET', '/health');
    }
}

/**
 * TRM Error Exception
 */
class TRMError extends Exception
{
    public $code;
    public $errorType;
    public $statusCode;
    public $response;

    public function __construct(string $message, string $code, string $errorType, int $statusCode, array $response)
    {
        parent::__construct($message);
        $this->code = $code;
        $this->errorType = $errorType;
        $this->statusCode = $statusCode;
        $this->response = $response;
    }
}
