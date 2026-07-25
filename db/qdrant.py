from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from config.config import settings

# Use cloud Qdrant from settings, fallback to local if not configured
QDRANT_URL = settings.QDRANT_URL
QDRANT_API_KEY = settings.QDRANT_API_KEY

if QDRANT_URL and QDRANT_URL != "http://localhost:6333":
    # Cloud Qdrant
    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY if QDRANT_API_KEY else None
    )
    print(f"Connected to cloud Qdrant at {QDRANT_URL}")
else:
    # Attempt to connect to local Qdrant server, fallback to local file database
    try:
        client = QdrantClient(url='http://localhost:6333', timeout=2)
        client.get_collections()
        print("Successfully connected to Qdrant server at http://localhost:6333")
    except Exception:
        print("Qdrant server not running at http://localhost:6333. Falling back to local disk storage ('local_qdrant_db').")
        client = QdrantClient(path="local_qdrant_db")

def collection_db():
    if not client.collection_exists("document"):
        client.create_collection(
            collection_name="document",
            vectors_config=VectorParams(
                size=786,
                distance=Distance.COSINE
            )
        )