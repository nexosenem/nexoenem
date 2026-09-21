import fs from 'node:fs';
import { chromium } from 'playwright';

const index=fs.readFileSync('index.html','utf8');
const expectedApp=index.match(/app\.js\?v=([^"]+)/)?.[1]||'';
const expectedHardening=index.match(/nexo-v13-hardening\.js\?v=([^"]+)/)?.[1]||'';
const envUrls=(process.env.NEXO_PUBLIC_URL||'').split(',').map(x=>x.trim()).filter(Boolean);
const candidates=[...new Set([
  ...envUrls,
  'https://nexosenem.miguelcomprarshein222.workers.dev/',
  'https://nexo-enem.miguelcomprarshein222.workers.dev/'
])];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SUPABASE_HEALTH_URL='https://xeesttjsvscuqkeytmdz.supabase.co/auth/v1/health';

async function fetchText(url,timeout=12000){
  const ctl=new AbortController();
  const t=setTimeout(()=>ctl.abort(),timeout);
  try{
    const res=await fetch(url,{cache:'no-store',headers:{'cache-control':'no-cache'},signal:ctl.signal,redirect:'follow'});
    const text=await res.text();
    return {ok:res.ok,status:res.status,url:res.url,text,headers:Object.fromEntries(res.headers.entries())};
  }catch(err){
    return {ok:false,status:0,url,text:'',error:String(err?.message||err),headers:{}};
  }finally{clearTimeout(t)}
}

async function discoverLive(){
  const seen=[];
  for(let attempt=1;attempt<=15;attempt++){
    for(const base of candidates){
      const url=base.endsWith('/')?base:base+'/';
      const r=await fetchText(url+'?deploy_check='+Date.now());
      const hasBrand=/NEXO ENEM/i.test(r.text);
      const hasVersion=expectedApp&&r.text.includes('app.js?v='+expectedApp);
      seen.push({attempt,url,status:r.status,hasBrand,hasVersion,error:r.error||null});
      if(r.ok&&hasBrand&&hasVersion)return {base:url,index:r,seen};
    }
    if(attempt<15)await sleep(5000);
  }
  console.error('Nenhum deploy público atual corresponde ao main.');
  console.error(JSON.stringify(seen.slice(-20),null,2));
  process.exit(1);
}

function localToRemote(base,local){
  return new URL(local.replace(/^\.\//,''),base).href;
}

async function verifyAssets(base,html){
  const failures=[];
  const refs=[...html.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:\?[^"]*)?"/g)].map(m=>m[1]);
  const critical=[
    './app.js','./sw.js','./manifest.webmanifest','./assets/nexo-v13-hardening.js',
    './assets/nexo-v13-core.js','./assets/nexo-v13-ui.js','./assets/nexo-v13-search-errors.js'
  ];
  for(const ref of critical){
    const full=localToRemote(base,ref);
    const r=await fetchText(full+'?asset_check='+Date.now());
    if(!r.ok)failures.push(ref+' HTTP '+r.status);
  }
  const missingCritical=critical.filter(ref=>!refs.some(x=>x===ref)&&!['./sw.js'].includes(ref));
  if(missingCritical.length)failures.push('HTML não referencia: '+missingCritical.join(', '));
  return failures;
}

async function browserProfile(browser,base,name,viewport){
  const ctx=await browser.newContext({viewport,locale:'pt-BR'});
  const page=await ctx.newPage();
  const pageErrors=[],badResponses=[],failedRequests=[];
  page.on('pageerror',err=>pageErrors.push(err.message));
  page.on('response',res=>{
    try{
      const u=new URL(res.url()),b=new URL(base);
      if(u.origin===b.origin&&res.status()>=400)badResponses.push(res.status()+' '+u.pathname);
    }catch{}
  });
  page.on('requestfailed',req=>{
    try{
      const u=new URL(req.url()),b=new URL(base);
      if(u.origin===b.origin)failedRequests.push(u.pathname+' '+(req.failure()?.errorText||''));
    }catch{}
  });

  async function load(label){
    await page.goto(base+'?live_smoke='+encodeURIComponent(name+'-'+label+'-'+Date.now()),{waitUntil:'domcontentloaded',timeout:35000});
    await page.waitForFunction(()=>{
      const boot=document.querySelector('#boot');
      const auth=document.querySelector('#authScreen');
      const app=document.querySelector('#app');
      const bootGone=!boot||boot.classList.contains('hidden')||getComputedStyle(boot).display==='none';
      const authVisible=auth&&!auth.classList.contains('hidden');
      const appVisible=app&&!app.classList.contains('hidden');
      return bootGone||authVisible||appVisible;
    },{timeout:18000});
    await page.waitForTimeout(1500);
  }

  await load('first');
  const first=await page.evaluate(async()=>{
    const result={
      title:document.title,
      hardening:typeof window.nexoRunProductionDiagnostics==='function',
      v13Core:typeof window.v13State==='function',
      sharedState:false,
      wrappers:{render:false,submit:false,essay:false,tutor:false,notebook:false},
      duplicateIds:[],
      sw:false,
      supabaseGlobal:false,
      pdfjsGlobal:false,
      screenVisible:false,
      wiringError:null
    };
    try{
      result.supabaseGlobal=Boolean(window.supabase?.createClient);
      result.pdfjsGlobal=Boolean(window.pdfjsLib);
      result.sharedState=typeof state==='object'&&typeof client==='object'&&typeof v13State==='function'&&v13State()===state.v13;
      result.wrappers.render=typeof window.renderQuestion==='function'&&/mountConfidence/.test(String(window.renderQuestion));
      result.wrappers.submit=typeof window.submitAnswer==='function'&&/v13State/.test(String(window.submitAnswer));
      result.wrappers.essay=typeof window.essayScores==='function'&&/rubric/.test(String(window.essayScores));
      result.wrappers.tutor=typeof window.niaAnswer==='function'&&/v13State/.test(String(window.niaAnswer));
      result.wrappers.notebook=typeof window.loadErrorNotebook==='function'&&/nexo_attempt_reflections/.test(String(window.loadErrorNotebook));
    }catch(err){result.wiringError=String(err?.message||err)}
    const auth=document.querySelector('#authScreen'),app=document.querySelector('#app');
    result.screenVisible=Boolean((auth&&!auth.classList.contains('hidden'))||(app&&!app.classList.contains('hidden')));
    const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);
    result.duplicateIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
    if('serviceWorker' in navigator){
      try{
        const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),10000))]);
        result.sw=Boolean(reg?.active);
      }catch{}
    }
    return result;
  });

  await load('reload');
  const second=await page.evaluate(()=>({
    hardening:typeof window.nexoRunProductionDiagnostics==='function',
    v13Core:typeof window.v13State==='function',
    sharedState:typeof state==='object'&&typeof client==='object'&&typeof v13State==='function'&&v13State()===state.v13,
    renderWrapped:typeof window.renderQuestion==='function'&&/mountConfidence/.test(String(window.renderQuestion)),
    submitWrapped:typeof window.submitAnswer==='function'&&/v13State/.test(String(window.submitAnswer))
  }));

  const failures=[];
  if(!first.hardening||!first.v13Core)failures.push('V13 não carregou');
  if(!first.supabaseGlobal)failures.push('SDK Supabase não carregou');
  if(!first.pdfjsGlobal)failures.push('PDF.js não carregou');
  if(!first.sharedState)failures.push('state/client não compartilhados');
  if(first.wiringError)failures.push('wiring: '+first.wiringError);
  for(const [key,val] of Object.entries(first.wrappers))if(!val)failures.push('wrapper '+key+' inativo');
  if(!first.sw)failures.push('Service Worker inativo');
  if(!first.screenVisible)failures.push('nenhuma tela principal visível');
  if(first.duplicateIds.length)failures.push('IDs duplicados '+first.duplicateIds.join(','));
  if(!second.hardening||!second.v13Core||!second.sharedState||!second.renderWrapped||!second.submitWrapped)failures.push('reload/PWA perdeu wiring');
  const realErrors=[...new Set(pageErrors.filter(x=>!/ResizeObserver loop/i.test(x)))];
  if(realErrors.length)failures.push('pageerror '+realErrors.join(' | '));
  if(badResponses.length)failures.push('HTTP ruim '+[...new Set(badResponses)].join(' | '));
  if(failedRequests.length)failures.push('request falhou '+[...new Set(failedRequests)].join(' | '));

  await ctx.close();
  return {name,viewport,first,second,failures,pageErrors:realErrors,badResponses:[...new Set(badResponses)],failedRequests:[...new Set(failedRequests)]};
}

const live=await discoverLive();
const assetFailures=await verifyAssets(live.base,live.index.text);
const supabaseHealth=await fetchText(SUPABASE_HEALTH_URL);
if(!supabaseHealth.ok)assetFailures.push('Supabase health HTTP '+supabaseHealth.status);
console.log('LIVE_URL='+live.base);
console.log('APP_VERSION='+expectedApp);
console.log('CF_CACHE_STATUS='+(live.index.headers['cf-cache-status']||''));
console.log('SERVER='+(live.index.headers.server||''));
console.log('SUPABASE_HEALTH='+(supabaseHealth.ok?'OK':'FAIL '+supabaseHealth.status));

const browser=await chromium.launch({headless:true});
let profiles;
try{
  profiles=[
    await browserProfile(browser,live.base,'desktop',{width:1440,height:900}),
    await browserProfile(browser,live.base,'mobile',{width:390,height:844})
  ];
}finally{await browser.close()}

const failures=[...assetFailures,...profiles.flatMap(p=>p.failures.map(x=>p.name+': '+x))];
console.log(JSON.stringify({live:live.base,expectedApp,expectedHardening,profiles},null,2));
if(failures.length){
  for(const x of failures)console.error('FAIL',x);
  process.exit(1);
}
console.log('PASS deploy público atual + assets + desktop/mobile + reload/PWA');
