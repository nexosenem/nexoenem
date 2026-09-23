(function(){
'use strict';
if(window.NEXO_PHASE2?.flows)return;
window.NEXO_PHASE2={...(window.NEXO_PHASE2||{}),flows:true,flowsVersion:'2.2.0'};

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

function safeState(){
  try{return typeof state!=='undefined'?state:null}catch(_){return null}
}

function dispatchChange(el){
  if(!el)return;
  el.dispatchEvent(new Event('change',{bubbles:true}));
}

function ensureStudyPriority(){
  const page=$('#materiais');
  const tabs=$('#v15MaterialTabs',page);
  const filter=$('.filter-line',page);
  if(!page||(tabs||filter)==null)return;
  let strip=$('.nx2-study-priority',page);
  if(!strip){
    strip=document.createElement('section');
    strip.className='nx2-study-priority';
    strip.setAttribute('aria-label','Atalhos de estudo');
    strip.innerHTML=
      '<button type="button" data-nx2-study="continue"><i>▶</i><span><b>Continuar</b><small>Retomar o próximo conteúdo da matéria</small></span></button>'+
      '<button type="button" data-nx2-study="review"><i>↻</i><span><b>Revisar</b><small>Mostrar conteúdos que pedem revisão</small></span></button>'+
      '<button type="button" data-nx2-study="recommend"><i>✦</i><span><b>Recomendado</b><small data-nx2-study-reason>Prioridade definida pelos seus dados</small></span></button>';
    (tabs||filter).insertAdjacentElement('beforebegin',strip);

    $('[data-nx2-study="continue"]',strip).addEventListener('click',()=>{
      const c=$('[data-library-continue]');
      if(c)return c.click();
      const first=$('#materialGrid .content-topic-toggle');
      first?.click();
      first?.scrollIntoView({behavior:'smooth',block:'center'});
    });
    $('[data-nx2-study="review"]',strip).addEventListener('click',()=>{
      const status=$('#materialStatusFilter'),type=$('#materialTypeFilter');
      if(type)type.value='';
      if(status)status.value='review';
      dispatchChange(status);
      $('#v15LibraryFilters')?.removeAttribute('open');
      $('#materialGrid')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
    $('[data-nx2-study="recommend"]',strip).addEventListener('click',()=>{
      const priority=$('#materialPriorityFilter'),status=$('#materialStatusFilter'),type=$('#materialTypeFilter');
      if(status)status.value='';
      if(type)type.value='';
      if(priority)priority.value='high';
      dispatchChange(priority);
      $('#v15LibraryFilters')?.removeAttribute('open');
      $('#materialGrid')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  const s=safeState();
  const rec=s?.core?.recommended_action;
  const reason=$('[data-nx2-study-reason]',strip);
  if(reason){
    reason.textContent=rec?.topic
      ? String(rec.topic)+(rec.reason?' · '+String(rec.reason).slice(0,72):'')
      : 'Prioridade definida pelo Radar e pelo seu progresso';
  }
}

function syncQuestionRecommendation(){
  const card=$('#questoes .nx2-question-start');
  if(!card)return;
  const s=safeState();
  const rec=s?.core?.recommended_action;
  const weak=$('#weaknessBars .weak-row label')?.textContent?.trim()||'';
  const title=$('b',card),desc=$('p',card),button=$('button',card);
  if(rec?.topic){
    if(title)title.textContent='Treinar '+rec.topic;
    if(desc)desc.textContent=rec.reason||'O NEXO escolheu este tema usando seu desempenho recente.';
    if(button)button.textContent='Começar '+String(rec.size||8)+' questões →';
  }else if(weak){
    if(title)title.textContent='Reforçar '+weak;
    if(desc)desc.textContent='Esse é um dos pontos que mais merece atenção no seu histórico recente.';
    if(button)button.textContent='Começar treino recomendado →';
  }else{
    if(title)title.textContent='Começar pelo treino adaptativo';
    if(desc)desc.textContent='Faça algumas questões e o NEXO ajusta o próximo treino com base nos seus resultados.';
  }
}

function enhanceQuestionCard(){
  const card=$('#questionCard');
  if(!card)return;
  const options=$$('.q-option',card);
  const answered=Boolean($('.q-option.correct,.q-option.wrong,.q-option.incorrect',card));
  options.forEach((opt,index)=>{
    opt.setAttribute('role','radio');
    opt.setAttribute('aria-checked',String(opt.classList.contains('selected')));
    opt.setAttribute('aria-label','Alternativa '+String.fromCharCode(65+index)+': '+(opt.textContent||'').replace(/\s+/g,' ').trim().slice(0,220));
    if(answered)opt.setAttribute('aria-disabled','true');else opt.removeAttribute('aria-disabled');
  });
  const answer=$('.answer-panel',card);
  if(answer){
    answer.setAttribute('role','region');
    answer.setAttribute('aria-label','Correção da questão');
    answer.setAttribute('aria-live','polite');
    if(!answer.dataset.nx2Focused){
      answer.dataset.nx2Focused='1';
      answer.tabIndex=-1;
      requestAnimationFrame(()=>answer.focus({preventScroll:true}));
    }
    const grid=$('.answer-learning-grid',answer);
    if(grid&&!$('.nx2-answer-expand',answer)){
      grid.classList.add('nx2-collapsed');
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='nx2-answer-expand';
      toggle.setAttribute('aria-expanded','false');
      toggle.textContent='Ver análise completa';
      toggle.addEventListener('click',()=>{
        const open=grid.classList.toggle('nx2-expanded');
        grid.classList.toggle('nx2-collapsed',!open);
        toggle.setAttribute('aria-expanded',String(open));
        toggle.textContent=open?'Ocultar análise detalhada':'Ver análise completa';
      });
      grid.insertAdjacentElement('afterend',toggle);
    }
    const actions=$('.post-answer-actions',answer);
    actions?.setAttribute('aria-label','Próximas ações da questão');
  }
}

function ensureQuestionObserver(){
  const card=$('#questionCard');
  if(!card||card.dataset.nx2Observer)return;
  card.dataset.nx2Observer='1';
  let queued=false;
  new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhanceQuestionCard()});
  }).observe(card,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  card.addEventListener('click',()=>requestAnimationFrame(enhanceQuestionCard),{passive:true});
  enhanceQuestionCard();
}

function draftLabel(){
  const state=document.body.dataset.essayDraftState||'';
  if(state==='saved')return 'Salvo na nuvem';
  if(state==='local')return navigator.onLine?'Salvo neste dispositivo · sincronizando':'Salvo neste dispositivo';
  if(state==='restored')return 'Rascunho recuperado';
  if(state==='clear')return 'Sem alterações pendentes';
  return 'Salvamento automático ativo';
}

function syncDraftStatus(){
  const el=$('.nx2-draft-status');
  if(el)el.textContent=draftLabel();
}

function ensureEssayTools(){
  const page=$('#redacao'),area=$('#essayText'),head=$('.essay-writing-head',page),flow=$('.essay-flow-bar',page);
  if(!page||!area||!head)return;

  if(!$('.nx2-writing-tools',head)){
    const tools=document.createElement('div');
    tools.className='nx2-writing-tools';
    tools.innerHTML='<span class="nx2-draft-status" aria-live="polite">Salvamento automático ativo</span><button type="button" class="nx2-essay-focus-btn" aria-pressed="false">Modo sem distrações</button>';
    const count=$('#wordCount',head);
    if(count)count.insertAdjacentElement('afterend',tools);else head.appendChild(tools);
    const btn=$('.nx2-essay-focus-btn',tools);
    btn.addEventListener('click',()=>{
      const on=document.body.classList.toggle('nx2-essay-focus');
      btn.setAttribute('aria-pressed',String(on));
      btn.textContent=on?'Sair do modo foco':'Modo sem distrações';
      if(on)requestAnimationFrame(()=>area.focus({preventScroll:true}));
    });
  }
  syncDraftStatus();

  if(flow&&!flow.dataset.nx2Interactive){
    flow.dataset.nx2Interactive='1';
    const steps=$$('span',flow);
    const targets=[
      ()=>$('.essay-theme-control',page),
      ()=>area,
      ()=>$('#analyzeEssay',page),
      ()=>$('#essayResult',page)||$('.essay-history-card',page)
    ];
    steps.forEach((step,index)=>{
      step.setAttribute('role','button');
      step.tabIndex=0;
      step.setAttribute('aria-label','Ir para etapa '+(index+1)+': '+($('b',step)?.textContent||''));
      const go=()=>{
        const target=targets[index]?.();
        if(index===2&&target&&String(area.value||'').trim().length>=120){
          target.scrollIntoView({behavior:'smooth',block:'center'});
          target.focus?.({preventScroll:true});
        }else{
          target?.scrollIntoView({behavior:'smooth',block:'start'});
          if(index===1)area.focus({preventScroll:true});
        }
      };
      step.addEventListener('click',go);
      step.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
    });
  }
}

function ensureCommentSort(){
  const modal=$('#commentModal'),list=$('#questionComments');
  if(!modal||!list)return;
  const sheet=$('.community-sheet',modal);
  if(sheet&&!$('.nx2-comment-sort',sheet)){
    const bar=document.createElement('div');
    bar.className='nx2-comment-sort';
    bar.setAttribute('aria-label','Ordenar comentários');
    bar.innerHTML='<button type="button" class="active" data-nx2-comment-sort="recent">Recentes</button><button type="button" data-nx2-comment-sort="helpful">Mais úteis</button>';
    list.insertAdjacentElement('beforebegin',bar);
    $$('[data-nx2-comment-sort]',bar).forEach(btn=>btn.addEventListener('click',()=>{
      $$('[data-nx2-comment-sort]',bar).forEach(x=>x.classList.toggle('active',x===btn));
      modal.dataset.nx2Sort=btn.dataset.nx2CommentSort;
      sortComments();
    }));
  }
  if(!list.dataset.nx2Observer){
    list.dataset.nx2Observer='1';
    new MutationObserver(()=>requestAnimationFrame(sortComments)).observe(list,{childList:true});
  }
}
function sortComments(){
  const modal=$('#commentModal'),list=$('#questionComments');
  if(!modal||!list)return;
  const items=$$('.comment-item',list);
  items.forEach((item,index)=>{
    if(item.dataset.nx2Original==null)item.dataset.nx2Original=String(index);
  });
  if(modal.dataset.nx2Sort==='helpful'){
    items.sort((a,b)=>{
      const av=Number($('.comment-helpful b',a)?.textContent||0);
      const bv=Number($('.comment-helpful b',b)?.textContent||0);
      return bv-av||Number(a.dataset.nx2Original)-Number(b.dataset.nx2Original);
    });
  }else{
    items.sort((a,b)=>Number(a.dataset.nx2Original)-Number(b.dataset.nx2Original));
  }
  items.forEach(item=>list.appendChild(item));
}

function visibleDialog(){
  const selectors=['.community-modal:not(.hidden)','#notificationPanel:not(.hidden)','#profileMenu:not(.hidden)','.nia-panel:not(.hidden)'];
  return selectors.map(s=>$(s)).find(Boolean)||null;
}
function closeDialog(dialog){
  if(!dialog)return;
  const close=$('[id^="close"],[data-nrx-notification-close],[data-nrx-more-close]',dialog);
  if(close)return close.click();
  if(dialog.id==='notificationPanel')return $('#notificationBtn')?.click();
  if(dialog.id==='profileMenu'){dialog.classList.add('hidden');return}
  dialog.classList.add('hidden');
}
function trapDialogKeydown(e){
  const dialog=visibleDialog();
  if(!dialog)return;
  if(e.key==='Escape'){
    e.preventDefault();closeDialog(dialog);return;
  }
  if(e.key!=='Tab')return;
  const focusables=$$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',dialog)
    .filter(el=>!el.disabled&&getComputedStyle(el).display!=='none');
  if(!focusables.length)return;
  const first=focusables[0],last=focusables[focusables.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
}

function ensureDialogSemantics(){
  $$('.community-modal').forEach(modal=>{
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    const h=$('h3',modal);
    if(h){
      if(!h.id)h.id='nx2-dialog-title-'+modal.id;
      modal.setAttribute('aria-labelledby',h.id);
    }
  });
  const notice=$('#notificationPanel');
  if(notice){
    notice.setAttribute('role','dialog');
    notice.setAttribute('aria-modal','false');
    notice.setAttribute('aria-label','Notificações');
  }
}

function ensureDrawerSwipe(){
  const side=$('#sidebar');
  if(!side||side.dataset.nx2Swipe)return;
  side.dataset.nx2Swipe='1';
  let startX=0,startY=0,tracking=false;
  side.addEventListener('pointerdown',e=>{
    if(innerWidth>760||e.pointerType==='mouse')return;
    startX=e.clientX;startY=e.clientY;tracking=true;
  },{passive:true});
  side.addEventListener('pointerup',e=>{
    if(!tracking)return;tracking=false;
    const dx=e.clientX-startX,dy=Math.abs(e.clientY-startY);
    if(dx<-64&&dy<80)$('#closeMenu')?.click();
  },{passive:true});
}

function syncKeyboardState(){
  if(!window.visualViewport)return;
  const diff=window.innerHeight-window.visualViewport.height;
  document.body.classList.toggle('nexo-keyboard-open',diff>140);
}
function ensureViewportKeyboard(){
  if(!window.visualViewport||window.__nx2Viewport)return;
  window.__nx2Viewport=true;
  visualViewport.addEventListener('resize',syncKeyboardState,{passive:true});
  visualViewport.addEventListener('scroll',syncKeyboardState,{passive:true});
  syncKeyboardState();
}

function ensureMediaPinch(){
  if(window.__nx2Pinch)return;
  window.__nx2Pinch=true;
  const pointers=new Map();
  let startDistance=0,startScale=1,scale=1;
  const distance=()=>{
    const pts=[...pointers.values()];
    if(pts.length<2)return 0;
    return Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
  };
  document.addEventListener('pointerdown',e=>{
    if(!e.target.closest?.('#nx17MediaZoom img'))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){startDistance=distance();startScale=scale}
  },{passive:true});
  document.addEventListener('pointermove',e=>{
    const img=e.target.closest?.('#nx17MediaZoom img');
    if(!img||!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2&&startDistance>0){
      scale=Math.max(1,Math.min(3,startScale*(distance()/startDistance)));
      img.style.transform='scale('+scale+')';
      img.style.transformOrigin='center center';
    }
  },{passive:true});
  const end=e=>{
    pointers.delete(e.pointerId);
    if(pointers.size<2)startDistance=0;
    const viewer=$('#nx17MediaZoom');
    if(viewer?.classList.contains('hidden'))scale=1;
  };
  document.addEventListener('pointerup',end,{passive:true});
  document.addEventListener('pointercancel',end,{passive:true});
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#nx17MediaZoom button')){
      scale=1;
      const img=$('#nx17MediaZoom img');if(img)img.style.transform='';
    }
  },true);
}

function sync(){
  ensureStudyPriority();
  syncQuestionRecommendation();
  ensureQuestionObserver();
  ensureEssayTools();
  ensureCommentSort();
  ensureDialogSemantics();
  ensureDrawerSwipe();
  ensureViewportKeyboard();
  ensureMediaPinch();
}

document.addEventListener('keydown',trapDialogKeydown,true);
document.addEventListener('nexo:pagechange',()=>requestAnimationFrame(sync));
document.addEventListener('click',e=>{
  if(e.target.closest?.('#openComments'))setTimeout(()=>{ensureCommentSort();sortComments()},80);
  if(e.target.closest?.('[data-nexo-today-action],[data-library-continue]'))requestAnimationFrame(sync);
},{passive:true});
new MutationObserver(syncDraftStatus).observe(document.body,{attributes:true,attributeFilter:['data-essay-draft-state']});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(sync),{once:true});
else requestAnimationFrame(sync);
})();