"""
Webhook Handler for TRM
"""

import hmac
import hashlib
import json
from typing import Callable, Dict, Any
from flask import Request


class WebhookHandler:
    """Handle TRM webhooks"""
    
    def __init__(self, secret: str):
        self.secret = secret
        self.handlers: Dict[str, Callable] = {}
    
    def on(self, event: str, handler: Callable):
        """Register an event handler"""
        self.handlers[event] = handler
        return self
    
    def verify_signature(self, payload: bytes, signature: str, timestamp: str) -> bool:
        """Verify webhook signature"""
        try:
            signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
            expected = hmac.new(
                self.secret.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Extract version from signature (e.g., "v1=signature")
            if '=' in signature:
                _, provided = signature.split('=', 1)
            else:
                provided = signature
            
            return hmac.compare_digest(provided, expected)
        except Exception:
            return False
    
    def handle(self, request: Request) -> Dict[str, Any]:
        """Handle incoming webhook request"""
        # Get headers
        signature = request.headers.get('X-TRM-Signature')
        timestamp = request.headers.get('X-TRM-Timestamp')
        event = request.headers.get('X-TRM-Event')
        
        if not all([signature, timestamp, event]):
            return {'error': 'Missing required headers'}
        
        # Get payload
        payload = request.get_data()
        
        # Verify signature
        if not self.verify_signature(payload, signature, timestamp):
            return {'error': 'Invalid signature'}
        
        # Parse payload
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            return {'error': 'Invalid JSON payload'}
        
        # Call handler
        handler = self.handlers.get(event)
        if handler:
            try:
                result = handler(data)
                return {'success': True, 'result': result}
            except Exception as e:
                return {'error': str(e)}
        
        return {'success': True, 'message': 'No handler for event'}
    
    def handle_raw(self, headers: dict, body: bytes) -> Dict[str, Any]:
        """Handle webhook with raw headers and body"""
        signature = headers.get('X-TRM-Signature')
        timestamp = headers.get('X-TRM-Timestamp')
        event = headers.get('X-TRM-Event')
        
        if not all([signature, timestamp, event]):
            return {'error': 'Missing required headers'}
        
        if not self.verify_signature(body, signature, timestamp):
            return {'error': 'Invalid signature'}
        
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return {'error': 'Invalid JSON payload'}
        
        handler = self.handlers.get(event)
        if handler:
            try:
                result = handler(data)
                return {'success': True, 'result': result}
            except Exception as e:
                return {'error': str(e)}
        
        return {'success': True, 'message': 'No handler for event'}
