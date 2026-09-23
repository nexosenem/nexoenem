import { chromium } from 'playwright';

const BASE=process.env.NEXO_SMOKE_URL||'http://127.0.0.1:4173/';
const LIMITS={searchFocus:100,navigation:150};
const failures=[];
const browser=await chromium.launch({headless:true});

try{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block'});
  const page=await context.newPage();
  await page.goto(BASE+'?phase1_budget=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(document.querySelector('.nrx-bottom-nav')&&document.querySelector('#globalSearch')),{timeout:12000});

  const result=await page.evaluate(async limits=>{
    const app=document.querySelector('#app');
    const auth=document.querySelector('#authScreen');
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    if(typeof openPage==='function')openPage('inicio');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    const searchBox=document.querySelector('.nrx-mobile-search-slot .search');
    const search=document.querySelector('#globalSearch');
    search?.blur();
    const s0=performance.now();
    searchBox?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true}));
    const searchMs=performance.now()-s0;

    async function nav(key,id){
      const btn=document.querySelector('[data-nrx-bottom="'+key+'"]');
      const t0=performance.now();
      btn?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true}));
      while(performance.now()-t0<400&&document.querySelector('.page.active')?.id!==id){
        await new Promise(r=>requestAnimationFrame(r));
      }
      return {key,id,ms:performance.now()-t0,ok:document.querySelector('.page.active')?.id===id};
    }

    const navigation=[];
    for(const spec of [['study','materiais'],['questoes','questoes'],['redacao','redacao'],['inicio','inicio']]){
      navigation.push(await nav(spec[0],spec[1]));
    }

    const sample=document.querySelector('.nrx-mobile .nrx-mob-action b');
    document.body.dataset.fontScale='normal';
    await new Promise(r=>requestAnimationFrame(r));
    const normalFont=sample?parseFloat(getComputedStyle(sample).fontSize):0;
    document.body.dataset.fontScale='xlarge';
    await new Promise(r=>requestAnimationFrame(r));
    const xlargeFont=sample?parseFloat(getComputedStyle(sample).fontSize):0;
    document.body.dataset.fontScale='normal';

    const overflows=[...document.querySelectorAll('.nrx-mob-action')]
      .filter(el=>el.scrollWidth>el.clientWidth+2)
      .map(el=>(el.textContent||'').trim());

    return {
      phase1:Boolean(window.NEXO_PHASE1?.ready),
      search:{focused:document.activeElement===search,ms:searchMs},
      navigation,
      typography:{normalFont,xlargeFont},
      overflows
    };
  },LIMITS);

  if(!result.phase1)failures.push('phase1-core');
  if(!result.search.focused||result.search.ms>LIMITS.searchFocus)failures.push('search-focus');
  if(result.navigation.some(x=>!x.ok||x.ms>LIMITS.navigation))failures.push('bottom-nav');
  if(!(result.typography.xlargeFont>result.typography.normalFont+1))failures.push('font-scale');
  if(result.overflows.length)failures.push('mobile-overflow');

  console.log(JSON.stringify({limits:LIMITS,result,failures},null,2));
  await context.close();
}finally{
  await browser.close();
}

if(failures.length)throw new Error('Phase 1 interaction budget failed: '+failures.join(', '));
