import os
import tempfile
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from google.cloud import aiplatform, storage

# --- Text Extraction Libraries ---
import pymupdf4llm
import docx

# --- Vertex AI Generative Model ---
import vertexai
from vertexai.generative_models import GenerativeModel
import functions_framework

# Initialize Firebase Admin SDK
try:
    firebase_admin.initialize_app()
    db = firestore.client()

    PROJECT_ID = os.environ.get("GCP_PROJECT")
    LOCATION = os.environ.get("GCP_REGION", "us-central1")
    RAG_CORPUS_ID = os.environ.get("RAG_CORPUS_ID")

    vertexai.init(project=PROJECT_ID, location=LOCATION)
    storage_client = storage.Client()
    print("✅ Initialization successful.")
except Exception as e:
    print(f"🔥 Initialization failed: {e}")

# --- Helper functions for text extraction ---
# (These functions remain the same as before)
def extract_text_from_pdf(blob):
    """Downloads a PDF blob and extracts text as Markdown."""
    with tempfile.NamedTemporaryFile(suffix=".pdf") as temp_file:
        blob.download_to_filename(temp_file.name)
        # Use pymupdf4llm to convert the PDF pages to Markdown text
        md_text = pymupdf4llm.to_markdown(temp_file.name)
    return md_text

def extract_text_from_docx(blob):
    with tempfile.NamedTemporaryFile() as temp_file:
        blob.download_to_filename(temp_file.name)
        doc = docx.Document(temp_file.name)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text

def extract_text_from_txt(blob):
    return blob.download_as_text()

def generate_insights(document_text: str) -> dict:
    """
    Uses Gemini to generate a structured JSON object of insights from document text.
    """
    model = GenerativeModel("gemini-2.5-flash")
    
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
    
    # Clean up the response to ensure it's valid JSON
    cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
    return json.loads(cleaned_response)


# --- Upload Processing Function (GCS Trigger) ---
@functions_framework.cloud_event
def process_document(cloud_event):
    """
    This is the GCS-triggered function.
    """
    file_data = cloud_event.data
    bucket_name = file_data["bucket"]
    file_path = file_data["name"]
    mime_type = file_data.get("contentType", "")

    print(f"Processing file: {file_path} (Type: {mime_type})")

    try:
        parts = file_path.split('/')
        if len(parts) < 3: raise ValueError("Invalid file path structure.")
        user_id, doc_id = parts[0], parts[1]

        firestore_doc_ref = db.collection("users").document(user_id).collection("documents").document(doc_id)
        
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_path)
        
        extracted_text = ""
        if "pdf" in mime_type: extracted_text = extract_text_from_pdf(blob)
        elif "openxmlformats-officedocument.wordprocessingml" in mime_type: extracted_text = extract_text_from_docx(blob)
        elif "text" in mime_type: extracted_text = extract_text_from_txt(blob)
        else: raise ValueError(f"Unsupported MIME type: {mime_type}")

        if not extracted_text.strip(): raise ValueError("Extracted text is empty.")

        print("Generating AI insights...")
        insights = generate_insights(extracted_text)

        update_data = {
            "uploadStatus": "COMPLETED",
            "fileContent": extracted_text,
            "insights": insights
        }
        firestore_doc_ref.update(update_data)
        
        print(f"Successfully processed {file_path}. Insights saved to Firestore.")

    except Exception as e:
        print(f"Error processing file {file_path}: {e}")
        if 'firestore_doc_ref' in locals() and firestore_doc_ref:
            firestore_doc_ref.update({"uploadStatus": "FAILED"})
        raise

# --- Query Handling Function (HTTP Trigger) ---
def query_document(request):
    """
    HTTP-triggered Cloud Function that allows authenticated users to query their documents.
    """
    # Set CORS headers for preflight requests
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    # Set CORS headers for the main request
    headers = {
        'Access-Control-Allow-Origin': '*'
    }
    
    # --- Verify Firebase Auth Token ---
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return ('Unauthorized: Missing or invalid Authorization header.', 401, headers)

    id_token = auth_header.split('Bearer ')[1]
    try:
        decoded_token = auth.verify_id_token(id_token)
        user_id = decoded_token['uid']
    except auth.InvalidIdTokenError:
        return ('Unauthorized: Invalid ID token.', 401, headers)
    except Exception as e:
        return (f"An unexpected authentication error occurred: {e}", 401, headers)

    # --- Get Query from Request ---
    request_json = request.get_json(silent=True)
    if not request_json or 'query' not in request_json:
        return ('Bad Request: JSON body with "query" field is required.', 400, headers)
    
    user_query = request_json['query']
    doc_id_filter = request_json.get('docId') # Optional: filter by a specific document

    try:
        # --- Build RAG Query with Metadata Filtering ---
        rag_resource = f"projects/{PROJECT_ID}/locations/{LOCATION}/ragCorpora/{RAG_CORPUS_ID}"
        
        # This filter ensures we only retrieve results for the authenticated user's documents.
        filter_conditions = [f'user_id: "{user_id}"']
        if doc_id_filter:
            filter_conditions.append(f'doc_id: "{doc_id_filter}"')
        
        # --- Call Vertex AI RAG Engine ---
        # Note: The `retrieveContexts` method is used here as it's the direct way to get RAG results.
        # This can be integrated with a generation model (like Gemini) in the next step.
        response = aiplatform.gapic.VertexRagServiceClient().retrieve_contexts(
            parent=rag_resource,
            query=user_query,
            vector_search_config={"filters": filter_conditions}
        )
        
        # --- Format and Return Answer ---
        # For now, we return the retrieved contexts. A full implementation would
        # pass these contexts to a Gemini model to generate a natural language answer.
        contexts = [
            {"text": context.text, "source_uri": context.source_uri}
            for context in response.contexts.contexts
        ]

        return ({"answer": "Retrieved relevant contexts.", "contexts": contexts}, 200, headers)

    except Exception as e:
        print(f"Error during RAG query for user {user_id}: {e}")
        return ('Internal Server Error: Could not process your query.', 500, headers)

