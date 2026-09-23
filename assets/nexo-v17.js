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
