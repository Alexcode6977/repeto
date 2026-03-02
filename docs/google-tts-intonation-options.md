# Google TTS: options pour améliorer l'intonation et la fluidité

## Objectif

Ce document résume les options réalistes pour obtenir une lecture plus naturelle, plus fluide et plus utile au jeu d'acteur avec notre pipeline actuel basé sur Google TTS.

Le point de départ est le suivant:

- la vocalisation est obligatoire;
- nous utilisons Google TTS pour générer l'audio;
- les didascalies sont déjà détectées et découpées;
- nous voulons améliorer à la fois:
  - l'intonation;
  - la fluidité;
  - la lisibilité pour l'acteur.

## Etat actuel du produit

Aujourd'hui, le système fonctionne globalement ainsi:

- les lignes sont vocalisées avec Google TTS;
- les didascalies entre parenthèses sont découpées en segments distincts;
- les segments de didascalies sont lus séparément du dialogue;
- les voix de personnage et la voix "système" sont distinctes;
- un moteur audio "gapless" recolle les segments avec un léger chevauchement pour réduire les coupures.

Conséquence importante:

- faire lire une didascalie comme `(avec colère)` avant une réplique n'améliore pas automatiquement l'intonation de la réplique suivante;
- cela informe l'utilisateur, mais Google TTS ne "comprend" pas cette didascalie comme une instruction de jeu si elle est lue comme un segment audio séparé.

En clair: lire la didascalie aide la compréhension, mais ne pilote pas vraiment la prosodie de la phrase suivante.

## Les leviers réellement disponibles

Avec notre intégration actuelle, les leviers les plus utiles sont:

- le choix de la voix;
- la vitesse (`speakingRate`);
- la hauteur (`pitch`);
- le gain (`volumeGainDb`);
- le découpage du texte;
- la gestion des pauses;
- le timing entre segments.

Ce sont ces paramètres qui permettent d'améliorer le rendu, pas le simple fait de faire prononcer toutes les didascalies.

## Option 1: continuer à lire toutes les didascalies

### Principe

On conserve la logique actuelle: toute didascalie est lue à voix haute, séparément du dialogue.

Exemple:

- `(avec colère) Je pars.` devient:
  - "avec colère"
  - puis "Je pars."

### Avantages

- très simple conceptuellement;
- aucune ambiguïté pour l'acteur: l'intention est explicitement entendue;
- cohérent avec l'idée de vocalisation obligatoire;
- peu de changement de produit.

### Limites

- le flux devient plus lourd et plus artificiel;
- certaines didascalies cassent le rythme;
- l'intonation de la réplique ne s'améliore pas réellement;
- on surcharge l'utilisateur avec des informations qui devraient parfois rester implicites.

### Verdict

Option acceptable pour la clarté, mais faible pour le naturel.

## Option 2: ne plus lire certaines didascalies, les convertir en réglages vocaux

### Principe

Les didascalies qui décrivent une intention de jeu ne sont plus prononcées. Elles servent à modifier la synthèse de la réplique suivante.

Exemples:

- `(avec colère)` -> volume plus fort, débit plus tendu, éventuellement pitch plus haut;
- `(hésitant)` -> débit ralenti, pause légère avant la phrase;
- `(à voix basse)` -> gain plus faible, débit plus retenu;
- `(avec ironie)` -> débit légèrement ralenti, ponctuation et rythme plus marqués.

### Avantages

- améliore réellement la sensation d'intonation;
- rend le flux plus naturel;
- évite de "sur-commenter" le texte;
- exploite mieux les capacités déjà disponibles dans Google TTS.

### Limites

- demande une logique de classification des didascalies;
- certaines intentions théâtrales sont difficiles à traduire en simples paramètres audio;
- le rendu restera limité par les capacités expressives natives de Google TTS.

### Verdict

C'est le levier le plus rentable dans l'architecture actuelle.

## Option 3: convertir certaines didascalies en pauses silencieuses

### Principe

Les didascalies de type pause ne sont pas lues. Elles deviennent un silence contrôlé.

Exemples:

- `(un temps)` -> pause courte;
- `(silence)` -> pause moyenne;
- `(long silence)` -> pause longue;
- `(hésite)` -> micro-pause avant la reprise.

### Avantages

- améliore fortement la fluidité perçue;
- évite les interruptions inutiles;
- donne un rythme beaucoup plus crédible;
- très pertinent pour le théâtre, où la pause fait partie du jeu.

### Limites

- il faut définir des durées cohérentes;
- une pause mal calibrée peut ralentir excessivement la lecture;
- cette option améliore surtout le rythme, pas la couleur émotionnelle de la voix.

### Verdict

Très forte valeur pour la fluidité. A combiner avec l'option 2.

## Option 4: approche hybride (recommandée)

### Principe

Toutes les didascalies ne sont pas traitées de la même façon. On les classe en trois familles:

- didascalies de pause;
- didascalies d'intonation;
- didascalies d'action / information de jeu.

### Règle de traitement

- didascalies de pause:
  - transformées en silence;
- didascalies d'intonation:
  - non lues;
  - converties en réglages vocaux pour la réplique;
- didascalies d'action ou de mise en scène:
  - lues uniquement si elles sont utiles à l'acteur.

### Exemples

- `(un temps) Je pars.` -> pause, puis réplique;
- `(avec colère) Je pars.` -> réplique avec réglages plus tendus, sans lire "avec colère";
- `(il s'assoit) Je pars.` -> on peut choisir de lire "il s'assoit" si l'information est utile.

### Avantages

- meilleur équilibre entre clarté et naturel;
- réduit la fatigue d'écoute;
- améliore à la fois l'intonation et la fluidité;
- compatible avec le pipeline actuel sans refonte complète.

### Limites

- demande une table de règles claire;
- nécessite des tests de calibration sur plusieurs pièces et styles d'écriture.

### Verdict

C'est la meilleure option produit à court terme.

## Option 5: enrichir le texte avant synthèse

### Principe

Au lieu de seulement jouer sur les paramètres audio, on peut aussi réécrire légèrement le texte envoyé au TTS pour guider la lecture.

Exemples:

- ajouter ou renforcer une ponctuation expressive;
- insérer des ellipses pour matérialiser une hésitation;
- découper une phrase longue en segments plus courts;
- isoler certaines incises pour éviter un débit trop plat.

Exemples de transformation:

- `Je ne sais pas.` -> `Je... ne sais pas.`
- `Non, je refuse.` -> `Non. Je refuse.`

### Avantages

- améliore souvent le rendu sans changer de moteur TTS;
- très utile pour les hésitations, ruptures, reprises;
- peut être combiné avec les réglages de vitesse et de pause.

### Limites

- risque d'altérer la fidélité du texte si on va trop loin;
- demande des règles très prudentes;
- peut être perçu comme trop interprétatif si la transformation est visible.

### Verdict

Option utile, mais à utiliser avec parcimonie. Idéalement limitée à des cas très ciblés.

## Option 6: améliorer la fluidité pure sans toucher à l'intonation

### Principe

On garde les voix et le contenu quasi identiques, mais on améliore le ressenti d'écoute en travaillant uniquement sur l'enchaînement audio.

Les leviers possibles:

- préchargement plus agressif des segments;
- ajustement plus fin du chevauchement entre segments;
- pauses dynamiques selon la ponctuation;
- règles spécifiques entre didascalie et dialogue;
- suppression de certaines micro-coupures inutiles.

### Avantages

- faible risque fonctionnel;
- amélioration immédiatement perceptible;
- très bon retour utilisateur sur les textes longs;
- ne demande pas de changer la logique éditoriale.

### Limites

- n'améliore pas vraiment l'expressivité;
- corrige le ressenti, pas la qualité intrinsèque de l'interprétation.

### Verdict

Important, mais insuffisant seul si l'objectif principal est l'intonation.

## Option 7: utiliser un moteur plus expressif

### Principe

Si l'objectif est une vraie montée en gamme sur l'expressivité, il faut envisager un moteur de synthèse plus pilotable, capable de mieux suivre des consignes de style.

Cela peut passer par:

- une évolution vers une offre Google plus orientée "speech generation" / instruction-driven;
- ou l'évaluation d'un autre fournisseur sur les scènes où l'expressivité est prioritaire.

### Avantages

- plus grand potentiel d'intonation;
- possibilité de mieux suivre des consignes de jeu;
- rend les didascalies d'intonation plus exploitables.

### Limites

- intégration plus lourde;
- coûts potentiellement plus élevés;
- nouveaux arbitrages produit et techniques;
- risque de latence ou de changement de qualité selon les cas.

### Verdict

Bonne piste stratégique, mais pas nécessaire pour une amélioration nette à court terme.

## Recommandation produit

La meilleure trajectoire, sans refonte majeure, est:

1. classer les didascalies en catégories;
2. transformer les didascalies de pause en silences;
3. transformer les didascalies d'intonation en réglages vocaux;
4. ne lire que les didascalies d'action réellement utiles;
5. affiner ensuite le moteur gapless et les timings.

En pratique, cela donne:

- plus de naturel;
- moins de fatigue d'écoute;
- une meilleure sensation d'intention;
- un meilleur équilibre entre "outil de répétition" et "lecture agréable".

## Proposition de règles simples

### Didascalies de pause

Exemples:

- `un temps`
- `silence`
- `pause`
- `hésite`
- `après un moment`

Traitement recommandé:

- ne pas les lire;
- insérer une pause:
  - courte: 200 à 350 ms;
  - moyenne: 500 à 800 ms;
  - longue: 1000 à 1500 ms.

### Didascalies d'intonation

Exemples:

- `avec colère`
- `doucement`
- `à voix basse`
- `hésitant`
- `avec ironie`
- `en criant`

Traitement recommandé:

- ne pas les lire;
- ajuster un profil vocal sur la phrase suivante.

Exemples de profils:

- colère:
  - `speakingRate` un peu plus rapide;
  - `volumeGainDb` plus haut;
  - ponctuation plus tranchée;
- hésitation:
  - `speakingRate` plus lent;
  - micro-pause au démarrage;
  - éventuel découpage de phrase;
- confidence / douceur:
  - `speakingRate` plus posé;
  - `volumeGainDb` légèrement réduit;
  - enchaînement plus souple.

### Didascalies d'action

Exemples:

- `il s'assoit`
- `elle traverse la scène`
- `il se rapproche`
- `montrant la porte`

Traitement recommandé:

- les lire seulement si elles aident réellement la répétition;
- sinon les garder uniquement pour l'affichage visuel.

## Risques à éviter

- lire toutes les didascalies sans distinction: trop verbeux, peu naturel;
- convertir trop agressivement le texte: on déforme le texte de l'auteur;
- multiplier les règles trop fines trop tôt: maintenance difficile;
- viser une "émotion parfaite" uniquement via `pitch` et `speakingRate`: le gain sera réel, mais limité.

## Plan d'implémentation conseillé

### Phase 1

- ajouter une classification simple des didascalies;
- introduire 3 traitements: pause, intonation, action;
- garder un fallback qui lit la didascalie si elle n'est pas reconnue.

### Phase 2

- définir une table de profils vocaux pour 8 à 12 intentions fréquentes;
- calibrer les pauses et les vitesses sur plusieurs textes;
- ajuster le moteur gapless pour les transitions les plus courantes.

### Phase 3

- mesurer le ressenti utilisateur;
- identifier les cas où Google TTS atteint ses limites;
- décider si une évolution vers un moteur plus expressif est justifiée.

## Conclusion

Le simple fait de faire lire les didascalies n'est pas suffisant pour améliorer l'intonation.

Pour améliorer réellement le rendu avec Google TTS, il faut surtout:

- traiter les didascalies comme des instructions;
- distinguer pause, intonation et action;
- piloter le rythme et les paramètres vocaux;
- ne garder la lecture explicite que quand elle apporte une vraie valeur à l'acteur.

La stratégie la plus solide à court terme est donc une approche hybride: moins de didascalies prononcées, plus de didascalies converties en comportement vocal.
