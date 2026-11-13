// POST /api/health/undo → takes back the approval (the "Undo" on the confirmation toast).
import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { readState, writeState } from '@/lib/health/state';
import { healthView } from '@/lib/health/view';

export const POST = route(async () => {
  const state = await readState();
  const next = { ...state, approval: null, handled: Object.fromEntries(Object.entries(state.handled).filter(([id]) => id !== 'dup-figma')) };
  return writeState(NextResponse.json(healthView(next)), next);
});
