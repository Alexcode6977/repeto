# 🔧 Repeto — Plan de refactoring UI v2 (final)

## ⚠️ RÈGLES ABSOLUES — À INCLURE DANS CHAQUE PROMPT

Copie-colle ce bloc au début de chaque prompt Claude Code :

```
RÈGLES DE SÉCURITÉ — NE PAS ENFREINDRE :
1. NE PAS modifier la navbar troupe existante (composant déjà codé, change selon le rôle)
2. NE PAS modifier les pages internes des troupes (Calendrier, Pièces, Séances, Organisation)
3. NE PAS modifier le flow de session existant (Prêt à répéter, Config, Session active Écoute/Répétition)
4. NE PAS modifier la page liste des troupes (cards Rejoindre/Créer + troupes existantes) — juste s'assurer qu'elle est accessible via la nouvelle navbar
5. NE PAS casser la version desktop — tout changement mobile doit rester compatible desktop (responsive)
6. NE PAS casser Capacitor — tester les safe areas iOS/Android après chaque modification
7. NE PAS supprimer de routes existantes — on en ajoute, on n'en enlève pas
8. Mode CLAIR uniquement (pas de dark mode pour v1.0)
9. Stack : Next.js 14 App Router, Tailwind CSS, lucide-react, DM Sans + Syne
```

---

## 📐 Architecture cible (résumé des décisions)

**Header** : "Repeto" centré (Syne, violet #7F77DD) + avatar profil à droite. Le texte "Repeto" est cliquable → ramène toujours au monde solo (/favoris). Identique dans les 2 mondes.

**Navbar solo** : 4 onglets — Mes textes | Favoris | Stats | Troupes
- Mes textes toujours à gauche
- Troupes toujours à droite
- Page d'arrivée à l'ouverture de l'app = Favoris (onglet par défaut)

**Navbar troupe** : DÉJÀ CODÉE, ne pas toucher. Change selon le rôle (metteur en scène, admin, comédien).

**Switch solo → troupe** : depuis la page Troupes (onglet navbar solo), clic "Accéder" sur une card.
**Switch troupe → solo** : clic sur "Repeto" dans le header.

**Profil** : accessible via l'avatar en haut à droite du header (partout, solo et troupe). Plus d'onglet profil dans la navbar.

---

## 📋 Plan d'exécution — 8 étapes

| Phase | Étape | Prompt | Risque | Durée estimée |
|-------|-------|--------|--------|---------------|
| 1 | R1 | Header : centrer "Repeto" + avatar | Faible | 30 min |
| 1 | R2 | Navbar solo 4 onglets | Moyen | 1h |
| 1 | R3 | NavbarSwitch (routeur solo/troupe) | Moyen | 45 min |
| 2 | R4 | Page Favoris (nouvelle) | Moyen | 1h30 |
| 2 | R5 | Route / redirige vers /favoris | Faible | 15 min |
| 3 | R6 | Logo cliquable + transitions | Faible | 30 min |
| 3 | R7 | Nettoyage ancien header + dock | Faible | 30 min |
| 3 | R8 | Tests et vérification globale | Faible | 30 min |

**Phase 1** : Header + Navbar (le socle). Exécuter R1 → R2 → R3 dans l'ordre.
**Phase 2** : Page Favoris (la nouvelle home). Exécuter R4 → R5.
**Phase 3** : Polish et nettoyage. Exécuter R6 → R7 → R8.

---

## PROMPT R1 : Header — centrer "Repeto" + avatar à droite

```
Refactorer le header global de Repeto.

ÉTAT ACTUEL :
- Logo Repeto en haut à gauche (icône app + texte)
- 2 icônes à droite (masque théâtral + icône profil)
- Fait trop "webapp"

ÉTAT CIBLE (style Imparato : nom centré + avatar à droite) :
- AU CENTRE : texte "Repeto" en police Syne, font-weight 800, font-size 20px, couleur #7F77DD
  → Cliquable : navigue toujours vers /favoris (la home du mode solo)
  → Utiliser Next.js Link ou router.push('/favoris')
- À DROITE : avatar utilisateur (cercle 32px)
  → Si pas de photo : initiales du user sur fond #EEEDFE, border 2px #CECBF6
  → Si photo : image ronde avec border
  → Cliquable → navigue vers /profile
- À GAUCHE : rien (ou juste un espace vide pour centrer "Repeto")
- Supprimer l'icône masque théâtral
- Supprimer le badge notification
- Height : 44px + safe area top iOS
- Fond blanc, border-bottom 0.5px solid rgba(0,0,0,0.06)

LE HEADER RESTE IDENTIQUE dans les 2 mondes (solo et troupe).
On ne touche PAS à la navbar en bas pour ce prompt.

⚠️ NE PAS CASSER :
- La version desktop (le header doit rester correct sur grand écran)
- Le mode troupe (le header ne doit pas changer quand on est dans une troupe)
- Les safe areas Capacitor

Fichier(s) à modifier :
- Chercher le composant Header existant dans /app/components/ ou /components/
- Le layout principal si le header y est intégré directement
```

---

## PROMPT R2 : Navbar solo — 4 onglets

```
Créer la navbar bottom pour le MODE SOLO de Repeto.

⚠️ La navbar TROUPE est DÉJÀ CODÉE et ne doit PAS être modifiée.
Ce prompt crée un composant SÉPARÉ pour la navbar solo.

NAVBAR SOLO — 4 onglets (de gauche à droite) :

1. "Mes textes" (icon: BookOpen de lucide-react)
   → Route : /mes-textes
   → Liste des scripts solo de l'utilisateur

2. "Favoris" (icon: Heart de lucide-react, rempli quand actif)
   → Route : /favoris
   → Page d'accueil par défaut de l'app (raccourcis de session)

3. "Stats" (icon: Activity de lucide-react)
   → Route : /stats
   → Page Ma Progression (déjà codée, la relier ici)

4. "Troupes" (icon: Users de lucide-react)
   → Route : /troupes
   → Page liste des troupes (DÉJÀ CODÉE, ne pas recréer)

DESIGN :
- Position: fixed bottom, full width
- Fond blanc, bordure top 0.5px rgba(0,0,0,0.06)
- Height: 54px + safe area bottom iOS (env(safe-area-inset-bottom))
- Onglet actif : icône + texte en violet #7F77DD
- Onglet inactif : icône + texte en #C8C8C8
- Icons : 20px, labels : 9px DM Sans font-weight 600
- Espacement : icons et labels centrés dans chaque quart

VISIBILITÉ de la navbar solo :
- VISIBLE : /mes-textes, /favoris, /stats, /troupes, /profile, /scripts/[id]/rehearse
- CACHÉE : pendant session active (/*/active), dans une troupe (/troupes/[id]/*)

IMPORTANT :
- Créer un composant SÉPARÉ : SoloNavbar.tsx
- NE PAS modifier ni importer la navbar troupe dans ce composant
- NE PAS supprimer ou modifier l'ancienne navbar si elle existe — on la remplacera dans R3
- Le composant doit être responsive (pas cassé sur desktop)

Fichier à créer : /app/components/SoloNavbar.tsx
```

---

## PROMPT R3 : NavbarSwitch — routeur intelligent

```
Créer un composant NavbarSwitch qui affiche automatiquement la bonne navbar.

L'APP A 2 NAVBARS :
- SoloNavbar (créé au prompt précédent) : Mes textes | Favoris | Stats | Troupes
- La navbar troupe EXISTANTE (ne pas la modifier, juste l'importer)

LOGIQUE DU SWITCH :

1. D'abord, chercher dans le code le composant navbar troupe existant.
   Il est probablement dans un layout de route troupe ou dans /components/.
   NOTER son nom et son chemin d'import.

2. Créer NavbarSwitch.tsx avec cette logique :

```typescript
const pathname = usePathname();

// Session active → aucune navbar
if (pathname.includes('/active')) return null;

// Dans une troupe spécifique → navbar troupe EXISTANTE
// (route type : /troupes/[id]/calendrier, /troupes/[id]/pieces, etc.)
if (/^\/troupes\/[^/]+\/.+/.test(pathname)) {
  return <TroupeNavbar />;  // ← importer le composant EXISTANT
}

// Partout ailleurs → navbar solo
return <SoloNavbar />;
```

3. Intégrer NavbarSwitch dans le layout principal :
   - Chercher où l'ancienne navbar est rendue (layout.tsx ou un wrapper)
   - La REMPLACER par <NavbarSwitch />
   - Ajouter un padding-bottom conditionnel au contenu principal :
     → padding-bottom = 54px + safe area quand navbar visible
     → padding-bottom = 0 quand navbar cachée (session active)

⚠️ ATTENTION CRITIQUE :
- Si la navbar troupe est dans un layout de route dédié (ex: /app/troupes/[id]/layout.tsx),
  il y a 2 options :
  A) La sortir de ce layout et la gérer via NavbarSwitch (plus propre)
  B) Laisser la navbar troupe dans son layout ET ne rendre NavbarSwitch
     que sur les routes non-troupe (évite les doubles navbars)
  → Choisir l'option qui casse le moins de choses existantes.

- Vérifier qu'il n'y a PAS de double navbar après le changement
- Vérifier que la navbar troupe fonctionne EXACTEMENT comme avant
- Vérifier sur desktop que rien n'est cassé

Fichier(s) :
- Créer : /app/components/NavbarSwitch.tsx
- Modifier : le layout principal (remplacer ancienne navbar)
```

---

## PROMPT R4 : Page Favoris (nouvelle page d'accueil)

```
Créer la page /favoris qui sera la nouvelle page d'accueil de l'app.

DESCRIPTION :
La page Favoris affiche des "raccourcis de session". Chaque favori = un texte + un mode
+ une configuration complète. L'utilisateur tape "Lancer" et arrive directement en session
sans reconfigurer.

POUR L'INSTANT : créer la page avec du MOCK DATA.
On branchera la vraie DB plus tard.

STRUCTURE DE LA PAGE :
- Titre : "Mes favoris" (Syne, 20px, bold)
- Sous-titre : "Lancez une session en un tap" (11px, gris)
- Liste de cards favoris (scroll vertical)

CARD FAVORI (chaque card contient) :
- Icône mode en haut à gauche (micro = Répéter violet, casque = Écouter teal, livre = Lire ambre)
- Titre : "Répéter — [Personnage]" (14px bold)
- Sous-titre : "[Nom pièce] · [Auteur]" (11px gris)
- Tags de configuration : [Mode] [Personnage] [Tolérance] [Visibilité] [Mode lecture]
  → Chaque tag = pill avec couleur selon type (mode=violet, personnage=rouge léger, config=gris)
- En bas : "Dernière : [date]" à gauche + bouton "▶ Lancer" à droite
- Petit cœur rouge en haut à droite (indicateur favori)
- Bouton "Lancer" : violet pour Répéter, teal pour Écouter

EMPTY STATE (quand aucun favori) :
- Grande icône cœur (outline, 60px, dans un carré violet clair)
- Titre : "Pas encore de favoris" (Syne, 18px)
- Sous-texte : "Commencez par ajouter un texte, puis sauvegardez votre
  configuration préférée pour y accéder en un tap."
- 2 boutons d'action :
  1. "Parcourir le catalogue" (CTA principal, fond violet, texte blanc)
     → Navigue vers la page catalogue existante
  2. "Importer mon texte" (secondaire, fond blanc, bordure violet léger)
     → Navigue vers le flow d'import existant
- Astuce en bas : "Sauvegardez un favori depuis le menu ··· d'un texte
  ou après une session." (9px, gris très clair)

MOCK DATA (3 favoris) :
```javascript
const mockFavoris = [
  {
    id: '1',
    pieceTitle: 'Feu la mère admin',
    author: 'Georges Feydeau',
    character: 'Lucienne',
    mode: 'repeat', // repeat | listen | read
    config: { tolerance: 'moderate', visibility: 'hints', readingMode: 'integral' },
    lastSession: '2026-03-21T18:32:00',
  },
  {
    id: '2',
    pieceTitle: "L'aveu de Phèdre à Œnone",
    author: 'Jean Racine',
    character: 'Phèdre',
    mode: 'listen',
    config: { readingMode: 'integral', speed: 'normal' },
    lastSession: '2026-03-20T14:00:00',
  },
  {
    id: '3',
    pieceTitle: 'Feu la mère admin',
    author: 'Georges Feydeau',
    character: 'Lucienne',
    mode: 'repeat',
    config: { tolerance: 'strict', visibility: 'hidden', readingMode: 'solo' },
    lastSession: '2026-03-18T10:15:00',
  },
];
```

ACTION "LANCER" (pour l'instant) :
- Au clic sur "Lancer", naviguer vers /scripts/[id]/rehearse/[mode]/active
  avec les paramètres de config en query string ou dans un store
- Si le routing exact n'est pas encore prêt, naviguer vers /scripts/[id]/rehearse
  (la page "Prêt à répéter" existante) avec les champs pré-remplis

⚠️ NE PAS CASSER :
- Les routes existantes
- La version desktop
- Le mode troupe
- Créer la page dans le bon répertoire Next.js App Router

Fichier à créer : /app/(main)/favoris/page.tsx (ou le répertoire approprié selon la structure existante)
```

---

## PROMPT R5 : Redirection / → /favoris

```
Faire en sorte que l'ouverture de l'app (route /) redirige vers /favoris.

OPTIONS (choisir la plus simple qui ne casse rien) :

Option A — redirect dans next.config.js :
```javascript
redirects: async () => [
  { source: '/', destination: '/favoris', permanent: false },
],
```

Option B — redirect dans /app/page.tsx :
```typescript
import { redirect } from 'next/navigation';
export default function Home() {
  redirect('/favoris');
}
```

Option C — faire de /favoris la vraie page / et mettre le contenu là :
Renommer/déplacer pour que la page Favoris soit à la racine.

CHOISIR l'option qui :
1. Ne casse pas les liens existants vers /
2. Ne casse pas le retour depuis le mode troupe (clic sur "Repeto" → /)
3. Fonctionne avec Capacitor (deeplink, app launch)

Si on utilise un redirect, mettre à jour le lien du logo "Repeto" dans le header
pour pointer vers /favoris (ou /) selon la solution choisie.

⚠️ VÉRIFIER :
- L'app s'ouvre sur Favoris quand on la lance
- Le clic sur "Repeto" dans le header ramène bien aux Favoris
- La navbar solo affiche bien "Favoris" comme onglet actif à l'arrivée
- Les bookmarks/liens existants vers / fonctionnent toujours
- Desktop : pas de boucle de redirect infinie
```

---

## PROMPT R6 : Logo cliquable + transitions solo/troupe

```
Polir le comportement du logo "Repeto" et les transitions entre mondes.

LOGO CLIQUABLE :
- Le texte "Repeto" dans le header est un lien vers /favoris (la home solo)
- En mode solo : clic = retour aux favoris (comportement normal)
- En mode troupe : clic = quitter la troupe, retour aux favoris
  → La navbar troupe disparaît, la navbar solo réapparaît

TRANSITIONS DOUCES :
Quand on passe d'un monde à l'autre, la navbar ne doit pas "flasher".
Ajouter une transition CSS sur le NavbarSwitch :

En Tailwind sur le wrapper de chaque navbar :
- transition-all duration-200 ease-in-out
- opacity et transform pour un fade-in subtil

EDGE CASES :
- Bouton "back" du navigateur/téléphone → la bonne navbar s'affiche
- Deeplink direct vers une URL troupe → navbar troupe sans flash solo
- Retour rapide solo → troupe → solo → pas de glitch

⚠️ NE PAS CASSER le mode troupe ni la version desktop.

Fichier(s) à modifier :
- Header (ajouter le lien si pas déjà fait en R1)
- NavbarSwitch.tsx (ajouter transitions)
```

---

## PROMPT R7 : Nettoyage

```
Nettoyer le code pour supprimer les vestiges de l'ancien design.

À SUPPRIMER :
- L'icône masque théâtral dans le header (si encore référencée quelque part)
- Le badge de notification sur l'ancien profil header
- Le mini dock/slider en bas de page ("Feu la mère...") sur la page Mes textes
  → Ce dock entre en conflit avec la navbar et n'est plus nécessaire
- Le toggle grille/liste sur la page Mes textes (on garde la liste uniquement)
- Les styles/classes CSS orphelins liés à l'ancien header
- Les imports lucide-react non utilisés

⚠️ ATTENTION : certains de ces éléments sont peut-être utilisés dans le mode troupe.
Vérifier AVANT de supprimer que l'élément n'est PAS utilisé ailleurs.
En cas de doute, NE PAS supprimer.

À VÉRIFIER après nettoyage :
- Le header ne contient que "Repeto" (centré) + avatar (droite)
- La page Mes textes n'a plus de dock en bas ni de toggle vue
- Pas de "fantôme" d'ancien composant dans le DOM
- Le responsive desktop fonctionne
- Le mode troupe fonctionne exactement comme avant
- Capacitor : safe areas OK
```

---

## PROMPT R8 : Vérification globale

```
Faire une vérification complète de l'app après le refactoring.

PARCOURS À TESTER :

1. OUVERTURE APP :
   - L'app s'ouvre sur /favoris ✓
   - La navbar solo s'affiche avec 4 onglets ✓
   - "Favoris" est l'onglet actif ✓
   - Le header affiche "Repeto" centré + avatar à droite ✓

2. NAVIGATION SOLO :
   - Tap "Mes textes" → page liste textes ✓
   - Tap "Stats" → page Ma Progression ✓
   - Tap "Troupes" → page liste troupes ✓
   - Tap "Favoris" → page favoris ✓
   - Tap avatar → page profil ✓
   - Depuis profil, tap "Repeto" → retour favoris ✓

3. ENTRÉE DANS UNE TROUPE :
   - Depuis Troupes, tap "Accéder" sur une card ✓
   - La navbar solo disparaît ✓
   - La navbar troupe apparaît (celle qui existait avant) ✓
   - Le header reste identique ✓
   - Toutes les pages troupe fonctionnent comme avant ✓

4. SORTIE D'UNE TROUPE :
   - Tap "Repeto" dans le header ✓
   - Retour à /favoris ✓
   - La navbar troupe disparaît ✓
   - La navbar solo réapparaît ✓

5. SESSION :
   - Depuis Mes textes, tap sur un texte → "Prêt à répéter ?" ✓
   - La navbar solo est visible sur cette page ✓
   - Lancer une session → navbar cachée ✓
   - Quitter la session → navbar solo réapparaît ✓

6. RESPONSIVE :
   - Toutes les pages fonctionnent sur desktop (pas cassé) ✓
   - Le header est correct sur grand écran ✓
   - La navbar s'affiche correctement ✓

7. CAPACITOR :
   - Safe area top (status bar iOS) ✓
   - Safe area bottom (home indicator iOS) ✓
   - Pas de contenu caché sous la navbar ✓

SIGNALER tout problème trouvé mais NE PAS tenter de fix le mode troupe
si quelque chose ne va pas — le signaler pour qu'on le traite séparément.
```

---

## 🗺️ Résumé visuel du plan

```
PHASE 1 — Le socle (faire dans l'ordre)
┌─────────────────────────────────────────┐
│ R1  Header : centrer Repeto + avatar    │ ← commence ici
│ R2  Navbar solo : 4 onglets             │
│ R3  NavbarSwitch : routeur auto         │
└─────────────────────────────────────────┘
         ↓ tester que rien n'est cassé

PHASE 2 — La nouvelle home
┌─────────────────────────────────────────┐
│ R4  Page Favoris (mock data)            │
│ R5  Redirect / → /favoris              │
└─────────────────────────────────────────┘
         ↓ tester le parcours complet

PHASE 3 — Polish
┌─────────────────────────────────────────┐
│ R6  Logo cliquable + transitions        │
│ R7  Nettoyage ancien code               │
│ R8  Tests de vérification globale       │
└─────────────────────────────────────────┘
```

---

## 📝 Cheatsheet — Ce qui change vs ce qui ne change pas

| Élément | Avant | Après |
|---------|-------|-------|
| Header | Logo gauche + 2 icônes droite | "Repeto" centré + avatar droite |
| Navbar solo | Pas de vraie navbar / dock flottant | 4 onglets : Mes textes · Favoris · Stats · Troupes |
| Navbar troupe | Codée (Calendrier, Pièces...) | **INCHANGÉE** |
| Page d'arrivée | Page Mes textes (mode actuel) | Page Favoris |
| Profil | Accessible via icône header | Accessible via avatar header (même endroit, meilleur design) |
| Switch solo→troupe | Flou | Clic "Accéder" sur card troupe |
| Switch troupe→solo | Flou | Clic sur "Repeto" dans header |
| Dock en bas "Feu la mère..." | Présent | **SUPPRIMÉ** |
| Toggle grille/liste | Présent | **SUPPRIMÉ** (liste uniquement) |
| Desktop | Fonctionne | **DOIT TOUJOURS FONCTIONNER** |
