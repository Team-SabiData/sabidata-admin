import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { adminApi, type RefDialect, type RefLanguage, type RefPrompt } from '../api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export function Reference() {
  const [languages, setLanguages] = useState<RefLanguage[]>([]);
  const [dialects, setDialects] = useState<RefDialect[]>([]);
  const [prompts, setPrompts] = useState<RefPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  const [langForm, setLangForm] = useState({ code: '', nameFr: '', isoBcp47: '' });
  const [diaForm, setDiaForm] = useState({ languageCode: 'moore', code: '', nameFr: '', zone: '', targetHours: 30 });
  const [prmForm, setPrmForm] = useState({ stableId: '', languageCode: 'moore', dialectCode: '', text: '' });

  const load = useCallback(() => {
    void Promise.all([adminApi.languages(), adminApi.dialects(), adminApi.prompts()])
      .then(([l, d, p]) => {
        setLanguages(l.languages);
        setDialects(d.dialects);
        setPrompts(p.prompts);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createLang = async () => {
    try {
      await adminApi.createLanguage(langForm);
      setLangForm({ code: '', nameFr: '', isoBcp47: '' });
      load();
      push('Langue créée');
    } catch (e) {
      push((e as Error).message, 'error');
    }
  };

  const createDia = async () => {
    try {
      await adminApi.createDialect({
        ...diaForm,
        zone: diaForm.zone || undefined,
        targetHours: Number(diaForm.targetHours) || 0,
      });
      setDiaForm((f) => ({ ...f, code: '', nameFr: '', zone: '' }));
      load();
      push('Dialecte créé');
    } catch (e) {
      push((e as Error).message, 'error');
    }
  };

  const createPrm = async () => {
    try {
      await adminApi.createPrompt({
        stableId: prmForm.stableId,
        languageCode: prmForm.languageCode,
        dialectCode: prmForm.dialectCode || undefined,
        text: prmForm.text,
      });
      setPrmForm((f) => ({ ...f, stableId: '', text: '' }));
      load();
      push('Prompt créé');
    } catch (e) {
      push((e as Error).message, 'error');
    }
  };

  const deactivate = async (stableId: string) => {
    try {
      await adminApi.setPromptActive(stableId, false);
      load();
      push('Prompt désactivé');
    } catch (e) {
      push((e as Error).message, 'error');
    }
  };

  const field: CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-hi)', color: 'var(--text)',
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Référentiel</h1>
      <p style={{ margin: 0, color: 'var(--text-sec)', fontSize: 14 }}>
        Langues, dialectes et prompts — source de vérité pour le dataset.
      </p>
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title={`Langues (${languages.length})`}>
          <ul style={{ margin: '0 0 12px', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            {languages.map((l) => (
              <li key={l.id}><code>{l.code}</code> — {l.nameFr} <span style={{ color: 'var(--text-sec)' }}>({l.isoBcp47})</span></li>
            ))}
          </ul>
          <div style={{ display: 'grid', gap: 8 }}>
            <input style={field} placeholder="code (moore)" value={langForm.code} onChange={(e) => setLangForm({ ...langForm, code: e.target.value })} />
            <input style={field} placeholder="Nom FR" value={langForm.nameFr} onChange={(e) => setLangForm({ ...langForm, nameFr: e.target.value })} />
            <input style={field} placeholder="ISO/BCP47 (mos)" value={langForm.isoBcp47} onChange={(e) => setLangForm({ ...langForm, isoBcp47: e.target.value })} />
            <Button variant="primary" onClick={createLang}>Ajouter langue</Button>
          </div>
        </Card>

        <Card title={`Dialectes (${dialects.length})`}>
          <ul style={{ margin: '0 0 12px', padding: 0, listStyle: 'none', display: 'grid', gap: 6, maxHeight: 180, overflow: 'auto' }}>
            {dialects.map((d) => (
              <li key={d.id}><code>{d.languageCode}/{d.code}</code> — {d.nameFr}{d.zone ? ` · ${d.zone}` : ''}</li>
            ))}
          </ul>
          <div style={{ display: 'grid', gap: 8 }}>
            <input style={field} placeholder="languageCode" value={diaForm.languageCode} onChange={(e) => setDiaForm({ ...diaForm, languageCode: e.target.value })} />
            <input style={field} placeholder="code" value={diaForm.code} onChange={(e) => setDiaForm({ ...diaForm, code: e.target.value })} />
            <input style={field} placeholder="Nom FR" value={diaForm.nameFr} onChange={(e) => setDiaForm({ ...diaForm, nameFr: e.target.value })} />
            <input style={field} placeholder="Zone" value={diaForm.zone} onChange={(e) => setDiaForm({ ...diaForm, zone: e.target.value })} />
            <Button variant="primary" onClick={createDia}>Ajouter dialecte</Button>
          </div>
        </Card>
      </div>

      <Card title={`Prompts actifs (${prompts.length})`}>
        <ul style={{ margin: '0 0 12px', padding: 0, listStyle: 'none', display: 'grid', gap: 8, maxHeight: 240, overflow: 'auto' }}>
          {prompts.map((p) => (
            <li key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <code style={{ flexShrink: 0 }}>{p.stableId}</code>
              <span style={{ flex: 1 }}>{p.text}</span>
              <span style={{ color: 'var(--text-sec)', fontSize: 12 }}>{p.languageCode}</span>
              <Button variant="outline" onClick={() => deactivate(p.stableId)}>Désactiver</Button>
            </li>
          ))}
        </ul>
        <div style={{ display: 'grid', gap: 8 }}>
          <input style={field} placeholder="stableId (p21)" value={prmForm.stableId} onChange={(e) => setPrmForm({ ...prmForm, stableId: e.target.value })} />
          <input style={field} placeholder="languageCode" value={prmForm.languageCode} onChange={(e) => setPrmForm({ ...prmForm, languageCode: e.target.value })} />
          <input style={field} placeholder="dialectCode (optionnel)" value={prmForm.dialectCode} onChange={(e) => setPrmForm({ ...prmForm, dialectCode: e.target.value })} />
          <textarea style={{ ...field, minHeight: 72 }} placeholder="Texte du prompt" value={prmForm.text} onChange={(e) => setPrmForm({ ...prmForm, text: e.target.value })} />
          <Button variant="primary" onClick={createPrm}>Ajouter prompt</Button>
        </div>
      </Card>
    </div>
  );
}
