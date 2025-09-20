import os
import tempfile
import json
import logging
import firebase_admin
from firebase_admin import firestore, auth
from google.cloud import storage
import pymupdf4llm
import docx
import mammoth
import vertexai
from vertexai.generative_models import GenerativeModel
from vertexai.preview import rag
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import fitz  # PyMuPDF for PDF coordinate extraction
from google.auth import default
from google.auth.transport.requests import Request
from typing import List, Dict # <-- 1. ADD THIS IMPORT

# ... (other code and imports)

# ------------------- Pydantic Models -------------------
class QueryRequest(BaseModel): # <-- 2. ADD THIS CLASS DEFINITION
    query: str
    docId: str
    chatHistory: List[Dict[str, str]]
# ------------------- Logging Setup -------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ------------------- Initialization -------------------
vertexai.init(project=os.environ.get("GCP_PROJECT"), location=os.environ.get("GCP_REGION", "us-central1"))
creds, PROJECT_ID = default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
LOCATION = os.environ.get("GCP_REGION", "us-central1")
RAG_CORPUS_ID = os.environ.get("RAG_CORPUS_ID")

firebase_admin.initialize_app()
db = firestore.client()
storage_client = storage.Client()

logger.info("✅ Initialization complete")

# ------------------- FastAPI Setup -------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- Helper Functions -------------------
def extract_text_from_pdf(blob) -> str:
    with tempfile.NamedTemporaryFile(suffix=".pdf") as temp_file:
        blob.download_to_filename(temp_file.name)
        return pymupdf4llm.to_markdown(temp_file.name)

def extract_text_from_docx(blob) -> str:
    fd, temp_path = tempfile.mkstemp(suffix=".docx", prefix="rag_upload_")
    os.close(fd)
    try:
        blob.download_to_filename(temp_path)
        doc = docx.Document(temp_path)
        return "\n".join([p.text for p in doc.paragraphs])
    finally:
        os.remove(temp_path)

def extract_text_from_txt(blob) -> str:
    return blob.download_as_text()

def is_legal_document(document_text: str) -> bool:
    model = GenerativeModel("gemini-2.5-flash")
    snippet = document_text[:3000]
    prompt = f"""
Analyze the following text to determine if it is a legal document.
A legal document includes contracts, agreements, TOS, privacy policies, wills, deeds, or court filings.
It is NOT a resume, novel, news article, academic paper, or casual letter.

Respond with only a single word: YES or NO.

Text Snippet:
---
{snippet}
---
"""
    response = model.generate_content(prompt)
    decision = response.text.strip().upper()
    logger.info("Legal document classification result: %s", decision)
    return decision == "YES"

def generate_insights(document_text: str) -> dict:
    model = GenerativeModel("gemini-2.5-pro")
    prompt = f"""
    Analyze the following legal document text and generate a structured JSON object containing a detailed analysis. The JSON object must conform to the following schema:

    {{
      "summary": "A concise, 2-3 sentence overall summary of the document's purpose.",
      "keyTerms": [
        {{ "term": "Term Name 1", "risk": "High|Medium|Low" }},
        {{ "term": "Term Name 2", "risk": "High|Medium|Low" }}
      ],
      "entities": [
        {{ "name": "Entity Name", "role": "Role (e.g., Contract Party, Organization)" }}
      ],
      "detailedInsights": [
        {{
          "category": "Financial Risk",
          "level": "High|Medium|Low",
          "items": ["Point 1 about financial risk.", "Point 2 about financial risk."]
        }},
        {{
          "category": "Legal Compliance",
          "level": "High|Medium|Low",
          "items": ["Point 1 about legal compliance.", "Point 2 about legal compliance."]
        }},
        {{
          "category": "Timeline Risk",
          "level": "High|Medium|Low",
          "items": ["Point 1 about timelines.", "Point 2 about timelines."]
        }}
      ],
      "contractAnalysisSummary": {{
        "strengths": ["List of strengths."],
        "concerns": ["List of concerns."]
      }},
      "suggestedQuestions": [
        "A relevant question about the document.",
        "Another relevant question."
      ]
    }}

    Document Text:
    ---
    {document_text}
    ---

    Provide only the JSON object as a response, without any additional text or markdown formatting.
    """
    response = model.generate_content(prompt)
    cleaned = response.text.strip().replace("```json", "").replace("```", "")
    return json.loads(cleaned)

def import_file_to_rag(rag_corpus_path: str, local_file_path: str, display_name: str):
    """
    Uploads a file to an existing RAG Corpus using the Vertex AI SDK.
    display_name must have proper extension (.pdf, .docx, .txt)
    """
    rag_file = rag.upload_file(
        corpus_name=rag_corpus_path,
        path=local_file_path,
        display_name=display_name,
        description=f"Uploaded from {display_name}"
    )
    logger.info("Uploaded file to RAG Corpus: %s", rag_file.name)
    return rag_file


import google.genai as genai
from google.genai.types import (
    Tool,
    Retrieval,
    VertexRagStore,
    VertexRagStoreRagResource,
    GenerateContentConfig,
)

# ... after your vertexai.init(...)
# Add the client from the 'google-genai' library
genai_client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

def retrieve_from_vertex_rag(query: str, doc_id: str = "") -> str:
    """
    Retrieve relevant context from the RAG corpus using the google-genai SDK pattern.
    """
    rag_corpus_path = f"projects/{PROJECT_ID}/locations/{LOCATION}/ragCorpora/{RAG_CORPUS_ID}"

    # 1. Manually build the RAG tool using classes from google.genai.types
    rag_retrieval_tool = Tool(
        retrieval=Retrieval(
            vertex_rag_store=VertexRagStore(
                rag_resources=[
                    VertexRagStoreRagResource(
                        rag_corpus=rag_corpus_path,
                    )
                ],
                similarity_top_k=10,
                vector_distance_threshold=0.4,
            )
        )
    )

    # 2. Call the model using the 'genai_client'
    # Note: The model name here can be a string, no need to instantiate GenerativeModel
    response = genai_client.models.generate_content(
        model=f"projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/gemini-2.5-flash",
        contents=[query],
        config=GenerateContentConfig(tools=[rag_retrieval_tool]),
    )

    return response.text if response.text else "No relevant information found."
# ------------------- Document Processing Endpoint -------------------
@app.post("/process-document")
def process_document_endpoint(bucket_name: str, file_path: str, mime_type: str):
    firestore_doc_ref = None
    logger.info("Received request to process document: bucket=%s, path=%s", bucket_name, file_path)
    try:
        parts = file_path.split('/')
        if len(parts) < 3:
            raise ValueError("Invalid file path structure")
        user_id, doc_id, filename = parts[0], parts[1], parts[2]
        firestore_doc_ref = db.collection("users").document(user_id).collection("documents").document(doc_id)
        
        logger.info("Processing for user=%s, doc=%s", user_id, doc_id)
        
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_path)

        logger.info("1. Extracting text from %s", filename)
        if "pdf" in mime_type:
            text = extract_text_from_pdf(blob)
        elif "openxmlformats-officedocument.wordprocessingml" in mime_type:
            text = extract_text_from_docx(blob)
        elif "text" in mime_type:
            text = extract_text_from_txt(blob)
        else:
            raise ValueError(f"Unsupported MIME type: {mime_type}")

        if not text.strip():
            raise ValueError("Extracted text is empty.")
        
        logger.info("2. Checking if document is legal...")
        if not is_legal_document(text):
            logger.warning("Document %s rejected as non-legal.", doc_id)
            firestore_doc_ref.update({"uploadStatus": "REJECTED", "statusMessage": "File is not a legal document."})
            return {"status": "REJECTED"}

        logger.info("3. Ingesting file into RAG...")
        fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(filename)[1], prefix="rag_upload_")
        os.close(fd)
        blob.download_to_filename(temp_path)
        rag_corpus_path = f"projects/{PROJECT_ID}/locations/{LOCATION}/ragCorpora/{RAG_CORPUS_ID}"
        import_file_to_rag(rag_corpus_path, temp_path, display_name=filename)
        os.remove(temp_path)

        logger.info("4. Generating insights (this may take a while)...")
        insights = generate_insights(text)
        update_data = {"uploadStatus": "COMPLETED", "insights": insights}

        logger.info("5. Processing file-specific data...")
        fd, temp_path = tempfile.mkstemp()
        os.close(fd)
        blob.download_to_filename(temp_path)

        if "pdf" in mime_type:
            update_data["fileType"] = "pdf"
            pdf_doc = fitz.open(temp_path)
            for term_info in insights.get("keyTerms", []):
                term_info["locations"] = []
                for page_num, page in enumerate(pdf_doc):
                    for rect in page.search_for(term_info["term"]):
                        term_info["locations"].append({
                            "page": page_num,
                            "coords": [rect.x0, rect.y0, rect.x1, rect.y1]
                        })
            pdf_doc.close()

        elif "openxmlformats-officedocument.wordprocessingml" in mime_type:
            update_data["fileType"] = "docx"
            with open(temp_path, "rb") as f:
                result = mammoth.convert_to_html(f)
                update_data["htmlContent"] = result.value

        elif "text" in mime_type:
            update_data["fileType"] = "txt"
            with open(temp_path, "r") as f:
                update_data["htmlContent"] = f"<pre>{f.read()}</pre>"

        os.remove(temp_path)

        logger.info("Updating Firestore for doc_id: %s", doc_id)
        firestore_doc_ref.update(update_data)
        logger.info("✅ Successfully processed document: %s", doc_id)
        return {"status": "COMPLETED"}

    except Exception as e:
        logger.exception("🔥 FAILED to process document %s: %s", file_path, e)
        if firestore_doc_ref:
            firestore_doc_ref.update({"uploadStatus": "FAILED", "statusMessage": str(e)})
        raise HTTPException(status_code=500, detail=str(e))

# ------------------- Query Endpoint -------------------
@app.post("/query-document")
def query_document_endpoint(req: QueryRequest):
    logger.info("Received query for docId: %s with query: '%s'", req.docId, req.query)
    try:
        # This single function call gets the complete, RAG-grounded answer.
        # No second AI call or chat history is needed here.
        answer = retrieve_from_vertex_rag(req.query, req.docId)

        logger.info("Successfully generated answer for docId: %s", req.docId)
        return {"answer": answer}

    except Exception as e:
        logger.exception("🔥 FAILED to answer query for docId %s: %s", req.docId, e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    logger.info("Health check endpoint was called.")
    return {"status": "ok", "message": "Service is running"}
