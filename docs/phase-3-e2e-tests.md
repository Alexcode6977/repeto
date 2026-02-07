# Phase 3 - Stripe E2E Test Runbook

Ce plan valide les flux critiques en environnement prod/staging.

## Pré-requis

- Déploiement Vercel à jour.
- Migrations SQL appliquées (dont `20260207193000` et `20260207204500`).
- Variables d'environnement Stripe/Webhook configurées.
- Un compte test avec accès admin à une troupe.

## Cas 1 - Achat initial troupe

1. Ouvrir `/troupes/:troupeId/subscription`.
2. Cliquer `Mensuel - Troupe` (ou `Annuel - Troupe`).
3. Finaliser le paiement sur Stripe Checkout.
4. Vérifier retour app et état `Abonnement actif détecté`.
5. Vérifier SQL:

```sql
select id, subscription_status, subscription_tier, stripe_customer_id, stripe_subscription_id
from public.troupes
where id = '<TROUPE_ID>';
```

Résultat attendu: `active`, `troupe|troupe_xl`, IDs Stripe non nuls.

## Cas 2 - Double paiement bloqué

1. Revenir sur la même page abonnement.
2. Tenter de relancer un checkout.
3. Vérifier qu'aucun nouveau paiement n'est créé.
4. Vérifier réponse API attendue (409) dans l'onglet réseau.

Résultat attendu: blocage explicite + recommandation d'utiliser le portail.

## Cas 3 - Gestion via portail Stripe

1. Cliquer `Gérer la facturation`.
2. Changer de plan (`troupe` <-> `troupe_xl` ou mensuel <-> annuel).
3. Revenir sur la page abonnement.
4. Vérifier que la page reflète le nouveau plan.

## Cas 4 - Échec de paiement

1. Déclencher un échec de paiement en mode test Stripe.
2. Vérifier SQL:

```sql
select id, subscription_status
from public.troupes
where id = '<TROUPE_ID>';
```

Résultat attendu: `past_due`.

## Cas 5 - Paiement redevenu OK

1. Déclencher un paiement réussi sur la même souscription.
2. Vérifier que le statut repasse `active`.

## Monitoring webhook (obligatoire)

Appeler l'endpoint:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET_TOKEN" \
  "https://<VOTRE_DOMAINE>/api/stripe/webhook/health?hours=24"
```

Résultat attendu:

- `status` = `ok` ou `degraded` (pas `critical` durable).
- `metrics.processedEvents` > 0 sur fenêtre active.
- `metrics.failedEvents` = 0 idéalement.

## Debug SQL rapide

Derniers événements traités:

```sql
select event_id, event_type, processed_at
from public.stripe_webhook_events
order by processed_at desc
limit 20;
```

Derniers échecs webhook:

```sql
select id, event_id, event_type, error_message, created_at
from public.stripe_webhook_failures
order by created_at desc
limit 20;
```
