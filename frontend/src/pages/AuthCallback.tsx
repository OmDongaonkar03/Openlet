import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { googleAuth } from "@/lib/api";
import { MessageSquare } from "lucide-react";

function getRedirectUri() {
  return `${window.location.origin}/auth/callback`;
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setAuthed } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");

    if (errorParam) {
      // User denied Google permission
      navigate("/", { replace: true });
      return;
    }

    if (!code) {
      navigate("/", { replace: true });
      return;
    }

    googleAuth(code, getRedirectUri())
      .then(() => {
        setAuthed(true);
        navigate("/dashboard", { replace: true });
      })
      .catch((e) => {
        setError(e.message || "Sign-in failed. Please try again.");
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <MessageSquare className="w-8 h-8 text-primary mb-4" />
        <h2 className="text-lg mb-2">Sign-in failed</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <MessageSquare className="w-6 h-6 text-primary animate-pulse" />
      <p className="text-sm text-muted-foreground">Signing you in...</p>
    </div>
  );
};

export default AuthCallback;