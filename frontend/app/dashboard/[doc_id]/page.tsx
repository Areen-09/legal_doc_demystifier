"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import BeamsBackground from "@/components/kokonutui/beams-background";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Make sure auth is exported from firebase.ts
import { 
  BarChart3, Lightbulb, MessageCircle, ArrowLeft,
  DollarSign, Calendar, Users, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Define TypeScript interfaces for our data
interface DocumentData {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadStatus: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileContent: string;
  insights?: {
    summary: string;
    keyTerms: { term: string; risk: string }[];
    entities: { name: string; role: string }[];
    detailedInsights: { category: string; level: string; items: string[] }[];
    contractAnalysisSummary: { strengths: string[]; concerns: string[] };
    suggestedQuestions: string[];
  };
}

export default function Dashboard() {
  const params = useParams();
  const router = useRouter();
  const docId = params.doc_id as string;
  
  const [activeSection, setActiveSection] = useState("Overview");
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      // Redirect to home if not logged in
      router.push('/');
      return;
    }

    if (docId) {
      const docRef = doc(db, "users", user.uid, "documents", docId);
      
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as DocumentData;
          setDocumentData(data);
          
          if (data.uploadStatus === 'COMPLETED') {
            setIsLoading(false);
          } else if (data.uploadStatus === 'FAILED') {
            setError("Document processing failed. Please try uploading again.");
            setIsLoading(false);
          } else {
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

      return () => unsubscribe(); // Cleanup listener on component unmount
    }
  }, [docId, router]);

  const navigationItems = [
    { id: "Overview", label: "Overview", icon: BarChart3 },
    { id: "Insights", label: "Insights", icon: Lightbulb },
    { id: "Ask AI Expert", label: "Ask AI Expert", icon: MessageCircle },
  ];
  
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

  // RENDER FUNCTIONS (Overview, Insights, AskAI)
  const renderOverview = () => (
    <div className="flex-1 flex">
      <div className="flex-1 p-6">
        <h2 className="text-lg font-semibold mb-4 text-white">Document Content</h2>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white p-6 rounded-xl shadow-xl max-h-[70vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">{documentData?.fileName}</h3>
          <pre className="whitespace-pre-wrap font-sans text-white/90 text-sm leading-relaxed">
            {documentData?.fileContent || "No content available"}
          </pre>
        </div>
      </div>
      <div className="w-80 p-6">
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
            {documentData?.insights?.keyTerms.map((term, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">{term.term}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getRiskColor(term.risk)}`}>{term.risk} Risk</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Entities</h4>
          <div className="space-y-3">
            {documentData?.insights?.entities.map((entity, index) => (
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
    <div className="flex-1 p-6">
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
    // ... This can be implemented in a future step by connecting to the query_document function
     <div className="flex-1 p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">Ask AI Expert</h2>
       <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl h-[70vh] flex flex-col items-center justify-center">
        <p className="text-white/80">Q&A feature coming soon!</p>
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
    <div className="relative min-h-screen overflow-hidden">
      <BeamsBackground className="absolute inset-0 z-0"/>
      <div className="relative z-10 flex min-h-screen">
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
        <div className="flex-1">
          {documentData && renderContent()}
        </div>
      </div>
    </div>
  );
}