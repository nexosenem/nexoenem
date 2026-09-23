(function(){
'use strict';
if(window.NEXO_PHASE2?.coreUx)return;
window.NEXO_PHASE2={...(window.NEXO_PHASE2||{}),coreUx:true,version:'2.1.0'};

const $=(s,r=document)=>r.querySelector(s);
const $=(s,r=document)=>Array.from(r.querySelectorAll(s));

function ensureGlobalA11y(){
  const main=$('main');
  if(main&&!main.id)main.id='nexoMain';
  let skip=$('.nx2-skip-link');
  if(main&&!skip){
    skip=document.createElement('a');
    skip.className='nx2-skip-link';
    skip.href='#'+main.id;
    skip.textContent='Pular para o conteúdo';
    document.body.prepend(skip);
  }
  let live=$('#nx2RouteLive');
  if(!live){
    live=document.createElement('div');
    live.id='nx2RouteLive';
    live.className='nx2-sr-only';
    live.setAttribute('aria-live','polite');
    live.setAttribute('aria-atomic','true');
    document.body.appendChild(live);
  }
  const moreToggle=$('.nrx-side-more-toggle');
  const morePanel=$('.nrx-side-more-panel');
  if(moreToggle&&morePanel){
    if(!morePanel.id)morePanel.id='nrxMorePanel';
    moreToggle.setAttribute('aria-controls',morePanel.id);
  }
}

function announceRoute(){
  const page=$('.page.active');
  if(!page)return;
  const heading=$('h1,h2,h3',page);
  const label=(heading?.textContent||page.id||'Página').replace(/\s+/g,' ').trim();
  const live=$('#nx2RouteLive');
  if(live)live.textContent='Página: '+label;
  document.body.dataset.nx2Route=page.id||'';
}


function ensureSearchUx(){
  const input=$('#globalSearch');
  const box=$('#globalSearch')?.closest('.search');
  if(input){
    if(!String(input.placeholder||'').trim())input.placeholder='Pesquisar no NEXO...';
    input.setAttribute('aria-label','Pesquisar no NEXO');
    input.setAttribute('autocomplete','off');
  }
  box?.setAttribute('role','search');
  const results=$('#searchResults');
  if(results){
    results.setAttribute('aria-live','polite');
    results.setAttribute('aria-label','Resultados da pesquisa');
  }
}

function ensureNavA11y(){
  const active=$('.page.active')?.id||'inicio';
  $$('[data-nrx-bottom]').forEach(b=>{
    const p=b.dataset.nrxBottom;
    const current=(p===active)||(p==='study'&&active==='materiais');
    if(current)b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
    const label=$('small',b)?.textContent?.trim();
    if(label&&!b.getAttribute('aria-label'))b.setAttribute('aria-label',label);
  });
  $$('[data-nrx-side]').forEach(b=>{
    const p=b.dataset.nrxSide;
    const current=(p===active)||(p==='study'&&active==='materiais');
    if(current)b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  });
}

function ensureQuestionPrimary(){
  const page=$('#questoes');
  const modes=$('.nrx-question-modes',page);
  if(!page||!modes||$('.nx2-question-start',page))return;

  const card=document.createElement('section');
  card.className='nx2-question-start';
  card.setAttribute('aria-label','Treino recomendado');
  card.innerHTML='<div><span>RECOMENDADO PELO NEXO</span><b>Começar pelo treino adaptativo</b><p>O NEXO prioriza os temas em que seus dados indicam maior necessidade. Você ainda pode personalizar tudo abaixo.</p></div><button type="button" class="primary-btn">Começar treino recomendado →</button>';
  $('button',card).addEventListener('click',()=>{
    const trigger=$('#adaptiveButton')||$('#mobileAdaptive')||$('#startAdaptiveFocus');
    if(trigger)trigger.click();
    else $('#v15AdvancedQuestionSetup')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  modes.insertAdjacentElement('beforebegin',card);

  const details=$('#v15AdvancedQuestionSetup');
  if(details){
    const title=$('summary b',details);
    const meta=$('summary small',details);
    if(title)title.textContent='Personalizar treino';
    if(meta)meta.textContent='Área, matéria, dificuldade, quantidade e recursos visuais';
    details.addEventListener('toggle',()=>{
      details.setAttribute('aria-expanded',details.open?'true':'false');
    });
    details.setAttribute('aria-expanded',details.open?'true':'false');
  }
}

function updateContinueProgress(){
  const card=$('.nrx-mob-continue');
  const sub=$('[data-nrx-continue-sub]',card);
  if(!card||!sub)return;
  let track=$('.nx2-continue-track',card);
  if(!track){
    track=document.createElement('span');
    track.className='nx2-continue-track';
    track.setAttribute('aria-hidden','true');
    track.innerHTML='<i></i>';
    sub.insertAdjacentElement('afterend',track);
  }
  const text=String(sub.textContent||'');
  const match=text.match(/(?:Quest[aã]o\s*)?(\d+)\s*(?:de|\/)\s*(\d+)/i);
  const current=Number(match?.[1]||0);
  const total=Number(match?.[2]||0);
  const pct=total>0?Math.max(0,Math.min(100,Math.round(((current-1)/total)*100))):0;
  track.style.setProperty('--nx2-progress',pct+'%');
  if(total>0){
    card.setAttribute('aria-label','Continuar estudo: '+text);
  }
}

function ensureEssayFlow(){
  const flow=$('#redacao .essay-flow-bar');
  const area=$('#essayText');
  if(!flow||!area)return;
  const steps=$$('span',flow);
  const paint=()=>{
    const hasText=String(area.value||'').trim().length>80;
    const resultVisible=Boolean($('#essayResult')&&!$('#essayResult').classList.contains('hidden'));
    steps.forEach((step,index)=>{
      step.classList.toggle('nx2-done',index===0||(index===1&&hasText)||(index===2&&resultVisible));
      step.classList.toggle('nx2-current',resultVisible?index===3:hasText?index===1:index===0);
    });
  };
  if(!area.dataset.nx2Flow){
    area.dataset.nx2Flow='1';
    area.addEventListener('input',paint,{passive:true});
  }
  paint();
}

function ensureTouchLabels(){
  $$('button').forEach(btn=>{
    if(btn.getAttribute('aria-label'))return;
    const text=(btn.textContent||'').replace(/\s+/g,' ').trim();
    if(text)btn.setAttribute('aria-label',text.slice(0,120));
  });
}

function syncAll(){
  ensureGlobalA11y();
  ensureSearchUx();
  ensureNavA11y();
  ensureQuestionPrimary();
  updateContinueProgress();
  ensureEssayFlow();
  ensureTouchLabels();
}

document.addEventListener('nexo:pagechange',()=>requestAnimationFrame(()=>{syncAll();announceRoute()}));
document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(syncAll),{once:true});

const continueSub=$('[data-nrx-continue-sub]');
if(continueSub)new MutationObserver(()=>requestAnimationFrame(updateContinueProgress))
  .observe(continueSub,{childList:true,characterData:true,subtree:true});

if(document.readyState!=='loading')requestAnimationFrame(()=>{syncAll();announceRoute()});
})();