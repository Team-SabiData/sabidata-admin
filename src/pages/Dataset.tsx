import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { adminApi, type DatasetRelease } from '../api';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DataTable, type Column } from '../ui/DataTable';
import { useToast } from '../ui/Toast';

export function Dataset() {
  const [releases, setReleases] = useState<DatasetRelease[]>([]);
  const [version, setVersion] = useState('sabidata-mos-v0.1.0');
  const [aOnly, setAOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  const load = useCallback(() => {
    void adminApi.listDatasetReleases()
      .then((r) => setReleases(r.releases))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const publish = async () => {
    setBusy(true);
    try {
      const r = await adminApi.createDatasetRelease({
        version: version.trim(),
        filter: { aOnly, commercialOnly: true },
      });
      push(`Release ${r.release.version} · ${r.itemCount} clips`);
      load();
    } catch (e) {
      push((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const downloadManifest = async (id: string, ver: string) => {
    try {
      const text = await adminApi.downloadManifest(id);
      const blob = new Blob([text], { type: 'application/x-ndjson' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ver}-manifest.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      push((e as Error).message, 'error');
    }
  };

  const columns: Column<DatasetRelease>[] = [
    { key: 'version', label: 'Version', render: (r) => <code>{r.version}</code> },
    {
      key: 'status',
      label: 'Statut',
      render: (r) => <Badge tone={r.status === 'published' ? 'green' : 'amber'}>{r.status}</Badge>,
    },
    {
      key: 'stats',
      label: 'Stats',
      render: (r) => {
        const s = r.stats ?? {};
        return (
          <span className="mono" style={{ fontSize: 12 }}>
            {String(s.clips ?? '—')} clips
            {s.train != null && ` · train ${String(s.train)} / dev ${String(s.dev)} / test ${String(s.test)}`}
          </span>
        );
      },
    },
    {
      key: 'publishedAt',
      label: 'Publié',
      render: (r) => (r.publishedAt ? new Date(r.publishedAt).toLocaleString('fr-FR') : '—'),
    },
    {
      key: 'manifest',
      label: 'Manifeste',
      render: (r) => (
        <Button variant="outline" onClick={() => downloadManifest(r.id, r.version)}>
          Télécharger JSONL
        </Button>
      ),
    },
  ];

  const field: CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-hi)', color: 'var(--text)',
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Dataset</h1>
      <p style={{ margin: 0, color: 'var(--text-sec)', fontSize: 14 }}>
        Publie un release entraînable : clips validated, qualité A/B, tier gold/silver, consentement commercial,
        splits locuteur 80/10/10, manifeste ordonné.
      </p>
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}

      <Card title="Nouveau release">
        <div style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
          <label style={{ fontSize: 13, color: 'var(--text-sec)' }}>
            Version
            <input style={{ ...field, marginTop: 4 }} value={version} onChange={(e) => setVersion(e.target.value)} />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={aOnly} onChange={(e) => setAOnly(e.target.checked)} />
            A-only (exclure qualité B)
          </label>
          <Button variant="primary" loading={busy} onClick={publish}>
            Publier le release
          </Button>
        </div>
      </Card>

      <Card title={`Releases (${releases.length})`}>
        <DataTable columns={columns} rows={releases} rowKey={(r) => r.id} emptyTitle="Aucun release" />
      </Card>
    </div>
  );
}
