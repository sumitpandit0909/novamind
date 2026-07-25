from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    REDIS_URL:str
    OPENROUTER_API_KEY:str

    class Config:
        env_file = ".env"

settings = Settings()