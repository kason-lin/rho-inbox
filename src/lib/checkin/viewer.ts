import 'server-only';
import { error } from '../api';
import { adminClient } from '../supabase/admin';
import { getUser } from './store';
import { viewerId } from './viewer-id';
import type { AppUser } from './types';

/**
 * Who is looking. The prototype has no real login, so the demo's role switcher passes ?as=kason|ana|dana.
 * Defaults to Kason, the founder.
 */
export async function resolveViewer(id: string | null | undefined): Promise<{ user: AppUser } | { response: Response }> {
  const user = await getUser(adminClient(), viewerId(id));
  return user ? { user } : { response: error(`Unknown user "${id}"`, 404) };
}
