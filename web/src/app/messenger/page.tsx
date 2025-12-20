'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import api from '@/lib/api';
import MessengerHeader from '@/components/MessengerHeader';
import { mediaUrl } from '@/lib/media';
import { absMedia } from '@/lib/absMedia';

type Conversation = {
  id: number;
  title?: string;
  lastMessage?: { text: string; createdAt: string; senderUserId: number } | null;
  company?: { name?: string; logoUrl?: string | null } | null;
  candidate?: { name?: string; avatarUrl?: string | null } | null;
};

type Message = {
  id: number;
  text: string;
  createdAt: string;
  senderUserId: number;
};

export default function MessengerPage() {
  const [list, setList] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [meId, setMeId] = useState<number>();
  const [meName, setMeName] = useState<string | undefined>();
  const [meRole, setMeRole] = useState<'COMPANY' | 'CANDIDATE' | undefined>();

  // refs
  const socketRef = useRef<Socket | null>(null);
  const activeIdRef = useRef<number | undefined>(undefined);
  const msgIdsRef = useRef<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // helpers
  const addMessageUnique = (msg: Message) => {
    setMessages((prev) => {
      if (msgIdsRef.current.has(msg.id)) return prev;
      msgIdsRef.current.add(msg.id);
      return [...prev, msg];
    });
  };

  const loadMessages = async (cid: number) => {
    const res = await api.get(`/conversations/${cid}/messages`);
    const arr: Message[] = Array.isArray(res.data) ? res.data : [];
    msgIdsRef.current = new Set(arr.map((m) => m.id));
    setMessages(arr);
  };

  // Ενιαία ενημέρωση λίστας + δεξιού pane
  const upsertListAndMaybeAppendRight = (cid: number, msg: Message) => {
    // 1) Αριστερή λίστα (preview + στην κορυφή)
    setList((prev) => {
      const idx = prev.findIndex((c) => c.id === cid);
      const updated: Conversation = {
        id: cid,
        title: prev[idx]?.title ?? `Conversation ${cid}`,
        lastMessage: {
          text: msg.text,
          createdAt: msg.createdAt,
          senderUserId: msg.senderUserId,
        },
        company: prev[idx]?.company ?? null,
        candidate: prev[idx]?.candidate ?? null,
      };
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next.splice(idx, 1);
      return [updated, ...next];
    });

    // 2) Δεξιά ροή (αν είναι το ενεργό)
    const cur = Number(activeIdRef.current ?? activeId);
    if (cid === cur) addMessageUnique(msg);
  };

  // Πρώτα μηδενίζουμε τα μηνύματα μόλις μπούμε στο messenger
  useEffect(() => {
    api.post('/conversations/read-all').catch(() => {});
  }, []);

  // Κάθε φορά που το παράθυρο παίρνει focus -> ξαναμηδένισε
  useEffect(() => {
    const onFocus = () => api.post('/conversations/read-all').catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Εναλλαγή ενεργής συζήτησης + mark read
  useEffect(() => {
    if (!activeId) return;
    activeIdRef.current = activeId;
    socketRef.current?.emit('join', { conversationId: activeId });
    api.post(`/conversations/${activeId}/read`).catch(() => {});
    loadMessages(activeId).catch(console.error);
  }, [activeId]);

  // POLLING: refresh κάθε 1s τα μηνύματα του active conversation (fallback)
  useEffect(() => {
    if (!activeId) return;

    let destroyed = false;
    let timer: any;

    const tick = async () => {
      try {
        const res = await api.get(`/conversations/${activeId}/messages`);
        if (destroyed) return;
        const arr: Message[] = Array.isArray(res.data) ? res.data : [];
        for (const m of arr) {
          if (!msgIdsRef.current.has(m.id)) {
            msgIdsRef.current.add(m.id);
            setMessages((prev) => [...prev, m]);
          }
        }
      } catch {
        /* no-op */
      } finally {
        if (!destroyed) timer = setTimeout(tick, 1000);
      }
    };

    tick();
    return () => {
      destroyed = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeId]);

  // autoscroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // initial load
  useEffect(() => {
    (async () => {
      const me = await api.get('/me');
      setMeId(me.data?.id);
      setMeRole(me.data?.role);
      setMeName(me.data?.name ?? me.data?.company?.name ?? me.data?.candidate?.name);

      const res = await api.get('/conversations');
      const data: any[] = Array.isArray(res.data) ? res.data : [];

      const normalized: Conversation[] = data.map((c) => ({
        id: c.id,
        title: c.candidate?.name ?? c.company?.name ?? `Conversation ${c.id}`,
        lastMessage: c.lastMessage ?? null,
        company: c.company ?? null,
        candidate: c.candidate ?? null,
      }));
      setList(normalized);

      const url = new URL(window.location.href);
      const cParam = url.searchParams.get('c');
      const initialId = cParam ? Number(cParam) : normalized[0]?.id;
      if (initialId) {
        setActiveId(initialId);
        activeIdRef.current = initialId;
      }
    })();
  }, []);

  // socket once
  useEffect(() => {
    const s = io('http://localhost:3001/ws/chat', {
      transports: ['websocket'],
      withCredentials: true,
    });
    socketRef.current = s;

    const onNew = (payload: any) => {
      const cid = Number(payload?.conversationId);
      const msg: Message | undefined = payload?.message;
      if (!msg || !Number.isFinite(cid)) return;

      // πάντα ενημέρωσε αριστερά ΚΑΙ (αν είναι ενεργό) δεξιά
      upsertListAndMaybeAppendRight(cid, msg);

      // Fallback sync αν χάθηκε κάποιο bubble λόγω timing
      const cur = Number(activeIdRef.current ?? activeId);
      if (cid === cur && !msgIdsRef.current.has(msg.id)) {
        loadMessages(cid).catch(() => {});
      }
    };

    s.on('message:new', onNew);

    return () => {
      s.off('message:new', onNew);
      s.disconnect();
      socketRef.current = null;
    };
  }, [activeId]);

  // join + load όταν αλλάζει η συζήτηση (δεύτερο safety net)
  useEffect(() => {
    if (!activeId) return;
    activeIdRef.current = activeId;
    socketRef.current?.emit('join', { conversationId: activeId });
    loadMessages(activeId).catch(console.error);
  }, [activeId]);

  // send (OPTIMISTIC + WS)
  async function send() {
    if (!newMessage.trim() || !activeId || !meId) return;
    const text = newMessage.trim();

    // OPTIMISTIC bubble
    const temp: Message = {
      id: -(Date.now()),
      text,
      createdAt: new Date().toISOString(),
      senderUserId: meId,
    };
    addMessageUnique(temp);
    setNewMessage('');

    try {
      await api.post(`/conversations/${activeId}/messages`, { text });
      // Το κανονικό μήνυμα θα έρθει από WS/poll και θα γίνει dedupe
    } catch (e) {
      // rollback
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      msgIdsRef.current.delete(temp.id);
      setNewMessage(text);
      console.error('send failed', e);
    }
  }

  const activeConv = useMemo(
    () => list.find((c) => c.id === activeId),
    [list, activeId],
  );

  return (
    <div className="min-h-screen bg-[#007EE5] text-black">
      <MessengerHeader role={meRole} name={meName} />

      <main className="mx-auto max-w-7xl px-4 py-8 h-[calc(100vh-88px)] min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-[36%_1fr] h-full rounded-2xl border border-black/10 shadow-xl bg-white overflow-hidden">
          {/* LEFT */}
          <aside className="border-r flex flex-col min-h-0">
            <div className="p-3 border-b bg-[#F3F6FA]">
              <div className="relative">
                <input
                  className="w-full rounded-full border border-black/10 px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#007EE5]/60"
                  placeholder="Search"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto">
              {list.map((c) => {
                // Αν είμαι COMPANY βλέπω τον candidate, αν είμαι CANDIDATE βλέπω την company
                const otherName =
                  meRole === 'COMPANY'
                    ? c.candidate?.name ?? c.title
                    : c.company?.name ?? c.title;

                const otherImg =
                  meRole === 'COMPANY' ? c.candidate?.avatarUrl : c.company?.logoUrl;

                const imgSrc = otherImg ? absMedia(otherImg) : null;

                return (
                  <li
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`flex items-center gap-3 px-5 py-3 border-b cursor-pointer transition ${
                      c.id === activeId
                        ? 'bg-[#007EE5] text-white'
                        : 'hover:bg-[#F7FAFF]'
                    }`}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt=""
                        className={`h-10 w-10 rounded-full object-cover ${
                          c.id === activeId ? 'ring-2 ring-white/50' : ''
                        }`}
                      />
                    ) : (
                      <div
                        className={`h-10 w-10 rounded-full ${
                          c.id === activeId ? 'bg-white/30' : 'bg-gray-200'
                        }`}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {otherName}
                      </div>
                      <div
                        className={`text-xs truncate ${
                          c.id === activeId ? 'text-white/90' : 'text-gray-500'
                        }`}
                      >
                        {c.lastMessage?.text ?? '—'}
                      </div>
                    </div>

                    <div
                      className={`text-[11px] ${
                        c.id === activeId ? 'text-white/90' : 'text-gray-400'
                      }`}
                    >
                      {c.lastMessage?.createdAt
                        ? new Date(c.lastMessage.createdAt).toLocaleTimeString()
                        : ''}
                    </div>
                  </li>
                );
              })}

              {!list.length && (
                <li className="px-5 py-10 text-sm text-gray-500">
                  No conversations yet
                </li>
              )}
            </ul>
          </aside>

          {/* RIGHT */}
          <section className="flex flex-col min-h-0">
            <div className="h-12 px-6 border-b bg-[#F3F6FA] flex items-center">
              <span className="text-sm text-gray-700">
                To:{' '}
                <span className="font-semibold text-gray-900">
                  {activeConv?.title ??
                    (activeId ? `Conversation ${activeId}` : '—')}
                </span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 bg-white">
              {messages.map((m) => {
                const mine = meId && m.senderUserId === meId;
                const isTemp = m.id < 0;
                return (
                  <div
                    key={m.id}
                    className={`w-full ${mine ? 'text-right' : 'text-left'} mb-2`}
                  >
                    <span
                      className={`inline-block max-w-[70%] px-3 py-2 rounded-2xl text-sm border shadow-sm ${
                        mine
                          ? `bg-[#007EE5] text-white border-[#007EE5] ${
                              isTemp ? 'opacity-70' : ''
                            }`
                          : 'bg-[#F1F5FA] text-black border-[#E6ECF3]'
                      }`}
                      title={new Date(m.createdAt).toLocaleString()}
                    >
                      {m.text}
                    </span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="h-[56px] px-3 py-2 border-t bg-white flex items-center gap-2 md:gap-3">
              {/* 🔹 Paperclip REMOVED όπως ζήτησες */}
              <input
                className="flex-1 h-10 rounded-full border border-black/10 px-4 text-sm bg-white outline-none focus:ring-2 focus:ring-[#007EE5]/60"
                placeholder="Type your message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button
                onClick={send}
                className="h-10 min-w-[70px] px-4 rounded-full bg-[#007EE5] text-white text-sm shadow hover:brightness-110 flex items-center justify-center"
                >
                Send
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
