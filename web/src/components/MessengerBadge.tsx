'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';

type Props = {
  role?: 'COMPANY' | 'CANDIDATE';
  className?: string; // για custom θέση/styling από τον γονέα
};

export default function MessengerBadge({ role, className }: Props) {
  const [count, setCount] = useState(0);

  // refs για socket & timers
  const socketRef = useRef<Socket | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    mountedRef.current = true;

    const fetchUnread = async () => {
      try {
        const { data } = await api.get<{ total: number; byConversation?: Record<number, number> }>(
          '/conversations/unread'
        );
        if (mountedRef.current) setCount(Number(data?.total || 0));
      } catch {
        // ignore
      }
    };

    const connectSocket = () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const s = io('http://localhost:3001/ws/chat', {
          transports: ['websocket'],
          withCredentials: true,
          query: token ? { token } : undefined,
        });
        socketRef.current = s;

        // live updates από backend
        s.on('badge:update', (payload: any) => {
          if (!mountedRef.current) return;
          if (payload && typeof payload.total === 'number') {
            setCount(payload.total);
          }
        });
      } catch {
        // ignore
      }
    };

    const startPolling = () => {
      const tick = async () => {
        await fetchUnread();
        // fallback polling ανά 15s
        pollTimerRef.current = window.setTimeout(tick, 15000);
      };
      pollTimerRef.current = window.setTimeout(tick, 15000);
    };

    // init: αρχικό fetch + socket + polling
    fetchUnread();
    connectSocket();
    startPolling();

    return () => {
      mountedRef.current = false;

      // καθάρισμα socket
      if (socketRef.current) {
        socketRef.current.off('badge:update');
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // καθάρισμα polling
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [role]);

  // Αν δεν υπάρχουν αδιάβαστα, μην εμφανίζεις badge
  if (!count) return null;

  return (
    <span
      className={
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white shadow ' +
        (className ?? '')
      }
      aria-label={`${count} unread messages`}
      title={`${count} unread messages`}
    >
      {count}
    </span>
  );
}