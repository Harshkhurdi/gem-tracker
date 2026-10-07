import { allSources } from '@/lib/cache/source-cache';
import { buildDashboard } from '@/lib/tender/normalize';
import { config, digest, HandoffError } from './server';
import { mapDiscovery, type DiscoveryTender } from './mapping';
export function fingerprint(tender:DiscoveryTender){const {discoveredAt,sourceUpdatedAt,...content}=tender;void discoveredAt;void sourceUpdatedAt;return digest(JSON.stringify(content));}
export async function discovery(id:string){if(!/^[a-f0-9]{20}$/.test(id))throw new HandoffError(400,'Select a valid discovered tender');const data=buildDashboard(await allSources(),!!process.env.ADMIN_REFRESH_TOKEN);const tender=data.tenders.find(t=>t.id===id);if(!tender)throw new HandoffError(404,'This tender is no longer in discovery. Enter it manually in MedOps.');try{const mapped=mapDiscovery(tender,config().tracker);return {tender:mapped,fingerprint:fingerprint(mapped)};}catch(e){throw new HandoffError(400,e instanceof Error?e.message:'Source information needs manual review');}}
