// POST /api/health/reset → back to the start of the demo (Oct 3, every tool connected, nothing approved).
import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { clearState, FRESH } from '@/lib/health/state';

export const POST = route(async () => clearState(NextResponse.json(FRESH)));
