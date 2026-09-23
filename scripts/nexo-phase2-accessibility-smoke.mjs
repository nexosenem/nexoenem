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
  await page.goto(BASE+'?phase2_a11y=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(document.querySelector('.nrx-bottom-nav')&&document.querySelector('#globalSearch')),{timeout:12000});

  const result=await page.evaluate(async()=>{
    document.querySelector('#authScreen')?.classList.add('hidden');
    document.querySelector('#app')?.classList.remove('hidden');
    if(typeof openPage==='function')openPage('inicio');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    const visible=el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
    };
    const textNodes=[...document.querySelectorAll('.page.active p,.page.active small,.nrx-bottom-nav small,.nrx-mob-action b')]
      .filter(visible)
      .map(el=>({text:(el.textContent||'').trim().slice(0,80),font:parseFloat(getComputedStyle(el).fontSize)}));

    const keyTargets=[...document.querySelectorAll(
      '.nrx-bottom-nav button,.nrx-mobile-theme,.nrx-mobile-crown,.nrx-mobile-menu,.primary-btn,.outline-btn'
    )].filter(visible).map(el=>{
      const r=el.getBoundingClientRect();
      return {label:el.getAttribute('aria-label')||(el.textContent||'').trim().slice(0,60),w:r.width,h:r.height};
    });

    const unlabeled=[...document.querySelectorAll('button,input,select,textarea')].filter(visible).filter(el=>{
      if(el.tagName==='BUTTON')return !(el.getAttribute('aria-label')||(el.textContent||'').trim()||el.getAttribute('title'));
      return !(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.closest('label')||el.getAttribute('placeholder'));
    }).map(el=>el.id||el.className||el.tagName);

    const focusTarget=document.querySelector('.nrx-bottom-nav button');
    focusTarget?.focus();
    const focusStyle=focusTarget?getComputedStyle(focusTarget):null;
    const focusVisible=Boolean(focusStyle&&(focusStyle.outlineStyle!=='none'||focusStyle.boxShadow!=='none'));

    document.body.classList.add('light');
    await new Promise(r=>requestAnimationFrame(r));
    const light={
      bg:getComputedStyle(document.body).backgroundColor,
      color:getComputedStyle(document.body).color,
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2
    };
    document.body.classList.remove('light');

    if(typeof openPage==='function')openPage('redacao');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const textarea=document.querySelector('#essayText');
    textarea?.focus();
    const keyboardScrollMargin=textarea?parseFloat(getComputedStyle(textarea).scrollMarginTop):0;

    return {textNodes,keyTargets,unlabeled,focusVisible,light,keyboardScrollMargin};
  });

  const tooSmall=result.textNodes.filter(x=>x.font<11);
  const tooSmallTargets=result.keyTargets.filter(x=>x.w<40||x.h<40);
  if(tooSmall.length)failures.push('visible-text-below-11px');
  if(tooSmallTargets.length)failures.push('critical-touch-target-below-40px');
  if(result.unlabeled.length)failures.push('unlabeled-controls');
  if(!result.focusVisible)failures.push('focus-visible');
  if(result.light.overflow)failures.push('light-theme-overflow');
  if(result.keyboardScrollMargin<70)failures.push('keyboard-focus-scroll-margin');

  console.log(JSON.stringify({name:'NEXO Phase 2 accessibility smoke',result:{
    minFont:Math.min(...result.textNodes.map(x=>x.font),99),
    tooSmall:tooSmall.slice(0,12),
    tooSmallTargets:tooSmallTargets.slice(0,12),
    unlabeled:result.unlabeled.slice(0,20),
    focusVisible:result.focusVisible,
    light:result.light,
    keyboardScrollMargin:result.keyboardScrollMargin
  },failures},null,2));
  await context.close();
}finally{
  await browser.close();
}

if(failures.length)throw new Error('Phase 2 accessibility smoke failed: '+failures.join(', '));
