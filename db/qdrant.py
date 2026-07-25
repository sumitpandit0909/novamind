from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

# Attempt to connect to local Qdrant server, fallback to local file database if not running
try:
    client = QdrantClient(url='http://localhost:6333', timeout=2)
    # Ping to check if server is active
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
                distance= Distance.COSINE
            )
        )