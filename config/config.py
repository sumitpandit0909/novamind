from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    REDIS_URL:str = "redis://localhost:6379"
    OPENROUTER_API_KEY:str
    QDRANT_URL:str = "http://localhost:6333"
    QDRANT_API_KEY:str = ""

    class Config:
        env_file = ".env"

settings = Settings()