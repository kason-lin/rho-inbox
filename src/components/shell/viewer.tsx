'use client';
/**
 * Who the demo is "logged in" as. There's no real login in the prototype; the avatar menu (or ?as= in
 * the URL) picks Eric (founder, admin), Jordan (admin), Ana (teammate) or Dana (Rho account manager).
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import usersFile from '@/data/business-health/users.json';
import { viewerId } from '@/lib/health/viewer-id';

export type Role = 'admin' | 'member' | 'account_manager';
export type AppUser = { id: string; name: string; title: string; role: Role };

const USERS = usersFile.users as AppUser[];
const KEY = 'rho-demo:viewer';

type ViewerState = { viewer: AppUser; users: AppUser[]; setViewer: (id: string) => void };
const ViewerContext = createContext<ViewerState>({ viewer: USERS[0], users: USERS, setViewer: () => {} });

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState('eric');

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('as');
    try {
      if (fromUrl) localStorage.setItem(KEY, fromUrl);
      const saved = fromUrl ?? localStorage.getItem(KEY);
      if (saved) setId(viewerId(saved));
    } catch {
      if (fromUrl) setId(viewerId(fromUrl));   // storage can be blocked; the URL still works for this page
    }
  }, []);

  const value = useMemo<ViewerState>(() => ({
    viewer: USERS.find(u => u.id === id) ?? USERS[0],
    users: USERS,
    setViewer: (next: string) => {
      setId(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // ignore
      }
    },
  }), [id]);

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export const useViewer = () => useContext(ViewerContext);

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  member: 'Teammate',
  account_manager: 'Rho account manager',
};

export function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}
