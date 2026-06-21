export interface AuthUser {
  id: string;
  email: string;
}

export const authClient = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("faith_ai_token");
  },

  setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("faith_ai_token", token);
    window.dispatchEvent(new Event("auth-state-change"));
  },

  clearToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("faith_ai_token");
    window.dispatchEvent(new Event("auth-state-change"));
  },

  async getUser(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const res = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        return data.user;
      }
    } catch (e) {
      console.error("Failed to fetch user from backend:", e);
    }

    // Token was invalid or network error, let's clear it
    this.clearToken();
    return null;
  },

  async login(email: string): Promise<AuthUser> {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const res = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Authentication failed");
    }

    const data = await res.json();
    this.setToken(data.token);
    return data.user;
  },

  async loginWithGoogle(credentialToken: string): Promise<AuthUser> {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const res = await fetch(`${backendUrl}/api/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: credentialToken }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Google authentication failed");
    }

    const data = await res.json();
    this.setToken(data.token);
    return data.user;
  },

  logout(): void {
    this.clearToken();
  },
};
