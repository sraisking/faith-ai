"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

export default function AuthHeader() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 50, display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {user ? (
        <>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="hidden-mobile">
            {user.email || user.phone}
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
