import "server-only";
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
export class HandoffError extends Error{constructor(public status:number,message:string){super(message);}}
export const GRANT_COOKIE=process.env.NODE_ENV==='production'?'__Host-tracker-medops':'tracker-medops';
export const STATE_COOKIE=process.env.NODE_ENV==='production'?'__Host-tracker-medops-state':'tracker-medops-state';
export function config(){
 const medops=process.env.MEDOPS_API_URL,tracker=process.env.APP_URL,secret=process.env.MEDOPS_INTEGRATION_SECRET,environment=process.env.INTEGRATION_ENVIRONMENT;
 if(!medops||!tracker||!secret||secret.length<32||!['production','development','preview'].includes(environment??''))throw new HandoffError(503,'MedOps handoff is not configured. Discovery remains available.');
 for(const value of [medops,tracker]){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash||(environment!=='development'&&u.protocol!=='https:')||(environment==='development'&&!['localhost','127.0.0.1'].includes(u.hostname)))throw new HandoffError(503,'MedOps integration environment is not valid');}
 if(process.env.VERCEL_ENV&&process.env.VERCEL_ENV!==environment)throw new HandoffError(503,'MedOps handoff is disabled in this environment');
 return {medops:new URL(medops).origin,tracker:new URL(tracker).origin,secret,environment:environment!};
}
export function digest(value:string){return createHash('sha256').update(value).digest('hex');}
export function seal(data:object){const payload=Buffer.from(JSON.stringify(data)).toString('base64url');return payload+'.'+createHmac('sha256',config().secret).update(payload).digest('hex');}
export function unseal<T extends {expires:number;environment:string}>(value:string|undefined):T|undefined{
 if(!value||value.length>2000)return;const [body,signature]=value.split('.');if(!/^[a-f0-9]{64}$/.test(signature??''))return;
 const c=config(),expected=createHmac('sha256',c.secret).update(body).digest();if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))return;
 try{const data=JSON.parse(Buffer.from(body,'base64url').toString()) as T;if(data.environment!==c.environment||data.expires<=Date.now())return;return data;}catch{return;}
}
export async function localGrant(){const row=unseal<{grant:string;expires:number;environment:string}>((await cookies()).get(GRANT_COOKIE)?.value);if(!row||!/^[A-Za-z0-9_-]{43}$/.test(row.grant))throw new HandoffError(401,'Connect your MedOps account to send a tender');return row;}
export function origin(req:Request){if(req.headers.get('origin')!==config().tracker)throw new HandoffError(403,'Request origin is not permitted');}
export async function medopsRequest(path:string,data:unknown){
 const c=config(),body=JSON.stringify(data),timestamp=String(Date.now());
 const signature=createHmac('sha256',c.secret).update(`${timestamp}\n${c.environment}\nPOST\n${path}\n${body}`).digest('hex');
 let r:Response;try{r=await fetch(c.medops+path,{method:'POST',headers:{'Content-Type':'application/json','x-medops-timestamp':timestamp,'x-medops-environment':c.environment,'x-medops-signature':signature},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw new HandoffError(503,'MedOps is unavailable. Your discovery results are unaffected. Try again.');}
 if(!r.ok){const messages:Record<number,string>={400:'MedOps could not accept this source information. Review it or enter the tender manually.',401:'Reconnect your MedOps account before sending.',403:'Your MedOps account needs permission to create tenders.',409:'Matching MedOps records need review. Open MedOps to resolve them.',413:'The source information is too large. Enter the relevant lines manually in MedOps.',429:'The handoff limit was reached. Try again shortly.'};throw new HandoffError(r.status,messages[r.status]??'MedOps could not complete the handoff. Try again.');}
 try{return await r.json();}catch{throw new HandoffError(503,'MedOps returned an invalid confirmation. Try again.');}
}
export async function api(fn:()=>Promise<Response>){try{const r=await fn();r.headers.set('Cache-Control','private, no-store');return r;}catch(e){return Response.json({error:e instanceof HandoffError?e.message:'The handoff could not be completed. Try again.'},{status:e instanceof HandoffError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}}
export async function smallJson(req:Request){if(!req.headers.get('content-type')?.includes('application/json'))throw new HandoffError(415,'Use application/json');const reader=req.body?.getReader();if(!reader)throw new HandoffError(400,'Request body is missing');const chunks:Uint8Array[]=[];let n=0;while(true){const {value,done}=await reader.read();if(done)break;n+=value.length;if(n>12000){await reader.cancel();throw new HandoffError(413,'Handoff request is too large');}chunks.push(value);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new HandoffError(400,'Invalid JSON');}}

export async function clearCookie(name:string){(await cookies()).set(name,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});}
