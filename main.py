from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from db.redis import get_history,add_message
from pydantic import BaseModel
import os
import shutil

from services.qdrant import create_points, upload_points
from db.qdrant import collection_db
from services.llm import generate_response

app = FastAPI()

# Enable CORS for external frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

collection_db()

class FilePathUpload(BaseModel):
    filepath: str
    user_id:int

class Query(BaseModel):
    question: str
    session_id:str

@app.post("/upload")
async def upload(user_id: str, session_id: str, file: UploadFile = File(...)):
    try:
        # Create temp uploads folder in workspace if not exists
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save uploaded file to disk
        temp_file_path = os.path.join(temp_dir, file.filename)
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Index document and upload points to Qdrant
        points = create_points(temp_file_path, user_id, session_id)
        upload_points(points)
        
        # Clean up temp file
        os.remove(temp_file_path)
        
        return {
            "status": "success",
            "message": f"File '{file.filename}' uploaded and indexed successfully"
        }
    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }

@app.post("/upload-by-path")
async def upload_by_path(file: FilePathUpload):
    try:
        points = create_points(file.filepath, file.user_id, "default_session")
        upload_points(points)
        return {
            "status": "success",
            "message": "file uploaded successfully"
        }
    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }
    
@app.post("/query")
async def ask_query(query: Query):
    try:
        history = get_history(query.session_id)
        def stream_generator():
            full_response =[]
            for chunk in generate_response(query.question, history, query.session_id):
                full_response.append(chunk)
                yield chunk
            
            add_message(query.session_id,"user",query.question)
            add_message(query.session_id,"assistant","".join(full_response))
            


        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream"
        )
    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }

@app.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    try:
        history = get_history(session_id)
        return {
            "status": "success",
            "history": history
        }
    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }

# Serve static frontend files
# Make sure frontend/dist folder exists before starting the app!
dist_dir = "frontend/dist"
os.makedirs(dist_dir, exist_ok=True)
app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
