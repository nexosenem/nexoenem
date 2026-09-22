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

  await load('first');

  const first=await page.evaluate(async()=>{
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
      const sample=('A educação pública é essencial para a cidadania. Portanto, o Estado deve ampliar políticas de formação e acesso. '+
        'Além disso, desigualdades sociais afetam oportunidades e exigem ações coordenadas. Por meio de programas permanentes, '+
        'escolas e governos podem promover acompanhamento, formação docente e inclusão, a fim de reduzir barreiras e garantir direitos. ').repeat(4);
      const scores=window.essayScores(sample);
      result.essayEngine=Array.isArray(scores)&&scores.length===5&&scores.every(n=>Number.isFinite(n)&&n>=0&&n<=200);
      const queries=['perfil de evolução','professor nexo','caderno de erros','simulado','radar enem'];
      result.searchSamples=queries.map(q=>({q,items:typeof buildGlobalSearchResults==='function'?buildGlobalSearchResults(q).filter(x=>x.type==='action').map(x=>x.actionId):[]}));
      result.siteSearch=result.searchSamples.every(x=>x.items.length>0)&&typeof runSiteSearchAction==='function';
      if(result.siteSearch){
        runSiteSearchAction('evolucao');
        result.searchActionWorks=Boolean(document.querySelector('#desempenho')?.classList.contains('active'));
        if(typeof openPage==='function')openPage('inicio');
      }

      const toneHost=document.createElement('div');
      toneHost.innerHTML='<b>39%</b><b>40%</b><b>79%</b><b>80%</b><b>100%</b>';
      document.body.appendChild(toneHost);
      if(typeof window.nexoApplyPercentTones==='function')window.nexoApplyPercentTones(toneHost);
      result.percentToneMap=[...toneHost.querySelectorAll('b')].map(el=>({text:el.textContent,tone:el.dataset.scoreTone||'',classes:[...el.classList]}));
      result.percentTones=JSON.stringify(result.percentToneMap.map(x=>x.tone))===JSON.stringify(['low','mid','mid','high','high']);
      toneHost.remove();
    }catch(err){result.wiringError=String(err?.message||err);}

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
      searchInMobileSlot:Boolean(search?.closest('.nrx-mobile-search-slot')),
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
  if(name==='mobile'&&!referenceUiTest.searchInMobileSlot)failures.push(name+': busca não foi movida para a posição móvel da referência');
  if(!referenceUiTest.heroLoaded)failures.push(name+': mascote da home de referência não carregou');

  const referenceAccessTest=await page.evaluate(()=>{
    const expected=['focos','radar','banco','temas','feedback','ranking','planos'];
    const side=[...document.querySelectorAll('.nrx-side-more-panel [data-nrx-target]')].map(x=>x.dataset.nrxTarget);
    const profile=[...document.querySelectorAll('.nrx-profile-tools [data-nrx-target]')].map(x=>x.dataset.nrxTarget);
    const missingSide=expected.filter(x=>!side.includes(x));
    const missingProfile=expected.filter(x=>!profile.includes(x));
    const visible=el=>Boolean(el&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
    const candidates=[...document.querySelectorAll('.nrx-shortcut,.nrx-stat-card,.nrx-preview,.nrx-mob-action,.nrx-mob-progress,.nrx-mob-continue')].filter(visible);
    const overflowing=candidates.filter(el=>el.scrollWidth>el.clientWidth+4).map(el=>el.className);
    const mobile=innerWidth<=760;
    const actionIcons=mobile?[...document.querySelectorAll('.nrx-mob-action i')].filter(visible):[];
    const minTouch=actionIcons.length?Math.min(...actionIcons.map(el=>Math.min(el.getBoundingClientRect().width,el.getBoundingClientRect().height))):999;
    const hero=document.querySelector(mobile?'.nrx-mob-hero h1':'.nrx-hero h1');
    const heroFont=hero?parseFloat(getComputedStyle(hero).fontSize):0;
    return {
      missingSide,missingProfile,overflowing,minTouch,heroFont,
      moreToggle:Boolean(document.querySelector('.nrx-side-more-toggle')),
      profileTools:Boolean(document.querySelector('.nrx-profile-tools')),
      notificationWired:Boolean(document.querySelector('#notificationBtn'))
    };
  });
  if(referenceAccessTest.missingSide.length)failures.push(name+': recursos antigos ausentes do menu Mais: '+referenceAccessTest.missingSide.join(', '));
  if(referenceAccessTest.missingProfile.length)failures.push(name+': recursos antigos ausentes do Perfil: '+referenceAccessTest.missingProfile.join(', '));
  if(!referenceAccessTest.moreToggle)failures.push(name+': acesso Mais recursos não foi montado');
  if(!referenceAccessTest.profileTools)failures.push(name+': recursos secundários não foram preservados no Perfil');
  if(referenceAccessTest.overflowing.length)failures.push(name+': cards da referência com overflow: '+referenceAccessTest.overflowing.join(', '));
  if(name==='mobile'&&referenceAccessTest.minTouch<42)failures.push(name+': alvo de toque principal menor que 42px');
  if(name==='mobile'&&referenceAccessTest.heroFont<26)failures.push(name+': título principal pequeno demais');
  if(name!=='mobile'&&referenceAccessTest.heroFont<36)failures.push(name+': título principal desktop pequeno demais');


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
  if(first.wiringError)failures.push(name+': wiring V13 lançou erro: '+first.wiringError);
  if(!first.sharedState)failures.push(name+': state/client não estão compartilhados com o V13');
  if(!first.essayEngine)failures.push(name+': motor de redação V13 não respondeu com 5 competências válidas');
  if(!first.siteSearch)failures.push(name+': pesquisa interna não encontrou todas as áreas/funções esperadas: '+JSON.stringify(first.searchSamples));
  if(!first.searchActionWorks)failures.push(name+': ação pesquisada não abriu a página Meu perfil de evolução');
  if(!first.percentTones)failures.push(name+': faixas de porcentagem incorretas: '+JSON.stringify(first.percentToneMap));
  for(const [key,active] of Object.entries(first.wrappers))if(!active)failures.push(name+': wrapper V13 inativo: '+key);

  await load('reload');

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

  info.push({name,viewport,first,referenceUiTest,referenceAccessTest,second,pageErrors:realErrors.length,badResponses:badResponses.length,failedRequests:failedRequests.length});
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
