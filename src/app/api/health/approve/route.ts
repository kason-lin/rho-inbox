// POST /api/health/approve { transfer_amount, pay_date, as } → approves the plan: moves money from
// treasury (simulated) and schedules the invoice. Saves it to the viewer's demo state and returns the receipt.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { error, parseBody, route } from '@/lib/api';
import { USERS } from '@/lib/checkin/demo-data';
import { viewerId } from '@/lib/checkin/viewer-id';
import { validatePlan } from '@/lib/health/forecast';
import { readState, writeState, type DemoState } from '@/lib/health/state';
import { healthView, invoicesFor } from '@/lib/health/view';

const Body = z.object({ transfer_amount: z.number(), pay_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), as: z.string().optional() });

export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;
  const state = await readState();

  const user = USERS.find(u => u.id === viewerId(body.data.as));
  if (!user || user.role !== 'admin') return error(`${user?.name ?? 'This user'} can’t approve payments. An admin has to.`, 403);
  if (state.approval) return error('This plan is already approved. Use Reset demo to start over.', 409);

  const invoice = invoicesFor(state)[0];
  if (!invoice) return error('No invoice to pay yet.', 409);
  const problem = validatePlan(body.data, invoice, state.date);
  if (problem) return error(problem, 422);

  const next: DemoState = {
    ...state,
    approval: {
      transfer_amount: body.data.transfer_amount,
      pay_date: body.data.pay_date,
      approved_at: new Date().toISOString(),
      approved_by: user.name,
      reference: `BH-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    },
  };
  return writeState(NextResponse.json(healthView(next)), next);
});
