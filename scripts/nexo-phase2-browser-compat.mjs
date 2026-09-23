import { chromium, webkit, devices } from 'playwright';

const BASE=process.env.NEXO_SMOKE_URL||'http://127.0.0.1:4173/';
const failures=[];

const scenarios=[
  {
    name:'android-chrome',
    engine:chromium,
    context:{...devices['Pixel 5'],serviceWorkers:'block',locale:'pt-BR'}
  },
  {
    name:'samsung-internet-like',
    engine:chromium,
    context:{
      viewport:{width:412,height:915},
      deviceScaleFactor:2.625,
      isMobile:true,
      hasTouch:true,
      locale:'pt-BR',
      serviceWorkers:'block',
      userAgent:'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36'
    }
  },
  {
    name:'iphone-webkit',
    engine:webkit,
    context:{...devices['iPhone 13'],serviceWorkers:'block',locale:'pt-BR'}
  }
];

for(const scenario of scenarios){
  const browser=await scenario.engine.launch({headless:true});
  try{
    const context=await browser.newContext(scenario.context);
    const page=await context.newPage();
    page.setDefaultTimeout(12000);
    const pageErrors=[];
    page.on('pageerror',err=>pageErrors.push(String(err?.message||err)));

    await page.goto(BASE+'?compat='+encodeURIComponent(scenario.name),{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(document.querySelector('.nrx-bottom-nav')&&document.querySelector('#globalSearch')));

    const result=await page.evaluate(async()=>{
      const app=document.querySelector('#app');
      const auth=document.querySelector('#authScreen');
      app?.classList.remove('hidden');
      auth?.classList.add('hidden');
      if(typeof openPage==='function')openPage('inicio');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

      const nav=document.querySelector('.nrx-bottom-nav');
      const search=document.querySelector('#globalSearch');
      const searchBox=search?.closest('.search');
      const before=document.querySelector('.page.active')?.id||'';

      search?.blur();
      searchBox?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true}));
      const searchFocused=document.activeElement===search;

      const q=document.querySelector('[data-nrx-bottom="questoes"]');
      q?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true}));
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const after=document.querySelector('.page.active')?.id||'';

      if(typeof openPage==='function')openPage('redacao');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const essay=document.querySelector('#essayText');
      const overflow=document.documentElement.scrollWidth>document.documentElement.clientWidth+2;
      const navRect=nav?.getBoundingClientRect();
      const essayRect=essay?.getBoundingClientRect();

      return {
        width:innerWidth,
        overflow,
        bottomVisible:Boolean(nav&&getComputedStyle(nav).display!=='none'&&navRect?.height>40),
        navHeight:navRect?.height||0,
        searchFocused,
        before,
        after,
        essayVisible:Boolean(essay&&essayRect?.width>100&&essayRect?.height>180),
        reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches
      };
    });

    const bad=[];
    if(result.overflow)bad.push('overflow');
    if(!result.bottomVisible)bad.push('bottom-nav');
    if(!result.searchFocused)bad.push('search-focus');
    if(result.after!=='questoes')bad.push('route-touch');
    if(!result.essayVisible)bad.push('essay-editor');
    if(pageErrors.length)bad.push('pageerror:'+pageErrors.join('|'));
    if(bad.length)failures.push({scenario:scenario.name,bad,result,pageErrors});

    console.log(JSON.stringify({scenario:scenario.name,result,pageErrors,bad},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
}

if(failures.length)throw new Error('Phase 2 browser compatibility failed: '+JSON.stringify(failures));
