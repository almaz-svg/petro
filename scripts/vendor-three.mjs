import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '0.186.1';
const files = ['build/three.module.js','build/three.core.js','examples/jsm/loaders/GLTFLoader.js','examples/jsm/controls/OrbitControls.js','examples/jsm/utils/BufferGeometryUtils.js','examples/jsm/utils/SkeletonUtils.js','LICENSE'];
for (const file of files) {
  const response = await fetch('https://cdn.jsdelivr.net/npm/three@' + version + '/' + file, {signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(file + ': HTTP ' + response.status);
  const source = await response.text();
  const target = resolve(root, 'vendor/three', file);
  await mkdir(dirname(target), {recursive:true});
  await writeFile(target, source);
  console.log('Saved ' + file + ' (' + source.length + ' chars)');
}
