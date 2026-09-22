/* NEXO Experience V14 · progressive learning loop + cleaner information architecture */
(function(){
  'use strict';

  const $=(sel,root=document)=>root.querySelector(sel);

  function safeOpen(page){
    try{ if(typeof window.openPage==='function'){ window.openPage(page); return true; } }catch(_){}
    const el=document.querySelector('[data-page="'+page+'"]');
    if(el){ el.click(); return true; }
    return false;
  }

  function stateV13(){
    try{ return typeof v13State==='function'?v13State():null; }catch(_){ return null; }
  }

  function weakSkill(){
    const rows=[...(stateV13()?.mastery||[])];
    rows.sort((a,b)=>Number(b.priority_score||0)-Number(a.priority_score||0));
    return rows.find(x=>Number(x.attempts||0)>=2)||rows[0]||null;
  }

  function startAdaptiveDiagnostic(){
    safeOpen('questoes');
    setTimeout(async()=>{
      try{
        if(typeof window.startStudySession==='function'){
          await window.startStudySession({mode:'diagnostic',area:'',subject:'',topic:'',difficulty:'',visualOnly:false,size:20});
          if(typeof state!=='undefined'&&state.session){
            const badge=$('#sessionAreaBadge'),title=$('#sessionTitle'),sub=$('#sessionSubtitle');
            if(badge)badge.textContent='DIAGNÓSTICO NEXO';
            if(title)title.textContent='Mapa inicial de conhecimento';
            if(sub)sub.textContent='20 questões para recalibrar prioridades sem expor respostas antes da confirmação.';
          }
        }
      }catch(e){ console.warn('v14 diagnostic',e); }
    },120);
  }

  function startWeakPractice(size=10){
    const w=weakSkill();
    safeOpen('questoes');
    setTimeout(async()=>{
      try{
        if(typeof window.startStudySession==='function'){
          await window.startStudySession({
            mode:'adaptive',
            area:w?.area||'',
            subject:w?.subject||'',
            topic:w?.topic||'',
            difficulty:'',
            visualOnly:false,
            size
          });
        }
      }catch(e){ console.warn('v14 weak practice',e); }
    },120);
  }

  function startRecall(){
    const w=weakSkill();
    if(w&&typeof window.v13OpenRecall==='function'){
      window.v13OpenRecall(w.area||'',w.subject||'',w.topic||w.subject||'');
      return;
    }
    safeOpen('desempenho');
  }

  function moveAdaptivePlan(){
    const brief=$('#v13Brief'),week=$('#semana');
    if(!brief||!week)return;
    if(brief.parentElement?.id==='inicio'){
      const route=$('#v13WeekRoute',week);
      if(route?.nextSibling)week.insertBefore(brief,route.nextSibling);
      else week.appendChild(brief);
      brief.dataset.v14Moved='1';
    }
  }

  function buildLearningLoop(){
    const perf=$('#desempenho');
    if(!perf||$('#v14LearningLoop'))return;
    const section=document.createElement('section');
    section.id='v14LearningLoop';
    section.className='panel v14-learning-loop';
    section.innerHTML=`
      <div class="v14-loop-head">
        <div>
          <span class="eyebrow">CICLO NEXO</span>
          <h3>Aprenda, pratique, recorde e revise.</h3>
          <p>O próximo passo muda conforme domínio, confiança, erros e revisões pendentes.</p>
        </div>
        <button type="button" class="outline-btn" data-v14-diagnostic>Recalibrar diagnóstico</button>
      </div>
      <div class="v14-loop-grid">
        <button type="button" data-v14-loop="learn"><i>01</i><b>Aprender</b><small>Aula e resumo do foco atual</small><span>→</span></button>
        <button type="button" data-v14-loop="practice"><i>02</i><b>Praticar</b><small>Questões adaptadas ao seu ponto fraco</small><span>→</span></button>
        <button type="button" data-v14-loop="recall"><i>03</i><b>Recordar</b><small>Explique sem consultar o material</small><span>→</span></button>
        <button type="button" data-v14-loop="review"><i>04</i><b>Revisar</b><small>Volte ao que está perto de ser esquecido</small><span>→</span></button>
      </div>`;
    const mastery=$('#v13Mastery',perf);
    if(mastery)perf.insertBefore(section,mastery);
    else perf.appendChild(section);

    $('[data-v14-diagnostic]',section)?.addEventListener('click',startAdaptiveDiagnostic);
    $('[data-v14-loop="learn"]',section)?.addEventListener('click',()=>safeOpen('materiais'));
    $('[data-v14-loop="practice"]',section)?.addEventListener('click',()=>startWeakPractice(10));
    $('[data-v14-loop="recall"]',section)?.addEventListener('click',startRecall);
    $('[data-v14-loop="review"]',section)?.addEventListener('click',()=>safeOpen('focos'));
  }

  function enhanceMasteryCopy(){
    const root=$('#v13Mastery');
    if(!root)return;
    const kicker=root.querySelector('.v13-head span');
    if(kicker&&/MAPA DE DOMÍNIO/i.test(kicker.textContent||''))kicker.textContent='MAPA DE CONHECIMENTO';
    const title=root.querySelector('.v13-head h3');
    if(title)title.textContent='Veja exatamente o que você domina e o que precisa voltar.';
  }

  function enhanceSimulation(){
    const root=$('#simulados');
    if(!root)return;
    const full=root.querySelector('[data-sim-mode="full"]');
    if(full&&!full.dataset.v14Enhanced){
      full.dataset.v14Enhanced='1';
      const badge=full.querySelector('span'),title=full.querySelector('b'),small=full.querySelector('small'),tag=full.querySelector('i');
      if(badge)badge.textContent='90';
      if(title)title.textContent='ENEM Real';
      if(small)small.textContent='90 questões · cronômetro · feedback só no final';
      if(tag)tag.textContent='modo prova';
    }
    if(!root.querySelector('[data-v14-diagnostic-card]')){
      const grid=root.querySelector('.sim-grid');
      if(grid){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='sim-card sim-strategy-card v14-diagnostic-card';
        btn.dataset.v14DiagnosticCard='1';
        btn.innerHTML='<span>◎</span><b>Diagnóstico NEXO</b><small>20 questões para recalibrar seu mapa</small><i>inteligente</i>';
        btn.addEventListener('click',startAdaptiveDiagnostic);
        grid.insertBefore(btn,grid.firstChild?.nextSibling||null);
      }
    }
  }

  function enhanceDesktopBrand(){
    const brand=document.querySelector('#sidebar .brand');
    if(!brand||brand.dataset.v14Brand)return;
    brand.dataset.v14Brand='1';
    const mark=brand.querySelector('.brand-mark');
    const name=brand.querySelector('b');
    const enem=brand.querySelector('em');
    if(mark){ mark.textContent=''; mark.classList.add('v14-chest-n'); }
    if(name)name.textContent='exo';
    if(enem)enem.textContent='';
    brand.setAttribute('aria-label','Nexo');
  }

  function compactHomePlan(){
    const home=$('#inicio');
    if(!home)return;
    home.classList.add('v14-home');
  }

  function boot(){
    moveAdaptivePlan();
    buildLearningLoop();
    enhanceMasteryCopy();
    enhanceSimulation();
    enhanceDesktopBrand();
    compactHomePlan();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    boot();
    let ticks=0;
    const timer=setInterval(()=>{
      boot();
      ticks++;
      if(ticks>40)clearInterval(timer);
    },500);
  });
})();
