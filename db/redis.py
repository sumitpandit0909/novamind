from redis import Redis
import json
from config.config import settings

redis_client = Redis.from_url(settings.REDIS_URL or "redis://localhost:6379")


def add_message(session_id:str,role:str,content:str):
    key = f"memory:{session_id}"
    mssg = json.dumps({"role":role,"content":content})
    redis_client.rpush(key,mssg)
    redis_client.expire(key,60*60*24)

def get_history(session_id:str,limit:int=10):
    key=f"memory:{session_id}"
    chat_history = redis_client.lrange(key,0,limit-1)
    return [json.loads(mssg) for mssg in chat_history]



