import { useEffect, useRef, useState } from 'react';
import { api, authToken, ChatMessage, ChatThread, SCHOOL_NAME } from '../lib/api';
import { getSocket } from '../lib/socket';

export default function AdminChat() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Lets the socket handler below read the latest activeEmail without re-subscribing.
  const activeEmailRef = useRef<string | null>(null);

  const loadThreads = () => api.listChatThreads().then(setThreads);

  useEffect(() => {
    activeEmailRef.current = activeEmail;
  }, [activeEmail]);

  useEffect(() => {
    loadThreads().finally(() => setLoading(false));

    const socket = getSocket();
    const token = authToken.get();
    if (token) socket.emit('join-admin', { token });

    const onNewMessage = (message: ChatMessage) => {
      loadThreads();
      setMessages((current) => {
        if (
          !activeEmailRef.current ||
          message.email.toLowerCase() !== activeEmailRef.current.toLowerCase()
        ) {
          return current;
        }
        return current.some((m) => m.id === message.id) ? current : [...current, message];
      });
    };
    socket.on('new-message', onNewMessage);
    return () => {
      socket.off('new-message', onNewMessage);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const openThread = async (email: string) => {
    setActiveEmail(email);
    const thread = await api.getAdminChatThread(email);
    setMessages(thread);
    loadThreads();
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmail || !text.trim()) return;
    setSending(true);
    try {
      const message = await api.replyChat(activeEmail, text.trim());
      setMessages((current) => [...current, message]);
      setText('');
      loadThreads();
    } finally {
      setSending(false);
    }
  };

  const activeThread = threads.find((t) => t.email === activeEmail);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 sm:pb-14">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-ink">Live chat</h2>
        <span className="text-xs font-mono text-ink/50">{threads.length} conversations</span>
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading conversations…</p>
      ) : threads.length === 0 ? (
        <div className="bg-surface border border-dashed border-line rounded-sm p-10 text-center">
          <p className="text-ink/50 text-sm">No chat messages yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-4 bg-surface border border-line rounded-sm overflow-hidden">
          <div className="border-b md:border-b-0 md:border-r border-line max-h-80 md:max-h-[28rem] overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.email}
                onClick={() => openThread(t.email)}
                className={`w-full text-left px-4 py-3 border-b border-line hover:bg-chalk transition-colors ${
                  activeEmail === t.email ? 'bg-chalk' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink text-sm truncate">{t.name}</p>
                  {t.unreadCount > 0 && (
                    <span className="flex-shrink-0 bg-coral text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5">
                      {t.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink/50 font-mono truncate">{t.email}</p>
                <p className="text-xs text-ink/60 truncate mt-0.5">{t.lastMessage}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col h-80 md:h-[28rem]">
            {!activeThread ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-ink/40">Select a conversation</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-line">
                  <p className="font-medium text-ink text-sm">{activeThread.name}</p>
                  <p className="text-xs text-ink/50 font-mono">{activeThread.email}</p>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        m.sender === 'admin'
                          ? 'ml-auto bg-amber text-midnight'
                          : 'bg-chalk border border-line text-ink'
                      }`}
                    >
                      {m.sender === 'admin' && (
                        <p className="mb-0.5 text-[10px] font-semibold text-midnight/70">
                          {SCHOOL_NAME}
                        </p>
                      )}
                      <p className="whitespace-pre-line">{m.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendReply} className="flex items-center gap-2 border-t border-line p-3">
                  <input
                    placeholder={`Reply as ${SCHOOL_NAME}…`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="input flex-1 text-sm"
                  />
                  <button disabled={sending || !text.trim()} className="btn-primary text-sm px-3">
                    Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
