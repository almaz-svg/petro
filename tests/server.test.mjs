import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {createServer} from '../server.mjs';

test('public files, MIME, private paths and containment', async () => {
 const root=await mkdtemp(join(tmpdir(),'preview-server-'));
 await mkdir(join(root,'assets')); await mkdir(join(root,'src')); await mkdir(join(root,'vendor'));
 await writeFile(join(root,'index.html'),'hello'); await writeFile(join(root,'mosque-360.glb'),'glb'); await writeFile(join(root,'mosque-360.gif'),'gif'); await writeFile(join(root,'src','app.js'),'export {};');
 await writeFile(join(root,'package.json'),'secret'); await writeFile(join(root,'assets','.secret'),'secret');
 const server=createServer({root}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=(path,method='GET')=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path,method},res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>resolve({status:res.statusCode,type:res.headers['content-type'],body}));});req.on('error',reject);req.end();});
 try {
 assert.equal((await request('/')).body,'hello');
 assert.match((await request('/mosque-360.glb')).type,/model\/gltf-binary/);
 assert.match((await request('/mosque-360.gif')).type,/image\/gif/);
 assert.match((await request('/src/app.js')).type,/text\/javascript/);
 assert.equal((await request('/','HEAD')).body,'');
 assert.equal((await request('/','POST')).status,405);
 for(const path of ['/package.json','/README.md','/server.mjs','/assets/.secret','/../package.json','/%2e%2e/package.json','/assets/%2e%2e/index.html','/assets/%5csecret','/assets/%00secret']) assert.ok((await request(path)).status>=400,path);
 const outside=await mkdtemp(join(tmpdir(),'preview-outside-')); await writeFile(join(outside,'secret'),'secret');
 try { await symlink(join(outside,'secret'),join(root,'assets','escape')); assert.ok((await request('/assets/escape')).status>=400); } catch(error) { if(error.code!=='EPERM') throw error; } finally {await rm(outside,{recursive:true,force:true});}
 } finally {await new Promise(r=>server.close(r)); await rm(root,{recursive:true,force:true});}
});
