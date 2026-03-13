import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getPageBySlug, submitResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Star,
  Check,
  MessageSquare,
  EyeOff,
  ShieldCheck,
  Zap,
  ArrowRight,
} from "lucide-react";

interface PageData {
  title: string;
  question: string;
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

function getSubmittedCookie(slug: string): boolean {
  return document.cookie.split("; ").some((c) => c === `submitted_${slug}=1`);
}

function setSubmittedCookie(slug: string) {
  // expires in 1 year
  const expires = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toUTCString();
  document.cookie = `submitted_${slug}=1; expires=${expires}; path=/; SameSite=Lax`;
}

// ── Turnstile widget ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: object) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function useTurnstile(onSuccess: (token: string) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Keep a stable ref to the callback so the effect never needs to re-run when
  // the parent re-renders — avoids the destroy/re-render loop.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const reset = useCallback(() => {
    if (widgetIdRef.current != null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let destroyed = false;

    const renderWidget = () => {
      if (destroyed || !containerRef.current || widgetIdRef.current != null)
        return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        // Wrap in a stable arrow so Turnstile always calls the latest handler
        // without the widget being re-created on every render.
        callback: (token: string) => onSuccessRef.current(token),
        "expired-callback": () => onSuccessRef.current(""),
        theme: "light",
        size: "normal",
      });
    };

    const ensureScript = () => {
      if (document.getElementById("cf-turnstile-script")) return;
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      // ?render=explicit tells Turnstile NOT to auto-scan the DOM, preventing
      // conflicts with our manual window.turnstile.render() call.
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    ensureScript();

    // Poll until both the Turnstile API and the container div are available.
    intervalId = setInterval(() => {
      if (window.turnstile && containerRef.current) {
        clearInterval(intervalId!);
        intervalId = null;
        renderWidget();
      }
    }, 50);

    return () => {
      destroyed = true;
      if (intervalId != null) clearInterval(intervalId);
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // Intentionally omit onSuccess — we use onSuccessRef so the widget is only
    // created once per mount, not recreated on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  return { containerRef, reset };
}

// ── Main component ────────────────────────────────────────────────────────────

const PublicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Spam prevention state
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const { containerRef, reset: resetTurnstile } = useTurnstile(
    useCallback((token: string) => setTurnstileToken(token), []),
  );

  // ── Load page data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;

    // Cookie check — instant UX, no server round-trip needed
    if (getSubmittedCookie(slug)) {
      setAlreadySubmitted(true);
      setLoading(false);
      return;
    }

    getPageBySlug(slug)
      .then((data: any) => setPage(data.page ?? data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // ── Load fingerprint ────────────────────────────────────────────────────────
  useEffect(() => {
    if (alreadySubmitted) return;
    import("@fingerprintjs/fingerprintjs").then((FingerprintJS) => {
      FingerprintJS.load().then((fp) => {
        fp.get().then((result) => setFingerprint(result.visitorId));
      });
    });
  }, [alreadySubmitted]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError("Please select a rating before submitting");
      return;
    }
    if (!turnstileToken) {
      setError("Bot check not completed yet. Please wait a moment.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await submitResponse(slug!, {
        rating,
        message: text,
        fingerprint,
        turnstileToken,
      });
      setSubmittedCookie(slug!);
      setSubmitted(true);
    } catch (e: any) {
      if (e.message === "already_submitted") {
        setAlreadySubmitted(true);
      } else {
        setError(e.message || "Failed to submit");
        resetTurnstile(); // get a fresh token on error
        setTurnstileToken(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── States ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between px-5 sm:px-8 lg:px-12 py-10 lg:py-16 bg-secondary/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">
              Openlet
            </span>
          </div>
          <div>
            <h2 className="text-3xl mb-4 leading-snug">
              Honest feedback,
              <br />
              finally.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-10">
              Create a free anonymous feedback page. Ask your audience anything.
              Get answers people actually mean.
            </p>
            <div className="space-y-3">
              {[
                "No login required for respondents",
                "Star ratings + written feedback",
                "Your own custom link",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Free forever · No credit card needed
          </p>
        </div>
        <div className="lg:w-1/2 flex flex-col items-center justify-center px-5 sm:px-8 lg:px-12 py-10 lg:py-16 text-center">
          <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mb-6">
            <MessageSquare className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-xl mb-2">Page not found</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs">
            This feedback page doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/" className="gap-1.5">
              Create your own page <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Already submitted — shown for both cookie hit AND server 429
  if (alreadySubmitted) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between px-5 sm:px-8 lg:px-12 py-10 lg:py-16 bg-secondary/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">
              Openlet
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Your privacy
            </p>
            <h2 className="text-3xl mb-4 leading-snug">
              You were heard.
              <br />
              Completely anonymously.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-10">
              No account, no tracking, no cookies linked to your identity. Your
              name was never asked for because it was never needed.
            </p>
            <div className="space-y-5">
              {[
                { icon: EyeOff, text: "Your identity is never stored" },
                { icon: ShieldCheck, text: "No tracking scripts or profiling" },
                {
                  icon: Zap,
                  text: "Response delivered instantly to the creator",
                },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Free forever · No credit card needed
          </p>
        </div>
        <div className="lg:w-1/2 flex flex-col items-center justify-center px-5 sm:px-8 lg:px-12 py-10 lg:py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Check className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-2xl mb-2">Already submitted.</h3>
          <p className="text-sm text-muted-foreground mb-10 max-w-xs">
            You've already left feedback on this page. Each person can respond
            once to keep things fair and honest.
          </p>
          <Card className="w-full max-w-xs text-left">
            <CardContent className="pt-5 pb-5 px-5">
              <p className="text-sm mb-1">Want feedback like this?</p>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Create your own anonymous feedback page on Openlet. Free, no
                credit card, takes 30 seconds.
              </p>
              <Button asChild size="sm" className="w-full gap-1.5">
                <Link to="/">
                  Create your page free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between px-5 sm:px-8 lg:px-12 py-10 lg:py-16 bg-secondary/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">
              Openlet
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Your privacy
            </p>
            <h2 className="text-3xl mb-4 leading-snug">
              You were heard.
              <br />
              Completely anonymously.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-10">
              No account, no tracking, no cookies linked to your identity. Your
              name was never asked for because it was never needed.
            </p>
            <div className="space-y-5">
              {[
                { icon: EyeOff, text: "Your identity is never stored" },
                { icon: ShieldCheck, text: "No tracking scripts or profiling" },
                {
                  icon: Zap,
                  text: "Response delivered instantly to the creator",
                },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Free forever · No credit card needed
          </p>
        </div>
        <div className="lg:w-1/2 flex flex-col items-center justify-center px-5 sm:px-8 lg:px-12 py-10 lg:py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-2xl mb-2">Thank you.</h3>
          <p className="text-sm text-muted-foreground mb-10 max-w-xs">
            Your response has been delivered. The creator sees your rating and
            message — but never who you are.
          </p>
          <Card className="w-full max-w-xs text-left">
            <CardContent className="pt-5 pb-5 px-5">
              <p className="text-sm mb-1">Want feedback like this?</p>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Create your own anonymous feedback page on Openlet. Free, no
                credit card, takes 30 seconds.
              </p>
              <Button asChild size="sm" className="w-full gap-1.5">
                <Link to="/">
                  Create your page free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — page context + trust signals */}
      <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between px-5 sm:px-8 lg:px-12 py-10 lg:py-16 bg-secondary/30 min-h-[auto] lg:min-h-screen">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-xs tracking-widest uppercase text-muted-foreground">
            Openlet
          </span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            You're responding to
          </p>
          <h1 className="text-3xl mb-3 leading-snug">{page?.title}</h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-xs mb-12">
            {page?.question}
          </p>
          <div className="space-y-6">
            {[
              {
                icon: EyeOff,
                title: "Completely anonymous",
                body: "Your name, email, and IP are never stored. Not even the creator knows who you are.",
              },
              {
                icon: ShieldCheck,
                title: "No account needed",
                body: "Just fill the form and hit submit. Nothing to sign up for, nothing to install.",
              },
              {
                icon: Zap,
                title: "Instant delivery",
                body: "Your response reaches the creator the moment you submit.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <div className="mt-0.5 shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm mb-0.5">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Want your own feedback page?{" "}
          <Link
            to="/"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Create one free on Openlet
          </Link>
        </p>
      </div>

      {/* Right — the form */}
      <div className="lg:w-1/2 flex items-center justify-center px-5 sm:px-8 lg:px-8 py-10 lg:py-16">
        <div className="w-full max-w-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8">
            Your anonymous response
          </p>

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Star rating */}
            <div>
              <p className="text-sm mb-3">How would you rate this?</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        n <= (hoverRating || rating)
                          ? "fill-primary text-primary"
                          : "text-border"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <p className="text-sm mb-2">
                Anything to add?{" "}
                <span className="text-muted-foreground text-xs">
                  (optional)
                </span>
              </p>
              <Textarea
                placeholder="Be honest. They can't see who you are."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            {/* Turnstile widget */}
            <div>
              <div
                ref={containerRef}
                style={{ minHeight: "65px", minWidth: "300px" }}
              />
              {!turnstileToken && (
                <p className="text-xs text-muted-foreground mt-2">
                  Completing bot check...
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={submitting || !turnstileToken}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Submit anonymously"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your identity is never revealed to anyone, ever.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PublicPage;