import { get, put } from '@vercel/blob';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config, digest, HandoffError } from './server';
export type Receipt={externalTenderId:string;tenderId:string;url:string;status:'ADDED'|'EXISTING'|'SOURCE_UPDATE_AVAILABLE';importedAt:string;confirmedAt:string;fingerprint:string};
function key(id:string){return 'tracker-medops/v1/'+digest(id)+'.json';}
function local(key:string){if(process.env.VERCEL||process.env.NODE_ENV==='production')throw new HandoffError(503,'Private receipt storage is not configured');return path.join(process.env.MEDOPS_LOCAL_RECEIPT_PATH??'.local-receipts',key);}
export async function receipt(id:string):Promise<Receipt|undefined>{
 let raw:string|undefined;
 if(process.env.BLOB_READ_WRITE_TOKEN){const blob=await get(key(id),{access:'private',useCache:false});if(blob?.stream)raw=await new Response(blob.stream).text();}
 else{try{raw=await readFile(local(key(id)),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
 if(!raw)return;const value=JSON.parse(raw) as Receipt;return value.externalTenderId===id?validateReceipt(value):undefined;
}
export function validateReceipt(value:unknown):Receipt{const v=value as Receipt;const c=config();if(!v||typeof v.tenderId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(v.tenderId)||!['ADDED','EXISTING','SOURCE_UPDATE_AVAILABLE'].includes(v.status)||typeof v.importedAt!=='string'||Number.isNaN(Date.parse(v.importedAt))||v.url!==`${c.medops}/tenders?record=${encodeURIComponent(v.tenderId)}`)throw new HandoffError(503,'MedOps confirmation could not be validated. Retry safely.');return v;}
export async function saveReceipt(value:Receipt){validateReceipt(value);const raw=JSON.stringify(value);if(process.env.BLOB_READ_WRITE_TOKEN){await put(key(value.externalTenderId),raw,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});}else{const file=local(key(value.externalTenderId));await mkdir(path.dirname(file),{recursive:true,mode:0o700});await writeFile(file,raw,{mode:0o600});}}
