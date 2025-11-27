"""
Configuration dataclasses for fetch_proxy_dispatcher.

Uses standard library dataclasses for configuration models.
"""
from dataclasses import dataclass
from typing import Optional, Dict, Any, Union, Literal, TYPE_CHECKING

if TYPE_CHECKING:
    import httpx

# Type aliases
AppEnv = Literal["DEV", "STAGE", "QA", "PROD"]
ClientType = Literal["dev", "stay_alive", "do_not_stay_alive"]


@dataclass
class ProxyConfig:
    """Resolved proxy configuration."""
    proxy_url: Optional[str] = None
    verify_ssl: bool = False
    timeout: float = 30.0
    trust_env: bool = False  # We handle env ourselves
    cert: Optional[Union[str, tuple]] = None  # Client cert: path or (cert, key) tuple
    ca_bundle: Optional[str] = None  # CA bundle path for SSL verification


@dataclass
class ProxyUrlConfig:
    """Per-environment proxy URLs."""
    DEV: Optional[str] = None
    STAGE: Optional[str] = None
    QA: Optional[str] = None
    PROD: Optional[str] = None


@dataclass
class AgentProxyConfig:
    """Agent proxy override configuration."""
    http_proxy: Optional[str] = None
    https_proxy: Optional[str] = None


@dataclass
class FactoryConfig:
    """Configuration for ProxyDispatcherFactory."""
    proxy_urls: Optional[ProxyUrlConfig] = None
    agent_proxy: Optional[AgentProxyConfig] = None
    default_environment: Optional[AppEnv] = None
    cert: Optional[Union[str, tuple]] = None  # Client cert: path or (cert, key) tuple
    ca_bundle: Optional[str] = None  # CA bundle path for SSL verification


@dataclass
class DispatcherResult:
    """
    Result containing client and configuration.

    Attributes:
        client: Configured httpx.Client or httpx.AsyncClient
        config: The ProxyConfig used to create the client
        proxy_dict: Raw kwargs dict for manual client creation
    """
    client: Union["httpx.Client", "httpx.AsyncClient"]
    config: ProxyConfig
    proxy_dict: Dict[str, Any]
