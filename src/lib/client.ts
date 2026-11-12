'use client';
import { toast } from 'sonner';

/** POST/PATCH JSON to an API route; shows the server's error message as a toast and rethrows. */
export async function send<T = unknown>(method: 'POST' | 'PATCH', url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error ?? `Request failed (${res.status})`;
    toast.error(message);
    throw new Error(message);
  }
  return data as T;
}
