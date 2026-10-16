import { useCallback, useEffect, useState } from 'react';
import { adminApi, type QualityItem } from '../api';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DataTable, type Column } from '../ui/DataTable';
import { useToast } from '../ui/Toast';

export function QualityQueue() {
  const [items, setItems] = useState<QualityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { push } = useToast();

  const load = useCallback(() => {
    void adminApi.qualityQueue()
      .then((r) => setItems(r.items))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const listen = async (id: string) => {
    setPlayingId(id);
    try {
      const url = await adminApi.fetchClipAudio(id);
      new Audio(url).play();
    } catch (e) {
      push((e as Error).message, 'error');
    } finally {
      setPlayingId(null);
    }
  };

  const columns: Column<QualityItem>[] = [
    { key: 'id', label: 'Clip', render: (c) => <code>{c.id.slice(0, 8)}</code> },
    { key: 'status', label: 'Statut', render: (c) => <Badge tone="amber">{c.status}</Badge> },
    {
      key: 'audioQuality',
      label: 'Qualité',
      render: (c) => <Badge tone={c.audioQuality === 'F' ? 'red' : 'blue'}>{c.audioQuality ?? '—'}</Badge>,
    },
    { key: 'durationS', label: 'Durée', render: (c) => `${c.durationS}s` },
    {
      key: 'lang',
      label: 'Langue',
      render: (c) => `${c.language ?? '—'} / ${c.dialect ?? '—'}`,
    },
    {
      key: 'prompt',
      label: 'Prompt',
      render: (c) => (
        <span style={{ maxWidth: 220, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.promptText ?? '—'}
        </span>
      ),
    },
    {
      key: 'metrics',
      label: 'Métriques',
      render: (c) => (
        <span className="mono" style={{ fontSize: 12 }}>
          silence {c.silenceRatio != null ? c.silenceRatio.toFixed(2) : '—'}
          {' · '}SNR {c.snrDb != null ? `${c.snrDb.toFixed(0)}dB` : '—'}
        </span>
      ),
    },
    {
      key: 'listen',
      label: 'Audio',
      render: (c) => (
        <Button variant="outline" loading={playingId === c.id} onClick={() => listen(c.id)}>
          ▶
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>File qualité</h1>
      <p style={{ margin: 0, color: 'var(--text-sec)', fontSize: 14 }}>
        Clips rejetés automatiquement ou marqués qualité F (hors corpus exportable).
      </p>
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
      <Card title={`${items.length} clip(s)`}>
        <DataTable columns={columns} rows={items} rowKey={(c) => c.id} emptyTitle="File vide" />
      </Card>
    </div>
  );
}
