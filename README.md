LegalMind AI: Document Demystifier
LegalMind AI is a full-stack, multi-tenant SaaS application designed to demystify complex legal documents. Users can securely upload documents (PDF, DOCX, TXT) and receive instant AI-powered analysis, including summaries, risk assessments, and a Q&A interface to ask specific questions about the content. The application is built on a modern, serverless stack using Google Cloud Platform and Vercel.

Features
Secure User Authentication: Users can sign in easily and securely using their Google accounts via Firebase Authentication. [cite: Implementation Blueprint for Vertex AI + Firestore + Cloud Functions SaaS.pdf]

Multi-Format Document Upload: Supports PDF, DOCX, and plain text file uploads. [cite: frontend/app/dashboard/[doc_id]/page.tsx]

Automated AI Dashboard Generation: Upon upload, a backend process automatically analyzes the document and generates a rich, insightful dashboard with:

An overall summary of the document's purpose. [cite: frontend/app/dashboard/[doc_id]/page.tsx]

Identification of key terms and their associated risk levels (High, Medium, Low). [cite: frontend/app/dashboard/[doc_id]/page.tsx]

Extraction of key entities like names and organizations. [cite: frontend/app/dashboard/[doc_id]/page.tsx]

Detailed risk analysis across financial, legal, and timeline categories. [cite: frontend/app/dashboard/[doc_id]/page.tsx]

Interactive Q&A: A chat interface ("Ask AI Expert") allows users to ask specific questions about their document and receive answers grounded in the document's content, powered by a RAG pipeline. [cite: frontend/app/dashboard/[doc_id]/page.tsx]

Multi-Tenant Security: Each user's data is strictly isolated. A user can only upload to their own secure folder and can only query the documents they have uploaded, enforced by Firestore Security Rules and backend logic. [cite: Implementation Blueprint for Vertex AI + Firestore + Cloud Functions SaaS.pdf]

Architecture
The application is built on a serverless, event-driven architecture that ensures scalability and security.

Frontend (Next.js on Vercel): The user interacts with a Next.js application for authentication and file uploads.

Authentication (Firebase Auth): User identity is managed by Firebase Authentication, providing secure JWTs for API requests.

Storage (Cloud Storage for Firebase): Uploaded files are stored in a secure Cloud Storage bucket, with security rules ensuring users can only write to their own designated paths.

Database (Firestore): Document metadata, processing status, and the final AI-generated insights are stored in Firestore, with security rules isolating user data.

Backend Processing (Cloud Functions):

An event-triggered Cloud Function (process_document) activates upon file upload. It extracts text, calls the Gemini API to generate insights, and saves the results to Firestore.

An HTTP-triggered Cloud Function (query_document) provides a secure API endpoint for the frontend to call for the Q&A feature.

AI Engine (Vertex AI):

Gemini 1.5 Flash: Used directly by the process_document function for whole-document analysis and structured data generation.

RAG Engine: Used by the query_document function to efficiently retrieve relevant context from a user's documents before generating a grounded answer with Gemini.

Tech Stack
Frontend:

Framework: Next.js 15

Language: TypeScript

Styling: Tailwind CSS, shadcn/ui

Backend:

Runtime: Python 3.11 on Google Cloud Functions (Gen2)

Language: Python

Cloud Services:

Firebase: Authentication, Firestore, Cloud Storage

Google Cloud: Vertex AI (Gemini & RAG Engine), Cloud Build, Cloud Run, Eventarc

Deployment:

Frontend: Vercel

Backend: gcloud CLI

Getting Started
Prerequisites
Node.js and pnpm

Python 3.11 and a virtual environment (venv)

Google Cloud SDK (gcloud) installed and authenticated

A Google Cloud Project with Billing enabled

A GitHub account

Setup
Clone the Repository:

git clone [https://github.com/Areen-09/legal_doc_demystifier.git](https://github.com/Areen-09/legal_doc_demystifier.git)
cd legal_doc_demystifier

Google Cloud & Firebase Setup:

In your Google Cloud project, enable the following APIs: Cloud Functions, Cloud Build, Vertex AI, Cloud Storage, Firestore, Eventarc.

In the Firebase console for your project, enable Authentication (with Google provider), Firestore, and Cloud Storage.

Create a .env.local file in the frontend directory and populate it with your Firebase project's web app configuration keys. [cite: frontend/.env.local]

Frontend Dependencies:

cd frontend
pnpm install

Backend Dependencies:

cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

Running Locally
Frontend:

cd frontend
pnpm dev

The app will be available at http://localhost:3000.

Backend:
The backend functions are designed for a cloud environment and are best tested by deploying them.

Deployment
Backend (Cloud Functions)
Configure gcloud:

gcloud config set project [YOUR_PROJECT_ID]

Create RAG Corpus:

Navigate to Vertex AI > RAG Engine in the Google Cloud Console.

Create a new corpus, selecting the LLM Parser and a modern embedding model (e.g., text-embedding-005).

Note the Region and Corpus ID.

Deploy Functions:

Navigate to the backend directory.

Run the deployment commands, replacing placeholders with your actual values.

# Deploy the document processing function
gcloud functions deploy process_document `
  --gen2 `
  --runtime=python311 `
  --region=[YOUR_BUCKET_REGION] `
  --memory=1Gi `
  --source=. `
  --entry-point=process_document `
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" `
  --trigger-event-filters="bucket=[YOUR_GCS_BUCKET_NAME.appspot.com]" `
  --set-env-vars="RAG_CORPUS_ID=[YOUR_CORPUS_ID],GCP_REGION=[YOUR_RAG_ENGINE_REGION]"

# Deploy the Q&A function
gcloud functions deploy query_document `
  --gen2 `
  --runtime=python311 `
  --region=[YOUR_BUCKET_REGION] `
  --memory=1Gi `
  --source=. `
  --entry-point=query_document `
  --trigger-http `
  --allow-unauthenticated `
  --set-env-vars="RAG_CORPUS_ID=[YOUR_CORPUS_ID],GCP_REGION=[YOUR_RAG_ENGINE_REGION]"

Note: The query_document function requires its HTTP Trigger URL to be pasted into the frontend code.

Frontend (Vercel)
Push to GitHub: Push the entire project (with both frontend and backend folders) to a single GitHub repository.

Import to Vercel: Connect your GitHub account to Vercel and import the repository.

Configure Root Directory: In the project settings on Vercel, set the Root Directory to frontend.

Add Environment Variables: Copy all the NEXT_PUBLIC_ variables from your .env.local file into the Vercel project's environment variables settings.

Deploy: Click the "Deploy" button.
