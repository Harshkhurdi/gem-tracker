import { randomBytes } from 'node:crypto';
import { get, put, del, list } from '@vercel/blob';
import { readFile, mkdir, writeFile, unlink, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { digest, HandoffError } from './server';
import type { DiscoveryTender } from './mapping';
export type PreviewSnapshot={tender:DiscoveryTender;fingerprint:string;grantHash:string;expires:number};
const prefix='tracker-medops/previews/';
function key(id:string){if(!/^[A-Za-z0-9_-]{43}$/.test(id))throw new HandoffError(400,'Open a valid tender preview');return prefix+id+'.json';}
function local(file:string){if(process.env.VERCEL||process.env.NODE_ENV==='production')throw new HandoffError(503,'Private preview storage is not configured');return path.join(process.env.MEDOPS_LOCAL_RECEIPT_PATH??'.local-receipts',file);}
export async function savePreview(tender:DiscoveryTender,fingerprint:string,grant:string){
 const id=randomBytes(32).toString('base64url');const snapshot:PreviewSnapshot={tender,fingerprint,grantHash:digest(grant),expires:Date.now()+600000};const raw=JSON.stringify(snapshot);
 if(process.env.BLOB_READ_WRITE_TOKEN)await put(key(id),raw,{access:'private',addRandomSuffix:false,contentType:'application/json'});
 else{const file=local(key(id));await mkdir(path.dirname(file),{recursive:true,mode:0o700});await writeFile(file,raw,{mode:0o600,flag:'wx'});}
 await cleanupPreviews().catch(()=>{});
 return id;
}
export async function readPreview(id:string,grant:string){
 let raw:string|undefined;
 if(process.env.BLOB_READ_WRITE_TOKEN){const blob=await get(key(id),{access:'private',useCache:false});if(blob?.stream)raw=await new Response(blob.stream).text();}
 else{try{raw=await readFile(local(key(id)),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
 if(!raw)throw new HandoffError(409,'The preview expired. Open it again before sending.');const snapshot=JSON.parse(raw) as PreviewSnapshot;
 if(snapshot.expires<=Date.now()){await removePreview(id).catch(()=>{});throw new HandoffError(409,'The preview expired. Open it again before sending.');}
 if(snapshot.grantHash!==digest(grant))throw new HandoffError(401,'Reconnect your account and open the tender preview again');
 return snapshot;
}
export async function removePreview(id:string){if(process.env.BLOB_READ_WRITE_TOKEN)await del(key(id));else await unlink(local(key(id)));}
export async function cleanupPreviews(){
 const now=Date.now();
 if(process.env.BLOB_READ_WRITE_TOKEN){
  let cursor:string|undefined;
  do{
   const page=await list({prefix,limit:100,cursor});
   const expired=page.blobs.filter(b=>now-b.uploadedAt.getTime()>600000);
   if(expired.length)await del(expired.map(b=>b.url));
   cursor=page.hasMore?page.cursor:undefined;
  }while(cursor);
 }else{
  const dir=local(prefix);let files:string[];
  try{files=await readdir(dir);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
  for(const file of files){
   if(!/^[A-Za-z0-9_-]{43}\.json$/.test(file))continue;
   const full=path.join(dir,file);
   try{if(now-(await stat(full)).mtimeMs>600000)await unlink(full);}
   catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  }
 }
}
