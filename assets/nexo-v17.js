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
    $$('[data-nrx-pct],[data-nrx-weak-pct],#progressPct,#mobileProgressPct,.percent,.percentage,[data-percent]').forEach(el=>{
      const cls=scoreClass(el.textContent||el.dataset.percent);
      el.classList.remove('nx17-score-low','nx17-score-mid','nx17-score-high');
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
    const mo=new MutationObserver(()=>requestAnimationFrame(apply));
    mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','aria-hidden']});
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
