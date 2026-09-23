/* NEXO V17 · living interface
   V17.1 — foundation + semantic state normalization */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const reduceMotion=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function scoreClass(value){
    const n=Number(String(value==null?'':value).replace(',','.').replace(/[^\d.-]/g,''));
    if(!Number.isFinite(n))return '';
    return n<=39?'nx17-score-low':n<=79?'nx17-score-mid':'nx17-score-high';
  }
  function normalizeScores(){
    $('[data-nrx-pct],[data-nrx-weak-pct],#progressPct,#mobileProgressPct,.percent,.percentage,[data-percent]').forEach(el=>{
      const cls=scoreClass(el.textContent||el.dataset.percent);
      const tones=['nx17-score-low','nx17-score-mid','nx17-score-high'];
      const current=tones.find(x=>el.classList.contains(x))||'';
      if(current===cls)return;
      tones.forEach(x=>el.classList.remove(x));
      if(cls)el.classList.add(cls);
    });
  }
  function markInteractive(){
    $$('button:not([type]),.nrx-shortcut,.nrx-mob-action,.nrx-side-item').forEach(el=>{
      if(el.tagName==='BUTTON'&&!el.getAttribute('type'))el.setAttribute('type','button');
    });
    $$('img:not([alt])').forEach(img=>img.setAttribute('alt',''));
  }
  function markPage(){
    const active=$('.page.active');
    if(active)document.body.dataset.nx17Page=active.id||'';
  }
  function apply(){
    document.body.classList.add('v17-live');
    normalizeScores();
    markInteractive();
    markPage();
  }
  window.NEXOV17=window.NEXOV17||{};
  window.NEXOV17.scoreClass=scoreClass;
  window.NEXOV17.reduceMotion=reduceMotion;
  window.NEXOV17.refresh=apply;
  const boot=()=>{
    apply();
    let timer=0;
    const schedule=()=>{if(timer)return;timer=setTimeout(()=>{timer=0;apply()},80)};
    const root=document.querySelector('#app')||document.body;
    const mo=new MutationObserver(schedule);
    mo.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',schedule,{passive:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


/* V17.2 — Home life: ambient field, contextual greeting and restrained parallax */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function ensureAmbient(){
    if(document.querySelector('.nx17-ambient'))return;
    const layer=document.createElement('div');
    layer.className='nx17-ambient';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<i></i><i></i><i></i>';
    document.body.prepend(layer);
  }
  function greeting(){
    const h=new Date().getHours();
    const text=h<5?'Boa noite':h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
    $$('[data-nrx-greeting]').forEach(el=>{if(el.textContent!==text)el.textContent=text});
  }
  function bindHero(hero){
    if(!hero||hero.dataset.nx17Parallax)return;
    hero.dataset.nx17Parallax='1';
    if(window.NEXOV17&&window.NEXOV17.reduceMotion&&window.NEXOV17.reduceMotion())return;
    hero.addEventListener('pointermove',ev=>{
      if(ev.pointerType==='touch')return;
      const r=hero.getBoundingClientRect();
      const x=Math.max(0,Math.min(100,(ev.clientX-r.left)/r.width*100));
      const y=Math.max(0,Math.min(100,(ev.clientY-r.top)/r.height*100));
      hero.style.setProperty('--nx17-x',x.toFixed(1)+'%');
      hero.style.setProperty('--nx17-y',y.toFixed(1)+'%');
      const img=hero.querySelector('.nrx-hero-art img');
      if(img)img.style.translate=((x-50)*.035).toFixed(2)+'px '+((y-50)*.025).toFixed(2)+'px';
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{
      hero.style.removeProperty('--nx17-x');hero.style.removeProperty('--nx17-y');
      const img=hero.querySelector('.nrx-hero-art img');if(img)img.style.translate='';
    },{passive:true});
  }
  function applyHomeLife(){
    ensureAmbient();greeting();
    bindHero($('.nrx-hero'));bindHero($('.nrx-mob-hero'));
  }
  const start=()=>{
    applyHomeLife();
    const mo=new MutationObserver(()=>requestAnimationFrame(applyHomeLife));
    const home=$('#inicio');if(home)mo.observe(home,{subtree:true,childList:true});
    setInterval(greeting,60000);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();


/* V17.3 — Study page semantic enhancement */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function enhanceStudy(){
    const page=$('#materiais');if(!page)return;
    const tabs=$('#v15MaterialTabs',page);
    if(tabs&&!$('.nx17-study-live',page)){
      const live=document.createElement('div');
      live.className='nx17-study-live';
      live.innerHTML='<i></i><span><b>Biblioteca NEXO</b> · aprenda, revise e pratique no mesmo fluxo</span>';
      tabs.insertAdjacentElement('afterend',live);
    }
    $$('#materialGrid>*',page).forEach((card,index)=>{
      card.dataset.nx17StudyCard=String(index+1);
      if(!card.hasAttribute('tabindex')&&card.matches('article,div'))card.setAttribute('tabindex','0');
    });
  }
  const run=()=>requestAnimationFrame(enhanceStudy);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  const page=$('#materiais');if(page)new MutationObserver(run).observe(page,{subtree:true,childList:true});
})();


/* V17.4 — Question media viewer + explicit answer-state cue */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  function ensureViewer(){
    let viewer=$('#nx17MediaZoom');if(viewer)return viewer;
    viewer=document.createElement('div');viewer.id='nx17MediaZoom';viewer.className='nx17-media-zoom hidden';
    viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','Imagem ampliada da questão');
    viewer.innerHTML='<button type="button" aria-label="Fechar imagem">×</button><img alt="">';
    document.body.appendChild(viewer);
    const close=()=>{viewer.classList.add('hidden');viewer.querySelector('img').removeAttribute('src')};
    viewer.querySelector('button').onclick=close;
    viewer.addEventListener('click',e=>{if(e.target===viewer)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!viewer.classList.contains('hidden'))close()});
    return viewer;
  }
  function bindMedia(){
    const page=$('#questoes');if(!page)return;
    page.querySelectorAll('.visual-stage img,.q-media-gallery img,.q-option-media').forEach(img=>{
      if(img.dataset.nx17Zoom)return;img.dataset.nx17Zoom='1';
      img.addEventListener('click',e=>{
        if(!img.currentSrc&&!img.src)return;
        e.stopPropagation();
        const viewer=ensureViewer(),target=viewer.querySelector('img');
        target.src=img.currentSrc||img.src;target.alt=img.alt||'Recurso visual ampliado';
        viewer.classList.remove('hidden');viewer.querySelector('button').focus();
      });
    });
  }
  function answerCue(){
    const card=$('#questionCard');if(!card)return;
    let cue=$('.nx17-question-state',card);
    const confirm=$('#confirmAnswer',card);
    const selected=$('.q-option.selected',card);
    const answered=Boolean($('.q-option.correct,.q-option.wrong,.q-option.incorrect',card));
    const label=answered?'Resposta registrada':selected?'Alternativa selecionada — confirme quando estiver pronto':'Escolha uma alternativa antes de confirmar';
    if(!cue){cue=document.createElement('div');cue.className='nx17-question-state';cue.innerHTML='<i></i><span></span>';const options=$('.q-options',card);options?.insertAdjacentElement('beforebegin',cue)}
    const span=cue&&cue.querySelector('span');if(span&&span.textContent!==label)span.textContent=label;
    if(confirm&&confirm.getAttribute('aria-live')!=='polite')confirm.setAttribute('aria-live','polite');
  }
  function run(){bindMedia();answerCue()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  const page=$('#questoes');if(page)new MutationObserver(()=>requestAnimationFrame(run)).observe(page,{subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled']});
})();


/* V17.5 — Essay writing pulse from the real editor content */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  function enhanceEssay(){
    const area=$('#essayText');if(!area)return;
    let pulse=$('#nx17WritingPulse');
    if(!pulse){
      pulse=document.createElement('div');pulse.id='nx17WritingPulse';pulse.className='nx17-writing-pulse';
      pulse.innerHTML='<span><i></i><b>Modo escrita</b></span><span data-nx17-essay-stats>0 palavras · 0 caracteres</span>';
      const counter=$('#wordCount');(counter||area).insertAdjacentElement('afterend',pulse);
    }
    const text=String(area.value||'').trim();
    const words=text?(text.match(/\S+/g)||[]).length:0;
    const stats=$('[data-nx17-essay-stats]',pulse);
    const summary=words+' palavra'+(words===1?'':'s')+' · '+String(area.value||'').length+' caracteres';
    if(stats&&stats.textContent!==summary)stats.textContent=summary;
    if(!area.dataset.nx17Writing){
      area.dataset.nx17Writing='1';
      area.addEventListener('input',enhanceEssay,{passive:true});
      area.addEventListener('focus',()=>pulse.classList.add('active'));
      area.addEventListener('blur',()=>pulse.classList.remove('active'));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceEssay,{once:true});else enhanceEssay();
  const page=$('#redacao');if(page)new MutationObserver(()=>requestAnimationFrame(enhanceEssay)).observe(page,{subtree:true,childList:true});
})();


/* V17.6 — Unified module rhythm and semantic percentage tones */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const ids=new Set(['simulados','desempenho','semana','ranking','feedback','focos','radar','banco']);
  function applyModuleRhythm(){
    const page=$('.page.active');
    if(!page||!ids.has(page.id))return;
    const head=$('.page-head',page);
    if(head&&!head.nextElementSibling?.classList?.contains('nx17-module-rhythm')){
      const hr=document.createElement('hr');hr.className='nx17-module-rhythm';head.insertAdjacentElement('afterend',hr);
    }
    $$('b,strong,em,span',page).forEach(el=>{
      const txt=(el.textContent||'').trim();
      if(!/^\d{1,3}(?:[.,]\d+)?%$/.test(txt))return;
      const cls=window.NEXOV17?.scoreClass?.(txt)||'';
      ['nx17-score-low','nx17-score-mid','nx17-score-high'].forEach(x=>{if(x!==cls&&el.classList.contains(x))el.classList.remove(x)});
      if(cls&&!el.classList.contains(cls))el.classList.add(cls);
    });
  }
  let timer=0;
  const run=()=>{clearTimeout(timer);timer=setTimeout(applyModuleRhythm,90)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  const root=document.querySelector('#app')||document.body;
  new MutationObserver(run).observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
})();


/* V17.7 — Micro-feedback, contextual Professor Nexo mood and celebration */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const moodByPage={
    inicio:'confiante',questoes:'pensativo',redacao:'acolhedor',materiais:'pensativo',
    desempenho:'confiante',simulados:'serio',semana:'acolhedor',ranking:'feliz'
  };
  const sources={
    confiante:'./assets/nexo-expressions/confiante.avif',
    pensativo:'./assets/nexo-expressions/pensativo.avif',
    acolhedor:'./assets/nexo-expressions/acolhedor.avif',
    serio:'./assets/nexo-expressions/serio.avif',
    feliz:'./assets/nexo-expressions/feliz.avif'
  };
  function syncMood(){
    const page=$('.page.active')?.id||'inicio',mood=moodByPage[page]||'confiante',src=sources[mood];
    ['#nexoAvatarImage','#nexoLauncherAvatar'].forEach(sel=>{
      const img=$(sel);if(img&&img.dataset.nx17Mood!==mood){img.src=src;img.dataset.nx17Mood=mood}
    });
    const panel=$('#niaPanel');if(panel&&panel.dataset.mood!==mood)panel.dataset.mood=mood;
  }
  function burst(){
    if(window.NEXOV17?.reduceMotion?.())return;
    const x=innerWidth*.5,y=Math.min(innerHeight*.55,420);
    for(let i=0;i<9;i++){
      const s=document.createElement('i');s.className='nx17-spark-burst';
      s.style.left=x+'px';s.style.top=y+'px';
      const a=(Math.PI*2/9)*i,dist=34+(i%3)*14;
      s.style.setProperty('--dx',(Math.cos(a)*dist).toFixed(1)+'px');
      s.style.setProperty('--dy',(Math.sin(a)*dist).toFixed(1)+'px');
      document.body.appendChild(s);setTimeout(()=>s.remove(),760);
    }
  }
  let lastToast='';
  function watchDelight(){
    const toast=$('#toast');
    if(toast&&!toast.classList.contains('hidden')){
      const text=(toast.textContent||'').trim().toLocaleLowerCase('pt-BR');
      if(text&&text!==lastToast){lastToast=text;if(/corret|conquist|conclu|salv|parab|sequência|sequencia/.test(text))burst()}
    }
    const celebration=$('#achievementCelebration');
    if(celebration&&!celebration.classList.contains('hidden')&&!celebration.dataset.nx17Burst){
      celebration.dataset.nx17Burst='1';burst();
    }
    if(celebration?.classList.contains('hidden'))delete celebration.dataset.nx17Burst;
  }
  if(!window.__nx17RippleDelegated){
    window.__nx17RippleDelegated=true;
    document.addEventListener('pointerdown',e=>{
      const btn=e.target.closest?.('button');
      if(!btn||btn.disabled||window.NEXOV17?.reduceMotion?.())return;
      const style=getComputedStyle(btn);if(style.position==='static')btn.style.position='relative';if(style.overflow==='visible')btn.style.overflow='hidden';
      const r=btn.getBoundingClientRect(),dot=document.createElement('i');
      dot.className='nx17-ripple';dot.style.left=(e.clientX-r.left)+'px';dot.style.top=(e.clientY-r.top)+'px';
      btn.appendChild(dot);setTimeout(()=>dot.remove(),560);
    },{passive:true});
  }
  let timer=0;
  function run(){syncMood();watchDelight()}
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(run,50)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  const root=document.querySelector('#app')||document.body;
  new MutationObserver(schedule).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();


/* V17.8 — Accessibility + network resilience + low-cost reveal */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function ensureOffline(){
    let bar=$('#nx17Offline');
    if(!bar){
      bar=document.createElement('div');bar.id='nx17Offline';bar.className='nx17-offline hidden';bar.setAttribute('role','status');
      bar.innerHTML='<i></i><span>Sem conexão · o NEXO mantém o que estiver disponível offline</span>';
      document.body.appendChild(bar);
    }
    bar.classList.toggle('hidden',navigator.onLine!==false);
  }
  function ariaPass(){
    $$('button').forEach(btn=>{
      if(btn.getAttribute('aria-label')||btn.textContent.trim())return;
      const title=btn.getAttribute('title');if(title)btn.setAttribute('aria-label',title);
    });
    $$('img').forEach(img=>{
      if(!img.hasAttribute('decoding'))img.decoding='async';
      const hero=img.closest('.nrx-hero,.nrx-mob-hero,.auth-visual');
      if(!hero&&!img.hasAttribute('loading'))img.loading='lazy';
    });
    const active=$('.page.active');
    if(active){active.setAttribute('aria-live','off');active.setAttribute('aria-current','page')}
    $$('.page:not(.active)[aria-current]').forEach(x=>x.removeAttribute('aria-current'));
  }
  function revealPass(){
    if(!('IntersectionObserver' in window)||window.NEXOV17?.reduceMotion?.())return;
    if(window.__nx17RevealObserver)return;
    window.__nx17RevealObserver=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('nx17-revealed');window.__nx17RevealObserver.unobserve(e.target)}});
    },{rootMargin:'80px 0px'});
    $$('.panel,.nrx-shortcut,.nrx-stat-card,.nrx-preview,.sim-card').forEach(el=>window.__nx17RevealObserver.observe(el));
  }
  function run(){ensureOffline();ariaPass();revealPass()}
  window.addEventListener('online',ensureOffline);
  window.addEventListener('offline',ensureOffline);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  setTimeout(run,900);
})();
