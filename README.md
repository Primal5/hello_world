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
```

- `core/`: orchestration de la boucle de jeu et du bootstrap.
- `engine/`: rendu, monde 3D, contrôles FPS, raycast, collisions simples.
- `gameplay/`: joueur, inventaire, interactions, dialogues, quêtes (base extensible).
- `ui/`: HUD React + stores Zustand.
- `data/`: contenu éditable (items, niveau, dialogues).

## Démo incluse

- Déplacement FPS (WASD + souris + saut espace + gravité).
- Prompt d’interaction au centre (E).
- Coffre: donne `rusty_key`.
- Porte: verrouillée sans clé, s’ouvre avec clé.
- PNJ: affiche un dialogue dans le journal.
- Inventaire ouvrable avec `I`.

## Assets Meshy GLB

Placez vos modèles dans:

```text
public/assets/models/
```

Exemples attendus:

- `public/assets/models/chest.glb`
- `public/assets/models/door.glb`
- `public/assets/models/npc.glb`

Enregistrement des chemins:

- Éditez `src/engine/ModelRegistry.ts` pour ajouter/changer des IDs de modèles.

Chargement:

- `src/engine/AssetLoader.ts` utilise `GLTFLoader`.
- Si un GLB est absent/invalide, un fallback Three.js est généré pour garder le projet exécutable.

## Modifier les données de niveau

- Entités du niveau: `src/data/level.ts`.
- Items: `src/data/items.ts`.
- Dialogues: `src/data/dialogues.ts`.

## Extensions futures

Base prête pour ajouter:

- système de quêtes avancé
- dialogues à embranchements
- PNJ dynamiques
- combat FPS/melee
- persistance/sauvegarde
