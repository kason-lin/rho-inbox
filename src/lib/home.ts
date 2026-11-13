/**
 * The Home dashboard's numbers, straight from the sample-data JSON (no database):
 * balances from company.json (the same ones Business health uses) and the rest from home.json.
 */
import company from '@/data/business-health/company.json';
import home from '@/data/business-health/home.json';

export type Account = { id: 'checking' | 'treasury'; name: string; last4: string; balance: number };
export type Flow = { name: string; amount: number };

export type HomeData = {
  accounts: Account[];
  total: number;
  series: { date: string; balance: number }[];
  last30: { inflows: number; outflows: number };
  month: { label: string; outflows: number; topOutflows: Flow[]; inflows: number; topInflows: Flow[] };
  credit: { balance: number; limit: number };
  invoicesUnpaid: number;
};

export function loadHome(): HomeData {
  const accounts: Account[] = [
    { id: 'checking', name: company.checking.name, last4: company.checking.last4, balance: company.checking.balance },
    { id: 'treasury', name: company.treasury.name, last4: company.treasury.last4, balance: company.treasury.balance },
  ];
  return {
    accounts,
    total: accounts.reduce((t, a) => t + a.balance, 0),
    series: home.series,
    last30: home.last30,
    month: home.month,
    credit: home.credit,
    invoicesUnpaid: home.invoicesUnpaid,
  };
}
