import fitz
from docx2python import docx2python


def parse_document(file_path):

    if file_path.endswith('.pdf'):
        with fitz.open(file_path) as doc:
            text =""
            for page in doc:
                text += page.get_text() + "\n\n"
            return text
    elif file_path.endswith('.docx'):
        with docx2python(file_path) as doc:
            text = ""
            for para in doc.text.split('\n'):
                if para.strip():
                    text += para.strip() + "\n\n"
            return text