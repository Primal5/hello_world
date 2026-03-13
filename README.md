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
- Coffre: donne `rusty_key`.
- Porte: verrouillée sans clé, s’ouvre avec clé.
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
npc: {
  path: '/assets/models/meshy/robot-guide/scene.gltf',
  scale: [0.75, 0.75, 0.75],
  rotation: [0, Math.PI, 0],
  offset: [0, 0, 0]
}
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
