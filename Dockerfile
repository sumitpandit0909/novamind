FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for PyMuPDF and docx2python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY pyproject.toml uv.lock ./

# Install Python dependencies directly with pip (avoids venv PATH issues)
RUN pip install --no-cache-dir \
    fastapi>=0.139.0 \
    uvicorn>=0.51.0 \
    qdrant-client>=1.18.0 \
    openrouter>=0.11.37 \
    pydantic>=2.12.5 \
    pydantic-settings>=2.14.2 \
    pymupdf>=1.28.0 \
    python-multipart>=0.0.32 \
    redis>=8.0.1 \
    docx2python>=3.6.2 \
    python-dotenv>=1.2.2

# Copy application code
COPY . .

# Create temp_uploads directory
RUN mkdir -p temp_uploads

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]