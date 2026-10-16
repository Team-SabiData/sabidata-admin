# Déploiement Vercel

Repo : https://github.com/Team-SabiData/sabidata-admin

1. https://vercel.com/new → importer `Team-SabiData/sabidata-admin`
2. Framework : Vite ; build `npm run build` ; output `dist`
3. Éditer `vercel.json` : remplacer `REPLACE_WITH_RAILWAY_HOST` par l’hôte Railway
   (ex. `sabidata-backend-production.up.railway.app`)
4. Commit + push, ou override via dashboard Rewrites
5. Ouvrir `https://<projet>.vercel.app` → login admin + TOTP
