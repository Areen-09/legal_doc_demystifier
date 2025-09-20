"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import BeamsBackground from "@/components/kokonutui/beams-background";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  BarChart3, Lightbulb, MessageCircle, ArrowLeft,
  DollarSign, Calendar, Users, Shield, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/kibo-ui/status";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import HtmlViewer from '@/components/document-viewer/HtmlViewer';
import '@/components/document-viewer/HtmlViewer.css';
import dynamic from 'next/dynamic';

// --- INTERFACES ---
interface KeyTerm {
  term: string;
  risk: string;
  locations?: { page: number; coords: number[] }[];
}

interface DocumentData {
  fileName: string;
  fileSize: number;
  uploadStatus: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
  fileType: 'pdf' | 'docx' | 'txt';
  htmlContent?: string;
  pdfUrl?: string;
  insights?: {
    summary: string;
    keyTerms: KeyTerm[];
    entities: { name: string; role: string }[];
    detailedInsights: { category: string; level: string; items: string[] }[];
    contractAnalysisSummary: { strengths: string[]; concerns: string[] };
    suggestedQuestions: string[];
  };
  statusMessage?: string;
}

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

const DynamicPDFViewer = dynamic(
  () => import('@/components/document-viewer/PDFViewer'),
  { ssr: false }
);

export default function Dashboard() {
  const params = useParams();
  const router = useRouter();
  const docId = params.doc_id as string;
  
  const [activeSection, setActiveSection] = useState("Overview");
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/');
      return;
    }
  
    if (docId) {
      const docRef = doc(db, "users", user.uid, "documents", docId);
      
      const unsubscribe = onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
          let data = docSnap.data() as DocumentData;
  
          // --- START OF WORKAROUND ---
          // If the backend incorrectly marks a rejected file as 'COMPLETED',
          // we detect it by the lack of insights and manually fix the status.
          if (data.uploadStatus === 'COMPLETED' && (!data.insights || !data.insights.summary)) {
            data = {
              ...data,
              uploadStatus: 'REJECTED',
              statusMessage: 'File rejected: This does not appear to be a legal document.'
            };
          }
          // --- END OF WORKAROUND ---
          
          let finalData = { ...data };

          // Get PDF URL if needed
          if (data.fileType === 'pdf' && !data.pdfUrl) {
            try {
              const storage = getStorage();
              const fileRef = ref(storage, `${user.uid}/${docId}/${data.fileName}`);
              const url = await getDownloadURL(fileRef);
              finalData.pdfUrl = url;
            } catch (storageError) {
              console.error("Error getting file URL:", storageError);
              setError("Could not load the document file.");
            }
          }
          
          setDocumentData(finalData);
          
          if (finalData.uploadStatus === 'FAILED' || finalData.uploadStatus === 'REJECTED') {
            setError(finalData.statusMessage || "Document processing failed.");
            setIsLoading(false);
          } else if (finalData.uploadStatus === 'COMPLETED') {
            setError(null);
            setIsLoading(false);
          } else { // PROCESSING
            setIsLoading(true);
          }

        } else {
          setError("Document not found.");
          setIsLoading(false);
        }
      }, (err) => {
        console.error("Error fetching document:", err);
        setError("Could not load document data.");
        setIsLoading(false);
      });
  
      return () => unsubscribe();
    }
  }, [docId, router]);
  
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || isChatLoading) return;

    const user = auth.currentUser;
    if (!user) {
        setError("You must be logged in to chat.");
        return;
    }

    const newUserMessage: ChatMessage = { role: 'user', content: userInput };
    const newChatHistory = [...chatHistory, newUserMessage];
    setChatHistory(newChatHistory);
    setUserInput("");
    setIsChatLoading(true);

    try {
        const token = await user.getIdToken();
        
        // --- ✅ MODIFIED LINE: Reading from environment variable ---
        const CLOUD_FUNCTION_URL = process.env.NEXT_PUBLIC_CLOUD_FUNCTION_URL;

        if (!CLOUD_FUNCTION_URL) {
            throw new Error("Cloud Function URL is not configured.");
        }

        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: userInput,
                docId: docId,
                chatHistory: chatHistory
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get a response from the AI.");
        }

        const data = await response.json();
        const modelResponse: ChatMessage = { role: 'model', content: data.answer };
        setChatHistory(prev => [...prev, modelResponse]);

    } catch (err: any) {
        const errorMessage: ChatMessage = { role: 'model', content: `Sorry, an error occurred: ${err.message}` };
        setChatHistory(prev => [...prev, errorMessage]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const navigationItems = [
    { id: "Overview", label: "Overview", icon: BarChart3 },
    { id: "Insights", label: "Insights", icon: Lightbulb },
    { id: "Ask AI Expert", label: "Ask AI Expert", icon: MessageCircle },
  ];
  
  const getRiskStatus = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'offline';
      case 'medium': return 'degraded';
      case 'low': return 'online';
      default: return 'maintenance';
    }
  };
  
  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-red-500/30 text-red-200';
      case 'medium': return 'bg-yellow-500/30 text-yellow-200';
      case 'low': return 'bg-green-500/30 text-green-200';
      default: return 'bg-gray-500/30 text-gray-200';
    }
  };
  
  const getIconForCategory = (category: string) => {
    switch(category) {
      case 'Financial Risk': return DollarSign;
      case 'Legal Compliance': return Shield;
      case 'Timeline Risk': return Calendar;
      default: return Users;
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <BeamsBackground className="absolute inset-0 z-0"/>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center text-white p-8 bg-white/10 backdrop-blur-md rounded-xl">
            <h2 className="text-2xl font-bold mb-4">Analyzing Your Document...</h2>
            <p className="text-white/80">Our AI is processing your file. This may take a moment.</p>
          </div>
        </div>
      </div>
    );
  }
  if (documentData?.uploadStatus === 'REJECTED') {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <BeamsBackground className="absolute inset-0 z-0"/>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          {/* Use a different color for a warning, not a hard error */}
          <div className="text-center text-white p-8 bg-yellow-500/20 backdrop-blur-md rounded-xl">
            <h2 className="text-2xl font-bold mb-4">File Rejected</h2>
            <p className="text-white/80">{documentData.statusMessage}</p>
            <p className="text-sm text-white/60 mt-2">Please upload a valid contract, agreement, or policy.</p>
            <Button onClick={() => router.push('/')} className="mt-6">
              Upload a Different File
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="relative min-h-screen overflow-hidden">
        <BeamsBackground className="absolute inset-0 z-0"/>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center text-white p-8 bg-red-500/20 backdrop-blur-md rounded-xl">
            <h2 className="text-2xl font-bold mb-4">An Error Occurred</h2>
            <p className="text-white/80">{error}</p>
            <Button onClick={() => router.push('/')} className="mt-6">Go Back Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="flex-1 flex overflow-hidden h-full">
      <div className="flex-1 p-6 flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-4 text-white flex-shrink-0">
          {documentData?.fileName}
        </h2>
        <div className="bg-white border border-white/20 text-gray-800 rounded-xl shadow-xl flex-1 overflow-hidden min-h-0">
          <div className="h-full overflow-y-auto">
            {documentData?.fileType === 'pdf' ? (
              <div className="p-6">
                <DynamicPDFViewer 
                  pdfUrl={documentData.pdfUrl} 
                  keyTerms={documentData.insights?.keyTerms} 
                />
              </div>
            ) : (
              <div className="p-6">
                <HtmlViewer 
                  htmlContent={documentData?.htmlContent} 
                  keyTerms={documentData?.insights?.keyTerms} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="w-80 p-6 flex-shrink-0 overflow-y-auto h-full">
        <h3 className="text-lg font-semibold mb-4 text-white">Quick Insights</h3>
        <div className="mb-6">
          <h4 className="font-semibold text-white mb-3">Overall Summary</h4>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-lg">
            <p className="text-sm text-white/90">{documentData?.insights?.summary}</p>
          </div>
        </div>
        <div className="mb-6">
          <h4 className="font-semibold text-white mb-3">Key Terms Identified</h4>
          <div className="space-y-2">
            {documentData?.insights?.keyTerms?.map((term, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">{term.term}</span>
                  <Status status={getRiskStatus(term.risk)}>
                    <StatusIndicator />
                    <StatusLabel>
                      {`${term.risk.charAt(0).toUpperCase() + term.risk.slice(1)} Risk`}
                    </StatusLabel>
                  </Status>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Entities</h4>
          <div className="space-y-3">
            {documentData?.insights?.entities?.map((entity, index) => (
              <div key={index} className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-lg">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                  <span className="text-xs font-semibold text-white">{entity.name.substring(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{entity.name}</p>
                  <p className="text-xs text-white/60">{entity.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsights = () => (
    <div className="flex-1 p-6 overflow-y-auto h-full">
       <h2 className="text-2xl font-bold mb-6 text-white">Detailed Insights & Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documentData?.insights?.detailedInsights.map((insight, index) => {
          const Icon = getIconForCategory(insight.category);
          return (
            <div key={index} className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl shadow-xl">
              <div className="flex items-center mb-4">
                <Icon className="w-6 h-6 text-red-400 mr-3" />
                <h3 className="text-lg font-semibold text-white">{insight.category}</h3>
                <span className={`ml-auto px-2 py-1 rounded text-xs font-medium ${getRiskColor(insight.level)}`}>
                  {insight.level} Risk
                </span>
              </div>
              <ul className="space-y-2">
                {insight.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-sm text-white/80 flex items-start">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-8 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-4">Contract Analysis Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-white mb-2">Strengths</h4>
            <ul className="space-y-1 text-sm text-white/80">
              {documentData?.insights?.contractAnalysisSummary.strengths.map((item, i) => <li key={i}>• {item}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Concerns</h4>
            <ul className="space-y-1 text-sm text-white/80">
              {documentData?.insights?.contractAnalysisSummary.concerns.map((item, i) => <li key={i}>• {item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAskAI = () => (
    <div className="flex-1 p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-white">Ask AI Expert</h2>
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl flex-1 flex flex-col min-h-0">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-lg px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-red-500/40 text-white' : 'bg-white/20 text-white/90'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                  <div className="max-w-lg px-4 py-3 rounded-2xl bg-white/20 text-white/90">
                      <div className="flex items-center justify-center space-x-1">
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse delay-75"></div>
                          <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse delay-150"></div>
                      </div>
                  </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
        
        <div className="p-4 border-t border-white/20">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              disabled={isChatLoading}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
            <Button type="submit" disabled={isChatLoading || !userInput.trim()} className="bg-red-500/80 hover:bg-red-500 text-white rounded-lg px-4 py-2">
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "Insights": return renderInsights();
      case "Ask AI Expert": return renderAskAI();
      default: return renderOverview();
    }
  };

  return (
    <div className="relative h-screen overflow-hidden">
      <BeamsBackground className="absolute inset-0 z-0"/>
      <div className="relative z-10 flex h-screen">
        <div className="w-64 bg-white/10 backdrop-blur-md border-r border-white/20 flex flex-col">
          <div className="p-6 border-b border-white/20">
            <h1 className="text-xl font-bold text-white">Legal Mind AI</h1>
            <p className="text-xs text-white/60 mt-1">Document ID: {docId}</p>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                        activeSection === item.id
                          ? "bg-red-500/30 text-white border border-red-500/50"
                          : "text-white/70 hover:bg-white/10 hover:text-white border border-transparent"
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="p-4">
            <Button onClick={() => router.push('/')} className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          {documentData && renderContent()}
        </div>
      </div>
    </div>
  );
}