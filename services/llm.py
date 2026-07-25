from config.openrouter import openrouter_app
from services.qdrant import search_points

def generate_response(query, history, session_id=None):
    context = search_points(query, session_id)
    query+=f"\nChat history: {history}"
    response = openrouter_app.chat.send(
        messages=[
            {
                "role": "system",
                "content": f"You are a helpful assistant that answers questions based on the context provided.if not availbel in context say no info available\\n context : {context} mssghistory : {history}",
            },
            {
                "role": "user",
                "content": query,
            }
        ],
        model="google/gemma-4-26b-a4b-it:free",
        temperature=0.9,
        stream=True
    )
    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content