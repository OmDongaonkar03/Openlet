const API_URL = import.meta.env.VITE_API_URL || "";

// Access token (localStorage)

function getToken(): string | null {
  return localStorage.getItem("openlet_token");
}

function setToken(token: string) {
  localStorage.setItem("openlet_token", token);
}

function removeToken() {
  localStorage.removeItem("openlet_token");
}

// Silent refresh
// Called automatically when a request returns 401. Hits /auth/refresh with
// the httpOnly refresh cookie (credentials: "include"), gets a new access
// token, stores it, and returns true so the caller can retry.

let refreshPromise: Promise<boolean> | null = null;

async function silentRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts — only one in-flight at a time
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // send the httpOnly cookie
      });
      if (!res.ok) {
        removeToken();
        return false;
      }
      const data = await res.json();
      setToken(data.accessToken);
      return true;
    } catch {
      removeToken();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Core request helper
// On a 401, attempts one silent refresh and retries the original request.
// If the refresh also fails, throws so callers can redirect to login.

async function request(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      // Retry once with the new access token
      return request(path, options, false);
    }
    window.dispatchEvent(new Event("session:expired"));
    throw new Error("session_expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || body.message || "Request failed");
  }

  return res.json();
}

// Auth

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // receive the refresh cookie
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(body.error || "Login failed");
  }
  const data = await res.json();
  setToken(data.accessToken);
  return data;
}

export async function register(email: string, password: string, name: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // receive the refresh cookie
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: "Registration failed" }));
    throw new Error(body.error || "Registration failed");
  }
  const data = await res.json();
  setToken(data.accessToken);
  return data;
}

export async function logout() {
  removeToken();
  // Tell the server to blacklist the refresh token + clear the cookie
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

export async function bootstrapSession(): Promise<boolean> {
  // Called once on app mount — tries to rehydrate a session from the
  // httpOnly refresh cookie if no valid access token exists in localStorage.
  if (getToken()) return true;
  return silentRefresh();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Feedback Pages

export async function getMyPages() {
  const data = await request("/pages");
  return data.pages;
}

export async function createPage(data: {
  title: string;
  question: string;
  slug: string;
}) {
  return request("/pages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePage(
  slug: string,
  data: { title: string; question: string },
) {
  return request(`/pages/${slug}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePage(slug: string) {
  return request(`/pages/${slug}`, { method: "DELETE" });
}

export async function getPageBySlug(slug: string) {
  return request(`/pages/${slug}`);
}

// Responses

export async function submitResponse(
  slug: string,
  data: {
    rating: number;
    message: string;
    fingerprint: string | null;
    turnstileToken: string;
  },
) {
  return request(`/responses/${slug}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getResponses(slug: string, cursor?: string, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return request(`/responses/${slug}?${params.toString()}`);
}