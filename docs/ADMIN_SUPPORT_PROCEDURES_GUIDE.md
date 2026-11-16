# Guide d'Administration & Gestion des Escalades Support — SabiData

Ce guide est destiné à **l'administrateur** en charge du support utilisateur de SabiData. Il détaille la procédure pour recevoir les alertes, intervenir rapidement lorsqu'un contributeur nécessite une aide humaine, et résoudre les problèmes fréquents.

---

## 1. Vue d'Ensemble & Fonctionnement du Relais

```
[Utilisateur sur l'App Mobile]
       │
       ▼
  Pose une question dans « Aide & support »
       │
  ┌────┴────────────────────────┐
  ▼                             ▼
Question standard            Problème complexe / Demande humaine
(Gains, audio, règles)       (Retrait bloqué, réclamation, litige)
  │                             │
SabiBot répond               🚨 ALERTE ADMIN DÉCLENCHÉE
immédiatement                   (Telegram / Discord / Dashboard)
                                │
                                ▼
                       L'ADMIN PREND LE RELAIS
                       (Réponse directe dans l'app)
```

### Temps de réponse recommandé
* **Alertes financières (retraits, litiges)** : Prise en charge idéale sous **15 à 30 minutes** pendant les heures ouvrables.
* **Questions générales / techniques** : Moins de **2 heures**.

---

## 2. Réception d'une Alerte Admin

Dès qu'une session est escaladée, une notification vous est envoyée (par exemple sur votre canal Telegram ou par notification) contenant :
* Le **nom** et le **numéro de téléphone** de l'utilisateur (+226...).
* Son **niveau de contributeur** (Bronze, Argent, Or) et son **solde actuel** en FCFA.
* La **raison de l'escalade** et le **dernier message** envoyé par l'utilisateur.
* L'identifiant de la session (ex : `sess_98234`).

---

## 3. Fiches Réflexes & Procédures par Scénario

### Scénario A : Retrait Mobile Money retardé ou non reçu
> **Contexte** : L'utilisateur signale qu'il a demandé un retrait Orange Money / Moov Money / Wave et que son compte n'a pas été crédité.

1. **Vérifications préalables** :
   * Consulter l'historique du portefeuille de l'utilisateur (`GET /api/admin/users/:id/ledger`).
   * Vérifier si la transaction est au statut `pending`, `processing` ou `failed` auprès de la passerelle de paiement.
   * Vérifier que le numéro de téléphone renseigné correspond bien à un compte Mobile Money actif.
2. **Action administrative** :
   * Si la transaction est en cours : rassurer sur le délai (jusqu'à 24h ouvrées pour les vérifications de sécurité).
   * Si la transaction a échoué : recréditer le solde sur SabiData ou relancer le virement manuel.
3. **Modèle de réponse** :
   > *« Bonjour [Nom], ici l'équipe d'administration SabiData. Nous avons vérifié votre demande de retrait de [Montant] FCFA vers votre compte [Opérateur]. La transaction a bien été initiée et est actuellement en cours de validation auprès de l'opérateur. Vous recevrez le SMS de confirmation dans les prochaines heures. N'hésitez pas à nous relancer si besoin ! »*

---

### Scénario B : Contestation de rejet d'enregistrement audio
> **Contexte** : L'utilisateur estime que son enregistrement audio a été rejeté à tort lors de la révision par les pairs.

1. **Vérifications préalables** :
   * Écouter le clip audio incriminé depuis le panneau d'administration.
   * Vérifier les critères : niveau de bruit de fond (ventilateur, circulation), prononciation dans la langue (Mooré, Dioula, Fulfuldé ou Gulmancema), respect du texte affiché.
2. **Action administrative** :
   * Si le rejet était justifié : expliquer avec bienveillance le motif exact (ex : saturation du micro).
   * Si le rejet était une erreur d'évaluation : valider manuellement le clip et créditer les points correspondants (+20 ou +150 points).
3. **Modèle de réponse** :
   > *« Bonjour [Nom]. Après réécoute attentive de votre enregistrement par notre équipe, nous avons constaté que le niveau de bruit ambiant était trop élevé pour l'apprentissage de nos modèles d'IA. Pour vos prochains enregistrements, privilégiez une pièce calme. Nous avons toutefois crédité votre compte d'un bonus d'encouragement de 50 points. Merci pour votre investissement ! »*

---

### Scénario C : Problème d'accès au compte ou changement de numéro
> **Contexte** : L'utilisateur a changé de carte SIM ou ne reçoit plus le code OTP.

1. **Vérifications préalables** :
   * Demander à l'utilisateur de confirmer son nom complet, sa région de collecte et ses dernières activités pour valider son identité.
2. **Action administrative** :
   * Mettre à jour le numéro de téléphone associé dans la base de données.
3. **Modèle de réponse** :
   > *« Bonjour [Nom], votre identité a bien été vérifiée. Votre compte est désormais lié à votre nouveau numéro [Nouveau Numéro]. Vous pouvez à présent vous reconnecter avec ce numéro. »*

---

## 4. Comment Répondre Directement à l'Utilisateur ?

### Option 1 : Via l'interface Web Admin (Dashboard)
1. Ouvrez l'onglet **Support & Escalades**.
2. Cliquez sur la conversation en surbrillance rouge / clignotante.
3. Tapez votre réponse dans la boîte de saisie et cliquez sur **Envoyer**. L'utilisateur reçoit instantanément le message avec la mention **Administrateur SabiData** dans son application mobile.
4. Cliquez sur **Clôturer le ticket** une fois la demande traitée.

### Option 2 : Via une commande rapide (cURL / API) si le dashboard est indisponible
Si vous êtes en déplacement ou souhaitez répondre directement par script :

```bash
# Envoyer une réponse admin dans la session
curl -X POST https://sabidata-api-production.up.railway.app/api/admin/support/sessions/ID_SESSION/reply \
  -H "Authorization: Bearer VOTRE_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour, l\'administration a bien résolu votre souci de retrait. Vos fonds ont été transférés."
  }'

# Clôturer la session
curl -X POST https://sabidata-api-production.up.railway.app/api/admin/support/sessions/ID_SESSION/close \
  -H "Authorization: Bearer VOTRE_TOKEN_ADMIN"
```

---

## 5. Règles d'Or du Support SabiData

1. **Empathie et respect** : Les contributeurs sont au cœur de la collecte linguistique. Toujours employer un ton respectueux et encourageant.
2. **Clarté sur l'argent** : Aucune ambiguïté sur les retraits et les points. Chaque FCFA gagné doit être tracé.
3. **Clôture propre** : Ne jamais laisser une session au statut `waiting_admin` plus de 24h sans réponse.
