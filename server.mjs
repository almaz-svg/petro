import http from 'node:http';
import {readFile, realpath, stat} from 'node:fs/promises';
import {resolve, relative, isAbsolute, extname, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.glb':'model/gltf-binary','.gif':'image/gif','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.json':'application/json'};
const contained=(root,path)=>{const rel=relative(root,path);return !isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..\\')&&!rel.startsWith('../');};
export function createServer({root=dirname(fileURLToPath(import.meta.url))}={}) {
 const rootPath=resolve(root);
 return http.createServer(async(req,res)=>{
  const fail=(status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:message);};
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return fail(405,'Method not allowed');}
  let path;
  try {path=decodeURIComponent((req.url||'/').split('?')[0]);} catch {return fail(400,'Invalid path');}
  if(!path.startsWith('/')||path.includes('\\')||path.includes('\0'))return fail(400,'Invalid path');
  const parts=path.split('/');
  if(parts.some(x=>x==='..'||x==='.'||x.startsWith('.')))return fail(403,'Forbidden');
  if(path==='/')path='/index.html';
  const allowed=path==='/index.html'||path==='/favicon.svg'||path==='/mosque-360.glb'||path==='/mosque-360.gif'||/^\/src\/(?:[^/]+\/)*[^/]+\.(?:js|css)$/.test(path)||/^\/(?:assets|vendor)\/.+/.test(path);
  if(!allowed)return fail(403,'Forbidden');
  // Public directories must not expose documentation or executable scripts.
  if(/\.(?:md|txt|ps1|sh|bat|cmd|mjs|cjs|env)$/i.test(path)||parts.some(x=>['package.json','package-lock.json'].includes(x)))return fail(403,'Forbidden');
  try {
   const actualRoot=await realpath(rootPath);const actualFile=await realpath(resolve(rootPath,'.'+path));
   if(!contained(actualRoot,actualFile))return fail(403,'Forbidden');
   if(!(await stat(actualFile)).isFile())return fail(404,'Not found');
   const data=await readFile(actualFile);
   res.writeHead(200,{'Content-Type':mime[extname(actualFile).toLowerCase()]||'application/octet-stream','Content-Length':data.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
   res.end(req.method==='HEAD'?undefined:data);
  } catch(error) {return fail(['ENOENT','ENOTDIR'].includes(error.code)?404:500,'Not found');}
 });
}

if(typeof process!=='undefined'&&process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const value=process.env.PORT??'4173';
 if(!/^\d+$/.test(value)||Number(value)<1||Number(value)>65535)throw new Error('PORT must be an integer from 1 to 65535');
 const port=Number(value);const server=createServer();
 server.on('error',error=>{console.error(error.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:'+port));
}
