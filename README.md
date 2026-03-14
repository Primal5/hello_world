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
- `gameplay/`: joueur, inventaire, interactions, dialogues, quêtes.
- `ui/`: HUD React + stores Zustand.
- `data/`: contenu éditable.

## Démo incluse

- Déplacement FPS (`WASD` + souris + saut espace + gravité).
- Prompt d’interaction au centre (`E`).
- Inventaire ouvrable avec `I` ou `Tab`.
- Pause manuelle avec `P` ou `Pause`.
- Journal éphémère + historique.
- PNJ de départ avec dialogue.
- Progression verrouillée par clés:
  - `rusty_key`
  - `bronze_key`
  - `silver_key`
  - `gold_key`
  - `boss_key`
- Portes nommées:
  - entrée
  - bronze
  - argent
  - or
  - trésors

## Assets Meshy / glTF / GLB

Le projet est prêt à charger des modèles Meshy via `GLTFLoader`.

Placez vos modèles dans:

```text
public/assets/models/
```

Exemples:

- `public/assets/models/chest.glb`
- `public/assets/models/Wooden_Door.glb`
- `public/assets/models/npc.glb`
- `public/assets/models/meshy/robot-guide/scene.gltf`

### Comment brancher un modèle Meshy

1. Exporter depuis Meshy en `GLB` ou `GLTF`.
2. Copier les fichiers dans `public/assets/models/`.
3. Mettre à jour `src/engine/ModelRegistry.ts`.
4. Ajuster `scale`, `rotation` et `offset` si nécessaire.
5. `Bronze_Door`, `Silver_Door` et `Gold_Door` peuvent réutiliser `Wooden_Door` avec une teinte matériau appliquée en code.

### Ce que le projet gère

- chargement `.glb` et `.gltf`
- cache et clonage des modèles
- ombres activées sur les meshes importés
- correction colorimétrique pour les textures
- centrage horizontal automatique du modèle
- repositionnement automatique pour poser le mesh sur le sol
- fallback procédural si un asset manque
- variantes de portes `Wooden_Door`, `Bronze_Door`, `Silver_Door`, `Gold_Door`

## Modifier les données

- Entités du niveau: `src/data/level.ts`
- Items: `src/data/items.ts`
- Dialogues: `src/data/dialogues.ts`

## Extensions futures

Base prête pour ajouter:

- système de quêtes avancé
- dialogues à embranchements
- PNJ dynamiques
- combat FPS / mêlée
- persistance / sauvegarde

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
| quest | Objet de quête | `#4ef2d2` |

### Règles de création du donjon

- Génération procédurale sur une grille de **48 x 48 cellules** dans une zone de **160 unités**.
- Jusqu’à **200 essais** pour produire un graphe valide.
- Salle de départ `spawn` fixée en bas de la carte.
- Trois zones de progression avec **20 salles garanties**:
  - bronze
  - argent
  - or
- Le boss est généré après la zone or, derrière la porte d’or.
- Une salle aux trésors est générée après le boss.
- Les salles ne peuvent pas se chevaucher ni se toucher.
- Les couloirs sont générés à partir des recouvrements entre salles.
- Les portes intérieures sont créées aux transitions salle/couloir.
- Les pans de mur autour des portes sont reconstruits par mur logique.
- Les layouts où une ouverture utile est trop étroite sont rejetés puis régénérés.
- Les portes spéciales délimitent la progression:
  - porte d’entrée entre `spawn` et la zone bronze
  - porte de bronze entre bronze et argent
  - porte d’argent entre argent et or
  - porte d’or entre or et boss
  - porte aux trésors entre boss et salle aux trésors
- L’usage d’une clé est séparé de l’ouverture:
  - 1re interaction: la clé est utilisée et consommée
  - 2e interaction: la porte s’ouvre
- Le PNJ de départ est placé près de la porte d’entrée.
- Le coffre de départ est placé aléatoirement dans `spawn` avec distances minimales vis-à-vis de la porte d’entrée, du PNJ et du point de départ joueur.
- Les coffres de progression sont placés aléatoirement dans leur zone:
  - `bronze_key` dans la zone bronze
  - `silver_key` dans la zone argent
  - `gold_key` dans la zone or
- Un coffre supplémentaire dans la salle du boss donne `boss_key`.
- Les coffres hors `spawn` respectent une distance de sécurité vis-à-vis des portes de leur salle.

### Découpage logique des espaces

- Le donjon expose des **faces de murs par espace logique**.
- Chaque salle et chaque couloir fournit 4 faces:
  - `north`
  - `south`
  - `west`
  - `east`
- Chaque face décrit:
  - sa portée utile
  - ses ouvertures (`door` ou `passage`)
- Cette couche logique sert de base:
  - au placement des lampes murales
  - aux futurs traitements de sol par salle et par couloir
- Le rendu géométrique des murs reste distinct de cette couche logique: la géométrie affichée ne doit plus piloter seule la logique de placement.

### Sols et murs

- Sol global du donjon: `Dalles_Claires`.
- Salle `spawn`: sol dédié en `Pierre_Claire`.
- Les murs utilisent `public/assets/textures/walls/clairs/Dalles_Claires.jpg`.
- Le sol garde un matériau PBR avec repeat, anisotropy et variation macro.
- Le motif floral procédural reste réservé à `Dalles_Jade`.

### Règle de placement des lampes murales

- Les lampes murales se placent uniquement sur des pans de mur libres, jamais à proximité immédiate d’une porte.
- Une zone de sécurité est réservée autour de chaque porte avant tout placement.
- Le placement part des **faces de murs des salles et des couloirs**, pas des segments de murs fusionnés du rendu.
- Chaque face retire explicitement ses ouvertures avant de calculer ses sections libres.
- Le mur est ensuite découpé en sections libres entre portes, passages et marges réservées.
- Pour une section libre courte, on place une seule lampe centrée sur la section.
- Pour une section plus longue, le nombre de lampes dépend de la longueur disponible, sur une base d’environ **1 lampe tous les 6 mètres**.
- Chaque pièce conserve au moins un pan de mur éclairé dès qu’un mur éligible existe.
- D’une pièce à l’autre, le nombre de murs effectivement éclairés varie de manière aléatoire parmi les pans éligibles.
- Les couloirs reçoivent eux aussi des lampes:
  - en général `1` lampe sur un couloir court
  - jusqu’à `2` lampes sur un couloir plus long
- Quand plusieurs lampes sont retenues sur une même section, elles sont réparties uniformément.
- Si une section n’est pas assez longue pour accueillir une lampe avec ses marges, on n’en place aucune.
- Salle du boss: lampes rouges.
- Salle aux trésors: lampes or.

### Objets utilisables

- **Clé rouillée** (`rusty_key`)
  - Type: objet de quête
  - Rareté: `quest`
  - Description: ouvre la porte d’entrée vers le secteur de départ
  - Obtention: coffre de départ
  - Utilisation: déverrouille la porte d’entrée

- **Clé de bronze** (`bronze_key`)
  - Type: objet de quête
  - Rareté: `quest`
  - Description: ouvre la porte vers le secteur bronze
  - Obtention: coffre aléatoire de la zone bronze
  - Utilisation: déverrouille la porte de bronze

- **Clé d’argent** (`silver_key`)
  - Type: objet de quête
  - Rareté: `quest`
  - Description: ouvre la porte vers la zone argent
  - Obtention: coffre aléatoire de la zone argent
  - Utilisation: déverrouille la porte d’argent

- **Clé d’or** (`gold_key`)
  - Type: objet de quête
  - Rareté: `quest`
  - Description: ouvre la porte vers la zone or
  - Obtention: coffre aléatoire de la zone or
  - Utilisation: déverrouille la porte d’or

- **Clé du boss** (`boss_key`)
  - Type: objet de quête
  - Rareté: `quest`
  - Description: ouvre la porte aux trésors
  - Obtention: coffre de la salle du boss
  - Utilisation: déverrouille la porte aux trésors

### Objets liés aux PNJ

- Le PNJ actuel ne consomme pas d’objet directement.
- Il indique que la **clé rouillée** permet d’ouvrir la porte d’entrée.
- Aucun autre objet utilisable spécifique aux PNJ n’est défini pour l’instant.
