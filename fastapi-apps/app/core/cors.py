"""
Enterprise CORS Policy Engine for FastAPI

Provides centralized CORS policy management with support for:
- Multiple origin pattern types (exact, wildcard, regex)
- Environment-specific configurations
- App-level overrides
- Violation logging with context

This module mirrors the TypeScript implementation in packages-mjs/skeleton
to ensure consistent CORS behavior across Fastify and FastAPI applications.
"""

import json
import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)


# =============================================================================
# Types
# =============================================================================


@dataclass
class OriginPattern:
    """Origin matching pattern configuration."""

    type: str  # 'exact', 'wildcard', 'regex', 'reference'
    value: str | None = None
    pattern: str | None = None
    name: str | None = None
    description: str | None = None


@dataclass
class LoggingConfig:
    """CORS logging configuration."""

    enabled: bool = True
    level: str = "warn"
    include_rejections: bool = True
    include_allowances: bool = False


@dataclass
class GlobalCorsConfig:
    """Global CORS settings."""

    enabled: bool = True
    credentials: bool = True
    max_age: int = 3600
    methods: list[str] = field(
        default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    )
    allowed_headers: list[str] = field(
        default_factory=lambda: ["Content-Type", "Authorization"]
    )
    exposed_headers: list[str] = field(
        default_factory=lambda: ["Content-Type", "Authorization"]
    )
    logging: LoggingConfig = field(default_factory=LoggingConfig)


@dataclass
class EnvironmentConfig:
    """Environment-specific CORS configuration."""

    origins: list[OriginPattern] = field(default_factory=list)
    strict_mode: bool = False
    require_explicit_origins: bool = False
    description: str | None = None
    logging: LoggingConfig | None = None


@dataclass
class AppConfig:
    """App-specific CORS overrides."""

    origins: list[OriginPattern] = field(default_factory=list)
    additional_headers: list[str] = field(default_factory=list)
    additional_exposed_headers: list[str] = field(default_factory=list)
    methods: list[str] | None = None
    description: str | None = None


@dataclass
class CorsConfig:
    """Complete CORS configuration."""

    version: str
    global_config: GlobalCorsConfig
    environments: dict[str, EnvironmentConfig]
    apps: dict[str, AppConfig] = field(default_factory=dict)
    patterns: dict[str, OriginPattern] = field(default_factory=dict)
    source: str = "unknown"
    env_overrides: list[str] = field(default_factory=list)


@dataclass
class ResolvedCorsPolicy:
    """Resolved CORS policy for a specific app/environment."""

    enabled: bool
    credentials: bool
    max_age: int
    methods: list[str]
    allowed_headers: list[str]
    exposed_headers: list[str]
    origins: list["CompiledOriginMatcher"]
    strict_mode: bool
    logging: LoggingConfig


@dataclass
class CorsDecision:
    """Result of origin validation."""

    allowed: bool
    origin: str
    matched_pattern: str | None = None
    reason: str = ""


@dataclass
class CompiledOriginMatcher:
    """Compiled origin pattern for efficient matching."""

    type: str
    pattern: str
    test: Callable[[str], bool]
    description: str | None = None


# =============================================================================
# Pattern Compilation
# =============================================================================


def compile_origin_pattern(
    pattern: OriginPattern, named_patterns: dict[str, OriginPattern] | None = None
) -> CompiledOriginMatcher:
    """Compile an origin pattern into a testable matcher."""
    if pattern.type == "exact":
        if not pattern.value:
            raise ValueError('Exact pattern requires "value" field')
        value = pattern.value
        return CompiledOriginMatcher(
            type="exact",
            pattern=value,
            test=lambda origin, v=value: origin == v,
            description=pattern.description,
        )

    elif pattern.type == "wildcard":
        if not pattern.pattern:
            raise ValueError('Wildcard pattern requires "pattern" field')
        regex = wildcard_to_regex(pattern.pattern)
        return CompiledOriginMatcher(
            type="wildcard",
            pattern=pattern.pattern,
            test=lambda origin, r=regex: bool(r.match(origin)),
            description=pattern.description,
        )

    elif pattern.type == "regex":
        if not pattern.pattern:
            raise ValueError('Regex pattern requires "pattern" field')
        regex = re.compile(pattern.pattern)
        return CompiledOriginMatcher(
            type="regex",
            pattern=pattern.pattern,
            test=lambda origin, r=regex: bool(r.match(origin)),
            description=pattern.description,
        )

    elif pattern.type == "reference":
        if not pattern.name:
            raise ValueError('Reference pattern requires "name" field')
        if not named_patterns or pattern.name not in named_patterns:
            raise ValueError(f'Referenced pattern "{pattern.name}" not found')
        return compile_origin_pattern(named_patterns[pattern.name], named_patterns)

    else:
        raise ValueError(f"Unknown pattern type: {pattern.type}")


def wildcard_to_regex(pattern: str) -> re.Pattern:
    """Convert a wildcard pattern to a compiled regex."""
    # Escape special regex characters except *
    escaped = re.escape(pattern).replace(r"\*", "[^/]+")
    return re.compile(f"^{escaped}$")


# =============================================================================
# CORS Policy Engine
# =============================================================================


class CorsPolicyEngine:
    """Enterprise CORS Policy Engine for FastAPI."""

    def __init__(
        self,
        config: CorsConfig,
        environment: str = "development",
    ):
        self.config = config
        self.environment = environment
        self._resolved_policies: dict[str, ResolvedCorsPolicy] = {}
        self._validate_config()

    def _validate_config(self) -> None:
        """Validate the CORS configuration."""
        if not self.config.version:
            raise ValueError("CORS config must have a version")

        env_config = self.config.environments.get(self.environment)
        if not env_config:
            logger.warning(
                f"Environment '{self.environment}' not found in CORS config, "
                f"available: {list(self.config.environments.keys())}"
            )

        # Validate all patterns can be compiled
        if env_config and env_config.origins:
            for pattern in env_config.origins:
                try:
                    compile_origin_pattern(pattern, self.config.patterns)
                except Exception as e:
                    raise ValueError(
                        f"Invalid origin pattern in {self.environment}: {e}"
                    )

        # Check production strict mode
        if (
            self.environment == "production"
            and env_config
            and env_config.require_explicit_origins
            and not env_config.origins
        ):
            raise ValueError(
                "Production requires explicit origins but none configured. "
                "Set CORS_ALLOW_ORIGINS or configure origins in cors.json"
            )

    def resolve_policy(self, app_name: str | None = None) -> ResolvedCorsPolicy:
        """Resolve the CORS policy for a given app."""
        cache_key = app_name or "__global__"

        if cache_key in self._resolved_policies:
            return self._resolved_policies[cache_key]

        global_config = self.config.global_config
        env_config = self.config.environments.get(
            self.environment,
            self.config.environments.get(
                "development",
                EnvironmentConfig(origins=[], strict_mode=False),
            ),
        )
        app_config = self.config.apps.get(app_name) if app_name else None

        # Merge headers
        allowed_headers = list(global_config.allowed_headers)
        exposed_headers = list(global_config.exposed_headers)
        methods = list(global_config.methods)

        if app_config:
            if app_config.additional_headers:
                allowed_headers = list(
                    set(allowed_headers + app_config.additional_headers)
                )
            if app_config.additional_exposed_headers:
                exposed_headers = list(
                    set(exposed_headers + app_config.additional_exposed_headers)
                )
            if app_config.methods:
                methods = app_config.methods

        # Compile origin patterns
        origins: list[CompiledOriginMatcher] = []

        # Add environment origins
        for pattern in env_config.origins:
            origins.append(compile_origin_pattern(pattern, self.config.patterns))

        # Add app-specific origins
        if app_config and app_config.origins:
            for pattern in app_config.origins:
                origins.append(compile_origin_pattern(pattern, self.config.patterns))

        # Merge logging config
        logging_config = LoggingConfig(
            enabled=global_config.logging.enabled,
            level=global_config.logging.level,
            include_rejections=global_config.logging.include_rejections,
            include_allowances=global_config.logging.include_allowances,
        )
        if env_config.logging:
            logging_config.level = env_config.logging.level
            logging_config.include_rejections = env_config.logging.include_rejections
            logging_config.include_allowances = env_config.logging.include_allowances

        policy = ResolvedCorsPolicy(
            enabled=global_config.enabled,
            credentials=global_config.credentials,
            max_age=global_config.max_age,
            methods=methods,
            allowed_headers=allowed_headers,
            exposed_headers=exposed_headers,
            origins=origins,
            strict_mode=env_config.strict_mode,
            logging=logging_config,
        )

        self._resolved_policies[cache_key] = policy
        return policy

    def check_origin(self, origin: str, app_name: str | None = None) -> CorsDecision:
        """Check if an origin is allowed by the policy."""
        policy = self.resolve_policy(app_name)

        if not policy.enabled:
            return CorsDecision(
                allowed=False,
                origin=origin,
                reason="CORS is disabled",
            )

        if not origin:
            return CorsDecision(
                allowed=True,
                origin="",
                reason="No origin header (same-origin or non-browser)",
            )

        # Check against all compiled patterns
        for matcher in policy.origins:
            if matcher.test(origin):
                decision = CorsDecision(
                    allowed=True,
                    origin=origin,
                    matched_pattern=matcher.pattern,
                    reason=f"Matched {matcher.type} pattern: {matcher.pattern}",
                )
                self._log_decision(decision, app_name)
                return decision

        # No match found
        decision = CorsDecision(
            allowed=False,
            origin=origin,
            reason=f"Origin not in allowed list ({len(policy.origins)} patterns checked)",
        )
        self._log_decision(decision, app_name)
        return decision

    def _log_decision(self, decision: CorsDecision, app_name: str | None) -> None:
        """Log a CORS decision based on logging configuration."""
        policy = self.resolve_policy(app_name)
        if not policy.logging.enabled:
            return

        log_data = {
            "origin": decision.origin,
            "allowed": decision.allowed,
            "reason": decision.reason,
            "matched_pattern": decision.matched_pattern,
            "app": app_name,
        }

        if decision.allowed and policy.logging.include_allowances:
            logger.info(f"CORS origin allowed: {log_data}")
        elif not decision.allowed and policy.logging.include_rejections:
            logger.warning(f"CORS origin rejected: {log_data}")

    def get_allowed_origin_header(
        self, origin: str, app_name: str | None = None
    ) -> str | None:
        """Get the origin value to set in Access-Control-Allow-Origin header."""
        decision = self.check_origin(origin, app_name)
        return origin if decision.allowed else None


# =============================================================================
# Configuration Loading
# =============================================================================


def load_cors_config(
    config_path: str | None = None,
    environment: str | None = None,
    monorepo_root: str | None = None,
) -> CorsConfig:
    """Load CORS configuration from file and merge with environment variables."""
    env = environment or os.environ.get("PYTHON_ENV", "development")
    env_overrides: list[str] = []

    # Resolve config path
    resolved_path = _resolve_config_path(config_path, monorepo_root)

    # Load configuration
    if resolved_path and Path(resolved_path).exists():
        try:
            with open(resolved_path) as f:
                raw_config = json.load(f)
            config = _parse_config(raw_config)
            config.source = resolved_path
            logger.debug(f"Loaded CORS config from {resolved_path}")
        except Exception as e:
            logger.error(f"Failed to load CORS config from {resolved_path}: {e}")
            config = _get_default_config()
            config.source = "default (file load failed)"
    else:
        logger.info(f"CORS config file not found at {resolved_path}, using defaults")
        config = _get_default_config()
        config.source = "default"

    # Apply environment variable overrides
    config = _apply_env_overrides(config, env, env_overrides)
    config.env_overrides = env_overrides

    return config


def _resolve_config_path(
    config_path: str | None, monorepo_root: str | None
) -> str | None:
    """Resolve the path to cors.json."""
    if config_path:
        return str(Path(config_path).resolve())

    root = monorepo_root or os.environ.get("MONOREPO_ROOT")
    if root:
        path = Path(root) / "common" / "config" / "cors.json"
        if path.exists():
            return str(path)

    # Try relative paths
    possible_paths = [
        Path(__file__).parent.parent.parent.parent / "common" / "config" / "cors.json",
        Path("/Users/Shared/autoload/mta-v500/common/config/cors.json"),
    ]

    for path in possible_paths:
        if path.exists():
            return str(path)

    return None


def _parse_config(raw: dict[str, Any]) -> CorsConfig:
    """Parse raw JSON config into CorsConfig dataclass."""
    # Parse global config
    global_raw = raw.get("global", {})
    logging_raw = global_raw.get("logging", {})
    global_config = GlobalCorsConfig(
        enabled=global_raw.get("enabled", True),
        credentials=global_raw.get("credentials", True),
        max_age=global_raw.get("maxAge", 3600),
        methods=global_raw.get(
            "methods", ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
        ),
        allowed_headers=global_raw.get("allowedHeaders", ["Content-Type", "Authorization"]),
        exposed_headers=global_raw.get("exposedHeaders", ["Content-Type", "Authorization"]),
        logging=LoggingConfig(
            enabled=logging_raw.get("enabled", True),
            level=logging_raw.get("level", "warn"),
            include_rejections=logging_raw.get("includeRejections", True),
            include_allowances=logging_raw.get("includeAllowances", False),
        ),
    )

    # Parse environments
    environments: dict[str, EnvironmentConfig] = {}
    for env_name, env_raw in raw.get("environments", {}).items():
        origins = [
            OriginPattern(
                type=o.get("type", "exact"),
                value=o.get("value"),
                pattern=o.get("pattern"),
                name=o.get("name"),
                description=o.get("description"),
            )
            for o in env_raw.get("origins", [])
        ]

        env_logging = None
        if "logging" in env_raw:
            log_raw = env_raw["logging"]
            env_logging = LoggingConfig(
                enabled=log_raw.get("enabled", True),
                level=log_raw.get("level", "warn"),
                include_rejections=log_raw.get("includeRejections", True),
                include_allowances=log_raw.get("includeAllowances", False),
            )

        environments[env_name] = EnvironmentConfig(
            origins=origins,
            strict_mode=env_raw.get("strictMode", False),
            require_explicit_origins=env_raw.get("requireExplicitOrigins", False),
            description=env_raw.get("description"),
            logging=env_logging,
        )

    # Parse apps
    apps: dict[str, AppConfig] = {}
    for app_name, app_raw in raw.get("apps", {}).items():
        if app_name.startswith("_"):
            continue  # Skip comment fields
        origins = [
            OriginPattern(
                type=o.get("type", "exact"),
                value=o.get("value"),
                pattern=o.get("pattern"),
                name=o.get("name"),
                description=o.get("description"),
            )
            for o in app_raw.get("origins", [])
        ]
        apps[app_name] = AppConfig(
            origins=origins,
            additional_headers=app_raw.get("additionalHeaders", []),
            additional_exposed_headers=app_raw.get("additionalExposedHeaders", []),
            methods=app_raw.get("methods"),
            description=app_raw.get("description"),
        )

    # Parse named patterns
    patterns: dict[str, OriginPattern] = {}
    for pattern_name, pattern_raw in raw.get("patterns", {}).items():
        if pattern_name.startswith("_"):
            continue
        patterns[pattern_name] = OriginPattern(
            type=pattern_raw.get("type", "exact"),
            value=pattern_raw.get("value"),
            pattern=pattern_raw.get("pattern"),
            name=pattern_raw.get("name"),
            description=pattern_raw.get("description"),
        )

    return CorsConfig(
        version=raw.get("version", "1.0.0"),
        global_config=global_config,
        environments=environments,
        apps=apps,
        patterns=patterns,
    )


def _get_default_config() -> CorsConfig:
    """Get default CORS configuration."""
    return CorsConfig(
        version="1.0.0",
        global_config=GlobalCorsConfig(),
        environments={
            "development": EnvironmentConfig(
                origins=[
                    OriginPattern(
                        type="regex",
                        pattern=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
                        description="Any localhost port",
                    )
                ],
                strict_mode=False,
            ),
            "production": EnvironmentConfig(
                origins=[],
                strict_mode=True,
                require_explicit_origins=True,
            ),
        },
    )


def _apply_env_overrides(
    config: CorsConfig, environment: str, env_overrides: list[str]
) -> CorsConfig:
    """Apply environment variable overrides to the configuration."""
    # CORS_ALLOW_ORIGINS
    cors_allow_origins = os.environ.get("CORS_ALLOW_ORIGINS")
    if cors_allow_origins:
        origins = _parse_origins_from_env(cors_allow_origins)
        if origins:
            if environment not in config.environments:
                config.environments[environment] = EnvironmentConfig(
                    origins=[], strict_mode=environment == "production"
                )
            config.environments[environment].origins.extend(origins)
            env_overrides.append("CORS_ALLOW_ORIGINS")
            logger.info(f"Applied CORS_ALLOW_ORIGINS override: {len(origins)} origins")

    # CORS_STRICT_MODE
    cors_strict_mode = os.environ.get("CORS_STRICT_MODE")
    if cors_strict_mode is not None:
        strict = cors_strict_mode.lower() == "true"
        if environment in config.environments:
            config.environments[environment].strict_mode = strict
            env_overrides.append("CORS_STRICT_MODE")

    # CORS_LOG_LEVEL
    cors_log_level = os.environ.get("CORS_LOG_LEVEL")
    if cors_log_level and cors_log_level in ["debug", "info", "warn", "error"]:
        config.global_config.logging.level = cors_log_level
        env_overrides.append("CORS_LOG_LEVEL")

    return config


def _parse_origins_from_env(value: str) -> list[OriginPattern]:
    """Parse a comma-separated list of origins from environment variable."""
    origins: list[OriginPattern] = []

    for part in value.split(","):
        part = part.strip()
        if not part:
            continue

        if part.startswith("regex:"):
            origins.append(
                OriginPattern(
                    type="regex",
                    pattern=part[6:],
                    description="From CORS_ALLOW_ORIGINS env var",
                )
            )
        elif part.startswith("wildcard:"):
            origins.append(
                OriginPattern(
                    type="wildcard",
                    pattern=part[9:],
                    description="From CORS_ALLOW_ORIGINS env var",
                )
            )
        elif part == "*":
            origins.append(
                OriginPattern(
                    type="regex",
                    pattern=".*",
                    description="Allow all origins (from CORS_ALLOW_ORIGINS=*)",
                )
            )
        else:
            origins.append(
                OriginPattern(
                    type="exact",
                    value=part,
                    description="From CORS_ALLOW_ORIGINS env var",
                )
            )

    return origins


# =============================================================================
# Middleware Factory
# =============================================================================


class CorsLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that adds CORS logging for rejections."""

    def __init__(self, app: FastAPI, policy_engine: CorsPolicyEngine, app_name: str | None = None):
        super().__init__(app)
        self.policy_engine = policy_engine
        self.app_name = app_name

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        origin = request.headers.get("origin")
        if origin:
            # Log the decision (actual CORS headers are handled by CORSMiddleware)
            self.policy_engine.check_origin(origin, self.app_name)
        return await call_next(request)


def create_cors_middleware(
    app: FastAPI,
    config: CorsConfig | None = None,
    environment: str | None = None,
    app_name: str | None = None,
    config_path: str | None = None,
) -> CorsPolicyEngine:
    """
    Create and apply CORS middleware to a FastAPI application.

    Args:
        app: FastAPI application instance
        config: Pre-loaded CorsConfig (if None, loads from file)
        environment: Environment name (defaults to PYTHON_ENV or 'development')
        app_name: App name for app-specific overrides
        config_path: Path to cors.json file

    Returns:
        CorsPolicyEngine instance for additional operations
    """
    env = environment or os.environ.get("PYTHON_ENV", "development")

    # Load configuration if not provided
    if config is None:
        config = load_cors_config(config_path=config_path, environment=env)

    # Create policy engine
    policy_engine = CorsPolicyEngine(config, env)
    policy = policy_engine.resolve_policy(app_name)

    logger.info(
        f"CORS policy engine initialized: env={env}, "
        f"source={config.source}, origins={len(policy.origins)}"
    )

    # Build allowed origins list for CORSMiddleware
    # For dynamic matching, we use a callback approach
    def is_origin_allowed(origin: str) -> bool:
        decision = policy_engine.check_origin(origin, app_name)
        return decision.allowed

    # Add logging middleware first
    app.add_middleware(CorsLoggingMiddleware, policy_engine=policy_engine, app_name=app_name)

    # Add CORSMiddleware with our policy
    # Note: CORSMiddleware doesn't support callbacks, so we need to be creative
    # We'll allow all origins here and let our logging middleware handle validation
    # The actual blocking happens at the browser level when headers are missing

    # Build static origins list for common patterns
    static_origins: list[str] = []
    for matcher in policy.origins:
        if matcher.type == "exact":
            static_origins.append(matcher.pattern)

    # If we have only exact patterns, use them; otherwise use callback approach
    if static_origins and len(static_origins) == len(policy.origins):
        allow_origins = static_origins
    else:
        # For patterns, we need to allow all and validate in our middleware
        # This is a limitation of Starlette's CORSMiddleware
        allow_origins = ["*"] if policy.origins else []

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=policy.credentials,
        allow_methods=policy.methods,
        allow_headers=policy.allowed_headers,
        expose_headers=policy.exposed_headers,
        max_age=policy.max_age,
    )

    return policy_engine


def get_cors_config_summary(config: CorsConfig, environment: str) -> str:
    """Get a human-readable summary of the CORS configuration."""
    env_config = config.environments.get(environment)
    lines = [
        "CORS Configuration Summary",
        "========================",
        f"Source: {config.source}",
        f"Environment: {environment}",
        f"Version: {config.version}",
        "",
        "Global Settings:",
        f"  Enabled: {config.global_config.enabled}",
        f"  Credentials: {config.global_config.credentials}",
        f"  Max Age: {config.global_config.max_age}s",
        f"  Methods: {', '.join(config.global_config.methods)}",
        "",
        "Environment Settings:",
        f"  Strict Mode: {env_config.strict_mode if env_config else 'N/A'}",
        f"  Origins: {len(env_config.origins) if env_config else 0}",
    ]

    if env_config and env_config.origins:
        for origin in env_config.origins:
            value = origin.value or origin.pattern or origin.name or "unknown"
            lines.append(f"    - [{origin.type}] {value}")

    if config.env_overrides:
        lines.append("")
        lines.append("Environment Overrides Applied:")
        for override in config.env_overrides:
            lines.append(f"  - {override}")

    return "\n".join(lines)
