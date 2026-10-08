import type { Tender } from '@/types/tender';
import { closingDeadlineTimestamp } from '@/lib/tender/dates';
import { gemBidNumber } from '@/lib/tender/document-links';
export type DiscoveryItem={id:string;equipment:string;quantity:number|null;quantityText?:string;category?:string;sourceUrl?:string;sourceLabel?:string;sourcePage?:number;sourceSheet?:string;sourceRow?:number};
export type DiscoveryTender={externalTenderId:string;sourceUrl:string;sourceName:string;number?:string;bidNumber?:string;title:string;institution?:string;state?:string;category?:string;description?:string;publicationDate?:string;deadline?:string;discoveredAt:string;sourceUpdatedAt?:string;items:DiscoveryItem[];documents:{label:string;url:string}[];revisions:{title?:string;url?:string;publishedDate?:string;revisedClosingDate?:string}[];references:{label:string;url:string}[]};
function plain(value:string|undefined,max=500){return value?.replace(/<[^>]*>/g,' ').replace(/\p{Cc}/gu,' ').replaceAll('<','‹').replaceAll('>','›').replace(/\s+/g,' ').trim().slice(0,max)||undefined;}
function date(value:string|undefined){if(!value)return;const d=new Date(value);return Number.isNaN(d.getTime())?undefined:d.toISOString();}
function deadline(value:string|undefined){const timestamp=closingDeadlineTimestamp(value);return Number.isFinite(timestamp)?new Date(timestamp).toISOString():undefined;}
function quantity(value:string|number|undefined|null){const text=String(value??'').trim();if(!/^\d+$/.test(text))return null;const n=Number(text);return n>0&&n<=1000000?n:null;}
function reference(value:string|undefined,origin:string){if(!value)return;try{const u=new URL(value,origin);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return;return u.href.length<=2500?u.href:undefined;}catch{return;}}
export function mapDiscovery(t:Tender,origin:string):DiscoveryTender{
 const sourceUrl=reference(t.tenderUrl,origin)||reference(t.sourceUrl,origin);if(!sourceUrl)throw Error('This tender has no usable source reference');
 let items:DiscoveryItem[]=[];
 if(t.equipmentItems?.length){items=t.equipmentItems.map((item,i)=>({id:plain(item.id)||`item-${i+1}`,equipment:plain(item.name)!,quantity:quantity(item.quantity),...(item.quantity!=null?{quantityText:plain(String(item.quantity))}:{}),category:plain(item.category),sourceUrl:reference(item.sourceUrl,origin),sourceLabel:plain(item.sourceLabel),sourcePage:item.sourcePage,sourceSheet:plain(item.sourceSheet),sourceRow:item.sourceRow})).filter(i=>i.equipment);}
 if(!items.length){
 // BOQ rows are distinct source items. Generic quantity clauses are not equipment names.
 const boq=(t.specification?.sections.quantity??[]).filter(i=>!i.supersededBy&&i.sourceRow&&i.sourceSheet&&t.specification?.documentSources.some(d=>d.url===i.sourceDocument&&d.type==='boq'));
 items=boq.map((i,n)=>({id:`boq-${i.sourceSheet}-${i.sourceRow}-${n}`,equipment:plain(i.requirement)!,quantity:quantity(i.quantity),quantityText:plain(i.quantity),sourceUrl:reference(i.sourceDocument,origin),sourceLabel:plain(i.sourceLabel),sourcePage:i.sourcePage,sourceSheet:plain(i.sourceSheet),sourceRow:i.sourceRow}));
 }
 if(!items.length){
 const direct=(t.specification?.sections.quantity??[]).filter(i=>!i.supersededBy && /(?:^|\/)\s*(?:total\s+)?(?:quantity|qty)\s*[:=]?\s*\d+\s*(?:nos?\.?|units?|sets?|pieces?)?\s*\.?$/i.test(i.requirement));
 const values=new Set(direct.map(i=>quantity(i.quantity)).filter(v=>v!==null));
 // A single direct tender quantity may describe the title; do not distribute totals among equipment types.
 const q=values.size===1 && (t.specification?.equipmentTypes.length??0)<=1?[...values][0]:null;
 const evidence=q===null?undefined:direct.find(i=>quantity(i.quantity)===q);
 items=[{id:'unstructured-title',equipment:plain(t.title)!,quantity:q,sourceUrl:reference(evidence?.sourceDocument,origin)||sourceUrl,sourceLabel:plain(evidence?.sourceLabel)||'Tender title; review equipment lines',sourcePage:evidence?.sourcePage}];
 }
 if(items.length>100)throw Error('This tender has more than 100 source items. Enter the relevant lines manually in MedOps.');
 const docs=[...(t.documents??[]),...(t.specification?.documentSources??[])].map(d=>({label:plain(d.label)??'Source document',url:reference(d.url,origin)})).filter((d):d is {label:string;url:string}=>!!d.url);
 const revisions=(t.corrigenda??[]).map(c=>({title:plain(c.title??c.type),url:reference(c.url,origin),publishedDate:date(c.publishedDate),revisedClosingDate:deadline(c.revisedClosingDate)}));
 const updated=[...revisions.map(c=>c.publishedDate),...(t.specification?.documentSources??[]).map(d=>date(d.publishedDate))].filter((d):d is string=>!!d).sort().at(-1);
 return {externalTenderId:t.id,sourceUrl,sourceName:plain(t.sourceName)??t.sourceId,number:plain(t.referenceNumber??t.tenderId),bidNumber:gemBidNumber(t),title:plain(t.title)!,institution:plain(t.institutionName??t.buyer??t.organisation),state:plain(t.region),category:plain(t.categories.join(', ')),description:plain(t.description,10000),publicationDate:date(t.publishDate),deadline:deadline(t.effectiveClosingDate),discoveredAt:date(t.fetchedAt)??date(t.checkedAt)!,sourceUpdatedAt:updated,items,documents:[...new Map(docs.map(d=>[d.url,d])).values()].slice(0,100),revisions:revisions.slice(0,100),references:(t.sourceReferences??[]).map(r=>({label:plain(r.sourceName)??'Original source',url:reference(r.url,origin)})).filter((r):r is {label:string;url:string}=>!!r.url).slice(0,100)};
}
