/**
 * Each viewer's demo state (the demo date, which tools are connected, and any approval) lives in a
 * browser cookie. No database or setup needed, viewers never affect each other, and "Reset demo" clears it.
 */
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { DEMO_DATES } from './data';
import type { Plan } from './forecast';

export type Approval = Plan & { approved_at: string; approved_by: string; reference: string };

export type DemoState = {
  date: string;
  connected: string[];      // tool ids from connections.json
  approval: Approval | null;
  muted: string[];          // cards hidden by "Not now" or "This is wrong"
};

const COOKIE = 'bh_state';

export const FRESH: DemoState = { date: DEMO_DATES.invoiceArrives, connected: [], approval: null, muted: [] };

export async function readState(): Promise<DemoState> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return FRESH;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<DemoState>;
    return { ...FRESH, ...parsed };
  } catch {
    return FRESH;   // a broken cookie just starts the demo over
  }
}

export function writeState(res: NextResponse, state: DemoState): NextResponse {
  res.cookies.set(COOKIE, encodeURIComponent(JSON.stringify(state)), { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
  return res;
}

export function clearState(res: NextResponse): NextResponse {
  res.cookies.delete(COOKIE);
  return res;
}
