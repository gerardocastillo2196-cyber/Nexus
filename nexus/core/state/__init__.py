"""core/state/__init__.py — Re-exportaciones backward-compatible del módulo de estado de Jellyfish."""

from core.state.blackboard import Blackboard
from core.state.persistence import (
    connect_db, _connect_db, PersistedSet, PersistedHistoryList, save_state_var, get_state_var
)
from core.state.core import (
    JellyfishState, get_term_width, get_term_height,
    _CHARS_PER_TOKEN, _MODEL_TOKEN_LIMIT, _HISTORY_CHAR_BUDGET, _SLIDING_WINDOW_MAX_MESSAGES,
    _llm_busy,
)
from core.project_manager import cleanup_lock
_cleanup_lock = cleanup_lock

# Exportar también constantes de config
from core.config import (
    AGENCY_DIR, MODEL, OLLAMA_URL, DB_PATH, PLUGINS_DIR, PROVIDER,
    OPENAI_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY,
    DASHSCOPE_API_KEY, KIMI_API_KEY, ZHIPU_API_KEY, RELEVANCE_THRESHOLD,
    EMBED_MODEL, ACTIVE_PROJECT, PROVIDER_CONFIGS, normalize_provider, supported_provider_names,
    estimate_tokens, load_config_from_env, save_config_to_env, _xml_attr,
)

__all__ = [
    "JellyfishState", "Blackboard", "PersistedSet", "PersistedHistoryList",
    "connect_db", "_connect_db", "save_state_var", "get_state_var",
    "get_term_width", "get_term_height", "_CHARS_PER_TOKEN", "_MODEL_TOKEN_LIMIT",
    "_HISTORY_CHAR_BUDGET", "_SLIDING_WINDOW_MAX_MESSAGES", "_cleanup_lock", "_llm_busy",
    "AGENCY_DIR", "MODEL", "OLLAMA_URL",
    "DB_PATH", "PLUGINS_DIR", "PROVIDER", "OPENAI_API_KEY", "DEEPSEEK_API_KEY",
    "OPENROUTER_API_KEY", "GEMINI_API_KEY", "DASHSCOPE_API_KEY", "KIMI_API_KEY",
    "ZHIPU_API_KEY", "RELEVANCE_THRESHOLD", "EMBED_MODEL", "ACTIVE_PROJECT", "PROVIDER_CONFIGS",
    "normalize_provider", "supported_provider_names", "estimate_tokens",
    "load_config_from_env", "save_config_to_env", "_xml_attr",
]
