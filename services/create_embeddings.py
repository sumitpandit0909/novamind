from db.qdrant import client
from config.openrouter import openrouter_app
from services.parse_documents import parse_document




def create_embeddings(text):
    # If text is a string, wrap it in a list
    is_single = isinstance(text, str)
    inputs = [text] if is_single else text
    
    batch_size = 32
    embeddings = []
    for i in range(0, len(inputs), batch_size):
        batch = inputs[i:i + batch_size]
        response = openrouter_app.embeddings.generate(
            input=batch,
            model="nvidia/llama-nemotron-embed-vl-1b-v2:free",
            dimensions=786,
        )
        embeddings.extend([item.embedding for item in response.data])
        
    return embeddings[0] if is_single else embeddings

