from services.create_embeddings import create_embeddings
from services.parse_documents import parse_document
from db.qdrant import client

from uuid import uuid4
from qdrant_client.models import PointStruct




def create_points(file_path, user_id, session_id):
    text = parse_document(file_path)
    
    # Step 1: Chunk the text
    chunks = []
    chunk_size = 500
    for i in range(0, len(text), chunk_size):
        chunks.append((text[i:i+chunk_size], i))
        
    if not chunks:
        return []
        
    # Step 2: Get embeddings for all chunks in batch
    chunk_texts = [c[0] for c in chunks]
    embeddings = create_embeddings(chunk_texts)
    
    # Step 3: Build the points list
    points = []
    for (chunk_text, page_number), vector in zip(chunks, embeddings):
        points.append(
            PointStruct(
                id=str(uuid4()),
                vector=vector,
                payload={
                    "source": file_path,
                    "text": chunk_text,
                    "page_number": page_number,
                    "user_id": user_id,
                    "session_id": session_id
                }
            )
        )
    return points


def upload_points(points):
    client.upsert(
        collection_name="document",
        points=points
    )


def search_points(query, session_id=None):
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    
    query_filter = None
    if session_id:
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="session_id",
                    match=MatchValue(value=session_id)
                )
            ]
        )

    response = client.query_points(
        collection_name="document",
        query=create_embeddings(query),
        query_filter=query_filter,
        limit= 3
    )
    result=""
    for point in response.points:
        result += point.payload["text"]
        result += "\n\n"

    return result
    