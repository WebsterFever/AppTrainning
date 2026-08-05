import { useEffect, useRef, useState } from 'react';
import { api, ChatMessage, chatIdentity, SCHOOL_NAME, visitorIdentity, VisitorIdentity } from '../lib/api';
import { getSocket } from '../lib/socket';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<VisitorIdentity | null>(null);
  // A name/email already known from registering for a class — lets us skip
  // asking the student to register with the chat separately.
  const [detectedIdentity, setDetectedIdentity] = useState<VisitorIdentity | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Registration form state (first-time chatters with no known identity).
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showResume, setShowResume] = useState(false);
  const [resumeEmail, setResumeEmail] = useState('');
  const [error, setError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = chatIdentity.get();
    setIdentity(existing);
    if (!existing) setDetectedIdentity(visitorIdentity.findAny());
  }, []);

  useEffect(() => {
    if (!open || !identity) return;

    setLoading(true);
    api
      .getChatThread(identity.email)
      .then(setMessages)
      .finally(() => setLoading(false));

    const socket = getSocket();
    socket.emit('join-student', { email: identity.email });
    const onNewMessage = (message: ChatMessage) => {
      if (message.email.toLowerCase() !== identity.email.toLowerCase()) return;
      setMessages((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message],
      );
    };
    socket.on('new-message', onNewMessage);
    return () => {
      socket.off('new-message', onNewMessage);
    };
  }, [open, identity]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  const startChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !text.trim()) return;
    setSending(true);
    try {
      const message = await api.sendChatMessage(name.trim(), email.trim(), text.trim());
      const newIdentity = { name: name.trim(), email: email.trim() };
      chatIdentity.set(newIdentity);
      setIdentity(newIdentity);
      setMessages([message]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  };

  const startChatWithDetected = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!detectedIdentity || !text.trim()) return;
    setSending(true);
    try {
      const message = await api.sendChatMessage(detectedIdentity.name, detectedIdentity.email, text.trim());
      chatIdentity.set(detectedIdentity);
      setIdentity(detectedIdentity);
      setMessages([message]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  };

  const resumeChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resumeEmail.trim()) return;
    setLoading(true);
    try {
      const thread = await api.getChatThread(resumeEmail.trim());
      if (thread.length === 0) {
        setError("We couldn't find a conversation for that email.");
        return;
      }
      const resolvedName = [...thread].reverse().find((m) => m.sender === 'student')?.name ?? '';
      const newIdentity = { name: resolvedName, email: resumeEmail.trim() };
      chatIdentity.set(newIdentity);
      setIdentity(newIdentity);
      setMessages(thread);
      setShowResume(false);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !text.trim()) return;
    setSending(true);
    try {
      const message = await api.sendChatMessage(identity.name, identity.email, text.trim());
      setMessages((current) => [...current, message]);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const startOver = () => {
    localStorage.removeItem('classboard_chat_identity');
    setIdentity(null);
    setMessages([]);
    setName('');
    setEmail('');
    setText('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-chalk shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
            <div>
              <p className="font-display text-sm text-ink">Chat with us</p>
              <p className="text-[11px] text-ink/50">{SCHOOL_NAME}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-ink/50 hover:text-ink"
            >
              ✕
            </button>
          </div>

          {!identity ? (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {detectedIdentity && !showResume ? (
                <form onSubmit={startChatWithDetected} className="space-y-3">
                  <p className="text-xs text-ink/60">
                    Continuing as <span className="font-medium text-ink">{detectedIdentity.name}</span>{' '}
                    ({detectedIdentity.email})
                  </p>
                  <textarea
                    required
                    placeholder="How can we help?"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="input h-20 text-sm"
                    autoFocus
                  />
                  {error && <p className="text-coral text-xs">{error}</p>}
                  <button disabled={sending} className="btn-primary w-full text-sm">
                    {sending ? 'Sending…' : 'Start chat'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetectedIdentity(null);
                      setError('');
                    }}
                    className="w-full text-center text-xs text-ink/50 hover:text-ink"
                  >
                    Not you? Use a different name/email
                  </button>
                </form>
              ) : !showResume ? (
                <form onSubmit={startChat} className="space-y-3">
                  <p className="text-xs text-ink/60">
                    Send us a message and we'll get back to you here.
                  </p>
                  <input
                    required
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input text-sm"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input text-sm"
                  />
                  <textarea
                    required
                    placeholder="How can we help?"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="input h-20 text-sm"
                  />
                  {error && <p className="text-coral text-xs">{error}</p>}
                  <button disabled={sending} className="btn-primary w-full text-sm">
                    {sending ? 'Sending…' : 'Start chat'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResume(true);
                      setError('');
                    }}
                    className="w-full text-center text-xs text-ink/50 hover:text-ink"
                  >
                    Already chatted with us? See your messages
                  </button>
                </form>
              ) : (
                <form onSubmit={resumeChat} className="space-y-3">
                  <p className="text-xs text-ink/60">
                    Enter the email you used before to see your conversation.
                  </p>
                  <input
                    required
                    type="email"
                    placeholder="Your email"
                    value={resumeEmail}
                    onChange={(e) => setResumeEmail(e.target.value)}
                    className="input text-sm"
                  />
                  {error && <p className="text-coral text-xs">{error}</p>}
                  <button disabled={loading} className="btn-primary w-full text-sm">
                    {loading ? 'Looking…' : 'View my chat'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResume(false);
                      setError('');
                    }}
                    className="w-full text-center text-xs text-ink/50 hover:text-ink"
                  >
                    ← Back
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {loading && <p className="text-xs text-ink/40">Loading…</p>}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.sender === 'admin'
                        ? 'bg-surface border border-line text-ink'
                        : 'ml-auto bg-amber text-midnight'
                    }`}
                  >
                    {m.sender === 'admin' && (
                      <p className="mb-0.5 text-[10px] font-semibold text-amber">{SCHOOL_NAME}</p>
                    )}
                    <p className="whitespace-pre-line">{m.text}</p>
                  </div>
                ))}
                {!loading && messages.length === 0 && (
                  <p className="text-center text-xs text-ink/40">No messages yet.</p>
                )}
              </div>
              <form onSubmit={sendReply} className="flex items-center gap-2 border-t border-line p-3">
                <input
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="input flex-1 text-sm"
                />
                <button disabled={sending || !text.trim()} className="btn-primary text-sm px-3">
                  Send
                </button>
              </form>
              <button
                onClick={startOver}
                className="border-t border-line px-4 py-2 text-center text-[11px] text-ink/40 hover:text-ink"
              >
                Not you? Start a new chat
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5">
        {!open && (
          <span className="hidden rounded-full border border-line bg-chalk px-3.5 py-2 text-xs font-medium text-ink shadow-md sm:inline-block">
            Have a question? Chat with us
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close chat' : 'Open chat'}
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-amber text-midnight shadow-lg transition hover:-translate-y-0.5 hover:bg-coral"
        >
          {open ? '✕' : '💬'}
        </button>
      </div>
    </div>
  );
}
