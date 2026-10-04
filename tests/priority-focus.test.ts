import { priorityCategories } from "../src/lib/config/priority-equipment";
import { afterEach, describe, expect, it, vi } from "vitest";
import { priorityKeywordPlan, priorityBuyerQueue, PRIORITY_KEYWORD_GROUPS } from "../src/lib/sources/adapters/gem-priority";
import { createGemAdapter, GEM_SEARCH_PAGE } from "../src/lib/sources/adapters/gem";
import { clearGemBuyerDocumentCache } from "../src/lib/sources/gem-buyer-documents";
import { createNicAdapter } from "../src/lib/sources/adapters/nic";
import { SourceHttp } from "../src/lib/sources/http";
import * as enrichment from "../src/lib/specification/enrich";
import type { RawTender } from "../src/types/tender";
afterEach(() => { vi.restoreAllMocks(); clearGemBuyerDocumentCache(); });
const raw = (id: string, title: string, department: string): RawTender => ({title,department,tenderId:id,region:"Punjab",sourceId:"gem-priority-keywords",sourceName:"GeM priority",sourceUrl:"https://bidplus.gem.gov.in/all-bids",fetchedAt:new Date().toISOString()});
describe("priority discovery allocation", () => {
  it("keeps optical laser Doppler outside ultrasound priority while retaining separately purchased ultrasound", () => {
    expect(priorityCategories({title:"Laser Doppler Blood Flow Meter"})).not.toContain("ULTRASOUND");
    expect(priorityCategories({title:"Laser Doppler Blood Flow Meter; Portable ultrasound machine"})).toContain("ULTRASOUND");
  });
  it("gives all 13 categories a primary query before synonyms and rotates the start", () => {
    const first = priorityKeywordPlan(0), rotated = priorityKeywordPlan(1);
    expect(new Set(first.slice(0,13).map((q) => q.group)).size).toBe(13);
    expect(first.length).toBe(PRIORITY_KEYWORD_GROUPS.reduce((n,[,terms]) => n+terms.length,0));
    expect(rotated[0].group).not.toBe(first[0].group);
    expect(new Set(rotated.map((q) => q.term))).toEqual(new Set(first.map((q) => q.term)));
  });
  it("one busy region cannot bury another region, equipment group or unlocated candidate", () => {
    const crowded = Array.from({length:300},(_,i)=>raw(String(i),i<150?"ICU ventilator":"Infusion pump","Department of Health Punjab"));
    const hp=raw("HP","Defibrillator","Department of Health Himachal Pradesh");
    const national=raw("NATIONAL","Ultrasound machine","Ministry of Health");
    const queue=priorityBuyerQueue([...crowded,hp,national],0);
    expect(queue.slice(0,3).map((r)=>r.tenderId)).toEqual(["0","HP","NATIONAL"]);
    expect(queue.slice(0,5).some((r)=>r.title==="Infusion pump")).toBe(true);
    expect(new Set(queue.map((r)=>r.tenderId)).size).toBe(302);
  });
  it("bounded verification windows eventually reach every candidate instead of repeating one prefix", () => {
    const candidates=Array.from({length:63},(_,i)=>raw(String(i),"ICU ventilator","Ministry of Health"));
    const visited=new Set<string>();
    for(let bucket=0;bucket<63;bucket++) for(const r of priorityBuyerQueue(candidates,bucket).slice(0,5)) visited.add(r.tenderId!);
    expect(visited.size).toBe(63);
  });
  it("healthcare buyers get first-page breadth before their deep pages and broad general pages", async () => {
    const calls: {organization?:string;page:number;searchType:string}[]=[];
    const names=["Government Medical College Amritsar","Government Medical College Patiala"];
    vi.spyOn(SourceHttp.prototype,"text").mockImplementation(async(url,init)=>{
      if(url===GEM_SEARCH_PAGE)return "<script>var token={'csrf_bd_gem_nk':'fixture'};var u='https://bidplus.gem.gov.in/search-bids';</script>";
      if(url.endsWith("/ministry-list-adv"))return JSON.stringify({status:200,data:{BuyerStateList:["PUNJAB"]}});
      if(url.endsWith("/org-list-adv"))return JSON.stringify(names);
      const q=JSON.parse(new URLSearchParams(init?.body as URLSearchParams).get("payload")!);calls.push(q);
      const doc={b_id:[String(1000000+q.page)],b_bid_number:[`GEM/2026/B/${1000000+q.page}`],b_category_name:["Office chairs"]};
      return JSON.stringify({code:200,response:{response:{numFound:q.organization?20:q.searchType==="con"?20:0,start:(q.page-1)*10,docs:q.searchType==="con"||q.organization?[doc]:[]}}});
    });
    await createGemAdapter("Punjab").fetch();
    const targeted=calls.filter((q)=>q.organization);
    expect(targeted.slice(0,2).map((q)=>q.page)).toEqual([1,1]);
    expect(new Set(targeted.slice(0,2).map((q)=>q.organization)).size).toBe(2);
    expect(calls.findIndex((q)=>!!q.organization)).toBeLessThan(calls.findIndex((q)=>q.searchType==="con"&&q.page===2));
  });
  it("inspects known priority before routine metadata and inspects priority revealed by that metadata", async () => {
    const events:string[]=[];
    const ids=["2026_TEST_1001_1","2026_TEST_1002_1"];
    const signals: (AbortSignal|null|undefined)[]=[];
    const clients: SourceHttp[]=[];
    vi.spyOn(SourceHttp.prototype,"text").mockImplementation(async function(this:SourceHttp,url,init){
      clients.push(this);
      if(url.includes("FrontEndTendersByOrganisation")){signals.push(init?.signal);return "Tenders by Organisation<table><tr><td>1</td><td>Health</td><td><a href='/eprocure/app?page=list'>2</a></td></tr></table>";}
      if(url.includes("page=list")){signals.push(init?.signal);return "S.No<table>"+ids.map((id,i)=>`<tr><td>1</td><td>01-Oct-2026 10:00 AM</td><td>20-Oct-2027 11:00 AM</td><td>21-Oct-2027 11:00 AM</td><td><a href='/eprocure/app?sp=${id}'>[${i?"ABG ANALYSER":"ICU ventilator"}]</a>[ref][${id}]</td><td>Health</td></tr>`).join("")+"</table>";}
      const id=new URL(url).searchParams.get("sp")!;
      if(url.includes("FrontEndTenderDetails"))return `${id}<a href='https://eprocure.gov.in/scope.pdf'>Technical specification</a>`;
      events.push("metadata:"+id);expect(init?.signal).toBeUndefined();
      return `<table><tr><td>Tender ID</td><td>${id}</td></tr><tr><td>Title</td><td>ICU ventilator</td></tr></table><a href='/eprocure/app?page=FrontEndTenderDetails&sp=${id}'>View more details</a>`;
    });
    vi.spyOn(enrichment,"inspectPriorityTender").mockImplementation(async(r)=>{events.push("document:"+r.tenderId);expect(r.documents?.some((d)=>d.url.endsWith("scope.pdf"))).toBe(true);});
    const result=await createNicAdapter({id:"test",name:"Health",origin:"https://eprocure.gov.in",prefix:"/eprocure/app",organisation:/^Health$/,region:"Punjab",institutionIds:[],statewide:true}).fetch();
    expect(result.metrics.detailChecks).toBe(2);
    expect(events).toEqual(["metadata:"+ids[0],"document:"+ids[0],"metadata:"+ids[1],"document:"+ids[1]]);
    expect(signals[0]).toBeInstanceOf(AbortSignal);expect(signals[1]).toBe(signals[0]);
    expect(new Set(clients).size).toBe(1);
  });
});
