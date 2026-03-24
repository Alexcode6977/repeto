# Repeto - Roadmap mobile/desktop masterclass

## 1. But du chantier

Objectif produit:

- avoir une app mobile Capacitor qui donne une vraie impression d'app premium: rapide, stable, lisible, tactile, coherente
- avoir un dashboard SaaS web propre, robuste, sans regressions provoquees par les changements mobile
- garder un seul backend et une seule logique metier, mais deux rendus explicites: mobile et desktop
- preparer une trajectoire React Native sans imposer une reecriture immediate

Objectif technique:

- supprimer les ecrans "mixtes" qui rendent en meme temps un arbre mobile et un arbre desktop caches par CSS
- sortir la logique de surface, de navigation et de plateforme des composants metier
- isoler progressivement les server actions derriere des gateways et des hooks, sans casser l'existant

## 2. Regles verrouillees

- backend unique
- contrats de donnees uniques
- logique metier partagee
- rendu mobile et rendu desktop separes
- aucun nouvel ecran complet ne doit contenir simultanement un vrai arbre mobile et un vrai arbre desktop dans le meme fichier
- aucun composant d'ecran ne doit lire `window.innerWidth` ou `Capacitor.*` en direct
- les server actions peuvent rester en place au debut, mais l'UI ne doit plus les importer directement a terme
- les differences purement visuelles mineures peuvent rester en CSS responsive

## 3. Probleme actuel a corriger

### 3.1 Shell protege

Le shell protege solo est encore monte de facon globale dans:

- `app/(protected)/layout.tsx`

Puis masque au runtime dans:

- `components/global-header.tsx`
- `components/solo-navbar.tsx`

Le shell troupe est en plus gere par:

- `app/(protected)/troupes/[troupeId]/layout.tsx`

Consequence:

- routes solo et troupe se chevauchent
- logique de decision eparpillee
- risque de double header / double navbar / padding incoherent

### 3.2 Ecrans critiques encore mixtes

Dashboard:

- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/dashboard/components/dashboard-header.tsx`
- `app/(protected)/dashboard/components/script-grid.tsx`

Calendrier troupe:

- `app/(protected)/troupes/[troupeId]/calendar/page.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/calendar-client.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/calendar-view.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/calendar-upcoming-list.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/add-event-modal.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/attendance-toggle.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/mobile-agenda-view.tsx`

Live session:

- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/page.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-client.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-script-viewer.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-actor-grid.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-notes-list.tsx`

### 3.3 Couplage fort a Next / Capacitor

Server actions critiques:

- `app/(protected)/dashboard/actions.ts`
- `lib/actions/calendar.ts`
- `lib/actions/session.ts`
- `lib/actions/troupe.ts`

Couche native / plateforme encore dispersee:

- `components/auth-handler.tsx`
- `components/native-redirect.tsx`
- `lib/hooks/use-mobile-tab-navigation.ts`
- `lib/hooks/use-speech.ts`
- `lib/hooks/use-haptics.ts`
- `lib/hooks/use-wake-lock.ts`
- `lib/hooks/use-keyboard-inset.ts`
- `components/mobile-status-bar.tsx`

## 4. Architecture cible

### 4.1 Convention par feature

Pour chaque ecran critique:

```text
lib/features/<feature>/
  types.ts
  <feature>-gateway.ts
  use-<feature>-screen.ts
  build-<feature>-view-model.ts   (si necessaire)

app/.../<feature>/
  page.tsx                        (ou layout.tsx)
  <feature>-screen.tsx
  <feature>-screen.mobile.tsx
  <feature>-screen.desktop.tsx
```

Principes:

- `gateway`: point d'entree donnees et mutations pour l'ecran
- `use-<feature>-screen`: logique partagee entre mobile et desktop
- `mobile` et `desktop`: renderers purs, sans fetch ni logique plateforme
- `page.tsx`: branche uniquement les donnees initiales et le renderer de haut niveau

### 4.2 Convention shell

Le chrome de navigation doit etre decide a un seul endroit.

Fichiers cibles:

- `lib/routes/protected-surface.ts`
- `components/protected-chrome.tsx`

Responsabilites:

- determiner `solo`, `troupe`, `none`
- monter le bon header / la bonne navbar
- appliquer le bon padding bas / safe area

### 4.3 Convention plateforme

Introduire une couche `lib/platform/` legere pour toutes les capacites natives ou quasi-natives:

- `lib/platform/auth.ts`
- `lib/platform/device.ts`
- `lib/platform/navigation.ts`
- `lib/platform/speech.ts`
- `lib/platform/index.ts`

But:

- ne plus appeler les API natives directement depuis les ecrans
- avoir des points d'entree remplaçables plus tard pour React Native

## 5. Strategie de livraison

Le chantier est volontairement progressif:

- on securise d'abord la separation
- on refactorise ensuite les ecrans critiques
- on durcit ensuite la plateforme Capacitor
- on affine enfin la couche serveur pour preparer l'apres-Next direct

Pas de big bang.

## 6. Phases exactes

## Phase 1 - Securiser le shell et bloquer les regressions

### But

Supprimer les collisions mobile/desktop les plus dangereuses maintenant et poser la structure qui evitera d'en recreer.

### Fichiers a creer

- `lib/routes/protected-surface.ts`
- `components/protected-chrome.tsx`
- `scripts/check-no-mixed-shells.mjs`

### Fichiers a modifier

- `app/(protected)/layout.tsx`
- `app/(protected)/troupes/[troupeId]/layout.tsx`
- `components/global-header.tsx`
- `components/solo-navbar.tsx`
- `package.json`

### Ordre d'execution exact

1. Creer `lib/routes/protected-surface.ts`
2. Encoder les regles de surface:
   - `solo`
   - `troupe`
   - `none`
3. Creer `components/protected-chrome.tsx`
4. Brancher `app/(protected)/layout.tsx` sur ce composant
5. Faire de `components/global-header.tsx` un vrai header solo, sans regex de masque de route
6. Faire de `components/solo-navbar.tsx` une vraie navbar solo, sans auto-decision sur les routes troupe
7. Laisser `app/(protected)/troupes/[troupeId]/layout.tsx` proprietaire du shell troupe
8. Ajouter `scripts/check-no-mixed-shells.mjs`
9. Ajouter un script npm dedie dans `package.json`

### Criteres d'acceptation

- aucune route troupe ne monte encore le chrome solo
- aucune route solo ne depend d'une regex cachee dans un composant pour masquer le chrome
- plus de double navbar entre `solo-navbar` et le shell troupe
- le repertoire contient deja un garde-fou anti double-arbre complet
- aucune regression de navigation visible sur:
  - `/dashboard`
  - `/favoris`
  - `/troupes`
  - `/troupes/[troupeId]`
  - `/troupes/[troupeId]/calendar`
  - `/troupes/[troupeId]/sessions/[eventId]/live`

### Livrable de sortie

- socle de separation stable
- debut de la discipline repo

## Phase 2 - Refactor dashboard en premier-class mobile + desktop

### But

Faire du dashboard la premiere feature proprement scindee avec logique partagee et deux rendus explicites.

### Fichiers a creer

- `lib/features/dashboard/types.ts`
- `lib/features/dashboard/dashboard-gateway.ts`
- `lib/features/dashboard/use-dashboard-screen.ts`
- `app/(protected)/dashboard/dashboard-screen.tsx`
- `app/(protected)/dashboard/dashboard-screen.mobile.tsx`
- `app/(protected)/dashboard/dashboard-screen.desktop.tsx`
- `app/(protected)/dashboard/components/dashboard-header.mobile.tsx`
- `app/(protected)/dashboard/components/dashboard-header.desktop.tsx`
- `app/(protected)/dashboard/components/script-grid.mobile.tsx`
- `app/(protected)/dashboard/components/script-grid.desktop.tsx`

### Fichiers a modifier

- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/dashboard/components/dashboard-header.tsx`
- `app/(protected)/dashboard/components/script-grid.tsx`
- `app/(protected)/dashboard/components/script-card.tsx` si necessaire seulement
- `app/(protected)/dashboard/actions.ts` minimum au debut, plus tard plus fin

### Ordre d'execution exact

1. Extraire dans `dashboard-gateway.ts` les appels actuels a:
   - `getScripts`
   - `getScriptById`
   - `renameScriptAction`
   - `togglePublicStatus`
   - `deleteScript`
   - `getUserTierAction`
   - `launchSoloFavorite`
   - `saveSoloFavorite`
2. Creer `use-dashboard-screen.ts`
3. Deplacer dans ce hook:
   - initialisation user/profile
   - refresh des scripts
   - handlers de renommage / suppression / publication
   - logique de lancement de favori
   - etats de vue
4. Creer `dashboard-screen.mobile.tsx`
5. Creer `dashboard-screen.desktop.tsx`
6. Splitter `dashboard-header.tsx`
7. Splitter `script-grid.tsx`
8. Faire de `page.tsx` un point d'entree fin qui monte `dashboard-screen.tsx`

### Criteres d'acceptation

- le dashboard ne monte plus un arbre mobile complet et un arbre desktop complet dans le meme composant
- les imports directs de server actions disparaissent de l'ecran principal
- modifier le rendu mobile du dashboard ne peut plus casser le layout desktop par effet de bord CSS
- les flows suivants restent fonctionnels:
  - ouvrir un script
  - renommer
  - supprimer
  - basculer public/prive
  - lancer un favori

### Livrable de sortie

- premiere feature reference pour toute la suite

## Phase 3 - Refactor calendrier troupe

### But

Sortir le calendrier troupe du mode "responsive mixte" et le transformer en ecran a logique partagee et rendu scinde.

### Fichiers a creer

- `lib/features/troupe-calendar/types.ts`
- `lib/features/troupe-calendar/calendar-gateway.ts`
- `lib/features/troupe-calendar/use-calendar-screen.ts`
- `lib/features/troupe-calendar/build-calendar-view-model.ts`
- `app/(protected)/troupes/[troupeId]/calendar/calendar-screen.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/calendar-screen.mobile.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/calendar-screen.desktop.tsx`

### Fichiers a modifier

- `app/(protected)/troupes/[troupeId]/calendar/page.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/calendar-client.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/calendar-view.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/calendar-upcoming-list.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/add-event-modal.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/attendance-toggle.tsx`
- `app/(protected)/troupes/[troupeId]/calendar/mobile-agenda-view.tsx`
- `lib/actions/calendar.ts`

### Ordre d'execution exact

1. Encapsuler dans `calendar-gateway.ts`:
   - `getTroupeEvents`
   - `createEvent`
   - `updateAttendance`
2. Construire `build-calendar-view-model.ts` pour normaliser:
   - `eventsByDate`
   - permissions
   - comptages d'invites / presents
   - liens de navigation
3. Creer `use-calendar-screen.ts`
4. Transformer `calendar-client.tsx` en wrapper fin
5. Creer `calendar-screen.mobile.tsx`
6. Creer `calendar-screen.desktop.tsx`
7. Decider du destin de `mobile-agenda-view.tsx`:
   - soit le rebrancher comme renderer mobile
   - soit le supprimer proprement si une autre version le remplace
8. Sortir `add-event-modal.tsx` et `attendance-toggle.tsx` du couplage direct aux server actions

### Criteres d'acceptation

- le calendrier charge toujours via le serveur, mais les composants d'ecran n'importent plus directement les actions
- mobile et desktop ont chacun leur renderer
- ajout d'evenement et gestion des presences restent stables
- aucun `window.innerWidth` ni logique de surface dans les composants metier

### Livrable de sortie

- ecran troupe majeur propre et maintenable

## Phase 4 - Refactor live session

### But

Transformer le flux le plus sensible UX en architecture durable, avec une base capable de supporter de grosses optimisations Capacitor ensuite.

### Fichiers a creer

- `lib/features/live-session/types.ts`
- `lib/features/live-session/live-session-gateway.ts`
- `lib/features/live-session/use-live-session-screen.ts`
- `lib/features/live-session/build-live-session-view-model.ts`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-screen.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-screen.mobile.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-screen.desktop.tsx`

### Fichiers a modifier

- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/page.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-client.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-script-viewer.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-actor-grid.tsx`
- `app/(protected)/troupes/[troupeId]/sessions/[eventId]/live/live-notes-list.tsx`
- `lib/actions/session.ts`

### Ordre d'execution exact

1. Encapsuler dans `live-session-gateway.ts`:
   - `getSessionDetails`
   - `updateSessionStatus`
   - `saveRawNote`
   - `submitSessionFeedback`
2. Creer `build-live-session-view-model.ts`
3. Creer `use-live-session-screen.ts`
4. Transformer `live-client.tsx` en point d'orchestration fin
5. Splitter `live-script-viewer.tsx` si l'ecart mobile/desktop le justifie completement
6. Splitter `live-actor-grid.tsx` si l'ecart mobile/desktop est structurel
7. Sortir le `window.innerWidth` de `live-script-viewer.tsx`
8. Sortir la logique speech ad hoc de l'ecran pour converger vers la couche plateforme

### Criteres d'acceptation

- fin de session, notes et feedback restent stables
- plus de decision mobile/desktop ad hoc dans le viewer live
- les operations critiques sont appelees via un gateway unique
- le flux est pret pour optimisation perf native

### Livrable de sortie

- flux critique de repetition troupe industrialise

## Phase 5 - Durcissement Capacitor / plateforme

### But

Faire monter l'app Capacitor d'un vrai cran en reactivite, robustesse et sensation native.

### Fichiers a creer

- `lib/platform/index.ts`
- `lib/platform/auth.ts`
- `lib/platform/device.ts`
- `lib/platform/navigation.ts`
- `lib/platform/speech.ts`
- `lib/platform/post-auth-destination.ts`

### Fichiers a modifier

- `components/auth-handler.tsx`
- `components/native-redirect.tsx`
- `lib/hooks/use-mobile-tab-navigation.ts`
- `lib/hooks/use-speech.ts`
- `lib/hooks/use-haptics.ts`
- `lib/hooks/use-wake-lock.ts`
- `lib/hooks/use-keyboard-inset.ts`
- `components/mobile-status-bar.tsx`
- `app/template.tsx` si ajustements de transitions necessaires

### Chantiers inclus

- unifier la destination post-auth
- centraliser deep links et reprise de session
- fiabiliser haptics / navigation mobile
- stabiliser audio / speech / warmup iOS
- fiabiliser les safe areas et keyboard insets
- reduire les re-renders pendant la navigation mobile

### Criteres d'acceptation

- navigation plus fluide sur shell natif
- moins d'etats bizarres au retour d'auth
- couche speech plus previsible
- plus aucune dependance native dispersee dans les ecrans critiques

## Phase 6 - Amincir les server actions et ouvrir la piste RN

### But

Conserver Next en production maintenant, mais faire en sorte que les ecrans n'en dependent plus directement.

### Fichiers a creer

- `lib/server/dashboard-service.ts`
- `lib/server/calendar-service.ts`
- `lib/server/live-session-service.ts`

### Fichiers a modifier

- `app/(protected)/dashboard/actions.ts`
- `lib/actions/calendar.ts`
- `lib/actions/session.ts`

### Ordre d'execution exact

1. Sortir la logique metier reutilisable hors des server actions
2. Laisser aux server actions seulement:
   - auth
   - appel service
   - revalidation Next
   - format de reponse
3. Garder les gateways cote feature comme facade stable
4. A plus long terme, brancher une autre implementation pour React Native si besoin

### Criteres d'acceptation

- les ecrans peuvent vivre sans import direct de server actions
- une future app RN pourra rebrancher les memes hooks/logiques via un autre transport

## 7. Ordre global recommande

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

Raison:

- phase 1 supprime le plus gros risque de regression croisee
- phase 2 cree le modele de refacto
- phases 3 et 4 l'appliquent aux flux critiques
- phase 5 fait passer l'app mobile de "web app empaquetee" a "shell mobile haut de gamme"
- phase 6 consolide la trajectoire long terme

## 8. Definition of done par nouvel ecran

Un ecran est considere propre quand:

- il a un point d'entree logique unique
- il a un renderer mobile et un renderer desktop si la structure diverge vraiment
- il ne contient pas deux ecrans complets caches par breakpoint
- il n'importe pas directement une server action depuis le composant de rendu
- il n'appelle pas `window.innerWidth` ou `Capacitor.*` en direct
- les mutations passent par le gateway de la feature
- ses regressions solo / troupe / mobile / desktop sont couvertes par verification manuelle minimale

## 9. Garde-fous a introduire des la phase 1

- script `check-no-mixed-shells.mjs`
- commande npm dediee
- revue de code: "logic once, render twice"
- interdiction des ecrans complets doubles dans le meme fichier
- interdiction des choix de surface eparpilles dans plusieurs composants

## 10. Ce qu'on lance en premier

Au prochain chantier, on lance la Phase 1 avec ce scope exact:

- creer `lib/routes/protected-surface.ts`
- creer `components/protected-chrome.tsx`
- nettoyer `app/(protected)/layout.tsx`
- nettoyer `components/global-header.tsx`
- nettoyer `components/solo-navbar.tsx`
- verifier `app/(protected)/troupes/[troupeId]/layout.tsx`
- ajouter le garde-fou repo dans `scripts/check-no-mixed-shells.mjs`
- brancher le script dans `package.json`

Si la Phase 1 est propre, on enchaine directement sur le dashboard.

## 11. Convention repo active

La convention a appliquer sur toute UI touchee est:

- `gateway` ou `service` pour les acces donnees et effets de bord
- `use-<feature>-screen` pour l'etat partage et les transitions
- `<feature>-screen.tsx` comme wrapper neutre
- `<feature>-screen.mobile.tsx` et `<feature>-screen.desktop.tsx` des qu'il y a divergence structurelle
- les renderers restent purs: pas de fetch metier, pas de server action directe, pas de `Capacitor.*`, pas de `window.innerWidth`

Exceptions autorisees:

- micro-variantes de densite, typo, label ou spacing inline
- composants feuille explicitement documentes par le garde-fou mixed-shell

Checklist PR UI obligatoire:

- impact mobile verifie
- impact desktop verifie
- impact gateway ou service verifie si logique touchee
- preuve visuelle des deux surfaces si renderer touche
- `node scripts/check-no-mixed-shells.mjs`
- `npm run build`
