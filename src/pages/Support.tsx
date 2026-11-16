import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, type SupportSession } from '../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Field } from '../ui/Field';
import { useToast } from '../ui/Toast';

const active = (s: SupportSession) => !['closed', 'resolved', 'completed'].includes(s.status.toLowerCase());

export function Support() {
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    try {
      const result = await adminApi.supportSessions();
      setSessions(result.sessions);
      setSelectedId((current) => current && result.sessions.some((s) => s.id === current)
        ? current : result.sessions.find(active)?.id ?? null);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const ordered = useMemo(() => [...sessions].sort((a, b) =>
    new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()), [sessions]);
  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  const reply = async () => {
    if (!selected || !draft.trim() || busy) return;
    setBusy(true);
    try {
      await adminApi.replySupportSession(selected.id, draft.trim());
      setDraft('');
      await load();
      push('Réponse envoyée à l’utilisateur.');
    } catch (e) {
      push((e as Error).message, 'error');
    } finally { setBusy(false); }
  };

  const close = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await adminApi.closeSupportSession(selected.id);
      await load();
      push('Conversation clôturée.');
    } catch (e) {
      push((e as Error).message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Support & escalades</h1>
        <Badge tone={ordered.filter(active).length ? 'red' : 'neutral'} dot>{ordered.filter(active).length} à traiter</Badge>
        <Button variant="outline" onClick={() => { setLoading(true); void load(); }}>Actualiser</Button>
      </div>
      <p style={{ color: 'var(--text-sec)', margin: 0, fontSize: 13 }}>Les conversations sont actualisées automatiquement toutes les 30 secondes.</p>
      {error && <p role="alert" style={{ color: 'var(--red)', margin: 0 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 0.8fr) minmax(0, 1.6fr)', gap: 16, alignItems: 'start' }}>
        <Card title="Conversations">
          {loading && sessions.length === 0 ? <p>Chargement…</p> : ordered.length === 0
            ? <EmptyState title="Aucune conversation" message="Les demandes nécessitant une aide humaine apparaîtront ici." />
            : <div style={{ display: 'grid', gap: 8 }}>
              {ordered.map((s) => <button key={s.id} onClick={() => setSelectedId(s.id)} style={{
                textAlign: 'left', background: selectedId === s.id ? 'var(--surface-hi)' : 'transparent',
                color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-ctl)', padding: 12, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{s.user?.name || s.user?.phone || `Utilisateur ${s.id.slice(0, 8)}`}</strong>
                  <Badge tone={active(s) ? 'red' : 'neutral'}>{s.status}</Badge>
                </div>
                <div style={{ color: 'var(--text-sec)', fontSize: 12, marginTop: 7 }}>{s.reason || s.lastMessage || (s.messages?.length ? s.messages[s.messages.length - 1].text : null) || 'Aucun message'}</div>
                <div className="mono" style={{ color: 'var(--text-sec)', fontSize: 11, marginTop: 7 }}>{s.id}</div>
              </button>)}
            </div>}
        </Card>
        <Card title={selected ? `Conversation · ${selected.user?.name || selected.id}` : 'Détails'}>
          {!selected ? <EmptyState title="Sélectionnez une conversation" /> : <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, color: 'var(--text-sec)' }}>
              <span>Session <code>{selected.id}</code></span>
              {selected.user?.phone && <span>Téléphone {selected.user.phone}</span>}
              {selected.user?.level && <span>Niveau {selected.user.level}</span>}
              {typeof selected.user?.balanceFcfa === 'number' && <span>Solde {selected.user.balanceFcfa.toLocaleString('fr-FR')} FCFA</span>}
            </div>
            {selected.reason && <p style={{ margin: 0 }}><strong>Motif d’escalade : </strong>{selected.reason}</p>}
            <div aria-live="polite" style={{ display: 'grid', gap: 10, maxHeight: 420, overflowY: 'auto', padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius-card)' }}>
              {(selected.messages ?? []).length === 0 ? <p style={{ color: 'var(--text-sec)' }}>{selected.lastMessage || 'Aucun message dans cette session.'}</p> : selected.messages!.map((m) => {
                const fromAdmin = m.sender === 'admin';
                return <div key={m.id} style={{ justifySelf: fromAdmin ? 'end' : 'start', maxWidth: '85%', padding: 10, background: fromAdmin ? 'var(--surface-hi)' : 'var(--surface)', borderRadius: 'var(--radius-ctl)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-sec)', marginBottom: 4 }}>{fromAdmin ? 'Administration SabiData' : m.sender === 'assistant' ? 'SabiBot' : 'Utilisateur'} · {new Date(m.createdAt).toLocaleString('fr-FR')}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                </div>;
              })}
            </div>
            {active(selected) && <>
              <Field label="Répondre à l’utilisateur">
                <textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrivez une réponse claire et bienveillante…" />
              </Field>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Button variant="danger" loading={busy} onClick={() => void close()}>Clôturer le ticket</Button>
                <Button variant="primary" loading={busy} disabled={!draft.trim()} onClick={() => void reply()}>Envoyer</Button>
              </div>
            </>}
          </div>}
        </Card>
      </div>
    </div>
  );
}
