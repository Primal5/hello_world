import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import path from 'path';
import { pathToFileURL } from 'url';

const loader = new GLTFLoader();
const filePath = path.resolve('public/assets/models/meshy/Wall/Meshy_AI_Stone_Wall_Pattern_0311203504_texture.glb');
const gltf = await loader.loadAsync(pathToFileURL(filePath).href);
gltf.scene.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(gltf.scene);
const size = box.getSize(new THREE.Vector3());
console.log(JSON.stringify({
  min: { x: box.min.x, y: box.min.y, z: box.min.z },
  max: { x: box.max.x, y: box.max.y, z: box.max.z },
  size: { x: size.x, y: size.y, z: size.z }
}, null, 2));
