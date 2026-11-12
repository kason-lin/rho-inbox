'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppUser } from '@/lib/checkin/types';

const FALLBACK: AppUser = { id: 'maya', name: 'Maya Chen', title: 'Founder & CEO', role: 'admin' };
const KEY = 'rho-inbox:viewer';

type ViewerState = { viewer: AppUser; users: AppUser[]; setViewer: (id: string) => void };
const ViewerContext = createContext<ViewerState>({ viewer: FALLBACK, users: [FALLBACK], setViewer: () => {} });

/**
 * Who the demo is "logged in" as. There's no real auth in the prototype; the role switcher in the
 * top bar picks Maya (founder, admin), Ana (teammate, payroll hidden) or Dana (Rho account manager).
 */
export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([FALLBACK]);
  const [id, setId] = useState('maya');

  useEffect(() => {
    // ?as=ana in the URL switches the viewer (handy for links in the demo script and for screenshots).
    const fromUrl = new URLSearchParams(window.location.search).get('as');
    try {
      if (fromUrl) localStorage.setItem(KEY, fromUrl);
      const saved = fromUrl ?? localStorage.getItem(KEY);
      if (saved) setId(saved);
    } catch {
      if (fromUrl) setId(fromUrl);   // storage can be blocked; the URL still works for this page
    }
    fetch('/api/users')
      .then(r => r.json())
      .then(b => b.users && setUsers(b.users))
      .catch(() => {});
  }, []);

  const value = useMemo<ViewerState>(() => ({
    viewer: users.find(u => u.id === id) ?? FALLBACK,
    users,
    setViewer: (next: string) => {
      setId(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // ignore
      }
    },
  }), [users, id]);

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export const useViewer = () => useContext(ViewerContext);

export const ROLE_LABEL: Record<AppUser['role'], string> = {
  admin: 'Admin',
  member: 'Teammate',
  account_manager: 'Rho account manager',
};

export function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}
