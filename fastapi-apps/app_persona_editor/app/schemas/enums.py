"""
Enum definitions for Pydantic schemas.
"""

from enum import Enum


class MemoryScope(str, Enum):
    """Memory scope enumeration"""

    SESSION = "session"
    PERSISTENT = "persistent"


class PersonaRole(str, Enum):
    """Persona role enumeration"""

    ASSISTANT = "assistant"
    ARCHITECT = "architect"
    DEVELOPER = "developer"
    ANALYST = "analyst"


class PersonaTone(str, Enum):
    """Persona tone enumeration"""

    NEUTRAL = "neutral"
    ANALYTICAL = "analytical"
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    CASUAL = "casual"


class PersonaTool(str, Enum):
    """Persona available tools enumeration"""

    WEB_SEARCH = "web-search"
    CODE_GEN = "code-gen"
    ANALYSIS_ENGINE = "analysis-engine"
    DEBUGGER = "debugger"
    TEST_RUNNER = "test-runner"


class PersonaPermission(str, Enum):
    """Persona permissions enumeration"""

    READ_REPO = "read_repo"
    WRITE_CODE = "write_code"
    RUN_TEST = "run_test"
    GENERATE_REPORT = "generate_report"
    ACCESS_DOCS = "access_docs"


class LLMDefaultCategory(str, Enum):
    """LLM default category enumeration"""

    TOOLS = "tools"
    PERMISSIONS = "permissions"
    GOALS = "goals"
    PROMPTS = "prompts"
    TONES = "tones"
    ROLES = "roles"
