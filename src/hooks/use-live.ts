'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';

type Live<T> = { data: T | null; error: string | null; loading: boolean; refresh: () => Promise<void> };

/**
 * Fetch from an API route, then refetch whenever any of `tables` changes in Postgres
 * (Supabase Realtime). Bursts of changes are coalesced into one refetch.
 */
export function useLive<T>(url: string | null, tables: string[]): Live<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const channelId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableKey = tables.join(',');

  const refresh = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setData(body);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!url || !tableKey) return;
    const db = browserClient();
    const channel = db.channel(`live-${channelId}-${tableKey}`);
    for (const table of tableKey.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void refresh(), 250);
      });
    }
    channel.subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void db.removeChannel(channel);
    };
  }, [url, tableKey, channelId, refresh]);

  return { data, error, loading, refresh };
}
