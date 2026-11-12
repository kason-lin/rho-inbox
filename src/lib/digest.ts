import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { CheckinView } from './checkin/store';
import { formatUSDShort as money, oneDecimal } from './format';

/** Only what the digest may say: the viewer's own (role-filtered) view, reduced to plain facts. */
export type DigestFacts = {
  company: string;
  viewer_role: string;
  cards: { rank: number; title: string; question: string | null; urgent: boolean }[];
  others_checked: number;
  cash: { checking: number; treasury: number; total: number };
  burn: { average: number; projected: number };
  runway_months: { today: number; projected: number };
  inbox_unread: number;
};

export type Digest = { text: string; source: 'claude' | 'template'; generated_at: string; note?: string };

export function digestFacts(view: CheckinView, inboxUnread: number): DigestFacts {
  const bal = (id: string) => view.accounts.find(a => a.id === id)?.balance ?? 0;
  const total = bal('checking') + bal('treasury');
  return {
    company: 'Loop Labs',
    viewer_role: view.viewer.role,
    cards: view.cards.map(c => ({ rank: c.rank, title: c.title, question: c.question, urgent: c.urgent })),
    others_checked: view.others.length,
    cash: { checking: bal('checking'), treasury: bal('treasury'), total },
    burn: { average: view.burn.average, projected: view.burn.projected },
    runway_months: { today: round1(total / view.burn.average), projected: round1(total / view.burn.projected) },
    inbox_unread: inboxUnread,
  };
}

/** Deterministic three sentences, used when Claude isn't configured or the call fails. */
export function templateDigest(f: DigestFacts): string {
  const n = f.cards.length;
  const first = f.cards[0]?.title.replace(/\.$/, '');
  const s1 = n
    ? `${n} ${n === 1 ? 'thing needs' : 'things need'} you this week, and the most urgent is “${first}.”`
    : 'Nothing needs a decision from you this week.';
  const shift = Math.abs(f.burn.projected - f.burn.average) / f.burn.average >= 0.1;
  const s2 = `You have ${money(f.cash.total)} in cash (${money(f.cash.checking)} in checking), about ${oneDecimal(f.runway_months.today)} months of runway` +
    (shift ? `, or ${oneDecimal(f.runway_months.projected)} once the burn changes we know about land.` : '.');
  const s3 = `We checked ${f.others_checked} other things and they look fine, and your Inbox has ${f.inbox_unread} unread ${f.inbox_unread === 1 ? 'update' : 'updates'}.`;
  return `${s1} ${s2} ${s3}`;
}

const SYSTEM = `You write the opening of a startup founder's weekly banking check-in from the facts you're given.
Write exactly three sentences of plain text: no greeting, no list, no markdown.
Sentence one: what needs their decision this week, most urgent first.
Sentence two: their cash position and runway, including how runway changes if burn is moving.
Sentence three: what looks fine, and how many unread Inbox updates there are.
Use only the numbers in the facts and never invent figures. Keep money formatted the way it appears.
If viewer_role is "member", do not mention salaries or payroll amounts.`;

let client: Anthropic | null = null;

async function claudeDigest(f: DigestFacts): Promise<string> {
  client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 2000,
    output_config: { effort: 'low' },   // a short summary doesn't need deep reasoning
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',               // if Opus declines, the API retries on a fallback model in the same call
    system: SYSTEM,
    messages: [{ role: 'user', content: `Facts (JSON):\n${JSON.stringify(f, null, 2)}` }],
  });
  if (response.stop_reason === 'refusal') throw new Error('Claude declined to write the digest');
  const text = response.content
    .flatMap(b => (b.type === 'text' ? [b.text] : []))
    .join('')
    .trim();
  if (!text) throw new Error(`Empty digest (stop_reason: ${response.stop_reason})`);
  return text;
}

// The page refreshes live; only call Claude again when the facts actually change.
const cache = new Map<string, { digest: Digest; at: number }>();
const TTL = 10 * 60_000;

export async function getDigest(f: DigestFacts): Promise<Digest> {
  const key = JSON.stringify(f);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.digest;

  let digest: Digest;
  const configured = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (!configured) {
    digest = { text: templateDigest(f), source: 'template', generated_at: new Date().toISOString(), note: 'Set ANTHROPIC_API_KEY to have Claude write this.' };
  } else {
    try {
      digest = { text: await claudeDigest(f), source: 'claude', generated_at: new Date().toISOString() };
    } catch (e) {
      // Typed SDK errors first, so the log says what kind of failure it was.
      const kind = e instanceof Anthropic.AuthenticationError ? 'invalid API key'
        : e instanceof Anthropic.RateLimitError ? 'rate limited'
          : e instanceof Anthropic.APIError ? `API error ${e.status}`
            : e instanceof Error ? e.message : 'unknown error';
      console.warn(`[digest] falling back to template: ${kind}`);
      digest = { text: templateDigest(f), source: 'template', generated_at: new Date().toISOString(), note: `Claude unavailable (${kind}).` };
    }
  }
  cache.set(key, { digest, at: Date.now() });
  return digest;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
