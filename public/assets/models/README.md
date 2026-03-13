# Assets 3D

Déposez ici vos exports Meshy au format `.glb` ou `.gltf`.

Structure recommandée:

```text
public/assets/models/
  chest.glb
  door.glb
  npc.glb
  meshy/
    robot-guide/
      scene.gltf
      scene.bin
      textures/
```

Conseils Meshy:
- `GLB` est le plus simple: un seul fichier.
- `GLTF` fonctionne aussi, mais gardez le `.gltf`, le `.bin` et les textures dans le même dossier.
- Si l'orientation ou l'échelle est mauvaise, ajustez `scale`, `rotation` ou `offset` dans `src/engine/ModelRegistry.ts`.
- Les chemins commencent par `/assets/models/...` car Vite sert `public/` à la racine du site.
