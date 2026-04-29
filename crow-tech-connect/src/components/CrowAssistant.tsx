import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, X, Send, Loader2, Bot, User, Mic, MicOff, Volume2, VolumeX, Navigation } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crow-chat`;

const GREETING = "👋 Muli shani! I'm **Crow**, your CrowTech assistant. I can help you find services, navigate the platform, or answer questions — in English, Bemba, or Nyanja. Just say **\"go to services\"** or **\"find me a plumber\"** and I'll take you there! How can I help?";

const QUICK_PROMPTS = [
  "Find me a plumber",
  "Go to services",
  "How does CrowTech work?",
  "Take me to dashboard",
];

const LANG_MAP: Record<string, string> = {
  EN: 'en-ZA',  // South African English for African accent
  BM: 'bem',    // Bemba with African voice fallback
  NY: 'ny',     // Nyanja with African voice fallback
};

const NAV_REGEX = /\[NAV:(\/[^\]]*)\]/g;

const CrowAssistant = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'BM' | 'NY'>('EN');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef('');
  const navigatedPaths = useRef(new Set<string>());
  const sendMessageRef = useRef<(text: string) => void>();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } = useTextToSpeech({
    lang: LANG_MAP[language],
    preferMale: true,
  });

  // Speech recognition auto-sends on result
  const handleVoiceResult = useCallback((transcript: string) => {
    if (transcript.trim()) {
      // Auto-send the recognized speech immediately
      sendMessageRef.current?.(transcript);
    }
  }, []);

  const { isListening, startListening, stopListening, isSupported: sttSupported } = useSpeechRecognition({
    lang: LANG_MAP[language],
    onResult: handleVoiceResult,
    onError: (err) => console.warn('Speech recognition error:', err),
  });

  // Parse and execute navigation actions from assistant messages
  const processNavigation = useCallback((content: string) => {
    const matches = [...content.matchAll(NAV_REGEX)];
    if (matches.length > 0) {
      const path = matches[0][1];
      const key = content.slice(0, 50) + path;
      if (!navigatedPaths.current.has(key)) {
        navigatedPaths.current.add(key);
        setTimeout(() => {
          navigate(path);
        }, 600);
      }
    }
  }, [navigate]);

  // Auto-speak and auto-navigate new assistant messages
  useEffect(() => {
    if (isLoading) return;
    const last = messages[messages.length - 1];
    if (last?.role !== 'assistant' || last.content === GREETING) return;

    // Navigate
    processNavigation(last.content);

    // Speak
    if (ttsEnabled && ttsSupported && last.content !== lastSpokenRef.current) {
      lastSpokenRef.current = last.content;
      const plainText = last.content
        .replace(NAV_REGEX, '')
        .replace(/[*_#`~\[\]()>|]/g, '')
        .replace(/\n+/g, '. ');
      speak(plainText, LANG_MAP[language]);
    }
  }, [messages, isLoading, ttsEnabled, ttsSupported, speak, language, processNavigation]);

  // Render message content with nav actions stripped but shown as buttons
  const renderContent = (content: string) => {
    const cleanContent = content.replace(NAV_REGEX, '').trim();
    const navMatches = [...content.matchAll(NAV_REGEX)];

    return (
      <>
        <div className="prose prose-sm max-w-none [&_p]:my-1 [&_strong]:text-foreground [&_ul]:my-1 [&_li]:my-0">
          <ReactMarkdown>{cleanContent}</ReactMarkdown>
        </div>
        {navMatches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {navMatches.map((match, i) => {
              const path = match[1];
              const label = path === '/' ? 'Home' 
                : path.includes('category=') 
                  ? path.split('category=')[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Providers'
                  : path.slice(1).replace(/\b\w/g, l => l.toUpperCase());
              return (
                <button
                  key={i}
                  onClick={() => navigate(path)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary/20 text-secondary hover:bg-secondary/30 transition-colors font-medium"
                >
                  <Navigation className="h-3 w-3" />
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    stopSpeaking();

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${resp.status})`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const upsertAssistant = (nextChunk: string) => {
        assistantContent += nextChunk;
        const content = assistantContent;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length === newMessages.length + 1) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      let done = false;
      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { done = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (const raw of buffer.split('\n')) {
          if (!raw || raw.startsWith(':') || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsertAssistant(c);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error('Crow chat error:', e);
      const errorMsg = e instanceof Error ? e.message : 'Something went wrong';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errorMsg}. Please try again.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, stopSpeaking]);

  // Keep ref in sync so speech callback can call latest sendMessage
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const langLabels: Record<string, string> = { EN: 'English', BM: 'Bemba', NY: 'Nyanja' };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-accent shadow-glow flex items-center justify-center hover:scale-110 transition-all duration-300 group"
          aria-label="Open Crow Assistant"
        >
          <Bot className="h-7 w-7 text-secondary-foreground group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success animate-pulse" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-4rem)] rounded-2xl shadow-2xl border border-border bg-card flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-glow p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-bold text-primary-foreground text-sm">Crow Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs text-primary-foreground/70">
                    {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Online'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {ttsSupported && (
                <button
                  onClick={() => { setTtsEnabled(v => !v); if (isSpeaking) stopSpeaking(); }}
                  className="w-8 h-8 rounded-full hover:bg-primary-glow/30 flex items-center justify-center transition-colors"
                  title={ttsEnabled ? 'Mute voice' : 'Enable voice'}
                >
                  {ttsEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-primary-foreground" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-primary-foreground/50" />
                  )}
                </button>
              )}
              <div className="flex gap-0.5 bg-primary-glow/30 rounded-full p-0.5">
                {(['EN', 'BM', 'NY'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                      language === lang 
                        ? 'bg-secondary text-secondary-foreground' 
                        : 'text-primary-foreground/60 hover:text-primary-foreground'
                    }`}
                    title={langLabels[lang]}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setIsOpen(false); stopSpeaking(); }}
                className="w-8 h-8 rounded-full hover:bg-primary-glow/30 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-primary-foreground" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-secondary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 text-secondary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted hover:border-secondary/50 transition-all text-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border bg-card flex-shrink-0">
            <div className="flex gap-2 items-end">
              {sttSupported && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={isListening ? stopListening : startListening}
                  className={`rounded-xl h-10 w-10 flex-shrink-0 ${isListening ? 'bg-destructive/10 text-destructive animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
                  title={isListening ? 'Stop listening' : 'Speak to Crow'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening ? 'Listening... speak now' :
                  language === 'BM' ? 'Lembeni apa...' :
                  language === 'NY' ? 'Lembani apa...' :
                  'Ask Crow anything...'
                }
                className="min-h-[40px] max-h-[100px] resize-none text-sm rounded-xl border-border/50 focus:border-secondary"
                rows={1}
              />
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="rounded-xl h-10 w-10 bg-secondary hover:bg-secondary/90 flex-shrink-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
              🎙️ Tap mic to speak — auto-sends your voice message
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CrowAssistant;
