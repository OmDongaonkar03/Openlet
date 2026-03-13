import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getResponses } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Star,
  MessageSquare,
  Copy,
  Share2,
  TrendingUp,
  Download,
} from "lucide-react";
import { toast } from "sonner";

interface Response {
  id: string;
  rating: number;
  message: string;
  created_at: string;
}

interface ResponsesData {
  page: { title: string; slug: string; question: string };
  stats: { total: number; avg_rating: number | null };
  responses: Response[];
}

const ratingLabel = (avg: number) => {
  if (avg >= 4.5) return "Excellent";
  if (avg >= 3.5) return "Good";
  if (avg >= 2.5) return "Mixed";
  if (avg >= 1.5) return "Poor";
  return "Very poor";
};

function exportToCSV(data: ResponsesData) {
  const escape = (val: string | number) => {
    const str = String(val ?? "");
    // Wrap in quotes if it contains a comma, quote, or newline
    return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const headers = ["id", "rating", "message", "submitted_at"];
  const rows = data.responses.map((r) => [
    escape(r.id),
    escape(r.rating),
    escape(r.message ?? ""),
    escape(new Date(r.created_at).toISOString()),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.page.slug}-responses.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const Responses = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ResponsesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    getResponses(slug)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const copyLink = () => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast("Link copied — share it to get more responses.");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-14 max-w-3xl">
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
            <Link to="/dashboard">
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          </Button>
          {data && (
            <div className="flex items-center gap-2">
              {data.responses.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(data)}
                  className="gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy page link
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container max-w-3xl py-12">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">
            Unable to load responses.
          </p>
        ) : (
          <>
            {/* Page header */}
            <div className="mb-10">
              <h1 className="text-2xl mb-1">{data.page.title}</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {data.page.question}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-2xl">{data.stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.stats.total === 1 ? "Response" : "Responses"}
                  </p>
                </div>
                {data.stats.avg_rating && (
                  <>
                    <Separator orientation="vertical" className="h-8" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-2xl">
                          {data.stats.avg_rating.toFixed(1)}
                        </p>
                        <Star className="w-4 h-4 fill-primary text-primary mb-0.5" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ratingLabel(data.stats.avg_rating)} avg rating
                      </p>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div>
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`w-3.5 h-3.5 ${n <= Math.round(data.stats.avg_rating!) ? "fill-primary text-primary" : "text-border"}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Average</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {data.responses.length === 0 ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="py-14 px-8 text-center">
                    <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mx-auto mb-5">
                      <Share2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg mb-2">No responses yet</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                      Your page is live. People just need to find it. Share the
                      link and your first response will come.
                    </p>
                    <Button onClick={copyLink} className="gap-1.5">
                      <Copy className="w-3.5 h-3.5" />
                      Copy your page link
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      icon: Share2,
                      title: "Put it in your bio",
                      body: "Twitter, Instagram, LinkedIn — your audience is already there.",
                    },
                    {
                      icon: MessageSquare,
                      title: "Add it to your emails",
                      body: "A footer link to your feedback page works better than you'd think.",
                    },
                    {
                      icon: TrendingUp,
                      title: "Share in communities",
                      body: "Ask for feedback in Discord servers, Slack groups, or subreddits.",
                    },
                  ].map(({ icon: Icon, title, body }) => (
                    <Card key={title}>
                      <CardContent className="pt-5 pb-5 px-4">
                        <Icon className="w-4 h-4 text-primary mb-3" />
                        <p className="text-sm mb-1">{title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {body}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {data.responses.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="py-5 px-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-3.5 h-3.5 ${
                                n <= r.rating
                                  ? "fill-primary text-primary"
                                  : "text-border"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(r.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {r.message ? (
                        <p className="text-sm leading-relaxed">{r.message}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No written feedback
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <div className="pt-6 border-t border-border mt-6 text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    More responses = more signal. Keep sharing your link.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    className="gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy page link
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Responses;