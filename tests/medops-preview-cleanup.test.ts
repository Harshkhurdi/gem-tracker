import { afterEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({list:vi.fn(),del:vi.fn(),readdir:vi.fn(),stat:vi.fn(),unlink:vi.fn()}));
vi.mock('@vercel/blob',()=>({...mocks,get:vi.fn(),put:vi.fn()}));
vi.mock('node:fs/promises',()=>({...mocks,readFile:vi.fn(),mkdir:vi.fn(),writeFile:vi.fn()}));
vi.mock('@/lib/medops/server',()=>({digest:vi.fn(),HandoffError:class extends Error{}}));
import {cleanupPreviews} from '@/lib/medops/previews';
afterEach(()=>{vi.resetAllMocks();vi.unstubAllEnvs();});
it('finds expired private previews after a full page of active previews',async()=>{
 vi.stubEnv('BLOB_READ_WRITE_TOKEN','synthetic-test-token');
 mocks.list.mockResolvedValueOnce({blobs:Array.from({length:100},(_,i)=>({url:`active-${i}`,uploadedAt:new Date()})),hasMore:true,cursor:'next-page'})
 .mockResolvedValueOnce({blobs:[{url:'expired',uploadedAt:new Date(Date.now()-700000)}],hasMore:false});
 await cleanupPreviews();
 expect(mocks.list).toHaveBeenNthCalledWith(2,{prefix:'tracker-medops/previews/',limit:100,cursor:'next-page'});
 expect(mocks.del).toHaveBeenCalledWith(['expired']);
});
it('cleans beyond the first 100 local files and tolerates concurrent removal',async()=>{
 vi.stubEnv('BLOB_READ_WRITE_TOKEN','');vi.stubEnv('NODE_ENV','test');vi.stubEnv('VERCEL','');
 const files=Array.from({length:102},(_,i)=>String(i).padStart(43,'a')+'.json');
 mocks.readdir.mockResolvedValue(files);
 mocks.stat.mockImplementation(async(file:string)=>{if(file.endsWith(files[100]))throw Object.assign(Error('already removed'),{code:'ENOENT'});return {mtimeMs:file.endsWith(files[101])?Date.now()-700000:Date.now()};});
 mocks.unlink.mockRejectedValueOnce(Object.assign(Error('already removed'),{code:'ENOENT'}));
 await expect(cleanupPreviews()).resolves.toBeUndefined();
 expect(mocks.stat).toHaveBeenCalledTimes(102);expect(mocks.unlink).toHaveBeenCalledOnce();
});
