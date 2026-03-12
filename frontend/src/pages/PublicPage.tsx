import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!slug) return;
    getPageBySlug(slug)
      .then((data: any) => setPage(data.page ?? data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating before submitting");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitResponse(slug!, { rating, message: text });
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

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
        {/* Left */}
        <div className="lg:w-1/2 border-r border-border flex flex-col justify-between px-12 py-16 bg-secondary/30 min-h-[40vh] lg:min-h-screen">
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
        {/* Right */}
        <div className="lg:w-1/2 flex flex-col items-center justify-center px-12 py-16 text-center">
          <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mb-6">
            <MessageSquare className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-xl mb-2">Page not found</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs">
            This feedback page doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/" className="gap-1.5">
              Create your own page
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left — what Openlet is */}
        <div className="lg:w-1/2 border-r border-border flex flex-col justify-between px-12 py-16 bg-secondary/30 min-h-[40vh] lg:min-h-screen">
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
              No account, no tracking, no cookies. Your name was never asked for
              because it was never needed.
            </p>
            <div className="space-y-5">
              {[
                { icon: EyeOff, text: "Your identity is never stored" },
                { icon: ShieldCheck, text: "No cookies or tracking scripts" },
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
        {/* Right — thank you + CTA */}
        <div className="lg:w-1/2 flex flex-col items-center justify-center px-12 py-16 text-center">
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
                  Create your page free
                  <ArrowRight className="w-3.5 h-3.5" />
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
      <div className="lg:w-1/2 border-r border-border flex flex-col justify-between px-12 py-16 bg-secondary/30 min-h-[40vh] lg:min-h-screen">
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
      <div className="lg:w-1/2 flex items-center justify-center px-8 py-16">
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
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