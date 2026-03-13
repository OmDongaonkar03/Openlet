import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InfiniteGrid } from "@/components/ui/the-infinite-grid";
import { useAuth } from "@/contexts/AuthContext";
import { googleAuth } from "@/lib/api";
import { MessageSquare, Link2, Star } from "lucide-react";

// ── Google OAuth helpers ──────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

function getRedirectUri() {
  return `${window.location.origin}/auth/callback`;
}

function buildGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

const Index = () => {
  const navigate = useNavigate();
  const { setAuthed } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle OAuth callback — Google redirects back to /auth/callback?code=...
  // We catch it here if the user lands on / with a code param (shouldn't
  // normally happen, but handle it gracefully).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    // Clean the URL immediately so a page reload doesn't re-submit
    window.history.replaceState({}, "", "/");

    setLoading(true);
    googleAuth(code, getRedirectUri())
      .then(() => {
        setAuthed(true);
        navigate("/dashboard");
      })
      .catch((e) => {
        setError(e.message || "Google sign-in failed");
        setLoading(false);
      });
  }, []);

  const handleGoogleSignIn = () => {
    window.location.href = buildGoogleAuthUrl();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — Hero with Infinite Grid */}
      <div className="lg:w-1/2 h-52 sm:h-64 lg:h-auto lg:min-h-screen">
        <InfiniteGrid />
      </div>

      {/* Right — Auth */}
      <div className="lg:w-1/2 flex items-center justify-center px-5 sm:px-8 py-10 lg:py-0">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground tracking-wide uppercase">
                Openlet
              </span>
            </div>
            <h2 className="text-2xl mb-1">Get started</h2>
            <p className="text-sm text-muted-foreground">
              Create your free anonymous feedback page.
            </p>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            variant="outline"
            className="w-full gap-3 h-11"
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                {/* Google "G" logo SVG */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-4 h-4 shrink-0"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive mt-3 text-center">{error}</p>
          )}

          {/* Feature hints */}
          <div className="mt-10 space-y-3">
            {[
              { icon: Link2, text: "Share a simple link with anyone" },
              { icon: Star, text: "Collect star ratings + written feedback" },
              { icon: MessageSquare, text: "Responses are fully anonymous" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-8 text-center">
            By continuing, you agree to our terms. No password needed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;