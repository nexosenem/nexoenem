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
    let queued=false;
    const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
    const mo=new MutationObserver(schedule);
    mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-hidden']});
    window.addEventListener('resize',()=>requestAnimationFrame(apply),{passive:true});
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
    const span=cue&&cue.querySelector('span');if(span)span.textContent=label;
    if(confirm)confirm.setAttribute('aria-live','polite');
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
    const stats=$('[data-nx17-essay-stats]',pulse);if(stats)stats.textContent=words+' palavra'+(words===1?'':'s')+' · '+String(area.value||'').length+' caracteres';
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
