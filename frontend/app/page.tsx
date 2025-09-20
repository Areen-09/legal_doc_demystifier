"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BeamsBackground from "@/components/kokonutui/beams-background";
import { CommandButton } from "@/components/kokonutui/command-button";
import { Upload, ArrowDown, ShieldCheck, BarChart3, MessagesSquare, ChevronDown, FileText} from "lucide-react";
import ProfileDropdown from "@/components/kokonutui/profile-dropdown";
import FileUpload, { type FileStatus } from "@/components/kokonutui/file-upload";
import { Button } from "@/components/ui/button";
import { firebaseAuthApi, uploadFileAndCreateMetadata } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { CometCard } from "@/components/ui/comet-card";
import { GlowingEffect } from "@/components/ui/glowing-effect";

// New Component: "Know More" Section
const steps = [
  {
    step: "Step 1",
    title: "Securely Upload",
    description: "Drag and drop your PDF, DOCX, or TXT file. Data stays encrypted and private.",
    points: ["Supports multiple formats", "End-to-end encryption"],
    icon: <ShieldCheck className="w-10 h-10 text-emerald-400" />,
    color: "emerald-400",
  },
  {
    step: "Step 2",
    title: "Get Instant Analysis",
    description: "AI generates dashboards with summaries, risks, and insights instantly.",
    points: ["Summaries", "Risk detection", "Key term highlights"],
    icon: <BarChart3 className="w-10 h-10 text-indigo-400" />,
    color: "indigo-400",
  },
  {
    step: "Step 3",
    title: "Ask Anything",
    description: "Use the Ask AI Expert feature to get plain-English answers.",
    points: ["Context-aware Q&A", "Clear explanations"],
    icon: <MessagesSquare className="w-10 h-10 text-pink-400" />,
    color: "pink-400",
  },
];

export function KnowMoreSection() {
  return (
    <section
      id="know-more"
      className="relative z-20 py-20 sm:py-28 min-h-screen flex flex-col justify-center"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          How It <span className="text-indigo-400">Works</span>
        </h2>
        <p className="text-lg text-white/70 max-w-2xl mx-auto mb-16">
          Transform your documents into actionable insights in three simple
          steps.
        </p>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, idx) => (
            <li key={idx} className="list-none">
              <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                <GlowingEffect
                  blur={0}
                  borderWidth={3}
                  spread={80}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border border-white/10 bg-black/30 backdrop-blur-xl p-6">
                  <div className="flex flex-col gap-4 text-left">
                    <span className="text-sm uppercase tracking-wide text-white/60">
                      {step.step}
                    </span>
                    <div className="flex items-center gap-3">
                      {step.icon}
                      <h3 className="text-2xl font-semibold text-white">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-white/80">{step.description}</p>
                    <ul className="space-y-2 text-white/70 text-sm">
                      {step.points.map((point, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-white/50" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Data for the "Documents Supported" section
const supportedDocuments = [
  "Non-Disclosure Agreements (NDAs)",
  "Employment Contracts",
  "Rental & Lease Agreements",
  "Terms of Service",
  "Privacy Policies",
  "General Business Contracts",
  "Sales Agreements",
  "Service Contracts",
];

// MODIFIED: "Documents Supported" component no longer uses CometCard
function DocumentsSupported() {
  return (
    <div className="relative z-10">
      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
        Documents Supported
      </h2>
      <ul className="space-y-3">
        {supportedDocuments.map((doc, idx) => (
          <li key={idx} className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <span className="text-white/90">{doc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// New Component: FAQ Section
const faqs = [
  {
    q: "How does LegalMind AI keep my documents safe?",
    a: "We use end-to-end encryption and never share your data with third parties.",
  },
  {
    q: "What types of documents can I upload?",
    a: "We support PDF, DOCX, and TXT files for legal analysis.",
  },
  {
    q: "Can I ask questions about my document?",
    a: "Yes, use the 'Ask AI Expert' feature to get plain-English answers about specific sections.",
  },
];

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    // The border is now on the item itself for better spacing
    <div className="border-b border-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        // 👇 CRITICAL: These classes reset default button styles
        className="w-full flex justify-between items-center text-left py-6 appearance-none bg-transparent border-none focus:outline-none"
      >
        <h3 className="text-lg font-medium text-white transition-colors hover:text-red-300">
          {question}
        </h3>
        <ChevronDown 
          className={`w-6 h-6 text-white/50 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-6' : 'max-h-0'}`}
      >
        <p className="text-white/70">
          {answer}
        </p>
      </div>
    </div>
  );
};

export function FAQSection() {
  return (
    <section className="relative z-5 w-full bg-gray-940 px-4 sm:px-8 py-16 sm:py-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-10 gap-12 items-start">
        {/* Left Column: FAQ (70% width) */}
        <div className="lg:col-span-6">
          <CometCard>
            <div className="flex h-full flex-col rounded-2xl bg-[#1F2121] p-6 md:p-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Frequently Asked Questions
              </h2>
              {faqs.map((faq, idx) => (
                <FAQItem key={idx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </CometCard>
        </div>

        {/* Right Column: Documents Supported (30% width) */}
        <div className="lg:col-span-4">
          <DocumentsSupported />
        </div>
      </div>
    </section>
  );
}

// New Component: Footer
const Footer = () => (
  <footer className="py-8 bg-white/5 dark:bg-black/10 border-t border-white/20 backdrop-blur-lg">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white/60">
      <p>&copy; {new Date().getFullYear()} LegalMind AI. All Rights Reserved.</p>
      <div className="flex justify-center gap-6 mt-4">
        <a href="#" className="hover:text-white">Privacy Policy</a>
        <a href="#" className="hover:text-white">Terms of Service</a>
      </div>
    </div>
  </footer>
);

export default function Home() {
  const [pageState, setPageState] = useState<"home" | "upload">("home");
  const [isAuthed, setIsAuthed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [uploadStatus, setUploadStatus] = useState<FileStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    const unsub = firebaseAuthApi.onChange((user) => {
      setIsAuthed(!!user);
      setUser(user);
      if (!!user) {
        setPageState("home");
      }
    });
    return () => unsub?.();
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!user) {
      setError("You must be logged in to upload files.");
      return;
    }
  
    setFileToUpload(file);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setError("");
  
    try {
      // Upload file and create metadata
      const docId = await uploadFileAndCreateMetadata(user.uid, file, (progress) => {
        setUploadProgress(progress);
      });
  
      // Navigate to the document dashboard after successful upload & backend processing
      router.push(`/dashboard/${docId}`);
  
    } catch (err: unknown) {
      // Capture all errors safely
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Upload/processing failed:", message);
      setError(message);
      setUploadStatus("error");
      
      // Reset upload status after a short delay
      setTimeout(() => setUploadStatus("idle"), 4000);
    }
  };
  

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await firebaseAuthApi.signInWithGoogle();
    } catch (e) { 
      const error = e as { code?: string; message?: string };
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled. Please try again.");
      } else {
        setError(error?.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await firebaseAuthApi.signInAsGuest();
      // The `onAuthStateChanged` listener in useEffect will handle the rest
    } catch (e) {
      const error = e as { message?: string };
      setError(error?.message || "Guest sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountLink = async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await firebaseAuthApi.linkWithGoogle();
      // The `onAuthStateChanged` listener will automatically update the UI
      // now that the user is no longer anonymous.
      console.log("Account linked successfully!", userCredential.user);
    } catch (e) {
      const error = e as { code?: string; message?: string };
      // You can add more specific error handling here if needed
      if (error.code === 'auth/credential-already-in-use') {
        setError("This Google account is already in use.");
      } else if (error.code === 'auth/credential-already-in-use') {
        setError("This Google account is already in use.");
      } else {
        setError("Failed to link account. Please try again.");
      }
      console.error("Account linking failed:", e);
    } finally {
      setLoading(false);
    }
  };


  const renderContent = () => {
    if (pageState === "upload") {
      return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6">
          <FileUpload
            onFileSelect={handleFileSelect} // Pass the new handler
            status={uploadStatus}
            progress={uploadProgress}
            currentFile={fileToUpload}
            onFileRemove={() => {
              setUploadStatus("idle");
              setFileToUpload(null);
            }}
          />
          <Button
            onClick={() => setPageState("home")}
            variant="ghost"
            className="mt-4 text-white"
          >
            Go Back
          </Button>
        </div>
      );
    }

    return (
      <>
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white text-balance">
                Demystify Legal Documents with AI
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-white/80 text-pretty max-w-2xl mx-auto">
                Transform complex legal jargon into plain English. Get instant
                summaries, risk analysis, and expert guidance.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-4">
              {!isAuthed ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <CommandButton
                    onClick={handleGoogleLogin}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    {loading ? "Please wait..." : "Login/Signup with Google"}
                  </CommandButton>
                  <CommandButton
                    onClick={handleGuestLogin}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    Continue as a Guest
                  </CommandButton>
                </div>
              ) : (
                <CommandButton
                  onClick={() => setPageState("upload")}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Your Document
                </CommandButton>
              )}
              {error && <p className="mt-2 text-red-300 text-sm text-center">{error}</p>}
            </div>
          </div>
          {/* 👇 ADDED: Flickering Arrow */}
          <div className="absolute bottom-10 animate-bounce">
            <a href="#know-more" aria-label="Scroll down">
              <ArrowDown className="w-8 h-8 text-white/50" />
            </a>
          </div>
        </main>
        {/* 👇 ADDED: New Sections */}
        <KnowMoreSection />
        <FAQSection />
        <Footer />
        
      </>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BeamsBackground className="absolute inset-0 z-0" />
      <header className="relative z-11">
        <div className="absolute top-0 left-0 p-4">
          <div className="text-xl font-bold text-white m-0 p-4">
            LegalMind AI
          </div>
        </div>
        <div className="absolute top-0 right-0 p-7">
        {isAuthed && (
            <>
              {user?.isAnonymous ? (
                // 👇 UPDATE THE ONCLICK AND ADD LOADING/DISABLED STATE
                <Button 
                  onClick={handleAccountLink} 
                  variant="secondary"
                  disabled={loading}
                >
                  {loading ? "Linking..." : "Login / Signup"}
                </Button>
              ) : (
                <ProfileDropdown />
              )}
            </>
          )}
        </div>
      </header>
      {renderContent()}
    </div>
  );
}