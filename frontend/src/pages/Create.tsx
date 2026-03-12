import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Eye,
  Sparkles,
  Share2,
  MessageSquare,
  Star,
} from "lucide-react";

const Create = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sanitizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const previewUrl = `${window.location.origin}/p/${sanitizedSlug || "your-slug"}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sanitizedSlug) {
      setError("Please enter a valid slug");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createPage({ title, question, slug: sanitizedSlug });
      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message || "Failed to create page");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — what happens after you create */}
      <div className="lg:w-2/5 border-r border-border flex flex-col justify-between px-10 py-16 bg-secondary/30">
        <div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 -ml-2 mb-12"
          >
            <Link to="/dashboard">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </Button>

          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
            How it works
          </p>
          <h2 className="text-2xl mb-10 leading-snug">
            Three steps to feedback that's actually honest.
          </h2>

          <div className="space-y-8">
            {[
              {
                icon: Sparkles,
                step: "01",
                title: "Create your page",
                body: "Give it a title and write the one question you want people to answer. Set a custom URL they'll remember.",
              },
              {
                icon: Share2,
                step: "02",
                title: "Share the link",
                body: "Drop it in your bio, email footer, a WhatsApp message, or a Notion doc. Anyone with the link can respond.",
              },
              {
                icon: MessageSquare,
                step: "03",
                title: "Read honest responses",
                body: "Because people know they're anonymous, they tell you what they actually think — not what they think you want to hear.",
              },
            ].map(({ icon: Icon, step, title, body }) => (
              <div key={step} className="flex gap-4">
                <div className="shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      {step}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border border-border rounded-lg p-4 bg-background">
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className="w-3.5 h-3.5 fill-primary text-primary" />
            ))}
          </div>
          <p className="text-sm mb-2 leading-relaxed">
            "Your onboarding flow is confusing after step 3. I almost gave up."
          </p>
          <p className="text-xs text-muted-foreground">
            — Anonymous · 2 hours ago
          </p>
        </div>
      </div>

      {/* Right — the form */}
      <div className="lg:w-3/5 flex items-center justify-center px-10 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl mb-2">Create a feedback page</h1>
          <p className="text-sm text-muted-foreground mb-10">
            Takes 30 seconds. Your audience will thank you for asking.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Page title</Label>
              <Input
                id="title"
                placeholder="e.g. Roast my portfolio"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                This is what people see when they land on your page.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="question">Your question</Label>
              <Textarea
                id="question"
                placeholder="e.g. What's the one thing you'd change about my work?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Ask the thing you actually want to know. One focused question
                gets better answers than five vague ones.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Custom URL slug</Label>
              <Input
                id="slug"
                placeholder="e.g. roast-my-portfolio"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                <Eye className="w-3 h-3 shrink-0" />
                <span className="truncate font-mono">{previewUrl}</span>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating your page..." : "Create page →"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Create;