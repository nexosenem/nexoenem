/* NEXO V15 · unified visual language and progressive disclosure */
(function(){
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  const P={
    home:'M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    study:'M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21zm16 0A2.5 2.5 0 0 0 17.5 3H12v16h5.5A2.5 2.5 0 0 1 20 21z',
    question:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-1-6h2v2h-2Zm.1-2.1c0-2.8 3.2-2.6 3.2-5 0-1.2-.9-2-2.2-2-1.1 0-2 .5-2.8 1.4L8 6.9C9 5.7 10.3 5 12.2 5c2.5 0 4.3 1.5 4.3 3.7 0 3.5-3.4 3.6-3.4 5.2z',
    essay:'M5 19h3.2L19 8.2 15.8 5 5 15.8zM14.8 6l3.2 3.2M4 21h16',
    sim:'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
    summary:'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
    planner:'M5 5h14v15H5zM8 3v4m8-4v4M5 9h14M8 13h3m2 0h3m-8 3h3',
    performance:'M4 20V10m5 10V4m5 16v-7m5 7V7',
    community:'M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 20v-2c0-3 2.4-5 5.5-5s5.5 2 5.5 5v2m0 0v-1c0-2.4 1.8-4 4.2-4 1.2 0 2.2.4 2.8 1.1',
    store:'M4 9h16l-1 11H5zM8 9V7a4 4 0 0 1 8 0v2',
    avatar:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.7-4 3.1-6 7-6s6.3 2 7 6',
    nexo:'M7 9c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3Zm10 0c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3ZM12 21c-3.5 0-6-2.2-6-5 0-2.5 2-4 6-4s6 1.5 6 4c0 2.8-2.5 5-6 5Z',
    settings:'M12 15.3a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Zm8-3.3 2-1-2-3.4-2.2.4a7 7 0 0 0-1.6-.9L15.5 5h-7l-.7 2.1c-.6.2-1.1.5-1.6.9L4 7.6 2 11l2 1v1.9l-2 1 2 3.5 2.2-.5c.5.4 1 .7 1.6.9l.7 2.2h7l.7-2.2c.6-.2 1.1-.5 1.6-.9l2.2.5 2-3.5-2-1z',
    more:'M5 7h14M5 12h14M5 17h14',
    bell:'M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5zM10 20h4',
    crown:'M4 8l4 3 4-6 4 6 4-3-2 10H6z',
    moon:'M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 11 20a8 8 0 0 0 9-4.5Z',
    sun:'M12 5V2m0 20v-3m7-7h3M2 12h3m12-5 2-2M5 19l2-2m10 0 2 2M5 5l2 2m5 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    search:'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm5-2 5 5',
    mic:'M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm-7-3a7 7 0 0 0 14 0M12 19v3m-4 0h8',
    target:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    errors:'M12 3 2.8 20h18.4Zm0 6v5m0 3h.01',
    arrow:'M5 12h14m-5-5 5 5-5 5'
  };
  const icon=(name,cls='')=>'<svg class="v15-icon '+cls+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(P[name]||P.more)+'"/></svg>';

  function keyFromLabel(label=''){
    const s=label.toLocaleLowerCase('pt-BR');
    if(/in[ií]cio/.test(s))return'home';
    if(/estudar|biblioteca|materiais/.test(s))return'study';
    if(/quest/.test(s))return'question';
    if(/reda[cç][aã]o/.test(s))return'essay';
    if(/simulad/.test(s))return'sim';
    if(/resumo|macete/.test(s))return'summary';
    if(/planner|semana/.test(s))return'planner';
    if(/desempenho|evolu/.test(s))return'performance';
    if(/comunidade|grupo/.test(s))return'community';
    if(/loja/.test(s))return'store';
    if(/personalizar|avatar/.test(s))return'avatar';
    if(/nexo|assistente|professor/.test(s))return'nexo';
    if(/configura/.test(s))return'settings';
    if(/erro/.test(s))return'errors';
    return'more';
  }

  function decorateIcons(){
    $$('.nrx-side-item').forEach(b=>{
      const slot=b.querySelector(':scope>span'),label=b.querySelector(':scope>b')?.textContent||b.dataset.sidebarLabel||'';
      if(slot)slot.innerHTML=icon(keyFromLabel(label));
    });
    $$('.nrx-shortcut').forEach(b=>{
      const slot=b.querySelector(':scope>i'),label=b.querySelector(':scope>b')?.textContent||'';
      if(slot)slot.innerHTML=icon(keyFromLabel(label));
    });
    $$('.nrx-mob-action').forEach(b=>{
      const slot=b.querySelector(':scope>i'),label=b.querySelector(':scope>b')?.textContent||'';
      if(slot)slot.innerHTML=icon(keyFromLabel(label));
    });
    $$('.nrx-bottom-nav button').forEach(b=>{
      const slot=b.querySelector(':scope>span'),label=b.querySelector(':scope>small')?.textContent||'';
      if(slot)slot.innerHTML=icon(keyFromLabel(label));
    });
    const n=$('#notificationBtn');
    if(n&&!n.querySelector('svg'))n.insertAdjacentHTML('afterbegin',icon('bell'));
    const crown=$('.nrx-mobile-crown');
    if(crown)crown.innerHTML=icon('crown');
    syncThemeIcon();
  }

  function syncThemeIcon(){
    const light=document.body.classList.contains('light');
    const html=icon(light?'sun':'moon');
    const mobile=$('.nrx-mobile-theme');
    if(mobile&&mobile.innerHTML!==html)mobile.innerHTML=html;
    const desktop=$('#themeToggle');
    if(desktop&&desktop.innerHTML!==html)desktop.innerHTML=html;
  }

  function enhanceSearch(){
    const search=$('.topbar .search');
    const input=$('#globalSearch');
    if(!search||!input)return;
    input.placeholder='Pesquisar no Nexo...';
    const leading=search.querySelector(':scope>span');
    if(leading)leading.innerHTML=icon('search');
    if(!search.querySelector('.v15-search-kbd')){
      const k=document.createElement('kbd');k.className='v15-search-kbd';k.textContent='Ctrl K';search.insertBefore(k,$('#globalSearchResults'));
    }
    if(!search.querySelector('.v15-search-mic')){
      const b=document.createElement('button');b.type='button';b.className='v15-search-mic';b.setAttribute('aria-label','Pesquisar por voz');b.innerHTML=icon('mic');
      const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!Speech){b.disabled=true;b.title='Pesquisa por voz não disponível neste navegador';}
      else b.onclick=e=>{
        e.preventDefault();e.stopPropagation();
        const rec=new Speech();rec.lang='pt-BR';rec.interimResults=false;rec.maxAlternatives=1;
        b.classList.add('is-listening');
        rec.onresult=ev=>{
          input.value=ev.results?.[0]?.[0]?.transcript||'';
          input.dispatchEvent(new Event('input',{bubbles:true}));
          input.focus();
        };
        rec.onerror=()=>b.classList.remove('is-listening');
        rec.onend=()=>b.classList.remove('is-listening');
        rec.start();
      };
      search.insertBefore(b,$('#globalSearchResults'));
    }
    if(!window.__nexoV15SearchShortcut){
      window.__nexoV15SearchShortcut=true;
      document.addEventListener('keydown',e=>{
        if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){
          e.preventDefault();input.focus();input.select();
        }
      });
    }
  }

  function enhanceQuestionSetup(){
    const setup=$('#sessionSetup');
    if(!setup||setup.dataset.v15==='1')return;
    setup.dataset.v15='1';
    const guide=$('.nexo-guide-card',setup);
    const quick=document.createElement('div');
    quick.className='v15-study-modes';
    quick.innerHTML=
      '<button type="button" data-v15-mode="topic"><i>'+icon('target')+'</i><span><b>Treino por assunto</b><small>Escolha área e matéria</small></span><em>→</em></button>'+
      '<button type="button" data-v15-mode="adaptive"><i>'+icon('performance')+'</i><span><b>Questões adaptativas</b><small>Foco automático do Nexo Core</small></span><em>→</em></button>'+
      '<button type="button" data-v15-mode="sim"><i>'+icon('sim')+'</i><span><b>Simulado personalizado</b><small>Treine ritmo e resistência</small></span><em>→</em></button>'+
      '<button type="button" data-v15-mode="errors"><i>'+icon('errors')+'</i><span><b>Meus erros</b><small>Refaça o que ainda não consolidou</small></span><em>→</em></button>';
    (guide||setup.firstElementChild)?.insertAdjacentElement('afterend',quick);

    const fields=$('.setup-fields',setup),toggle=$('.toggle-row',setup);
    if(fields&&!$('.v15-advanced-setup',setup)){
      const details=document.createElement('details');
      details.className='v15-advanced-setup';
      details.innerHTML='<summary>Personalizar treino <small>matéria, dificuldade, quantidade e visuais</small><span>+</span></summary><div class="v15-advanced-body"></div>';
      const area=$('.study-area-grid',setup);
      (area||quick).insertAdjacentElement('afterend',details);
      const body=$('.v15-advanced-body',details);body.appendChild(fields);if(toggle)body.appendChild(toggle);
      details.addEventListener('toggle',()=>{const s=details.querySelector('summary>span');if(s)s.textContent=details.open?'−':'+'});
    }

    $('[data-v15-mode="topic"]',quick)?.addEventListener('click',()=>{
      $('.v15-advanced-setup',setup)?.setAttribute('open','');
      $('.study-area-grid',setup)?.scrollIntoView({behavior:'smooth',block:'center'});
    });
    $('[data-v15-mode="adaptive"]',quick)?.addEventListener('click',()=>{try{window.startAdaptive?.()}catch(_){}});
    $('[data-v15-mode="sim"]',quick)?.addEventListener('click',()=>document.querySelector('[data-page="simulados"]')?.click());
    $('[data-v15-mode="errors"]',quick)?.addEventListener('click',()=>{
      const b=$('#startErrorReview');
      if(b)b.click();else document.querySelector('[data-page="desempenho"]')?.click();
    });
  }

  function enhanceEssay(){
    const page=$('#redacao');
    if(!page||page.dataset.v15==='1')return;
    page.dataset.v15='1';
    const head=$('.essay-page-head',page);
    const tabs=document.createElement('nav');tabs.className='v15-essay-tabs';tabs.setAttribute('aria-label','Atalhos da redação');
    tabs.innerHTML='<button type="button" class="active" data-v15-essay="write">Corrigir redação</button><button type="button" data-v15-essay="themes">Temas sugeridos</button><button type="button" data-v15-essay="history">Minhas redações</button>';
    head?.insertAdjacentElement('afterend',tabs);
    $('[data-v15-essay="write"]',tabs)?.addEventListener('click',()=>$('.essay-editor-v2',page)?.scrollIntoView({behavior:'smooth'}));
    $('[data-v15-essay="themes"]',tabs)?.addEventListener('click',()=>document.querySelector('[data-page="temas"]')?.click());
    $('[data-v15-essay="history"]',tabs)?.addEventListener('click',()=>$('.essay-history-card',page)?.scrollIntoView({behavior:'smooth'}));
  }

  function enhanceMaterials(){
    const page=$('#materiais');
    if(!page||page.dataset.v15==='1')return;
    page.dataset.v15='1';
    const head=$('.nexo-content-head',page);
    if(head){
      const intro=head.querySelector('h2');if(intro)intro.textContent='Estudar';
      const p=head.querySelector('p');if(p)p.textContent='Aulas, resumos e macetes organizados para você estudar na ordem certa.';
    }
    const deck=$('.library-filter-deck',page);
    if(deck&&!deck.previousElementSibling?.classList.contains('v15-filter-label')){
      const l=document.createElement('div');l.className='v15-filter-label';l.innerHTML='<b>Filtros avançados</b><small>opcional</small>';deck.insertAdjacentElement('beforebegin',l);
    }
  }

  function enhanceHome(){
    const desktop=$('.nrx-desktop'),mobile=$('.nrx-mobile');
    [desktop,mobile].forEach(root=>{
      if(!root)return;
      root.querySelectorAll('.nrx-shortcut,.nrx-mob-action').forEach(b=>b.setAttribute('data-v15-card',''));
    });
  }

  function removeRedundantFloatingSearch(){
    $$('button').forEach(b=>{
      const a=(b.getAttribute('aria-label')||'').toLowerCase();
      const t=(b.textContent||'').trim();
      const fixed=getComputedStyle(b).position==='fixed';
      if(fixed&&(a.includes('pesquis')||t==='⌕'||t==='🔍')&&!b.closest('.topbar'))b.classList.add('v15-hide-redundant-search');
    });
  }

  function boot(){
    decorateIcons();enhanceSearch();enhanceQuestionSetup();enhanceEssay();enhanceMaterials();enhanceHome();removeRedundantFloatingSearch();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    boot();
    let ticks=0;const timer=setInterval(()=>{boot();if(++ticks>35)clearInterval(timer)},400);
    new MutationObserver(()=>{decorateIcons();syncThemeIcon()}).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:false});
  });
})();