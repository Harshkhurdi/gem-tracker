import { api, localGrant } from '@/lib/medops/server';
import { discovery } from '@/lib/medops/discovery';
import { savePreview } from '@/lib/medops/previews';
import { receipt } from '@/lib/medops/receipts';
export const runtime='nodejs';export const maxDuration=300;
export async function GET(req:Request){return api(async()=>{const grant=await localGrant();const id=new URL(req.url).searchParams.get('tenderId')??'';const current=await discovery(id);const previewId=await savePreview(current.tender,current.fingerprint,grant.grant);return Response.json({...current,previewId,receipt:await receipt(id)??null});});}
