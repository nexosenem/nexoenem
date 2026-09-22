(()=>{
'use strict';

const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));

function firstName(){
  const raw=$('#profileName')?.textContent?.trim()||'Aluno';
  return raw.split(/\s+/)[0]||'Aluno';
}
function greeting(){
  const h=new Date().getHours();
  return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
}
function pctNumber(text){
  const n=Number(String(text||'').replace(/[^0-9.-]/g,''));
  return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;
}
function toneClass(p){
  return p<=39?'nrx-score-low':p<=79?'nrx-score-mid':'nrx-score-high';
}
function go(page){
  try{
    if(typeof window.openPage==='function'){window.openPage(page);return}
  }catch(_){}
  const trigger=$('.nav-item[data-page="'+page+'"],.mobile-bottom [data-page="'+page+'"]');
  trigger?.click();
}
function openStore(){
  document.body.dataset.nrxJourneyView='store';
  go('ranking');
  setTimeout(()=>{
    try{
      if(typeof window.setJourneyTab==='function')window.setJourneyTab('store');
      else $('[data-journey-tab="store"]')?.click();
    }catch(_){$('[data-journey-tab="store"]')?.click()}
  },120);
}
function openNexo(){
  $('#openNexoFromMenu')?.click();
}
function openExperience(){
  $('#openExperienceSettings')?.click();
}
function openAvatar(){
  document.body.dataset.nrxJourneyView='avatar';
  go('ranking');
  setTimeout(()=>{
    try{
      if(typeof window.setJourneyTab==='function')window.setJourneyTab('avatar');
      else $('[data-journey-tab="avatar"]')?.click();
    }catch(_){$('[data-journey-tab="avatar"]')?.click()}
  },120);
}
function resumeStudy(){
  $('#continueStudy')?.click();
}
function focusMode(){
  const trigger=$('#desktopFocusMode')||$('#mobileFocusMode');
  trigger?.click();
}

function action(label,icon,sub,handler){
  const b=document.createElement('button');
  b.type='button';b.className='nrx-shortcut';
  b.innerHTML='<i>'+icon+'</i><b>'+label+'</b><small>'+sub+'</small>';
  b.addEventListener('click',handler);
  return b;
}
function mobAction(label,icon,handler){
  const b=document.createElement('button');
  b.type='button';b.className='nrx-mob-action';
  b.innerHTML='<i>'+icon+'</i><b>'+label+'</b>';
  b.addEventListener('click',handler);
  return b;
}

function desktopMarkup(){
  const wrap=document.createElement('div');
  wrap.className='nrx-home nrx-desktop';
  wrap.innerHTML=`
    <section class="nrx-hero">
      <div class="nrx-hero-copy">
        <span class="nrx-greeting"><span data-nrx-greeting>Boa noite</span>, <b data-nrx-name>Aluno</b>! 👋</span>
        <h1>Disciplina hoje,<br>resultados amanhã.</h1>
        <p>O ENEM é uma maratona, e você não está sozinho.<br>O Nexo está com você em cada passo.</p>
        <div class="nrx-hero-actions">
          <button class="nrx-btn primary" data-nrx-resume>Continuar estudando&nbsp; →</button>
          <button class="nrx-btn" data-nrx-page="desempenho">Ver meu desempenho&nbsp; →</button>
        </div>
      </div>
      <div class="nrx-hero-art" aria-hidden="true">
        <img src="./assets/nexo-family/hero.avif" alt="">
        <span class="nrx-hero-note">você<br>consegue</span>
        <span class="nrx-hero-values">• FOCO<br>• DISCIPLINA<br>• EVOLUÇÃO<br>• RESULTADO</span>
      </div>
    </section>

    <section class="nrx-shortcuts" data-nrx-desktop-actions></section>

    <section class="nrx-stat-grid">
      <article class="nrx-stat-card">
        <h3>Seu progresso geral</h3>
        <div class="nrx-progress-layout">
          <div class="nrx-ring" data-nrx-ring style="--p:0"><b data-nrx-pct>0%</b></div>
          <div class="nrx-stat-copy"><strong data-nrx-progress-label>Comece hoje!</strong><span data-nrx-progress-note>Seu desempenho aparecerá aqui.</span></div>
        </div>
      </article>
      <article class="nrx-stat-card">
        <h3>Sua maior dificuldade</h3>
        <div class="nrx-difficulty">
          <span class="nrx-difficulty-icon">⌬</span>
          <div><b data-nrx-weak-topic>Ainda calibrando</b><small><strong data-nrx-weak-pct>—</strong> de acerto</small></div>
        </div>
        <button class="nrx-stat-link" data-nrx-page="focos">Ver plano de foco</button>
      </article>
      <article class="nrx-stat-card">
        <h3>Meta do ENEM</h3>
        <div class="nrx-goal-main"><span class="nrx-goal-icon">▣</span><div><span>Faltam</span><b data-nrx-days>— dias</b></div></div>
        <div class="nrx-goal-track"><i data-nrx-countdown-bar></i></div>
        <small class="nrx-goal-quote">“Disciplina hoje, aprovação amanhã.”</small>
      </article>
    </section>

    <section class="nrx-preview-row">
      <button type="button" class="nrx-preview" data-nrx-page="materiais">
        <div class="nrx-preview-head"><b>Estudar</b><span>Aulas, resumos e macetes</span></div>
        <div class="nrx-preview-tabs"><i>Todas</i><i>Matemática</i><i>Linguagens</i></div>
        <div class="nrx-preview-list">
          <span>Estatística e análise de dados <em>→</em></span>
          <span>Geometria e trigonometria <em>→</em></span>
          <span>Porcentagem e matemática financeira <em>→</em></span>
        </div>
      </button>
      <button type="button" class="nrx-preview" data-nrx-page="questoes">
        <div class="nrx-preview-head"><b>Questões</b><span>Treine no nível do ENEM</span></div>
        <div class="nrx-preview-list">
          <span>Treino por assunto <em>→</em></span>
          <span>Questões adaptativas <em>→</em></span>
          <span>Banco de questões <em>→</em></span>
        </div>
      </button>
      <button type="button" class="nrx-preview" data-nrx-page="redacao">
        <div class="nrx-preview-head"><b>Redação</b><span>Escreva, corrija e evolua</span></div>
        <div class="nrx-preview-tabs"><i>Corrigir redação</i><i>Temas sugeridos</i></div>
        <div class="nrx-essay-box">Digite ou cole sua redação e receba uma análise pelas competências do ENEM.</div>
        <div class="nrx-preview-cta">Abrir redação</div>
      </button>
    </section>
  `;
  const actions=$('[data-nrx-desktop-actions]',wrap);
  [
    ['Questões','⌘','Treinar agora',()=>go('questoes')],
    ['Redação','▱','Corrigir texto',()=>go('redacao')],
    ['Simulados','▤','Provas completas',()=>go('simulados')],
    ['Resumo','▧','Aulas e PDFs',()=>go('materiais')],
    ['Planner','▦','Organizar rotina',()=>go('semana')],
    ['Loja NEXO','♕','Itens e avatares',openStore]
  ].forEach(x=>actions.appendChild(action(...x)));
  return wrap;
}

function mobileMarkup(){
  const wrap=document.createElement('div');
  wrap.className='nrx-home nrx-mobile';
  wrap.innerHTML=`
    <section class="nrx-mob-hero">
      <div>
        <span class="nrx-mob-hello"><span data-nrx-greeting>Boa noite</span>, <b data-nrx-name>Aluno</b>!</span>
        <h1>Disciplina hoje,<br>resultados amanhã.</h1>
        <p>O ENEM é uma maratona, e você não está sozinho.</p>
      </div>
      <img src="./assets/nexo-family/bust-confiante.avif" alt="Professor Nexo">
    </section>
    <div class="nrx-mobile-search-slot" data-nrx-search-slot></div>
    <section class="nrx-mob-actions" data-nrx-mobile-actions></section>
    <article class="nrx-mob-progress" data-nrx-go-performance>
      <div class="nrx-ring" data-nrx-ring style="--p:0"><b data-nrx-pct>0%</b></div>
      <div><strong data-nrx-progress-label>Comece hoje!</strong><small data-nrx-progress-note>Seu progresso vai aparecer aqui.</small></div>
      <span class="nrx-chevron">›</span>
    </article>
    <div class="nrx-mob-section-head"><b>Continue de onde parou</b><span data-nrx-page-link="banco">Ver todos</span></div>
    <article class="nrx-mob-continue">
      <span class="nrx-continue-icon">◎</span>
      <div><b data-nrx-continue-title>Retomar seus estudos</b><small data-nrx-continue-sub>Continue sua próxima sessão.</small></div>
      <button type="button" class="nrx-play" data-nrx-resume aria-label="Continuar estudando">▶</button>
    </article>
  `;
  const actions=$('[data-nrx-mobile-actions]',wrap);
  [
    ['Questões','⌘',()=>go('questoes')],
    ['Redação','▱',()=>go('redacao')],
    ['Simulados','▤',()=>go('simulados')],
    ['Resumo','▧',()=>go('materiais')],
    ['Planner','▦',()=>go('semana')],
    ['Meu Desempenho','▥',()=>go('desempenho')],
    ['Loja','♕',openStore],
    ['Nexo (IA)','🐾',openNexo]
  ].forEach(x=>actions.appendChild(mobAction(...x)));
  $('[data-nrx-go-performance]',wrap)?.addEventListener('click',()=>go('desempenho'));
  $('[data-nrx-page-link]',wrap)?.addEventListener('click',()=>go('banco'));
  return wrap;
}

function buildBottomNav(){
  const nav=document.createElement('nav');
  nav.className='nrx-bottom-nav';
  nav.setAttribute('aria-label','Navegação principal');
  const items=[
    ['inicio','⌂','Início'],
    ['materiais','▧','Estudar'],
    ['questoes','⌘','Questões'],
    ['redacao','▱','Redação'],
    ['profile','♙','Perfil']
  ];
  items.forEach(([page,icon,label])=>{
    const b=document.createElement('button');
    b.type='button';b.dataset.nrxBottom=page;
    b.innerHTML='<span>'+icon+'</span><small>'+label+'</small>';
    b.addEventListener('click',()=>{
      if(page==='profile')$('#profileButton')?.click();
      else go(page);
      syncBottom();
    });
    nav.appendChild(b);
  });
  document.body.appendChild(nav);
  syncShellVisibility();
  return nav;
}

function syncShellVisibility(){
  const nav=$('.nrx-bottom-nav');
  if(nav)nav.hidden=$('#app')?.classList.contains('hidden')!==false;
}
function syncBottom(){
  const active=$('.page.active')?.id||'inicio';
  $$('[data-nrx-bottom]').forEach(b=>{
    const p=b.dataset.nrxBottom;
    b.classList.toggle('active',p===active||(p==='materiais'&&active==='videoaulas'));
  });
  syncShellVisibility();
}

function buildReferenceSidebar(){
  const sidebar=$('#sidebar');
  if(!sidebar||$('.nrx-side-nav',sidebar))return;
  const old=$('.side-nav',sidebar);
  if(old)old.classList.add('nrx-original-nav');
  $('.sidebar-quote',sidebar)?.classList.add('nrx-original-quote');
  const brand=$('.brand',sidebar);
  brand?.classList.add('nrx-brand-ref');
  const tagline=brand?.querySelector('small');
  if(tagline)tagline.textContent='Seu esforço conecta o seu futuro.';

  const nav=document.createElement('nav');
  nav.className='nrx-side-nav';
  const items=[
    ['inicio','⌂','Início',()=>go('inicio')],
    ['study','▣','Estudar',()=>{document.body.dataset.nrxMaterialsView='study';go('materiais')}],
    ['questoes','✓','Questões',()=>go('questoes')],
    ['redacao','✎','Redação',()=>go('redacao')],
    ['simulados','▤','Simulados',()=>go('simulados')],
    ['resumos','▧','Resumo e Macetes',()=>{document.body.dataset.nrxMaterialsView='resumos';go('materiais')}],
    ['semana','▦','Planner',()=>go('semana')],
    ['desempenho','▥','Meu Desempenho',()=>go('desempenho')],
    ['radar','◉','Radar ENEM',()=>go('radar')],
    ['store','♕','Loja NEXO',openStore],
    ['avatar','✦','Personalizar',openAvatar],
    ['nexo','🐾','Nexo (Assistente)',openNexo],
    ['settings','⚙','Configurações',openExperience]
  ];
  items.forEach(([key,icon,label,run])=>{
    const b=document.createElement('button');
    b.type='button';b.className='nrx-side-item';b.dataset.nrxSide=key;
    b.innerHTML='<span>'+icon+'</span><b>'+label+'</b>';
    b.addEventListener('click',()=>{run();setTimeout(syncSideNav,60)});
    nav.appendChild(b);
  });
  old?.insertAdjacentElement('beforebegin',nav);

  const account=document.createElement('button');
  account.type='button';account.className='nrx-side-account';
  account.innerHTML='<span class="nrx-side-avatar">N</span><div><b data-nrx-side-name>Aluno</b><small data-nrx-side-plan>Plano NEXO</small></div><i>♛</i>';
  account.addEventListener('click',()=>$('#profileButton')?.click());
  sidebar.appendChild(account);
}
function syncSideNav(){
  const active=$('.page.active')?.id||'inicio';
  let selected=active;
  if(active==='materiais')selected=document.body.dataset.nrxMaterialsView||'study';
  if(active==='ranking')selected=document.body.dataset.nrxJourneyView||'';
  $$('[data-nrx-side]').forEach(b=>b.classList.toggle('active',b.dataset.nrxSide===selected));
  const name=firstName();
  $$('[data-nrx-side-name]').forEach(el=>el.textContent=name);
  const role=$('#profileRole')?.textContent?.trim()||'Estudante';
  $$('[data-nrx-side-plan]').forEach(el=>el.textContent=role);
}
function addMobileChrome(){
  const top=$('.topbar');
  if(!top)return;
  if(!$('.nrx-mobile-brand',top)){
    const brand=document.createElement('div');
    brand.className='nrx-mobile-brand';
    brand.innerHTML='<i>N</i><span>NEXO</span>';
    top.prepend(brand);
  }
  if(!$('.nrx-mobile-crown',top)){
    const crown=document.createElement('button');
    crown.type='button';crown.className='nrx-mobile-crown';crown.setAttribute('aria-label','Abrir Loja NEXO');
    crown.textContent='♛';crown.addEventListener('click',openStore);
    top.appendChild(crown);
  }
  if(!$('.nrx-mobile-menu',top)){
    const menu=document.createElement('button');
    menu.type='button';menu.className='nrx-mobile-menu';menu.setAttribute('aria-label','Abrir menu');
    menu.textContent='☰';
    menu.addEventListener('click',()=>$('#moreMobile')?.click());
    top.appendChild(menu);
  }
}

let searchAnchor=null;
function placeSearch(){
  const search=$('.topbar .search')||$('.nrx-mobile-search-slot .search');
  const top=$('.topbar');
  const slot=$('[data-nrx-search-slot]');
  const homeActive=$('#inicio')?.classList.contains('active');
  if(!search||!top)return;
  if(!searchAnchor){
    searchAnchor=document.createComment('nrx-search-anchor');
    top.insertBefore(searchAnchor,top.querySelector('.top-actions')||null);
  }
  if(innerWidth<=760&&homeActive&&slot){
    if(search.parentNode!==slot)slot.appendChild(search);
  }else{
    if(search.parentNode!==top)top.insertBefore(search,top.querySelector('.top-actions')||null);
  }
}

function bindReferenceEvents(root){
  $$('[data-nrx-page]',root).forEach(el=>el.addEventListener('click',()=>go(el.dataset.nrxPage)));
  $$('[data-nrx-resume]',root).forEach(el=>el.addEventListener('click',resumeStudy));
  $$('[data-nrx-focus]',root).forEach(el=>el.addEventListener('click',focusMode));
}

function syncIdentity(){
  const name=firstName(),hello=greeting();
  $$('[data-nrx-name]').forEach(el=>el.textContent=name);
  $$('[data-nrx-greeting]').forEach(el=>el.textContent=hello);
}
function syncCountdown(){
  let days=null;
  try{
    if(typeof window.studyPhaseMeta==='function')days=Number(window.studyPhaseMeta()?.days);
    else if(typeof studyPhaseMeta==='function')days=Number(studyPhaseMeta()?.days);
  }catch(_){}
  if(!Number.isFinite(days)){
    const target=new Date('2026-11-08T00:00:00-03:00');
    const today=new Date();today.setHours(0,0,0,0);
    days=Math.ceil((target.getTime()-today.getTime())/86400000);
  }
  const shown=Math.max(0,days);
  $$('[data-nrx-days]').forEach(el=>el.textContent=(days>=0?shown:'—')+' dias');
  const windowDays=120;
  const pct=days<=0?100:Math.max(4,Math.min(100,100-(days/windowDays*100)));
  $$('[data-nrx-countdown-bar]').forEach(el=>el.style.width=pct+'%');
}
function syncProgress(){
  const src=$('#progressPct')||$('#mobileProgressPct');
  const p=pctNumber(src?.textContent);
  $$('[data-nrx-pct]').forEach(el=>{
    el.textContent=Math.round(p)+'%';
    el.classList.remove('nrx-score-low','nrx-score-mid','nrx-score-high');
    el.classList.add(toneClass(p));
  });
  $$('[data-nrx-ring]').forEach(el=>el.style.setProperty('--p',String(p)));
  syncCountdown();
  let label='Comece hoje!',note='Seu desempenho vai aparecer aqui.';
  if(p>=80){label='Muito bem!';note='Continue assim.'}
  else if(p>=40){label='Bom caminho!';note='Continue evoluindo.'}
  else if(p>0){label='Vamos melhorar!';note='Seu plano vai priorizar seus pontos fracos.'}
  $$('[data-nrx-progress-label]').forEach(el=>el.textContent=label);
  $$('[data-nrx-progress-note]').forEach(el=>el.textContent=note);
}
function syncWeakness(){
  const row=$('#weaknessBars .weak-row');
  let topic='Ainda calibrando',pct=null;
  if(row){
    topic=$('label',row)?.textContent?.trim()||topic;
    pct=pctNumber($('b',row)?.textContent);
  }
  $$('[data-nrx-weak-topic]').forEach(el=>el.textContent=topic);
  $$('[data-nrx-weak-pct]').forEach(el=>{
    el.textContent=pct===null?'—':Math.round(pct)+'%';
    el.classList.remove('nrx-score-low','nrx-score-mid','nrx-score-high');
    if(pct!==null)el.classList.add(toneClass(pct));
  });
}
function syncContinueCard(){
  const host=$('#mobileRecent')||$('#recentAttempts');
  const resume=host?.querySelector('.resume-study-row');
  const recent=host?.querySelector('.recent-item');
  let title='Retomar seus estudos';
  let sub='Continue sua próxima sessão.';
  if(resume){
    title=resume.querySelector('b')?.textContent?.trim()||'Continuar sessão';
    sub=resume.querySelector('small')?.textContent?.trim()||sub;
  }else if(recent){
    title=recent.querySelector('b')?.textContent?.trim()||title;
    sub=recent.querySelector('small')?.textContent?.trim()||sub;
  }
  $$('[data-nrx-continue-title]').forEach(el=>el.textContent=title);
  $$('[data-nrx-continue-sub]').forEach(el=>el.textContent=sub);
}
function syncAll(){syncIdentity();syncProgress();syncWeakness();syncContinueCard();syncSideNav();syncBottom();placeSearch()}

function observe(){
  const targets=['#profileName','#progressPct','#mobileProgressPct','#weaknessBars','#mobileRecent','#recentAttempts','#inicio','#app'];
  targets.forEach(sel=>{
    const el=$(sel);if(!el)return;
    new MutationObserver(()=>syncAll()).observe(el,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});
  });
  window.addEventListener('resize',placeSearch,{passive:true});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-page],.nav-item'))setTimeout(()=>{syncBottom();placeSearch()},40);
  },true);
}

function buildReferenceInternalActions(){
  const q=$('#questoes');
  const setup=$('#sessionSetup');
  if(q&&setup&&!$('.nrx-question-modes',q)){
    const modes=document.createElement('section');
    modes.className='nrx-question-modes';
    const defs=[
      ['◎','Treino por assunto','Escolha um tema específico',()=>{
        setup.classList.remove('hidden');
        $('#studyWorkspace')?.classList.add('hidden');
        setup.scrollIntoView({behavior:'smooth',block:'start'});
      }],
      ['✦','Questões adaptativas','Foco nas suas dificuldades',()=>{
        const trigger=$('#adaptiveButton')||$('#mobileAdaptive')||$('#startAdaptiveFocus');
        if(trigger)trigger.click(); else setup.scrollIntoView({behavior:'smooth',block:'start'});
      }],
      ['▤','Simulado personalizado','Monte seu simulado',()=>go('simulados')],
      ['◌','Questões comentadas','Veja questões e discussões',()=>go('banco')],
      ['▣','Provas do ENEM','Acervo 2009–2025',()=>go('banco')],
      ['×','Meus erros','Revise e evolua',()=>{
        go('desempenho');
        setTimeout(()=>$('#errorNotebook')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
      }]
    ];
    defs.forEach(([icon,title,sub,run])=>{
      const b=document.createElement('button');
      b.type='button';b.className='nrx-question-mode';
      b.innerHTML='<i>'+icon+'</i><span><b>'+title+'</b><small>'+sub+'</small></span><em>›</em>';
      b.addEventListener('click',run);
      modes.appendChild(b);
    });
    setup.insertAdjacentElement('beforebegin',modes);
  }

  const essay=$('#redacao');
  const flow=$('.essay-flow-bar',essay||document);
  if(essay&&flow&&!$('.nrx-essay-tabs',essay)){
    const tabs=document.createElement('div');
    tabs.className='nrx-essay-tabs';
    const defs=[
      ['Corrigir redação',()=>$('#essayText')?.scrollIntoView({behavior:'smooth',block:'center'})],
      ['Temas sugeridos',()=>go('temas')],
      ['Minhas redações',()=>$('#essayHistoryList')?.scrollIntoView({behavior:'smooth',block:'start'})]
    ];
    defs.forEach(([label,run],i)=>{
      const b=document.createElement('button');
      b.type='button';b.textContent=label;
      if(i===0)b.classList.add('active');
      b.addEventListener('click',run);
      tabs.appendChild(b);
    });
    flow.insertAdjacentElement('beforebegin',tabs);
  }
}

function augmentProfileMenu(){
  const menu=$('#profileMenu');
  if(!menu||$('.nrx-profile-extra',menu))return;
  const box=document.createElement('div');
  box.className='nrx-profile-extra';
  const defs=[
    ['◉','Radar ENEM',()=>go('radar')],
    ['▦','Banco de Questões',()=>go('banco')],
    ['▧','Temas de Redação',()=>go('temas')],
    ['◌','Feedback',()=>go('feedback')],
    ['✦','NEXO Jornada',()=>go('ranking')],
    ['＋','Free & Plus',()=>go('planos')],
    ['☾','Trocar tema',()=>$('#themeToggle')?.click()]
  ];
  defs.forEach(([icon,label,run])=>{
    const b=document.createElement('button');
    b.type='button';
    b.innerHTML='<span>'+icon+'</span>'+label;
    b.addEventListener('click',()=>{menu.classList.add('hidden');run()});
    box.appendChild(b);
  });
  const logout=$('#logoutBtn',menu);
  if(logout)menu.insertBefore(box,logout); else menu.appendChild(box);
}

function applyReferenceCopy(){
  const brandSmall=$('.brand small');
  if(brandSmall)brandSmall.textContent='Seu esforço conecta o seu futuro.';
  const search=$('#globalSearch');
  if(search)search.placeholder='Pesquisar no NEXO...';

  const materials=$('#materiais .page-head');
  if(materials){
    const h=materials.querySelector('h2'),p=materials.querySelector('p');
    if(h)h.textContent='Estudar';
    if(p)p.textContent='Aulas, resumos e macetes organizados por matéria.';
  }
  const questions=$('#questoes .page-head');
  if(questions){
    const h=questions.querySelector('h2'),p=questions.querySelector('p');
    if(h)h.textContent='Questões';
    if(p&& !$('#studyWorkspace')?.classList.contains('hidden')){} else if(p)p.textContent='Treine com questões no nível do ENEM.';
  }
  const essay=$('#redacao .page-head');
  if(essay){
    const h=essay.querySelector('h2'),p=essay.querySelector('p');
    if(h)h.textContent='Redação';
    if(p)p.textContent='Escreva, corrija e evolua.';
  }
}
function init(){
  const home=$('#inicio');
  if(!home||$('.nrx-desktop',home))return;
  try{
    const desktop=desktopMarkup(),mobile=mobileMarkup();
    bindReferenceEvents(desktop);bindReferenceEvents(mobile);
    home.prepend(mobile);
    home.prepend(desktop);
    addMobileChrome();
    buildReferenceSidebar();
    buildBottomNav();
    buildReferenceInternalActions();
    augmentProfileMenu();
    applyReferenceCopy();
    document.body.classList.add('nexo-reference-ui');
    observe();
    syncAll();
  }catch(err){
    console.error('NEXO reference UI',err);
    document.body.classList.remove('nexo-reference-ui');
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();