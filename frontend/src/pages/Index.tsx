import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { InfiniteGrid } from "@/components/ui/the-infinite-grid";
import { useAuth } from "@/contexts/AuthContext";
import { login, register } from "@/lib/api";
import { LogIn, UserPlus, MessageSquare, Link2, Star } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { authed, setAuthed } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const handleAuth = async (mode: "login" | "register") => {
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      setAuthed(true);
      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — Hero with Infinite Grid */}
      <div className="lg:w-1/2 min-h-[50vh] lg:min-h-screen">
        <InfiniteGrid />
      </div>

      {/* Right — Auth */}
      <div className="lg:w-1/2 flex items-center justify-center px-6 py-16 lg:py-0">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground tracking-wide uppercase">
                Openlet
              </span>
            </div>
            <h2 className="text-2xl">Get started</h2>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full mb-6 bg-secondary">
              <TabsTrigger value="login" className="flex-1 gap-1.5">
                <LogIn className="w-3.5 h-3.5" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1 gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </TabsTrigger>
            </TabsList>

            {["login", "register"].map((mode) => (
              <TabsContent key={mode} value={mode}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAuth(mode as "login" | "register");
                  }}
                  className="space-y-4"
                >
                  {mode === "register" && (
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-email`}>Email</Label>
                    <Input
                      id={`${mode}-email`}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-password`}>Password</Label>
                    <Input
                      id={`${mode}-password`}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading
                      ? "Please wait..."
                      : mode === "login"
                        ? "Sign in"
                        : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>

          {/* Feature hints */}
          <div className="mt-12 space-y-3">
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
        </div>
      </div>
    </div>
  );
};

export default Index;
