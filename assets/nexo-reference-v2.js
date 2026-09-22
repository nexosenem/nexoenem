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
function openCommunity(){
  document.body.dataset.nrxJourneyView='community';
  go('ranking');
  setTimeout(()=>{
    try{
      if(typeof window.setJourneyTab==='function')window.setJourneyTab('groups');
      else $('[data-journey-tab="groups"]')?.click();
    }catch(_){$('[data-journey-tab="groups"]')?.click()}
  },120);
}
function openMaterials(view='study'){
  document.body.dataset.nrxMaterialsView=view;
  go('materiais');
  setTimeout(()=>{
    const type=$('#materialTypeFilter');
    if(type&&type.value){
      type.value='';
      type.dispatchEvent(new Event('change',{bubbles:true}));
    }else if(typeof renderMaterials==='function'){
      renderMaterials();
    }
  },80);
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
      <button type="button" class="nrx-preview" data-nrx-materials-view="study">
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
    ['Resumo','▧','Aulas e PDFs',()=>openMaterials('resumos')],
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
      <div class="nrx-mob-hero-copy">
        <span class="nrx-mob-hello"><span data-nrx-greeting>Boa noite</span>, <b data-nrx-name>Aluno</b>!</span>
        <h1>Disciplina hoje,<br>resultados amanhã.</h1>
        <p>O ENEM é uma maratona, e você não está sozinho.</p>
      </div>
      <div class="nrx-mob-hero-media">
        <img src="./assets/nexo-family/bust-confiante.avif" alt="Professor Nexo">
      </div>
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
    ['Resumo','▧',()=>openMaterials('resumos')],
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
    ['study','▣','Estudar'],
    ['questoes','✓','Questões'],
    ['redacao','✎','Redação'],
    ['more','☰','Mais']
  ];
  items.forEach(([page,icon,label])=>{
    const b=document.createElement('button');
    b.type='button';b.dataset.nrxBottom=page;
    b.innerHTML='<span>'+icon+'</span><small>'+label+'</small>';
    b.addEventListener('click',e=>{
      if(page==='more'){
        e.preventDefault();
        e.stopPropagation();
        $('#moreMobile')?.click();
        setTimeout(syncBottom,0);
      }else if(page==='study'){
        openMaterials('study');
      }else go(page);
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
  const primary=new Set(['inicio','materiais','questoes','redacao']);
  const menuOpen=document.body.classList.contains('mobile-menu-open');
  document.querySelectorAll('[data-nrx-bottom]').forEach(b=>{
    const p=b.dataset.nrxBottom;
    const moreActive=p==='more'&&(menuOpen||!primary.has(active));
    const studyActive=p==='study'&&active==='materiais'&&document.body.dataset.nrxMaterialsView!=='resumos';
    b.classList.toggle('active',p===active||studyActive||moreActive);
  });
  syncShellVisibility();
}


function referenceSecondaryTools(){
  return [
    ['materiais','▧','Materiais PDF',()=>openMaterials('study')],
    ['simulados','▤','Simulados',()=>go('simulados')],
    ['semana','▦','Semana NEXO',()=>go('semana')],
    ['focos','◎','Meus Focos',()=>go('focos')],
    ['radar','◉','Radar ENEM',()=>go('radar')],
    ['banco','▦','Banco de Questões',()=>go('banco')],
    ['temas','▧','Temas de Redação',()=>go('temas')],
    ['feedback','◌','Feedback',()=>go('feedback')],
    ['ranking','✦','NEXO Jornada',()=>{document.body.dataset.nrxJourneyView='';go('ranking')}],
    ['store','♕','Loja NEXO',openStore],
    ['avatar','✦','Personalizar',openAvatar],
    ['planos','＋','Free & Plus',()=>go('planos')],
    ['nexo','🐾','Professor Nexo',openNexo],
    ['settings','⚙','Configurações',openExperience],
    ['admin','♛','Área do Admin',()=>go('admin'),true]
  ];
}
function closeReferenceMore(){
  $('.nrx-side-more-panel')?.classList.add('hidden');
  $('.nrx-side-more-toggle')?.setAttribute('aria-expanded','false');
}
function runReferenceSecondary(key){
  const item=referenceSecondaryTools().find(x=>x[0]===key);
  if(!item)return;
  closeReferenceMore();
  $('#profileMenu')?.classList.add('hidden');
  item[3]();
  setTimeout(syncSideNav,60);
}
function buildReferenceSecondaryAccess(nav,sidebar){
  if(!nav||!sidebar||$('.nrx-side-more-toggle',nav))return;
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='nrx-side-item nrx-side-more-toggle';
  toggle.dataset.nrxSide='more';
  toggle.setAttribute('aria-expanded','false');
  toggle.innerHTML='<span>•••</span><b>Mais recursos</b>';
  const community=$('[data-nrx-side="community"]',nav);
  if(community)nav.insertBefore(toggle,community);else nav.appendChild(toggle);

  const panel=document.createElement('div');
  panel.className='nrx-side-more-panel hidden';
  panel.innerHTML='<div class="nrx-side-more-head"><div><b>Mais recursos</b><small>Tudo do NEXO continua aqui</small></div><button type="button" data-nrx-more-close aria-label="Fechar">×</button></div><div class="nrx-side-more-grid"></div>';
  const grid=$('.nrx-side-more-grid',panel);
  referenceSecondaryTools().forEach(([key,icon,label,,adminOnly])=>{
    const b=document.createElement('button');
    b.type='button';b.dataset.nrxTarget=key;
    if(adminOnly)b.dataset.nrxAdminTool='1';
    b.innerHTML='<span>'+icon+'</span><b>'+label+'</b>';
    b.addEventListener('click',()=>runReferenceSecondary(key));
    grid.appendChild(b);
  });
  $('[data-nrx-more-close]',panel)?.addEventListener('click',closeReferenceMore);
  toggle.addEventListener('click',e=>{
    e.stopPropagation();
    const open=panel.classList.contains('hidden');
    closeReferenceMore();
    panel.classList.toggle('hidden',!open);
    toggle.setAttribute('aria-expanded',String(open));
  });
  sidebar.appendChild(panel);
}
function buildReferenceProfileTools(){
  const menu=$('#profileMenu');
  if(!menu||$('.nrx-profile-tools',menu))return;
  const section=document.createElement('section');
  section.className='nrx-profile-tools';
  section.innerHTML='<div class="nrx-profile-tools-head"><b>Acesso rápido</b><small>Busca, tema e todos os módulos do NEXO</small></div><div class="nrx-profile-utility-grid"></div><div class="nrx-profile-tools-grid"></div>';
  const utilities=$('.nrx-profile-utility-grid',section);
  const searchBtn=document.createElement('button');
  searchBtn.type='button';searchBtn.dataset.nrxUtility='search';
  searchBtn.innerHTML='<span>⌕</span><b>Pesquisar no NEXO</b>';
  searchBtn.addEventListener('click',()=>{
    menu.classList.add('hidden');
    go('inicio');
    setTimeout(()=>{placeSearch();const input=$('#globalSearch');if(input){try{input.focus({preventScroll:false})}catch(_){input.focus()}}},80);
  });
  utilities.appendChild(searchBtn);
  const themeBtn=document.createElement('button');
  themeBtn.type='button';themeBtn.dataset.nrxUtility='theme';
  themeBtn.innerHTML='<span>◐</span><b>Tema claro / escuro</b>';
  themeBtn.addEventListener('click',()=>$('#themeToggle')?.click());
  utilities.appendChild(themeBtn);
  const grid=$('.nrx-profile-tools-grid',section);
  referenceSecondaryTools().forEach(([key,icon,label,,adminOnly])=>{
    const b=document.createElement('button');
    b.type='button';b.dataset.nrxTarget=key;
    if(adminOnly)b.dataset.nrxAdminTool='1';
    b.innerHTML='<span>'+icon+'</span><b>'+label+'</b>';
    b.addEventListener('click',()=>runReferenceSecondary(key));
    grid.appendChild(b);
  });
  const firstAction=menu.querySelector('button');
  if(firstAction)menu.insertBefore(section,firstAction);else menu.appendChild(section);
}
function syncReferenceAccess(){
  const adminShortcut=$('#profileAdminShortcut');
  const hasProfile=typeof state!=='undefined'&&Boolean(state?.profile);
  const adminVisible=hasProfile
    ? state.profile.role==='admin'
    : Boolean(adminShortcut&&!adminShortcut.classList.contains('hidden'));
  $$('[data-nrx-admin-tool]').forEach(el=>el.classList.toggle('hidden',!adminVisible));
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
    ['study','▣','Estudar',()=>openMaterials('study')],
    ['questoes','✓','Questões',()=>go('questoes')],
    ['redacao','✎','Redação',()=>go('redacao')],
    ['simulados','▤','Simulados',()=>go('simulados')],
    ['resumos','▧','Resumo e Macetes',()=>openMaterials('resumos')],
    ['semana','▦','Planner',()=>go('semana')],
    ['desempenho','▥','Meu Desempenho',()=>go('desempenho')],
    ['community','♟','Comunidade',openCommunity],
    ['store','♕','Loja NEXO',openStore],
    ['avatar','✦','Personalizar',openAvatar],
    ['nexo','🐾','Nexo (Assistente)',openNexo],
    ['settings','⚙','Configurações',openExperience]
  ];
  items.forEach(([key,icon,label,run])=>{
    const b=document.createElement('button');
    b.type='button';b.className='nrx-side-item';b.dataset.nrxSide=key;
    b.dataset.sidebarLabel=label;b.title=label;
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
  buildReferenceSecondaryAccess(nav,sidebar);
  buildReferenceProfileTools();
  syncReferenceAccess();
}
function syncSideNav(){
  const active=$('.page.active')?.id||'inicio';
  let selected=active;
  const secondary=new Set(['focos','radar','banco','temas','feedback','planos','admin']);
  if(active==='materiais')selected=document.body.dataset.nrxMaterialsView||'study';
  if(secondary.has(active))selected='more';
  if(active==='ranking'){
    const journey=document.body.dataset.nrxJourneyView||'';
    selected=['community','store','avatar'].includes(journey)?journey:'more';
  }
  $$('[data-nrx-side]').forEach(b=>b.classList.toggle('active',b.dataset.nrxSide===selected));
  const name=firstName();
  $$('[data-nrx-side-name]').forEach(el=>el.textContent=name);
  const role=$('#profileRole')?.textContent?.trim()||'Estudante';
  $$('[data-nrx-side-plan]').forEach(el=>el.textContent=role);
  syncReferenceAccess();
}
function syncMobileThemeButton(){
  const button=$('.nrx-mobile-theme');
  if(!button)return;
  const light=document.body.classList.contains('light');
  button.textContent=light?'☀':'☾';
  button.setAttribute('aria-label',light?'Ativar modo escuro':'Ativar modo claro');
  button.title=light?'Ativar modo escuro':'Ativar modo claro';
}
function addMobileChrome(){
  const top=$('.topbar');
  if(!top)return;
  if(!$('.nrx-mobile-brand',top)){
    const brand=document.createElement('div');
    brand.className='nrx-mobile-brand';
    brand.setAttribute('aria-label','Nexo');
    brand.innerHTML='<span class="nrx-mobile-wordmark"><span class="nrx-logo-word"><span class="nrx-logo-letter">N</span><span class="nrx-logo-rest">exo</span></span></span>';
    top.prepend(brand);
  }
  if(!$('.nrx-mobile-theme',top)){
    const theme=document.createElement('button');
    theme.type='button';theme.className='nrx-mobile-theme';
    theme.addEventListener('click',()=>{
      $('#themeToggle')?.click();
      requestAnimationFrame(syncMobileThemeButton);
    });
    top.appendChild(theme);
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
  syncMobileThemeButton();
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
  $$('[data-nrx-materials-view]',root).forEach(el=>el.addEventListener('click',()=>openMaterials(el.dataset.nrxMaterialsView||'study')));
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
function syncQuestionModes(){
  const modes=$('.nrx-question-modes');
  const workspace=$('#studyWorkspace');
  if(modes&&workspace)modes.classList.toggle('hidden',!workspace.classList.contains('hidden'));
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
function syncMobileHomePriority(){
  const home=$('#inicio');
  const mobile=$('.nrx-mobile',home);
  const homeActive=Boolean(home?.classList.contains('active'));
  document.body.classList.toggle('nrx-home-active',homeActive);
  if(innerWidth<=760&&home&&mobile&&home.firstElementChild!==mobile)home.prepend(mobile);
}
function syncAll(){syncIdentity();syncProgress();syncWeakness();syncContinueCard();syncQuestionModes();syncLegacyHomeTools();syncSideNav();syncBottom();syncMobileThemeButton();syncMobileHomePriority();placeSearch()}

let referenceSyncQueued=false;
function scheduleReferenceSync(){
  if(referenceSyncQueued)return;
  referenceSyncQueued=true;
  requestAnimationFrame(()=>{
    referenceSyncQueued=false;
    syncAll();
  });
}
function observe(){
  const observer=new MutationObserver(scheduleReferenceSync);
  const contentTargets=['#profileName','#profileRole','#profileAdminShortcut','#progressPct','#mobileProgressPct','#weaknessBars','#mobileRecent','#recentAttempts','#studyWorkspace'];
  contentTargets.forEach(sel=>{
    const el=$(sel);if(!el)return;
    observer.observe(el,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});
  });
  Array.from(document.querySelectorAll('[data-nexo-today-title],[data-nexo-today-text]'))
    .filter(el=>!el.closest?.('.nrx-home'))
    .forEach(el=>observer.observe(el,{subtree:true,childList:true,characterData:true}));
  document.querySelectorAll('.page').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
  const app=$('#app');
  if(app)observer.observe(app,{attributes:true,attributeFilter:['class']});
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',()=>{placeSearch();scheduleReferenceSync()},{passive:true});
  document.addEventListener('click',e=>{
    if(!e.target.closest?.('.nrx-side-more-panel')&&!e.target.closest?.('.nrx-side-more-toggle'))closeReferenceMore();
    const materialPage=e.target.closest?.('[data-page="materiais"]');
    if(materialPage&&!materialPage.closest?.('.nrx-home'))document.body.dataset.nrxMaterialsView='study';
    const journeyTab=e.target.closest?.('[data-journey-tab]');
    if(journeyTab){
      const tab=journeyTab.dataset.journeyTab;
      document.body.dataset.nrxJourneyView=tab==='groups'?'community':tab;
      setTimeout(syncSideNav,40);
    }
    if(e.target.closest?.('[data-page],.nav-item'))setTimeout(()=>{syncBottom();syncSideNav();placeSearch()},40);
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
        const advanced=$('#v15AdvancedQuestionSetup',setup);
        if(advanced)advanced.open=true;
        setup.classList.add('v15-advanced-open');
        (advanced||setup).scrollIntoView({behavior:'smooth',block:'start'});
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

function clickLegacyHome(selector){
  const target=$$(selector).find(el=>!el.closest?.('.nrx-home'));
  target?.click();
}
function openReferenceContext(){
  const bar=$('#nexoContextBar');
  if(!bar)return;
  bar.classList.remove('is-dismissed');
  document.body.classList.add('nrx-context-open');
  try{if(typeof renderNexoContextBar==='function')renderNexoContextBar($('.page.active')?.id||'inicio')}catch(_){}
}
function closeReferenceContext(){
  document.body.classList.remove('nrx-context-open');
}
function syncLegacyHomeTools(){
  const srcTitle=$$('[data-nexo-today-title]').find(el=>!el.closest?.('.nrx-home'))?.textContent?.trim();
  const srcText=$$('[data-nexo-today-text]').find(el=>!el.closest?.('.nrx-home'))?.textContent?.trim();
  $$('[data-nrx-home-now-title]').forEach(el=>el.textContent=srcTitle||'Seu próximo melhor passo');
  $$('[data-nrx-home-now-text]').forEach(el=>el.textContent=srcText||'O NEXO está conectando seu conteúdo, treino e desempenho.');
}
function augmentProfileMenu(){
  const menu=$('#profileMenu');
  if(!menu||$('.nrx-profile-extra',menu))return;
  const box=document.createElement('section');
  box.className='nrx-profile-extra';
  box.innerHTML='<div class="nrx-profile-extra-head"><span>✦ NEXO HOJE</span><b data-nrx-home-now-title>Seu próximo melhor passo</b><small data-nrx-home-now-text>O NEXO está conectando seu conteúdo, treino e desempenho.</small></div><div class="nrx-profile-extra-grid"></div>';
  const grid=$('.nrx-profile-extra-grid',box);
  const defs=[
    ['next','▶','Próximo passo',()=>clickLegacyHome('[data-nexo-today-action]')],
    ['why','?','Por que isso?',()=>clickLegacyHome('[data-nexo-why]')],
    ['core','✦','NEXO Core',()=>clickLegacyHome('[data-core-start]')],
    ['today','▦','Plano de hoje',()=>clickLegacyHome('[data-today-start]')],
    ['mission','▥','Missão NEXO',()=>clickLegacyHome('[data-command-start]')],
    ['visual','◉','Questões visuais',()=>$('#quickVisual')?.click()],
    ['ten','10','Sessão rápida',()=>$('#quickTen')?.click()],
    ['guide','?','Guia da página',openReferenceContext]
  ];
  defs.forEach(([key,icon,label,run])=>{
    const b=document.createElement('button');
    b.type='button';b.dataset.nrxHomeTool=key;
    b.innerHTML='<span>'+icon+'</span><b>'+label+'</b>';
    b.addEventListener('click',()=>{menu.classList.add('hidden');run()});
    grid.appendChild(b);
  });
  const logout=$('#logoutBtn',menu);
  if(logout)menu.insertBefore(box,logout);else menu.appendChild(box);
  syncLegacyHomeTools();
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
$('#contextClose')?.addEventListener('click',closeReferenceContext);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeReferenceContext()});

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