import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { MessageSquare, EyeOff, Link2, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="container flex items-center h-14 max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm tracking-wide uppercase">Openlet</span>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl flex-1 flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-16 lg:mb-20">
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-5">
            404
          </p>
          <h1 className="text-4xl mb-4 leading-tight">
            This page doesn't exist.
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto mb-3 leading-relaxed">
            But while you're here — are you getting honest feedback from the
            people who matter?
          </p>
          <p className="text-sm text-muted-foreground mb-10">
            Most people aren't. Openlet fixes that.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-1.5">
              <Link to="/">
                Create your free page
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>

        {/* What Openlet is */}
        <div className="mb-16">
          <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-8">
            Why people use Openlet
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: EyeOff,
                title: "The feedback people won't say to your face",
                body: "When people know they're anonymous, they tell you what they actually think. That's when the useful stuff comes out.",
              },
              {
                icon: Link2,
                title: "One link does everything",
                body: "Create a page, set your question, share the link. Works in any bio, email, or chat. No app, no friction.",
              },
              {
                icon: Star,
                title: "Ratings and reasons together",
                body: "A 2-star rating with no context is useless. Openlet captures both the score and the story behind it.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title}>
                <CardContent className="pt-6 pb-6 px-5">
                  <Icon className="w-5 h-5 text-primary mb-4" />
                  <h3 className="text-sm mb-2 leading-snug">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Social proof strip */}
        <div className="border border-border rounded-lg p-6 mb-16 bg-secondary/30">
          <div className="grid grid-cols-3 divide-x divide-border text-center overflow-hidden">
            {[
              { stat: "30s", label: "to create your page" },
              { stat: "100%", label: "anonymous for respondents" },
              { stat: "Free", label: "forever, no credit card" },
            ].map(({ stat, label }) => (
              <div key={label} className="px-2 sm:px-6">
                <p className="text-2xl mb-1">{stat}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Example feedback card */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">
            What a response looks like
          </p>
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="pt-5 pb-5 px-5 text-left">
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4].map((n) => (
                    <Star
                      key={n}
                      className="w-4 h-4 fill-primary text-primary"
                    />
                  ))}
                  <Star className="w-4 h-4 text-border" />
                </div>
                <p className="text-sm leading-relaxed mb-3">
                  "The product is solid but the pricing page is confusing. I
                  couldn't tell what was included in the free tier. Almost
                  didn't sign up because of it."
                </p>
                <p className="text-xs text-muted-foreground">
                  Anonymous · 14 Mar 2026
                </p>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-4">
              That's the kind of feedback that actually helps you improve.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="container max-w-4xl flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Openlet</span>
          </div>
          <Button asChild size="sm">
            <Link to="/">Create your free page</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default NotFound;