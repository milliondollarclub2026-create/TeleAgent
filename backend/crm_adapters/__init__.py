"""
CRM Adapter Factory.
Creates the appropriate adapter based on CRM type and credentials.
"""

from .base import CRMAdapter
from .bitrix_adapter import BitrixAdapter
from .hubspot_adapter import HubSpotAdapter
from .zoho_adapter import ZohoAdapter
from .freshsales_adapter import FreshsalesAdapter


def create_adapter(crm_type: str, credentials: dict, config: dict = None) -> CRMAdapter:
    """
    Factory function to create the appropriate CRM adapter.

    Args:
        crm_type: CRM type string ('bitrix24', 'hubspot', 'zoho', 'freshsales')
        credentials: Decrypted credentials dict from crm_connections table
        config: Optional config dict from crm_connections table

    Returns:
        CRMAdapter instance

    Raises:
        ValueError: If CRM type is not supported
    """
    config = config or {}

    if crm_type == "bitrix24":
        from bitrix_crm import BitrixCRMClient
        webhook_url = credentials.get("webhook_url", "")
        client = BitrixCRMClient(webhook_url)
        return BitrixAdapter(client)

    elif crm_type == "hubspot":
        from hubspot_crm import HubSpotCRM
        client = HubSpotCRM(
            access_token=credentials.get("access_token", ""),
            refresh_token=credentials.get("refresh_token"),
            token_expires_at=credentials.get("token_expires_at"),
        )
        return HubSpotAdapter(client)

    elif crm_type == "zoho":
        from zoho_crm import ZohoCRM
        client = ZohoCRM(
            access_token=credentials.get("access_token", ""),
            refresh_token=credentials.get("refresh_token"),
            datacenter=credentials.get("datacenter", "us"),
            api_domain=credentials.get("api_domain"),
            token_expires_at=credentials.get("token_expires_at"),
        )
        return ZohoAdapter(client)

    elif crm_type == "freshsales":
        from freshsales_crm import FreshsalesCRM
        client = FreshsalesCRM(
            domain=credentials.get("domain", ""),
            api_key=credentials.get("api_key", ""),
        )
        return FreshsalesAdapter(client)

    else:
        raise ValueError(f"Unsupported CRM type: {crm_type}")


__all__ = [
    "CRMAdapter",
    "BitrixAdapter",
    "HubSpotAdapter",
    "ZohoAdapter",
    "FreshsalesAdapter",
    "create_adapter",
]
