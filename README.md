# sabidata-admin

Console d’administration SabiData (React + Vite + TypeScript).

## Local

```bash
npm install
npm run dev          # proxy /admin et /api → http://localhost:3000
npm test
npm run build
```

## Production (Vercel)

1. Lier le repo `sabidata-admin`
2. Dans `vercel.json`, remplacer `REPLACE_WITH_RAILWAY_HOST` par l’hôte Railway
   (ex. `sabidata-backend-production.up.railway.app`) **sans** `https://` doublé — le fichier utilise déjà `https://…`
3. Laisser `VITE_API_BASE_URL` vide : les `fetch('/admin/…')` restent same-origin ; Vercel proxifie vers Railway
4. Déployer ; ouvrir `https://<projet>.vercel.app` → login email + TOTP

Alternative cross-origin : définir `VITE_API_BASE_URL=https://<railway>` et configurer `CORS_ORIGINS` côté backend.
