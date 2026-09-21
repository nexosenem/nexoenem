import { chromium } from 'playwright';

const BASE=process.env.NEXO_SMOKE_URL||'http://127.0.0.1:4173/';
const failures=[];
const info=[];

async function runProfile(browser,name,viewport){
  const context=await browser.newContext({viewport,locale:'pt-BR'});
  const page=await context.newPage();
  const pageErrors=[];
  const badResponses=[];
  const failedRequests=[];

  page.on('pageerror',err=>pageErrors.push(err.message));
  page.on('response',res=>{
    const url=res.url();
    if(url.startsWith(BASE)&&res.status()>=400)badResponses.push(res.status()+' '+url);
  });
  page.on('requestfailed',req=>{
    const url=req.url();
    if(url.startsWith(BASE))failedRequests.push(url+' '+(req.failure()?.errorText||''));
  });

  async function load(label){
    await page.goto(BASE+'?smoke='+encodeURIComponent(name+'-'+label),{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>{
      const boot=document.querySelector('#boot');
      const auth=document.querySelector('#authScreen');
      const app=document.querySelector('#app');
      const bootGone=!boot||boot.classList.contains('hidden')||getComputedStyle(boot).display==='none';
      const authVisible=auth&&!auth.classList.contains('hidden');
      const appVisible=app&&!app.classList.contains('hidden');
      return bootGone||authVisible||appVisible;
    },{timeout:16000});
    await page.waitForTimeout(1200);
  }

  await load('first');

  const first=await page.evaluate(async()=>{
    const result={
      title:document.title,
      hardening:typeof window.nexoRunProductionDiagnostics==='function',
      v13Core:typeof window.v13State==='function',
      authVisible:!document.querySelector('#authScreen')?.classList.contains('hidden'),
      appVisible:!document.querySelector('#app')?.classList.contains('hidden'),
      duplicateIds:[],
      serviceWorker:false
    };
    const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);
    result.duplicateIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
    if('serviceWorker' in navigator){
      try{
        const reg=await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_,reject)=>setTimeout(()=>reject(new Error('sw timeout')),8000))
        ]);
        result.serviceWorker=Boolean(reg?.active);
      }catch(_){}
    }
    return result;
  });

  if(!first.hardening)failures.push(name+': hardening não carregou');
  if(!first.v13Core)failures.push(name+': V13 core não carregou');
  if(!first.authVisible&&!first.appVisible)failures.push(name+': nenhuma tela principal ficou visível');
  if(first.duplicateIds.length)failures.push(name+': IDs duplicados em runtime: '+first.duplicateIds.join(', '));
  if(!first.serviceWorker)failures.push(name+': Service Worker não ficou ativo');

  await load('reload');

  const second=await page.evaluate(()=>({
    hardening:typeof window.nexoRunProductionDiagnostics==='function',
    v13Core:typeof window.v13State==='function',
    authVisible:!document.querySelector('#authScreen')?.classList.contains('hidden'),
    appVisible:!document.querySelector('#app')?.classList.contains('hidden')
  }));
  if(!second.hardening||!second.v13Core)failures.push(name+': módulos V13 falharam após reload/PWA');
  if(!second.authVisible&&!second.appVisible)failures.push(name+': boot falhou após reload/PWA');

  const benignPageErrors=[
    /ResizeObserver loop/i
  ];
  const realErrors=pageErrors.filter(msg=>!benignPageErrors.some(rx=>rx.test(msg)));
  if(realErrors.length)failures.push(name+': pageerror: '+[...new Set(realErrors)].join(' | '));
  if(badResponses.length)failures.push(name+': respostas HTTP locais ruins: '+[...new Set(badResponses)].join(' | '));
  if(failedRequests.length)failures.push(name+': requests locais falharam: '+[...new Set(failedRequests)].join(' | '));

  info.push({name,viewport,first,second,pageErrors:realErrors.length,badResponses:badResponses.length,failedRequests:failedRequests.length});
  await context.close();
}

const browser=await chromium.launch({headless:true});
try{
  await runProfile(browser,'desktop',{width:1440,height:900});
  await runProfile(browser,'mobile',{width:390,height:844});
}finally{
  await browser.close();
}

console.log('NEXO Browser Smoke');
console.log('==================');
for(const row of info)console.log(JSON.stringify(row));
if(failures.length){
  for(const failure of failures)console.error('FAIL',failure);
  process.exit(1);
}
console.log('PASS desktop + mobile + reload/PWA sem falhas críticas');
