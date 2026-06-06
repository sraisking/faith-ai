"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import StarTrails from "@/components/StarTrails";
import { Loader2, Mail } from "lucide-react";

export default function Login() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Check your email for the magic link!");
    }
    setIsLoading(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, #0a0f1a 0%, #000000 100%)', overflow: 'hidden' }}>
      {/* Background Effects */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <StarTrails />
      </div>
      
      {/* Glow Orbs */}
      <div style={{ position: 'absolute', top: '25%', left: '25%', width: '400px', height: '400px', background: 'rgba(147, 51, 234, 0.2)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', mixBlendMode: 'screen' }} />
      <div style={{ position: 'absolute', bottom: '25%', right: '25%', width: '400px', height: '400px', background: 'rgba(37, 99, 235, 0.2)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', mixBlendMode: 'screen' }} />

      {/* Login Card */}
      <div className="glass-card" style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '450px',
        padding: '3rem 2.5rem',
        margin: '1rem',
        background: 'rgba(20, 20, 30, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.0))', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '1.875rem', fontFamily: 'system-ui' }}>✨</span>
          </div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem', backgroundImage: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)' }}>
            Faith AI
          </h1>
          <p style={{ color: 'rgba(199, 210, 254, 0.6)', fontSize: '1rem' }}>Sign in to save your spiritual journey</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <button 
            onClick={handleGoogleLogin}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', color: '#fff', fontSize: '1rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.3s ease',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0', opacity: 0.4 }}>
            <div style={{ flex: 1, height: '1px', background: '#fff' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', color: '#fff', textTransform: 'uppercase' }}>Or</span>
            <div style={{ flex: 1, height: '1px', background: '#fff' }}></div>
          </div>

          <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '1rem', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#9ca3af' }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.2)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email}
              style={{
                position: 'relative', width: '100%', padding: '0.875rem', borderRadius: '12px', fontWeight: 600, color: '#fff', overflow: 'hidden', transition: 'all 0.3s', border: 'none',
                background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
                boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
                opacity: isLoading || !email ? 0.7 : 1,
                cursor: isLoading || !email ? 'not-allowed' : 'pointer',
              }}
              onMouseOver={(e) => {
                if (!isLoading && email) e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                if (!isLoading && email) e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Sending...</span>
                </div>
              ) : (
                "Send Magic Link"
              )}
            </button>
          </form>

          {message && (
            <div style={{
              marginTop: '0.5rem', fontSize: '0.875rem', textAlign: 'center', padding: '0.75rem', borderRadius: '8px',
              ...(message.startsWith('Error') 
                ? { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
                : { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' })
            }}>
              {message}
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
