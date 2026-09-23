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

function ensureStudyStatusSignals(){
  const page=$('#materiais');
  if(!page||!page.classList.contains('active'))return;
  const s=safeState();
  const materials=Array.isArray(s?.materials)?s.materials:[];
  $$('.content-topic-group',page).forEach(group=>{
    const topic=$('.content-topic-name h3',group)?.textContent?.trim()||'';
    if(!topic)return;
    const item=materials.find(m=>String(m.topic||'').trim()===topic)||null;
    let meta=null;
    try{
      if(typeof topicLearningMeta==='function')meta=topicLearningMeta(topic,item?.subject||'');
    }catch(_){}
    if(!meta)return;
    const host=$('.content-topic-meta',group)||$('.content-topic-name',group);
    let badge=$('.nx2-topic-status',group);
    if(!badge){
      badge=document.createElement('span');
      badge.className='nx2-topic-status';
      host?.appendChild(badge);
    }
    badge.dataset.status=meta.key||'new';
    badge.textContent=meta.label||'NOVO';
    const toggle=$('.content-topic-toggle',group);
    if(toggle){
      const details=[
        meta.label||'Novo',
        Number(meta.completed||0)+' de '+Math.max(1,Number(meta.materials?.length||0))+' conteúdos',
        Number(meta.attempts||0)>0?Number(meta.attempts||0)+' questões respondidas':null,
        meta.reviewDue?'revisão recomendada':null
      ].filter(Boolean).join(' · ');
      toggle.setAttribute('aria-label',topic+' · '+details);
    }
  });
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

function syncContinueRich(){
  const card=$('.nrx-mob-continue');
  if(!card)return;
  const title=$('[data-nrx-continue-title]',card);
  const sub=$('[data-nrx-continue-sub]',card);
  const play=$('[data-nrx-resume]',card);
  const s=safeState();
  let source=s?.session?.queue?.length?s.session:null;
  if(!source&&typeof readPersistedStudySession==='function'){
    try{source=readPersistedStudySession()}catch(_){}
  }
  if(source){
    const total=Number(source.size||source.queue?.length||source.ids?.length||0);
    const current=Math.min(total,Math.max(1,Number(source.index||0)+1));
    const topic=String(source.topic||source.subject||source.area||'treino').trim();
    const safeTotal=Math.max(current,total);
    const remaining=Math.max(1,safeTotal-current+1);
    const estimateMin=Math.max(3,Math.ceil(remaining*2.5));
    if(title)title.textContent=topic&&topic!=='treino'?'Continuar · '+topic:'Continuar sessão';
    if(sub)sub.textContent='Questão '+current+' de '+safeTotal+' · ~'+estimateMin+' min restantes'+(topic?' · '+topic:'');
    if(play)play.setAttribute('aria-label','Continuar '+topic+' na questão '+current+' de '+safeTotal+', aproximadamente '+estimateMin+' minutos restantes');
    card.dataset.nx2Resume='session';
  }else{
    card.dataset.nx2Resume='fallback';
    if(play&&!play.getAttribute('aria-label'))play.setAttribute('aria-label','Continuar estudando');
  }
}

function essayOrganizerKey(){
  const s=safeState();
  const uid=String(s?.user?.id||'guest');
  const theme=String($('#essayTheme')?.value||'draft');
  return 'nexo-essay-organizer-v1:'+uid+':'+theme;
}
function ensureEssayOrganizer(){
  const page=$('#redacao');
  const editor=$('.essay-editor-v2',page);
  if(!page||!editor)return;
  let box=$('.nx2-essay-organizer',page);
  if(!box){
    box=document.createElement('section');
    box.className='nx2-essay-organizer';
    box.setAttribute('aria-label','Organizador de ideias da redação');
    box.innerHTML='<div><span class="eyebrow">ORGANIZADOR DE IDEIAS</span><b>Planeje antes de escrever</b><small>Guarde tese, repertórios e conexões sem colocar texto pronto na redação.</small></div><textarea class="nx2-essay-organizer-text" rows="4" maxlength="2400" placeholder="Ex.: tese central, repertórios, causas, consequências e proposta..."></textarea><span class="nx2-organizer-status" aria-live="polite">Salvo neste dispositivo</span>';
    editor.insertAdjacentElement('beforebegin',box);
    const area=$('.nx2-essay-organizer-text',box);
    try{area.value=localStorage.getItem(essayOrganizerKey())||''}catch(_){}
    let timer=0;
    area.addEventListener('input',()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        try{localStorage.setItem(essayOrganizerKey(),area.value||'')}catch(_){}
        const status=$('.nx2-organizer-status',box);
        if(status)status.textContent='Salvo agora';
      },180);
    },{passive:true});
  }
  ensureRepertoireInsertActions();
}
function appendRepertoireToOrganizer(article){
  const box=$('#redacao .nx2-essay-organizer');
  const area=$('.nx2-essay-organizer-text',box);
  if(!box||!area||!article)return;
  const name=$('b',article)?.textContent?.trim()||'Repertório';
  const use=$('small',article)?.textContent?.replace(/^Como usar:\s*/i,'').trim()||'';
  const line='• '+name+(use?' — '+use:'');
  const current=String(area.value||'').trim();
  if(!current.includes(line))area.value=(current?current+'\n':'')+line;
  area.dispatchEvent(new Event('input',{bubbles:true}));
  const status=$('.nx2-organizer-status',box);
  if(status)status.textContent='Repertório adicionado ao organizador';
  try{typeof nexoHaptic==='function'&&nexoHaptic([14])}catch(_){}
  try{typeof toast==='function'&&toast('Repertório guardado no organizador.')}catch(_){}
}
function ensureRepertoireInsertActions(){
  const list=$('#essayRepertoireList');
  if(!list)return;
  $$('article',list).forEach(article=>{
    if($('.nx2-repertoire-save',article))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='nx2-repertoire-save';
    btn.textContent='Guardar no organizador';
    btn.setAttribute('aria-label','Guardar este repertório no organizador de ideias');
    btn.addEventListener('click',()=>appendRepertoireToOrganizer(article));
    article.appendChild(btn);
  });
  if(!list.dataset.nx2RepertoireObserver){
    list.dataset.nx2RepertoireObserver='1';
    new MutationObserver(()=>requestAnimationFrame(ensureRepertoireInsertActions))
      .observe(list,{childList:true});
  }
}
function ensureLearningCompletionFeedback(){
  if(window.__nx2LearningCompletion)return;
  window.__nx2LearningCompletion=true;
  document.addEventListener('nexo:content-completed',event=>{
    const topic=String(event.detail?.topic||'conteúdo').trim();
    const live=$('#nx2RouteLive');
    if(live)live.textContent='Conteúdo concluído: '+topic+'. Progresso atualizado.';
    const button=$('#viewerComplete');
    if(button){
      button.classList.add('nx2-complete-pulse');
      setTimeout(()=>button.classList.remove('nx2-complete-pulse'),650);
    }
  });
}

function ensureQuestionKeyboard(){
  const card=$('#questionCard');
  if(!card)return;
  const group=$('.q-options',card);
  if(!group)return;
  group.setAttribute('role','radiogroup');
  group.setAttribute('aria-label','Alternativas da questão');
  if(group.dataset.nx2Keyboard)return;
  group.dataset.nx2Keyboard='1';
  group.addEventListener('keydown',e=>{
    const opts=$$('.q-option',group).filter(x=>!x.disabled&&x.getAttribute('aria-disabled')!=='true');
    if(!opts.length)return;
    const current=Math.max(0,opts.indexOf(document.activeElement));
    let next=current;
    if(e.key==='ArrowDown'||e.key==='ArrowRight')next=(current+1)%opts.length;
    else if(e.key==='ArrowUp'||e.key==='ArrowLeft')next=(current-1+opts.length)%opts.length;
    else if(e.key==='Home')next=0;
    else if(e.key==='End')next=opts.length-1;
    else if(e.key===' '||e.key==='Enter'){
      if(document.activeElement?.classList?.contains('q-option')){
        e.preventDefault();
        document.activeElement.click();
      }
      return;
    }else return;
    e.preventDefault();
    opts[next]?.focus();
  });
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

let sortingComments=false;
function ensureCommentReportExperience(){
  if(window.__nx2ReportOverride)return;
  if(typeof window.reportComment!=='function')return;
  window.__nx2ReportOverride=true;
  window.reportComment=async function(id){
    const reason=await new Promise(resolve=>{
      let modal=$('#commentReportModal');
      if(!modal){
        modal=document.createElement('div');
        modal.id='commentReportModal';
        modal.className='community-modal hidden';
        modal.setAttribute('role','dialog');
        modal.setAttribute('aria-modal','true');
        modal.setAttribute('aria-labelledby','commentReportTitle');
        modal.innerHTML='<section class="community-sheet nx2-report-sheet"><button type="button" id="closeCommentReport" class="community-close" aria-label="Fechar">×</button><div><span class="eyebrow">MODERAÇÃO</span><h3 id="commentReportTitle">Denunciar comentário</h3><p>Escolha o motivo. A denúncia vai para moderação e não publica seus detalhes para outros alunos.</p></div><label>Motivo<select id="commentReportReason"><option value="Ofensa ou assédio">Ofensa ou assédio</option><option value="Spam">Spam</option><option value="Conteúdo impróprio">Conteúdo impróprio</option><option value="Informação enganosa">Informação enganosa</option><option value="Outro motivo">Outro motivo</option></select></label><label>Detalhes opcionais<textarea id="commentReportDetail" rows="3" maxlength="280" placeholder="Explique em poucas palavras, se necessário."></textarea></label><div class="community-modal-actions"><button type="button" id="cancelCommentReport" class="ghost-btn">Cancelar</button><button type="button" id="submitCommentReport" class="primary-btn">Enviar denúncia</button></div></section>';
        document.body.appendChild(modal);
      }
      const previous=document.activeElement;
      modal.classList.remove('hidden');
      document.body.style.overflow='hidden';
      const select=$('#commentReportReason'),detail=$('#commentReportDetail');
      if(select)select.selectedIndex=0;
      if(detail)detail.value='';
      let settled=false;
      const finish=value=>{
        if(settled)return;settled=true;
        modal.classList.add('hidden');
        document.body.style.overflow='';
        previous?.focus?.({preventScroll:true});
        resolve(value);
      };
      $('#closeCommentReport').onclick=()=>finish('');
      $('#cancelCommentReport').onclick=()=>finish('');
      modal.onclick=e=>{if(e.target===modal)finish('')};
      $('#submitCommentReport').onclick=()=>{
        const base=String(select?.value||'Outro motivo');
        const extra=String(detail?.value||'').trim();
        finish(base+(extra?' · '+extra:''));
      };
      requestAnimationFrame(()=>select?.focus());
    });
    if(!reason)return;
    try{
      const {data,error}=await client.rpc('report_comment',{p_comment_id:id,p_reason:reason});
      if(error)throw error;
      toast(data?.auto_hidden?'Comentário ocultado após múltiplas denúncias.':'Denúncia enviada para moderação.');
      loadQuestionComments(Number($('#commentModal')?.dataset.questionId||0));
    }catch(_){
      toast('Não foi possível enviar a denúncia.','error');
    }
  };
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
    bar.querySelectorAll('[data-nx2-comment-sort]').forEach(btn=>btn.addEventListener('click',()=>{
      bar.querySelectorAll('[data-nx2-comment-sort]').forEach(x=>x.classList.toggle('active',x===btn));
      modal.dataset.nx2Sort=btn.dataset.nx2CommentSort;
      sortComments();
    }));
  }
  if(!list.dataset.nx2Observer){
    list.dataset.nx2Observer='1';
    new MutationObserver(()=>{
      if(sortingComments)return;
      requestAnimationFrame(sortComments);
    }).observe(list,{childList:true});
  }
}
function sortComments(){
  const modal=$('#commentModal'),list=$('#questionComments');
  if(!modal||!list||sortingComments)return;
  const current=$$('.comment-item',list);
  current.forEach((item,index)=>{
    if(item.dataset.nx2Original==null)item.dataset.nx2Original=String(index);
  });
  const sorted=[...current].sort((a,b)=>{
    if(modal.dataset.nx2Sort==='helpful'){
      const av=Number($('.comment-helpful b',a)?.textContent||0);
      const bv=Number($('.comment-helpful b',b)?.textContent||0);
      return bv-av||Number(a.dataset.nx2Original)-Number(b.dataset.nx2Original);
    }
    return Number(a.dataset.nx2Original)-Number(b.dataset.nx2Original);
  });
  const changed=sorted.some((item,index)=>item!==current[index]);
  if(!changed)return;
  sortingComments=true;
  try{
    const frag=document.createDocumentFragment();
    sorted.forEach(item=>frag.appendChild(item));
    list.appendChild(frag);
  }finally{
    queueMicrotask(()=>{sortingComments=false});
  }
}

function visibleDialog(){
  if(document.body.classList.contains('mobile-menu-open'))return $('#sidebar');
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
    e.preventDefault();
    if(dialog.id==='sidebar')$('#closeMenu')?.click();
    else closeDialog(dialog);
    return;
  }
  if(e.key!=='Tab')return;
  const focusables=$$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',dialog)
    .filter(el=>!el.disabled&&getComputedStyle(el).display!=='none');
  if(!focusables.length)return;
  const first=focusables[0],last=focusables[focusables.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
}

function ensureMoreGroups(){
  const grid=$('.nrx-side-more-grid');
  if(!grid||grid.dataset.nx2Grouped)return;
  grid.dataset.nx2Grouped='1';
  const groups=[
    ['Estudo',['materiais','simulados','semana','focos','radar','banco','temas']],
    ['Comunidade e jornada',['ranking','store','avatar','feedback']],
    ['Conta e NEXO',['planos','nexo','settings','admin']]
  ];
  groups.forEach(([label,keys])=>{
    const section=document.createElement('section');
    section.className='nx2-more-group';
    section.innerHTML='<h4>'+label+'</h4><div></div>';
    const host=$('div',section);
    keys.forEach(key=>{
      const btn=grid.querySelector('[data-nrx-target="'+key+'"]');
      if(btn)host.appendChild(btn);
    });
    if(host.children.length)grid.appendChild(section);
  });
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
  side.setAttribute('aria-label','Navegação principal');
  const more=$('#moreMobile');
  if(more)more.setAttribute('aria-expanded','false');
  let previousFocus=null;
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-nrx-bottom="more"],#moreMobile')){
      previousFocus=document.activeElement;
      requestAnimationFrame(()=>{
        more?.setAttribute('aria-expanded','true');
        side.setAttribute('aria-hidden','false');
        $('#closeMenu')?.focus?.({preventScroll:true});
      });
    }
    if(e.target.closest?.('#closeMenu,#scrim')){
      more?.setAttribute('aria-expanded','false');
      if(innerWidth<=760)side.setAttribute('aria-hidden','true');
      previousFocus?.focus?.({preventScroll:true});
    }
  },true);
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
function ensureSearchShortcut(){
  if(window.__nx2SearchShortcut)return;
  window.__nx2SearchShortcut=true;
  document.addEventListener('keydown',e=>{
    const key=String(e.key||'').toLowerCase();
    if(!(e.ctrlKey||e.metaKey)||key!=='k')return;
    e.preventDefault();
    const input=$('#globalSearch');
    if(!input)return;
    try{ if(innerWidth<=760&&typeof openPage==='function'&&!$('#inicio')?.classList.contains('active'))openPage('inicio') }catch(_){}
    requestAnimationFrame(()=>{
      try{ if(typeof setMobileSearchOpen==='function')setMobileSearchOpen(innerWidth<=760,{focus:false}) }catch(_){}
      try{input.focus({preventScroll:false})}catch(_){input.focus()}
      input.select?.();
    });
  });
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
  ensureStudyStatusSignals();
  syncQuestionRecommendation();
  syncContinueRich();
  ensureQuestionObserver();
  ensureQuestionKeyboard();
  ensureEssayTools();
  ensureEssayOrganizer();
  ensureLearningCompletionFeedback();
  ensureCommentReportExperience();
  ensureCommentSort();
  ensureMoreGroups();
  ensureDialogSemantics();
  ensureDrawerSwipe();
  ensureSearchShortcut();
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

const boot=()=>requestAnimationFrame(()=>{sync();requestAnimationFrame(()=>document.body.classList.add('theme-ready'))});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();