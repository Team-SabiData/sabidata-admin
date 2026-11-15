import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Audit, csvField } from './Audit';

// Export CSV du journal d'audit : chaque champ doit être quoté/échappé
// (guillemets doublés) et l'injection de formule (=, +, -, @) neutralisée
// par une apostrophe de garde — sinon Excel/Sheets exécute la valeur.
describe('csvField', () => {
  it('entoure toujours de guillemets', () => {
    expect(csvField('simple')).toBe('"simple"');
    expect(csvField('')).toBe('""');
  });

  it('double les guillemets internes', () => {
    expect(csvField('il a dit "stop"')).toBe('"il a dit ""stop"""');
  });

  it('protège le séparateur ; et les retours à la ligne au sein du champ', () => {
    expect(csvField('a;b')).toBe('"a;b"');
    expect(csvField('ligne1\nligne2')).toBe('"ligne1\nligne2"');
  });

  it('neutralise une valeur qui commence par =, +, - ou @ (injection formule)', () => {
    expect(csvField('=cmd|"/bin/sh"!A1')).toBe('"\'=cmd|""/bin/sh""!A1"');
    expect(csvField('+1234')).toBe('"\'+1234"');
    expect(csvField('-1234')).toBe('"\'-1234"');
    expect(csvField('@SUM(A1)')).toBe('"\'@SUM(A1)"');
  });

  it('laisse intact un motif normal ne commençant pas par un caractère dangereux', () => {
    expect(csvField('virement effectué réf 123')).toBe('"virement effectué réf 123"');
  });
});

describe('page Audit', () => {
  it("affiche les manipulations dans l'ordre antéchronologique (les plus récentes en haut)", async () => {
    const mockUsers = {
      users: [
        { id: 'u1', name: 'Admin Un' },
      ],
    };
    const mockAuditLog = {
      entries: [
        {
          id: 'log-old',
          actorId: 'u1',
          action: 'login',
          entityType: 'user',
          entityId: 'u1',
          reason: 'Première connexion ancienne',
          createdAt: '2026-01-01T10:00:00.000Z',
        },
        {
          id: 'log-mid',
          actorId: 'u1',
          action: 'wallet.adjust',
          entityType: 'user',
          entityId: 'u1',
          reason: 'Ajustement intermédiaire',
          createdAt: '2026-05-15T12:00:00.000Z',
        },
        {
          id: 'log-newest',
          actorId: 'u1',
          action: 'user.status',
          entityType: 'user',
          entityId: 'u1',
          reason: 'Manipulation toute récente',
          createdAt: '2026-11-15T18:00:00.000Z',
        },
      ],
    };

    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.startsWith('/admin/audit-log')) {
        return new Response(JSON.stringify(mockAuditLog), { status: 200 });
      }
      if (u.startsWith('/admin/users')) {
        return new Response(JSON.stringify(mockUsers), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }));

    render(
      <MemoryRouter>
        <Audit />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Manipulation toute récente')).toBeInTheDocument();
    });

    // Vérifier l'ordre des lignes dans le tableau
    const rows = screen.getAllByRole('row');
    // rows[0] est l'en-tête th, rows[1] doit être la plus récente
    expect(rows[1]).toHaveTextContent('Manipulation toute récente');
    expect(rows[2]).toHaveTextContent('Ajustement intermédiaire');
    expect(rows[3]).toHaveTextContent('Première connexion ancienne');
  });
});
