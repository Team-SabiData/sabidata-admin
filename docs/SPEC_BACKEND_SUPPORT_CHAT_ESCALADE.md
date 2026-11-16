# Spécification backend — Chat support et escalade humaine

**Destinataire :** équipe backend SabiData  
**Objectif :** rendre opérationnel le parcours « SabiBot → équipe support → utilisateur » décrit dans [le guide d’administration](./ADMIN_SUPPORT_PROCEDURES_GUIDE.md) et consommé par la console web.

## État actuel et périmètre

La console d’administration contient une page **Support & escalades**. Elle appelle les routes ci-dessous sous le préfixe `/admin` (le proxy ou le déploiement peut ajouter le préfixe API habituel, par exemple `/api`). La liste est relue toutes les 30 secondes.

Dans ce dépôt, les appels attendus sont :

| Méthode | Route | Usage |
|---|---|---|
| `GET` | `/admin/support/sessions` | Lister les conversations et leurs messages |
| `POST` | `/admin/support/sessions/:id/reply` | Envoyer une réponse de l’administration ; corps `{ "text": "…" }` |
| `POST` | `/admin/support/sessions/:id/close` | Clôturer une conversation |

L’interface d’administration est déjà câblée sur ces contrats. Le backend et l’application mobile ne sont pas inclus dans ce dépôt. La création des sessions, le transfert du chatbot, la livraison des messages sur mobile et l’envoi d’alertes restent à réaliser côté backend / mobile.

## Parcours attendu

1. Le mobile envoie les messages de l’utilisateur au chatbot et conserve un identifiant de session stable.
2. Si le chatbot détecte une demande nécessitant une intervention humaine, il crée ou met à jour la session et la passe à `waiting_admin` (ou au statut équivalent convenu avec le frontend).
3. Le backend enregistre le motif d’escalade et le dernier message, puis déclenche une notification à l’équipe d’administration.
4. L’admin consulte la session dans la console et répond. La réponse est persistée comme un message d’expéditeur `admin` et rendue disponible au mobile.
5. L’utilisateur reçoit et voit la réponse dans l’application. Les messages suivants restent dans la même session jusqu’à résolution ou clôture.
6. L’admin clôture le ticket ; le statut devient `closed` (ou un statut de clôture explicitement normalisé).

Les motifs suggérés dans le guide sont : retrait ou paiement, réclamation sur un enregistrement, problème de compte, demande explicite d’un humain et autre. Garder le motif libre possible pour les cas nouveaux.

## Contrat de données consommé par la console

### `GET /admin/support/sessions`

Réponse attendue :

```json
{
  "sessions": [
    {
      "id": "sess_98234",
      "status": "waiting_admin",
      "reason": "Retrait non reçu",
      "createdAt": "2026-11-16T10:30:00.000Z",
      "updatedAt": "2026-11-16T10:35:00.000Z",
      "lastMessage": "Mon retrait n'est toujours pas arrivé.",
      "user": {
        "id": "user_123",
        "name": "Nom utilisateur",
        "phone": "+226…",
        "level": "Bronze",
        "balanceFcfa": 2500
      },
      "messages": [
        {
          "id": "msg_1",
          "text": "Mon retrait n'est toujours pas arrivé.",
          "sender": "user",
          "createdAt": "2026-11-16T10:30:00.000Z"
        },
        {
          "id": "msg_2",
          "text": "Je vérifie votre demande.",
          "sender": "assistant",
          "createdAt": "2026-11-16T10:31:00.000Z"
        }
      ]
    }
  ]
}
```

Champs utilisés par l’écran : `id`, `status`, `reason`, `user.name`, `user.phone`, `user.level`, `user.balanceFcfa`, `messages[]` (`id`, `text`, `sender`, `createdAt`), `lastMessage`, `createdAt`, `updatedAt`. Les informations utilisateur peuvent être nulles ou absentes. Les dates doivent être ISO 8601. Les expéditeurs reconnus par l’écran sont `user`, `assistant` et `admin`.

Le endpoint doit retourner les sessions ouvertes et clôturées afin que l’écran puisse afficher l’historique. Si le volume l’exige, ajouter pagination et filtres tout en gardant un mode par défaut qui expose les tickets ouverts en premier. Ne jamais inclure de secrets ou de données personnelles qui ne sont pas utiles au traitement.

### `POST /admin/support/sessions/:id/reply`

Requête :

```json
{ "text": "Bonjour, nous vérifions votre demande." }
```

Comportement requis : valider un texte non vide, vérifier l’autorisation de l’admin, persister un message `sender: "admin"` avec l’admin auteur et l’horodatage serveur, mettre à jour `updatedAt`, puis rendre le message disponible à l’utilisateur via le mécanisme mobile. Retourner au minimum `{ "message": { "id", "text", "sender", "createdAt" } }`.

### `POST /admin/support/sessions/:id/close`

Clôturer la session de façon idempotente, conserver son historique et retourner `{ "status": "closed" }`. Définir le comportement si un message arrive ensuite : idéalement réouvrir la session ou créer une nouvelle session avec un lien vers la précédente, selon les règles produit.

## Contrat mobile à définir / implémenter

Fournir au mobile les opérations équivalentes pour :

- démarrer ou reprendre une session de support authentifiée ;
- envoyer un message utilisateur ;
- consulter / recevoir les nouveaux messages (polling, push ou temps réel selon l’architecture existante) ;
- afficher clairement les réponses de l’administration comme **Administrateur SabiData** ;
- empêcher le chatbot de répondre comme s’il avait résolu le problème après le transfert à un humain, ou définir explicitement comment le bot reprend après clôture.

Le choix des routes mobiles et du mécanisme temps réel doit suivre les conventions backend/mobile existantes. Le `sessionId` doit être stable et inaccessible à un autre utilisateur.

## Détection et transfert au support

Le backend doit accepter un déclenchement explicite du bot (intention / score / demande « parler à un humain ») et, si pertinent, des règles métier configurables. Cas prioritaires proposés : litige ou retrait bloqué, contestation de rejet audio, accès au compte, demande explicite d’un agent. Éviter de dépendre uniquement d’une recherche de mots-clés si un classifieur d’intention existe déjà.

Au transfert :

- créer une seule session active par demande (éviter les doublons sur retries) ;
- conserver le fil utile de conversation du bot et le message déclencheur ;
- passer le statut à `waiting_admin` ;
- enregistrer raison, priorité et dates ;
- accuser réception côté mobile et annoncer que l’équipe va répondre ;
- garantir l’idempotence afin qu’un retry du mobile ou du modèle ne génère pas une rafale de tickets.

## Notifications administrateur

À chaque nouvelle escalade, produire une notification fiable vers le canal retenu par l’équipe (notification dashboard, push, email, Telegram/Discord si configuré). Le canal précis est à décider avec l’équipe ; le dashboard constitue le minimum fonctionnel. Prévoir retry, journalisation de l’échec et prévention des doublons.

Contenu minimum de l’alerte : identifiant de session, motif, dernier message, date, lien direct vers `/support` (avec l’identifiant de session si le routage le permet), nom et téléphone si nécessaire au traitement. Niveau et solde ne doivent être ajoutés que si autorisés et utiles au diagnostic. Ne pas envoyer de conversation complète ni de données financières sensibles à un canal tiers non approuvé.

La console rafraîchit actuellement la liste toutes les 30 secondes : une session nouvellement escaladée apparaîtra donc avec ce délai maximum, hors latence réseau. Une notification externe ou un mécanisme temps réel reste nécessaire pour alerter l’admin sans ouvrir la console.

## Authentification, autorisations et audit

- Protéger les trois routes admin par le jeton d’audience `admin` et une permission dédiée, par exemple `support.manage` (à ajouter au modèle RBAC et au rôle autorisé).
- Ne jamais considérer le masquage d’un lien dans l’interface comme une autorisation.
- Vérifier l’accès à la session et à l’utilisateur à chaque requête ; valider et borner les textes.
- Enregistrer dans l’audit l’escalade, les réponses, le changement de statut, l’auteur admin et les timestamps. Le contenu intégral des messages ne doit pas être dupliqué dans les logs d’audit sans nécessité.
- Prévoir une politique de conservation et de suppression des conversations conforme aux règles de données personnelles du produit.
- Réponses API cohérentes avec le backend : `400` entrée invalide, `401` non authentifié, `403` permission absente, `404` session absente ou inaccessible, `409` action incompatible avec l’état.

## Critères d’acceptation

- Une demande d’aide humaine depuis le mobile aboutit à une session visible dans `GET /admin/support/sessions` avec son motif et le contexte nécessaire.
- Une escalade génère une alerte admin une seule fois, avec un lien et les informations minimales.
- Un admin autorisé peut répondre depuis la console ; le message est enregistré et reçu par le bon utilisateur dans l’app mobile.
- Un utilisateur ne peut ni lire ni envoyer des messages dans la session d’un autre utilisateur.
- La clôture met à jour le statut et conserve l’historique ; les sessions fermées restent consultables et ne sont plus comptées comme tickets à traiter.
- Les cas non autorisés, sessions inconnues, textes invalides et retries sont traités de manière déterministe et journalisés sans fuite de données.
- Des tests backend couvrent autorisations, création / escalade idempotente, réponse admin, visibilité mobile, clôture et notifications.

## Décisions à confirmer par l’équipe

1. Préfixe d’API public (`/api/admin/...` ou `/admin/...`) et harmonisation avec les routes existantes. Le client web de ce dépôt appelle `/admin/...`.
2. Valeurs finales du statut et nom de la permission RBAC.
3. Canal de notification admin et configuration des destinataires.
4. Transport des messages vers le mobile et comportement d’une conversation après clôture.
5. Pagination / volume d’historique et politique de conservation.
