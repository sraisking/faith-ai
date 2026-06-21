"use client";

import { useEffect, useState } from "react";
import { authClient, AuthUser } from "@/utils/auth";
import Link from "next/link";

export default function AuthHeader({ inline = false }: { inline?: boolean }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    authClient.getUser().then((currUser) => {
      setUser(currUser);
    });

    const handleAuthChange = () => {
      authClient.getUser().then(setUser);
    };

    window.addEventListener("auth-state-change", handleAuthChange);
    return () => window.removeEventListener("auth-state-change", handleAuthChange);
  }, []);

  const handleSignOut = async () => {
    authClient.logout();
    setUser(null);
  };

  const containerStyles: React.CSSProperties = inline
    ? { display: 'flex', alignItems: 'center', gap: '1rem' }
    : { position: 'absolute', top: '1rem', right: '1rem', zIndex: 50, display: 'flex', alignItems: 'center', gap: '1rem' };

  return (
    <div className={inline ? "auth-header-inline" : "auth-header-container"} style={containerStyles}>
      {user ? (
        <>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="hidden-mobile">
            {user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="glass-panel"
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', border: '1px solid var(--border-color)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            Sign Out
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="glass-panel"
          style={{ textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', border: '1px solid var(--border-color)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          Sign In
        </Link>
      )}
    </div>
  );
}
