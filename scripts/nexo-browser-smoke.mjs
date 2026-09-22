import { chromium } from 'playwright';

const BASE=process.env.NEXO_SMOKE_URL||'http://127.0.0.1:4173/';
const failures=[];
const info=[];

async function runProfile(browser,name,viewport){
  const context=await browser.newContext({viewport,locale:'pt-BR'});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);
  let smokeStage='boot';
  const markStage=label=>{smokeStage=label;console.log('STAGE '+name+' '+label)};
  const watchdog=setTimeout(()=>{
    console.error('FAIL '+name+': browser smoke watchdog em '+smokeStage);
    process.exit(2);
  },120000); // browser smoke watchdog
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
    await page.goto(BASE+'?smoke='+encodeURIComponent(name+'-'+label),{waitUntil:'commit',timeout:30000});
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

  markStage('load-first');
  await load('first');

  markStage('core-state');
  const first=await page.evaluate(()=>{
    const result={
      title:document.title,
      hardening:typeof window.nexoRunProductionDiagnostics==='function',
      v13Core:typeof window.v13State==='function',
      authVisible:!document.querySelector('#authScreen')?.classList.contains('hidden'),
      appVisible:!document.querySelector('#app')?.classList.contains('hidden'),
      duplicateIds:[],
      serviceWorker:false,
      sharedState:false,
      essayEngine:false,
      wrappers:{render:false,submit:false,essay:false,tutor:false,notebook:false},
      wiringError:null,
      siteSearch:false,
      searchActionWorks:false,
      searchSamples:[],
      percentTones:false,
      percentToneMap:[]
    };
    try{
      result.sharedState=typeof state==='object'&&typeof client==='object'&&typeof v13State==='function'&&v13State()===state.v13;
      result.wrappers.render=typeof window.renderQuestion==='function'&&/mountConfidence/.test(String(window.renderQuestion));
      result.wrappers.submit=typeof window.submitAnswer==='function'&&/v13State/.test(String(window.submitAnswer));
      result.wrappers.essay=typeof window.essayScores==='function'&&/rubric/.test(String(window.essayScores));
      result.wrappers.tutor=typeof window.niaAnswer==='function'&&/v13State/.test(String(window.niaAnswer));
      result.wrappers.notebook=typeof window.loadErrorNotebook==='function'&&/nexo_attempt_reflections/.test(String(window.loadErrorNotebook));
    }catch(err){result.wiringError=String(err?.message||err);}
    const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);
    result.duplicateIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
    return result;
  });

  markStage('essay-engine');
  const essayProbe=await page.evaluate(()=>{
    try{
      const sample=('A educação pública é essencial para a cidadania. Portanto, o Estado deve ampliar políticas de formação e acesso. '+
        'Além disso, desigualdades sociais afetam oportunidades e exigem ações coordenadas. Por meio de programas permanentes, '+
        'escolas e governos podem promover acompanhamento, formação docente e inclusão, a fim de reduzir barreiras e garantir direitos. ').repeat(4);
      const scores=typeof window.essayScores==='function'?window.essayScores(sample):null;
      return {ok:Array.isArray(scores)&&scores.length===5&&scores.every(n=>Number.isFinite(n)&&n>=0&&n<=200),error:null};
    }catch(err){return {ok:false,error:String(err?.message||err)}}
  });
  first.essayEngine=essayProbe.ok;
  if(essayProbe.error)first.wiringError=(first.wiringError?first.wiringError+' | ':'')+'essay: '+essayProbe.error;

  markStage('search-results');
  const searchProbe=await page.evaluate(()=>{
    try{
      const queries=['perfil de evolução','professor nexo','caderno de erros','simulado','radar enem'];
      const samples=queries.map(q=>({q,items:typeof buildGlobalSearchResults==='function'?buildGlobalSearchResults(q).filter(x=>x.type==='action').map(x=>x.actionId):[]}));
      return {samples,ok:samples.every(x=>x.items.length>0)&&typeof runSiteSearchAction==='function',error:null};
    }catch(err){return {samples:[],ok:false,error:String(err?.message||err)}}
  });
  first.searchSamples=searchProbe.samples;
  first.siteSearch=searchProbe.ok;
  if(searchProbe.error)first.wiringError=(first.wiringError?first.wiringError+' | ':'')+'search: '+searchProbe.error;

  markStage('percent-tones');
  const toneProbe=await page.evaluate(()=>{
    try{
      const host=document.createElement('div');
      host.innerHTML='<b>39%</b><b>40%</b><b>79%</b><b>80%</b><b>100%</b>';
      document.body.appendChild(host);
      if(typeof window.nexoApplyPercentTones==='function')window.nexoApplyPercentTones(host);
      const map=[...host.querySelectorAll('b')].map(el=>({text:el.textContent,tone:el.dataset.scoreTone||'',classes:[...el.classList]}));
      host.remove();
      return {map,ok:JSON.stringify(map.map(x=>x.tone))===JSON.stringify(['low','mid','mid','high','high']),error:null};
    }catch(err){return {map:[],ok:false,error:String(err?.message||err)}}
  });
  first.percentToneMap=toneProbe.map;
  first.percentTones=toneProbe.ok;
  if(toneProbe.error)first.wiringError=(first.wiringError?first.wiringError+' | ':'')+'tones: '+toneProbe.error;

  markStage('search-action');
  const searchActionProbe=await page.evaluate(()=>{
    try{
      if(typeof runSiteSearchAction!=='function')return {ok:false,error:'runSiteSearchAction ausente'};
      runSiteSearchAction('evolucao');
      const ok=Boolean(document.querySelector('#desempenho')?.classList.contains('active'));
      if(typeof openPage==='function')openPage('inicio');
      return {ok,error:null};
    }catch(err){return {ok:false,error:String(err?.message||err)}}
  });
  first.searchActionWorks=searchActionProbe.ok;
  if(searchActionProbe.error)first.wiringError=(first.wiringError?first.wiringError+' | ':'')+'search-action: '+searchActionProbe.error;

  markStage('search-ui');
  const globalSearchUiTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const panel=document.querySelector('#niaPanel');
    const input=document.querySelector('#globalSearch');
    const box=document.querySelector('#globalSearchResults');
    const prev={
      app:app?.className||'',
      auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      panel:panel?.className||'',
      inputValue:input?.value||'',
      boxClass:box?.className||''
    };
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const active=()=>document.querySelector('.page.active')?.id||'';
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    if(typeof openPage==='function')openPage('inicio');
    await wait(70);

    async function choose(query,title){
      if(!input||!box)return {found:false,clicked:false};
      input.focus();
      input.value=query;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      await wait(220);
      const buttons=[...box.querySelectorAll('[data-global-result]')];
      const button=buttons.find(btn=>(btn.querySelector('b')?.textContent||'').trim()===title);
      const visible=Boolean(button&&!box.classList.contains('hidden')&&getComputedStyle(button).display!=='none');
      if(button)button.click();
      await wait(220);
      return {found:Boolean(button),visible,clicked:Boolean(button)};
    }

    const radarPick=await choose('radar enem','Radar ENEM');
    const radarOpened=active()==='radar';

    if(typeof openPage==='function')openPage('inicio');
    await wait(70);
    const nexoPick=await choose('professor nexo','Professor Nexo');
    const nexoOpened=Boolean(panel&&!panel.classList.contains('hidden'));
    document.querySelector('#closeNia')?.click();
    await wait(50);
    const nexoClosed=Boolean(panel?.classList.contains('hidden'));

    if(input)input.value=prev.inputValue;
    if(box)box.className=prev.boxClass;
    if(panel)panel.className=prev.panel;
    pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
    if(app)app.className=prev.app;
    if(auth)auth.className=prev.auth;
    return {radarPick,radarOpened,nexoPick,nexoOpened,nexoClosed};
  });
  if(!globalSearchUiTest.radarPick.found||!globalSearchUiTest.radarPick.visible||!globalSearchUiTest.radarOpened)
    failures.push(name+': pesquisa visual não abriu Radar ENEM: '+JSON.stringify(globalSearchUiTest));
  if(!globalSearchUiTest.nexoPick.found||!globalSearchUiTest.nexoPick.visible||!globalSearchUiTest.nexoOpened||!globalSearchUiTest.nexoClosed)
    failures.push(name+': pesquisa visual não abriu/fechou Professor Nexo: '+JSON.stringify(globalSearchUiTest));

  markStage('service-worker');
  first.serviceWorker=await page.evaluate(async()=>{
    if(!('serviceWorker' in navigator))return false;
    try{
      const reg=await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('sw timeout')),8000))
      ]);
      return Boolean(reg?.active);
    }catch(_){return false}
  });

  markStage('reference-home');
  const referenceUiTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app');
    const auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      appClass:app?.className||'',
      authClass:auth?.className||'',
      active:pages.filter(p=>p.classList.contains('active')).map(p=>p.id)
    };
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    pages.forEach(p=>p.classList.toggle('active',p.id==='inicio'));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const mobile=innerWidth<=760;
    const desktopHome=document.querySelector('.nrx-desktop');
    const mobileHome=document.querySelector('.nrx-mobile');
    const target=mobile?mobileHome:desktopHome;
    const targetStyle=target?getComputedStyle(target):null;
    const rect=target?.getBoundingClientRect?.();
    const side=document.querySelector('.nrx-side-nav');
    const bottom=document.querySelector('.nrx-bottom-nav');
    const search=document.querySelector('.search');
    const heroImg=target?.querySelector('img');
    const mobileBrand=document.querySelector('.nrx-mobile-brand');
    const logoWord=document.querySelector('.nrx-logo-word');
    const logoLetter=document.querySelector('.nrx-logo-letter');
    const mobileTheme=document.querySelector('.nrx-mobile-theme');
    const mobileCrown=document.querySelector('.nrx-mobile-crown');
    const mobileNotice=[...document.querySelectorAll('.topbar>.top-actions .icon-btn')].find(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0);
    const brandText=(mobileBrand?.textContent||'').replace(/\s+/g,' ').trim();
    const logoLetterVisible=Boolean(logoLetter&&getComputedStyle(logoLetter).display!=='none'&&logoLetter.getBoundingClientRect().width>0);
    const mobileThemeVisible=Boolean(mobileTheme&&getComputedStyle(mobileTheme).display!=='none'&&mobileTheme.getBoundingClientRect().width>0);
    const mobileCrownVisible=Boolean(mobileCrown&&getComputedStyle(mobileCrown).display!=='none'&&mobileCrown.getBoundingClientRect().width>0);
    const headerControlOrder=(()=>{
      if(!mobileThemeVisible||!mobileCrownVisible)return false;
      const t=mobileTheme.getBoundingClientRect(),c=mobileCrown.getBoundingClientRect(),n=mobileNotice?.getBoundingClientRect();
      const sameRow=Math.abs(t.top-c.top)<=4&&(!n||Math.abs(c.top-n.top)<=4);
      const horizontal=t.left<c.left&&(!n||c.left<n.left);
      return sameRow&&horizontal;
    })();
    let mobileThemeWorks=true;
    if(mobile&&mobileThemeVisible){
      const wasLight=document.body.classList.contains('light');
      mobileTheme.click();
      await new Promise(r=>setTimeout(r,30));
      const changed=document.body.classList.contains('light')!==wasLight;
      mobileTheme.click();
      await new Promise(r=>setTimeout(r,30));
      const restored=document.body.classList.contains('light')===wasLight;
      mobileThemeWorks=changed&&restored;
    }
    const result={
      bodyClass:document.body.classList.contains('nexo-reference-ui'),
      desktopMounted:Boolean(desktopHome),
      mobileMounted:Boolean(mobileHome),
      sidebarMounted:Boolean(side),
      sideItems:side?.querySelectorAll('[data-nrx-side]').length||0,
      targetVisible:Boolean(target&&targetStyle?.display!=='none'&&rect?.width>0&&rect?.height>0),
      width:Math.round(rect?.width||0),
      viewport:innerWidth,
      overflow:document.documentElement.scrollWidth>innerWidth+3,
      bottomMounted:Boolean(bottom),
      bottomVisible:Boolean(bottom&&getComputedStyle(bottom).display!=='none'&&!bottom.hidden),
      bottomLabels:bottom?[...bottom.querySelectorAll('small')].map(x=>x.textContent.trim()):[],
      contextVisible:Boolean(document.querySelector('#nexoContextBar')&&getComputedStyle(document.querySelector('#nexoContextBar')).display!=='none'),
      heroFirst:mobile?document.querySelector('#inicio')?.firstElementChild===mobileHome:true,
      searchInMobileSlot:Boolean(search?.closest('.nrx-mobile-search-slot')),
      mobileBrandText:brandText,
      mobileWordmarkVisible:Boolean(logoWord&&getComputedStyle(logoWord).display!=='none'&&logoWord.getBoundingClientRect().width>0),
      mobileLogoLetterVisible:logoLetterVisible,
      mobileThemeVisible,
      mobileCrownVisible,
      headerControlOrder,
      mobileThemeWorks,
      heroLoaded:Boolean(heroImg?.complete&&heroImg?.naturalWidth>0),
      originalHomeHidden:[...document.querySelectorAll('#inicio>.mobile-home,#inicio>.dashboard-grid')].every(el=>getComputedStyle(el).display==='none')
    };
    if(app)app.className=prev.appClass;
    if(auth)auth.className=prev.authClass;
    pages.forEach(p=>p.classList.toggle('active',prev.active.includes(p.id)));
    return result;
  });

  if(!referenceUiTest.bodyClass)failures.push(name+': camada visual de referência não foi ativada');
  if(!referenceUiTest.desktopMounted||!referenceUiTest.mobileMounted)failures.push(name+': home de referência desktop/mobile não foi montada');
  if(!referenceUiTest.sidebarMounted||referenceUiTest.sideItems<10)failures.push(name+': navegação lateral de referência incompleta');
  if(!referenceUiTest.targetVisible)failures.push(name+': home de referência não ficou visível no viewport '+name);
  if(referenceUiTest.overflow)failures.push(name+': interface de referência criou overflow horizontal');
  if(!referenceUiTest.originalHomeHidden)failures.push(name+': home antiga continua visível junto da referência');
  if(name==='mobile'&&!referenceUiTest.bottomVisible)failures.push(name+': barra inferior de referência não ficou visível');
  if(name==='mobile'&&referenceUiTest.bottomLabels.join('|')!=='Início|Estudar|Questões|Redação|Mais')failures.push(name+': barra inferior perdeu a navegação principal/área Mais: '+referenceUiTest.bottomLabels.join('|'));
  if(name==='mobile'&&referenceUiTest.contextVisible)failures.push(name+': guia contextual ainda está acima do hero na entrada da Home');
  if(name!=='mobile'&&!referenceUiTest.contextVisible)failures.push(name+': guia Onde estou / Próximo ficou oculto fora da entrada mobile');
  if(name==='mobile'&&!referenceUiTest.heroFirst)failures.push(name+': hero Disciplina hoje não é o primeiro conteúdo da Home');
  if(name==='mobile'&&!referenceUiTest.searchInMobileSlot)failures.push(name+': busca não foi movida para a posição móvel da referência');
  if(name==='mobile'&&(!referenceUiTest.mobileWordmarkVisible||!referenceUiTest.mobileLogoLetterVisible||referenceUiTest.mobileBrandText!=='Nexo'))failures.push(name+': wordmark Nexo mobile não está natural/legível: '+JSON.stringify({text:referenceUiTest.mobileBrandText,wordmark:referenceUiTest.mobileWordmarkVisible,n:referenceUiTest.mobileLogoLetterVisible}));
  if(name==='mobile'&&!referenceUiTest.mobileThemeVisible)failures.push(name+': controle claro/escuro não ficou visível no cabeçalho mobile');
  if(name==='mobile'&&!referenceUiTest.mobileCrownVisible)failures.push(name+': botão da coroa não ficou visível no cabeçalho mobile');
  if(name==='mobile'&&!referenceUiTest.headerControlOrder)failures.push(name+': ordem do cabeçalho mobile não é tema -> coroa -> notificações');
  if(name==='mobile'&&!referenceUiTest.mobileThemeWorks)failures.push(name+': controle claro/escuro mobile não alternou e restaurou o tema');
  if(!referenceUiTest.heroLoaded)failures.push(name+': mascote da home de referência não carregou');

  markStage('reference-access');
  const referenceAccessTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.filter(p=>p.classList.contains('active')).map(p=>p.id)
    };
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    pages.forEach(p=>p.classList.toggle('active',p.id==='inicio'));
    await new Promise(r=>requestAnimationFrame(r));

    const expected=['materiais','simulados','semana','focos','radar','banco','temas','feedback','ranking','store','avatar','planos','nexo','settings'];
    const side=[...document.querySelectorAll('.nrx-side-more-panel [data-nrx-target]')].map(x=>x.dataset.nrxTarget);
    const profile=[...document.querySelectorAll('.nrx-profile-tools [data-nrx-target]')].map(x=>x.dataset.nrxTarget);
    const missingSide=expected.filter(x=>!side.includes(x));
    const missingProfile=expected.filter(x=>!profile.includes(x));
    const visible=el=>Boolean(el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
    const candidates=[...document.querySelectorAll('.nrx-shortcut,.nrx-stat-card,.nrx-preview,.nrx-mob-action,.nrx-mob-progress,.nrx-mob-continue')].filter(visible);
    const overflowing=candidates.filter(el=>el.scrollWidth>el.clientWidth+4).map(el=>el.className);
    const mobile=innerWidth<=760;
    const actionButtons=mobile?[...document.querySelectorAll('.nrx-mobile .nrx-mob-action')].filter(visible):[];
    const minTouch=actionButtons.length?Math.min(...actionButtons.map(el=>el.getBoundingClientRect().height)):0;
    const actionCount=actionButtons.length;
    let moreOpened=true;
    if(mobile){
      document.querySelector('[data-nrx-bottom="more"]')?.click();
      await new Promise(r=>setTimeout(r,20));
      const sidebar=document.querySelector('#sidebar');
      moreOpened=Boolean(document.body.classList.contains('mobile-menu-open')&&sidebar?.classList.contains('open'));
      document.querySelector('#closeMenu')?.click();
    }
    const hero=document.querySelector(mobile?'.nrx-mob-hero h1':'.nrx-hero h1');
    const heroFont=hero?parseFloat(getComputedStyle(hero).fontSize):0;
    const result={
      missingSide,missingProfile,overflowing,minTouch,heroFont,
      moreToggle:Boolean(document.querySelector('.nrx-side-more-toggle')),
      profileTools:Boolean(document.querySelector('.nrx-profile-tools')),
      notificationWired:Boolean(document.querySelector('#notificationBtn')),
      actionCount,moreOpened
    };
    pages.forEach(p=>p.classList.toggle('active',prev.active.includes(p.id)));
    if(app)app.className=prev.app;
    if(auth)auth.className=prev.auth;
    return result;
  });
  if(referenceAccessTest.missingSide.length)failures.push(name+': recursos antigos ausentes do menu Mais: '+referenceAccessTest.missingSide.join(', '));
  if(referenceAccessTest.missingProfile.length)failures.push(name+': recursos antigos ausentes do Perfil: '+referenceAccessTest.missingProfile.join(', '));
  if(!referenceAccessTest.moreToggle)failures.push(name+': acesso Mais recursos não foi montado');
  if(!referenceAccessTest.profileTools)failures.push(name+': recursos secundários não foram preservados no Perfil');
  if(name==='mobile'&&!referenceAccessTest.moreOpened)failures.push(name+': botão Mais não abriu o menu completo');
  if(referenceAccessTest.overflowing.length)failures.push(name+': cards da referência com overflow: '+referenceAccessTest.overflowing.join(', '));
  if(name==='mobile'&&referenceAccessTest.actionCount<8)failures.push(name+': atalhos principais móveis ausentes: '+referenceAccessTest.actionCount+'/8');
  if(name==='mobile'&&referenceAccessTest.minTouch<44)failures.push(name+': alvo de toque principal menor que 44px');
  if(name==='mobile'&&referenceAccessTest.heroFont<26)failures.push(name+': título principal pequeno demais');
  if(name!=='mobile'&&referenceAccessTest.heroFont<36)failures.push(name+': título principal desktop pequeno demais');

  markStage('v14-experience');
  const v14ExperienceTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={app:app?.className||'',auth:auth?.className||'',active:pages.find(p=>p.classList.contains('active'))?.id||'inicio'};
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    pages.forEach(p=>p.classList.toggle('active',p.id==='desempenho'));
    await new Promise(r=>setTimeout(r,120));
    const loop=document.querySelector('#v14LearningLoop');
    const loopActions=loop?.querySelectorAll('[data-v14-loop]').length||0;
    const diagnostic=document.querySelector('[data-v14-diagnostic]');
    const diagnosticCard=document.querySelector('[data-v14-diagnostic-card]');
    const full=document.querySelector('#simulados [data-sim-mode="full"] b')?.textContent?.trim()||'';
    const desktopBrand=document.querySelector('#sidebar .brand');
    const hiddenMark=desktopBrand?.querySelector('.v14-wordmark-hidden');
    const brandName=desktopBrand?.querySelector('b')?.textContent?.trim()||'';
    const brandVisible=Boolean(desktopBrand?.querySelector('b')&&getComputedStyle(desktopBrand.querySelector('b')).display!=='none'&&desktopBrand.querySelector('b').getBoundingClientRect().width>0);
    const brief=document.querySelector('#v13Brief');
    const briefMoved=!brief||brief.parentElement?.id==='semana';
    const hero=document.querySelector(innerWidth<=760?'.nrx-mob-hero':'.nrx-hero');
    const sidebar=document.querySelector('#sidebar');
    const heroStyle=hero?getComputedStyle(hero):null;
    const heroRadius=parseFloat(heroStyle?.borderRadius||'0');
    const sidebarWidth=sidebar?.getBoundingClientRect().width||0;
    let diagnosticWorks=true,diagnosticCall=null;
    if(diagnosticCard){
      const original=window.startStudySession;
      window.startStudySession=async opts=>{diagnosticCall=opts;return true};
      diagnosticCard.click();
      await new Promise(r=>setTimeout(r,180));
      diagnosticWorks=Boolean(diagnosticCall&&diagnosticCall.mode==='diagnostic'&&Number(diagnosticCall.size)===20);
      window.startStudySession=original;
    }
    pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
    if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    return {
      loop:Boolean(loop),loopActions,diagnostic:Boolean(diagnostic),
      diagnosticCard:Boolean(diagnosticCard),diagnosticWorks,diagnosticCall,full,
      naturalBrand:Boolean(hiddenMark&&brandVisible),
      brandName,briefMoved,heroRadius,sidebarWidth
    };
  });
  if(!v14ExperienceTest.loop||v14ExperienceTest.loopActions!==4||!v14ExperienceTest.diagnostic)
    failures.push(name+': ciclo Aprender/Praticar/Recordar/Revisar não foi montado: '+JSON.stringify(v14ExperienceTest));
  if(!v14ExperienceTest.diagnosticCard||!v14ExperienceTest.diagnosticWorks||v14ExperienceTest.full!=='ENEM Real')
    failures.push(name+': diagnóstico/Modo ENEM Real não foram preservados nos simulados: '+JSON.stringify(v14ExperienceTest));
  if(v14ExperienceTest.heroRadius<14)
    failures.push(name+': hero perdeu o acabamento arredondado premium: '+JSON.stringify(v14ExperienceTest));
  if(name==='desktop'&&(v14ExperienceTest.sidebarWidth<205||v14ExperienceTest.sidebarWidth>235))
    failures.push(name+': sidebar se afastou da proporção da referência visual: '+JSON.stringify(v14ExperienceTest));
  if(name==='desktop'&&(!v14ExperienceTest.naturalBrand||v14ExperienceTest.brandName!=='Nexo'))
    failures.push(name+': wordmark Nexo desktop não está natural/legível: '+JSON.stringify(v14ExperienceTest));
  if(!v14ExperienceTest.briefMoved)
    failures.push(name+': plano adaptativo ainda polui a Home em vez de ficar no Planner: '+JSON.stringify(v14ExperienceTest));

  markStage('route-matrix');
  const routeMatrixTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app');
    const auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')].filter(p=>p.id!=='videoaulas'&&p.id!=='admin');
    const original={
      app:app?.className||'',
      auth:auth?.className||'',
      light:document.body.classList.contains('light'),
      font:document.body.dataset.fontScale||'normal',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio'
    };
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    const results=[];
    const modes=[
      {theme:'dark',font:'normal'},
      {theme:'light',font:'normal'},
      {theme:'dark',font:'xlarge'}
    ];
    for(const mode of modes){
      document.body.classList.toggle('light',mode.theme==='light');
      document.body.dataset.fontScale=mode.font;
      for(const target of pages){
        document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p===target));
        await new Promise(r=>requestAnimationFrame(r));
        const rect=target.getBoundingClientRect();
        const style=getComputedStyle(target);
        const probeSelector='.page-head,.panel,.question-card,.plan-card,.theme-card,.journey-profile-card,.essay-workspace-v2,.sim-grid,.week-full-grid,.bank-list,.content-library-layout,.plans-grid,.journey-layout';
        const children=[...target.querySelectorAll(probeSelector)].slice(0,48)
          .filter(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0;});
        const overflow=children.filter(el=>{
          const ox=getComputedStyle(el).overflowX;
          return !['auto','scroll','hidden','clip'].includes(ox)&&el.scrollWidth>el.clientWidth+8;
        }).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,id:el.id,sw:el.scrollWidth,cw:el.clientWidth}));
        results.push({
          page:target.id,theme:mode.theme,font:mode.font,
          visible:style.display!=='none'&&rect.width>0&&rect.height>0,
          documentOverflow:document.documentElement.scrollWidth>innerWidth+4,
          overflow
        });
      }
    }
    document.body.classList.toggle('light',original.light);
    document.body.dataset.fontScale=original.font;
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===original.active));
    if(app)app.className=original.app;
    if(auth)auth.className=original.auth;
    return results;
  });
  const routeBad=routeMatrixTest.filter(x=>!x.visible||x.documentOverflow||x.overflow.length);
  if(routeBad.length)failures.push(name+': matriz visual por página/tema/fonte encontrou problemas: '+JSON.stringify(routeBad.slice(0,12)));

  markStage('utilities');
  const utilityTest=await page.evaluate(()=>{
    const app=document.querySelector('#app');
    const auth=document.querySelector('#authScreen');
    const profile=document.querySelector('#profileMenu');
    const prev={app:app?.className||'',auth:auth?.className||'',profile:profile?.className||''};
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    if(profile)profile.classList.remove('hidden');
    const search=document.querySelector('[data-nrx-utility="search"]');
    const theme=document.querySelector('[data-nrx-utility="theme"]');
    const notification=document.querySelector('#notificationBtn');
    const notificationVisible=Boolean(notification&&getComputedStyle(notification).display!=='none'&&notification.getBoundingClientRect().width>0);
    const profileScrollable=profile?['auto','scroll'].includes(getComputedStyle(profile).overflowY)||profile.scrollHeight<=profile.clientHeight:true;
    if(app)app.className=prev.app;
    if(auth)auth.className=prev.auth;
    if(profile)profile.className=prev.profile;
    return {search:Boolean(search),theme:Boolean(theme),notification:Boolean(notification),notificationVisible,profileScrollable};
  });
  if(!utilityTest.search||!utilityTest.theme)failures.push(name+': busca ou tema ficaram sem acesso na interface nova');
  if(name==='mobile'&&!utilityTest.notificationVisible)failures.push(name+': notificações continuam escondidas no topo móvel');
  if(name==='mobile'&&!utilityTest.profileScrollable)failures.push(name+': painel Perfil pode cortar recursos no celular');

  markStage('legacy-capabilities');
  const legacyCapabilityTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen'),profile=document.querySelector('#profileMenu');
    const prev={app:app?.className||'',auth:auth?.className||'',profile:profile?.className||''};
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    if(profile)profile.classList.remove('hidden');
    const expected=['next','why','core','today','mission','visual','ten','guide'];
    const tools=[...document.querySelectorAll('[data-nrx-home-tool]')].map(x=>x.dataset.nrxHomeTool);
    const missing=expected.filter(x=>!tools.includes(x));
    const guide=document.querySelector('[data-nrx-home-tool="guide"]');
    guide?.click();
    await new Promise(r=>requestAnimationFrame(r));
    const context=document.querySelector('#nexoContextBar');
    const contextVisible=Boolean(context&&getComputedStyle(context).display!=='none'&&context.getBoundingClientRect().width>0);
    document.querySelector('#contextClose')?.click();
    const contextClosed=!document.body.classList.contains('nrx-context-open');
    if(app)app.className=prev.app;
    if(auth)auth.className=prev.auth;
    if(profile)profile.className=prev.profile;
    return {missing,contextVisible,contextClosed};
  });
  if(legacyCapabilityTest.missing.length)failures.push(name+': ações exclusivas da home antiga ficaram inacessíveis: '+legacyCapabilityTest.missing.join(', '));
  if(!legacyCapabilityTest.contextVisible||!legacyCapabilityTest.contextClosed)failures.push(name+': guia contextual não abre/fecha corretamente na interface minimalista');

  markStage('preserved-guidance');
  const preservedGuidanceTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      collapsed:document.body.classList.contains('sidebar-collapsed')
    };
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    let collapseWorks=true;
    if(innerWidth>760){
      const toggle=document.querySelector('#desktopSidebarToggle');
      const before=document.body.classList.contains('sidebar-collapsed');
      toggle?.click();
      await new Promise(r=>requestAnimationFrame(r));
      collapseWorks=Boolean(toggle)&&document.body.classList.contains('sidebar-collapsed')!==before;
      if(document.body.classList.contains('sidebar-collapsed')!==prev.collapsed)toggle?.click();
    }
    if(typeof openPage==='function')openPage('redacao');
    await new Promise(r=>requestAnimationFrame(r));
    const mentor=document.querySelector('#redacao .page-nexo-mentor');
    const mentorVisible=Boolean(mentor&&getComputedStyle(mentor).display!=='none'&&mentor.getBoundingClientRect().height>0);
    const essayHints=[...document.querySelectorAll('#redacao .essay-flow-bar small')];
    const essayHintsVisible=essayHints.length>0&&essayHints.every(el=>getComputedStyle(el).display!=='none');

    if(typeof openPage==='function')openPage('materiais');
    await new Promise(r=>requestAnimationFrame(r));
    const badge=document.querySelector('#materiais .content-head-badge');
    const badgeVisible=Boolean(badge&&getComputedStyle(badge).display!=='none'&&badge.getBoundingClientRect().height>0);

    if(typeof openPage==='function')openPage(prev.active);
    if(app)app.className=prev.app;
    if(auth)auth.className=prev.auth;
    return {collapseWorks,mentorVisible,essayHintsVisible,badgeVisible};
  });
  if(name!=='mobile'&&!preservedGuidanceTest.collapseWorks)failures.push(name+': recolher/expandir sidebar deixou de funcionar');
  if(!preservedGuidanceTest.mentorVisible||!preservedGuidanceTest.essayHintsVisible)failures.push(name+': conteúdo orientativo da redação ficou oculto');
  if(!preservedGuidanceTest.badgeVisible)failures.push(name+': orientação Radar → Aula → Treino da Biblioteca ficou oculta');

  markStage('navigation-clicks');
  const navigationClickTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const original={app:app?.className||'',auth:auth?.className||'',active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',light:document.body.classList.contains('light')};
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    const wait=()=>new Promise(r=>setTimeout(r,55));
    const checks=[];
    const active=()=>document.querySelector('.page.active')?.id||'';
    const primary=[['inicio','inicio'],['study','materiais'],['questoes','questoes'],['redacao','redacao'],['simulados','simulados'],['semana','semana'],['desempenho','desempenho']];
    for(const [key,pageId] of primary){
      const btn=document.querySelector('[data-nrx-side="'+key+'"]');
      if(!btn){checks.push({kind:'primary',key,ok:false,reason:'missing'});continue}
      btn.click();await wait();checks.push({kind:'primary',key,expected:pageId,actual:active(),ok:active()===pageId});
    }


    const resumosBtn=document.querySelector('[data-nrx-side="resumos"]');
    if(resumosBtn){
      resumosBtn.click();await new Promise(r=>setTimeout(r,100));
      checks.push({kind:'primary-view',key:'resumos',expected:'materiais/resumos',actual:active()+'/'+String(document.body.dataset.nrxMaterialsView||''),ok:active()==='materiais'&&document.body.dataset.nrxMaterialsView==='resumos'});
    }else checks.push({kind:'primary-view',key:'resumos',ok:false,reason:'missing'});

    const journeyPrimary=[['community','community','groups'],['store','store','store'],['avatar','avatar','avatar']];
    for(const [key,view,tab] of journeyPrimary){
      const btn=document.querySelector('[data-nrx-side="'+key+'"]');
      if(!btn){checks.push({kind:'journey-primary',key,ok:false,reason:'missing'});continue}
      btn.click();await new Promise(r=>setTimeout(r,180));
      const activeTab=document.querySelector('[data-journey-tab="'+tab+'"]');
      const activePanel=document.querySelector('[data-journey-panel="'+tab+'"]');
      const viewOk=document.body.dataset.nrxJourneyView===view;
      const tabOk=Boolean(activeTab?.classList.contains('active')||activePanel?.classList.contains('active'));
      checks.push({kind:'journey-primary',key,expected:'ranking/'+tab,actual:active()+'/'+String(document.body.dataset.nrxJourneyView||''),ok:active()==='ranking'&&viewOk&&tabOk});
    }

    const nexoBtn=document.querySelector('[data-nrx-side="nexo"]');
    let nexoOk=false;
    if(nexoBtn){
      nexoBtn.click();await wait();
      const panel=document.querySelector('#niaPanel');
      const opened=Boolean(panel&&!panel.classList.contains('hidden'));
      document.querySelector('#closeNia')?.click();await wait();
      nexoOk=opened&&Boolean(panel?.classList.contains('hidden'));
    }
    checks.push({kind:'special-primary',key:'nexo',ok:nexoOk});

    const settingsBtn=document.querySelector('[data-nrx-side="settings"]');
    let settingsOk=false;
    if(settingsBtn){
      settingsBtn.click();await wait();
      const modal=document.querySelector('#experienceSettingsModal');
      const opened=Boolean(modal&&!modal.classList.contains('hidden'));
      document.querySelector('#closeExperienceSettings')?.click();await wait();
      settingsOk=opened&&Boolean(modal?.classList.contains('hidden'));
    }
    checks.push({kind:'special-primary',key:'settings',ok:settingsOk});

    const secondary=[['focos','focos'],['radar','radar'],['banco','banco'],['temas','temas'],['feedback','feedback'],['ranking','ranking'],['planos','planos']];
    for(const [key,pageId] of secondary){
      const btn=document.querySelector('.nrx-side-more-panel [data-nrx-target="'+key+'"]');
      if(!btn){checks.push({kind:'secondary',key,ok:false,reason:'missing'});continue}
      btn.click();await wait();checks.push({kind:'secondary',key,expected:pageId,actual:active(),ok:active()===pageId});
    }
    const theme=document.querySelector('[data-nrx-utility="theme"]');
    let themeOk=false;
    if(theme){
      const before=document.body.classList.contains('light');
      theme.click();await wait();
      const changed=document.body.classList.contains('light')!==before;
      theme.click();await wait();
      themeOk=changed&&document.body.classList.contains('light')===before;
    }
    checks.push({kind:'utility',key:'theme',ok:themeOk});
    const notification=document.querySelector('#notificationBtn');
    let notificationOk=false;
    if(notification){
      notification.click();await wait();
      const panel=document.querySelector('#notificationPanel');
      const opened=Boolean(panel&&!panel.classList.contains('hidden'));
      panel?.querySelector('[data-nrx-notification-close]')?.click();await wait();
      notificationOk=opened&&Boolean(panel?.classList.contains('hidden'));
    }
    checks.push({kind:'utility',key:'notification',ok:notificationOk});
    if(innerWidth<=760){
      const mobileRoutes=[['study','materiais'],['questoes','questoes'],['redacao','redacao']];
      for(const [key,pageId] of mobileRoutes){
        const btn=document.querySelector('[data-nrx-bottom="'+key+'"]');
        if(!btn){checks.push({kind:'mobile-bottom',key,ok:false,reason:'missing'});continue}
        btn.click();await wait();checks.push({kind:'mobile-bottom',key,expected:pageId,actual:active(),ok:active()===pageId});
      }
      const more=document.querySelector('[data-nrx-bottom="more"]');
      if(more){
        more.click();await wait();
        const sidebar=document.querySelector('#sidebar');
        const opened=Boolean(document.body.classList.contains('mobile-menu-open')&&sidebar?.classList.contains('open'));
        checks.push({kind:'mobile-bottom',key:'more',ok:opened});
        document.querySelector('#closeMenu')?.click();
      }else checks.push({kind:'mobile-bottom',key:'more',ok:false,reason:'missing'});
    }
    document.body.classList.toggle('light',original.light);
    pages.forEach(p=>p.classList.toggle('active',p.id===original.active));
    if(app)app.className=original.app;if(auth)auth.className=original.auth;
    return checks;
  });
  const navigationFailures=navigationClickTest.filter(x=>!x.ok);
  if(navigationFailures.length)failures.push(name+': cliques reais de navegação/recursos falharam: '+JSON.stringify(navigationFailures));

  markStage('admin-permission');
  const adminAccessTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const shortcut=document.querySelector('#profileAdminShortcut');
    let appState=null;
    try{
      if(typeof state==='object'&&state)appState=state;
    }catch(_){}
    if(!appState){
      try{appState=window.eval('state')}catch(_){}
    }
    if(!appState)return {stateAvailable:false,studentHidden:false,adminVisible:false,opened:false,restoredOk:false,count:document.querySelectorAll('[data-nrx-admin-tool]').length};
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      profile:appState.profile?{...appState.profile}:null,
      shortcutClass:shortcut?.className||''
    };
    const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');

    if(!appState.profile)appState.profile={role:'student'};
    appState.profile.role='student';
    shortcut?.classList.add('hidden');
    await wait();
    const studentHidden=[...document.querySelectorAll('[data-nrx-admin-tool]')].every(el=>el.classList.contains('hidden'));

    appState.profile.role='admin';
    shortcut?.classList.remove('hidden');
    await wait();
    const adminButtons=[...document.querySelectorAll('[data-nrx-admin-tool]')];
    const adminVisible=adminButtons.length>0&&adminButtons.some(el=>!el.classList.contains('hidden'));
    const button=adminButtons.find(el=>el.closest('.nrx-side-more-panel'))||adminButtons[0];
    button?.click();
    await new Promise(r=>setTimeout(r,90));
    const opened=document.querySelector('#admin')?.classList.contains('active')===true;

    if(prev.profile)appState.profile=prev.profile;else appState.profile=null;
    if(shortcut)shortcut.className=prev.shortcutClass;
    await wait();
    const restoredShouldShow=prev.profile?.role==='admin';
    const restoredButtons=[...document.querySelectorAll('[data-nrx-admin-tool]')];
    const restoredVisible=restoredButtons.some(el=>!el.classList.contains('hidden'));
    const restoredOk=restoredShouldShow?restoredVisible:restoredButtons.every(el=>el.classList.contains('hidden'));

    pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
    if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    return {stateAvailable:true,studentHidden,adminVisible,opened,restoredOk,restoredShouldShow,count:adminButtons.length};
  });
  if(!adminAccessTest.stateAvailable||!adminAccessTest.studentHidden||!adminAccessTest.adminVisible||!adminAccessTest.opened||!adminAccessTest.restoredOk)
    failures.push(name+': permissão/acesso da Área do Admin regrediu: '+JSON.stringify(adminAccessTest));

  markStage('home-shortcuts');
  const homeShortcutTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={app:app?.className||'',auth:auth?.className||'',active:pages.find(p=>p.classList.contains('active'))?.id||'inicio'};
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const active=()=>document.querySelector('.page.active')?.id||'';
    const mobile=innerWidth<=760;
    const specs=mobile
      ?[
        ['Questões','questoes'],['Redação','redacao'],['Simulados','simulados'],['Resumo','materiais','resumos'],
        ['Planner','semana'],['Meu Desempenho','desempenho'],['Loja','ranking','store'],['Nexo (IA)','nexo']
      ]
      :[
        ['Questões','questoes'],['Redação','redacao'],['Simulados','simulados'],['Resumo','materiais','resumos'],
        ['Planner','semana'],['Loja NEXO','ranking','store']
      ];
    const selector=mobile?'.nrx-mobile .nrx-mob-action':'.nrx-desktop .nrx-shortcut';
    const checks=[];
    const visible=el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0};
    for(const [label,pageId,view] of specs){
      if(typeof openPage==='function')openPage('inicio');
      await wait(45);
      const btn=[...document.querySelectorAll(selector)].find(el=>(el.querySelector('b')?.textContent||'').replace(/\s+/g,' ').trim()===label);
      if(!btn){checks.push({label,ok:false,reason:'missing'});continue}
      const wasVisible=visible(btn);
      btn.click();
      await wait(view==='store'?180:70);
      if(pageId==='nexo'){
        const panel=document.querySelector('#niaPanel');
        const opened=Boolean(panel&&!panel.classList.contains('hidden'));
        document.querySelector('#closeNia')?.click();
        checks.push({label,visible:wasVisible,ok:wasVisible&&opened});
      }else{
        const routeOk=active()===pageId;
        const viewOk=!view||document.body.dataset.nrxMaterialsView===view||document.body.dataset.nrxJourneyView===view;
        checks.push({label,visible:wasVisible,expected:pageId+(view?'/'+view:''),actual:active(),ok:wasVisible&&routeOk&&viewOk});
      }
    }
    pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
    if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    return checks;
  });
  const homeShortcutFailures=homeShortcutTest.filter(x=>!x.ok);
  if(homeShortcutFailures.length)failures.push(name+': atalhos visuais da home falharam: '+JSON.stringify(homeShortcutFailures));


  markStage('core-feature-access');
  const coreFeatureAccessTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const essay=document.querySelector('#essayText');
    const essayTheme=document.querySelector('#essayTheme');
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      essayText:essay?.value||'',
      essayTheme:essayTheme?.value||''
    };
    const visible=el=>Boolean(el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
    const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');

    if(typeof openPage==='function')openPage('questoes');
    await wait();
    const setup=document.querySelector('#sessionSetup');
    const areaButtons=[...document.querySelectorAll('#studyAreaGrid [data-study-area]')].filter(visible);
    const subject=document.querySelector('#sessionSubject');
    const difficulty=document.querySelector('#sessionDifficulty');
    const size=document.querySelector('#sessionSize');
    const visual=document.querySelector('#visualOnly');
    const start=document.querySelector('#startSession');
    const math=areaButtons.find(b=>b.dataset.studyArea==='Matemática');
    math?.click();
    await wait();
    const questionControls={
      setupVisible:visible(setup),
      areas:areaButtons.length,
      fields:[subject,difficulty,size].every(visible),
      visualVisible:visible(visual?.closest('.toggle-row')),
      startVisible:visible(start),
      areaSelection:Boolean(math?.classList.contains('active'))
    };
    if(visual){
      const before=visual.checked;
      visual.click();
      questionControls.visualToggle=visual.checked!==before;
      visual.click();
    }else questionControls.visualToggle=false;

    if(typeof openPage==='function')openPage('redacao');
    if(typeof fillThemes==='function')fillThemes();
    await wait();
    const random=document.querySelector('#randomEssayTheme');
    const analyze=document.querySelector('#analyzeEssay');
    const count=document.querySelector('#wordCount');
    if(essay){
      essay.value='um dois três quatro';
      essay.dispatchEvent(new Event('input',{bubbles:true}));
    }
    const beforeTheme=essayTheme?.value||'';
    random?.click();
    await wait();
    const essayControls={
      textVisible:visible(essay),
      randomVisible:visible(random),
      analyzeVisible:visible(analyze),
      wordCountOk:/4\s+palavras/i.test(count?.textContent||''),
      themePopulated:Boolean(essayTheme&&essayTheme.options.length>1),
      randomSelected:Boolean(essayTheme?.value)&&essayTheme?.value!==beforeTheme
    };

    if(typeof openPage==='function')openPage('simulados');
    await wait();
    const simCards=[...document.querySelectorAll('#simulados .sim-card')].filter(visible);
    const simulationControls={
      visibleCards:simCards.length,
      allWired:simCards.length>=8&&simCards.every(btn=>typeof btn.onclick==='function'),
      modes:[...document.querySelectorAll('#simulados [data-sim-mode]')].map(x=>x.dataset.simMode).sort(),
      areas:[...document.querySelectorAll('#simulados [data-sim-area]')].map(x=>x.dataset.simArea).sort()
    };

    if(typeof openPage==='function')openPage('semana');
    await wait();
    const plannerIds=['studyMode30','studyModeEve','studyModeIntensive'];
    const plannerControls={
      visible:plannerIds.every(id=>visible(document.querySelector('#'+id))),
      grid:Boolean(document.querySelector('#weekFullGrid')),
      longRange:Boolean(document.querySelector('#longRangePlan')),
      days:Boolean(document.querySelector('#daysToEnem'))
    };

    if(essay){
      essay.value=prev.essayText;
      essay.dispatchEvent(new Event('input',{bubbles:true}));
    }
    if(essayTheme&&prev.essayTheme){
      essayTheme.value=prev.essayTheme;
      if(typeof updateEssayPrompt==='function')updateEssayPrompt();
    }
    pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
    if(app)app.className=prev.app;
    if(auth)auth.className=prev.auth;
    return {questionControls,essayControls,simulationControls,plannerControls};
  });
  const q=coreFeatureAccessTest.questionControls,e=coreFeatureAccessTest.essayControls,s=coreFeatureAccessTest.simulationControls,p=coreFeatureAccessTest.plannerControls;
  if(!q.setupVisible||q.areas!==4||!q.fields||!q.visualVisible||!q.startVisible||!q.areaSelection||!q.visualToggle)failures.push(name+': controles de Questões regrediram: '+JSON.stringify(q));
  if(!e.textVisible||!e.randomVisible||!e.analyzeVisible||!e.wordCountOk||!e.themePopulated||!e.randomSelected)failures.push(name+': controles de Redação regrediram: '+JSON.stringify(e));
  if(s.visibleCards<8||!s.allWired||!s.modes.includes('sprint')||!s.modes.includes('mini')||s.areas.length!==4)failures.push(name+': controles de Simulados regrediram: '+JSON.stringify(s));
  if(!p.visible||!p.grid||!p.longRange||!p.days)failures.push(name+': controles do Planner regrediram: '+JSON.stringify(p));


  markStage('utility-modules');
  const utilityModuleTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      focusMinutes:typeof focusModeState==='object'?focusModeState.minutes:25,
      journeyTab:state.journeyTab||'missions'
    };
    const visible=el=>Boolean(el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');

    let focus={opened:false,durationVisible:false,durationChanged:false,closed:false};
    if(typeof runSiteSearchAction==='function')runSiteSearchAction('foco');
    await wait(40);
    const focusModal=document.querySelector('#focusModeModal');
    const duration45=document.querySelector('[data-focus-minutes="45"]');
    focus.opened=visible(focusModal);
    focus.durationVisible=visible(duration45);
    duration45?.click();
    await wait(20);
    focus.durationChanged=Boolean(typeof focusModeState==='object'&&Number(focusModeState.minutes)===45&&duration45?.classList.contains('active'));
    document.querySelector('#closeFocusMode')?.click();
    await wait(20);
    focus.closed=Boolean(focusModal?.classList.contains('hidden'))&&document.body.style.overflow==='';
    if(typeof setFocusMinutes==='function'&&typeof focusModeState==='object'&&!focusModeState.running)setFocusMinutes(prev.focusMinutes);

    if(typeof openPage==='function')openPage('banco');
    await wait(30);
    const bankSearch=document.querySelector('#bankSearch'),bankArea=document.querySelector('#bankArea');
    const bank={
      searchVisible:visible(bankSearch),areaVisible:visible(bankArea),
      list:Boolean(document.querySelector('#bankList')),
      saved:Boolean(document.querySelector('#savedQuestionList'))
    };

    if(typeof openPage==='function')openPage('feedback');
    await wait(30);
    const feedback={
      ratingVisible:visible(document.querySelector('#feedbackRating')),
      textVisible:visible(document.querySelector('#feedbackText')),
      sendVisible:visible(document.querySelector('#sendFeedback')),
      list:Boolean(document.querySelector('#feedbackList'))
    };

    if(typeof openPage==='function')openPage('ranking');
    await wait(30);
    const journeyTargets=['missions','league','avatar','wardrobe','store','achievements'];
    const journeyChecks=[];
    for(const tab of journeyTargets){
      const button=document.querySelector('[data-journey-tab="'+tab+'"]');
      button?.click();
      await wait(20);
      const panel=document.querySelector('[data-journey-panel="'+tab+'"]');
      journeyChecks.push({tab,button:visible(button),panel:Boolean(panel?.classList.contains('active'))});
    }
    if(typeof setJourneyTab==='function')setJourneyTab(prev.journeyTab);

    pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
    if(app)app.className=prev.app;
    if(auth)auth.className=prev.auth;
    return {focus,bank,feedback,journeyChecks};
  });


  markStage('module-interactions');
  const moduleInteractionTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      current:state.current,session:state.session,user:state.user,
      core:state.core,membership:state.membership,
      questionMeta:state.questionMeta
    };
    const originalStart=window.startStudySession;
    const originalShow=window.showCurrentQuestion;
    const originalFrom=client.from;
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const active=()=>document.querySelector('.page.active')?.id||'';
    const calls={sessions:[],singleQuestion:0,feedbackInsert:0};
    const result={simulations:{},planner:{},bank:{},feedback:{}};

    try{
      if(app)app.classList.remove('hidden');
      if(auth)auth.classList.add('hidden');
      state.user={id:'smoke-user',email:'smoke@nexo.local'};
      state.core={recommended_action:{area:'Matemática',subject:'Matemática',topic:'Porcentagem',reason:'Teste local'}};
      state.membership={plan:'plus',is_plus:true,is_ultra:false,usage:{},limits:{}};

      window.startStudySession=async config=>{
        calls.sessions.push({...config});
        state.session={...config,queue:[],questions:[],index:0,size:Number(config.size||0),examMode:Boolean(config.examMode)};
        return state.session;
      };

      if(typeof openPage==='function')openPage('simulados');
      await wait(30);
      const simSpecs=[
        ['mini',10],['mixed',30],['sprint',5],['adaptive',20]
      ];
      const simChecks=[];
      for(const [mode,size] of simSpecs){
        const before=calls.sessions.length;
        const btn=document.querySelector('[data-sim-mode="'+mode+'"]');
        btn?.click();
        await wait(45);
        const cfg=calls.sessions[before];
        simChecks.push({
          mode,button:Boolean(btn),route:active(),
          called:Boolean(cfg),size:Number(cfg?.size||0),
          examMode:Boolean(cfg?.examMode),sessionMode:String(cfg?.mode||'')
        });
        if(typeof openPage==='function')openPage('simulados');
        await wait(15);
      }
      const areaBtn=document.querySelector('[data-sim-area="Matemática"]');
      const beforeArea=calls.sessions.length;
      areaBtn?.click();await wait(45);
      const areaCfg=calls.sessions[beforeArea];
      result.simulations={
        checks:simChecks,
        area:Boolean(areaBtn&&areaCfg&&areaCfg.area==='Matemática'&&Number(areaCfg.size)===20&&areaCfg.mode==='simulado'&&areaCfg.examMode===true)
      };

      if(typeof openPage==='function')openPage('semana');
      await wait(30);
      const plannerChecks=[];
      for(const [id,expectedSize] of [['studyMode30',5],['studyModeIntensive',15]]){
        const before=calls.sessions.length;
        document.querySelector('#'+id)?.click();
        await wait(50);
        const cfg=calls.sessions[before];
        plannerChecks.push({id,called:Boolean(cfg),size:Number(cfg?.size||0),route:active()});
        if(typeof openPage==='function')openPage('semana');
        await wait(15);
      }
      const beforeEve=calls.sessions.length;
      document.querySelector('#studyModeEve')?.click();
      await wait(140);
      const eveCfg=calls.sessions[beforeEve];
      result.planner={
        checks:plannerChecks,
        eve:Boolean(eveCfg&&Number(eveCfg.size)===5&&eveCfg.mode==='simulado'&&eveCfg.examMode===true)
      };

      const fakeQuestion={
        id:-812345,area:'Matemática',subject:'Matemática',topic:'Porcentagem',
        difficulty:2,source_year:2025,source_exam:'ENEM',source_question_number:77,
        source_reference:'',base_text:'',prompt:'Pergunta mock',options:['A','B','C','D','E'],
        media_type:'',media_path:'',source_pdf_url:'',source_page:null,media_crop:null
      };
      state.questionMeta=[
        fakeQuestion,
        {...fakeQuestion,id:-812346,area:'Linguagens',subject:'Português',topic:'Interpretação',source_question_number:78}
      ];
      window.showCurrentQuestion=async()=>{calls.singleQuestion++};
      client.from=(table)=>{
        if(table==='questions'){
          const chain={
            select(){return chain},eq(){return chain},
            async single(){return {data:fakeQuestion,error:null}}
          };
          return chain;
        }
        if(table==='feedback'){
          const chain={
            insert(row){calls.feedbackInsert++;calls.feedbackRow=row;return Promise.resolve({data:null,error:null})},
            select(){return chain},order(){return chain},
            async limit(){return {data:[{rating:5,message:'Feedback smoke salvo',status:'novo',created_at:'2026-09-22T00:00:00Z'}],error:null}}
          };
          return chain;
        }
        return originalFrom.call(client,table);
      };

      if(typeof openPage==='function')openPage('banco');
      if(typeof renderBank==='function')renderBank();
      await wait(30);
      const search=document.querySelector('#bankSearch'),area=document.querySelector('#bankArea');
      if(search){search.value='Porcentagem';search.dispatchEvent(new Event('input',{bubbles:true}))}
      await wait(20);
      const searchRows=[...document.querySelectorAll('#bankList [data-bank]')];
      if(area){area.value='Matemática';area.dispatchEvent(new Event('change',{bubbles:true}))}
      await wait(20);
      const areaRows=[...document.querySelectorAll('#bankList [data-bank]')];
      areaRows[0]?.click();
      await wait(45);
      result.bank={
        searchFiltered:searchRows.length===1&&Number(searchRows[0]?.dataset.bank)===fakeQuestion.id,
        areaFiltered:areaRows.length===1&&Number(areaRows[0]?.dataset.bank)===fakeQuestion.id,
        opened:Boolean(calls.singleQuestion===1&&active()==='questoes'&&Number(state.session?.queue?.[0]?.id)===fakeQuestion.id)
      };

      if(typeof openPage==='function')openPage('feedback');
      await wait(25);
      const rating=document.querySelector('#feedbackRating');
      const message=document.querySelector('#feedbackText');
      if(rating)rating.value='5';
      if(message)message.value='Feedback automatizado seguro';
      document.querySelector('#sendFeedback')?.click();
      await wait(80);
      result.feedback={
        inserted:calls.feedbackInsert===1,
        row:Boolean(calls.feedbackRow?.user_id==='smoke-user'&&calls.feedbackRow?.rating===5&&/automatizado seguro/i.test(calls.feedbackRow?.message||'')),
        cleared:message?.value==='',
        rendered:/Feedback smoke salvo/i.test(document.querySelector('#feedbackList')?.textContent||'')
      };
    }catch(err){
      result.error=String(err?.stack||err?.message||err);
    }finally{
      window.startStudySession=originalStart;
      window.showCurrentQuestion=originalShow;
      client.from=originalFrom;
      state.current=prev.current;state.session=prev.session;state.user=prev.user;
      state.core=prev.core;state.membership=prev.membership;state.questionMeta=prev.questionMeta;
      pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
      if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    }
    return {...result,calls};
  });
  const moduleInteractionFailures=[];
  if(moduleInteractionTest.error)moduleInteractionFailures.push('error='+moduleInteractionTest.error);
  const simBad=(moduleInteractionTest.simulations?.checks||[]).filter(x=>!x.button||!x.called||x.route!=='questoes'||x.size<=0||!x.examMode||x.sessionMode!=='simulado');
  if(simBad.length||!moduleInteractionTest.simulations?.area)moduleInteractionFailures.push('simulados='+JSON.stringify(moduleInteractionTest.simulations));
  const plannerBad=(moduleInteractionTest.planner?.checks||[]).filter(x=>!x.called||x.route!=='questoes'||![5,15].includes(x.size));
  if(plannerBad.length||!moduleInteractionTest.planner?.eve)moduleInteractionFailures.push('planner='+JSON.stringify(moduleInteractionTest.planner));
  if(!moduleInteractionTest.bank?.searchFiltered||!moduleInteractionTest.bank?.areaFiltered||!moduleInteractionTest.bank?.opened)moduleInteractionFailures.push('banco='+JSON.stringify(moduleInteractionTest.bank));
  if(!moduleInteractionTest.feedback?.inserted||!moduleInteractionTest.feedback?.row||!moduleInteractionTest.feedback?.cleared||!moduleInteractionTest.feedback?.rendered)moduleInteractionFailures.push('feedback='+JSON.stringify(moduleInteractionTest.feedback));
  if(moduleInteractionFailures.length)failures.push(name+': interações reais de módulos falharam: '+moduleInteractionFailures.join(' | '));

  markStage('content-workflows');
  const contentWorkflowTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      materials:state.materials,materialSubject:state.materialSubject,materialOpenTopic:state.materialOpenTopic,
      libraryQuickFive:state.libraryQuickFive,radarTopics:state.radarTopics,radarSubjects:state.radarSubjects,
      radarYears:state.radarYears,radarOverview:state.radarOverview,radarLoaded:state.radarLoaded,
      completedEssayThemes:state.completedEssayThemes,
      materialsView:document.body.dataset.nrxMaterialsView||'',
      essayTheme:document.querySelector('#essayTheme')?.value||'',
      essayAxis:document.querySelector('#essayAxis')?.value||''
    };
    const originalRadarStudy=window.startRadarContent;
    const originalRadarTrain=window.startRadarTraining;
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const result={library:{},radar:{},themes:{}};
    const calls={radarStudy:null,radarTrain:null};
    try{
      if(app)app.classList.remove('hidden');
      if(auth)auth.classList.add('hidden');

      state.materials=[
        {id:-93001,area:'Matemática',subject:'Matemática',topic:'Estatística e análise de dados',title:'Aula NEXO #01 · Estatística',description:'Aula completa',format:'HTML'},
        {id:-93002,area:'Matemática',subject:'Matemática',topic:'Estatística e análise de dados',title:'Resumo NEXO #01 · Estatística',description:'Resumo estratégico',format:'HTML'},
        {id:-93003,area:'Matemática',subject:'Matemática',topic:'Estatística e análise de dados',title:'Macetes NEXO #01 · Estatística',description:'Macetes rápidos',format:'HTML'},
        {id:-93004,area:'Linguagens',subject:'Português',topic:'Interpretação de texto',title:'Resumo NEXO #02 · Interpretação',description:'Resumo de leitura',format:'HTML'}
      ];
      state.materialSubject='Matemática';
      state.materialOpenTopic='';
      state.libraryQuickFive=false;
      document.body.dataset.nrxMaterialsView='study';
      pages.forEach(p=>p.classList.toggle('active',p.id==='materiais'));
      if(typeof renderMaterials==='function')renderMaterials();
      await wait(30);
      const cardCount=()=>document.querySelectorAll('#materialGrid .content-resource-card').length;
      result.library.base=cardCount()===3&&document.querySelectorAll('#materialSubjectNav [data-material-subject]').length===2;

      const search=document.querySelector('#materialSearch');
      if(search){search.value='Macetes';search.dispatchEvent(new Event('input',{bubbles:true}))}
      await wait(20);
      result.library.search=cardCount()===1&&/Macetes NEXO/i.test(document.querySelector('#materialGrid')?.textContent||'');

      if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))}
      const type=document.querySelector('#materialTypeFilter');
      if(type){type.value='summary';type.dispatchEvent(new Event('change',{bubbles:true}))}
      await wait(20);
      result.library.type=cardCount()===1&&/Resumo NEXO/i.test(document.querySelector('#materialGrid')?.textContent||'');

      if(type){type.value='';type.dispatchEvent(new Event('change',{bubbles:true}))}
      const quick=document.querySelector('#materialQuickFive');
      quick?.click();await wait(20);
      result.library.quick=Boolean(state.libraryQuickFive&&cardCount()===2&&quick?.classList.contains('active'));

      document.querySelector('#materialClearFilters')?.click();await wait(20);
      result.library.clear=Boolean(!state.libraryQuickFive&&search?.value===''&&type?.value===''&&cardCount()===3&&!quick?.classList.contains('active'));

      const portuguese=[...document.querySelectorAll('#materialSubjectNav [data-material-subject]')].find(b=>b.dataset.materialSubject==='Português');
      portuguese?.click();await wait(20);
      result.library.subject=Boolean(portuguese&&state.materialSubject==='Português'&&cardCount()===1);

      state.radarTopics=[
        {area:'Matemática',subject:'Matemática',topic:'Estatística e análise de dados',questions:90,years_present:17,questions_2021_2025:30,years_2021_2025:5,last_year:2025,nexo_priority_score:92},
        {area:'Matemática',subject:'Matemática',topic:'Geometria e trigonometria',questions:70,years_present:16,questions_2021_2025:24,years_2021_2025:5,last_year:2025,nexo_priority_score:84},
        {area:'Linguagens',subject:'Português',topic:'Interpretação de texto',questions:120,years_present:17,questions_2021_2025:35,years_2021_2025:5,last_year:2025,nexo_priority_score:95}
      ];
      state.radarSubjects=[
        {area:'Matemática',subject:'Matemática',classified_questions:160,years_present:17,questions_2021_2025:54,avg_confidence:0.9},
        {area:'Linguagens',subject:'Português',classified_questions:120,years_present:17,questions_2021_2025:35,avg_confidence:0.9}
      ];
      state.radarYears=[{year:2025,total_items:180,classified_items:175,review_items:5,avg_confidence:0.9,subjects_mapped:8}];
      state.radarOverview={total_items:3060,editions:17,first_year:2009,last_year:2025,classified_items:3000,review_items:60,topics_mapped:3};
      state.radarLoaded=true;
      window.startRadarContent=async row=>{calls.radarStudy=row?.topic||''};
      window.startRadarTraining=async row=>{calls.radarTrain=row?.topic||''};
      if(typeof openPage==='function')openPage('radar');
      if(typeof bindRadarControls==='function')bindRadarControls();
      if(typeof refreshRadarSubjectOptions==='function')refreshRadarSubjectOptions();
      if(typeof renderEnemRadar==='function')renderEnemRadar();
      await wait(30);
      const radarRows=()=>[...document.querySelectorAll('#radarList .radar-topic-row')];
      result.radar.base=radarRows().length===3;

      const area=document.querySelector('#radarArea');
      if(area){area.value='Matemática';area.dispatchEvent(new Event('change',{bubbles:true}))}
      await wait(20);
      result.radar.area=radarRows().length===2&&/2 assuntos/.test(document.querySelector('#radarResultMeta')?.textContent||'');

      const radarSearch=document.querySelector('#radarSearch');
      if(radarSearch){radarSearch.value='geometria';radarSearch.dispatchEvent(new Event('input',{bubbles:true}))}
      await wait(20);
      result.radar.search=radarRows().length===1&&/Geometria e trigonometria/i.test(document.querySelector('#radarList')?.textContent||'');

      if(radarSearch){radarSearch.value='';radarSearch.dispatchEvent(new Event('input',{bubbles:true}))}
      await wait(20);
      const statRow=radarRows().find(row=>/Estatística e análise de dados/i.test(row.textContent||''));
      statRow?.querySelector('[data-radar-study]')?.click();await wait(25);
      statRow?.querySelector('[data-radar-train]')?.click();await wait(25);
      result.radar.actions=Boolean(calls.radarStudy==='Estatística e análise de dados'&&calls.radarTrain==='Estatística e análise de dados');

      state.completedEssayThemes=new Set();
      if(typeof fillThemes==='function')fillThemes();
      if(typeof openPage==='function')openPage('temas');
      await wait(30);
      const themeBtn=[...document.querySelectorAll('#themesGrid [data-theme]')].find(btn=>!btn.disabled);
      const themeId=themeBtn?.dataset.theme||'';
      themeBtn?.click();await wait(35);
      result.themes={
        button:Boolean(themeBtn),
        opened:document.querySelector('#redacao')?.classList.contains('active')===true,
        selected:Boolean(themeId&&document.querySelector('#essayTheme')?.value===themeId),
        prompt:Boolean((document.querySelector('#essayPrompt')?.textContent||'').trim().length>20),
        focused:document.activeElement===document.querySelector('#essayText')
      };
    }catch(err){
      result.error=String(err?.stack||err?.message||err);
    }finally{
      window.startRadarContent=originalRadarStudy;window.startRadarTraining=originalRadarTrain;
      state.materials=prev.materials;state.materialSubject=prev.materialSubject;state.materialOpenTopic=prev.materialOpenTopic;
      state.libraryQuickFive=prev.libraryQuickFive;state.radarTopics=prev.radarTopics;state.radarSubjects=prev.radarSubjects;
      state.radarYears=prev.radarYears;state.radarOverview=prev.radarOverview;state.radarLoaded=prev.radarLoaded;
      state.completedEssayThemes=prev.completedEssayThemes;
      if(prev.materialsView)document.body.dataset.nrxMaterialsView=prev.materialsView;else delete document.body.dataset.nrxMaterialsView;
      if(document.querySelector('#essayAxis'))document.querySelector('#essayAxis').value=prev.essayAxis;
      if(typeof fillThemes==='function')fillThemes();
      if(document.querySelector('#essayTheme')&&[...document.querySelector('#essayTheme').options].some(o=>o.value===prev.essayTheme))document.querySelector('#essayTheme').value=prev.essayTheme;
      if(typeof updateEssayPrompt==='function')updateEssayPrompt();
      pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
      if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    }
    return {...result,calls};
  });
  const contentWorkflowFailures=[];
  if(contentWorkflowTest.error)contentWorkflowFailures.push('error='+contentWorkflowTest.error);
  for(const [key,value] of Object.entries(contentWorkflowTest.library||{}))if(!value)contentWorkflowFailures.push('biblioteca.'+key);
  for(const [key,value] of Object.entries(contentWorkflowTest.radar||{}))if(!value)contentWorkflowFailures.push('radar.'+key);
  for(const [key,value] of Object.entries(contentWorkflowTest.themes||{}))if(!value)contentWorkflowFailures.push('temas.'+key);
  if(contentWorkflowFailures.length)failures.push(name+': fluxos Biblioteca/Radar/Temas regrediram: '+contentWorkflowFailures.join(', ')+' '+JSON.stringify(contentWorkflowTest));

  markStage('journey-persistence');
  const journeyPersistenceTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      user:state.user,profile:state.profile,membership:state.membership,
      journey:state.journey,journeyTab:state.journeyTab,journeyLoading:state.journeyLoading,
      avatarDraft:state.avatarDraft,weekPlan:state.weekPlan,
      savedQuestions:state.savedQuestions,questionMeta:state.questionMeta,
      current:state.current,studyGroups:state.studyGroups,selectedStudyGroup:state.selectedStudyGroup
    };
    const originalRpc=client.rpc,originalFrom=client.from,originalStart=window.startStudySession;
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const calls={weekComplete:0,weekLaunch:[],savedInsert:0,savedDelete:0,claim:0,buy:0,avatarSave:0,createGroup:0,joinGroup:0,goalInsert:0};
    const result={week:{},saved:{},journey:{},groups:{}};

    let mockGroups=[];
    const journey={
      profile:{
        level:5,title:'Explorador NEXO',coins:500,streak_days:3,league:'Bronze',
        rank_position:8,arena_points:120,arena_rank:5,xp_in_level:40,xp_to_next:180,
        avatar:{base:'neutral',skin:'tone3',hair:'short',hair_color:'ink',outfit:'purple',accessory:'none',frame:'basic',background:'grid',aura:'none'}
      },
      missions:[{
        id:9101,period:'daily',title:'Missão Smoke',description:'Concluir um teste seguro',
        progress:1,target:1,status:'completed',reward_xp:30,reward_coins:5
      }],
      inventory:[],
      catalog:[{
        item_code:'smoke_cap',name:'Boné Smoke',description:'Item de teste local',
        category:'accessory',rarity:'comum',price:100,grant_mode:'store',unlock_level:1,
        plus_only:false,collection_code:'core',compatible_bases:['neutral'],
        visual:{field:'accessory',value:'cap'}
      }],
      achievements:[],leaderboard:[],arena_leaderboard:[]
    };

    const savedChain=()=>{
      const chain={
        delete(){chain.mode='delete';return chain},
        eq(){return chain},
        then(resolve,reject){
          if(chain.mode==='delete')calls.savedDelete++;
          return Promise.resolve({data:null,error:null}).then(resolve,reject);
        },
        async insert(){calls.savedInsert++;return {data:null,error:null}}
      };
      return chain;
    };

    try{
      if(app)app.classList.remove('hidden');
      if(auth)auth.classList.add('hidden');
      state.user={id:'smoke-user',email:'smoke@nexo.local',user_metadata:{full_name:'Aluno Smoke'}};
      state.profile={full_name:'Aluno Smoke',daily_minutes:45};
      state.membership={plan:'plus',is_plus:true,is_ultra:false,usage:{},limits:{}};
      state.journey=journey;state.journeyTab='missions';state.journeyLoading=false;
      state.avatarDraft=normalizedAvatar(journey.profile.avatar);

      client.rpc=async(name,args={})=>{
        if(name==='complete_nexo_week_task'){
          calls.weekComplete++;
          const task=state.weekPlan?.tasks?.find(x=>Number(x.id)===Number(args.p_task_id));
          if(task)task.status='completed';
          if(state.weekPlan)state.weekPlan.completed=1;
          return {data:{awarded:true},error:null};
        }
        if(name==='get_or_create_nexo_week_plan')return {data:state.weekPlan,error:null};
        if(name==='claim_nexo_mission'){
          calls.claim++;
          const m=journey.missions.find(x=>Number(x.id)===Number(args.p_mission_id));
          if(m)m.status='claimed';
          journey.profile.coins+=5;
          return {data:journey,error:null};
        }
        if(name==='buy_nexo_item'){
          calls.buy++;
          if(!journey.inventory.some(x=>x.item_code===args.p_item_code))journey.inventory.push({item_code:args.p_item_code});
          journey.profile.coins-=100;
          return {data:{ok:true},error:null};
        }
        if(name==='save_nexo_avatar'){
          calls.avatarSave++;
          return {data:normalizedAvatar(args.p_avatar||{}),error:null};
        }
        if(name==='get_nexo_journey')return {data:journey,error:null};
        if(name==='get_nexo_membership')return {data:state.membership,error:null};
        if(name==='get_nexo_social_ranking')return {data:{weekly:[],arena:[]},error:null};
        if(name==='get_nexo_store_catalog')return {data:journey.catalog,error:null};
        if(name==='create_study_group'){
          calls.createGroup++;
          mockGroups=[{
            id:7701,name:String(args.p_name||'Grupo Smoke'),description:args.p_description||'',
            join_code:'SMOKE7',member_count:1,is_owner:true,
            members:[{name:'Aluno Smoke',role:'owner'}],goals:[]
          }];
          return {data:{id:7701,join_code:'SMOKE7'},error:null};
        }
        if(name==='join_study_group'){
          calls.joinGroup++;
          return {data:{id:7701,name:'Grupo Smoke'},error:null};
        }
        if(name==='get_my_study_groups')return {data:mockGroups,error:null};
        return originalRpc.call(client,name,args);
      };

      client.from=(table)=>{
        if(table==='saved_questions')return savedChain();
        if(table==='study_group_goals'){
          return {
            async insert(row){
              calls.goalInsert++;
              const g=mockGroups.find(x=>String(x.id)===String(row.group_id));
              if(g)g.goals.push({id:8801,title:row.title,target_value:row.target_value,current_value:0,unit:row.unit,due_date:row.due_date});
              return {data:null,error:null};
            }
          };
        }
        return originalFrom.call(client,table);
      };

      window.startStudySession=async config=>{
        calls.weekLaunch.push({...config});
        state.session={...config,index:0,questions:[]};
        return state.session;
      };

      state.weekPlan={
        daily_minutes:45,total:1,completed:0,
        tasks:[{
          id:7001,day_index:0,title:'Treinar porcentagem',task_type:'questions',
          topic:'Porcentagem',subject:'Matemática',area:'Matemática',
          target_minutes:20,target_count:5,status:'planned'
        }]
      };
      pages.forEach(p=>p.classList.toggle('active',p.id==='semana'));
      renderNexoWeekPlan();
      const complete=document.querySelector('[data-week-complete="7001"]');
      complete?.click();await wait(90);
      const completeAfter=document.querySelector('[data-week-complete="7001"]');
      result.week.complete=Boolean(calls.weekComplete===1&&state.weekPlan.tasks[0].status==='completed'&&completeAfter?.disabled);

      document.querySelector('[data-week-launch="7001"]')?.click();await wait(45);
      const launch=calls.weekLaunch[0];
      result.week.launch=Boolean(launch&&launch.mode==='adaptive'&&launch.topic==='Porcentagem'&&Number(launch.size)===5&&document.querySelector('#questoes')?.classList.contains('active'));

      const fakeQuestion={id:-812399,area:'Matemática',subject:'Matemática',topic:'Porcentagem',source_year:2025,source_question_number:88};
      state.questionMeta=[fakeQuestion];state.savedQuestions=new Set();state.current=fakeQuestion;
      renderSavedQuestions();
      await toggleSavedQuestion(fakeQuestion.id);await wait(15);
      const savedNow=state.savedQuestions.has(fakeQuestion.id);
      const countNow=document.querySelector('#savedQuestionsCount')?.textContent||'';
      await toggleSavedQuestion(fakeQuestion.id);await wait(15);
      result.saved={
        add:Boolean(savedNow&&calls.savedInsert===1&&/1 salva/.test(countNow)),
        remove:Boolean(!state.savedQuestions.has(fakeQuestion.id)&&calls.savedDelete===1&&/0 salvas/.test(document.querySelector('#savedQuestionsCount')?.textContent||''))
      };

      pages.forEach(p=>p.classList.toggle('active',p.id==='ranking'));
      renderJourneyMissions();
      const claim=document.querySelector('[data-claim-mission="9101"]');
      claim?.click();await wait(90);
      result.journey.claim=Boolean(calls.claim===1&&journey.missions[0].status==='claimed'&&!document.querySelector('[data-claim-mission="9101"]'));

      setJourneyTab('store');renderJourneyStore();await wait(20);
      const buy=document.querySelector('[data-buy-item="smoke_cap"]');
      buy?.click();await wait(120);
      result.journey.buy=Boolean(calls.buy===1&&journey.inventory.some(x=>x.item_code==='smoke_cap')&&/Adquirido/i.test(document.querySelector('#journeyStore')?.textContent||''));

      state.avatarDraft=normalizedAvatar({...journey.profile.avatar,accessory:'cap'});
      renderAvatarBuilder();
      const saveAvatar=document.querySelector('#saveJourneyAvatar');
      saveAvatar?.click();await wait(85);
      result.journey.avatar=Boolean(calls.avatarSave===1&&journey.profile.avatar?.accessory==='cap'&&!saveAvatar?.disabled&&/Salvar personagem/i.test(saveAvatar?.textContent||''));

      setJourneyTab('groups');
      state.studyGroups=[];state.selectedStudyGroup=null;renderStudyGroups();
      const groupName=document.querySelector('#studyGroupName'),groupDescription=document.querySelector('#studyGroupDescription');
      if(groupName)groupName.value='Grupo Smoke';
      if(groupDescription)groupDescription.value='Grupo local de validação';
      document.querySelector('#createStudyGroup')?.click();await wait(100);
      result.groups.create=Boolean(calls.createGroup===1&&state.studyGroups.length===1&&state.selectedStudyGroup?.id===7701&&groupName?.value==='');

      const goalTitle=document.querySelector('#studyGroupGoalTitle');
      if(goalTitle)goalTitle.value='Resolver Matemática';
      const goalTarget=document.querySelector('#studyGroupGoalTarget');
      if(goalTarget)goalTarget.value='40';
      document.querySelector('#createStudyGroupGoal')?.click();await wait(80);
      result.groups.goal=Boolean(calls.goalInsert===1&&state.studyGroups[0]?.goals?.some(g=>g.title==='Resolver Matemática'));

      const joinInput=document.querySelector('#studyGroupCode');
      if(joinInput)joinInput.value='SMOKE7';
      document.querySelector('#joinStudyGroup')?.click();await wait(85);
      result.groups.join=Boolean(calls.joinGroup===1&&joinInput?.value==='');
    }catch(err){
      result.error=String(err?.stack||err?.message||err);
    }finally{
      client.rpc=originalRpc;client.from=originalFrom;window.startStudySession=originalStart;
      state.user=prev.user;state.profile=prev.profile;state.membership=prev.membership;
      state.journey=prev.journey;state.journeyTab=prev.journeyTab;state.journeyLoading=prev.journeyLoading;
      state.avatarDraft=prev.avatarDraft;state.weekPlan=prev.weekPlan;
      state.savedQuestions=prev.savedQuestions;state.questionMeta=prev.questionMeta;
      state.current=prev.current;state.studyGroups=prev.studyGroups;state.selectedStudyGroup=prev.selectedStudyGroup;
      pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
      if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    }
    return {...result,calls};
  });
  const journeyPersistenceFailures=[];
  if(journeyPersistenceTest.error)journeyPersistenceFailures.push('error='+journeyPersistenceTest.error);
  for(const [group,values] of Object.entries(journeyPersistenceTest)){
    if(['error','calls'].includes(group))continue;
    for(const [key,value] of Object.entries(values||{}))if(!value)journeyPersistenceFailures.push(group+'.'+key);
  }
  if(journeyPersistenceFailures.length)failures.push(name+': persistência/Jornada regrediu: '+journeyPersistenceFailures.join(', ')+' '+JSON.stringify(journeyPersistenceTest));
  const utilFocus=utilityModuleTest.focus,utilBank=utilityModuleTest.bank,utilFeedback=utilityModuleTest.feedback;
  if(!utilFocus.opened||!utilFocus.durationVisible||!utilFocus.durationChanged||!utilFocus.closed)failures.push(name+': Modo Foco regrediu: '+JSON.stringify(utilFocus));
  if(!utilBank.searchVisible||!utilBank.areaVisible||!utilBank.list||!utilBank.saved)failures.push(name+': Banco de Questões regrediu: '+JSON.stringify(utilBank));
  if(!utilFeedback.ratingVisible||!utilFeedback.textVisible||!utilFeedback.sendVisible||!utilFeedback.list)failures.push(name+': Feedback regrediu: '+JSON.stringify(utilFeedback));
  const badJourney=utilityModuleTest.journeyChecks.filter(x=>!x.button||!x.panel);
  if(badJourney.length)failures.push(name+': abas da Jornada regrediram: '+JSON.stringify(badJourney));


  markStage('essay-render-viewer');
  const essayRenderAndViewerTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      membership:state.membership,user:state.user,
      materials:[...(state.materials||[])],materialSubject:state.materialSubject,
      text:document.querySelector('#essayText')?.value||'',
      result:document.querySelector('#essayResult')?.innerHTML||''
    };
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const visible=el=>Boolean(el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
    let essay={},viewer={};
    try{
      if(app)app.classList.remove('hidden');
      if(auth)auth.classList.add('hidden');

      if(typeof openPage==='function')openPage('redacao');
      if(typeof fillThemes==='function')fillThemes();
      await wait(30);
      state.membership={plan:'plus',is_plus:true,usage:{},limits:{}};
      const area=document.querySelector('#essayText');
      const analyze=document.querySelector('#analyzeEssay');
      if(area){area.value='texto curto';area.dispatchEvent(new Event('input',{bubbles:true}))}
      analyze?.click();
      await wait(30);
      const shortValidation=/pelo menos 80 palavras/i.test(document.querySelector('#toast')?.textContent||'');

      const paragraph='A educação pública é essencial para a cidadania e para a redução das desigualdades sociais. Entretanto, diferenças de acesso e infraestrutura dificultam a garantia desse direito. Nesse sentido, políticas permanentes devem articular escola, comunidade e poder público. Além disso, a inclusão depende de ações contínuas, acompanhamento e investimento. Portanto, o Estado deve implementar programas de formação docente por meio de financiamento adequado, a fim de reduzir barreiras e garantir aprendizagem, especialmente para estudantes em situação de vulnerabilidade. ';
      const sample=(paragraph+paragraph+paragraph).trim();
      const theme=typeof getEssayThemeData==='function'?getEssayThemeData():{};
      const scores=typeof essayScores==='function'?essayScores(sample,theme):[];
      const total=scores.reduce((a,b)=>a+b,0);
      if(typeof showEssayResult==='function')showEssayResult(sample,scores,total);
      await wait(20);
      const result=document.querySelector('#essayResult');
      essay={
        shortValidation,
        fiveScores:scores.length===5&&scores.every(n=>Number.isFinite(n)&&n>=0&&n<=200),
        fiveCards:result?.querySelectorAll('.essay-comp-card').length===5,
        resultVisible:visible(result?.querySelector('.essay-correction-shell')),
        score:total
      };
      essay.ok=essay.shortValidation&&essay.fiveScores&&essay.fiveCards&&essay.resultVisible&&total>=200&&total<=1000;

      state.user=null;
      const fake={id:-733001,title:'Resumo NEXO - visualizador',format:'image',file_url:'./assets/nexo-family/bust-confiante.avif',area:'Matemática',subject:'Matemática',topic:'Porcentagem',plus_only:false,is_published:true};
      state.materials=[fake];state.materialSubject='Matemática';
      if(typeof openPage==='function')openPage('materiais');
      await wait(20);
      await openContentViewer('material',fake.id);
      await wait(40);
      const modal=document.querySelector('#contentViewer'),body=document.querySelector('#contentViewerBody');
      const opened=visible(modal)&&document.querySelector('#contentViewerTitle')?.textContent.includes('visualizador')&&Boolean(body?.querySelector('img'))&&visible(document.querySelector('#viewerPractice'))&&visible(document.querySelector('#viewerComplete'));
      document.querySelector('#closeContentViewer')?.click();
      await wait(20);
      viewer={opened,closed:Boolean(modal?.classList.contains('hidden')),cleared:body?.innerHTML==='',stateCleared:state.activeViewer===null};
      viewer.ok=viewer.opened&&viewer.closed&&viewer.cleared&&viewer.stateCleared;
    }catch(err){
      essay.error=String(err?.message||err);
      viewer.error=String(err?.message||err);
    }finally{
      state.membership=prev.membership;state.user=prev.user;state.materials=prev.materials;state.materialSubject=prev.materialSubject;
      const area=document.querySelector('#essayText');if(area){area.value=prev.text;area.dispatchEvent(new Event('input',{bubbles:true}))}
      const result=document.querySelector('#essayResult');if(result)result.innerHTML=prev.result;
      document.querySelector('#contentViewer')?.classList.add('hidden');
      const body=document.querySelector('#contentViewerBody');if(body)body.innerHTML='';
      state.activeViewer=null;document.body.style.overflow='';
      pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
      if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    }
    return {essay,viewer};
  });
  if(!essayRenderAndViewerTest.essay.ok)failures.push(name+': renderização/validação de Redação falhou: '+JSON.stringify(essayRenderAndViewerTest.essay));
  if(!essayRenderAndViewerTest.viewer.ok)failures.push(name+': visualizador da Biblioteca falhou: '+JSON.stringify(essayRenderAndViewerTest.viewer));



  markStage('viewer-actions');
  const viewerActionTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const visible=el=>Boolean(el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      user:state.user,materials:[...(state.materials||[])],materialSubject:state.materialSubject,
      favorites:new Set(state.favorites||[]),contentProgress:new Map(state.contentProgress||[]),
      activeViewer:state.activeViewer
    };
    const originalFrom=client.from,originalRpc=client.rpc;
    const originalStartStudySession=window.startStudySession;
    const originalNiaAnswer=window.niaAnswer;
    const originalLoadJourney=window.loadNexoJourney;
    const calls={sessions:[]};
    const result={};
    const fake={
      id:-880021,title:'Aula NEXO #999 · Visualizador Smoke',format:'image',
      file_url:'./assets/nexo-family/bust-confiante.avif',
      area:'Matemática',subject:'Matemática',topic:'Porcentagem',plus_only:false,is_published:true
    };
    try{
      if(app)app.classList.remove('hidden');
      if(auth)auth.classList.add('hidden');
      state.user={id:'smoke-user',email:'smoke@nexo.local'};
      state.materials=[fake];
      state.materialSubject='Matemática';
      state.favorites=new Set();
      state.contentProgress=new Map();

      client.from=(table)=>{
        if(table==='content_progress'||table==='content_favorites'){
          const chain={
            select(){return chain},eq(){return chain},order(){return chain},limit(){return chain},in(){return chain},
            async maybeSingle(){return {data:null,error:null}},
            async upsert(){return {data:null,error:null}},
            async insert(){return {data:null,error:null}},
            delete(){return chain},
            then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}
          };
          return chain;
        }
        return originalFrom.call(client,table);
      };
      client.rpc=async(name,...args)=>{
        if(name==='refresh_my_learning_achievements')return {data:null,error:null};
        return originalRpc.call(client,name,...args);
      };
      window.loadNexoJourney=async()=>null;
      window.startStudySession=async config=>{calls.sessions.push(config);return null};
      window.niaAnswer=async()=>({key:'smoke',category:'smoke',mood:'feliz',text:'Resposta de teste local.'});

      pages.forEach(p=>p.classList.toggle('active',p.id==='materiais'));
      await wait(20);
      state.materials=[fake];
      state.contentProgress=new Map();
      state.favorites=new Set();
      await openContentViewer('material',fake.id);
      await wait(30);
      const modal=document.querySelector('#contentViewer');
      result.opened=visible(modal);
      result.checkpointVisible=visible(document.querySelector('#viewerCheckpoint'));
      result.favoriteVisible=visible(document.querySelector('#viewerFavorite'));
      result.completeVisible=visible(document.querySelector('#viewerComplete'));
      result.practiceVisible=visible(document.querySelector('#viewerPractice'));
      result.askVisible=visible(document.querySelector('#viewerAskNexo'));

      document.querySelector('#viewerFavorite')?.click();
      await wait(25);
      result.favorite=state.favorites.has('material:'+fake.id)&&document.querySelector('#viewerFavorite')?.classList.contains('active');

      document.querySelector('#viewerComplete')?.click();
      await wait(35);
      const progress=state.contentProgress.get('material:'+fake.id);
      result.complete=Boolean(progress?.completed&&Number(progress?.progress_percent)===100&&/Concluído/i.test(document.querySelector('#viewerComplete')?.textContent||''));

      await openContentViewer('material',fake.id);
      await wait(20);
      document.querySelector('#viewerCheckpoint')?.click();
      await wait(35);
      result.checkpoint=Boolean(calls.sessions.some(x=>Number(x.size)===2&&x.mode==='content'));

      state.materials=[fake];
      state.contentProgress.set('material:'+fake.id,{user_id:'smoke-user',content_type:'material',content_id:fake.id,progress_seconds:0,progress_percent:10,completed:false,last_opened_at:new Date().toISOString(),updated_at:new Date().toISOString()});
      await openContentViewer('material',fake.id);
      await wait(20);
      document.querySelector('#viewerPractice')?.click();
      await wait(25);
      const guided=document.querySelector('#guidedTrainingModal');
      result.practiceViewerReopened=Boolean(state.activeViewer?.item?.id===fake.id);
      result.guidedOpened=visible(guided)&&Boolean(state.pendingGuidedTraining);
      document.querySelector('#guidedTestNow')?.click();
      await wait(40);
      result.practice=Boolean(calls.sessions.some(x=>Number(x.size)===5&&x.mode==='content'));

      state.materials=[fake];
      await openContentViewer('material',fake.id);
      await wait(20);
      result.askViewerReopened=Boolean(state.activeViewer?.item?.id===fake.id);
      const beforeMessages=document.querySelectorAll('#niaMessages .nia-msg.user').length;
      document.querySelector('#viewerAskNexo')?.click();
      await wait(30);
      const userMessages=[...document.querySelectorAll('#niaMessages .nia-msg.user')];
      const latest=userMessages.at(-1)?.textContent||'';
      result.ask=Boolean(
        userMessages.length===beforeMessages+1 &&
        /Estou estudando Porcentagem/i.test(latest) &&
        /exemplo no estilo ENEM/i.test(latest) &&
        !document.querySelector('#niaPanel')?.classList.contains('hidden')
      );

      document.querySelector('#closeNia')?.click();
      if(typeof closeContentViewer==='function')closeContentViewer();
      result.closed=Boolean(modal?.classList.contains('hidden'))&&state.activeViewer===null;
    }catch(err){
      result.error=String(err?.stack||err?.message||err);
    }finally{
      client.from=originalFrom;client.rpc=originalRpc;
      window.startStudySession=originalStartStudySession;
      window.niaAnswer=originalNiaAnswer;
      window.loadNexoJourney=originalLoadJourney;
      state.user=prev.user;state.materials=prev.materials;state.materialSubject=prev.materialSubject;
      state.favorites=prev.favorites;state.contentProgress=prev.contentProgress;state.activeViewer=prev.activeViewer;
      document.querySelector('#contentViewer')?.classList.add('hidden');
      document.querySelector('#niaPanel')?.classList.add('hidden');
      document.body.style.overflow='';
      pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
      if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    }
    return {...result,calls};
  });
  const viewerActionFailures=[];
  for(const key of ['opened','checkpointVisible','favoriteVisible','completeVisible','practiceVisible','askVisible','favorite','complete','checkpoint','practiceViewerReopened','guidedOpened','practice','askViewerReopened','ask','closed']){
    if(!viewerActionTest[key])viewerActionFailures.push(key);
  }
  if(viewerActionTest.error)viewerActionFailures.push('error='+viewerActionTest.error);
  if(viewerActionFailures.length)failures.push(name+': ações do visualizador regrediram: '+viewerActionFailures.join(', ')+' '+JSON.stringify(viewerActionTest));


  markStage('viewer-note');
  const viewerNoteTest=await page.evaluate(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const viewer=document.querySelector('#contentViewer');
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      user:state.user,activeViewer:state.activeViewer,
      viewerClass:viewer?.className||'',bodyOverflow:document.body.style.overflow
    };
    const originalFrom=client.from;
    let storedNote=null,deleted=false,upserts=0;
    const result={};
    const fake={id:-990031,title:'Aula NEXO · Nota Smoke',subject:'Matemática',topic:'Porcentagem'};
    try{
      if(app)app.classList.remove('hidden');
      if(auth)auth.classList.add('hidden');
      state.user={id:'smoke-user',email:'smoke@nexo.local'};
      state.activeViewer={type:'material',item:fake,lastPersistAt:0};
      viewer?.classList.remove('hidden');
      document.body.style.overflow='hidden';

      client.from=(table)=>{
        if(table!=='nexo_content_notes')return originalFrom.call(client,table);
        let deleting=false;
        const chain={
          select(){return chain},
          eq(){
            if(deleting){
              storedNote=null;deleted=true;
              return Promise.resolve({data:null,error:null});
            }
            return chain;
          },
          async maybeSingle(){
            return {data:storedNote?{id:73,note:storedNote}:null,error:null};
          },
          async upsert(payload){
            storedNote=String(payload?.note||'');upserts++;
            return {data:null,error:null};
          },
          delete(){deleting=true;return chain}
        };
        return chain;
      };

      const noteBtn=document.querySelector('#viewerNote');
      result.buttonVisible=Boolean(noteBtn&&getComputedStyle(noteBtn).display!=='none'&&noteBtn.getBoundingClientRect().width>0);
      noteBtn?.click();
      await wait(30);
      const modal=document.querySelector('#v13Modal');
      result.opened=Boolean(modal&&!modal.classList.contains('hidden')&&/Anotação do conteúdo/i.test(document.querySelector('#v13MT')?.textContent||''));
      const textarea=document.querySelector('#v13ContentNoteText');
      if(textarea)textarea.value='Regra de três: organizar grandezas antes de multiplicar.';
      document.querySelector('#v13ContentNoteForm')?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      await wait(35);
      result.saved=upserts===1&&/Regra de três/i.test(storedNote||'')&&modal?.classList.contains('hidden');

      noteBtn?.click();
      await wait(30);
      const reopenedText=document.querySelector('#v13ContentNoteText')?.value||'';
      const deleteBtn=document.querySelector('#v13DeleteContentNote');
      result.reopened=Boolean(!modal?.classList.contains('hidden')&&/Regra de três/i.test(reopenedText)&&deleteBtn);

      deleteBtn?.click();
      await wait(35);
      result.deleted=Boolean(deleted&&storedNote===null&&modal?.classList.contains('hidden'));
    }catch(err){
      result.error=String(err?.stack||err?.message||err);
    }finally{
      client.from=originalFrom;
      state.user=prev.user;state.activeViewer=prev.activeViewer;
      if(viewer)viewer.className=prev.viewerClass;
      document.body.style.overflow=prev.bodyOverflow;
      document.querySelector('#v13Modal')?.classList.add('hidden');
      document.body.classList.remove('v13-modal-open');
      if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    }
    return result;
  });
  const viewerNoteFailures=[];
  for(const key of ['buttonVisible','opened','saved','reopened','deleted'])if(!viewerNoteTest[key])viewerNoteFailures.push(key);
  if(viewerNoteTest.error)viewerNoteFailures.push('error='+viewerNoteTest.error);
  if(viewerNoteFailures.length)failures.push(name+': anotações do visualizador regrediram: '+viewerNoteFailures.join(', ')+' '+JSON.stringify(viewerNoteTest));

  markStage('advanced-controls');
  const advancedControlTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const visible=el=>Boolean(el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      user:state.user,profile:state.profile,onboarding:state.onboarding,current:state.current,
      light:document.body.classList.contains('light'),
      bodyOverflow:document.body.style.overflow,
      focus:{
        minutes:focusModeState.minutes,remaining:focusModeState.remaining,running:focusModeState.running,
        paused:focusModeState.paused,completed:focusModeState.completed,endAt:focusModeState.endAt
      }
    };
    const originalRpc=client.rpc,originalFrom=client.from;
    const result={focus:{},profileTheme:{},onboarding:{},questionModals:{}};
    try{
      if(app)app.classList.remove('hidden');
      if(auth)auth.classList.add('hidden');
      if(typeof openPage==='function')openPage('inicio');
      await wait(30);

      if(typeof resetFocusMode==='function')resetFocusMode();
      if(typeof setFocusMinutes==='function')setFocusMinutes(25);
      if(typeof openFocusMode==='function')openFocusMode();
      await wait(20);
      const focusModal=document.querySelector('#focusModeModal');
      result.focus.opened=visible(focusModal);
      document.querySelector('#focusStart')?.click();
      await wait(25);
      result.focus.started=Boolean(focusModeState.running&&!focusModeState.paused&&document.querySelector('#focusStart')?.dataset.focusAction==='pause');
      result.focus.pill=visible(document.querySelector('#focusRunningPill'));
      document.querySelector('#focusStart')?.click();
      await wait(25);
      result.focus.paused=Boolean(focusModeState.running&&focusModeState.paused&&document.querySelector('#focusStart')?.dataset.focusAction==='resume');
      document.querySelector('#focusStart')?.click();
      await wait(25);
      result.focus.resumed=Boolean(focusModeState.running&&!focusModeState.paused);
      document.querySelector('#focusReset')?.click();
      await wait(25);
      result.focus.reset=Boolean(!focusModeState.running&&!focusModeState.paused&&focusModeState.remaining===focusModeState.minutes*60);
      document.querySelector('#closeFocusMode')?.click();
      result.focus.closed=Boolean(focusModal?.classList.contains('hidden'))&&document.body.style.overflow==='';

      const profile=document.querySelector('#profileMenu');
      document.querySelector('#profileButton')?.click();
      result.profileTheme.profileOpened=Boolean(profile&&!profile.classList.contains('hidden'));
      document.querySelector('#profileButton')?.click();
      result.profileTheme.profileClosed=Boolean(profile?.classList.contains('hidden'));
      const wasLight=document.body.classList.contains('light');
      document.querySelector('#themeToggle')?.click();
      result.profileTheme.themeChanged=document.body.classList.contains('light')!==wasLight;
      document.querySelector('#themeToggle')?.click();
      result.profileTheme.themeRestored=document.body.classList.contains('light')===wasLight;

      state.user=state.user||{id:'smoke-user',email:'smoke@nexo.local',user_metadata:{full_name:'Aluno Smoke'}};
      state.profile={...(state.profile||{}),goal_score:750,difficult_areas:['Matemática'],daily_minutes:60};
      document.querySelector('#editStudyPlan')?.click();
      await wait(30);
      const onboarding=document.querySelector('#nexoOnboarding');
      const step1=Number(state.onboarding?.step||0);
      result.onboarding.opened=Boolean(onboarding&&!onboarding.classList.contains('hidden')&&step1===1);
      document.querySelector('#onboardingNext')?.click();
      await wait(30);
      const step2=Number(state.onboarding?.step||0);
      result.onboarding.next=step2!==step1&&step2>0;
      document.querySelector('#onboardingBack')?.click();
      await wait(30);
      result.onboarding.back=Number(state.onboarding?.step||0)===step1;
      if(typeof closeNexoOnboarding==='function')closeNexoOnboarding();
      result.onboarding.closed=Boolean(onboarding?.classList.contains('hidden'))&&!document.body.classList.contains('onboarding-open');

      state.current={id:-777001,area:'Matemática',subject:'Matemática',topic:'Porcentagem',source_year:2025};
      client.rpc=async(name,...args)=>{
        if(name==='get_question_comments_v3')return {data:[],error:null};
        return originalRpc.call(client,name,...args);
      };
      client.from=(table)=>{
        if(table==='question_notes'){
          const chain={
            select(){return chain},eq(){return chain},
            async maybeSingle(){return {data:{note:'Lembrar de converter porcentagem antes da conta.'},error:null}},
            async upsert(){return {data:null,error:null}},
            delete(){return chain}
          };
          return chain;
        }
        return originalFrom.call(client,table);
      };

      if(typeof openQuestionNote==='function')await openQuestionNote(state.current.id);
      await wait(25);
      const noteModal=document.querySelector('#questionNoteModal');
      result.questionModals.noteOpened=Boolean(visible(noteModal)&&/converter porcentagem/i.test(document.querySelector('#questionNoteText')?.value||''));
      document.querySelector('#closeQuestionNote')?.click();
      result.questionModals.noteClosed=Boolean(noteModal?.classList.contains('hidden'));

      if(typeof openQuestionIssueModal==='function')openQuestionIssueModal(state.current.id);
      await wait(10);
      const issue=document.querySelector('#questionIssueModal');
      result.questionModals.issueOpened=visible(issue);
      document.querySelector('#cancelQuestionIssue')?.click();
      result.questionModals.issueClosed=Boolean(issue?.classList.contains('hidden'));

      if(typeof openQuestionComments==='function')await openQuestionComments(state.current.id);
      await wait(25);
      const comments=document.querySelector('#commentModal');
      result.questionModals.commentsOpened=Boolean(visible(comments)&&/ainda não há comentários/i.test(document.querySelector('#questionComments')?.textContent||''));
      document.querySelector('#closeComments')?.click();
      result.questionModals.commentsClosed=Boolean(comments?.classList.contains('hidden'));
    }catch(err){
      result.error=String(err?.stack||err?.message||err);
    }finally{
      client.rpc=originalRpc;client.from=originalFrom;
      if(typeof clearFocusInterval==='function')clearFocusInterval();
      Object.assign(focusModeState,prev.focus,{interval:null});
      if(typeof renderFocusMode==='function')renderFocusMode();
      state.user=prev.user;state.profile=prev.profile;state.onboarding=prev.onboarding;state.current=prev.current;
      document.body.classList.toggle('light',prev.light);
      document.body.style.overflow=prev.bodyOverflow;
      document.querySelector('#focusModeModal')?.classList.add('hidden');
      document.querySelector('#nexoOnboarding')?.classList.add('hidden');
      document.querySelector('#questionNoteModal')?.classList.add('hidden');
      document.querySelector('#questionIssueModal')?.classList.add('hidden');
      document.querySelector('#commentModal')?.classList.add('hidden');
      document.querySelector('#profileMenu')?.classList.add('hidden');
      pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
      if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    }
    return result;
  });
  const advancedFailures=[];
  if(advancedControlTest.error)advancedFailures.push('erro='+advancedControlTest.error);
  for(const [group,values] of Object.entries(advancedControlTest)){
    if(group==='error')continue;
    for(const [key,value] of Object.entries(values||{}))if(!value)advancedFailures.push(group+'.'+key);
  }
  if(advancedFailures.length)failures.push(name+': controles avançados regrediram: '+advancedFailures.join(', ')+' '+JSON.stringify(advancedControlTest));


  markStage('safe-external-actions');
  const safeExternalActionsTest=await page.evaluate(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      user:state.user,profile:state.profile,membership:state.membership,
      haptics:localStorage.getItem('nexo-haptics')
    };
    const originalReset=client.auth.resetPasswordForEmail;
    const originalSignOut=client.auth.signOut;
    const originalFrom=client.from;
    const originalRpc=client.rpc;
    const originalAnchorClick=HTMLAnchorElement.prototype.click;
    const originalOpen=window.open;
    const calls={reset:0,signOut:0,plus:0,downloads:0,opens:[]};
    const result={};
    try{
      // Recuperação de senha sem enviar e-mail real.
      if(app)app.classList.add('hidden');
      if(auth)auth.classList.remove('hidden');
      const email=document.querySelector('#loginEmail');
      if(email)email.value='smoke@nexo.local';
      client.auth.resetPasswordForEmail=async()=>{calls.reset++;return {data:{},error:null}};
      document.querySelector('#forgotPassword')?.click();
      await wait(35);
      result.passwordRecovery=Boolean(calls.reset===1&&/Link de recuperação enviado/i.test(document.querySelector('#authMessage')?.textContent||''));

      // Exportação sem baixar arquivo e sem consultar dados reais.
      if(app)app.classList.remove('hidden');
      if(auth)auth.classList.add('hidden');
      state.user={id:'smoke-user',email:'smoke@nexo.local',created_at:'2026-01-01T00:00:00Z'};
      client.from=()=>{
        const chain={
          select(){return chain},eq(){return chain},order(){return chain},limit(){return chain},in(){return chain},
          async maybeSingle(){return {data:null,error:null}},
          then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}
        };
        return chain;
      };
      HTMLAnchorElement.prototype.click=function(){
        if(String(this.download||'').startsWith('nexo-meus-dados-'))calls.downloads++;
      };
      document.querySelector('#exportMyData')?.click();
      await wait(80);
      const exportBtn=document.querySelector('#exportMyData');
      result.exportData=Boolean(calls.downloads===1&&exportBtn&&!exportBtn.disabled&&/Exportar meus dados/i.test(exportBtn.textContent||''));

      // Logout sem encerrar sessão real.
      client.auth.signOut=async()=>{calls.signOut++;return {error:null}};
      document.querySelector('#logoutBtn')?.click();
      await wait(30);
      result.logout=Boolean(calls.signOut===1);

      // Interesse Plus sem gravar RPC real.
      state.membership={plan:'free',is_plus:false,is_ultra:false,usage:{},limits:{}};
      if(typeof renderPlanExperience==='function')renderPlanExperience();
      client.rpc=async(name,...args)=>{
        if(name==='request_nexo_plus'){calls.plus++;return {data:{ok:true},error:null}}
        return originalRpc.call(client,name,...args);
      };
      const plus=document.querySelector('#requestPlusBtn');
      if(plus){plus.disabled=false;plus.innerHTML='Quero o Plus · R$ 9,99/mês <span>→</span>'}
      plus?.click();
      await wait(40);
      result.plus=Boolean(calls.plus===1&&/Interesse registrado/i.test(plus?.textContent||''));

      // Haptics: preferência local deve alternar e voltar ao valor original.
      const haptic=document.querySelector('#toggleNexoHaptics');
      const beforeEnabled=typeof nexoHapticsEnabled==='function'?nexoHapticsEnabled():localStorage.getItem('nexo-haptics')!=='off';
      haptic?.click();
      const afterOneEnabled=typeof nexoHapticsEnabled==='function'?nexoHapticsEnabled():localStorage.getItem('nexo-haptics')!=='off';
      haptic?.click();
      const afterTwoEnabled=typeof nexoHapticsEnabled==='function'?nexoHapticsEnabled():localStorage.getItem('nexo-haptics')!=='off';
      result.haptics=Boolean(haptic&&afterOneEnabled!==beforeEnabled&&afterTwoEnabled===beforeEnabled);

      // Links oficiais sem abrir nova janela real.
      window.open=(...args)=>{calls.opens.push(args);return null};
      const sheet=document.querySelector('#officialEssaySheetBtn');
      if(sheet)sheet.disabled=false;
      sheet?.click();
      document.querySelector('#officialEssayGuideBtn')?.click();
      await wait(10);
      result.essayLinks=Boolean(
        calls.opens.some(x=>/folha-redacao-enem\.html/i.test(String(x[0]||''))) &&
        calls.opens.some(x=>/gov\.br\/inep/i.test(String(x[0]||'')))
      );

      // Atalhos originais do topo/perfil continuam roteando.
      if(typeof openPage==='function')openPage('inicio');
      document.querySelector('#headerJourneyPill')?.click();
      await wait(30);
      result.headerJourney=Boolean(document.querySelector('#ranking')?.classList.contains('active'));
      document.querySelector('#profilePlanShortcut')?.click();
      await wait(30);
      result.profilePlan=Boolean(document.querySelector('#planos')?.classList.contains('active'));
    }catch(err){
      result.error=String(err?.stack||err?.message||err);
    }finally{
      client.auth.resetPasswordForEmail=originalReset;
      client.auth.signOut=originalSignOut;
      client.from=originalFrom;client.rpc=originalRpc;
      HTMLAnchorElement.prototype.click=originalAnchorClick;
      window.open=originalOpen;
      state.user=prev.user;state.profile=prev.profile;state.membership=prev.membership;
      if(prev.haptics===null)localStorage.removeItem('nexo-haptics');else localStorage.setItem('nexo-haptics',prev.haptics);
      if(typeof renderHapticPreference==='function')renderHapticPreference();
      if(typeof renderPlanExperience==='function')renderPlanExperience();
      pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
      if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    }
    return {...result,calls};
  });
  const safeExternalFailures=[];
  for(const key of ['passwordRecovery','exportData','logout','plus','haptics','essayLinks','headerJourney','profilePlan']){
    if(!safeExternalActionsTest[key])safeExternalFailures.push(key);
  }
  if(safeExternalActionsTest.error)safeExternalFailures.push('error='+safeExternalActionsTest.error);
  if(safeExternalFailures.length)failures.push(name+': ações externas mockadas regrediram: '+safeExternalFailures.join(', ')+' '+JSON.stringify(safeExternalActionsTest));


  markStage('study-shortcuts');
  const studyShortcutTest=await page.evaluate(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms)),pages=[...document.querySelectorAll('.page')];
    const prev={active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',user:state.user,core:state.core,materials:state.materials,modules:state.systemModules};
    const oldStart=window.startStudySession,calls=[],out={};
    try{
      state.user={id:'smoke-shortcuts',email:'smoke@nexo.local'};state.systemModules=new Map();
      state.core={recommended_action:{area:'Matemática',subject:'Matemática',topic:'Porcentagem',size:8,reason:'smoke'}};
      window.startStudySession=async cfg=>{calls.push({...cfg})};
      document.querySelector('#adaptiveButton')?.click();await wait(20);
      document.querySelector('#mobileAdaptive')?.click();await wait(20);
      out.adaptive=calls.filter(x=>x.mode==='adaptive'&&x.topic==='Porcentagem'&&Number(x.size)===8).length===2;
      document.querySelector('#quickTen')?.click();await wait(10);
      out.quickTen=document.querySelector('#sessionSize')?.value==='10'&&document.querySelector('#questoes')?.classList.contains('active');
      if(document.querySelector('#visualOnly'))document.querySelector('#visualOnly').checked=false;
      document.querySelector('#quickVisual')?.click();await wait(10);out.quickVisual=document.querySelector('#visualOnly')?.checked===true;
      if(document.querySelector('#sessionSize'))document.querySelector('#sessionSize').value='20';
      document.querySelector('#mobileQuickTen')?.click();await wait(10);out.mobileQuickTen=document.querySelector('#sessionSize')?.value==='10';
      if(document.querySelector('#visualOnly'))document.querySelector('#visualOnly').checked=false;
      document.querySelector('#mobileQuickVisual')?.click();await wait(10);out.mobileQuickVisual=document.querySelector('#visualOnly')?.checked===true;
      try{localStorage.removeItem(studyResumeKey())}catch(_){}
      state.materials=[];openPage('inicio');document.querySelector('#continueStudy')?.click();await wait(15);
      out.continueFallback=document.querySelector('#questoes')?.classList.contains('active');
    }catch(e){out.error=String(e?.stack||e)}
    finally{window.startStudySession=oldStart;state.user=prev.user;state.core=prev.core;state.materials=prev.materials;state.systemModules=prev.modules;pages.forEach(p=>p.classList.toggle('active',p.id===prev.active))}
    return {...out,calls};
  });
  const studyShortcutFailures=[];for(const k of ['adaptive','quickTen','quickVisual','mobileQuickTen','mobileQuickVisual','continueFallback'])if(!studyShortcutTest[k])studyShortcutFailures.push(k);
  if(studyShortcutTest.error)studyShortcutFailures.push('error='+studyShortcutTest.error);
  if(studyShortcutFailures.length)failures.push(name+': atalhos de estudo regrediram: '+studyShortcutFailures.join(', ')+' '+JSON.stringify(studyShortcutTest));

  markStage('accessibility');
  const accessibilityTest=await page.evaluate(()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const prev={app:app?.className||'',auth:auth?.className||''};
    if(app)app.classList.remove('hidden');if(auth)auth.classList.add('hidden');
    const isVisible=el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>0&&r.height>0};
    const unlabeledButtons=[...document.querySelectorAll('button')].filter(isVisible).filter(btn=>{
      const text=(btn.innerText||'').replace(/\s+/g,' ').trim();
      return !text&&!btn.getAttribute('aria-label')&&!btn.getAttribute('title');
    }).slice(0,12).map(btn=>btn.id||btn.className||'<button>');
    const unlabeledFields=[...document.querySelectorAll('input,select,textarea')].filter(isVisible).filter(el=>{
      const labels=el.labels?.length||0;
      return !labels&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&!el.getAttribute('placeholder')&&!el.getAttribute('title');
    }).slice(0,12).map(el=>el.id||el.name||el.tagName);
    if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    return {unlabeledButtons,unlabeledFields};
  });
  if(accessibilityTest.unlabeledButtons.length)failures.push(name+': botões visíveis sem nome acessível: '+accessibilityTest.unlabeledButtons.join(', '));
  if(accessibilityTest.unlabeledFields.length)failures.push(name+': campos visíveis sem rótulo: '+accessibilityTest.unlabeledFields.join(', '));

  markStage('experience-controls');
  const experienceControlTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      light:document.body.classList.contains('light')
    };
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    if(typeof openPage==='function')openPage('inicio');
    await new Promise(r=>requestAnimationFrame(r));

    const mobile=innerWidth<=760;
    const sample=document.querySelector(mobile?'.nrx-mobile .nrx-mob-action b':'.nrx-side-nav .nrx-side-item b');
    const normalFont=sample?parseFloat(getComputedStyle(sample).fontSize):0;

    const settings=document.querySelector('[data-nrx-side="settings"]');
    settings?.click();
    await new Promise(r=>requestAnimationFrame(r));
    const modal=document.querySelector('#experienceSettingsModal');
    const modalOpened=Boolean(modal&&!modal.classList.contains('hidden'));

    modal?.querySelector('[data-font-scale="xlarge"]')?.click();
    await new Promise(r=>requestAnimationFrame(r));
    const xlargeFont=sample?parseFloat(getComputedStyle(sample).fontSize):0;
    const fontChanged=document.body.dataset.fontScale==='xlarge'&&xlargeFont>normalFont+1;

    modal?.querySelector('[data-contrast="high"]')?.click();
    const contrastChanged=document.body.dataset.contrast==='high';

    modal?.querySelector('[data-motion="reduced"]')?.click();
    const motionChanged=document.body.dataset.motion==='reduced';

    modal?.querySelector('[data-experience-mode="focus"]')?.click();
    const focusChanged=document.body.dataset.experience==='focus';

    const saver=modal?.querySelector('#dataSaverToggle');
    if(saver){
      saver.checked=true;
      saver.dispatchEvent(new Event('change',{bubbles:true}));
    }
    const saverChanged=document.body.classList.contains('data-saver');

    modal?.querySelector('#resetExperienceSettings')?.click();
    await new Promise(r=>requestAnimationFrame(r));
    const resetOk=document.body.dataset.fontScale==='normal'&&document.body.dataset.contrast==='normal'&&document.body.dataset.experience==='balanced'&&!document.body.classList.contains('data-saver');

    modal?.querySelector('#closeExperienceSettings')?.click();
    const modalClosed=Boolean(modal?.classList.contains('hidden'))&&document.body.style.overflow==='';

    document.body.classList.toggle('light',prev.light);
    pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
    if(app)app.className=prev.app;
    if(auth)auth.className=prev.auth;
    return {modalOpened,fontChanged,normalFont,xlargeFont,contrastChanged,motionChanged,focusChanged,saverChanged,resetOk,modalClosed};
  });
  for(const [key,value] of Object.entries(experienceControlTest)){
    if(['normalFont','xlargeFont'].includes(key))continue;
    if(!value)failures.push(name+': controle de experiência falhou em '+key+' ('+JSON.stringify(experienceControlTest)+')');
  }







  if(!first.hardening)failures.push(name+': hardening não carregou');
  if(!first.v13Core)failures.push(name+': V13 core não carregou');
  if(!first.authVisible&&!first.appVisible)failures.push(name+': nenhuma tela principal ficou visível');
  if(first.duplicateIds.length)failures.push(name+': IDs duplicados em runtime: '+first.duplicateIds.join(', '));
  if(!first.serviceWorker)failures.push(name+': Service Worker não ficou ativo');
  if(name==='mobile'){
    const closeTest=await page.evaluate(()=>{
      const bar=document.querySelector('#nexoContextBar');
      const btn=document.querySelector('#contextClose');
      if(!bar||!btn)return {button:Boolean(btn),dismissed:false};
      bar.classList.remove('is-dismissed');
      btn.click();
      return {button:true,dismissed:bar.classList.contains('is-dismissed')&&getComputedStyle(bar).display==='none'};
    });
    if(!closeTest.button)failures.push(name+': botão X do guia de contexto não existe');
    if(!closeTest.dismissed)failures.push(name+': botão X não fechou o guia de contexto');

    markStage('mobile-typography');
    const typographyTest=await page.evaluate(()=>{
      const host=document.createElement('div');
      host.id='nexoTypographySmoke';
      host.style.cssText='position:absolute;left:0;top:0;width:390px;max-width:100vw;padding:12px;z-index:-1;visibility:hidden;display:grid;gap:14px;background:#050914';
      host.innerHTML=`
        <section class="nexo-context-bar" style="position:relative!important;top:auto!important;margin:0!important">
          <button class="nexo-context-close" type="button">×</button>
          <div><span>ONDE ESTOU</span><b>Início · plano personalizado de hoje</b></div>
          <div><span>POR QUE AGORA</span><b>Prioridade calculada pelo seu desempenho recente</b></div>
          <div><span>PRÓXIMO</span><b>Continuar sessão de Matemática financeira</b></div>
          <button id="contextNextAction" type="button">Ir agora →</button>
        </section>
        <article class="nexo-command-center mobile-command-center">
          <div class="command-head"><div><span class="eyebrow">CENTRAL NEXO</span><h3>Seu cockpit de evolução</h3></div><button>Jornada →</button></div>
          <div class="command-stats">
            <span><b>NV. 12</b><small>nível de aprendizagem</small></span>
            <span><b>27</b><small>dias de sequência</small></span>
            <span><b>2.840</b><small>N-Coins acumuladas</small></span>
          </div>
          <div class="command-next"><b>Próxima missão:</b>&nbsp;Porcentagem e matemática financeira · 8 questões</div>
          <button class="command-start">Começar missão →</button>
        </article>
        <section class="mobile-section">
          <div class="mobile-section-head"><div><span class="eyebrow">ÁREAS DO ENEM</span><h3>O que você quer estudar?</h3></div></div>
          <div class="mobile-subject-grid">
            <button class="subject-card blue"><span class="subject-icon">A</span><div><b>Linguagens</b><small>765 questões no acervo</small></div></button>
            <button class="subject-card green"><span class="subject-icon">◎</span><div><b>Ciências Humanas</b><small>765 questões no acervo</small></div></button>
            <button class="subject-card purple"><span class="subject-icon">⌬</span><div><b>Ciências da Natureza</b><small>765 questões no acervo</small></div></button>
            <button class="subject-card orange"><span class="subject-icon">Σ</span><div><b>Matemática</b><small>765 questões no acervo</small></div></button>
          </div>
        </section>
        <div class="mobile-action-grid">
          <button><span>✦</span><div><b>Revisão inteligente</b><small>Retome o que está perto de esquecer.</small></div></button>
          <button><span>✓</span><div><b>Caderno de erros</b><small>Treine novamente seus pontos fracos.</small></div></button>
        </div>
        <nav class="mobile-bottom" style="position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important">
          <button class="active"><span>⌂</span><small>Início</small></button>
          <button><span>✓</span><small>Questões</small></button>
          <button><span>✎</span><small>Redação</small></button>
          <button><span>▥</span><small>Desempenho</small></button>
          <button><span>☰</span><small>Mais</small></button>
        </nav>`;
      document.body.appendChild(host);
      const targets=[
        ['context',host.querySelector('.nexo-context-bar')],
        ['command',host.querySelector('.mobile-command-center')],
        ['subjects',host.querySelector('.mobile-subject-grid')],
        ['actions',host.querySelector('.mobile-action-grid')],
        ['nav',host.querySelector('.mobile-bottom')],
        ...[...host.querySelectorAll('.subject-card div')].map((el,i)=>['subject-text-'+i,el]),
        ...[...host.querySelectorAll('.command-stats span')].map((el,i)=>['stat-'+i,el])
      ];
      const overflow=targets.filter(([,el])=>el&&el.scrollWidth>el.clientWidth+2).map(([name,el])=>({name,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
      const clippedText=[...host.querySelectorAll('.subject-card')].flatMap((card,i)=>{
        const cardRect=card.getBoundingClientRect();
        return [...card.querySelectorAll('b,small')].filter(el=>{
          const r=el.getBoundingClientRect();
          return r.right>cardRect.right-8||r.left<cardRect.left+8||r.bottom>cardRect.bottom-6;
        }).map(el=>({card:i,text:el.textContent}));
      });
      const css=el=>Number.parseFloat(getComputedStyle(el).fontSize)||0;
      const sizes={
        context:css(host.querySelector('.nexo-context-bar b')),
        commandTitle:css(host.querySelector('.command-head h3')),
        subject:css(host.querySelector('.subject-card b')),
        subjectIcon:css(host.querySelector('.subject-icon')),
        navIcon:css(host.querySelector('.mobile-bottom span')),
        navLabel:css(host.querySelector('.mobile-bottom small'))
      };
      const hostOverflow=host.scrollWidth>host.clientWidth+2;
      host.remove();
      return {overflow,clippedText,hostOverflow,sizes};
    });
    if(typographyTest.hostOverflow||typographyTest.overflow.length||typographyTest.clippedText.length)failures.push(name+': UI polish gerou overflow/corte de texto: '+JSON.stringify(typographyTest));
    if(typographyTest.sizes.context<12.5)failures.push(name+': fonte do balão ainda pequena');
    if(typographyTest.sizes.commandTitle<19)failures.push(name+': título do cockpit ainda pequeno');
    if(typographyTest.sizes.subject<13.5)failures.push(name+': títulos das matérias ainda pequenos');
    if(typographyTest.sizes.subjectIcon<20)failures.push(name+': símbolos das matérias ainda pequenos');
    if(typographyTest.sizes.navIcon<21)failures.push(name+': ícones da navegação ainda pequenos');
    if(typographyTest.sizes.navLabel<10)failures.push(name+': rótulos da navegação ainda pequenos');
  }

  markStage('question-flow');
  const questionFlowTest=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')];
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio',
      current:state.current,session:state.session,answered:state.answered,
      selectedOption:state.selectedOption,lastAnswer:state.lastAnswer,
      questionStartedAt:state.questionStartedAt,questionBehavior:state.questionBehavior,
      user:state.user
    };
    const originalRpc=client.rpc;
    const fnNames=['loadDashboard','loadNexoCore','loadRecentAttempts','loadNexoMembership','loadNexoJourney','loadNexoWeekPlan','loadTopicMastery','loadSubtopicMastery','loadDueReviewItems','openQuestionComments','nextQuestion'];
    const originalFns={};
    for(const key of fnNames)originalFns[key]=window[key];
    const fake={
      id:-991337,
      area:'Matemática',
      subject:'Matemática',
      topic:'Porcentagem e matemática financeira',
      difficulty:2,
      source_year:2025,
      source_question_number:999,
      source_exam:'ENEM · teste local',
      prompt:'Um produto de R$ 100 recebe desconto de 20%. Qual é o novo preço?',
      options:['R$ 20','R$ 80','R$ 100','R$ 120','R$ 180'],
      base_text:'',
      source_reference:''
    };
    let commentsCalled=false,nextCalled=false;
    try{
      if(app)app.classList.remove('hidden');
      if(auth)auth.classList.add('hidden');
      if(typeof openPage==='function')openPage('questoes');
      await wait(60);

      state.user=null;
      state.current=fake;
      state.session={index:0,questions:[fake],examMode:false,maxHints:3,coreSessionId:null,resultStats:{correct:0,wrong:0,totalSeconds:0,wrongIds:[],correctIds:[],xp:0,coins:0,patterns:{}}};
      state.answered=false;
      state.selectedOption=null;
      state.lastAnswer=null;
      state.questionStartedAt=Date.now()-1400;
      state.questionBehavior={questionId:fake.id,startedAt:Date.now()-1800,selectionChanges:0,hintCount:0,firstSelectionAt:0,lastReaction:''};

      client.rpc=async(name)=>{
        if(name==='submit_answer_v2')return {data:{
          correct:false,
          correct_option:1,
          explanation:'Aplicando 20% de desconto em R$ 100, restam R$ 80.',
          gamification:{xp_gained:0,coins_gained:0,points_gained:0,level:1,title:'Jornada',claimable_missions:0}
        },error:null};
        return {data:null,error:null};
      };
      for(const key of ['loadDashboard','loadNexoCore','loadRecentAttempts','loadNexoMembership','loadNexoJourney','loadNexoWeekPlan','loadTopicMastery','loadSubtopicMastery','loadDueReviewItems']){
        if(typeof window[key]==='function')window[key]=async()=>null;
      }
      window.openQuestionComments=(id)=>{commentsCalled=Number(id)===Number(fake.id)};
      window.nextQuestion=async()=>{nextCalled=true};

      await window.renderQuestion(fake);
      const confidence=document.querySelector('#v13Confidence');
      const confidenceMounted=Boolean(confidence);
      document.querySelector('#preAnswerHint')?.click();
      await wait(20);
      const preHintVisible=Boolean(document.querySelector('#preAnswerHintBox')&&!document.querySelector('#preAnswerHintBox').classList.contains('hidden'));

      const option=document.querySelector('.q-option[data-option="0"]');
      option?.click();
      const confirm=document.querySelector('#confirmAnswer');
      const selectionWorks=Boolean(option?.classList.contains('selected')&&confirm&&!confirm.disabled&&/Confirmar A/.test(confirm.textContent||''));

      confidence?.querySelector('[data-v13-confidence="unsure"]')?.click();
      const confidenceSelected=Boolean(confidence?.querySelector('[data-v13-confidence="unsure"]')?.classList.contains('active'));
      confirm?.click();
      await wait(140);

      const answerPanel=document.querySelector('.answer-panel');
      const correctionVisible=Boolean(answerPanel&&answerPanel.textContent.includes('Gabarito B')&&answerPanel.textContent.includes('Aplicando 20%'));
      const auditVisible=Boolean(document.querySelector('.v13-answer-audit'));
      const controls={
        hint:Boolean(document.querySelector('#showHint')),
        nexo:Boolean(document.querySelector('#askNexoAboutQuestion')),
        similar:Boolean(document.querySelector('#reviewQuestionTopic')),
        save:Boolean(document.querySelector('#saveCurrentQuestion')),
        note:Boolean(document.querySelector('#questionPersonalNote')),
        report:Boolean(document.querySelector('#reportCurrentQuestion')),
        comments:Boolean(document.querySelector('#openComments')),
        next:Boolean(document.querySelector('#nextAfterAnswer'))
      };
      document.querySelector('#showHint')?.click();
      const shortcutVisible=Boolean(document.querySelector('#hintBox')&&!document.querySelector('#hintBox').classList.contains('hidden')&&/Macete do Professor Nexo/.test(document.querySelector('#hintBox')?.textContent||''));
      document.querySelector('#openComments')?.click();
      document.querySelector('#nextAfterAnswer')?.click();
      await wait(20);

      return {
        supported:true,confidenceMounted,preHintVisible,selectionWorks,confidenceSelected,
        correctionVisible,auditVisible,controls,shortcutVisible,commentsCalled,nextCalled,error:''
      };
    }catch(err){
      return {supported:false,error:String(err?.stack||err?.message||err)};
    }finally{
      client.rpc=originalRpc;
      for(const [key,value] of Object.entries(originalFns))if(value)window[key]=value;
      state.current=prev.current;state.session=prev.session;state.answered=prev.answered;
      state.selectedOption=prev.selectedOption;state.lastAnswer=prev.lastAnswer;
      state.questionStartedAt=prev.questionStartedAt;state.questionBehavior=prev.questionBehavior;state.user=prev.user;
      pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
      if(app)app.className=prev.app;if(auth)auth.className=prev.auth;
    }
  });
  const questionControlsOk=questionFlowTest.controls&&Object.values(questionFlowTest.controls).every(Boolean);
  if(!questionFlowTest.supported||questionFlowTest.error||!questionFlowTest.confidenceMounted||!questionFlowTest.preHintVisible||
    !questionFlowTest.selectionWorks||!questionFlowTest.confidenceSelected||!questionFlowTest.correctionVisible||
    !questionFlowTest.auditVisible||!questionControlsOk||!questionFlowTest.shortcutVisible||
    !questionFlowTest.commentsCalled||!questionFlowTest.nextCalled){
    failures.push(name+': fluxo completo de questão falhou: '+JSON.stringify(questionFlowTest));
  }

  if(first.wiringError)failures.push(name+': wiring V13 lançou erro: '+first.wiringError);
  if(!first.sharedState)failures.push(name+': state/client não estão compartilhados com o V13');
  if(!first.essayEngine)failures.push(name+': motor de redação V13 não respondeu com 5 competências válidas');
  if(!first.siteSearch)failures.push(name+': pesquisa interna não encontrou todas as áreas/funções esperadas: '+JSON.stringify(first.searchSamples));
  if(!first.searchActionWorks)failures.push(name+': ação pesquisada não abriu a página Meu perfil de evolução');
  if(!first.percentTones)failures.push(name+': faixas de porcentagem incorretas: '+JSON.stringify(first.percentToneMap));
  for(const [key,active] of Object.entries(first.wrappers))if(!active)failures.push(name+': wrapper V13 inativo: '+key);

  markStage('reload');
  await load('reload');

  markStage('post-reload');
  const second=await page.evaluate(()=>({
    hardening:typeof window.nexoRunProductionDiagnostics==='function',
    v13Core:typeof window.v13State==='function',
    sharedState:typeof state==='object'&&typeof client==='object'&&typeof v13State==='function'&&v13State()===state.v13,
    renderWrapped:typeof window.renderQuestion==='function'&&/mountConfidence/.test(String(window.renderQuestion)),
    submitWrapped:typeof window.submitAnswer==='function'&&/v13State/.test(String(window.submitAnswer)),
    authVisible:!document.querySelector('#authScreen')?.classList.contains('hidden'),
    appVisible:!document.querySelector('#app')?.classList.contains('hidden')
  }));
  if(!second.hardening||!second.v13Core)failures.push(name+': módulos V13 falharam após reload/PWA');
  if(!second.sharedState||!second.renderWrapped||!second.submitWrapped)failures.push(name+': wiring V13 falhou após reload/PWA');
  if(!second.authVisible&&!second.appVisible)failures.push(name+': boot falhou após reload/PWA');

  const benignPageErrors=[
    /ResizeObserver loop/i
  ];
  const realErrors=pageErrors.filter(msg=>!benignPageErrors.some(rx=>rx.test(msg)));
  if(realErrors.length)failures.push(name+': pageerror: '+[...new Set(realErrors)].join(' | '));
  if(badResponses.length)failures.push(name+': respostas HTTP locais ruins: '+[...new Set(badResponses)].join(' | '));
  if(failedRequests.length)failures.push(name+': requests locais falharam: '+[...new Set(failedRequests)].join(' | '));

  markStage('offline-shell');
  let offlineShellTest={ok:false,error:'not-run'};
  try{
    await context.setOffline(true);
    await page.reload({waitUntil:'commit',timeout:20000});
    await page.waitForFunction(()=>{
      const boot=document.querySelector('#boot');
      const auth=document.querySelector('#authScreen');
      const app=document.querySelector('#app');
      const bootGone=!boot||boot.classList.contains('hidden')||getComputedStyle(boot).display==='none';
      return bootGone||Boolean(auth&&!auth.classList.contains('hidden'))||Boolean(app&&!app.classList.contains('hidden'));
    },{timeout:12000});
    await page.waitForTimeout(500);
    offlineShellTest=await page.evaluate(()=>({
      ok:document.title==='NEXO ENEM'&&
        typeof window.nexoRunProductionDiagnostics==='function'&&
        Boolean(document.querySelector('.nrx-desktop'))&&
        Boolean(document.querySelector('.nrx-mobile'))&&
        Boolean(navigator.serviceWorker?.controller)&&
        Boolean(document.querySelector('#authScreen'))&&
        Boolean(document.querySelector('#app')),
      title:document.title,
      hardening:typeof window.nexoRunProductionDiagnostics==='function',
      referenceDesktop:Boolean(document.querySelector('.nrx-desktop')),
      referenceMobile:Boolean(document.querySelector('.nrx-mobile')),
      controlled:Boolean(navigator.serviceWorker?.controller),
      auth:Boolean(document.querySelector('#authScreen')),
      app:Boolean(document.querySelector('#app'))
    }));
  }catch(err){
    offlineShellTest={ok:false,error:String(err?.message||err)};
  }finally{
    await context.setOffline(false);
  }
  if(!offlineShellTest.ok)failures.push(name+': shell PWA não abriu offline: '+JSON.stringify(offlineShellTest));

  info.push({name,viewport,first,globalSearchUiTest,referenceUiTest,referenceAccessTest,routeMatrixTest,utilityTest,legacyCapabilityTest,preservedGuidanceTest,navigationClickTest,adminAccessTest,homeShortcutTest,coreFeatureAccessTest,utilityModuleTest,moduleInteractionTest,contentWorkflowTest,journeyPersistenceTest,essayRenderAndViewerTest,viewerActionTest,viewerNoteTest,advancedControlTest,safeExternalActionsTest,studyShortcutTest,accessibilityTest,experienceControlTest,questionFlowTest,second,offlineShellTest,pageErrors:realErrors.length,badResponses:badResponses.length,failedRequests:failedRequests.length});
  markStage('done');
  clearTimeout(watchdog);
  await context.close();
}


async function runViewportAudit(browser,name,viewport){
  const context=await browser.newContext({viewport,locale:'pt-BR'});
  const page=await context.newPage();
  const localErrors=[];
  page.on('pageerror',err=>localErrors.push(err.message));
  await page.goto(BASE+'?viewport_audit='+encodeURIComponent(name+'-'+Date.now()),{waitUntil:'commit',timeout:30000});
  await page.waitForFunction(()=>{
    const boot=document.querySelector('#boot');
    const auth=document.querySelector('#authScreen');
    const app=document.querySelector('#app');
    const bootGone=!boot||boot.classList.contains('hidden')||getComputedStyle(boot).display==='none';
    return bootGone||Boolean(auth&&!auth.classList.contains('hidden'))||Boolean(app&&!app.classList.contains('hidden'));
  },{timeout:16000});
  await page.waitForTimeout(600);

  const result=await page.evaluate(async()=>{
    const app=document.querySelector('#app'),auth=document.querySelector('#authScreen');
    const pages=[...document.querySelectorAll('.page')].filter(p=>p.id!=='videoaulas'&&p.id!=='admin');
    const prev={
      app:app?.className||'',auth:auth?.className||'',
      active:pages.find(p=>p.classList.contains('active'))?.id||'inicio'
    };
    if(app)app.classList.remove('hidden');
    if(auth)auth.classList.add('hidden');
    const pageLayout=[];
    for(const target of pages){
      pages.forEach(p=>p.classList.toggle('active',p===target));
      await new Promise(r=>requestAnimationFrame(r));
      const r=target.getBoundingClientRect();
      pageLayout.push({
        id:target.id,
        visible:r.width>0&&r.height>0&&getComputedStyle(target).display!=='none',
        documentOverflow:document.documentElement.scrollWidth>innerWidth+4,
        pageOverflow:target.scrollWidth>target.clientWidth+8&& !['auto','scroll','hidden','clip'].includes(getComputedStyle(target).overflowX)
      });
    }
    const mobile=innerWidth<=760;
    const bottom=document.querySelector('.nrx-bottom-nav');
    const bottomVisible=Boolean(bottom&&getComputedStyle(bottom).display!=='none'&&!bottom.hidden&&bottom.getBoundingClientRect().height>0);
    const sidebar=document.querySelector('#sidebar');
    const sidebarRect=sidebar?.getBoundingClientRect();
    const shell=document.querySelector('.shell');
    const shellRect=shell?.getBoundingClientRect();
    const chrome={
      mobile,
      bottomVisible,
      sidebarOffscreenMobile:!mobile||!sidebarRect||sidebarRect.right<=1||!sidebar.classList.contains('open'),
      shellFits:!shellRect||shellRect.right<=innerWidth+4,
      width:innerWidth
    };

    if(app)app.classList.add('hidden');
    if(auth)auth.classList.remove('hidden');
    const login=document.querySelector('#loginForm'),register=document.querySelector('#registerForm');
    const loginTab=document.querySelector('#loginTab'),registerTab=document.querySelector('#registerTab');
    const authInitial=Boolean(login&&!login.classList.contains('hidden')&&register?.classList.contains('hidden'));
    registerTab?.click();
    await new Promise(r=>requestAnimationFrame(r));
    const registerSwitch=Boolean(register&&!register.classList.contains('hidden')&&login?.classList.contains('hidden'));
    loginTab?.click();
    await new Promise(r=>requestAnimationFrame(r));
    const loginSwitch=Boolean(login&&!login.classList.contains('hidden')&&register?.classList.contains('hidden'));
    const authOverflow=Boolean(auth&&auth.scrollWidth>auth.clientWidth+4);
    const authTabs={initial:authInitial,register:registerSwitch,login:loginSwitch,overflow:authOverflow};

    pages.forEach(p=>p.classList.toggle('active',p.id===prev.active));
    if(app)app.className=prev.app;
    if(auth)auth.className=prev.auth;
    return {pageLayout,chrome,authTabs};
  });

  const badPages=result.pageLayout.filter(x=>!x.visible||x.documentOverflow||x.pageOverflow);
  if(badPages.length)failures.push(name+': viewport extra com overflow/página invisível: '+JSON.stringify(badPages));
  if(result.chrome.mobile&&!result.chrome.bottomVisible)failures.push(name+': navegação inferior ausente no breakpoint móvel');
  if(!result.chrome.mobile&&result.chrome.bottomVisible)failures.push(name+': navegação inferior apareceu no breakpoint desktop');
  if(!result.chrome.shellFits)failures.push(name+': shell ultrapassa a viewport');
  if(!result.authTabs.initial||!result.authTabs.register||!result.authTabs.login||result.authTabs.overflow)failures.push(name+': login/cadastro falhou no teste de troca/overflow: '+JSON.stringify(result.authTabs));
  const realErrors=localErrors.filter(msg=>!/ResizeObserver loop/i.test(msg));
  if(realErrors.length)failures.push(name+': pageerror no viewport extra: '+[...new Set(realErrors)].join(' | '));
  info.push({name,viewport,viewportAudit:result,pageErrors:realErrors.length});
  await context.close();
}

const browser=await chromium.launch({headless:true});
try{
  await runProfile(browser,'desktop',{width:1440,height:900});
  await runProfile(browser,'mobile',{width:390,height:844});
  await runViewportAudit(browser,'mobile-360',{width:360,height:800});
  await runViewportAudit(browser,'breakpoint-760',{width:760,height:900});
  await runViewportAudit(browser,'breakpoint-761',{width:761,height:900});
  await runViewportAudit(browser,'tablet-1024',{width:1024,height:768});
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
console.log('PASS desktop + mobile + breakpoints extras + login/cadastro + reload/PWA sem falhas críticas');
