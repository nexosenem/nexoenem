import { chromium } from 'playwright';

const BASE=process.env.NEXO_SMOKE_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const failures=[];

try{
  const context=await browser.newContext({
    viewport:{width:390,height:844},
    locale:'pt-BR',
    serviceWorkers:'block'
  });
  const page=await context.newPage();
  page.setDefaultTimeout(12000);

  await page.goto(BASE+'?phase2_ux=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.NEXO_PHASE2?.coreUx&&document.querySelector('.nrx-bottom-nav')));

  const result=await page.evaluate(async()=>{
    const app=document.querySelector('#app');
    const auth=document.querySelector('#authScreen');
    app?.classList.remove('hidden');
    auth?.classList.add('hidden');
    if(typeof openPage==='function')openPage('inicio');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    const cssPx=el=>el?parseFloat(getComputedStyle(el).fontSize)||0:0;
    const rect=el=>el?.getBoundingClientRect();

    const search=document.querySelector('#globalSearch');
    const homeAction=document.querySelector('.nrx-mobile .nrx-mob-action b');
    const bottomButtons=[...document.querySelectorAll('.nrx-bottom-nav [data-nrx-bottom]')];
    const bottomSizes=bottomButtons.map(b=>{
      const r=rect(b);
      return {key:b.dataset.nrxBottom,w:r?.width||0,h:r?.height||0,font:cssPx(b.querySelector('small'))};
    });

    const docOverflow=document.documentElement.scrollWidth>document.documentElement.clientWidth+2;

    // Questões.
    const qBtn=document.querySelector('[data-nrx-bottom="questoes"]');
    qBtn?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true}));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const qPage=document.querySelector('#questoes');
    const recommended=document.querySelector('#questoes .nx2-question-start');
    const recommendedButton=recommended?.querySelector('button');
    const advanced=document.querySelector('#v15AdvancedQuestionSetup');
    const advancedTitle=advanced?.querySelector('summary b')?.textContent?.trim()||'';

    // Redação.
    const rBtn=document.querySelector('[data-nrx-bottom="redacao"]');
    rBtn?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true}));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const essay=document.querySelector('#essayText');
    const flow=document.querySelector('#redacao .essay-flow-bar');

    // Accessibility current route.
    const current=[...document.querySelectorAll('.nrx-bottom-nav [aria-current="page"]')].map(x=>x.dataset.nrxBottom);

    return {
      phase2:Boolean(window.NEXO_PHASE2?.coreUx),
      search:{
        placeholder:search?.placeholder||'',
        font:cssPx(search)
      },
      homeActionFont:cssPx(homeAction),
      bottomSizes,
      docOverflow,
      questions:{
        active:qPage?.classList.contains('active')||false,
        recommended:Boolean(recommended),
        recommendedButtonHeight:rect(recommendedButton)?.height||0,
        advancedTitle
      },
      essay:{
        font:cssPx(essay),
        flowVisible:Boolean(flow&&getComputedStyle(flow).display!=='none'),
        flowHeight:rect(flow)?.height||0
      },
      current
    };
  });

  if(!result.phase2)failures.push('phase2-core-not-loaded');
  if(!/Pesquisar no NEXO/i.test(result.search.placeholder))failures.push('search-placeholder');
  if(result.search.font<16)failures.push('search-font-too-small');
  if(result.homeActionFont<13)failures.push('home-action-font-too-small');
  if(result.docOverflow)failures.push('document-overflow');
  if(result.bottomSizes.some(x=>x.h<44||x.font<11.5))failures.push('bottom-nav-touch-or-type');
  if(!result.questions.recommended)failures.push('questions-recommended-cta');
  if(result.questions.recommendedButtonHeight<44)failures.push('questions-recommended-touch');
  if(!/Personalizar treino/i.test(result.questions.advancedTitle))failures.push('questions-advanced-label');
  if(result.essay.font<16)failures.push('essay-font-too-small');
  if(!result.essay.flowVisible)failures.push('essay-flow-hidden');
  if(!result.current.includes('redacao'))failures.push('aria-current-route');

  console.log(JSON.stringify({name:'NEXO Phase 2 core UX smoke',result,failures},null,2));
  await context.close();
}finally{
  await browser.close();
}

if(failures.length)throw new Error('Phase 2 UX smoke failed: '+failures.join(', '));
