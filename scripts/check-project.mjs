import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
for (const file of ['server.mjs','src/content.js','src/main.js','src/scene.js']) {
  execFileSync(process.execPath, ['--check', fileURLToPath(new URL(file, root))], {stdio:'pipe'});
}
const html = await readFile(new URL('index.html', root), 'utf8');
const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
assert.ok(map.three.startsWith('./vendor/'));
await access(new URL(map.three, root));
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return {url:new URL(map.three, root).href, shortCircuit:true};
  if (specifier.startsWith('three/addons/')) return {url:new URL(map['three/addons/'] + specifier.slice('three/addons/'.length), root).href, shortCircuit:true};
  return nextResolve(specifier, context);
}});
const THREE = await import('three');
const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
const {OrbitControls} = await import('three/addons/controls/OrbitControls.js');
assert.equal(typeof OrbitControls, 'function');
const bytes = await readFile(new URL('mosque-360.glb', root));
assert.equal(bytes.toString('ascii',0,4), 'glTF');
assert.equal(bytes.readUInt32LE(4), 2);
assert.equal(bytes.readUInt32LE(8), bytes.length);
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), root.href);
gltf.scene.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(gltf.scene);
assert.ok(!box.isEmpty());
let meshes=0, vertices=0;
gltf.scene.traverse(object => { if(object.isMesh) { meshes++; vertices+=object.geometry.attributes.position.count; } });
assert.ok(meshes > 0);
const gif = await readFile(new URL('mosque-360.gif', root));
assert.ok(gif.toString('ascii',0,6).startsWith('GIF8'));
console.log(JSON.stringify({syntax:'4 files passed',three:THREE.REVISION,model:{meshes,vertices,min:box.min.toArray(),max:box.max.toArray()},fallback:{width:gif.readUInt16LE(6),height:gif.readUInt16LE(8)}}));
