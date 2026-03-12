import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAuthenticated, logout as apiLogout } from "@/lib/api";

interface AuthContextType {
  authed: boolean;
  setAuthed: (v: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(isAuthenticated());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  // Redirect logged-in users away from '/'
  useEffect(() => {
    if (authed && location.pathname === "/") {
      navigate("/dashboard", { replace: true });
    }
  }, [authed, location.pathname, navigate]);

  const logout = () => {
    apiLogout();
    setAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ authed, setAuthed, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}