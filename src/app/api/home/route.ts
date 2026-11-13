// GET /api/home → the Home dashboard's sample numbers (balances, 30-day balance line, money in/out, card spend).
import { json, route } from '@/lib/api';
import { loadHome } from '@/lib/home';

export const GET = route(async () => json(loadHome()));
