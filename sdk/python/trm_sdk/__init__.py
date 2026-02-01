"""
TRM Python SDK
Official SDK for The Referral Marketplace API
"""

from .client import TRMClient, TRMError
from .webhooks import WebhookHandler

__version__ = "1.0.0"
__all__ = ["TRMClient", "TRMError", "WebhookHandler"]
