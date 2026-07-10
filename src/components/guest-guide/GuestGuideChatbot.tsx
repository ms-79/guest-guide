import { useState, useRef, useEffect, useCallback } from 'react';

import { MessageCircle, ArrowUp, Mic, X, RotateCcw } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import ReactMarkdown from 'react-markdown';
import { useGuestGuideLocale } from './GuestGuideLanguageContext';
import { translations } from './translations';
import whatsappButtonImg from '@/assets/whatsapp-button.png';
import { cn } from '@/lib/utils';

interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = '/api/guest-guide-chat';

const QUICK_BUTTONS_KEYS = ['wifi', 'zugang', 'checkout'] as const;
const QUICK_BUTTONS_MAP: Record<typeof QUICK_BUTTONS_KEYS[number], keyof typeof translations.chatSuggestions> = {
  wifi: 'wifi',
  zugang: 'fireplace', // we'll use actual translations below
  checkout: 'supermarket',
};

const ESCALATION_KEYWORDS = ['problem', 'geht nicht', 'hilfe', 'notfall', 'help', 'emergency', 'broken', 'not working', 'ayuda', 'emergencia', 'aiuto', 'aide', 'urgence', 'noodgeval'];

export interface ChatGuestData {
  wifiPassword: string;
  boxCode: string;
  guestName: string;
  checkin?: string;
  checkout?: string;
}

interface GuestGuideChatbotProps {
  guestData: ChatGuestData;
  logo: string;
  propertyName: string;
  propertySlug: string;
}

const GuestGuideChatbot: React.FC<GuestGuideChatbotProps> = ({ guestData, logo, propertyName, propertySlug }) => {
  const { locale } = useGuestGuideLocale();
  const t = translations;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [viewport, setViewport] = useState<{ height: number; offsetTop: number } | null>(() =>
    typeof window !== 'undefined' && window.visualViewport
      ? { height: window.visualViewport.height, offsetTop: window.visualViewport.offsetTop }
      : null
  );
  // Matches the Tailwind `sm:` breakpoint (640px) where the dialog switches
  // from full-screen (mobile) to a centered modal (desktop). The viewport
  // pinning below must only apply on the full-screen mobile layout.
  const [isNarrow, setIsNarrow] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : true
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const autoOpenRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsNarrow(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Track visual viewport for iOS keyboard handling.
  // On iOS, position:fixed is relative to the layout viewport, so when the
  // keyboard opens the visual viewport shrinks AND shifts (offsetTop). We must
  // pin the dialog to the visible area using both height and offsetTop.
  // iOS fires 'scroll' instead of 'resize' on some versions.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => setViewport({ height: vv.height, offsetTop: vv.offsetTop });
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([{ role: 'assistant', content: t.conciergeGreeting[locale] }]);
    setInput('');
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [locale, t]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }, []);

  // Auto-open disabled – concierge opens only on bubble click
  // Greeting is shown when dialog opens for the first time
  useEffect(() => {
    if (open && !hasOpened) {
      setHasOpened(true);
      setMessages([{ role: 'assistant', content: t.conciergeGreeting[locale] }]);
    }
  }, [open, hasOpened, locale, t]);

  // Update greeting message when locale changes (only if greeting is the only message)
  useEffect(() => {
    if (hasOpened && messages.length === 1 && messages[0].role === 'assistant') {
      setMessages([{ role: 'assistant', content: t.conciergeGreeting[locale] }]);
    }
  }, [locale]);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
    if (open) {
      setShowPulse(false);
      setHasOpened(true);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, viewport]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }, [input]);

  // Check for escalation keywords in user message
  const shouldShowEscalation = (text: string) => {
    const lower = text.toLowerCase();
    return ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    // Check for escalation
    const needsEscalation = shouldShowEscalation(text);

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          context: {
            wifiPassword: guestData.wifiPassword,
            boxCode: guestData.boxCode,
            guestName: guestData.guestName,
            propertySlug,
            locale,
          },
        }),
      });

      if (!resp.ok || !resp.body) throw new Error('Stream failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
                }
                return [...prev, { role: 'assistant', content: snapshot }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Fire-and-forget: log question + answer via email
      if (assistantSoFar) {
        fetch('/api/log-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName: guestData.guestName,
            propertyName,
            question: text.trim(),
            answer: assistantSoFar,
          }),
        }).catch(() => { /* ignore */ });
      }

      // Append WhatsApp escalation if keywords detected
      if (needsEscalation) {
        const escalationText = `\n\n---\n\n${t.whatsappEscalation[locale]}\n\n[![WhatsApp Chat](whatsapp-btn)](https://wa.me/4915679656368)`;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: m.content + escalationText } : m));
          }
          return prev;
        });
      }
    } catch (e) {
      console.error('Chat error:', e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t.chatError[locale] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // Quick button labels for the greeting
  const quickButtons = [
    { label: t.navWlan[locale], query: t.chatSuggestions.wifi[locale] },
    { label: t.navZugang[locale], query: t.chatSuggestions.fireplace[locale].includes('Kamin') ? `Wie komme ich ins Haus?` : `How do I access the house?` },
    { label: t.navCheckout[locale], query: locale === 'de' ? 'Was muss ich beim Check-out beachten?' : locale === 'en' ? 'What should I know about check-out?' : locale === 'es' ? '¿Qué debo saber sobre el check-out?' : locale === 'it' ? 'Cosa devo sapere sul check-out?' : locale === 'fr' ? 'Que dois-je savoir sur le check-out ?' : 'Wat moet ik weten over de check-out?' },
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 bg-background text-foreground border-2 border-border/60 hover:scale-105 shadow-[0_4px_24px_-2px_rgba(255,255,255,0.25),0_2px_12px_-2px_rgba(0,0,0,0.3)] ${
          showPulse ? 'animate-[pulse_2s_ease-in-out_3]' : ''
        }`}
        aria-label={t.chatOpenLabel[locale]}
      >
        <MessageCircle size={22} />
      </button>

      {/* Chat overlay */}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden bg-background shadow-2xl",
              "inset-0 rounded-none border-none",
              "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-[540px] sm:w-full sm:max-h-[80dvh] sm:rounded-2xl sm:border sm:border-border/50"
            )}
            style={
              isNarrow && viewport
                ? {
                    height: `${viewport.height}px`,
                    top: 0,
                    bottom: 'auto',
                    // Pin to the visible (visual) viewport: when the iOS keyboard
                    // opens, the visual viewport shifts down by offsetTop.
                    transform: `translateY(${viewport.offsetTop}px)`,
                  }
                : undefined
            }
          >
            <DialogPrimitive.Title className="sr-only">ACHZEIT Concierge</DialogPrimitive.Title>
          <div className="px-5 py-3 bg-[hsl(222,20%,14%)] shrink-0 flex items-center justify-between gap-2 rounded-t-none sm:rounded-t-2xl">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mountain logo – cropped to hide ACHZEIT text */}
              <div className="w-7 h-5 overflow-hidden shrink-0 opacity-90">
                <img
                  src={logo}
                  alt=""
                  className="w-7 object-cover object-top brightness-0 invert"
                />
              </div>
              <p className="text-sm font-medium text-white/90 truncate">{t.chatTitle[locale]}</p>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/60 px-1.5 py-0.5 rounded-md">Beta</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleNewChat}
                className="text-white/60 hover:text-white transition-colors"
                aria-label="Neuer Chat"
                title="Neuer Chat"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <DialogPrimitive.Close className="text-white/70 hover:text-white transition-colors focus:outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Schließen</span>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-[240px]">
            <div className="max-w-[480px] mx-auto px-4 py-5 space-y-5">
              {messages.length === 0 && (
                <div className="pt-6 pb-2 space-y-5">
                  <p className="text-base text-muted-foreground text-center">{t.chatWelcome[locale]}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {(['sauna', 'supermarket', 'fireplace', 'wifi'] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => send(t.chatSuggestions[key][locale])}
                        className="text-xs text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-full border border-border/60 hover:border-border hover:bg-muted/50 transition-all"
                      >
                        {t.chatSuggestions[key][locale]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Show quick buttons after greeting (first auto-open) */}
              {messages.length === 1 && messages[0].role === 'assistant' && (
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {quickButtons.map((btn) => (
                    <button
                      key={btn.label}
                      onClick={() => send(btn.query)}
                      className="text-xs font-medium text-foreground/80 hover:text-foreground px-4 py-2 rounded-full border border-border hover:border-foreground/30 hover:bg-muted/50 transition-all"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-muted rounded-3xl rounded-br-lg px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[0.9rem] text-foreground leading-relaxed">
                      <div className="prose max-w-none prose-p:my-1.5 prose-p:text-[0.9rem] prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-[0.9rem] prose-a:text-primary prose-a:underline prose-a:underline-offset-2 prose-strong:text-foreground prose-headings:text-foreground prose-headings:font-body [&_h3]:!text-lg [&_h3]:!font-semibold [&_h3]:!mt-5 [&_h3]:!mb-2 [&_h4]:!text-base [&_h4]:!font-semibold [&_h4]:!mt-4 [&_h4]:!mb-1.5 [&_.whatsapp-link]:!no-underline [&_.whatsapp-link]:!text-foreground">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => {
                              const isWhatsApp = href?.includes('wa.me');
                              if (isWhatsApp) {
                                return (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="whatsapp-link !no-underline flex items-center gap-2 mt-3 py-1 !text-foreground text-sm font-medium hover:opacity-80 transition-opacity"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#25D366] shrink-0" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    {typeof children === 'string' ? children : 'WhatsApp Chat'}
                                  </a>
                                );
                              }
                              return (
                                <a href={href} target="_blank" rel="noopener noreferrer">
                                  {children}
                                </a>
                              );
                            },
                            img: ({ src, alt }) => {
                              if (src === 'whatsapp-btn') return null;
                              return <img src={src} alt={alt} />;
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>

          {/* Input bar – fixed at bottom with safe area */}
          <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shrink-0 border-t border-border/20">
            <div className="flex items-end gap-2 bg-muted rounded-2xl px-3 py-2.5 border border-border/40 focus-within:border-border/80 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  // On iOS, keyboard open settles after ~300ms; re-read the
                  // visual viewport then in case the resize/scroll event was missed.
                  setTimeout(() => {
                    const vv = window.visualViewport;
                    if (vv) setViewport({ height: vv.height, offsetTop: vv.offsetTop });
                  }, 350);
                }}
                placeholder={t.chatPlaceholder[locale]}
                disabled={isLoading}
                rows={1}
                /* text-base (16px) on mobile prevents iOS Safari from auto-zooming
                   into the field on focus (which left the whole page zoomed/shifted) */
                className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 resize-none leading-relaxed max-h-[150px]"
              />
              {/* Mic button – shown when input is empty */}
              {!input.trim() && (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    isListening
                      ? 'bg-destructive text-destructive-foreground animate-pulse'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={isListening ? t.micStop[locale] : t.micStart[locale]}
                >
                  <Mic size={16} />
                </button>
              )}
              {/* Send button – shown when there's text */}
              {input.trim() && (
                <button
                  type="button"
                  onClick={() => { stopListening(); send(input); }}
                  disabled={isLoading}
                  className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-20 transition-opacity shrink-0"
                >
                  <ArrowUp size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
};

export default GuestGuideChatbot;
