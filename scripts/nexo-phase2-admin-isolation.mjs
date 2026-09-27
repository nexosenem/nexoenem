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
  await page.goto(BASE+'?phase2_admin_isolation=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.NEXO_STATE&&typeof openPage==='function'));

  const result=await page.evaluate(async()=>{
    document.querySelector('#authScreen')?.classList.add('hidden');
    document.querySelector('#app')?.classList.remove('hidden');

    const previousProfile=window.NEXO_STATE.profile;
    const previousUser=window.NEXO_STATE.user;
    window.NEXO_STATE.user={id:'phase2-student-smoke'};
    window.NEXO_STATE.profile={
      ...(previousProfile||{}),
      id:'phase2-student-smoke',
      role:'student',
      full_name:'Aluno Smoke'
    };

    openPage('inicio');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const before=document.querySelector('.page.active')?.id||'';

    openPage('admin');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const after=document.querySelector('.page.active')?.id||'';
    const adminActive=Boolean(document.querySelector('#admin')?.classList.contains('active'));

    const adminNav=[...document.querySelectorAll('.admin-only:not(.community-modal)')];
    const initiallyHidden=adminNav.every(el=>el.classList.contains('hidden'));

    window.NEXO_STATE.profile=previousProfile;
    window.NEXO_STATE.user=previousUser;

    return {before,after,adminActive,initiallyHidden,adminOnlyCount:adminNav.length};
  });

  if(result.before!=='inicio')failures.push('student-baseline-route');
  if(result.after!=='inicio'||result.adminActive)failures.push('student-admin-route-bypass');
  if(result.adminOnlyCount>0&&!result.initiallyHidden)failures.push('admin-controls-visible-by-default');

  console.log(JSON.stringify({name:'NEXO Phase 2 admin isolation smoke',result,failures},null,2));
  await context.close();
}finally{
  await browser.close();
}

if(failures.length)throw new Error('Phase 2 admin isolation smoke failed: '+failures.join(', '));
