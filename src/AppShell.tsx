import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { adminApi, canPerm, setToken, type AdminMe } from './api';

const CountsCtx = createContext<{ disputes: number; withdrawals: number; quality: number; reload: () => void }>({
  disputes: 0, withdrawals: 0, quality: 0, reload: () => {},
});
export const useCounts = () => useContext(CountsCtx);

const MeCtx = createContext<AdminMe | null>(null);
export const useMe = () => useContext(MeCtx);

type LinkDef = {
  to: string;
  label: string;
  badge?: 'disputes' | 'withdrawals' | 'quality';
  perm?: string;
};

const allLinks: LinkDef[] = [
  { to: '/', label: 'Vue d’ensemble' },
  { to: '/disputes', label: 'Litiges', badge: 'disputes', perm: 'dispute.arbitrate' },
  { to: '/quality', label: 'Qualité', badge: 'quality', perm: 'content.moderate' },
  { to: '/users', label: 'Utilisateurs', perm: 'content.read_any' },
  { to: '/reference', label: 'Référentiel', perm: 'reference.manage' },
  { to: '/dataset', label: 'Dataset', perm: 'export.run' },
  { to: '/money', label: 'Argent', badge: 'withdrawals', perm: 'withdrawal.settle' },
  { to: '/audit', label: 'Audit', perm: 'audit.read' },
];

export function AppShell() {
  const [counts, setCounts] = useState({ disputes: 0, withdrawals: 0, quality: 0 });
  const [me, setMe] = useState<AdminMe | null>(null);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    void adminApi.me().then(setMe).catch(() => setMe(null));
  }, []);

  const links = useMemo(
    () => allLinks.filter((l) => !l.perm || canPerm(me?.permissions, l.perm)),
    [me],
  );

  const reload = useCallback(() => {
    const tasks: Promise<void>[] = [];
    if (!me || canPerm(me.permissions, 'dispute.arbitrate')) {
      tasks.push(adminApi.disputes().then((d) => {
        setCounts((c) => ({ ...c, disputes: d.disputes.length }));
      }).catch(() => {}));
    }
    if (!me || canPerm(me.permissions, 'withdrawal.settle')) {
      tasks.push(adminApi.withdrawals('processing').then((w) => {
        setCounts((c) => ({ ...c, withdrawals: w.withdrawals.length }));
      }).catch(() => {}));
    }
    if (!me || canPerm(me.permissions, 'content.moderate')) {
      tasks.push(adminApi.qualityQueue().then((q) => {
        setCounts((c) => ({ ...c, quality: q.items.length }));
      }).catch(() => {}));
    }
    void Promise.all(tasks);
  }, [me]);

  useEffect(reload, [reload, loc.pathname]);

  return (
    <MeCtx.Provider value={me}>
      <CountsCtx.Provider value={{ ...counts, reload }}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
          <nav style={{
            background: 'var(--surface)', borderRight: '1px solid var(--border)',
            padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ padding: '4px 12px 18px', fontWeight: 700, letterSpacing: 0.4 }}>
              Sabi<span style={{ color: 'var(--accent)' }}>Data</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-sec)', fontWeight: 600 }}>
                SALLE DE CONTRÔLE
                {me && <> · {me.role}</>}
              </span>
            </div>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', padding: '9px 12px',
                  borderRadius: 'var(--radius-ctl)', color: isActive ? 'var(--accent)' : 'var(--text)',
                  background: isActive ? 'var(--surface-hi)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent', fontWeight: 600,
                })}>
                {l.label}
                {l.badge && counts[l.badge] > 0 && (
                  <span className="mono" style={{
                    marginLeft: 'auto', fontSize: 11, background: 'var(--accent)', color: '#0C1020',
                    borderRadius: 'var(--radius-pill)', padding: '1px 8px', fontWeight: 700,
                  }}>{counts[l.badge]}</span>
                )}
              </NavLink>
            ))}
            <button
              onClick={() => { setToken(null); nav('/login'); }}
              style={{
                marginTop: 'auto', background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-sec)', borderRadius: 'var(--radius-ctl)', padding: '8px 12px',
              }}>
              Se déconnecter
            </button>
          </nav>
          <main style={{ padding: '28px 32px', maxWidth: 1120 }}>
            <Outlet />
          </main>
        </div>
      </CountsCtx.Provider>
    </MeCtx.Provider>
  );
}
