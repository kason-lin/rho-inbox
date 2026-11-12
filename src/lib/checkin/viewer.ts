import 'server-only';
import { error } from '../api';
import { adminClient } from '../supabase/admin';
import { getUser } from './store';
import type { AppUser } from './types';

/**
 * Who is looking. The prototype has no real login, so the demo's role switcher passes ?as=maya|ana|dana.
 * Defaults to Maya, the founder.
 */
export async function resolveViewer(id: string | null | undefined): Promise<{ user: AppUser } | { response: Response }> {
  const user = await getUser(adminClient(), id || 'maya');
  return user ? { user } : { response: error(`Unknown user "${id}"`, 404) };
}
