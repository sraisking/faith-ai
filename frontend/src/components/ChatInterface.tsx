"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Loader2, Mic, Volume2, Menu, X, Clock } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { createClient } from '@/utils/supabase/client';
import AuthHeader from '@/components/AuthHeader';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reference?: string;
}

interface ChatInterfaceProps {
  title: string;
  themeColor: 'krishna' | 'bible' | 'quran';
  apiEndpoint: string;
  welcomeMessage: string;
}

export default function ChatInterface({ title, themeColor, apiEndpoint, welcomeMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: welcomeMessage }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const themeVar = `var(--theme-${themeColor})`;
  const themeGlowVar = `var(--theme-${themeColor}-glow)`;

  const [chatId, setChatId] = useState<string | null>(null);
  const [allChats, setAllChats] = useState<{id: string, created_at: string, messages: Message[]}[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const supabase = createClient();

  const [placeholder, setPlaceholder] = useState("Ask about what is right or wrong... (or tap mic to speak in any language)");

  useEffect(() => {
    const updatePlaceholder = () => {
      if (window.innerWidth < 640) {
        setPlaceholder("Ask a moral/ethical question...");
      } else {
        setPlaceholder("Ask about what is right or wrong... (or tap mic to speak in any language)");
      }
    };
    updatePlaceholder();
    window.addEventListener('resize', updatePlaceholder);
    return () => window.removeEventListener('resize', updatePlaceholder);
  }, []);

  const loadingMessages = {
    krishna: [
      "Consulting the Bhagavad Gita...",
      "Reflecting on Dharma...",
      "Translating ancient Sanskrit...",
      "Seeking wisdom from Lord Krishna...",
      "Aligning with cosmic truths..."
    ],
    bible: [
      "Searching the Holy Scriptures...",
      "Reflecting on the Gospel...",
      "Gathering biblical wisdom...",
      "Seeking the word of God...",
      "Finding grace in the verses..."
    ],
    quran: [
      "Opening the Holy Quran...",
      "Reflecting on the Surahs...",
      "Gathering Islamic wisdom...",
      "Seeking guidance from Allah...",
      "Translating divine verses..."
    ]
  };

  const currentLoadingMessages = loadingMessages[themeColor] || loadingMessages.krishna;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessageIdx((prev) => (prev + 1) % currentLoadingMessages.length);
      }, 2500);
    } else {
      setLoadingMessageIdx(0);
    }
    return () => clearInterval(interval);
  }, [isLoading, currentLoadingMessages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load previous chats
  useEffect(() => {
    async function loadChats() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data, error } = await supabase
          .from('chats')
          .select('id, created_at, messages')
          .eq('theme', themeColor)
          .order('created_at', { ascending: false });
        
        if (data && data.length > 0) {
          setAllChats(data);
          setChatId(data[0].id);
          setMessages(data[0].messages);
        } else {
          // Check local storage for migrate
          const saved = localStorage.getItem(`faith-ai-chat-${themeColor}`);
          if (saved) {
            try { setMessages(JSON.parse(saved)); } catch (e) {}
          }
        }
      } else {
        const saved = localStorage.getItem(`faith-ai-chat-${themeColor}`);
        if (saved) {
          try {
            setMessages(JSON.parse(saved));
          } catch (e) {
            console.error("Could not parse saved chats", e);
          }
        }
      }
    }
    loadChats();
  }, [themeColor, supabase]);

  // Save chats
  useEffect(() => {
    async function syncChats() {
      if (messages.length > 1) { // Save only if there's actual conversation
        localStorage.setItem(`faith-ai-chat-${themeColor}`, JSON.stringify(messages));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (chatId) {
            await supabase.from('chats').update({ messages }).eq('id', chatId);
            setAllChats(prev => prev.map(c => c.id === chatId ? { ...c, messages } : c));
          } else {
            const { data, error } = await supabase.from('chats').insert({
              user_id: user.id,
              theme: themeColor,
              messages: messages
            }).select('id, created_at, messages').single();
            
            if (data) {
              setChatId(data.id);
              setAllChats(prev => [data, ...prev]);
            }
          }
        }
      }
    }
    syncChats();
  }, [messages, themeColor, chatId, supabase]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.start();
  };

  const playAudio = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Create a plain-text version for speech (strip basic markdown characters)
    const plainText = text.replace(/[*_#`\n]/g, ' ');

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = navigator.language || 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content })
      });
      
      const data = await res.json();
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.error || "An error occurred retrieving the wisdom.",
        reference: data.reference
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
      // Auto-play the AI's response text is disabled per user request
      // playAudio(assistantMsg.content);

    } catch (error) {
      console.error('Failed to fetch reply', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I am unable to connect to my wisdom sources at this moment. Please try again later."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass-panel chat-header" style={{ 
        margin: '1rem', 
        padding: '1rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: `2px solid ${themeVar}`,
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && (
            <button onClick={() => setIsDrawerOpen(true)} style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Menu size={20} color="var(--text-primary)" />
            </button>
          )}
          <Link href="/" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', cursor: 'pointer' }}>
            <ArrowLeft size={20} color="var(--text-primary)" />
          </Link>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AuthHeader inline />
          {user && (
            <button onClick={() => { 
              setMessages([{ id: '1', role: 'assistant', content: welcomeMessage }]); 
              setChatId(null);
            }} style={{ background: themeVar, border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
              New Chat
            </button>
          )}
          <button onClick={async () => { 
            if(confirm("Clear current chat history?")) { 
              localStorage.removeItem(`faith-ai-chat-${themeColor}`); 
              setMessages([{ id: '1', role: 'assistant', content: welcomeMessage }]); 
              if (chatId) {
                await supabase.from('chats').delete().eq('id', chatId);
                setAllChats(prev => prev.filter(c => c.id !== chatId));
                setChatId(null);
              }
            } 
          }} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>
            Clear Chat
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="container chat-messages-container" style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '800px' }}>
        {!user && (
          <div className="guest-banner animate-fade-in">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💡</span>
              <span><strong>Beta Version:</strong> Guest chat history is saved locally. Sign in to save your conversations to the database and sync across devices.</span>
            </span>
            <Link href="/login" className="guest-banner-btn">
              Sign In
            </Link>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            width: '100%'
          }}>
            <div className={`glass-card animate-fade-in chat-bubble ${msg.role === 'user' ? 'user-msg' : 'ai-msg'}`} style={{
              padding: '1rem 1.5rem',
              maxWidth: '80%',
              background: msg.role === 'user' ? themeVar : 'var(--bg-glass)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              borderRadius: msg.role === 'user' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
            }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                   <button 
                     onClick={() => playAudio(msg.content)}
                     style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                     title="Read Aloud"
                   >
                     <Volume2 size={16} /> Listen
                   </button>
                </div>
              )}
              <div style={{ 
                lineHeight: '1.6', 
                fontSize: '1rem', 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              
              {/* Reference Citation */}
              {msg.reference && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${themeVar}`,
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)'
                }}>
                  <strong style={{ color: themeVar }}>Reference:</strong> {msg.reference}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: themeVar, background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '24px', alignSelf: 'flex-start', border: '1px solid var(--border-color)' }}>
            <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1.5s linear infinite' }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.02em', transition: 'opacity 0.3s' }}>
              {currentLoadingMessages[loadingMessageIdx]}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* History Drawer */}
      {user && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99, opacity: isDrawerOpen ? 1 : 0, pointerEvents: isDrawerOpen ? 'auto' : 'none', transition: 'opacity 0.3s' }}
            onClick={() => setIsDrawerOpen(false)}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: '320px', background: 'var(--bg-primary)', borderRight: '1px solid var(--border-color)', zIndex: 100,
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={20} color={themeVar} /> Chat History</h2>
              <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {allChats.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No past conversations found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {allChats.map(chat => {
                    // Extract a preview of the first user message
                    const firstUserMsg = chat.messages.find(m => m.role === 'user');
                    const preview = firstUserMsg ? firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '') : 'New Conversation';
                    const date = new Date(chat.created_at).toLocaleDateString();
                    
                    return (
                      <button 
                        key={chat.id}
                        onClick={() => {
                          setChatId(chat.id);
                          setMessages(chat.messages);
                          setIsDrawerOpen(false);
                        }}
                        style={{
                          background: chatId === chat.id ? 'var(--bg-secondary)' : 'transparent',
                          border: `1px solid ${chatId === chat.id ? themeVar : 'var(--border-color)'}`,
                          borderRadius: '12px', padding: '1rem', textAlign: 'left', cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
                          display: 'flex', flexDirection: 'column', gap: '0.25rem'
                        }}
                        onMouseOver={(e) => { if(chatId !== chat.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseOut={(e) => { if(chatId !== chat.id) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{preview}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{date}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Input Area */}
      <div className="chat-input-wrapper" style={{ padding: '1rem 2rem 2rem 2rem', display: 'flex', justifyContent: 'center' }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '800px', display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={startListening}
            disabled={!user && messages.filter(m => m.role === 'user').length >= 2}
            style={{
              background: isListening ? '#ef4444' : 'var(--bg-secondary)',
              color: isListening ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (!user && messages.filter(m => m.role === 'user').length >= 2) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, color 0.2s',
              flexShrink: 0,
              opacity: (!user && messages.filter(m => m.role === 'user').length >= 2) ? 0.5 : 1
            }}
            title={isListening ? "Listening..." : "Speak"}
          >
            <Mic size={24} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!user && messages.filter(m => m.role === 'user').length >= 2}
            placeholder={(!user && messages.filter(m => m.role === 'user').length >= 2) ? "Free limit reached. Please sign in." : placeholder}
            className="glass-panel"
            style={{
              flex: 1,
              padding: '1rem 1.5rem',
              fontSize: '1rem',
              color: 'var(--text-primary)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              outline: 'none',
              borderRadius: '24px',
              transition: 'border-color 0.2s',
              cursor: (!user && messages.filter(m => m.role === 'user').length >= 2) ? 'not-allowed' : 'text',
            }}
            onFocus={(e) => e.target.style.borderColor = themeVar}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || (!user && messages.filter(m => m.role === 'user').length >= 2)}
            style={{
              background: themeVar,
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (isLoading || !input.trim() || (!user && messages.filter(m => m.role === 'user').length >= 2)) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !input.trim() || (!user && messages.filter(m => m.role === 'user').length >= 2)) ? 0.6 : 1,
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: `0 4px 12px ${themeGlowVar}`,
              flexShrink: 0
            }}
          >
            <Send size={24} />
          </button>
        </form>
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
