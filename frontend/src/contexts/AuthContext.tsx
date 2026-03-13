import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  isAuthenticated,
  logout as apiLogout,
  bootstrapSession,
} from "@/lib/api";

interface AuthContextType {
  authed: boolean;
  setAuthed: (v: boolean) => void;
  logout: () => void;
  // true while the initial cookie→token bootstrap is in flight
  bootstrapping: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // On mount: try to rehydrate session from the httpOnly refresh cookie.
  // This handles page reloads — the access token may be gone from localStorage
  // but the cookie is still valid, so we silently get a fresh access token.
  useEffect(() => {
    bootstrapSession()
      .then((ok) => setAuthed(ok))
      .finally(() => setBootstrapping(false));
  }, []);

  // Redirect logged-in users away from '/'
  useEffect(() => {
    if (!bootstrapping && authed && location.pathname === "/") {
      navigate("/dashboard", { replace: true });
    }
  }, [authed, bootstrapping, location.pathname, navigate]);

  // Listen for session_expired errors thrown by api.ts after a failed refresh.
  // Any component can dispatch this event to force a logout.
  useEffect(() => {
    const handler = () => {
      setAuthed(false);
      navigate("/", { replace: true });
    };
    window.addEventListener("session:expired", handler);
    return () => window.removeEventListener("session:expired", handler);
  }, [navigate]);

  const logout = async () => {
    await apiLogout();
    setAuthed(false);
    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ authed, setAuthed, logout, bootstrapping }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}