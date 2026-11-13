'use client';
/**
 * Loads the viewer's Business health data from the API and reloads it whenever the demo changes
 * (date jump, connect, approve, reset), so every screen stays in sync.
 */
import { useCallback, useEffect, useState } from 'react';
import { send } from '@/lib/client';
import type { HealthView } from '@/lib/health/view';

const CHANGED = 'health:changed';

export function useHealth(query = '') {
  const [data, setData] = useState<HealthView | null>(null);
  const load = useCallback(async () => {
    const res = await fetch(`/api/health/forecast${query}`, { cache: 'no-store' });
    if (res.ok) setData(await res.json());
  }, [query]);

  useEffect(() => {
    void load();
    window.addEventListener(CHANGED, load);
    return () => window.removeEventListener(CHANGED, load);
  }, [load]);

  return { data, reload: load };
}

/** Calls a Business health API route, then tells every screen to reload. */
export async function healthPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await send<T>('POST', `/api/health/${path}`, body ?? {});
  window.dispatchEvent(new Event(CHANGED));
  return res;
}
