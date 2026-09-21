/* NEXO V13 · confidence, reflection and safer answer feedback */
(function(){
  const oldRender=window.renderQuestion;
  const oldSubmit=window.submitAnswer;

  function mountConfidence(){
    const wrap=document.querySelector('.confirm-answer-wrap');
    if(!wrap||document.querySelector('#v13Confidence'))return;
    const box=document.createElement('div');
    box.id='v13Confidence';
    box.className='v13-confidence';
    box.innerHTML='<span>Antes de confirmar: como você está respondendo?</span><div><button type="button" data-v13-confidence="sure">✓ Tenho certeza</button><button type="button" data-v13-confidence="unsure">~ Estou em dúvida</button><button type="button" data-v13-confidence="guess">? Chutei</button></div>';
    wrap.before(box);
    v13State().confidence=null;
    box.querySelectorAll('[data-v13-confidence]').forEach(btn=>btn.onclick=()=>{
      v13State().confidence=btn.dataset.v13Confidence;
      box.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));
    });
  }

  if(typeof oldRender==='function'){
    window.renderQuestion=async function(q){
      await oldRender(q);
      mountConfidence();
    };
  }

  async function saveReflection(q,correct){
    if(!state.user?.id||!q?.id)return null;
    const confidence=v13State().confidence||'unsure';
    const {data,error}=await client.from('nexo_attempt_reflections')
      .insert({user_id:state.user.id,question_id:Number(q.id),confidence,error_reason:null})
      .select('id').single();
    if(error){console.warn('v13 reflection',error);return null}
    v13State().lastReflection=data?.id||null;
    if(!correct&&state.session?.examMode!==true)mountErrorReason();
    return data?.id||null;
  }

  function mountErrorReason(){
    const panel=document.querySelector('.answer-panel');
    if(!panel||panel.querySelector('#v13ErrorReason'))return;
    const box=document.createElement('section');
    box.id='v13ErrorReason';
    box.className='v13-error-reason';
    box.innerHTML='<span>CADERNO DE ERROS · POR QUE VOCÊ ERROU?</span><p>Marcar a causa ajuda o NEXO a diferenciar falta de conteúdo de interpretação, cálculo, atenção, tempo ou chute.</p><div>'+[
      ['concept','Conteúdo'],['interpretation','Interpretação'],['calculation','Cálculo'],['attention','Atenção'],['time','Tempo'],['guess','Chute']
    ].map(([v,l])=>'<button type="button" data-v13-reason="'+v+'">'+l+'</button>').join('')+'</div>';
    panel.appendChild(box);
    box.querySelectorAll('[data-v13-reason]').forEach(btn=>btn.onclick=async()=>{
      const id=v13State().lastReflection;if(!id)return;
      const {error}=await client.from('nexo_attempt_reflections').update({error_reason:btn.dataset.v13Reason}).eq('id',id);
      if(error)return toast('Não consegui registrar a causa do erro.','error');
      box.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));
      btn.textContent='✓ '+btn.textContent.replace(/^✓\s*/,'');
      v13LoadBrief?.();
    });
  }

  function mountAnswerAudit(){
    const panel=document.querySelector('.answer-panel');
    if(!panel||panel.querySelector('.v13-answer-audit')||!state.current||!state.lastAnswer)return;
    const correct=Number(state.lastAnswer.correct_option);
    const selected=Number(state.selectedOption);
    const editorial=state.lastAnswer.explanation||state.lastAnswer.answer_explanation||'';
    const options=state.current.options||[];
    const section=document.createElement('section');
    section.className='v13-answer-audit';
    section.innerHTML='<div class="v13-section-head"><span>ALTERNATIVAS A–E</span><small>'+ (editorial?'explicação editorial disponível':'gabarito confirmado · explicação editorial pendente') +'</small></div>'+
      options.map((opt,i)=>{
        const status=i===correct?'correct':i===selected?'chosen':'neutral';
        const note=i===correct
          ? (editorial||'Esta é a alternativa registrada no gabarito oficial do banco. A justificativa editorial específica ainda está em revisão.')
          : i===selected
            ? 'Esta foi sua escolha. Compare os termos desta alternativa com o comando e com a evidência do texto, gráfico ou cálculo.'
            : 'Alternativa não selecionada. Ao revisar, procure o termo que a torna incompatível com o comando antes de descartá-la.';
        return '<article class="'+status+'"><b>'+('ABCDE'[i]||'?')+'</b><div><strong>'+v13E(opt)+'</strong><p>'+v13E(note)+'</p></div></article>';
      }).join('');
    panel.appendChild(section);
  }

  if(typeof oldSubmit==='function'){
    window.submitAnswer=async function(option){
      if(!v13State().confidence){
        toast('Marque se você tem certeza, está em dúvida ou chutou antes de confirmar.','info');
        document.querySelector('#v13Confidence')?.classList.add('attention');
        return;
      }
      const q=state.current;
      await oldSubmit(option);
      if(state.answered&&state.lastAnswer&&q?.id===state.current?.id){
        await saveReflection(q,Boolean(state.lastAnswer.correct));
        if(!state.session?.examMode)mountAnswerAudit();
      }
    };
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('.q-option'))setTimeout(mountConfidence,0);
  });
})();