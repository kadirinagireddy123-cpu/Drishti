"""Environment configuration loader for Drishti backend."""
import os
from dotenv import load_dotenv

# Load .env file from the backend directory
_env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=_env_path)


class Config:
    """Centralised environment config."""

    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "5000"))
    CORS_ORIGIN: str = os.getenv("CORS_ORIGIN", "*")
    NODE_ENV: str = os.getenv("NODE_ENV", "development")

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    PRIMARY_MODEL: str = os.getenv("GEMINI_PRIMARY_MODEL", "gemini-2.5-flash")
    FALLBACK_MODEL: str = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-1.5-flash")
    TTS_MODEL: str = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash")
    MAX_BODY_SIZE: str = os.getenv("MAX_BODY_SIZE", "30mb")

    @property
    def is_demo_mode(self) -> bool:
        return not bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip())


config = Config()

