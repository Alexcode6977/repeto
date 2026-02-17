# Refactor Import Pipeline - Plan Carre

## 1) Decisions verrouillees

- Deux chemins d'import conserves:
  - chemin A: import classique (sans nettoyage IA initial)
  - chemin B: import IA (nettoyage IA initial)
- Dans les deux cas, meme etape finale obligatoire:
  - parse -> diagnostics IA -> validation bloquante -> save
- IA de diagnostics:
  - ne cree jamais de personnage
  - mappe uniquement vers une liste canonique autorisee
  - propose seulement (humain valide)
- Blocage:
  - impossible de sauvegarder tant qu'une suggestion n'est pas traitee
- Collectifs:
  - labels globaux stables autorises (ex: LES DEUX CAVALIERS)
  - TOUS/TOUTES/ENSEMBLE geres scene par scene
  - option UI exhaustive pour forcer le mode scene par scene

## 2) Pipeline cible (produit)

### A. Chemin classique

1. Upload PDF
2. Parse classique (heuristique actuelle)
3. Scan IA de diagnostics (non destructif)
4. Modal de validation unique (bloquant)
5. Save JSON final

### B. Chemin IA

1. Upload PDF
2. Nettoyage IA (prompt v2)
3. Parse heuristique
4. Scan IA de diagnostics (non destructif, meme moteur)
5. Modal de validation unique (bloquant)
6. Save JSON final

## 3) Contrat JSON minimal (v1)

Le JSON sauvegarde doit inclure un bloc versionne:

```json
{
  "schema_version": 2,
  "mappings": {
    "canonical_characters": ["JOSEPH", "MARTHE", "LUCIEN"],
    "aliases": {
      "VALET DE CHAMBRE": "JOSEPH"
    },
    "collectives": {
      "global": [
        {
          "label": "LES DEUX CAVALIERS",
          "members": ["CAVALIER 1", "CAVALIER 2"]
        }
      ],
      "by_scene": [
        {
          "scene_index": 3,
          "label": "TOUS",
          "members": ["JOSEPH", "MARTHE"]
        }
      ]
    }
  }
}
```

Contraintes:

- toutes les cibles (`aliases`, `members`) doivent appartenir a `canonical_characters`
- pas de cycle d'alias
- pas de membres vides pour un collectif valide

## 4) Contrat diagnostics IA (v1)

Action serveur unique: `runImportDiagnosticsAction(...)` renvoie:

- `canonicalCharacters`: liste canonique de reference
- `aliasSuggestions[]`
- `collectiveSuggestions[]`
- `sceneDiagnostics[]`
- `blockingDecisions[]`

Chaque item doit contenir:

- `id`
- `confidence`
- `reason`
- `requiresDecision: true`

## 5) Work backend (fichiers)

### 5.1 `/app/(protected)/dashboard/actions.ts`

- Ajouter `runImportDiagnosticsAction(parsedScript, canonicalCharacters, options)`
- Ajouter validation serveur:
  - `validateResolvedMappings(...)`
  - rejet si item non traite
  - rejet si cible hors canonical list
- Etendre `saveScript(...)` pour accepter `schema_version` + `mappings`

### 5.2 `/lib/parser.ts`

- Stabiliser normalisation des labels collectifs
- Exposer helper de resolution des scenes pour collectifs
- Garder comportement backward-compatible sur scripts legacy

### 5.3 (optionnel) `/app/actions.ts`

- Exposer un wrapper serveur pour diagnostics si besoin de mutualiser solo/troupe

## 6) Work frontend (fichiers)

### 6.1 `/app/(protected)/dashboard/components/import-wizard.tsx`

- Remplacer la logique actuelle de "fusion manuelle" par:
  - etape "Diagnostics IA"
  - modal de validation unique avec 3 panneaux:
    - A) Personnages canoniques
    - B) Fusions/Aliases proposes
    - C) Collectifs (global + par scene)
- Etat bloquant:
  - bouton "Valider et sauvegarder" desactive tant que `pendingDecisions > 0`

### 6.2 UI de progression IA

- Afficher reellement `isAiImporting`, `aiImportStep`, `aiImportProgress`
- Ajouter etat explicite:
  - nettoyage
  - parsing
  - diagnostics
  - validation

## 7) Runtime repetition (stabilisation)

### 7.1 `/lib/utils.ts`

- `isUserLine(...)` doit prioriser:
  1. mapping collectif par scene
  2. mapping collectif global
  3. fallback actuel

### 7.2 `/lib/hooks/use-rehearsal.ts` et `/components/rehearsal-mode.tsx`

- utiliser les mappings resolus du script pour determiner les tours user
- conserver fallback sur anciens scripts sans mappings

## 8) Compatibilite et migration

- scripts existants (`schema_version` absent):
  - lecture avec fallback legacy
  - no-op en ecriture tant qu'aucune revalidation import n'est faite
- nouveaux scripts:
  - `schema_version: 2` obligatoire

## 9) Tests et criteres d'acceptation

### 9.1 Cas critiques

- PDF propre sans IA initiale -> diagnostics -> save bloque si decisions ouvertes
- PDF OCR degrade avec IA initiale -> diagnostics -> save OK apres resolution
- alias many-to-one valide, cycle alias refuse
- collectif global stable (`LES DEUX CAVALIERS`)
- collectif scene-based (`TOUS`) differents selon scenes

### 9.2 Non-regression

- import catalogue inchangé
- lecture/repetition legacy inchangees sans mappings
- `isUserLine` stable sur scenes longues

## 10) Plan de livraison (sprints)

### Sprint 1

- contrat diagnostics + action serveur
- modal validation bloquante (sans scene editor avance)

### Sprint 2

- collectifs par scene + option exhaustive
- branchement runtime `isUserLine` sur mappings

### Sprint 3

- polish UX, telemetry, tests e2e
- nettoyage dette technique import (duplication solo/troupe)
