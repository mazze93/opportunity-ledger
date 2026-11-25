/** Private owner workspace. Sites dispatch authenticates visitors before this Worker.
 * No messages or applications are sent. ATS content is untrusted and rendered as text.
 */
const HTML = "BUILD_HTML";
export const BOARDS=[{board:'semgrep',company:'Semgrep'},{board:'afterquery',company:'AfterQuery'},{board:'Theori',company:'Theori'},{board:'socure',company:'Socure'}];
export const TRACKS={
 'AI security':/\b(ai|artificial intelligence|machine learning|llm|model)\b.*\b(security|safety)\b|\b(security|safety)\b.*\b(ai|llm|model)\b/i,
 'LLM red teaming':/red[- ]team|adversarial.*(ai|model|llm)|jailbreak/i,
 'Interpretability':/interpretability|mechanistic|explainable/i,
 'Model behavior':/model behavio[u]?r|alignment|ai evaluation|model evaluation|ai safety|stress.test/i,
 'Product security':/product security|application security|appsec|security engineer|security research|offensive security/i,
 'Product engineering':/product engineer|software engineer|full.stack|frontend|front.end|design engineer/i
};
const NOW=()=>new Date().toISOString();
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const err=(message,status=400)=>Object.assign(new Error(message),{status});
const safeText=(x,max=500)=>typeof x==='string'?x.normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,max):'';
export function canonicalURL(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw err('Invalid HTTPS source URL');u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(ref|source|gh_src)$/i.test(k))u.searchParams.delete(k);u.searchParams.sort();return u.toString().replace(/\/$/,'');}
export function classify(title){return Object.entries(TRACKS).filter(([,re])=>re.test(title)).map(([t])=>t);}
export async function sha(x){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof x==='string'?new TextEncoder().encode(x):x))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function workMode(location,remote,workplace=''){
 if(/hybrid/i.test(location+' '+workplace))return 'hybrid';
 if(/office|onsite|on.site/i.test(location+' '+workplace))return 'onsite';
 return remote?'remote':'unknown';
}
export function score(role,now=Date.now()){
 const tracks=typeof role.tracks==='string'?JSON.parse(role.tracks):role.tracks;
 const primary=tracks.some(t=>t!=='Product engineering'); const domain=tracks.length?(primary?55:40):0;
 const location=/\b(Durham|Raleigh|Chapel Hill|Boston|San Francisco)\b/i.test(role.location)?20:/\b(US|USA|United States)\b/i.test(role.location)&&role.mode==='remote'?20:0;
 const age=role.published_at?(now-Date.parse(role.published_at))/86400000:null;
 const recency=age!==null&&age>=0&&age<=7?15:age!==null&&age>=0&&age<=30?8:0;
 const sighting=now-Date.parse(role.last_seen)<=48*3600000?10:0;
 return {total:domain+location+recency+sighting,priority:primary?2:tracks.length?1:0,policy:'workspace-title-v2',parts:[['Track',domain,primary?'Security / model research title':tracks.length?'Product engineering title':'No title match'],['Location',location,location?'Preferred city or explicit US remote':'Eligibility / location needs review'],['Published',recency,age===null?'Publication date unknown':age<0?'Future date needs review':Math.floor(age)+' days ago'],['Sighting',sighting,sighting?'Seen within 48 hours':'Observation older than 48 hours']],unknowns:['Compensation, seniority and work authorization require source review',...(location?[]:['Remote does not establish US eligibility'])]};
}
async function bounded(response,limit=4*1024*1024){if(!response.ok)throw err('Upstream HTTP '+response.status,502);if(!response.headers.get('content-type')?.includes('json'))throw err('Upstream is not JSON',502);const reader=response.body.getReader();let n=0,cs=[];for(;;){let {done,value}=await reader.read();if(done)break;n+=value.length;if(n>limit){await reader.cancel();throw err('Feed exceeds 4 MB; no reconciliation performed',502);}cs.push(value);}const all=new Uint8Array(n);let offset=0;for(const c of cs){all.set(c,offset);offset+=c.length;}return all;}
async function payload(req){const bytes=await bounded(new Response(req.body,{headers:{'content-type':'application/json'}}),32000);try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw err('Invalid JSON');}}
async function rows(env,sql,...args){return (await env.DB.prepare(sql).bind(...args).all()).results;}
async function setting(env,key,value){await env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value)).run();}
async function writeRoles(env,list,board,time){
 for(let start=0;start<list.length;start+=35)await env.DB.batch(list.slice(start,start+35).map(r=>env.DB.prepare(`INSERT INTO roles(id,title,company,url,location,mode,tracks,published_at,first_seen,last_seen,source_board,evidence) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET title=excluded.title,company=excluded.company,location=excluded.location,mode=excluded.mode,tracks=excluded.tracks,published_at=excluded.published_at,last_seen=excluded.last_seen,evidence=excluded.evidence,missing_since=NULL,closure=CASE WHEN roles.closure='missing' THEN 'listed' ELSE roles.closure END WHERE excluded.last_seen>=roles.last_seen`).bind(r.id,r.title,r.company,r.url,r.location,r.mode,JSON.stringify(r.tracks),r.published_at,time,r.last_seen||time,board,JSON.stringify(r.evidence))));
}
export async function normalizeFeed(data,target,time,rawHash){
 if(!data||!Array.isArray(data.jobs)||data.jobs.length>1000)throw err('Invalid or oversized feed; no reconciliation performed',502);
 const seen=new Set(),result=[];
 for(let i=0;i<data.jobs.length;i++){
 const j=data.jobs[i];if(!j||typeof j.title!=='string'||typeof j.jobUrl!=='string'||typeof j.id!=='string')throw err('Malformed listing; refusing incomplete snapshot',502);
 if(j.isListed===false)continue;
 const url=canonicalURL(j.jobUrl);if(seen.has(url))continue;seen.add(url);
 const title=safeText(j.title), location=safeText(j.location)||'Unknown';
 const mode=workMode(location,j.isRemote===true,j.workplaceType||'');
 const published_at=j.publishedAt&&Number.isFinite(Date.parse(j.publishedAt))?new Date(j.publishedAt).toISOString():null;
 const canonical={title,company:target.company,url,location,mode,published_at};
 result.push({...canonical,id:await sha(url),tracks:classify(title),evidence:{origin:'Direct Ashby feed',provider_id:j.id,source_url:'https://api.ashbyhq.com/posting-api/job-board/'+target.board,raw_sha256:rawHash,canonical_sha256:await sha(JSON.stringify(canonical)),canonicalization:'workspace-normalizer-v1 fixed-key JSON',raw_payload_ref:'feeds/'+rawHash+'.json',raw_json_pointer:'/jobs/'+i,fetched_at:time}});
 }return result;
}
async function ingestBoard(env,target){
 const start=NOW(),id=crypto.randomUUID();let count=0,rawHash=null;
 try{
 const bytes=await bounded(await fetch('https://api.ashbyhq.com/posting-api/job-board/'+target.board,{redirect:'manual',signal:AbortSignal.timeout(20000)}));
 rawHash=await sha(bytes);const list=await normalizeFeed(JSON.parse(new TextDecoder().decode(bytes)),target,start,rawHash);count=list.length;
 await env.BUCKET.put('feeds/'+rawHash+'.json',bytes,{httpMetadata:{contentType:'application/json'}});
 await writeRoles(env,list,target.board,start);
 // Only a complete successful snapshot can mark absence. Never infer closure.
 await env.DB.prepare("UPDATE roles SET missing_since=COALESCE(missing_since,?),closure=CASE WHEN closure='listed' THEN 'missing' ELSE closure END WHERE source_board=? AND last_seen<?").bind(start,target.board,start).run();
 await env.DB.prepare('INSERT INTO feed_runs VALUES(?,?,?,?,?,?,?,?)').bind(id,target.board,start,NOW(),'ok',count,null,rawHash).run();return {board:target.board,status:'ok',count};
 }catch(e){await env.DB.prepare('INSERT INTO feed_runs VALUES(?,?,?,?,?,?,?,?)').bind(id,target.board,start,NOW(),'failed',0,safeText(e.message),rawHash).run();return {board:target.board,status:'failed',error:safeText(e.message)};}
}
async function syncLedger(env){
 if(!env.LEDGER_BASE_URL||!env.LEDGER_TOKEN)return {board:'ledger-api',status:'setup required',error:'LEDGER_BASE_URL and LEDGER_TOKEN are not configured'};
 const time=NOW();try{
 const base=new URL(env.LEDGER_BASE_URL);if(base.protocol!=='https:'||base.username||base.password)throw err('Ledger origin must use HTTPS');
 const bytes=await bounded(await fetch(new URL('/opportunities?limit=100',base),{headers:{Authorization:'Bearer '+env.LEDGER_TOKEN},redirect:'manual',signal:AbortSignal.timeout(20000)}));
 const data=JSON.parse(new TextDecoder().decode(bytes));if(!Array.isArray(data)||data.length>100)throw err('Unexpected Ledger response');
 const list=[];for(const x of data){if(!x.title||!x.company||!x.canonical_url||!x.raw_sha256||!x.canonical_sha256)throw err('Ledger evidence missing');if(!x.last_seen_at||!Number.isFinite(Date.parse(x.last_seen_at)))throw err('Ledger sighting timestamp missing');const url=canonicalURL(x.canonical_url);list.push({id:await sha(url),last_seen:new Date(x.last_seen_at).toISOString(),title:safeText(x.title),company:safeText(x.company),url,location:'Unknown (API omits location text)',mode:safeText(x.location_mode),tracks:classify(x.title),published_at:null,evidence:{origin:'Opportunity Ledger API',...Object.fromEntries(['raw_sha256','canonical_sha256','raw_payload_ref','raw_json_pointer','source_url','fetched_at','policy_sha256'].map(k=>[k,x[k]??null])),upstream_score:x.score,upstream_explanation:x.explanation_json,limit_warning:'Top 100 candidate-only view; never a complete closure snapshot'}});}
 await writeRoles(env,list,'ledger-api',time);await env.DB.prepare('INSERT INTO feed_runs VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),'ledger-api',time,NOW(),'ok',list.length,null,await sha(bytes)).run();return {board:'ledger-api',status:'ok',count:list.length};
 }catch(e){await env.DB.prepare('INSERT INTO feed_runs VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),'ledger-api',time,NOW(),'failed',0,'Ledger sync failed: '+safeText(e.message),null).run();return {board:'ledger-api',status:'failed',error:'Ledger connection or contract failed'};}
}
async function refresh(env,source='direct'){
 // Database lease prevents overlapping scheduled/manual refreshes from creating false absences.
 const token=crypto.randomUUID(),time=NOW();
 const lock=await env.DB.prepare("INSERT INTO settings(key,value) VALUES('refresh_lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE json_extract(settings.value,'$.expires')<? RETURNING value").bind(JSON.stringify({token,expires:Date.now()+240000}),Date.now()).first();
 if(!lock)throw err('A refresh is already running. Try again shortly.',409);
 try{const results=[];if(source==='ledger')results.push(await syncLedger(env));else for(const b of BOARDS)results.push(await ingestBoard(env,b));await setting(env,'last_refresh',{at:time,results});return results;}finally{await env.DB.prepare("DELETE FROM settings WHERE key='refresh_lock' AND json_extract(value,'$.token')=?").bind(token).run();}
}
async function state(env){
 const list=await rows(env,`SELECT r.*,v.status,v.stage,v.applied_at,v.followup_at,v.notes,v.draft,v.version,v.updated_at FROM roles r LEFT JOIN reviews v ON r.id=v.role_id ORDER BY r.last_seen DESC LIMIT 5000`);
 const feeds=await rows(env,'SELECT * FROM feed_runs ORDER BY finished_at DESC LIMIT 60');const settings=Object.fromEntries((await rows(env,"SELECT * FROM settings WHERE key!='refresh_lock'")).map(r=>[r.key,JSON.parse(r.value)]));
 return {roles:list.map(r=>({...r,mode:workMode(r.location,r.mode==='remote',r.mode),tracks:JSON.parse(r.tracks),evidence:JSON.parse(r.evidence),status:r.status||'needs review',stage:r.stage||'not started',version:r.version||0,fit:score({...r,mode:workMode(r.location,r.mode==='remote',r.mode)})})),feeds,settings,boards:BOARDS,setup:{database:'connected',snapshots:env.BUCKET?'bound':'missing',ledger:env.LEDGER_BASE_URL&&env.LEDGER_TOKEN?'configured — test sync to verify':'setup required',authentication:'Sites private access',schedule:settings.schedule||{state:'not configured'},apiCoverage:'Latest 100 candidates under upstream policy; no pagination or closure signal'},generated_at:NOW()};
}
async function saveReview(req,env,actor){
 const p=await payload(req);if(!p||typeof p.id!=='string'||!Number.isInteger(p.version))throw err('Role and version required');
 if(!['needs review','actionable','rejected','stale'].includes(p.status)||!['not started','drafting','applied','interview','offer','declined','withdrawn'].includes(p.stage))throw err('Invalid review state');
 for(const k of ['applied_at','followup_at'])if(p[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(p[k]))throw err('Invalid date');
 if(typeof p.notes!=='string'||p.notes.length>8000||typeof p.draft!=='string'||p.draft.length>12000)throw err('Notes or draft too long');
 if(!await env.DB.prepare('SELECT id FROM roles WHERE id=?').bind(p.id).first())throw err('Role not found',404);
 const time=NOW();const result=await env.DB.prepare(`INSERT INTO reviews(role_id,status,stage,applied_at,followup_at,notes,draft,version,updated_at) SELECT ?,?,?,?,?,?,?,1,? WHERE (?=0 OR EXISTS(SELECT 1 FROM reviews WHERE role_id=? AND version=?)) ON CONFLICT(role_id) DO UPDATE SET status=excluded.status,stage=excluded.stage,applied_at=excluded.applied_at,followup_at=excluded.followup_at,notes=excluded.notes,draft=excluded.draft,version=reviews.version+1,updated_at=excluded.updated_at WHERE reviews.version=? RETURNING version`).bind(p.id,p.status,p.stage,p.applied_at||null,p.followup_at||null,p.notes,p.draft,time,p.version,p.id,p.version,p.version).first();
 if(!result)throw err('This role changed in another session. Reload before saving.',409);
 await env.DB.prepare('INSERT INTO events VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),p.id,actor,time,JSON.stringify({action:'review saved',status:p.status,stage:p.stage,version:result.version})).run();return result;
}
export default {async fetch(req,env){
 const u=new URL(req.url);const user=req.headers.get('oai-authenticated-user-id');
 // /api/refresh and /api/health support identity-less service requests ONLY behind
 // the owner-private Sites dispatch gate. Never expose this Worker independently.
 const serviceRoute=['/api/refresh','/api/health','/api/schedule-state'].includes(u.pathname);
 if(!user&&!serviceRoute)return u.pathname.startsWith('/api/')?json({error:'Sign in required'},401):new Response('<a target="_top" href="/signin-with-chatgpt?returnTo=%2F">Sign in to Opportunity Ledger</a>',{status:401,headers:{'content-type':'text/html'}});
 try{
 if(u.pathname==='/'&&req.method==='GET')return new Response(HTML,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com"}});
 if(!env.DB)throw err('D1 database not bound',503);
 if(req.method!=='GET'&&req.method!=='HEAD'){
 const origin=req.headers.get('origin');if(origin&&origin!==u.origin)throw err('Cross-origin write refused',403);
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw err('JSON required',415);
 }
 if(u.pathname==='/api/state'&&req.method==='GET')return json(await state(env));
 if(u.pathname==='/api/health'&&req.method==='GET'){await env.DB.prepare('SELECT count(*) AS n FROM roles').first();return json({database:'ok',snapshotBinding:!!env.BUCKET,runs:await rows(env,'SELECT * FROM feed_runs ORDER BY finished_at DESC LIMIT 8'),schedule:(await rows(env,"SELECT value FROM settings WHERE key='schedule'"))[0]?.value||null});}
 if(u.pathname==='/api/refresh'&&req.method==='POST'){const p=await payload(req);return json({results:await refresh(env,p.source==='ledger'?'ledger':'direct')});}
 if(u.pathname==='/api/review'&&req.method==='POST')return json(await saveReview(req,env,user));
 if(u.pathname==='/api/reconcile'&&req.method==='POST'){
 const p=await payload(req);if(!['confirmed closed','listed','unknown'].includes(p.closure)||typeof p.reason!=='string'||p.reason.trim().length<8)throw err('A closure decision needs an evidence note (8+ characters)');
 const role=await env.DB.prepare('SELECT id FROM roles WHERE id=?').bind(p.id).first();if(!role)throw err('Role not found',404);
 await env.DB.batch([env.DB.prepare('UPDATE roles SET closure=? WHERE id=?').bind(p.closure,p.id),env.DB.prepare('INSERT INTO events VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),p.id,user,NOW(),JSON.stringify({action:'closure reconciliation',closure:p.closure,reason:p.reason.slice(0,2000)}))]);return json({ok:true});
 }
 if(u.pathname==='/api/events'&&req.method==='GET')return json(await rows(env,'SELECT * FROM events WHERE role_id=? ORDER BY at DESC LIMIT 50',u.searchParams.get('id')||''));
 if(u.pathname==='/api/schedule-state'&&req.method==='POST'){if(user)throw err('Service-only setup route',403);const p=await payload(req);if(!['enabled','paused','blocked'].includes(p.state)||typeof p.description!=='string')throw err('Invalid schedule state');await setting(env,'schedule',{state:p.state,description:p.description.slice(0,500),verified_at:NOW()});return json({ok:true});}
 return json({error:'Not found'},404);
 }catch(e){return json({error:e.status?e.message:'Operation failed. No completion is claimed; check Worker logs.'},e.status||500);}
 }};
