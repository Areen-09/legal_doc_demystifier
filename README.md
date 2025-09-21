# Legal Document Demystifier ⚖️✨

Legal Document Demystifier is an intelligent web application designed to make complex legal documents understandable for everyone. By leveraging the power of Google's Gemini Pro, this tool allows users to upload their legal texts (in PDF, DOCX, or TXT format) and receive a simplified explanation, a summary of key points, and an analysis of potential risks.

Furthermore, it offers an interactive chat feature, enabling users to ask specific questions about the document and receive instant, context-aware answers.

## 🚀 Live Website

Experience the application live:

[**legal-doc-demystifier.vercel.app**](https://legal-doc-demystifier.vercel.app/)

## 🎥 Demo

Check out a video demonstration of the application in action:

[**Watch Demo**](https://drive.google.com/file/d/17mQeg_Ol9ulO7l_X3hsKZ8Kruf1_haAP/view?usp=drive_link)

## ✨ Features

* **AI-Powered Analysis**: Utilizes Google's Gemini API to break down dense legal jargon into simple, easy-to-understand language.
* **Multi-Format Support**: Upload documents in **PDF**, **DOCX**, and **TXT** formats.
* **Comprehensive Insights**: Automatically generates:
    * A simplified summary of the document.
    * A bulleted list of key clauses and points.
    * An assessment of potential risks and liabilities.
* **Interactive Chat**: Ask follow-up questions about the document and get immediate, intelligent responses from the AI.
* **Dual-Pane Interface**: View the original document and its AI-generated analysis side-by-side for easy comparison and reference.
* **Secure & Scalable**: Built with a modern tech stack including Next.js and Firebase for a secure, fast, and reliable user experience.

---

## 🛠️ Tech Stack

The project is a monorepo containing both the frontend and backend services.

* **Frontend**:
    * **Framework**: [Next.js](https://nextjs.org/) (React)
    * **Language**: [TypeScript](https://www.typescriptlang.org/)
    * **Styling**: [Tailwind CSS](https://tailwindcss.com/)
    * **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
    * **Backend-as-a-Service**: [Firebase](https://firebase.google.com/) (for authentication, Firestore database, and storage)

* **Backend**:
    * **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
    * **Language**: [Python 3.9+](https://www.python.org/)
    * **AI Model**: [Google Gemini API](https://ai.google.dev/)
    * **Containerization**: [Docker](https://www.docker.com/)

---

## 🚀 Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

* Node.js and pnpm (or npm/yarn)
* Python 3.9+ and pip
* Docker (optional, for containerizing the backend)
* A Firebase project with Firestore and Storage enabled.
* A Google AI API key for the Gemini API.

### ⚙️ Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/legal_doc_demystifier.git](https://github.com/your-username/legal_doc_demystifier.git)
    cd legal_doc_demystifier
    ```

2.  **Setup the Backend:**
    * Navigate to the backend directory:
        ```bash
        cd backend
        ```
    * Create a virtual environment and activate it:
        ```bash
        python -m venv venv
        source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
        ```
    * Install the required Python packages:
        ```bash
        pip install -r requirements.txt
        ```
    * Create a `.env` file and add your Google AI API key:
        ```env
        GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
        ```
    * Run the FastAPI server:
        ```bash
        uvicorn main:app --reload
        ```
    The backend will now be running at `http://127.0.0.1:8000`.

3.  **Setup the Frontend:**
    * Navigate to the frontend directory:
        ```bash
        cd ../frontend
        ```
    * Install the necessary packages:
        ```bash
        pnpm install
        ```
    * Create a `.env.local` file in the `frontend` directory and add your Firebase project configuration and the backend URL:
        ```env
        # Firebase Configuration
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_SENDER_ID"
        NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"

        # Backend API URL
        NEXT_PUBLIC_API_URL="[http://127.0.0.1:8000](http://127.0.0.1:8000)"
        ```
    * Run the Next.js development server:
        ```bash
        pnpm dev
        ```
    The frontend will be accessible at `http://localhost:3000`.

---

## 📖 How It Works

1.  **Upload**: The user uploads a document file (PDF, DOCX, or TXT) through the Next.js frontend.
2.  **Store**: The file is securely uploaded to Firebase Storage.
3.  **Process**: The frontend sends a request to the FastAPI backend, pointing to the stored file's location.
4.  **Analyze**: The backend fetches the file, extracts the text, and sends it to the Google Gemini API with a specialized prompt asking it to simplify the content, identify key points, and flag risks.
5.  **Save & Display**: The AI-generated analysis is saved in Firestore and sent back to the user's dashboard, where it's displayed alongside the original document for easy review.
6.  **Chat**: For follow-up questions, the user's query is sent along with the document's context to the Gemini API, providing a conversational way to explore the document's details.

## 📜 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
