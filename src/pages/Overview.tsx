import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, canPerm, type AdminUser, type AuditEntry, type Dispute, type QualityItem, type Withdrawal } from '../api';
import { Card } from '../ui/Card';
import { KpiCard } from '../ui/KpiCard';
import { EmptyState } from '../ui/EmptyState';
import { useMe } from '../AppShell';

export function Overview() {
  const me = useMe();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [pending, setPending] = useState<Withdrawal[]>([]);
  const [quality, setQuality] = useState<QualityItem[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    const tasks: Promise<void>[] = [];
    if (canPerm(me.permissions, 'content.read_any')) {
      tasks.push(adminApi.users().then((u) => setUsers(u.users)).catch(() => {}));
    }
    if (canPerm(me.permissions, 'dispute.arbitrate')) {
      tasks.push(adminApi.disputes().then((d) => setDisputes(d.disputes)).catch(() => {}));
    }
    if (canPerm(me.permissions, 'withdrawal.settle')) {
      tasks.push(adminApi.withdrawals('processing').then((w) => setPending(w.withdrawals)).catch(() => {}));
    }
    if (canPerm(me.permissions, 'content.moderate')) {
      tasks.push(adminApi.qualityQueue().then((q) => setQuality(q.items)).catch(() => {}));
    }
    if (canPerm(me.permissions, 'audit.read')) {
      tasks.push(adminApi.auditLog().then((a) => setAudit(a.entries.slice(-5).reverse())).catch(() => {}));
    }
    void Promise.all(tasks).catch((e) => setError((e as Error).message));
  }, [me]);

  const by = (s: string) => users.filter((u) => u.status === s).length;
  const fcfa = users.reduce((sum, u) => sum + (u.balanceFcfa ?? 0), 0);
  const showMoney = canPerm(me?.permissions, 'wallet.read');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Vue d'ensemble</h1>
      {me && (
        <p style={{ margin: 0, color: 'var(--text-sec)', fontSize: 13 }}>
          Connecté : {me.name} · rôle <strong>{me.role}</strong>
        </p>
      )}
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {canPerm(me?.permissions, 'content.read_any') && (
          <>
            <KpiCard label="Utilisateurs actifs" value={by('active')} tone="var(--green)" />
            <KpiCard label="Suspendus" value={by('suspended')} tone="var(--amber)" />
            <KpiCard label="Bannis" value={by('banned')} tone="var(--red)" />
          </>
        )}
        {canPerm(me?.permissions, 'dispute.arbitrate') && (
          <KpiCard label="Litiges en attente" value={disputes.length} />
        )}
        {canPerm(me?.permissions, 'content.moderate') && (
          <KpiCard label="File qualité" value={quality.length} tone="var(--amber)" />
        )}
        {canPerm(me?.permissions, 'withdrawal.settle') && (
          <KpiCard label="Retraits à traiter" value={pending.length} tone="var(--accent)" />
        )}
        {showMoney && (
          <KpiCard label="FCFA en circulation" value={fcfa.toLocaleString('fr-FR')} />
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="À traiter">
          {disputes.length === 0 && pending.length === 0 && quality.length === 0
            ? <EmptyState title="Rien à traiter" message="La pair-review absorbe le volume." />
            : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                {disputes.slice(0, 5).map((d) => (
                  <li key={d.id}>
                    <Link to="/disputes">
                      Litige <code>{d.id.slice(0, 8)}</code>
                      {d.promptText ? ` · ${d.promptText.slice(0, 40)}…` : ` · ${d.durationS}s`}
                    </Link>
                  </li>
                ))}
                {quality.slice(0, 5).map((q) => (
                  <li key={q.id}>
                    <Link to="/quality">Qualité F/rejeté <code>{q.id.slice(0, 8)}</code></Link>
                  </li>
                ))}
                {pending.slice(0, 5).map((w) => (
                  <li key={w.id}>
                    <Link to="/money">
                      Retrait <span className="mono">{w.amountFcfa.toLocaleString('fr-FR')} FCFA</span> · {w.provider}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </Card>
        <Card title="Dernières actions">
          {!canPerm(me?.permissions, 'audit.read')
            ? <EmptyState title="Réservé admin" message="L’audit n’est pas visible pour ce rôle." />
            : audit.length === 0 ? <EmptyState title="Aucune action" /> : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8, fontSize: 13 }}>
                {audit.map((e) => (
                  <li key={e.id}>
                    <span className="mono" style={{ color: 'var(--text-sec)' }}>{new Date(e.createdAt).toLocaleString('fr-FR')}</span>
                    {' '}<strong style={{ color: 'var(--accent)' }}>{e.action}</strong>
                    {e.reason && <> — « {e.reason} »</>}
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>
    </div>
  );
}
