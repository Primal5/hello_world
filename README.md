# Web FPS/RPG Starter (Three.js + React + Zustand)

Starter project modulaire pour un RPG/FPS web en vue subjective.

## Installation

```bash
npm install
```

## Lancement (dev)

```bash
npm run dev
```

## Build production

```bash
npm run build
npm run preview
```

## Structure

```text
src/
  core/
  engine/
  gameplay/
  ui/
  data/
  styles/
  main.tsx
public/
  assets/
    models/
```

- `core/`: orchestration de la boucle de jeu et du bootstrap.
- `engine/`: rendu, monde 3D, contrôles FPS, raycast, collisions simples.
- `gameplay/`: joueur, inventaire, interactions, dialogues, quêtes (base extensible).
- `ui/`: HUD React + stores Zustand.
- `data/`: contenu éditable (items, niveau, dialogues).

## Démo incluse

- Déplacement FPS (WASD + souris + saut espace + gravité).
- Prompt d’interaction au centre (`E`).
- Coffre de départ: donne `rusty_key`.
- Progression par zones verrouillées: `rusty_key`, `bronze_key`, `silver_key`, `gold_key`.
- Portes nommées: entrée, bronze, argent, or.
- PNJ: affiche un dialogue dans le journal.
- Inventaire ouvrable avec `I`.

## Assets Meshy / glTF / GLB

Le projet est prêt à charger des modèles Meshy via `GLTFLoader`.

Placez vos modèles dans:

```text
public/assets/models/
```

Exemples:

- `public/assets/models/chest.glb`
- `public/assets/models/door.glb`
- `public/assets/models/npc.glb`
- `public/assets/models/meshy/robot-guide/scene.gltf`

### Comment brancher un modèle Meshy

1. Exportez depuis Meshy en `GLB` ou `GLTF`.
2. Copiez les fichiers dans `public/assets/models/`.
3. Mettez à jour `src/engine/ModelRegistry.ts` avec le bon chemin.
4. Ajustez `scale`, `rotation` et `offset` si le modèle est trop grand, couché ou mal centré.

Exemple:

```ts
const npc = {
  path: '/assets/models/meshy/robot-guide/scene.gltf',
  scale: [0.75, 0.75, 0.75],
  rotation: [0, Math.PI, 0],
  offset: [0, 0, 0]
};
```

### Ce que le projet gère maintenant

- chargement `.glb` et `.gltf`
- cache et clonage des modèles pour réutiliser un même asset plusieurs fois
- ombres activées sur les meshes importés
- correction colorimétrique pour les textures
- centrage horizontal automatique du modèle
- repositionnement automatique pour poser le mesh sur le sol
- fallback procédural si un asset manque ou échoue au chargement

## Modifier les données de niveau

- Entités du niveau: `src/data/level.ts`.
- Items: `src/data/items.ts`.
- Dialogues: `src/data/dialogues.ts`.

## Limite actuelle

Je n’ai pas ajouté de modèle gratuit externe dans le dépôt: l’environnement actuel ne me permet pas d’en télécharger un proprement. En revanche, le projet est prêt à recevoir directement un export Meshy en le déposant dans `public/assets/models/`.

## Extensions futures

Base prête pour ajouter:

- système de quêtes avancé
- dialogues à embranchements
- PNJ dynamiques
- combat FPS/melee
- persistance/sauvegarde

## Rappel gameplay

### Codes couleur des raretés d’objets

| Rareté | Label affiché | Couleur (hex) |
| --- | --- | --- |
| junk | Dechets | `#8d99ae` |
| common | Commun | `#f5f7fb` |
| magic | Magique | `#72b8ff` |
| rare | Rare | `#ffd76a` |
| epic | Epique | `#be8cff` |
| legendary | Legendaire | `#ff9b47` |
| artifact | Artefact | `#ff6b5f` |
| quest | Objet de quete | `#4ef2d2` |

### Règles de création du donjon

- Génération procédurale avec une grille de **48 x 48 cellules** sur une zone de **160 unités**.
- Le générateur tente jusqu’à **200 essais** pour produire un graphe valide de salles/couloirs.
- La salle de départ (`spawn`) est fixée en bas de la carte.
- Trois zones de progression sont générées ensuite, chacune avec **20 salles garanties**:
  - zone bronze
  - zone argent
  - zone or
- Le boss est généré après la zone or, derrière la porte d’or.
- Les salles d’une zone sont placées relativement (nord/sud/est/ouest) dans une bande spatiale dédiée, avec contraintes de taille et de zone autorisée.
- Les salles ne peuvent pas se chevaucher ni se toucher.
- Les couloirs sont générés à partir des recouvrements entre salles, avec des largeurs choisies parmi **0.5 / 0.75 / 1** (selon la largeur maximale autorisée du couloir).
- Les portes intérieures sont créées aux transitions salle/couloir.
- Les portes spéciales délimitent la progression entre zones:
  - porte d’entrée entre `spawn` et la zone bronze
  - porte de bronze entre les zones bronze et argent
  - porte d’argent entre les zones argent et or
  - porte d’or entre la zone or et le boss
- Le PNJ de départ est positionné près de la porte d’entrée du donjon.
- Le coffre de départ est placé aléatoirement dans la salle `spawn`, en respectant des distances minimales vis-à-vis de la porte d’entrée, du PNJ et du point de départ joueur.
- Les coffres de progression sont placés aléatoirement dans leur zone:
  - `bronze_key` dans la zone bronze
  - `silver_key` dans la zone argent
  - `gold_key` dans la zone or

### Objets utilisables (objets)

> État actuel des données :

- **Clé rouillée** (`rusty_key`)
  - Type : objet de quête
  - Rareté : `quest`
  - Description : « Ouvre la porte d’entrée vers le secteur de départ. »
  - Obtention : dans le coffre de départ
  - Utilisation : consommée pour déverrouiller la porte d’entrée

- **Clé de bronze** (`bronze_key`)
  - Type : objet de quête
  - Rareté : `quest`
  - Description : « Ouvre la porte vers le secteur bronze. »
  - Obtention : dans un coffre aléatoire de la zone bronze
  - Utilisation : consommée pour déverrouiller la porte de bronze

- **Clé d’argent** (`silver_key`)
  - Type : objet de quête
  - Rareté : `quest`
  - Description : « Ouvre la porte vers la zone argent. »
  - Obtention : dans un coffre aléatoire de la zone argent
  - Utilisation : consommée pour déverrouiller la porte d’argent

- **Clé d’or** (`gold_key`)
  - Type : objet de quête
  - Rareté : `quest`
  - Description : « Ouvre la porte vers la zone or. »
  - Obtention : dans un coffre aléatoire de la zone or
  - Utilisation : consommée pour déverrouiller la porte d’or

### Objets utilisables liés aux PNJ

- Le PNJ actuel (garde du didacticiel) ne consomme pas d’objet directement.
- Il indique cependant que la **Clé rouillée** permet d’ouvrir la porte d’entrée.
- Aucun autre objet utilisable spécifique aux PNJ n’est défini pour l’instant.

