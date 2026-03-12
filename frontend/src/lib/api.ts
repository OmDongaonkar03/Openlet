const API_URL = import.meta.env.VITE_API_URL || "";

function getToken(): string | null {
  return localStorage.getItem("openlet_token");
}

function setToken(token: string) {
  localStorage.setItem("openlet_token", token);
}

function removeToken() {
  localStorage.removeItem("openlet_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || body.message || "Request failed");
  }
  return res.json();
}

// Auth
export async function login(email: string, password: string) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function register(email: string, password: string, name: string) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  setToken(data.token);
  return data;
}

export function logout() {
  removeToken();
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

export async function getPageBySlug(slug: string) {
  return request(`/pages/${slug}`);
}

// Responses
export async function submitResponse(
  slug: string,
  data: { rating: number; message: string; fingerprint: string | null; turnstileToken: string },
) {
  return request(`/responses/${slug}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getResponses(slug: string) {
  return request(`/responses/${slug}`);
}