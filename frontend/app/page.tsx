"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BeamsBackground from "@/components/kokonutui/beams-background";
import MatrixText from "@/components/kokonutui/matrix-text";
import { CommandButton } from "@/components/kokonutui/command-button";
import { Upload } from "lucide-react";
import ProfileDropdown from "@/components/kokonutui/profile-dropdown";
import FileUpload from "@/components/kokonutui/file-upload";
import { Button } from "@/components/ui/button";
import { firebaseAuthApi, uploadFileAndCreateMetadata } from "@/lib/firebase"; // 👈 Updated import
import type { User } from "firebase/auth";

export default function Home() {
  const [pageState, setPageState] = useState<"home" | "upload">("home");
  const [isAuthed, setIsAuthed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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

  // ✅ Simplified upload handler
  const handleUploadSuccess = async (file: File) => {
    if (!user) {
      setError("You must be logged in to upload files.");
      return;
    }

    try {
      setLoading(true);
      
      // 1. Call the new, consolidated upload function
      const docId = await uploadFileAndCreateMetadata(user.uid, file);

      // 2. Redirect to the dashboard for the new document
      router.push(`/dashboard/${docId}`);

    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await firebaseAuthApi.signInWithGoogle();
    } catch (e) { 
      // Assert the type of 'e' to access its properties safely
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

  const renderContent = () => {
    if (pageState === "upload") {
      return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
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
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white text-balance">
              Demystify Legal Documents with AI
            </h1>
            <p className="text-xl md:text-2xl text-white/80 text-pretty max-w-2xl mx-auto">
              Transform complex legal jargon into plain English. Get instant
              summaries, risk analysis, and expert guidance.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4">
            {!isAuthed ? (
              <CommandButton
                onClick={handleGoogleLogin}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                {loading ? "Please wait..." : "Login/Signup with Google to Get Started"}
              </CommandButton>
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
      </main>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BeamsBackground className="absolute inset-0 z-0" />
      <header className="relative z-11">
        <div className="absolute top-0 left-0 p-4">
          <MatrixText
            text="LegalMind AI"
            className="text-lg font-bold text-white m-0"
          />
        </div>
        <div className="absolute top-0 right-0 p-4">
          <ProfileDropdown />
        </div>
      </header>
      {renderContent()}
    </div>
  );
}

