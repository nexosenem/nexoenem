/* NEXO V15 · unified premium interface + progressive disclosure */
(function(){
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  const ICONS={
    home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>',
    study:'<path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12H7.5A2.5 2.5 0 0 1 5 16.5z"/><path d="M5 16.5A2.5 2.5 0 0 1 7.5 14H19"/><path d="M8 8h7M8 11h5"/>',
    questions:'<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    essay:'<path d="M5 19h4l9.5-9.5a2.1 2.1 0 0 0-3-3L6 16z"/><path d="m13.7 8.3 3 3"/><path d="M5 5h6"/>',
    simulation:'<path d="M5 3.5h14v17H5z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    summary:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    planner:'<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M7 3v5M17 3v5M3.5 10h17"/><path d="M8 14h2M13 14h2M8 17h2M13 17h2"/>',
    performance:'<path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/><path d="M3 19h19"/>',
    community:'<path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 10a2.5 2.5 0 1 0 0-5"/><path d="M3.5 19c.5-3.3 2.2-5 5-5s4.5 1.7 5 5M14 14.2c2.9-.2 4.8 1.4 5.3 4.8"/>',
    store:'<path d="M4 8h16l-1.2 11H5.2z"/><path d="M7 8c0-2.8 1.7-4.5 5-4.5S17 5.2 17 8"/>',
    avatar:'<path d="m12 3 1.5 4.2L18 9l-4.5 1.8L12 15l-1.5-4.2L6 9l4.5-1.8z"/><path d="M5 17h14"/>',
    nexo:'<path d="M7.5 10.5c-1.6-1.5-2.2-3.2-1.2-4.4 1-1.1 2.7-.4 4.1 1.4M16.5 10.5c1.6-1.5 2.2-3.2 1.2-4.4-1-1.1-2.7-.4-4.1 1.4"/><circle cx="12" cy="13" r="5"/><path d="M10.2 13.5h.1M13.7 13.5h.1M10 16c1.3.8 2.7.8 4 0"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.5-2.5 1A8 8 0 0 0 14.6 6L14.2 3h-4.4L9.4 6A8 8 0 0 0 7.6 7L5.1 6 3 9.5 5 11a7.4 7.4 0 0 0 0 2l-2 1.5L5.1 18l2.5-1A8 8 0 0 0 9.4 18l.4 3h4.4l.4-3a8 8 0 0 0 1.8-1l2.5 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z"/>',
    more:'<path d="M5 7h14M5 12h14M5 17h14"/>',
    search:'<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
    moon:'<path d="M19 15.5A8 8 0 0 1 8.5 5a8.5 8.5 0 1 0 10.5 10.5z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    crown:'<path d="m3.5 7.5 4 3 4.5-6 4.5 6 4-3-1.6 10.5H5.1z"/><path d="M6 21h12"/>',
    bell:'<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 5 2 5.5 2 7H4.5c0-1.5 2-2 2-7"/><path d="M10 20h4"/>',
    mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
    target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M22 12h-3"/>',
    errors:'<path d="M12 3 3.5 19h17z"/><path d="M12 9v4M12 16h.01"/>',
    spark:'<path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z"/><path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
    chevron:'<path d="m9 6 6 6-6 6"/>',
    play:'<path d="m8 5 11 7-11 7z"/>'
  };

  function svg(name,cls=''){
    const body=ICONS[name]||ICONS.spark;
    return '<svg class="v15-icon '+cls+'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';
  }

  const sideMap={inicio:'home',study:'study',questoes:'questions',redacao:'essay',simulados:'simulation',resumos:'summary',semana:'planner',desempenho:'performance',community:'community',store:'store',avatar:'avatar',nexo:'nexo',settings:'settings',more:'more'};
  const mobileLabelMap={'Questões':'questions','Redação':'essay','Simulados':'simulation','Resumo':'summary','Planner':'planner','Meu Desempenho':'performance','Loja':'store','Nexo (IA)':'nexo'};
  const shortcutMap={'Questões':'questions','Redação':'essay','Simulados':'simulation','Resumo':'summary','Planner':'planner','Loja NEXO':'store'};
  const bottomMap={inicio:'home',study:'study',questoes:'questions',redacao:'essay',more:'more'};

  function replaceIcon(host,name){
    if(!host||host.dataset.v15Icon===name)return;
    host.dataset.v15Icon=name;
    host.innerHTML=svg(name);
  }

  function applyIconography(){
    $$('[data-nrx-side]').forEach(btn=>replaceIcon(btn.querySelector(':scope>span'),sideMap[btn.dataset.nrxSide]||'spark'));
    $$('.nrx-mob-action').forEach(btn=>replaceIcon(btn.querySelector(':scope>i'),mobileLabelMap[(btn.querySelector('b')?.textContent||'').trim()]||'spark'));
    $$('.nrx-shortcut').forEach(btn=>replaceIcon(btn.querySelector(':scope>i'),shortcutMap[(btn.querySelector('b')?.textContent||'').trim()]||'spark'));
    $$('[data-nrx-bottom]').forEach(btn=>replaceIcon(btn.querySelector(':scope>span'),bottomMap[btn.dataset.nrxBottom]||'more'));

    const theme=$('.nrx-mobile-theme');
    if(theme){
      theme.innerHTML=svg(document.body.classList.contains('light')?'sun':'moon');
      theme.dataset.v15Icon='theme';
    }
    replaceIcon($('.nrx-mobile-crown'),'crown');

    const notice=$('#notificationBtn');
    if(notice){
      notice.innerHTML=svg('bell')+'<i></i>';
      notice.dataset.v15Icon='bell';
    }
    const originalTheme=$('#themeToggle');
    if(originalTheme)originalTheme.innerHTML=svg(document.body.classList.contains('light')?'sun':'moon');

    $$('#studyAreaGrid>button').forEach(btn=>{
      const key=(btn.dataset.studyArea||'').toLowerCase();
      const name=key.includes('matem')?'target':key.includes('natureza')?'spark':key.includes('humanas')?'community':'study';
      replaceIcon(btn.querySelector(':scope>span'),name);
    });

    $$('#simulados .sim-card').forEach(btn=>{
      const title=(btn.querySelector('b')?.textContent||'').toLowerCase();
      const name=title.includes('real')||title.includes('enem')?'simulation':title.includes('diagn')?'target':title.includes('core')?'spark':title.includes('matem')?'target':'questions';
      replaceIcon(btn.querySelector(':scope>span'),name);
    });
  }

  function enhanceSearch(){
    const input=$('#globalSearch');
    const box=input?.closest('.search');
    if(!input||!box)return;
    input.placeholder='Pesquisar no NEXO...';
    const lead=box.querySelector(':scope>span');
    if(lead&&!lead.dataset.v15SearchIcon){lead.innerHTML=svg('search');lead.dataset.v15SearchIcon='1'}

    if(innerWidth>760&&!box.querySelector('.v15-search-hint')){
      const hint=document.createElement('kbd');
      hint.className='v15-search-hint';
      hint.textContent='Ctrl K';
      box.appendChild(hint);
    }

    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(innerWidth<=760&&SpeechRecognition&&!box.querySelector('.v15-voice-search')){
      const b=document.createElement('button');
      b.type='button';
      b.className='v15-voice-search';
      b.setAttribute('aria-label','Pesquisar por voz');
      b.innerHTML=svg('mic');
      b.onclick=e=>{
        e.preventDefault();e.stopPropagation();
        const rec=new SpeechRecognition();
        rec.lang='pt-BR';rec.interimResults=false;rec.maxAlternatives=1;
        b.classList.add('listening');
        rec.onresult=ev=>{
          input.value=ev.results?.[0]?.[0]?.transcript||'';
          input.dispatchEvent(new Event('input',{bubbles:true}));
          input.focus();
        };
        rec.onerror=()=>b.classList.remove('listening');
        rec.onend=()=>b.classList.remove('listening');
        try{rec.start()}catch(_){b.classList.remove('listening')}
      };
      box.appendChild(b);
    }

    let example=$('.v15-search-example');
    if(innerWidth>760&&!example){
      example=document.createElement('small');
      example.className='v15-search-example';
      example.textContent='Ex.: “redação”, “meu desempenho”, “simulados”';
      box.insertAdjacentElement('afterend',example);
    }
  }

  function enhanceResume(){
    const card=$('.nrx-mob-continue');
    if(!card||card.dataset.v15Resume)return;
    card.dataset.v15Resume='1';
    const copy=card.querySelector(':scope>div');
    if(copy&&!copy.querySelector('.v15-resume-track')){
      const track=document.createElement('div');
      track.className='v15-resume-track';
      track.innerHTML='<i></i><span></span>';
      copy.appendChild(track);
    }
    const play=card.querySelector('.nrx-play');
    if(play)play.innerHTML=svg('play');
    syncResume();
  }

  function syncResume(){
    const card=$('.nrx-mob-continue');
    if(!card)return;
    let saved=null;
    try{saved=typeof readPersistedStudySession==='function'?readPersistedStudySession():null}catch(_){}
    const title=card.querySelector('[data-nrx-continue-title]');
    const sub=card.querySelector('[data-nrx-continue-sub]');
    const track=card.querySelector('.v15-resume-track i');
    const meta=card.querySelector('.v15-resume-track span');
    if(saved){
      const done=Math.max(0,Math.min(Number(saved.index||0),Number(saved.size||0)));
      const total=Math.max(1,Number(saved.size||1));
      const pct=Math.round(done/total*100);
      if(title)title.textContent=saved.subject||saved.area||'Continuar sessão';
      if(sub)sub.textContent=saved.topic||saved.mode||'Retome exatamente de onde parou';
      if(track)track.style.width=pct+'%';
      if(meta)meta.textContent=done+'/'+total+' questões';
    }else{
      if(track)track.style.width='0%';
      if(meta)meta.textContent='próxima sessão';
    }
  }

  function addQuestionModes(){
    const setup=$('#sessionSetup');
    if(!setup||$('#v15QuestionModes'))return;
    const grid=document.createElement('div');
    grid.id='v15QuestionModes';
    grid.className='v15-question-modes';
    grid.innerHTML=
      '<button type="button" data-v15-qmode="topic">'+svg('study')+'<span><b>Treino por assunto</b><small>Escolha matéria, dificuldade e quantidade</small></span>'+svg('chevron')+'</button>'+
      '<button type="button" data-v15-qmode="adaptive">'+svg('spark')+'<span><b>Questões adaptativas</b><small>O NEXO prioriza seus pontos fracos</small></span>'+svg('chevron')+'</button>'+
      '<button type="button" data-v15-qmode="simulation">'+svg('simulation')+'<span><b>Simulado personalizado</b><small>Tempo, áreas e estratégia de prova</small></span>'+svg('chevron')+'</button>'+
      '<button type="button" data-v15-qmode="errors">'+svg('errors')+'<span><b>Meus erros</b><small>Revise questões e padrões recorrentes</small></span>'+svg('chevron')+'</button>';
    const guide=$('.nexo-guide-card',setup);
    guide?.insertAdjacentElement('afterend',grid);

    $('[data-v15-qmode="topic"]',grid)?.addEventListener('click',()=>{
      $('#studyAreaGrid')?.scrollIntoView({behavior:'smooth',block:'center'});
      setup.classList.add('v15-advanced-open');
    });
    $('[data-v15-qmode="adaptive"]',grid)?.addEventListener('click',()=>{
      try{ if(typeof startAdaptive==='function')return startAdaptive() }catch(_){}
      $('#startAdaptiveFocus')?.click();
    });
    $('[data-v15-qmode="simulation"]',grid)?.addEventListener('click',()=>document.querySelector('[data-page="simulados"]')?.click());
    $('[data-v15-qmode="errors"]',grid)?.addEventListener('click',()=>{
      try{ if(typeof runSiteSearchAction==='function')return runSiteSearchAction('erros') }catch(_){}
      document.querySelector('[data-page="desempenho"]')?.click();
    });

    const advanced=document.createElement('div');
    advanced.className='v15-advanced-label';
    advanced.innerHTML='<span>Personalizar treino</span><small>área · matéria · dificuldade · quantidade · visual</small>';
    $('#studyAreaGrid',setup)?.insertAdjacentElement('beforebegin',advanced);
  }

  function addEssayTabs(){
    const page=$('#redacao');
    const head=$('.essay-page-head',page);
    if(!page||!head||$('#v15EssayTabs'))return;
    const nav=document.createElement('nav');
    nav.id='v15EssayTabs';
    nav.className='v15-essay-tabs';
    nav.innerHTML='<button type="button" class="active" data-v15-essay-tab="write">Corrigir redação</button><button type="button" data-v15-essay-tab="themes">Temas sugeridos</button><button type="button" data-v15-essay-tab="history">Minhas redações</button>';
    head.insertAdjacentElement('afterend',nav);
    $('[data-v15-essay-tab="write"]',nav).onclick=()=>$('.essay-editor-v2',page)?.scrollIntoView({behavior:'smooth',block:'start'});
    $('[data-v15-essay-tab="themes"]',nav).onclick=()=>document.querySelector('[data-page="temas"]')?.click();
    $('[data-v15-essay-tab="history"]',nav).onclick=()=>$('.essay-history-card',page)?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function addContextTutorFab(){
    if($('#v15TutorFab'))return;
    const b=document.createElement('button');
    b.id='v15TutorFab';
    b.type='button';
    b.className='v15-tutor-fab';
    b.setAttribute('aria-label','Perguntar ao Professor Nexo');
    b.innerHTML=svg('nexo')+'<span>Professor Nexo</span>';
    b.onclick=()=>$('#openNexoFromMenu')?.click();
    document.body.appendChild(b);
  }

  function markLayout(){
    const active=$('.page.active')?.id||'inicio';
    document.body.dataset.v15Page=active;
  }

  function apply(){
    applyIconography();
    enhanceSearch();
    enhanceResume();
    addQuestionModes();
    addEssayTabs();
    addContextTutorFab();
    markLayout();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    apply();
    const observer=new MutationObserver(()=>requestAnimationFrame(apply));
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',apply,{passive:true});
    setInterval(()=>{syncResume();applyIconography();markLayout()},1800);
  });
})();