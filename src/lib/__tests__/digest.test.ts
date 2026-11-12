import { describe, expect, it } from 'vitest';
import { templateDigest, type DigestFacts } from '../digest';

const LOOP_LABS: DigestFacts = {
  company: 'Loop Labs',
  viewer_role: 'admin',
  cards: [
    { rank: 1, title: 'Payroll Friday: checking is $4,200 short.', question: 'Move $5,000 from treasury?', urgent: true },
    { rank: 2, title: '$250/mo Mixpanel plan, unused 60 days.', question: 'Cancel it?', urgent: false },
    { rank: 3, title: 'Burn up 12%: runway 12 → 10.7 months.', question: null, urgent: false },
  ],
  others_checked: 14,
  cash: { checking: 11_800, treasury: 1_032_200, total: 1_044_000 },
  burn: { average: 87_000, projected: 97_440 },
  runway_months: { today: 12, projected: 10.7 },
  inbox_unread: 8,
};

describe('template digest', () => {
  it('is three sentences built from the spec numbers', () => {
    const text = templateDigest(LOOP_LABS);
    expect(text).toBe(
      '3 things need you this week, and the most urgent is “Payroll Friday: checking is $4,200 short.” ' +
      'You have $1,044,000 in cash ($11,800 in checking), about 12 months of runway, or 10.7 once the burn changes we know about land. ' +
      'We checked 14 other things and they look fine, and your Inbox has 8 unread updates.',
    );
  });

  it('handles a quiet week and steady burn', () => {
    const text = templateDigest({ ...LOOP_LABS, cards: [], burn: { average: 87_000, projected: 88_000 }, inbox_unread: 1 });
    expect(text).toMatch(/^Nothing needs a decision from you this week\. /);
    expect(text).toContain('about 12 months of runway.');
    expect(text).toContain('1 unread update.');
  });
});
