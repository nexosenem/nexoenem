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

    // Home should react to real recommendation/session state instead of staying static.
    if(typeof state!=='undefined'){
      state.core={...(state.core||{}),recommended_action:{topic:'Porcentagem',size:6,reason:'Prioridade de teste baseada no desempenho recente.'}};
    }
    if(typeof openPage==='function')openPage('inicio');
    document.dispatchEvent(new CustomEvent('nexo:pagechange',{detail:{id:'inicio'}}));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const homeNext=document.querySelector('.nrx-mobile .nx2-home-next');

    // Search results should paint on the next frame and support keyboard navigation.
    let searchKeyboard=false;
    if(search){
      search.value='redacao';
      search.dispatchEvent(new Event('input',{bubbles:true}));
      await new Promise(r=>requestAnimationFrame(r));
      search.focus();
      search.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
      searchKeyboard=Boolean(document.activeElement?.matches?.('#globalSearchResults button'));
      search.value='';
      search.dispatchEvent(new Event('input',{bubbles:true}));
    }

    // Mobile drawer must lock background scrolling.
    document.querySelector('#moreMobile')?.click();
    await new Promise(r=>requestAnimationFrame(r));
    const menuLocked=document.body.classList.contains('mobile-menu-open')&&document.documentElement.classList.contains('mobile-menu-open');
    document.querySelector('#closeMenu')?.click();

    // Questões: the Phase 1 interaction budget already validates pointerdown navigation.
    // Here we validate the Phase 2 page itself after routing.
    if(typeof openPage==='function')openPage('questoes');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const qPage=document.querySelector('#questoes');
    const recommended=document.querySelector('#questoes .nx2-question-start');
    const recommendedButton=recommended?.querySelector('button');
    const advanced=document.querySelector('#v15AdvancedQuestionSetup');
    const advancedTitle=advanced?.querySelector('summary b')?.textContent?.trim()||'';
    const questionsSnapshot={
      active:qPage?.classList.contains('active')||false,
      recommended:Boolean(recommended),
      recommendedButtonHeight:rect(recommendedButton)?.height||0,
      advancedTitle
    };

    // Redação.
    if(typeof openPage==='function')openPage('redacao');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const essay=document.querySelector('#essayText');
    const flow=document.querySelector('#redacao .essay-flow-bar');

    // Accessibility current route.
    const current=[...document.querySelectorAll('.nrx-bottom-nav [aria-current="page"]')].map(x=>x.dataset.nrxBottom);

    // Phase 2 deeper flows.
    if(typeof openPage==='function')openPage('materiais');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const studyPriority=[...document.querySelectorAll('#materiais .nx2-study-priority [data-nx2-study]')].map(x=>x.dataset.nx2Study);
    const moreGroups=[...document.querySelectorAll('.nx2-more-group>h4')].map(x=>x.textContent.trim());

    if(typeof openPage==='function')openPage('redacao');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const draftStatus=document.querySelector('#redacao .nx2-draft-status');
    const focusMode=document.querySelector('#redacao .nx2-essay-focus-btn');
    const flowHints=[...document.querySelectorAll('#redacao .essay-flow-bar small')].map(x=>({
      text:x.textContent.trim(),
      display:getComputedStyle(x).display,
      height:x.getBoundingClientRect().height
    }));
    const dialog=document.querySelector('#commentModal');

    // Search quality: typo tolerance, recent queries and Ctrl/Cmd+K access.
    const fuzzyRedacao=typeof buildSiteSearchActionResults==='function'
      ? buildSiteSearchActionResults('redcao').some(x=>x.actionId==='redacao')
      : false;
    let recentVisible=false;
    if(typeof saveRecentNexoSearch==='function'&&typeof renderRecentNexoSearches==='function'){
      saveRecentNexoSearch('simulados');
      if(search)search.value='';
      renderRecentNexoSearches();
      recentVisible=Boolean(document.querySelector('[data-search-recent]'));
    }
    search?.blur();
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}));
    await new Promise(r=>requestAnimationFrame(r));
    const ctrlKFocused=document.activeElement===search;

    return {
      phase2:Boolean(window.NEXO_PHASE2?.coreUx&&window.NEXO_PHASE2?.flows),
      search:{
        placeholder:search?.placeholder||'',
        font:cssPx(search)
      },
      homeActionFont:cssPx(homeAction),
      bottomSizes,
      docOverflow,
      homeGuidance:{
        visible:Boolean(homeNext),
        title:homeNext?.querySelector('b')?.textContent?.trim()||''
      },
      searchKeyboard,
      menuLocked,
      questions:questionsSnapshot,
      essay:{
        font:cssPx(essay),
        flowVisible:Boolean(flow&&getComputedStyle(flow).display!=='none'),
        flowHeight:rect(flow)?.height||0
      },
      current,
      studyPriority,
      moreGroups,
      draftStatus:Boolean(draftStatus),
      focusMode:Boolean(focusMode),
      flowHints,
      dialogSemantics:{
        role:dialog?.getAttribute('role')||'',
        modal:dialog?.getAttribute('aria-modal')||''
      },
      searchQuality:{fuzzyRedacao,recentVisible,ctrlKFocused}
    };
  });

  if(!result.phase2)failures.push('phase2-core-not-loaded');
  if(!/Pesquisar no NEXO/i.test(result.search.placeholder))failures.push('search-placeholder');
  if(result.search.font<16)failures.push('search-font-too-small');
  if(result.homeActionFont<13)failures.push('home-action-font-too-small');
  if(result.docOverflow)failures.push('document-overflow');
  if(!result.homeGuidance.visible||!/Porcentagem/i.test(result.homeGuidance.title))failures.push('home-next-action');
  if(!result.searchKeyboard)failures.push('search-keyboard-navigation');
  if(!result.menuLocked)failures.push('mobile-menu-scroll-lock');
  if(result.bottomSizes.some(x=>x.h<44||x.font<11.5))failures.push('bottom-nav-touch-or-type');
  if(!result.questions.recommended)failures.push('questions-recommended-cta');
  if(result.questions.recommendedButtonHeight<44)failures.push('questions-recommended-touch');
  if(!/Personalizar treino/i.test(result.questions.advancedTitle))failures.push('questions-advanced-label');
  if(result.essay.font<16)failures.push('essay-font-too-small');
  if(!result.essay.flowVisible)failures.push('essay-flow-hidden');
  if(!result.current.includes('redacao'))failures.push('aria-current-route');
  if(!['continue','review','recommend'].every(x=>result.studyPriority.includes(x)))failures.push('study-priority-actions');
  if(!result.draftStatus||!result.focusMode)failures.push('essay-writing-tools');
  if(result.flowHints.some(x=>x.display==='none'||x.height<=0))failures.push('essay-guidance-hidden');
  if(result.dialogSemantics.role!=='dialog'||result.dialogSemantics.modal!=='true')failures.push('dialog-semantics');
  if(result.moreGroups.length<2)failures.push('more-menu-groups');
  if(!result.searchQuality.fuzzyRedacao)failures.push('search-fuzzy-typo');
  if(!result.searchQuality.recentVisible)failures.push('search-recents');
  if(!result.searchQuality.ctrlKFocused)failures.push('search-ctrl-k');

  console.log(JSON.stringify({name:'NEXO Phase 2 core UX smoke',result,failures},null,2));
  await context.close();
}finally{
  await browser.close();
}

if(failures.length)throw new Error('Phase 2 UX smoke failed: '+failures.join(', '));
